import { supabase } from "@/integrations/supabase/client";
import {
  AGENT_STAGES,
  type AgentExecutionState,
  type AgentStage,
  type AgentStatus,
  type AgentTimelineEvent,
  createInitialAgentState,
  isTerminal,
  nextStage,
  stageProgress,
} from "@/lib/agentStateMachine";

export type AgentStateListener = (state: AgentExecutionState) => void;

const THOUGHTS: Record<AgentStage, string[]> = {
  analyzing: [
    "Mapeando arquivos relevantes e dependências do projeto...",
    "Lendo contexto da intenção do operador...",
    "Identificando módulos impactados pela mudança...",
  ],
  planning: [
    "Estruturando plano de execução em etapas atômicas...",
    "Selecionando estratégias de refatoração seguras...",
    "Calculando ordem ideal de mutações...",
  ],
  modifying_files: [
    "Aplicando patches em componentes-alvo...",
    "Reescrevendo trechos com novas tipagens...",
    "Sincronizando alterações entre módulos...",
  ],
  compiling: [
    "Vite reconstruindo grafo de módulos...",
    "Resolvendo imports e tree-shaking...",
    "Gerando bundles otimizados...",
  ],
  validating: [
    "Executando type-check e linters...",
    "Verificando contratos de API e RLS...",
    "Validando integridade visual da UI...",
  ],
  fixing: [
    "Corrigindo divergências detectadas...",
    "Aplicando recuperação automática de erros...",
    "Reescrevendo trechos quebrados...",
  ],
  restarting_preview: [
    "Reinicializando preview do sandbox...",
    "Reconectando HMR e websockets...",
    "Restaurando estado do navegador...",
  ],
  finalizing: [
    "Finalizando ciclo, gravando memória...",
    "Atualizando timeline e métricas...",
    "Liberando recursos do worker...",
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export interface AgentRealtimeOptions {
  jobId?: string;
  simulate?: boolean;
  tickMs?: number;
}

export class AgentRealtimeController {
  private state: AgentExecutionState;
  private listeners = new Set<AgentStateListener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private opts: AgentRealtimeOptions;

  constructor(opts: AgentRealtimeOptions = {}) {
    this.opts = { tickMs: 1500, simulate: true, ...opts };
    this.state = createInitialAgentState({ status: "thinking", stage: "analyzing" });
  }

  getState(): AgentExecutionState {
    return this.state;
  }

  subscribe(listener: AgentStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  start() {
    this.state = createInitialAgentState({
      status: "thinking",
      stage: "analyzing",
      startedAt: Date.now(),
      thought: pick(THOUGHTS.analyzing),
      subtasks: AGENT_STAGES.map((s) => ({ id: s, label: s, status: "pending" })),
    });
    this.emit();

    if (this.opts.simulate) this.startSimulation();
    if (this.opts.jobId) this.connectRealtime(this.opts.jobId);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  triggerRecovery(reason: string) {
    this.update({
      status: "recovering",
      recovery: {
        reason,
        retryCount: (this.state.recovery?.retryCount ?? 0) + 1,
        nextRetryMs: 5_000,
      },
    });
    this.pushTimeline({ action: `Recovery acionado: ${reason}`, status: "recovering", impact: "high" });
  }

  triggerBlock(reason: string) {
    this.update({ status: "blocked", thought: reason });
    this.pushTimeline({ action: `Bloqueado: ${reason}`, status: "blocked", impact: "medium" });
  }

  finishSuccess() {
    this.update({
      status: "success",
      stage: "finalizing",
      progress: 100,
      thought: "Ciclo concluído com sucesso.",
    });
    this.pushTimeline({ action: "Execução concluída", status: "success", impact: "high" });
    this.stop();
  }

  finishFailure(reason: string) {
    this.update({ status: "failed", thought: reason });
    this.pushTimeline({ action: `Execução falhou: ${reason}`, status: "failed", impact: "high" });
    this.stop();
  }

  private startSimulation() {
    this.timer = setInterval(() => {
      if (isTerminal(this.state.status)) {
        this.stop();
        return;
      }

      const currentStage = this.state.stage;
      const targetProgress = stageProgress(currentStage);
      const newProgress = Math.min(100, this.state.progress + Math.random() * 6 + 2);

      const memoryMb = Math.round(280 + Math.random() * 220);
      const cpuPct = Math.round(20 + Math.random() * 60);
      const thought = pick(THOUGHTS[currentStage]);

      let status: AgentStatus = this.state.status;
      if (this.state.status === "thinking" && newProgress > 5) status = "working";

      const logs = [...this.state.logs, `[${new Date().toLocaleTimeString()}] ${thought}`].slice(-40);

      this.update({ progress: newProgress, memoryMb, cpuPct, thought, status, logs });

      if (newProgress >= targetProgress && currentStage !== "finalizing") {
        const next = nextStage(currentStage);
        this.pushTimeline({
          action: `Etapa concluída: ${currentStage}`,
          files: this.fakeFilesForStage(currentStage),
          durationMs: Math.round(this.opts.tickMs! * (3 + Math.random() * 4)),
          impact: "medium",
          status: "working",
        });
        this.update({
          stage: next,
          subtasks: this.state.subtasks.map((s) =>
            s.id === currentStage ? { ...s, status: "done" } : s.id === next ? { ...s, status: "running" } : s,
          ),
        });
      }

      if (this.state.progress >= 100) this.finishSuccess();
    }, this.opts.tickMs);
  }

  private fakeFilesForStage(stage: AgentStage): string[] {
    const map: Partial<Record<AgentStage, string[]>> = {
      modifying_files: ["src/components/agent/AgentExecutionPanel.tsx", "src/lib/agentStateMachine.ts"],
      compiling: ["vite.config.ts"],
      validating: ["tsconfig.json"],
      fixing: ["src/lib/agentRealtime.ts"],
    };
    return map[stage] ?? [];
  }

  private connectRealtime(jobId: string) {
    this.channel = supabase
      .channel(`agent-job-${jobId}`)
      .on("broadcast", { event: "agent-update" }, ({ payload }) => {
        if (payload && typeof payload === "object") this.update(payload as Partial<AgentExecutionState>);
      })
      .subscribe();
  }

  private pushTimeline(evt: Omit<AgentTimelineEvent, "id" | "timestamp">) {
    const event: AgentTimelineEvent = { id: uid(), timestamp: Date.now(), ...evt };
    this.update({ timeline: [...this.state.timeline, event].slice(-50) });
  }

  private update(patch: Partial<AgentExecutionState>) {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private emit() {
    for (const l of this.listeners) l(this.state);
  }
}

export function createAgentController(opts?: AgentRealtimeOptions) {
  return new AgentRealtimeController(opts);
}
