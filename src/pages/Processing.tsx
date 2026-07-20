import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Loader2, CheckCircle2, AlertTriangle, Clock, Terminal,
  Globe, Layers, Settings, Hammer, Package, ShieldCheck, Upload, WifiOff, RefreshCw,
  Copy,
} from "lucide-react";

type Diagnostics = {
  build_stage: string | null;
  step_label: string | null;
  status: string | null;
  progress: number | null;
  watchdog_reason: string | null;
  last_log: string | null;
  stdout_tail: string | null;
  stderr_tail: string | null;
  updated_at: string | null;
};

type ProjectRow = {
  id: string;
  status: string;
  progress: number | null;
  download_url: string | null;
  error_message: string | null;
  app_name: string | null;
  format: string | null;
  site_url: string | null;
  updated_at: string | null;
  created_at: string | null;
};

const STAGES = [
  { at: 5,   label: "URL recebida",          icon: Globe },
  { at: 12,  label: "URL validada",          icon: ShieldCheck },
  { at: 20,  label: "Detectando PWA",        icon: Globe },
  { at: 30,  label: "Gerando manifest",      icon: Layers },
  { at: 40,  label: "Processando ícones",    icon: Layers },
  { at: 50,  label: "Criando projeto Android", icon: Settings },
  { at: 60,  label: "Configurando Gradle",   icon: Settings },
  { at: 70,  label: "Compilando build",      icon: Hammer },
  { at: 80,  label: "Gerando AAB / APK",     icon: Package },
  { at: 90,  label: "Assinando bundle",      icon: ShieldCheck },
  { at: 97,  label: "Upload final",          icon: Upload },
  { at: 100, label: "Conversão concluída",   icon: CheckCircle2 },
];

const TERMINAL_STATUSES = new Set(["done", "completed", "ready", "success", "error", "failed", "timeout", "cancelled"]);
const ERROR_STATUSES = new Set(["error", "failed", "timeout", "cancelled"]);

const formatLog = (date: Date) =>
  date.toLocaleTimeString("pt-BR", { hour12: false });

