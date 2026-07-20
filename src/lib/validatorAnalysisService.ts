// ─────────────────────────────────────────────────────────────────────────────
// validatorAnalysisService.ts — Fonte única para análises reais de AAB.
// Todos os componentes do Validator devem consumir SÓ este módulo.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Severity = "critical" | "warning" | "info" | "safe";

export type Finding = {
  key: string;
  category: "permission" | "manifest" | "security" | "network" | "signature" | "sdk" | "policy" | "performance";
  title: string;
  severity: Severity;
  location: { file: string; element?: string; attribute?: string };
  evidence: string;
  androidRule?: string;
  playStorePolicy?: string;
  docs: string;
  policyUrl?: string;
};

export type ManifestSummary = {
  package: string | null;
  versionName: string | null;
  versionCode: number | null;
  minSdk: number | null;
  targetSdk: number | null;
  compileSdk: number | null;
  usesCleartextTraffic: boolean | null;
  allowBackup: boolean | null;
  networkSecurityConfig: string | null;
  activitiesCount: number;
  servicesCount: number;
  receiversCount: number;
  providersCount: number;
};

export type AnalysisResult = {
  id: string;
  user_id: string;
  project_id: string | null;
  storage_path: string;
  file_name: string | null;
  file_size: number | null;
  file_hash: string | null;
  app_format: string;
  status: "queued" | "processing" | "completed" | "failed";
  error: string | null;
  correlation_id: string | null;
  package_name: string | null;
  version_name: string | null;
  version_code: number | null;
  min_sdk: number | null;
  target_sdk: number | null;
  compile_sdk: number | null;
  manifest: ManifestSummary;
  permissions: Array<{ name: string; maxSdk?: number; required?: boolean }>;
  sdks: Array<{ name: string; evidence: string; severity: Severity }>;
  apis: Array<{ key: string; title: string; severity: Severity; location: Finding["location"] }>;
  deep_links: Array<{ host: string | null; scheme: string | null; pathPrefix?: string | null; autoVerify: boolean; activity: string }>;
  signature: {
    hasV1Signature: boolean;
    signatureAlgorithm: string | null;
    signedByFilename: string | null;
    manifestMfPresent: boolean;
    signerCertificatePresent: boolean;
    notes: string;
  };
  components: {
    activities?: Array<{ name: string; exported: boolean | null; intentFilters: number }>;
    services?: Array<{ name: string; exported: boolean | null; foregroundServiceType: string | null }>;
    receivers?: Array<{ name: string; exported: boolean | null }>;
    providers?: Array<{ name: string; exported: boolean | null; authorities: string | null }>;
  };
  bundle_config: { fileCount?: number; hasBundleConfig?: boolean };
  dex_summary: Array<{ name: string; size: number; sha256: string }>;
  findings: Finding[];
  score: number | null;
  score_breakdown: {
    counts?: Record<Severity, number>;
    weights?: Record<Severity, number>;
    formula?: string;
    deduction?: number;
    totalItems?: number;
  };
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Faz upload do AAB para o bucket privado e dispara a análise real. */
export async function startAnalysis(params: {
  file: File;
  userId: string;
  projectId?: string | null;
  appFormat?: "aab" | "apk" | "pwa";
}): Promise<{ analysisId: string; cached: boolean }> {
  const { file, userId, projectId, appFormat = "aab" } = params;
  const ext = file.name.split(".").pop() ?? "aab";
  const storagePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage.from("aab-files").upload(storagePath, file, {
    contentType: "application/octet-stream",
    upsert: false,
  });
  if (upErr) throw new Error(`upload_failed: ${upErr.message}`);

  const correlationId = crypto.randomUUID();
  const { data, error } = await supabase.functions.invoke<{
    analysis_id: string;
    cached: boolean;
    error?: string;
    detail?: string;
  }>("analyze-aab", {
    body: {
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      project_id: projectId ?? null,
      app_format: appFormat,
      correlation_id: correlationId,
    },
  });
  if (error || !data?.analysis_id) {
    throw new Error(data?.detail ?? error?.message ?? "analyze_failed");
  }
  return { analysisId: data.analysis_id, cached: !!data.cached };
}

/** Hook: assina em tempo real uma análise específica. */
export function useAnalysis(analysisId: string | null | undefined) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!analysisId) { setLoading(false); return; }
    let mounted = true;
    setLoading(true);

    const fetchOnce = async () => {
      const { data, error: e } = await supabase
        .from("validator_analyses")
        .select("*")
        .eq("id", analysisId)
        .maybeSingle();
      if (!mounted) return;
      if (e) setError(e.message);
      if (data) setAnalysis(data as unknown as AnalysisResult);
      setLoading(false);
    };
    fetchOnce();

    const channel = supabase
      .channel(`analysis:${analysisId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "validator_analyses", filter: `id=eq.${analysisId}` },
        (payload) => {
          if (payload.new) setAnalysis(payload.new as unknown as AnalysisResult);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [analysisId]);

  return { analysis, loading, error };
}

/** Hook: última análise concluída do usuário (para landing / histórico). */
export function useLatestAnalysis(userId: string | null | undefined) {
  const [latest, setLatest] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("validator_analyses")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (mounted) {
        setLatest((data as unknown as AnalysisResult) ?? null);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  return { latest, loading };
}

/** Busca (com cache no backend) a explicação IA de um finding. */
export async function fetchFindingExplanation(analysisId: string, findingKey: string) {
  const { data, error } = await supabase.functions.invoke("explain-finding", {
    body: { analysis_id: analysisId, finding_key: findingKey },
  });
  if (error) throw new Error(error.message);
  return data as {
    explanation: string;
    impact: string;
    playStoreRisk: string;
    securityRisk: string;
    recommendation: { steps: string[]; manifestSnippet: string; codeSnippet: string; androidCompat: string[] };
    docs: string;
    playStorePolicy: string | null;
    policyUrl: string | null;
    source: string;
  };
}
