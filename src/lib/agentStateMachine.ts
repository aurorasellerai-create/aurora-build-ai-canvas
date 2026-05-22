export const AGENT_STAGES = [
  "analyzing",
  "planning",
  "modifying_files",
  "compiling",
  "validating",
  "fixing",
  "restarting_preview",
  "finalizing",
] as const;

export type AgentStage = (typeof AGENT_STAGES)[number];

export type AgentStatus =
  | "idle"
  | "thinking"
  | "working"
  | "blocked"
  | "recovering"
  | "success"
  | "failed";

export const AGENT_STAGE_LABELS: Record<AgentStage, string> = {
  analyzing: "Analisando contexto",
  planning: "Planejando execução",
  modifying_files: "Modificando arquivos",
  compiling: "Compilando build",
  validating: "Validando saída",
  fixing: "Corrigindo erros",
  restarting_preview: "Reiniciando preview",
  finalizing: "Finalizando agente",
};

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  idle: "Em espera",
  thinking: "Pensando",
  working: "Executando",
  blocked: "Bloqueado",
  recovering: "Recuperando",
  success: "Sucesso",
  failed: "Falhou",
};

export const AGENT_STATUS_COLORS: Record<AgentStatus, string> = {
  idle: "hsl(var(--muted-foreground))",
  thinking: "hsl(200 100% 60%)",
  working: "hsl(165 100% 55%)",
  blocked: "hsl(40 100% 60%)",
  recovering: "hsl(280 100% 70%)",
  success: "hsl(150 100% 55%)",
  failed: "hsl(0 90% 60%)",
};

export interface AgentSubtask {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "failed";
  durationMs?: number;
}

export interface AgentTimelineEvent {
  id: string;
  timestamp: number;
  action: string;
  files?: string[];
  durationMs?: number;
  impact?: "low" | "medium" | "high";
  status?: AgentStatus;
}

export interface AgentExecutionState {
  status: AgentStatus;
  stage: AgentStage;
  thought: string;
  progress: number;
  subtasks: AgentSubtask[];
  startedAt: number;
  estimatedMs: number;
  logs: string[];
  workerStatus: "online" | "degraded" | "offline";
  cloudStatus: "online" | "degraded" | "offline";
  memoryMb: number;
  cpuPct: number;
  timeline: AgentTimelineEvent[];
  recovery?: {
    reason: string;
    retryCount: number;
    nextRetryMs?: number;
  } | null;
}

export function stageOrder(stage: AgentStage): number {
  return AGENT_STAGES.indexOf(stage);
}

export function stageProgress(stage: AgentStage): number {
  return Math.round(((stageOrder(stage) + 1) / AGENT_STAGES.length) * 100);
}

export function isTerminal(status: AgentStatus): boolean {
  return status === "success" || status === "failed";
}

export function nextStage(stage: AgentStage): AgentStage {
  const idx = stageOrder(stage);
  return AGENT_STAGES[Math.min(idx + 1, AGENT_STAGES.length - 1)];
}

export function createInitialAgentState(overrides: Partial<AgentExecutionState> = {}): AgentExecutionState {
  return {
    status: "idle",
    stage: "analyzing",
    thought: "Aguardando instrução do operador...",
    progress: 0,
    subtasks: [],
    startedAt: Date.now(),
    estimatedMs: 60_000,
    logs: [],
    workerStatus: "online",
    cloudStatus: "online",
    memoryMb: 0,
    cpuPct: 0,
    timeline: [],
    recovery: null,
    ...overrides,
  };
}
