import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ValidatorCorrectionFix = {
  key: string;
  label: string;
  category: "manifest" | "permission" | "security" | "performance" | "other";
};

export type ValidatorCorrectionSnapshot = {
  score: number;
  security?: number;
  playstore?: number;
  performance?: number;
  navigation?: number;
  checkout?: number;
  warningCount: number;
  dangerCount: number;
  okCount: number;
  permissions?: string[];
  manifest?: Record<string, unknown>;
};

export type ValidatorCorrectionValidationResult = {
  status: "approved" | "warning" | "blocked";
  ready: boolean;
  format: string;
  summary: string;
};

export type ValidatorCorrectionRecord = {
  id: string;
  userId: string;
  appId: string;
  appName: string;
  originalScore: number;
  correctedScore: number;
  fixesApplied: ValidatorCorrectionFix[];
  manifestChanges: Record<string, unknown>;
  permissionsRemoved: string[];
  permissionsAdded: string[];
  beforeSnapshot: ValidatorCorrectionSnapshot;
  afterSnapshot: ValidatorCorrectionSnapshot;
  validationResult: ValidatorCorrectionValidationResult;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveValidatorCorrectionInput = {
  appId: string;
  appName: string;
  originalScore: number;
  correctedScore: number;
  fixesApplied: ValidatorCorrectionFix[];
  manifestChanges?: Record<string, unknown>;
  permissionsRemoved?: string[];
  permissionsAdded?: string[];
  beforeSnapshot: ValidatorCorrectionSnapshot;
  afterSnapshot: ValidatorCorrectionSnapshot;
  validationResult: ValidatorCorrectionValidationResult;
  idempotencyKey: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Local cache fallback (keeps app working if Supabase is unreachable)
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_KEY = "aurora-validator-remote-history-cache";
const PENDING_KEY = "aurora-validator-remote-history-pending";
const MAX_CACHE = 50;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded → ignore */
  }
}

function getCache(): ValidatorCorrectionRecord[] {
  return readJson<ValidatorCorrectionRecord[]>(CACHE_KEY, []);
}

function setCache(records: ValidatorCorrectionRecord[]) {
  writeJson(CACHE_KEY, records.slice(0, MAX_CACHE));
}

function upsertCacheItem(record: ValidatorCorrectionRecord) {
  const current = getCache();
  const filtered = current.filter(
    (r) =>
      r.id !== record.id &&
      !(record.idempotencyKey && r.idempotencyKey === record.idempotencyKey),
  );
  setCache([record, ...filtered]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("aurora-validator-remote-history-updated"));
  }
}

// Pending queue for offline / failed inserts
type PendingItem = SaveValidatorCorrectionInput & { queuedAt: string };

function getPending(): PendingItem[] {
  return readJson<PendingItem[]>(PENDING_KEY, []);
}

function setPending(items: PendingItem[]) {
  writeJson(PENDING_KEY, items);
}

function enqueuePending(input: SaveValidatorCorrectionInput) {
  const pending = getPending();
  const exists = pending.find((p) => p.idempotencyKey === input.idempotencyKey);
  if (exists) return;
  setPending([{ ...input, queuedAt: new Date().toISOString() }, ...pending].slice(0, 30));
}

function removePending(idempotencyKey: string) {
  setPending(getPending().filter((p) => p.idempotencyKey !== idempotencyKey));
}

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping
// ─────────────────────────────────────────────────────────────────────────────

type Row = {
  id: string;
  user_id: string;
  app_id: string;
  app_name: string;
  original_score: number;
  corrected_score: number;
  fixes_applied: unknown;
  manifest_changes: unknown;
  permissions_removed: unknown;
  permissions_added: unknown;
  before_snapshot: unknown;
  after_snapshot: unknown;
  validation_result: unknown;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
};

function rowToRecord(row: Row): ValidatorCorrectionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    appId: row.app_id,
    appName: row.app_name,
    originalScore: row.original_score,
    correctedScore: row.corrected_score,
    fixesApplied: (row.fixes_applied as ValidatorCorrectionFix[]) ?? [],
    manifestChanges: (row.manifest_changes as Record<string, unknown>) ?? {},
    permissionsRemoved: (row.permissions_removed as string[]) ?? [],
    permissionsAdded: (row.permissions_added as string[]) ?? [],
    beforeSnapshot: (row.before_snapshot as ValidatorCorrectionSnapshot) ?? {
      score: 0,
      warningCount: 0,
      dangerCount: 0,
      okCount: 0,
    },
    afterSnapshot: (row.after_snapshot as ValidatorCorrectionSnapshot) ?? {
      score: 0,
      warningCount: 0,
      dangerCount: 0,
      okCount: 0,
    },
    validationResult: (row.validation_result as ValidatorCorrectionValidationResult) ?? {
      status: "warning",
      ready: false,
      format: "apk",
      summary: "",
    },
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Retry helper
// ─────────────────────────────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, attempts = 2, delayMs = 400): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, i)));
      }
    }
  }
  throw lastErr;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — service layer
