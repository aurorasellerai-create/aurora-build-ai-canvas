import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, ShieldCheck, TrendingUp, Wifi, WifiOff } from "lucide-react";
import {
  fetchValidatorCorrections,
  subscribeValidatorCorrectionsCache,
  type ValidatorCorrectionRecord,
} from "@/lib/validatorRemoteHistory";

type Props = {
  appId?: string;
  /** Bump this number to force re-fetch (e.g. after applying a new correction). */
  refreshToken?: number;
  limit?: number;
};

const statusStyles: Record<string, string> = {
  approved: "border-secondary/40 bg-secondary/10 text-secondary",
  warning: "border-primary/40 bg-primary/10 text-primary",
  blocked: "border-destructive/40 bg-destructive/10 text-destructive",
};

const statusLabel: Record<string, string> = {
  approved: "Aprovado",
  warning: "Atenção",
  blocked: "Bloqueado",
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ValidatorAuditTimeline({ appId, refreshToken = 0, limit = 12 }: Props) {
  const [records, setRecords] = useState<ValidatorCorrectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [localRefresh, setLocalRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchValidatorCorrections({ appId, limit }).then((res) => {
      if (cancelled) return;
      setRecords(res.records);
      setError(res.error);
      setFromCache(res.fromCache);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [appId, limit, refreshToken, localRefresh]);

  useEffect(() => {
    return subscribeValidatorCorrectionsCache(() => setLocalRefresh((v) => v + 1));
  }, []);

  return (
    <section className="card-aurora p-6 space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Histórico de auditoria remota
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Todas as execuções da IA são registradas em nuvem. Cache local é usado em modo offline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fromCache ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
              <WifiOff className="w-3 h-3" /> Cache local
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/40 bg-secondary/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-secondary">
              <Wifi className="w-3 h-3" /> Sincronizado
            </span>
          )}
          <button
            type="button"
            onClick={() => setLocalRefresh((v) => v + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-all"
            aria-label="Atualizar histórico"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </button>
        </div>
      </header>

      {error && !fromCache && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading && records.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background/40 p-8 text-center text-sm text-muted-foreground">
          Nenhuma correção registrada ainda. Aplique uma correção da IA para começar a auditoria.
        </div>
      ) : (
        <ol className="relative space-y-3 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-border">
          {records.map((rec, index) => {
            const delta = rec.correctedScore - rec.originalScore;
            const statusClass = statusStyles[rec.validationResult.status] ?? statusStyles.warning;
            return (
              <motion.li
                key={rec.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                className="relative pl-10"
              >
                <span className="absolute left-0 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 bg-background text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm text-foreground truncate">
                        {rec.appName}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3" /> {formatDate(rec.createdAt)} ·{" "}
                        {rec.validationResult.format?.toUpperCase()}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass}`}
                    >
                      {statusLabel[rec.validationResult.status] ?? "—"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg border border-border bg-background/40 p-2">
                      <p className="text-[10px] text-muted-foreground">Antes</p>
                      <p className="font-display font-bold text-lg text-muted-foreground">
                        {rec.originalScore}
                      </p>
                    </div>
                    <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-2">
                      <p className="text-[10px] text-muted-foreground">Depois</p>
                      <p className="font-display font-bold text-lg text-secondary">
                        {rec.correctedScore}
                      </p>
                    </div>
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Δ
                      </p>
                      <p className="font-display font-bold text-lg text-primary">
                        {delta >= 0 ? "+" : ""}
                        {delta}
                      </p>
                    </div>
                  </div>

                  {rec.fixesApplied.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {rec.fixesApplied.slice(0, 6).map((fix) => (
                        <span
                          key={fix.key}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background/60 px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                        >
                          {fix.label}
                        </span>
                      ))}
                      {rec.fixesApplied.length > 6 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{rec.fixesApplied.length - 6} mais
                        </span>
                      )}
                    </div>
                  )}

                  {(rec.permissionsRemoved.length > 0 || rec.permissionsAdded.length > 0) && (
                    <div className="text-[11px] text-muted-foreground space-y-1">
                      {rec.permissionsRemoved.length > 0 && (
                        <p>
                          <span className="text-destructive font-bold">−</span>{" "}
                          {rec.permissionsRemoved.join(", ")}
                        </p>
                      )}
                      {rec.permissionsAdded.length > 0 && (
                        <p>
                          <span className="text-secondary font-bold">+</span>{" "}
                          {rec.permissionsAdded.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default ValidatorAuditTimeline;
