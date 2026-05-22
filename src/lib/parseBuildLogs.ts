/**
 * Aurora Build AI — Build Logs Parser
 *
 * Normaliza logs vindos de múltiplas fontes (worker stdout/stderr, Gradle,
 * npm, vite, tsc, supabase CLI, firebase, capacitor, bundletool) em entradas
 * estruturadas e tipadas, prontas para análise pelo buildErrorAnalyzer.
 */

export type LogSource =
  | "stdout"
  | "stderr"
  | "stacktrace"
  | "gradle"
  | "npm"
  | "vite"
  | "typescript"
  | "supabase"
  | "firebase"
  | "capacitor"
  | "bundletool"
  | "system";

export type ParsedLogLevel = "info" | "warn" | "error" | "fatal" | "debug";

export interface ParsedLogLine {
  raw: string;
  source: LogSource;
  level: ParsedLogLevel;
  message: string;
  /** Linha original (índice 0-based) na entrada — útil para “Ver logs completos”. */
  lineIndex: number;
}

const SOURCE_PATTERNS: Array<{ source: LogSource; re: RegExp }> = [
  { source: "gradle", re: /\b(gradle|FAILURE: Build failed|:app:[a-zA-Z]+)\b/i },
  { source: "bundletool", re: /\bbundletool\b/i },
  { source: "capacitor", re: /\bcapacitor(?:\/[a-z-]+)?\b/i },
  { source: "vite", re: /\bvite(?:\s|:)/i },
  { source: "typescript", re: /\bTS\d{3,5}\b|\btsc\b/ },
  { source: "npm", re: /\bnpm (ERR!|warn|notice)\b/i },
  { source: "supabase", re: /\bsupabase(?:\s|\/|:)/i },
  { source: "firebase", re: /\bfirebase(?:\s|\/|:)/i },
  { source: "stacktrace", re: /^\s+at\s+.+\(.+:\d+:\d+\)\s*$/ },
];

const LEVEL_PATTERNS: Array<{ level: ParsedLogLevel; re: RegExp }> = [
  { level: "fatal", re: /\b(FATAL|panic|segmentation fault|out of memory)\b/i },
  { level: "error", re: /\b(error|err!|failure|failed|exception|✖)\b/i },
  { level: "warn", re: /\b(warn(ing)?|deprecated|⚠)\b/i },
  { level: "debug", re: /\b(debug|verbose)\b/i },
];

function detectSource(line: string, fallback: LogSource = "stdout"): LogSource {
  for (const p of SOURCE_PATTERNS) if (p.re.test(line)) return p.source;
  return fallback;
}

function detectLevel(line: string): ParsedLogLevel {
  for (const p of LEVEL_PATTERNS) if (p.re.test(line)) return p.level;
  return "info";
}

/** Quebra logs brutos em linhas normalizadas. */
export function parseBuildLogs(
  raw: string | string[],
  defaultSource: LogSource = "stdout",
): ParsedLogLine[] {
  const lines = Array.isArray(raw) ? raw : raw.split(/\r?\n/);
  return lines
    .map((line, lineIndex) => {
      const trimmed = line.replace(/\u001b\[[0-9;]*m/g, ""); // strip ANSI
      if (!trimmed.trim()) return null;
      return {
        raw: line,
        source: detectSource(trimmed, defaultSource),
        level: detectLevel(trimmed),
        message: trimmed.trim(),
        lineIndex,
      } satisfies ParsedLogLine;
    })
    .filter((x): x is ParsedLogLine => x !== null);
}

/** Retorna apenas linhas com severidade >= warn. */
export function filterIssues(lines: ParsedLogLine[]): ParsedLogLine[] {
  return lines.filter((l) => l.level === "warn" || l.level === "error" || l.level === "fatal");
}

/** Junta múltiplas fontes em um único stream ordenado. */
export function mergeStreams(
  streams: Array<{ source: LogSource; content: string }>,
): ParsedLogLine[] {
  return streams.flatMap((s) => parseBuildLogs(s.content, s.source));
}
