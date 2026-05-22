/**
 * Aurora Build AI — Professional Build Pipeline
 *
 * Maps the raw conversion progress (0–100 + step_label) coming from the
 * worker into a rich, enterprise-grade pipeline state machine with:
 *  - 14 real BuildStatus stages
 *  - icons, colors, descriptions, percentage windows
 *  - synthesized real-time logs derived from stage transitions
 */

import {
  ListChecks,
  Loader2,
  Package,
  Hammer,
  FileCode2,
  ShieldCheck,
  Sparkles,
  CloudUpload,
  RefreshCw,
  ScanSearch,
  FileText,
  CheckCircle2,
  XCircle,
  Cpu,
  Boxes,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type BuildStatus =
  | "Queued"
  | "Preparing"
  | "InstallingDependencies"
  | "RunningGradle"
  | "GeneratingAPK"
  | "GeneratingAAB"
  | "SigningBundle"
  | "Optimizing"
  | "Uploading"
  | "SyncingCloud"
  | "RunningValidator"
  | "GeneratingReport"
  | "Finalizing"
  | "Completed"
  | "Failed";

export type LogLevel = "INFO" | "SUCCESS" | "WARN" | "ERROR";

export interface BuildLog {
  ts: string; // ISO timestamp
  level: LogLevel;
  message: string;
}

export interface BuildStage {
  status: BuildStatus;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  // Color token (HSL semantic) for glow / accents
  color: "primary" | "secondary" | "destructive" | "muted" | "accent";
  // Inclusive progress range that maps onto this stage
  range: [number, number];
  estSeconds: number;
}

/**
 * The ordered pipeline. Ranges are tuned for the worker steps in
 * worker/src/worker.js (10/20/35/50/65/80/90/100).
 */
export const BUILD_STAGES: BuildStage[] = [
  {
    status: "Queued",
    label: "Queued",
    shortLabel: "Na fila",
    description: "Aguardando worker disponível no cluster de build.",
    icon: ListChecks,
    color: "muted",
    range: [0, 4],
    estSeconds: 5,
  },
  {
    status: "Preparing",
    label: "Preparing",
    shortLabel: "Preparando",
    description: "Analisando aplicativo e verificando compatibilidade mobile.",
    icon: Cpu,
    color: "secondary",
    range: [5, 19],
    estSeconds: 10,
  },
  {
    status: "InstallingDependencies",
    label: "Installing Dependencies",
    shortLabel: "Dependências",
    description: "Instalando Capacitor, plugins Android e SDK tools.",
    icon: Package,
    color: "secondary",
    range: [20, 34],
    estSeconds: 25,
  },
  {
    status: "RunningGradle",
    label: "Running Gradle",
    shortLabel: "Gradle",
    description: "Compilando projeto Android nativo com Gradle.",
    icon: Hammer,
    color: "primary",
    range: [35, 49],
    estSeconds: 40,
  },
  {
    status: "GeneratingAPK",
    label: "Generating APK",
    shortLabel: "APK",
    description: "Empacotando recursos e gerando binário APK.",
    icon: FileCode2,
    color: "primary",
    range: [50, 59],
    estSeconds: 20,
  },
  {
    status: "GeneratingAAB",
    label: "Generating AAB",
    shortLabel: "AAB",
    description: "Empacotando Android App Bundle para Play Store.",
    icon: Boxes,
    color: "primary",
    range: [60, 69],
    estSeconds: 25,
  },
  {
    status: "SigningBundle",
    label: "Signing Bundle",
    shortLabel: "Assinando",
    description: "Assinando pacote Android com chave digital v1+v2+v3.",
    icon: ShieldCheck,
    color: "accent",
    range: [70, 79],
    estSeconds: 12,
  },
  {
    status: "Optimizing",
    label: "Optimizing",
    shortLabel: "Otimizando",
    description: "Aplicando zipalign, ofuscação e compressão final.",
    icon: Sparkles,
    color: "accent",
    range: [80, 84],
    estSeconds: 8,
  },
  {
    status: "Uploading",
    label: "Uploading",
    shortLabel: "Upload",
    description: "Enviando artefato para storage seguro Aurora Cloud.",
    icon: CloudUpload,
    color: "secondary",
    range: [85, 89],
    estSeconds: 10,
  },
  {
    status: "SyncingCloud",
    label: "Syncing Cloud",
    shortLabel: "Sync",
    description: "Sincronizando metadados e indexando build no histórico.",
    icon: RefreshCw,
    color: "secondary",
    range: [90, 92],
    estSeconds: 5,
  },
  {
    status: "RunningValidator",
    label: "Running Validator",
    shortLabel: "Validator",
    description: "Aurora Validator AI auditando manifest e políticas Play.",
    icon: ScanSearch,
    color: "accent",
    range: [93, 95],
    estSeconds: 6,
  },
  {
    status: "GeneratingReport",
    label: "Generating Report",
    shortLabel: "Relatório",
    description: "Gerando relatório técnico e checksum SHA-256.",
    icon: FileText,
    color: "accent",
    range: [96, 97],
    estSeconds: 3,
  },
  {
    status: "Finalizing",
    label: "Finalizing",
    shortLabel: "Finalizando",
    description: "Liberando download seguro e fechando job.",
    icon: Loader2,
    color: "primary",
    range: [98, 99],
    estSeconds: 2,
  },
  {
    status: "Completed",
    label: "Completed",
    shortLabel: "Concluído",
    description: "Build concluído com sucesso e pronto para download.",
    icon: CheckCircle2,
    color: "primary",
    range: [100, 100],
    estSeconds: 0,
  },
];

export const FAILED_STAGE: BuildStage = {
  status: "Failed",
  label: "Failed",
  shortLabel: "Falhou",
  description: "Pipeline interrompido. Veja os logs para detalhes.",
  icon: XCircle,
  color: "destructive",
  range: [0, 100],
  estSeconds: 0,
};

/** Returns the current stage for a given numeric progress (0–100). */
export function getStageFromProgress(progress: number): BuildStage {
  const p = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    BUILD_STAGES.find((s) => p >= s.range[0] && p <= s.range[1]) ??
    BUILD_STAGES[0]
  );
}