const Processing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [logs, setLogs] = useState<{ ts: Date; level: "INFO" | "SUCCESS" | "ERROR"; message: string }[]>([
    { ts: new Date(), level: "INFO", message: "[PIPELINE] Job iniciado, aguardando worker..." },
  ]);
  const [realtimeOk, setRealtimeOk] = useState(true);
  const [pollingNotice, setPollingNotice] = useState(false);
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [diagCopied, setDiagCopied] = useState(false);
  const startedAtRef = useRef<number>(Date.now());
  const lastStageRef = useRef<number>(-1);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const targetProgress = project?.progress ?? 0;
  const status = project?.status ?? "processing";
  const isDone = status === "done" || status === "completed" || status === "ready" || status === "success";
  const isError = ERROR_STATUSES.has(status);
  const isTerminal = TERMINAL_STATUSES.has(status);

  // Fetch + realtime subscribe
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const fetchProject = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, status, progress, download_url, error_message, app_name, format, site_url, updated_at, created_at")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setLogs((l) => [...l, { ts: new Date(), level: "ERROR", message: `[ERROR] ${error.message}` }]);
        return;
      }
      if (data) setProject(data as ProjectRow);
    };

    fetchProject();

    const channel = supabase
      .channel(`project-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "projects", filter: `id=eq.${id}` },
        (payload) => {
          setProject(payload.new as ProjectRow);
          setRealtimeOk(true);
        },
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setRealtimeOk(true);
        if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setRealtimeOk(false);
      });

    // Polling fallback every 4s
    const poll = setInterval(() => {
      if (!isTerminal) fetchProject();
    }, 4000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [id]);

  // Poll diagnostics (stdout/stderr tails) every 3s until terminal
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const fetchDiag = async () => {
      const { data, error } = await supabase.rpc("get_job_diagnostics", { _project_id: id });
      if (cancelled || error) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) setDiag(row as Diagnostics);
    };
    fetchDiag();
    const poll = setInterval(() => {
      if (!isTerminal) fetchDiag();
      else {
        fetchDiag();
        clearInterval(poll);
      }
    }, 3000);
    return () => { cancelled = true; clearInterval(poll); };
  }, [id, isTerminal]);

  // If realtime drops, surface polling notice
  useEffect(() => {
    if (realtimeOk) {
      setPollingNotice(false);
      return;
    }
    const t = setTimeout(() => setPollingNotice(true), 2000);
    return () => clearTimeout(t);
  }, [realtimeOk]);

  // Smoothly animate progress bar toward server value
  useEffect(() => {
    let raf: number;
    const tick = () => {
      setAnimatedProgress((p) => {
        // gentle drift while waiting on server, capped to 95 if still processing
        const cap = isTerminal ? 100 : Math.max(targetProgress, Math.min(p + 0.15, 95));
        const target = isDone ? 100 : cap;
        const next = p + (target - p) * 0.08;
        return Math.abs(target - p) < 0.05 ? target : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetProgress, isDone, isTerminal]);

  // Append stage logs as progress crosses thresholds
  useEffect(() => {
    const p = Math.round(animatedProgress);
    for (let i = lastStageRef.current + 1; i < STAGES.length; i++) {
      if (STAGES[i].at <= p) {
        const stage = STAGES[i];
        setLogs((l) => [...l, { ts: new Date(), level: "INFO", message: `[PIPELINE] ${stage.label}` }]);
        lastStageRef.current = i;
      } else break;
    }
  }, [animatedProgress]);

  // Terminal-state logs
  useEffect(() => {
    if (isDone) {
      setLogs((l) => [...l, { ts: new Date(), level: "SUCCESS", message: "[COMPLETE] Job finalizado com sucesso." }]);
      const t = setTimeout(() => navigate(`/project/${id}`), 1800);
      return () => clearTimeout(t);
    }
    if (isError) {
      setLogs((l) => [...l, {
        ts: new Date(),
        level: "ERROR",
        message: `[FAILURE] ${project?.error_message || "Conversão falhou. Tente novamente."}`,
      }]);
    }
  }, [isDone, isError, project?.error_message, id, navigate]);

  // Auto scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [logs.length]);

  const elapsedSec = Math.floor((Date.now() - startedAtRef.current) / 1000);
  const etaSec = useMemo(() => {
    const p = Math.max(1, Math.round(animatedProgress));
    if (isTerminal) return 0;
    const total = (elapsedSec / p) * 100;
    return Math.max(5, Math.ceil(total - elapsedSec));
  }, [animatedProgress, elapsedSec, isTerminal]);

  const currentStage = [...STAGES].reverse().find((s) => animatedProgress >= s.at - 0.5) ?? STAGES[0];
  const CurrentIcon = currentStage.icon;
  const reached = new Set(STAGES.filter((s) => animatedProgress >= s.at - 0.5).map((s) => s.label));

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-aurora space-y-5 p-6"
          aria-live="polite"
        >
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
              isError ? "border-destructive/40 bg-destructive/10" :
              isDone  ? "border-primary/40 bg-primary/10" :
                        "border-secondary/40 bg-secondary/10"
            }`}>
              {isError ? <AlertTriangle className="h-6 w-6 text-destructive" /> :
               isDone  ? <CheckCircle2 className="h-6 w-6 text-primary" /> :
                         <CurrentIcon className="h-6 w-6 text-secondary animate-pulse" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-lg font-bold text-foreground">
                  {isDone ? "App pronto!" : isError ? "Falha na conversão" : "Gerando seu app..."}
                </h1>
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground uppercase">
                  {isDone ? "Concluído" : isError ? "Erro" : status}
                </span>
                {project?.format && (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary uppercase">
                    {project.format}
                  </span>
                )}
              </div>
              <p className="mt-1 break-words text-xs text-muted-foreground">
                {project?.app_name || "App"} · {project?.site_url || "—"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                {isError ? (project?.error_message || "Erro inesperado") : currentStage.label}
              </span>
              <span className="font-bold text-primary">{Math.round(animatedProgress)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full"
                style={{ background: isError ? "hsl(var(--destructive))" : "linear-gradient(90deg, hsl(190 100% 50%), hsl(51 100% 50%))" }}
                animate={{ width: `${Math.round(animatedProgress)}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {elapsedSec}s decorridos</span>
              {!isTerminal && <span>ETA ~{etaSec}s</span>}
            </div>
          </div>

          {pollingNotice && !isTerminal && (
            <div className="flex items-center gap-2 rounded-lg border border-secondary/30 bg-secondary/10 p-3 text-xs text-muted-foreground">
              <WifiOff className="h-4 w-4 text-secondary" />
              Realtime instável — sincronizando via polling.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-[1fr_1.05fr]">
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Etapas
              </div>
              <ul className="space-y-2">
                {STAGES.map((s) => {
                  const done = reached.has(s.label);
                  const active = currentStage.label === s.label && !isTerminal;
                  const Icon = s.icon;
                  return (
                    <li key={s.label} className="flex items-center gap-2">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        done ? "border-primary/40 bg-primary/10" : "border-border bg-muted/40"
                      } ${active ? "ring-2 ring-secondary/40" : ""}`}>
                        {done && !active ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Icon className={`h-3.5 w-3.5 ${done ? "text-primary" : "text-muted-foreground"}`} />
                        )}
                      </div>
                      <span className={`text-xs ${done ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                        [{s.at}%] {s.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                <Terminal className="h-3.5 w-3.5" /> Logs
              </div>
              <div className="max-h-80 space-y-1.5 overflow-auto font-mono text-[11px] leading-relaxed">
                {logs.map((log, i) => (
                  <div key={i} className="grid grid-cols-[70px_1fr] gap-2 rounded-md bg-background/60 px-2 py-1.5">
                    <span className="text-muted-foreground">{formatLog(log.ts)}</span>
                    <span className={
                      log.level === "ERROR" ? "text-destructive"
                      : log.level === "SUCCESS" ? "text-primary"
                      : "text-foreground"
                    }>{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>

          {/* Diagnóstico do worker (stdout/stderr) */}
          <div className="rounded-lg border border-border bg-background/40 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                <Terminal className="h-3.5 w-3.5" /> Terminal do worker
                {diag?.build_stage && (
                  <span className="ml-2 rounded-full border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                    {diag.build_stage}
                  </span>
                )}
                {diag?.step_label && (
                  <span className="text-[10px] font-normal normal-case text-muted-foreground">
                    · {diag.step_label}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={async () => {
                  const payload = [
                    `# stage: ${diag?.build_stage ?? "-"} | status: ${diag?.status ?? "-"} | progress: ${diag?.progress ?? "-"}`,
                    diag?.watchdog_reason ? `# watchdog: ${diag.watchdog_reason}` : "",
                    "",
                    "## last_log",
                    diag?.last_log || "(vazio)",
                    "",
                    "## stdout",
                    diag?.stdout_tail || "(vazio)",
                    "",
                    "## stderr",
                    diag?.stderr_tail || "(vazio)",
                  ].join("\n");
                  try {
                    await navigator.clipboard.writeText(payload);
                    setDiagCopied(true);
                    setTimeout(() => setDiagCopied(false), 1500);
                  } catch { /* noop */ }
                }}
                className="flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground"
              >
                <Copy className="h-3 w-3" /> {diagCopied ? "Copiado" : "Copiar"}
              </button>
            </div>

            {diag?.watchdog_reason && (
              <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                ⚠ {diag.watchdog_reason}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">stdout</div>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-black/60 px-2 py-2 font-mono text-[10.5px] leading-relaxed text-emerald-300/90">
{diag?.stdout_tail?.trim() || "(sem saída ainda)"}
                </pre>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">stderr</div>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-black/60 px-2 py-2 font-mono text-[10.5px] leading-relaxed text-rose-300/90">
{diag?.stderr_tail?.trim() || "(sem erros)"}
                </pre>
              </div>
            </div>

            {diag?.last_log && (
              <div className="mt-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Última linha</div>
                <pre className="max-h-24 overflow-auto whitespace-pre-wrap rounded-md bg-black/40 px-2 py-2 font-mono text-[10.5px] leading-relaxed text-foreground/90">
{diag.last_log.trim()}
                </pre>
              </div>
            )}

            <p className="mt-2 text-[10px] text-muted-foreground">
              Atualiza a cada 3s · exibe apenas os últimos ~4KB de cada stream · visível somente ao dono do projeto.
            </p>
          </div>


          {isError && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/generator")}
                className="flex-1 py-3 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold transition hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Tentar novamente
              </button>
              <Link
                to="/historico"
                className="flex-1 py-3 bg-muted text-foreground font-display font-semibold rounded-lg border border-border hover:border-primary/40 transition flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" /> Ver histórico
              </Link>
            </div>
          )}

          {!isTerminal && (
            <p className="text-[11px] text-muted-foreground text-center">
              <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
              Pipeline rodando em segundo plano. Pode fechar esta aba — o build continua.
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Processing;
