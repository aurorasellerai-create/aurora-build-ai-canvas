import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  CreditCard,
  Cpu,
  Fingerprint,
  Gauge,
  KeyRound,
  Link2,
  Lock,
  Navigation,
  Play,
  Radar,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  XCircle,
  Zap,
} from "lucide-react";

/* ============================================================
   Helpers
============================================================ */
const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export type ValidatorScores = {
  overall: number;
  security: number;
  performance: number;
  playstore: number;
  navigation: number;
  checkout: number;
};

export function deriveValidatorScores(args: {
  errors: Array<{ severity: string; category: string }>;
  counts: { ok: number; warn: number; danger: number };
  ready: boolean;
}): ValidatorScores {
  const { errors, counts, ready } = args;
  const security = clamp(100 - counts.danger * 18 - counts.warn * 5);
  const playstore = clamp(100 - counts.danger * 22 - counts.warn * 4);
  const performance = clamp(94 - errors.filter((e) => e.category === "performance").length * 16 - counts.warn * 2);
  const navigation = clamp(
    100 - errors.filter((e) => e.category === "navegação" || e.category === "botão").length * 22,
  );
  const checkout = clamp(100 - errors.filter((e) => e.category === "checkout").length * 38);
  const overall = clamp(Math.round((security + playstore + performance + navigation + checkout) / 5 + (ready ? 4 : -2)));
  return { overall, security, performance, playstore, navigation, checkout };
}

