import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Terminal, WifiOff, XCircle } from "lucide-react";

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
  onCancel?: () => void | Promise<void>;
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

export default function BuildPipelineView({ job, formatLabel, packageName }: BuildPipelineViewProps) {
  const progress = Math.max(0, Math.min(100, Math.round(job.progress || 0)));
  const currentStage = isFailureState(job.status) ? FAILED_STAGE : getStageFromProgress(progress);
  const reachedStages = useMemo(() => {
    if (isFailureState(job.status)) return [FAILED_STAGE];
    return getReachedStages(progress);
  }, [job.status, progress]);
  const reachedNames = new Set(reachedStages.map((stage) => stage.status));
  const logs = useMemo(() => reachedStages.flatMap((stage) => logsForStage(stage.status)), [reachedStages]);
  const CurrentIcon = currentStage.icon;
  const color = COLOR_CLASS[currentStage.color];

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
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">{job.stepLabel || currentStage.description}</span>
          <span className="font-bold text-primary">{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

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