export const BUILD_JOB_STATES = [
  "queued",
  "preparing",
  "installing_dependencies",
  "running_gradle",
  "signing",
  "optimizing",
  "uploading",
  "finalizing",
  "completed",
  "failed",
  "timeout",
  "cancelled",
  "stalled",
  "signing_timeout",
  "recovering",
] as const;

export type BuildJobStatus = (typeof BUILD_JOB_STATES)[number];

export type LegacyBuildStatus = "pending" | "processing" | "done" | "error";

export const FINAL_BUILD_STATES: BuildJobStatus[] = ["completed", "failed", "timeout", "cancelled"];
/** Non-final but actionable: user may retry / resume the pipeline. */
export const RECOVERABLE_BUILD_STATES: BuildJobStatus[] = ["stalled", "signing_timeout", "timeout"];

const ORDER: BuildJobStatus[] = [
  "queued",
  "preparing",
  "installing_dependencies",
  "running_gradle",
  "signing",
  "optimizing",
  "uploading",
  "finalizing",
  "completed",
];

const LABELS: Record<BuildJobStatus, string> = {
  queued: "Na fila",
  preparing: "Preparando ambiente",
  installing_dependencies: "Instalando dependências",
  running_gradle: "Executando Gradle",
  signing: "Assinando pacote",
  optimizing: "Otimizando artefato",
  uploading: "Enviando para a nuvem",
  finalizing: "Finalizando build",
  completed: "Concluído",
  failed: "Falhou",
  timeout: "Timeout",
  cancelled: "Cancelado",
  stalled: "Worker sem resposta",
  signing_timeout: "Assinatura travada",
  recovering: "Recuperando pipeline...",
};

export function isRecoverableBuildState(status: string | null | undefined): boolean {
  return RECOVERABLE_BUILD_STATES.includes(normalizeBuildStatus(status));
}

export function isFinalBuildState(status: string | null | undefined): boolean {
  return FINAL_BUILD_STATES.includes(normalizeBuildStatus(status));
}

export function normalizeBuildStatus(
  status: string | null | undefined,
  progress = 0,
  explicitStage?: string | null,
): BuildJobStatus {
  if (explicitStage && BUILD_JOB_STATES.includes(explicitStage as BuildJobStatus)) {
    return explicitStage as BuildJobStatus;
  }

  if (status === "done") return "completed";
  if (status === "error") return "failed";
  if (status === "pending") return "queued";
  if (status && BUILD_JOB_STATES.includes(status as BuildJobStatus)) return status as BuildJobStatus;

  return status === "processing" ? statusFromProgress(progress) : "queued";
}

export function statusFromProgress(progress: number): BuildJobStatus {
  const p = Math.max(0, Math.min(100, Math.round(progress || 0)));
  if (p >= 100) return "completed";
  if (p >= 98) return "finalizing";
  if (p >= 85) return "uploading";
  if (p >= 75) return "optimizing";
  if (p >= 65) return "signing";
  if (p >= 35) return "running_gradle";
  if (p >= 20) return "installing_dependencies";
  if (p >= 5) return "preparing";
  return "queued";
}

export function getBuildStatusLabel(status: string | null | undefined, progress = 0, explicitStage?: string | null): string {
  return LABELS[normalizeBuildStatus(status, progress, explicitStage)];
}

export function getBuildStatusOrder(status: BuildJobStatus): number {
  const index = ORDER.indexOf(status);
  return index === -1 ? ORDER.length : index;
}

export function canTransitionBuildStatus(from: string | null | undefined, to: BuildJobStatus): boolean {
  const normalizedFrom = normalizeBuildStatus(from);
  if (isFinalBuildState(normalizedFrom)) return false;
  if (isFinalBuildState(to)) return true;
  return getBuildStatusOrder(to) >= getBuildStatusOrder(normalizedFrom);
}

export function toLegacyUiStatus(status: string | null | undefined, progress = 0, explicitStage?: string | null) {
  const normalized = normalizeBuildStatus(status, progress, explicitStage);
  if (normalized === "completed") return "success" as const;
  if (normalized === "failed") return "error" as const;
  if (normalized === "timeout") return "timeout" as const;
  if (normalized === "cancelled") return "cancelled" as const;
  return "processing" as const;
}