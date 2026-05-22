import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock, Gauge, RefreshCw, Terminal, Timer, WifiOff, XCircle } from "lucide-react";

import {
  BUILD_STAGES,
  COLOR_CLASS,
  FAILED_STAGE,
  formatLogTime,
  getReachedStages,
  getStageFromProgress,
  logsForStage,
  type BuildStage,
} from "@/lib/buildPipeline";
import { cn } from "@/lib/utils";

type PipelineJob = {
  jobId: string | null;
  status: string;
  progress: number;
  stepLabel: string;
  errorMessage: string | null;
  downloadUrl: string | null;
};

interface BuildPipelineViewProps {
  job: PipelineJob;
  formatLabel: "AAB" | "APK" | string;
  packageName: string;
  onCancel?: () => unknown | Promise<unknown>;
  /** Manual resync — re-fetches job state + re-arms realtime. */
  onRetry?: () => unknown | Promise<unknown>;
  /** Estimated final artifact size in MB, used to compute throughput (default 75 MB). */
  estimatedSizeMB?: number;
  /** Seconds without any progress update before showing the freeze warning (default 25s). */
  freezeThresholdSec?: number;
  /** Seconds for the auto-retry countdown once freeze is detected (default 15s). */
  autoRetryAfterSec?: number;
}