const scoreTone = (v: number) => {
  if (v >= 85) return { color: "text-secondary", bg: "bg-secondary/10", border: "border-secondary/40", glow: "glow-cyan", label: "RISCO BAIXO", stroke: "hsl(var(--secondary))" };
  if (v >= 60) return { color: "text-primary", bg: "bg-primary/10", border: "border-primary/40", glow: "glow-gold", label: "RISCO MÉDIO", stroke: "hsl(var(--primary))" };
  return { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/40", glow: "", label: "RISCO ALTO", stroke: "hsl(var(--destructive))" };
};

/* ============================================================
   Animated Counter
============================================================ */
function Counter({ to, duration = 1400, className = "" }: { to: number; duration?: number; className?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return <span ref={ref} className={className}>{val}</span>;
}

/* ============================================================
   Premium Score Hero — gigantic main score + sub-scores ring
============================================================ */
export function PremiumScoreHero({
  scores,
  ready,
  validationId,
  appName,
  format,
}: {
  scores: ValidatorScores;
  ready: boolean;
  validationId: string;
  appName: string;
  format: string;
}) {
  const tone = scoreTone(scores.overall);
  const size = 220;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1600;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(scores.overall * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, scores.overall]);

  const offset = c - (progress / 100) * c;

  const subScores: Array<[string, number, typeof Lock]> = [
    ["Segurança", scores.security, Lock],
    ["Performance", scores.performance, Gauge],
    ["Play Store", scores.playstore, ShieldCheck],
    ["Navegação", scores.navigation, Navigation],
    ["Checkout", scores.checkout, CreditCard],
  ];

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-background via-background to-aurora-deep/40 p-6 md:p-8"
    >
      {/* ambient glows */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-secondary/15 blur-3xl" />
      {/* scanline */}
      <motion.div
        aria-hidden
        initial={{ y: "-100%" }}
        animate={{ y: "120%" }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
      />

      <div className="relative grid lg:grid-cols-[auto_1fr] gap-8 items-center">
        {/* gigantic ring */}
        <div className={`relative shrink-0 mx-auto ${tone.glow}`} style={{ width: size, height: size }}>
          <motion.div
            aria-hidden
            animate={{ scale: [1, 1.04, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className={`absolute inset-3 rounded-full border ${tone.border}`}
          />
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--border))" strokeWidth={stroke} fill="none" opacity={0.35} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={tone.stroke}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={c}
              strokeDashoffset={offset}
              style={{ filter: `drop-shadow(0 0 10px ${tone.stroke})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">App Score</p>
            <div className={`font-display font-black text-6xl leading-none ${tone.color}`}>
              <Counter to={scores.overall} />
            </div>
            <p className="text-xs font-bold text-muted-foreground mt-1">de 100</p>
          </div>
        </div>

        {/* meta + sub-scores */}
        <div className="space-y-5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${tone.border} ${tone.bg} ${tone.color}`}>
              <Sparkles className="w-3.5 h-3.5" /> {tone.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${ready ? "border-secondary/40 bg-secondary/10 text-secondary" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
              {ready ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              {ready ? "PRONTO PARA PUBLICAÇÃO" : "CORREÇÕES NECESSÁRIAS"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 text-[11px] font-bold text-muted-foreground">
              <Fingerprint className="w-3 h-3" /> ID: {validationId.slice(0, 18).toUpperCase()}
            </span>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">Aurora Validator AI</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold leading-tight">
              Auditoria técnica · {appName}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              IA avançada de análise técnica e publicação Play Store · arquivo {format.toUpperCase()}
            </p>
          </div>

          <DimensionBars items={subScores} />
        </div>
      </div>
    </motion.section>
  );
}

/* ============================================================
   Animated Dimension Bars
============================================================ */
function DimensionBars({ items }: { items: Array<[string, number, typeof Lock]> }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div ref={ref} className="grid sm:grid-cols-2 gap-3">
      {items.map(([label, value, Icon], i) => {
        const tone = scoreTone(value);
        return (
          <div key={label} className="rounded-xl border border-border bg-background/60 backdrop-blur-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center border ${tone.border} ${tone.bg} ${tone.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-foreground truncate">{label}</span>
              </div>
              <span className={`font-mono text-sm font-bold ${tone.color}`}>
                <Counter to={value} duration={1200 + i * 100} />%
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-muted/40 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: inView ? `${value}%` : 0 }}
                transition={{ duration: 1.2, delay: 0.1 + i * 0.08, ease: "easeOut" }}
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: tone.stroke, boxShadow: `0 0 10px ${tone.stroke}` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   Processing Timeline (auto-running on mount)
============================================================ */
const TIMELINE_STEPS = [
  { label: "Manifest analisado", icon: ScanLine },
  { label: "Permissões verificadas", icon: KeyRound },
  { label: "APIs escaneadas", icon: Radar },
  { label: "Segurança validada", icon: Lock },
  { label: "Checkout analisado", icon: CreditCard },
  { label: "Navegação simulada", icon: Navigation },
  { label: "Performance calculada", icon: Gauge },
  { label: "Compatibilidade Play Store verificada", icon: ShieldCheck },
];

export function ProcessingTimeline() {
  const [done, setDone] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView) return;
    if (done >= TIMELINE_STEPS.length) return;
    const t = setTimeout(() => setDone((d) => d + 1), 320);
    return () => clearTimeout(t);
  }, [done, inView]);

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5 md:p-6"
    >
      <header className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg border border-secondary/40 bg-secondary/10 text-secondary flex items-center justify-center glow-cyan">
            <Activity className="w-4 h-4" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">Pipeline de IA</p>
            <h3 className="font-display text-lg font-bold text-gradient-cyan">Linha do tempo de processamento</h3>
          </div>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {done}/{TIMELINE_STEPS.length} etapas
        </span>
      </header>

      <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TIMELINE_STEPS.map((s, i) => {
          const isDone = i < done;
          const isActive = i === done;
          const Icon = s.icon;
          return (
            <motion.li
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`relative rounded-xl border p-3 flex items-start gap-3 transition-all ${
                isDone
                  ? "border-secondary/40 bg-secondary/5"
                  : isActive
                    ? "border-primary/50 bg-primary/5 glow-gold"
                    : "border-border bg-background/40 opacity-60"
              }`}
            >
              <span
                className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center border ${
                  isDone ? "border-secondary/40 bg-secondary/10 text-secondary" : isActive ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground"
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className={`w-4 h-4 ${isActive ? "animate-pulse" : ""}`} />}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground leading-tight">{s.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {isDone ? "concluído" : isActive ? "executando..." : "na fila"}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </motion.section>
  );
}

/* ============================================================
   AI Fixer Panel — simulated terminal logs
============================================================ */
const AI_LOG_LINES = [
  "[init] inicializando engine Aurora AI v3.2...",
  "[parse] lendo AndroidManifest.xml...",
  "[scan] inspecionando 142 chamadas de API...",
  "[fix]  removendo permissão insegura REQUEST_INSTALL_PACKAGES",
  "[fix]  ajustando android:allowBackup=\"false\"",
  "[fix]  elevando targetSdkVersion para 34",
  "[opt]  habilitando R8 + shrinkResources",
  "[opt]  comprimindo assets para WebP (-38%)",
  "[sec]  validando Play App Signing v2 + v3",
  "[sec]  bloqueando cleartext traffic global",
  "[net]  rodando lint contra políticas Play Store...",
  "[net]  verificando endpoints HTTPS (12/12 OK)",
  "[done] build otimizado · score recalculado · pronto para publicação",
];

export function AIFixerPanel({ initialScore, targetScore }: { initialScore: number; targetScore?: number }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [score, setScore] = useState(initialScore);
  const target = targetScore ?? Math.min(99, initialScore + 18);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!running) return;
    if (lines.length >= AI_LOG_LINES.length) {
      setDone(true);
      setRunning(false);
      return;
    }
    const t = setTimeout(() => {
      setLines((prev) => [...prev, AI_LOG_LINES[prev.length]]);
      setProgress(Math.round(((lines.length + 1) / AI_LOG_LINES.length) * 100));
      setScore(Math.round(initialScore + ((target - initialScore) * (lines.length + 1)) / AI_LOG_LINES.length));
    }, 380);
    return () => clearTimeout(t);
  }, [running, lines, initialScore, target]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  const start = () => {
    setLines([]);
    setProgress(0);
    setScore(initialScore);
    setDone(false);
    setRunning(true);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-aurora-deep/30 via-background to-background p-5 md:p-6"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative grid md:grid-cols-[1fr_1.2fr] gap-5 items-start">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl border border-primary/40 bg-primary/10 text-primary flex items-center justify-center glow-gold">
              <Bot className="w-5 h-5" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">Aurora AI · Auto-Fix</p>
              <h3 className="font-display text-xl font-bold text-gradient-gold">Corrigir automaticamente</h3>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A IA aplica ajustes em manifest, permissões, build flags e políticas Play Store, e recalcula o score do app em tempo real.
          </p>

          <div className="rounded-xl border border-border bg-background/60 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-bold uppercase tracking-wider">Score estimado</span>
              <span className={`font-mono font-bold ${scoreTone(score).color}`}>{score}/100</span>
            </div>
            <div className="relative h-2 rounded-full bg-muted/40 overflow-hidden">
              <motion.div
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.4 }}
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: scoreTone(score).stroke, boxShadow: `0 0 10px ${scoreTone(score).stroke}` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-bold uppercase tracking-wider">Progresso</span>
              <span className="font-mono font-bold text-primary">{progress}%</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-muted/40 overflow-hidden">
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                style={{ boxShadow: "0 0 10px hsl(var(--primary))" }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={start}
            disabled={running}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-background px-5 py-3 font-display font-bold glow-gold transition-all hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
          >
            {running ? <><Zap className="w-4 h-4 animate-pulse" /> IA processando...</> : done ? <><CheckCircle2 className="w-4 h-4" /> Corrigir novamente</> : <><Play className="w-4 h-4" /> Corrigir com IA</>}
          </button>
        </div>

        <div className="rounded-xl border border-border bg-aurora-deep/60 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-background/40">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-secondary" />
              <span className="text-[11px] font-mono text-muted-foreground">aurora-ai · auto-fix</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-destructive/70" />
              <span className="w-2 h-2 rounded-full bg-primary/70" />
              <span className="w-2 h-2 rounded-full bg-secondary/70" />
            </div>
          </div>
          <div ref={logRef} className="font-mono text-[11px] leading-relaxed p-3 h-56 overflow-y-auto space-y-0.5 text-secondary">
            {lines.length === 0 ? (
              <p className="text-muted-foreground">$ aguardando início do auto-fix...</p>
            ) : (
              lines.map((line, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={
                    line.includes("[fix]")
                      ? "text-primary"
                      : line.includes("[done]")
                        ? "text-secondary font-bold"
                        : line.includes("[sec]")
                          ? "text-destructive/90"
                          : "text-foreground/80"
                  }
                >
                  <span className="text-muted-foreground">› </span>
                  {line}
                  {i === lines.length - 1 && running && <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.7, repeat: Infinity }}>▌</motion.span>}
                </motion.p>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* ============================================================
   Before vs After
============================================================ */
const BEFORE = [
  "Risco de rejeição na Play Store",
  "Falhas ocultas no manifest",
  "Permissões perigosas declaradas",
  "Bugs de navegação não detectados",
  "Checkout quebrado em produção",
];
const AFTER = [
  "App otimizado e auditado",
  "Pronto para publicação na loja",
  "Fluxo validado ponta-a-ponta",
  "Segurança analisada por IA",
  "Correções sugeridas automaticamente",
];

export function BeforeAfterCompare() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5 md:p-6"
    >
      <header className="mb-5">
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">Antes vs Depois</p>
        <h3 className="font-display text-xl md:text-2xl font-bold text-gradient-gold">O impacto do Aurora Validator AI</h3>
      </header>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4 text-destructive" />
            <p className="font-bold text-destructive uppercase tracking-wider text-xs">Sem o Validator</p>
          </div>
          <ul className="space-y-2.5">
            {BEFORE.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-foreground/85">
                <ShieldAlert className="w-4 h-4 text-destructive shrink-0 mt-0.5" /> {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-5 glow-cyan">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-secondary" />
            <p className="font-bold text-secondary uppercase tracking-wider text-xs">Com o Aurora AI</p>
          </div>
          <ul className="space-y-2.5">
            {AFTER.map((a) => (
              <li key={a} className="flex items-start gap-2 text-sm text-foreground/90">
                <ShieldCheck className="w-4 h-4 text-secondary shrink-0 mt-0.5" /> {a}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.section>
  );
}

/* ============================================================
   Auto Detections Grid
============================================================ */
const DETECTIONS = [
  { label: "SDKs inseguros", icon: Cpu, sev: "warn" },
  { label: "APIs quebradas", icon: Link2, sev: "danger" },
  { label: "Firebase exposto", icon: KeyRound, sev: "warn" },
  { label: "HTTP inseguro", icon: ShieldAlert, sev: "danger" },
  { label: "Permissões perigosas", icon: Lock, sev: "warn" },
  { label: "Falhas de navegação", icon: Navigation, sev: "warn" },
  { label: "Problemas de checkout", icon: CreditCard, sev: "danger" },
  { label: "Vulnerabilidades Android", icon: ShieldAlert, sev: "danger" },
  { label: "Links inválidos", icon: Link2, sev: "warn" },
  { label: "Erros de manifest", icon: ScanLine, sev: "warn" },
  { label: "Cleartext traffic", icon: Radar, sev: "danger" },
  { label: "Assinatura digital", icon: Fingerprint, sev: "warn" },
] as const;

export function AutoDetectionsGrid() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5 md:p-6"
    >
      <header className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">Detecção automática</p>
          <h3 className="font-display text-xl md:text-2xl font-bold text-gradient-cyan">O que o Aurora AI detectou</h3>
        </div>
        <span className="text-xs font-bold text-muted-foreground">{DETECTIONS.length} áreas escaneadas</span>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {DETECTIONS.map((d, i) => {
          const Icon = d.icon;
          const isDanger = d.sev === "danger";
          return (
            <motion.div
              key={d.label}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -2 }}
              className={`group rounded-xl border p-3 flex items-start gap-3 transition-all cursor-default ${
                isDanger ? "border-destructive/30 bg-destructive/5 hover:border-destructive/60 hover:shadow-[0_0_20px_hsl(var(--destructive)/0.25)]" : "border-primary/30 bg-primary/5 hover:border-primary/60 hover:shadow-[0_0_20px_hsl(var(--primary)/0.25)]"
              }`}
            >
              <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${isDanger ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                <Icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground leading-tight">{d.label}</p>
                <span className={`mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isDanger ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                  {isDanger ? <XCircle className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                  {isDanger ? "crítico" : "atenção"}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
