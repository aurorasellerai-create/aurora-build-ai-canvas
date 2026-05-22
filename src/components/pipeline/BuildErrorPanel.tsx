import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import { analyzeRawErrorMessage, SEVERITY_LABEL } from "@/lib/buildErrorAnalyzer";
import { cn } from "@/lib/utils";

interface BuildErrorPanelProps {
  errorMessage: string;
  onRetry: () => void;
}

export default function BuildErrorPanel({ errorMessage, onRetry }: BuildErrorPanelProps) {
  const diagnosis = analyzeRawErrorMessage(errorMessage);

  return (
    <section className="card-aurora space-y-5 p-5" role="alert">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-destructive/40 bg-destructive/15 shadow-[0_0_24px_hsl(var(--destructive)/0.25)]">
          <ShieldAlert className="h-6 w-6 text-destructive" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold text-foreground">Build interrompido</h2>
            <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
              {SEVERITY_LABEL[diagnosis.severity]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{diagnosis.title}</p>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4 text-sm">
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground">O que aconteceu</p>
          <p className="mt-1 text-foreground">{diagnosis.whatHappened}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground">Causa provável</p>
          <p className="mt-1 text-muted-foreground">{diagnosis.probableCause}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground">Como corrigir</p>
          <p className="mt-1 text-muted-foreground">{diagnosis.howToFix}</p>
        </div>
      </div>

      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="break-words font-mono text-xs leading-relaxed text-muted-foreground">{errorMessage}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-display text-sm font-bold text-primary-foreground transition-all",
          "glow-gold glow-gold-hover hover:scale-[1.01]",
        )}
      >
        <RefreshCw className="h-4 w-4" /> Tentar novamente
      </button>
    </section>
  );
}