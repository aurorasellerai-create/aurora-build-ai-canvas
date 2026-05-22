import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Brain, Cpu, Database, MemoryStick, Cloud, Workflow,
  AlertTriangle, RefreshCw, ShieldAlert, CheckCircle2, Loader2, Terminal, Sparkles,
} from "lucide-react";
import {
  AGENT_STAGES,
  AGENT_STAGE_LABELS,
  AGENT_STATUS_COLORS,
  AGENT_STATUS_LABELS,
  type AgentExecutionState,
  type AgentStage,
} from "@/lib/agentStateMachine";
import { createAgentController, type AgentRealtimeController } from "@/lib/agentRealtime";
import AgentTimeline from "@/components/agent/AgentTimeline";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AgentExecutionPanelProps {
  controller?: AgentRealtimeController;
  jobId?: string;
  autoStart?: boolean;
  className?: string;
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function StatusOrb({ status }: { status: AgentExecutionState["status"] }) {
  const color = AGENT_STATUS_COLORS[status];
  return (
    <div className="relative h-12 w-12 shrink-0">
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle, ${color}55, transparent 70%)` }}
        animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <div
        className="absolute inset-2 rounded-full flex items-center justify-center"
        style={{ background: color, boxShadow: `0 0 20px ${color}, inset 0 0 12px hsl(var(--background))` }}
      >
        <Brain className="h-4 w-4 text-background" />
      </div>
    </div>
  );
}

function Scanlines() {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.07]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, hsl(var(--primary)) 2px, hsl(var(--primary)) 3px)",
      }}
    />
  );
}

function Particles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-primary"
          style={{ left: `${(i * 73) % 100}%`, top: `${(i * 37) % 100}%`, boxShadow: "0 0 8px hsl(var(--primary))" }}
          animate={{ y: [0, -20, 0], opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function TypingThought({ text }: { text: string }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [text]);
  return (
    <p className="font-mono text-sm text-primary/90">
      <span className="text-primary mr-1">›</span>
      {shown}
      <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
        ▍
      </motion.span>
    </p>
  );
}

function Metric({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-primary/15 bg-background/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 font-display text-sm font-bold" style={{ color: accent ?? "hsl(var(--foreground))" }}>
        {value}
      </div>
    </div>
  );
}

function PipelineRail({ stage }: { stage: AgentStage }) {
  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
      {AGENT_STAGES.map((s, i) => {
        const currentIdx = AGENT_STAGES.indexOf(stage);
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s} className="flex flex-col gap-1">
            <motion.div
              className="h-1.5 rounded-full overflow-hidden"
              style={{
                background: done
                  ? "hsl(150 100% 55%)"
                  : active
                    ? "linear-gradient(90deg, hsl(var(--primary)), hsl(200 100% 60%))"
                    : "hsl(var(--muted))",
                boxShadow: active ? "0 0 12px hsl(var(--primary))" : undefined,
              }}
              animate={active ? { opacity: [0.6, 1, 0.6] } : {}}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
            <span className={`text-[9px] truncate ${active ? "text-primary" : "text-muted-foreground"}`}>
              {AGENT_STAGE_LABELS[s].split(" ")[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AgentExecutionPanel({
  controller: externalController,
  jobId,
  autoStart = true,
  className,
}: AgentExecutionPanelProps) {
  const ownedRef = useRef<AgentRealtimeController | null>(null);
  if (!externalController && !ownedRef.current) {
    ownedRef.current = createAgentController({ jobId, simulate: true });
  }
  const controller = externalController ?? ownedRef.current!;

  const [state, setState] = useState<AgentExecutionState>(controller.getState());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const unsub = controller.subscribe(setState);
    if (autoStart && !externalController) controller.start();
    return () => {
      unsub();
      if (!externalController) controller.stop();
    };
  }, [controller, autoStart, externalController]);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - state.startedAt), 500);
    return () => clearInterval(id);
  }, [state.startedAt]);

  const remaining = useMemo(
    () => Math.max(0, state.estimatedMs - elapsed),
    [state.estimatedMs, elapsed],
  );
  const statusColor = AGENT_STATUS_COLORS[state.status];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-background via-background to-primary/5 ${className ?? ""}`}
      style={{ boxShadow: `0 0 40px ${statusColor}22, inset 0 0 60px ${statusColor}11` }}
    >
      <Scanlines />
      <Particles />

      <div className="relative p-5 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <StatusOrb status={state.status} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ borderColor: statusColor, color: statusColor, background: `${statusColor}11` }}
              >
                <Activity className="h-3 w-3" /> {AGENT_STATUS_LABELS[state.status]}
              </span>
              <span className="text-xs text-muted-foreground">Etapa:</span>
              <span className="text-xs font-semibold text-foreground">{AGENT_STAGE_LABELS[state.stage]}</span>
            </div>
            <h2 className="mt-1 font-display text-lg font-bold text-gradient-gold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Aurora Agent — Execution Core
            </h2>
            <div className="mt-2">
              <TypingThought text={state.thought} />
            </div>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            <span>Progresso global</span>
            <span className="tabular-nums text-primary">{Math.round(state.progress)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden relative">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: `linear-gradient(90deg, hsl(var(--primary)), ${statusColor})`,
                boxShadow: `0 0 12px ${statusColor}`,
              }}
              animate={{ width: `${state.progress}%` }}
              transition={{ duration: 0.4 }}
            />
            <motion.div
              className="absolute inset-y-0 w-12 opacity-50"
              style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)" }}
              animate={{ x: ["-10%", "120%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>

        {/* Pipeline rail */}
        <PipelineRail stage={state.stage} />

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Metric icon={Activity} label="Decorrido" value={formatDuration(elapsed)} accent="hsl(var(--primary))" />
          <Metric icon={Activity} label="Restante" value={`~${formatDuration(remaining)}`} />
          <Metric icon={Cpu} label="CPU" value={`${state.cpuPct}%`} accent="hsl(200 100% 60%)" />
          <Metric icon={MemoryStick} label="Memória" value={`${state.memoryMb} MB`} accent="hsl(280 100% 70%)" />
          <Metric
            icon={Workflow}
            label="Worker"
            value={state.workerStatus}
            accent={state.workerStatus === "online" ? "hsl(150 100% 55%)" : "hsl(40 100% 60%)"}
          />
          <Metric
            icon={Cloud}
            label="Cloud"
            value={state.cloudStatus}
            accent={state.cloudStatus === "online" ? "hsl(150 100% 55%)" : "hsl(40 100% 60%)"}
          />
        </div>

        {/* Recovery */}
        <AnimatePresence>
          {state.recovery && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 flex items-start gap-3"
              style={{ boxShadow: "0 0 20px hsl(40 100% 60% / 0.2)" }}
            >
              <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <p className="font-semibold text-amber-300">Recovery Mode ativo</p>
                <p className="text-muted-foreground mt-0.5">{state.recovery.reason}</p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-amber-200/80">
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Tentativa #{state.recovery.retryCount}
                  </span>
                  {state.recovery.nextRetryMs && (
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Watchdog ativo
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtasks + Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-primary/20 bg-background/60 backdrop-blur">
            <div className="flex items-center gap-2 border-b border-primary/15 px-4 py-3">
              <Database className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-bold text-foreground">Subtarefas</h3>
            </div>
            <ScrollArea className="h-[220px]">
              <ul className="p-3 space-y-1.5">
                {state.subtasks.map((s) => {
                  const isRunning = s.status === "running";
                  const isDone = s.status === "done";
                  const isFailed = s.status === "failed";
                  return (
                    <li
                      key={s.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs"
                      style={{
                        background: isRunning ? "hsl(var(--primary) / 0.08)" : "transparent",
                        border: isRunning ? "1px solid hsl(var(--primary) / 0.3)" : "1px solid transparent",
                      }}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      ) : isFailed ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      ) : isRunning ? (
                        <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                      )}
                      <span className={isDone ? "text-muted-foreground line-through" : "text-foreground"}>
                        {AGENT_STAGE_LABELS[s.id as AgentStage] ?? s.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </div>

          <div className="rounded-xl border border-primary/20 bg-black/60 backdrop-blur overflow-hidden">
            <div className="flex items-center gap-2 border-b border-primary/15 px-4 py-3">
              <Terminal className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-bold text-foreground">Stream de logs</h3>
              <span className="ml-auto text-[10px] uppercase tracking-widest text-primary/70 animate-pulse">live</span>
            </div>
            <ScrollArea className="h-[220px]">
              <pre className="p-3 font-mono text-[11px] leading-relaxed text-emerald-300/90 whitespace-pre-wrap">
                {state.logs.length === 0 ? (
                  <span className="text-muted-foreground">Inicializando stream...</span>
                ) : (
                  state.logs.join("\n")
                )}
              </pre>
            </ScrollArea>
          </div>
        </div>

        {/* Timeline */}
        <AgentTimeline events={state.timeline} />
      </div>
    </div>
  );
}