function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "--";
  const s = Math.max(1, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m}min` : `${m}min ${r}s`;
}


const isFailureState = (status: string) => status === "error" || status === "timeout" || status === "cancelled";

const statusLabel: Record<string, string> = {
  submitting: "Enviando",
  processing: "Processando",
  reconnecting: "Reconectando",
  success: "Concluído",
  error: "Falhou",
  timeout: "Timeout",
  cancelled: "Cancelado",
};

function StageDot({ stage, active, done }: { stage: BuildStage; active: boolean; done: boolean }) {
  const Icon = stage.icon;
  const color = COLOR_CLASS[stage.color];

  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all",
          done ? `${color.bg} ${color.border}` : "border-border bg-muted/40",
          active && `ring-2 ${color.ring} ${color.glow}`,
        )}
      >
        {done && !active ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Icon className={cn("h-4 w-4", done ? color.text : "text-muted-foreground")} />}
      </div>
      <div className="min-w-0 flex-1 pb-4">
        <p className={cn("text-sm font-bold", done ? "text-foreground" : "text-muted-foreground")}>{stage.shortLabel}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{stage.description}</p>
      </div>
    </div>
  );
}

export default function BuildPipelineView({
  job,
  formatLabel,
  packageName,
  onCancel,
  onRetry,
  estimatedSizeMB = 75,
  freezeThresholdSec = 25,
  autoRetryAfterSec = 15,
}: BuildPipelineViewProps) {
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const rawProgress = Math.max(0, Math.min(100, Math.round(job.progress || 0)));

  const isFailure = isFailureState(job.status);
  const isDone = job.status === "success";
  const isActive = job.status === "processing" || job.status === "reconnecting" || job.status === "submitting";

  // Smoothly animate displayed progress toward server-reported progress.
  // While active, cap displayed at 97% so the bar never "completes" prematurely.
  const [displayedProgress, setDisplayedProgress] = useState(rawProgress);
  const targetRef = useRef(rawProgress);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    targetRef.current = isDone ? 100 : isActive ? Math.min(rawProgress, 97) : rawProgress;
  }, [rawProgress, isDone, isActive]);
  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      setDisplayedProgress((prev) => {
        const target = targetRef.current;
        const diff = target - prev;
        if (Math.abs(diff) < 0.05) return target;
        // Ease toward target — fast catch-up when far, gentle drift when close.
        const step = diff * Math.min(1, dt * (Math.abs(diff) > 5 ? 4 : 1.2));
        // Tiny forward drift while active so the bar never looks frozen.
        const drift = isActive && diff < 1 ? dt * 0.15 : 0;
        return Math.min(target, prev + step + drift);
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive]);

  // Throughput + ETA — sample progress over time, smooth with EMA.
  const startRef = useRef<number | null>(null);
  const lastSampleRef = useRef<{ t: number; p: number } | null>(null);
  const velocityRef = useRef(0); // % per second, smoothed
  const [etaSec, setEtaSec] = useState<number | null>(null);
  const [mbps, setMbps] = useState<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (!isDone && !isFailure) {
        startRef.current = null;
        lastSampleRef.current = null;
        velocityRef.current = 0;
        setEtaSec(null);
        setMbps(null);
      }
      return;
    }
    const now = Date.now();
    if (startRef.current == null) {
      startRef.current = now;
      lastSampleRef.current = { t: now, p: rawProgress };
      return;
    }
    const last = lastSampleRef.current!;
    const dt = (now - last.t) / 1000;
    if (dt >= 0.5) {
      const dp = Math.max(0, rawProgress - last.p);
      const instant = dp / dt; // % per second
      // EMA smoothing (alpha low for stability)
      velocityRef.current = velocityRef.current === 0 ? instant : velocityRef.current * 0.75 + instant * 0.25;
      lastSampleRef.current = { t: now, p: rawProgress };
    }
    // Fallback velocity from total elapsed if instantaneous is zero
    const elapsed = (now - startRef.current) / 1000;
    const fallback = elapsed > 0 ? rawProgress / elapsed : 0;
    const v = Math.max(velocityRef.current, fallback, 0.05); // floor avoids divide-by-zero
    const remaining = Math.max(0, 100 - rawProgress);
    setEtaSec(remaining / v);
    // Throughput: % per second × bytes-per-percent
    setMbps((v * estimatedSizeMB) / 100);
  }, [rawProgress, isActive, isDone, isFailure, estimatedSizeMB]);

  const currentStage = isFailure ? FAILED_STAGE : getStageFromProgress(rawProgress);
  const reachedStages = useMemo(() => {
    if (isFailure) return [FAILED_STAGE];
    return getReachedStages(rawProgress);
  }, [isFailure, rawProgress]);
  const reachedNames = new Set(reachedStages.map((stage) => stage.status));
  const logs = useMemo(() => reachedStages.flatMap((stage) => logsForStage(stage.status)), [reachedStages]);
  const CurrentIcon = currentStage.icon;
  const color = COLOR_CLASS[currentStage.color];
  const canCancel = Boolean(onCancel) && isActive;

  const handleCancelClick = async () => {
    if (!onCancel) return;
    if (!confirmCancel) {
      setConfirmCancel(true);
      setTimeout(() => setConfirmCancel(false), 4000);
      return;
    }
    try {
      setCancelling(true);
      await onCancel();
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  // --- Freeze detection ---
  // Track the wall-clock time of the last observed progress/label change.
  // If nothing changes for `freezeThresholdSec` while active, surface a retry UI.
  const lastChangeRef = useRef<number>(Date.now());
  const lastSnapshotRef = useRef<string>("");
  const [nowTick, setNowTick] = useState(Date.now());
  const [retrying, setRetrying] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const autoRetryFiredRef = useRef<number>(0);

  useEffect(() => {
    const snapshot = `${job.status}|${rawProgress}|${job.stepLabel}`;
    if (snapshot !== lastSnapshotRef.current) {
      lastSnapshotRef.current = snapshot;
      lastChangeRef.current = Date.now();
    }
  }, [job.status, rawProgress, job.stepLabel]);

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isActive]);

  const stalledSec = isActive ? Math.floor((nowTick - lastChangeRef.current) / 1000) : 0;
  const isFrozen = isActive && stalledSec >= freezeThresholdSec;
  const countdown = isFrozen ? Math.max(0, autoRetryAfterSec - (stalledSec - freezeThresholdSec)) : autoRetryAfterSec;

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    setRetryAttempt((n) => n + 1);
    try {
      await onRetry();
      lastChangeRef.current = Date.now(); // give the retry a fresh window
    } finally {
      setRetrying(false);
    }
  };

  // Auto-retry once countdown elapses. Re-fires every full window while still frozen.
  useEffect(() => {
    if (!isFrozen || !onRetry || retrying) return;
    if (countdown > 0) return;
    const bucket = Math.floor(stalledSec / Math.max(1, freezeThresholdSec + autoRetryAfterSec));
    if (autoRetryFiredRef.current === bucket) return;
    autoRetryFiredRef.current = bucket;
    void handleRetry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFrozen, countdown, onRetry, retrying, stalledSec, freezeThresholdSec, autoRetryAfterSec]);

  const shownProgress = isDone ? 100 : Math.round(displayedProgress);

  return (
    <section className="card-aurora space-y-5 p-5" aria-live="polite">
      <div className="flex items-start gap-4">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border", color.bg, color.border, color.glow)}>
          <CurrentIcon className={cn("h-6 w-6", color.text, currentStage.status === "Finalizing" && "animate-spin")} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold text-foreground">Pipeline Android {formatLabel}</h2>
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {statusLabel[job.status] ?? job.status}
            </span>
          </div>
          <p className="mt-1 break-words text-xs text-muted-foreground">{packageName}</p>
        </div>
        {canCancel && (
          <button
            type="button"
            onClick={handleCancelClick}
            disabled={cancelling}
            aria-label="Cancelar conversão"
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition",
              confirmCancel
                ? "border-destructive bg-destructive text-destructive-foreground hover:opacity-90"
                : "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
              cancelling && "opacity-60 cursor-not-allowed",
            )}
          >
            <XCircle className="h-3.5 w-3.5" />
            {cancelling ? "Cancelando..." : confirmCancel ? "Confirmar cancelar" : "Cancelar"}
          </button>
        )}
      </div>


      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">{job.stepLabel || currentStage.description}</span>
          <span className="font-bold text-primary tabular-nums">{shownProgress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full bg-primary",
              isActive && "bg-gradient-to-r from-primary/80 via-primary to-primary/80 bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]",
            )}
            style={{ width: `${shownProgress}%`, transition: "width 120ms linear" }}
          />
        </div>
        {(isActive || isDone) && (
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <Timer className="h-3 w-3 text-secondary" />
              ETA: <span className="font-semibold text-foreground">{isDone ? "0s" : formatEta(etaSec ?? Infinity)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Gauge className="h-3 w-3 text-secondary" />
              Velocidade: <span className="font-semibold text-foreground">{mbps != null && mbps > 0 ? `${mbps.toFixed(2)} MB/s` : "calculando…"}</span>
            </span>
            <span className="opacity-70">~{estimatedSizeMB} MB estimado</span>
          </div>
        )}
      </div>

      {isFrozen && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground">
          <WifiOff className="h-4 w-4 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-amber-300">Sem atualizações há {stalledSec}s</p>
            <p className="text-[11px] text-muted-foreground">
              {retrying
                ? "Sincronizando com o servidor…"
                : onRetry
                  ? `Nova tentativa automática em ${countdown}s${retryAttempt > 0 ? ` · tentativa ${retryAttempt}` : ""}.`
                  : "Aguardando o worker responder. Você pode atualizar manualmente."}
            </p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/25",
                retrying && "opacity-60 cursor-not-allowed",
              )}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", retrying && "animate-spin")} />
              {retrying ? "Reconectando…" : "Tentar agora"}
            </button>
          )}
        </div>
      )}

      {job.status === "reconnecting" && (
        <div className="flex items-center gap-2 rounded-lg border border-secondary/30 bg-secondary/10 p-3 text-xs text-muted-foreground">
          <WifiOff className="h-4 w-4 text-secondary" />
          Realtime instável. O fallback por polling está mantendo o build sincronizado.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_1.05fr]">
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Etapas
          </div>
          <div className="space-y-1">
            {BUILD_STAGES.map((stage) => (
              <StageDot key={stage.status} stage={stage} active={stage.status === currentStage.status} done={reachedNames.has(stage.status)} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" /> Logs
          </div>
          <div className="max-h-80 space-y-2 overflow-auto font-mono text-[11px] leading-relaxed">
            {logs.map((log, index) => (
              <div key={`${log.ts}-${index}`} className="grid grid-cols-[70px_1fr] gap-2 rounded-md bg-background/60 px-2 py-1.5">
                <span className="text-muted-foreground">{formatLogTime(log.ts)}</span>
                <span className={cn(log.level === "ERROR" ? "text-destructive" : log.level === "SUCCESS" ? "text-primary" : "text-foreground")}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}