// ─────────────────────────────────────────────────────────────────────────────

export async function saveValidatorCorrection(
  input: SaveValidatorCorrectionInput,
): Promise<{ record: ValidatorCorrectionRecord | null; error: string | null; cached: boolean }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    // Cache locally only — user not authenticated remotely
    const local: ValidatorCorrectionRecord = {
      id: `local-${input.idempotencyKey}`,
      userId: "local",
      appId: input.appId,
      appName: input.appName,
      originalScore: input.originalScore,
      correctedScore: input.correctedScore,
      fixesApplied: input.fixesApplied,
      manifestChanges: input.manifestChanges ?? {},
      permissionsRemoved: input.permissionsRemoved ?? [],
      permissionsAdded: input.permissionsAdded ?? [],
      beforeSnapshot: input.beforeSnapshot,
      afterSnapshot: input.afterSnapshot,
      validationResult: input.validationResult,
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    upsertCacheItem(local);
    return { record: local, error: null, cached: true };
  }

  // Dedup: if we already have a row with this idempotency key, skip insert.
  try {
    const { data: existing } = await supabase
      .from("correcoes_do_validador")
      .select("*")
      .eq("user_id", userId)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();

    if (existing) {
      const record = rowToRecord(existing as Row);
      upsertCacheItem(record);
      return { record, error: null, cached: false };
    }
  } catch {
    /* fall through to insert */
  }

  const payload: TablesInsert<"correcoes_do_validador"> = {
    user_id: userId,
    app_id: input.appId,
    app_name: input.appName,
    original_score: input.originalScore,
    corrected_score: input.correctedScore,
    fixes_applied: input.fixesApplied as unknown as TablesInsert<"correcoes_do_validador">["fixes_applied"],
    manifest_changes: (input.manifestChanges ?? {}) as TablesInsert<"correcoes_do_validador">["manifest_changes"],
    permissions_removed: (input.permissionsRemoved ?? []) as TablesInsert<"correcoes_do_validador">["permissions_removed"],
    permissions_added: (input.permissionsAdded ?? []) as TablesInsert<"correcoes_do_validador">["permissions_added"],
    before_snapshot: input.beforeSnapshot as TablesInsert<"correcoes_do_validador">["before_snapshot"],
    after_snapshot: input.afterSnapshot as TablesInsert<"correcoes_do_validador">["after_snapshot"],
    validation_result: input.validationResult as TablesInsert<"correcoes_do_validador">["validation_result"],
    idempotency_key: input.idempotencyKey,
  };

  try {
    const data = await withRetry(async () => {
      const { data, error } = await supabase
        .from("correcoes_do_validador")
        .insert(payload)
        .select("*")
        .maybeSingle();
      if (error) {
        // Unique violation = duplicate (idempotency hit) → treat as success
        if ((error as { code?: string }).code === "23505") {
          const { data: dup } = await supabase
            .from("correcoes_do_validador")
            .select("*")
            .eq("user_id", userId)
            .eq("idempotency_key", input.idempotencyKey)
            .maybeSingle();
          return dup;
        }
        throw error;
      }
      return data;
    });

    if (!data) {
      enqueuePending(input);
      return { record: null, error: "Falha ao salvar correção remotamente.", cached: false };
    }

    const record = rowToRecord(data as Row);
    upsertCacheItem(record);
    removePending(input.idempotencyKey);
    return { record, error: null, cached: false };
  } catch (err) {
    enqueuePending(input);
    const message = err instanceof Error ? err.message : "Erro desconhecido ao sincronizar.";
    return { record: null, error: message, cached: true };
  }
}

export async function fetchValidatorCorrections(
  options: { appId?: string; limit?: number } = {},
): Promise<{ records: ValidatorCorrectionRecord[]; error: string | null; fromCache: boolean }> {
  const { appId, limit = 25 } = options;
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    const cached = getCache().filter((r) => !appId || r.appId === appId);
    return { records: cached.slice(0, limit), error: null, fromCache: true };
  }

  try {
    const data = await withRetry(async () => {
      let query = supabase
        .from("correcoes_do_validador")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (appId) query = query.eq("app_id", appId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    });

    const records = (data as Row[]).map(rowToRecord);
    setCache(records);
    return { records, error: null, fromCache: false };
  } catch (err) {
    const cached = getCache().filter((r) => !appId || r.appId === appId);
    const message = err instanceof Error ? err.message : "Falha ao buscar histórico remoto.";
    return { records: cached.slice(0, limit), error: message, fromCache: true };
  }
}

export async function flushPendingValidatorCorrections() {
  const pending = getPending();
  if (pending.length === 0) return;
  for (const item of pending) {
    await saveValidatorCorrection(item);
  }
}

export function subscribeValidatorCorrectionsCache(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener("aurora-validator-remote-history-updated", handler);
  return () => window.removeEventListener("aurora-validator-remote-history-updated", handler);
}
