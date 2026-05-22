// ─────────────────────────────────────────────────────────────────────────────
// auditLogger.ts — Centralized structured logger for Edge Functions.
//
// All security-relevant events flow through here so they can be grep'd and
// shipped to a log aggregator with consistent shape.
//
// Usage:
//   const log = createLogger("convert-app", { correlationId });
//   log.security("URL_BLOCKED", { url, reason: "private_ip" });
//   log.auth("LOGIN_FAILED", { email_hash });
//
// Tags: [SECURITY] [AUTH] [PIPELINE] [UPLOAD] [PAYMENT] [VALIDATOR] [INFO]
// ─────────────────────────────────────────────────────────────────────────────

export type AuditTag =
  | "SECURITY"
  | "AUTH"
  | "PIPELINE"
  | "UPLOAD"
  | "PAYMENT"
  | "VALIDATOR"
  | "INFO";

export interface LoggerContext {
  correlationId?: string;
  traceId?: string;
  userId?: string;
  ipHash?: string;
  uaHash?: string;
}

export interface AuditLogger {
  security: (event: string, details?: Record<string, unknown>) => void;
  auth: (event: string, details?: Record<string, unknown>) => void;
  pipeline: (event: string, details?: Record<string, unknown>) => void;
  upload: (event: string, details?: Record<string, unknown>) => void;
  payment: (event: string, details?: Record<string, unknown>) => void;
  validator: (event: string, details?: Record<string, unknown>) => void;
  info: (event: string, details?: Record<string, unknown>) => void;
  child: (extra: LoggerContext) => AuditLogger;
}

/** Stable short hash (FNV-1a 32-bit, hex) — non-cryptographic, fine for log fingerprints. */
export function shortHash(input: string | null | undefined): string {
  if (!input) return "";
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Generate a random correlation ID (URL-safe, 16 chars). */
export function newCorrelationId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "").slice(0, 16);
}

/** Extract client fingerprint from a Request — IP/UA hashed for privacy. */
export function fingerprint(req: Request): { ipHash: string; uaHash: string } {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ua = req.headers.get("user-agent") ?? "";
  return { ipHash: shortHash(ip), uaHash: shortHash(ua) };
}

function emit(tag: AuditTag, fn: keyof Console, source: string, ctx: LoggerContext, event: string, details?: Record<string, unknown>) {
  const payload = {
    src: source,
    evt: event,
    ts: new Date().toISOString(),
    ...(ctx.correlationId ? { cid: ctx.correlationId } : {}),
    ...(ctx.traceId ? { tid: ctx.traceId } : {}),
    ...(ctx.userId ? { uid: ctx.userId } : {}),
    ...(ctx.ipHash ? { ip: ctx.ipHash } : {}),
    ...(ctx.uaHash ? { ua: ctx.uaHash } : {}),
    ...(details ?? {}),
  };
  let serialized: string;
  try { serialized = JSON.stringify(payload); } catch { serialized = `{"src":"${source}","evt":"${event}","err":"serialize_failed"}`; }
  // deno-lint-ignore no-explicit-any
  (console as any)[fn](`[${tag}] ${serialized}`);
}

export function createLogger(source: string, ctx: LoggerContext = {}): AuditLogger {
  const make = (tag: AuditTag, fn: "warn" | "log") =>
    (event: string, details?: Record<string, unknown>) => emit(tag, fn, source, ctx, event, details);

  return {
    security: make("SECURITY", "warn"),
    auth: make("AUTH", "warn"),
    pipeline: make("PIPELINE", "log"),
    upload: make("UPLOAD", "log"),
    payment: make("PAYMENT", "warn"),
    validator: make("VALIDATOR", "log"),
    info: make("INFO", "log"),
    child: (extra) => createLogger(source, { ...ctx, ...extra }),
  };
}