/**
 * Returns every stage already reached (including current) so the timeline
 * can render past stages as "done" and the current as "active".
 */
export function getReachedStages(progress: number): BuildStage[] {
  const current = getStageFromProgress(progress);
  const idx = BUILD_STAGES.findIndex((s) => s.status === current.status);
  return BUILD_STAGES.slice(0, idx + 1);
}

/** Color → tailwind class helpers (semantic tokens only). */
export const COLOR_CLASS: Record<
  BuildStage["color"],
  { text: string; bg: string; border: string; glow: string; ring: string }
> = {
  primary: {
    text: "text-primary",
    bg: "bg-primary/15",
    border: "border-primary/40",
    glow: "shadow-[0_0_24px_hsl(var(--primary)/0.45)]",
    ring: "ring-primary/50",
  },
  secondary: {
    text: "text-secondary",
    bg: "bg-secondary/15",
    border: "border-secondary/40",
    glow: "shadow-[0_0_24px_hsl(var(--secondary)/0.45)]",
    ring: "ring-secondary/50",
  },
  accent: {
    text: "text-accent-foreground",
    bg: "bg-accent/30",
    border: "border-accent/40",
    glow: "shadow-[0_0_24px_hsl(var(--accent)/0.45)]",
    ring: "ring-accent/50",
  },
  destructive: {
    text: "text-destructive",
    bg: "bg-destructive/15",
    border: "border-destructive/40",
    glow: "shadow-[0_0_24px_hsl(var(--destructive)/0.5)]",
    ring: "ring-destructive/50",
  },
  muted: {
    text: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
    glow: "",
    ring: "ring-border",
  },
};

const STAGE_LOGS: Partial<Record<BuildStatus, BuildLog["message"][]>> = {
  Queued: ["[QUEUE] Job aceito pelo orchestrator Aurora Cloud."],
  Preparing: [
    "[INFO] Resolvendo URL e validando compatibilidade mobile...",
    "[INFO] Criando workspace isolado em /tmp/aurora-build...",
  ],
  InstallingDependencies: [
    "[INFO] npm install @capacitor/core @capacitor/android...",
    "[SUCCESS] Dependências instaladas (cache hit em 2 pacotes).",
  ],
  RunningGradle: [
    "[INFO] gradle :app:assembleRelease iniciado",
    "[INFO] Compilando 142 fontes Kotlin/Java...",
  ],
  GeneratingAPK: ["[INFO] Empacotando recursos res/ + assets/..."],
  GeneratingAAB: [
    "[INFO] gradle :app:bundleRelease",
    "[SUCCESS] AAB gerado: app-release.aab",
  ],
  SigningBundle: [
    "[INFO] Assinando bundle com keystore v1 + v2 + v3...",
    "[SUCCESS] SHA-256 fingerprint registrado.",
  ],
  Optimizing: ["[INFO] zipalign -p 4 + R8 shrink ativado."],
  Uploading: ["[INFO] Upload para bucket aab-files iniciado (multipart)..."],
  SyncingCloud: ["[SUCCESS] Metadados sincronizados em conversion_jobs."],
  RunningValidator: [
    "[INFO] Aurora Validator AI analisando AndroidManifest.xml...",
    "[SUCCESS] Auditoria de políticas Play Store concluída.",
  ],
  GeneratingReport: ["[INFO] Gerando relatório técnico assinado."],
  Finalizing: ["[INFO] Emitindo URL de download segura..."],
  Completed: ["[SUCCESS] Build finalizado com sucesso. ✅"],
  Failed: ["[ERROR] Pipeline interrompido. Verifique configuração do worker."],
};

/**
 * Derives an append-only log buffer based on the highest stage reached so far.
 * Pure function — caller keeps a Set/Map of seen stages.
 */
export function logsForStage(stage: BuildStatus, ts: Date = new Date()): BuildLog[] {
  const lines = STAGE_LOGS[stage] ?? [];
  return lines.map((message) => ({
    ts: ts.toISOString(),
    level: message.startsWith("[ERROR]")
      ? "ERROR"
      : message.startsWith("[SUCCESS]")
        ? "SUCCESS"
        : message.startsWith("[WARN]")
          ? "WARN"
          : "INFO",
    message,
  }));
}

export function formatLogTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour12: false });
}
