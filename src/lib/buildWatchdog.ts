import { supabase } from "@/integrations/supabase/client";
import { normalizeBuildStatus, isFinalBuildState, type BuildJobStatus } from "@/lib/buildStateMachine";
import { recoverBuild, recoveryToLogLine, type BuildRecoveryDiagnosis } from "@/lib/recoverBuild";

export const BUILD_WATCHDOG_MAX_DURATION_MS = 10 * 60 * 1000;

export interface BuildWatchdogSnapshot {
  jobId: string;
  status?: string | null;
  progress?: number | null;
  stage?: string | null;
  stepLabel?: string | null;
  startedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  stdout?: string | null;
  stderr?: string | null;
  lastLog?: string | null;
  errorMessage?: string | null;
}

export interface BuildTimeoutResult {
  timedOut: boolean;
  elapsedMs: number;
  lastStage: BuildJobStatus;
  lastLog: string;
  diagnosis: BuildRecoveryDiagnosis;
}

function getStartTime(snapshot: BuildWatchdogSnapshot): number {
  const raw = snapshot.startedAt ?? snapshot.createdAt ?? snapshot.updatedAt;
  const parsed = raw ? new Date(raw).getTime() : Date.now();
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function getLastLog(snapshot: BuildWatchdogSnapshot): string {
  return snapshot.lastLog || snapshot.stderr?.split(/\r?\n/).filter(Boolean).at(-1) || snapshot.stdout?.split(/\r?\n/).filter(Boolean).at(-1) || snapshot.stepLabel || "Sem logs recentes.";
}

export function inspectBuildTimeout(snapshot: BuildWatchdogSnapshot, now = Date.now()): BuildTimeoutResult | null {
  const normalized = normalizeBuildStatus(snapshot.status, snapshot.progress ?? 0, snapshot.stage);
  if (isFinalBuildState(normalized)) return null;

  const elapsedMs = now - getStartTime(snapshot);
  if (elapsedMs <= BUILD_WATCHDOG_MAX_DURATION_MS) return null;

  const lastLog = getLastLog(snapshot);
  const diagnosis = recoverBuild({
    status: snapshot.status,
    stage: normalized,
    elapsedMs,
    stdout: snapshot.stdout,
    stderr: snapshot.stderr,
    lastLog,
    errorMessage: snapshot.errorMessage,
  });

  return { timedOut: true, elapsedMs, lastStage: normalized, lastLog, diagnosis };
}

export async function forceTimeoutBuild(snapshot: BuildWatchdogSnapshot): Promise<BuildTimeoutResult | null> {
  const timeout = inspectBuildTimeout(snapshot);
  if (!timeout) return null;

  const finalLog = recoveryToLogLine(timeout.diagnosis);
  await supabase
    .from("conversion_jobs")
    .update({
      status: "timeout",
      progress: Math.min(snapshot.progress ?? 0, 99),
      step_label: "TIMEOUT — build encerrado pelo watchdog",
      error_message: `${timeout.diagnosis.title}: ${timeout.diagnosis.summary}`,
      processing_time_ms: timeout.elapsedMs,
      build_stage: timeout.lastStage,
      final_stage: timeout.lastStage,
      timeout_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      watchdog_reason: timeout.diagnosis.likelyCause,
      last_log: timeout.lastLog,
      stderr_log: [snapshot.stderr, finalLog].filter(Boolean).join("\n"),
      recovery_diagnosis: timeout.diagnosis as unknown as Record<string, unknown>,
    })
    .eq("id", snapshot.jobId);

  return timeout;
}

export async function triggerGlobalBuildWatchdog(): Promise<void> {
  try {
    await supabase.rpc("mark_stale_conversion_jobs_as_timeout" as never, { _max_age: "00:10:00" } as never);
  } catch {
    // RPC can be unavailable to the client by design; local job watchdog still protects the active build.
  }
}