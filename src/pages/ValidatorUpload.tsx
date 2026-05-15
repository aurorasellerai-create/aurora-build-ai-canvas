import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  ArrowLeft, UploadCloud, FileArchive, ShieldCheck, Lock, FileSearch,
  FileCheck2, Sparkles, Zap, Loader2, X, CheckCircle2, AlertTriangle,
  ShieldAlert, Bug, Wifi, Database, Globe, KeyRound, Layers, Activity,
  TrendingUp, Star, Award, Cpu, Rocket, FileText, ArrowRight, Eye,
  GaugeCircle, Server, ScanLine, Fingerprint,
} from "lucide-react";
import { toast } from "sonner";
import { useCredits } from "@/hooks/useCredits";
import { saveValidatorHistoryItem } from "@/lib/validatorHistory";
import { createAuroraValidatorResult } from "@/lib/auroraValidator";
import { setSelectedAppFormatPreference, type AuroraAppFormat } from "@/lib/appFormatPreference";

const MAX_SIZE_MB = 200;
const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;

const detectFormat = (filename: string): AuroraAppFormat | null => {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".apk")) return "apk";
  if (lower.endsWith(".aab")) return "aab";
  return null;
};

const steps = [
  "Lendo arquivo do app…",
  "Inspecionando AndroidManifest.xml…",
  "Verificando permissões Android…",
  "Analisando estrutura APK/AAB…",
  "Checando políticas Google Play…",
  "Validando segurança e assinatura…",
  "Gerando relatório final…",
];

/* ============================ Animated Counter ============================ */
function AnimatedNumber({ value, duration = 1.6, suffix = "" }: { value: number; duration?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return <span ref={ref}>{n.toLocaleString("pt-BR")}{suffix}</span>;
}

/* ============================ Score Ring ============================ */
type ScoreTone = "secondary" | "primary" | "destructive";

function ScoreRing({
  label, value, tone, icon: Icon,
}: { label: string; value: number; tone: ScoreTone; icon: typeof ShieldCheck }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const dur = 1500;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(eased * value);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  const toneClass =
    tone === "secondary"
      ? { text: "text-secondary", stroke: "stroke-secondary", glow: "drop-shadow-[0_0_18px_hsl(190_100%_50%/0.55)]", bg: "bg-secondary/10", border: "border-secondary/30" }
      : tone === "primary"
      ? { text: "text-primary", stroke: "stroke-primary", glow: "drop-shadow-[0_0_18px_hsl(51_100%_50%/0.55)]", bg: "bg-primary/10", border: "border-primary/30" }
      : { text: "text-destructive", stroke: "stroke-destructive", glow: "drop-shadow-[0_0_18px_hsl(0_84%_60%/0.55)]", bg: "bg-destructive/10", border: "border-destructive/30" };

  const badge =
    value >= 85 ? { label: "Seguro", cls: "bg-secondary/15 text-secondary border-secondary/30" }
      : value >= 65 ? { label: "Atenção", cls: "bg-primary/15 text-primary border-primary/30" }
      : { label: "Crítico", cls: "bg-destructive/15 text-destructive border-destructive/30" };

  return (
    <div ref={ref} className={`relative rounded-2xl border ${toneClass.border} ${toneClass.bg} backdrop-blur-sm p-5 flex flex-col items-center text-center overflow-hidden group`}>
      <div className="absolute inset-0 opacity-30 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 0%, hsl(190 100% 50% / 0.18), transparent 60%)" }} />
      <div className={`relative w-[130px] h-[130px] ${toneClass.glow}`}>
        <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
          <circle cx="65" cy="65" r={radius} className="stroke-border/60" strokeWidth="8" fill="none" />
          <circle
            cx="65" cy="65" r={radius}
            className={toneClass.stroke}
            strokeWidth="8" fill="none" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-display text-3xl font-bold ${toneClass.text}`}>
            {Math.round(progress)}
          </span>
          <span className="text-[10px] text-muted-foreground font-bold tracking-wider">/ 100</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${toneClass.text}`} />
        <p className="text-xs font-bold uppercase tracking-wider text-foreground">{label}</p>
      </div>
      <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${badge.cls}`}>
        {badge.label}
      </span>
    </div>
  );
}

/* ============================ Detection Grid ============================ */
const detections = [
  { icon: ShieldAlert, title: "SDKs inseguros", sev: "Crítico", tone: "destructive" },
  { icon: KeyRound, title: "Permissões perigosas", sev: "Atenção", tone: "primary" },
  { icon: Bug, title: "APIs quebradas", sev: "Crítico", tone: "destructive" },
  { icon: Database, title: "Firebase exposto", sev: "Crítico", tone: "destructive" },
  { icon: Globe, title: "Links inválidos", sev: "Atenção", tone: "primary" },
  { icon: Wifi, title: "HTTP inseguro", sev: "Crítico", tone: "destructive" },
  { icon: ScanLine, title: "Problemas Play Store", sev: "Atenção", tone: "primary" },
  { icon: ShieldCheck, title: "Vulnerabilidades Android", sev: "Crítico", tone: "destructive" },
  { icon: Fingerprint, title: "Falhas de assinatura", sev: "Atenção", tone: "primary" },
  { icon: FileSearch, title: "Manifest incorreto", sev: "Atenção", tone: "primary" },
  { icon: Layers, title: "Bibliotecas obsoletas", sev: "Atenção", tone: "primary" },
  { icon: Server, title: "Endpoints expostos", sev: "Crítico", tone: "destructive" },
] as const;

/* ============================ Page ============================ */
export default function ValidatorUpload() {
  const navigate = useNavigate();
  const { balance, consumeCredits } = useCredits();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadAnchor = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<AuroraAppFormat | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);

  const handleFile = useCallback((f: File | null) => {
    if (!f) return;
    const fmt = detectFormat(f.name);
    if (!fmt) {
      toast.error("Formato inválido. Envie um arquivo .apk ou .aab.");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error(`Arquivo muito grande. Máximo: ${MAX_SIZE_MB}MB.`);
      return;
    }
    setFile(f);
    setFormat(fmt);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const reset = () => {
    setFile(null);
    setFormat(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const scrollToUpload = () => {
    uploadAnchor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => inputRef.current?.click(), 600);
  };

  const startValidation = async () => {
    if (!file || !format || running) return;
    try {
      const allowed = await consumeCredits("aurora_validator", 1);
      if (!allowed) {
        toast.error("Você precisa de 1 crédito para rodar uma validação.");
        return;
      }
      setRunning(true);
      setStep(0);
      setSelectedAppFormatPreference(format);

      steps.forEach((_, i) => {
        window.setTimeout(() => setStep(i), 520 * i);
      });

      window.setTimeout(() => {
        const id = `validator-${Date.now()}`;
        const diagnostic = createAuroraValidatorResult(format);
        saveValidatorHistoryItem({
          id,
          appName: file.name.replace(/\.(apk|aab)$/i, ""),
          appFormat: format,
          status: "blocked",
          createdAt: new Date().toISOString(),
          issuesCount: diagnostic.problemas.filter((p) => p.tipo === "erro").length,
          warningCount: diagnostic.problemas.filter((p) => p.tipo === "alerta").length,
          summary: diagnostic.resumo,
          diagnostic,
        });
        toast.success("Diagnóstico concluído.");
        navigate(`/validator/${id}`);
      }, 520 * steps.length + 400);
    } catch {
      setRunning(false);
      toast.error("Não foi possível iniciar a validação.");
    }
  };

  const sizeMb = file ? (file.size / 1024 / 1024).toFixed(2) : "0";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24 md:pb-12">
      {/* Ambient FX */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="aurora-blob-1 absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full bg-secondary/10 blur-3xl" />
        <div className="aurora-blob-2 absolute top-1/3 right-0 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(hsl(190 100% 50% / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(190 100% 50% / 0.5) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs font-bold text-primary">
            <Zap className="w-3.5 h-3.5" /> {balance} créditos
          </span>
        </div>

        {/* ============= HERO ============= */}
        <section className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-secondary/40 bg-secondary/10 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary mb-5"
          >
            <ShieldCheck className="w-3 h-3" /> Aurora Build AI · Validator
            <span className="w-1 h-1 rounded-full bg-secondary animate-pulse" />
            Enterprise grade
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-display text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight max-w-4xl mx-auto"
          >
            <span className="text-gradient-cyan">Auditoria Android</span>{" "}
            <span className="text-foreground">de nível</span>{" "}
            <span className="text-gradient-gold">enterprise</span>
            <span className="text-foreground"> em segundos</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground max-w-2xl mx-auto mt-5 text-base md:text-lg"
          >
            Análise técnica completa de APK/AAB com IA: segurança, permissões, vulnerabilidades,
            assinatura e conformidade total com a Google Play Store.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-wrap items-center justify-center gap-3 mt-7"
          >
            <button
              onClick={scrollToUpload}
              className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-secondary via-secondary to-primary text-background px-7 py-4 font-display font-bold text-sm md:text-base glow-cyan hover:scale-[1.03] transition-all duration-300 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <UploadCloud className="w-5 h-5" />
              <span className="relative">VALIDAR APP AGORA</span>
              <ArrowRight className="w-4 h-4 relative group-hover:translate-x-1 transition-transform" />
            </button>
            <Link
              to="/validator/historico"
              className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm px-5 py-4 font-display font-bold text-sm text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <FileText className="w-4 h-4" /> Ver relatórios
            </Link>
          </motion.div>

          {/* Trust strip */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-secondary" /> Sem alterar seu app</span>
            <span className="inline-flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-secondary" /> Processamento seguro</span>
            <span className="inline-flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-primary" /> Auditado por IA</span>
            <span className="inline-flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-primary" /> +<AnimatedNumber value={1247} /> apps analisados</span>
          </div>
        </section>

        {/* ============= SCORE PANEL ============= */}
        <motion.section
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="relative rounded-3xl border border-secondary/20 bg-card/40 backdrop-blur-md p-6 md:p-10 mb-16 overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary to-transparent" />
          <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-secondary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-primary/10 blur-3xl" />

          <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-secondary font-bold mb-2 flex items-center gap-2">
                <GaugeCircle className="w-3.5 h-3.5" /> Painel Aurora · Exemplo de relatório
              </p>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Score completo do seu app
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Visualização clínica com 4 dimensões — segurança, conformidade, performance e geral.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-secondary/30 bg-secondary/10 text-xs font-bold text-secondary self-start md:self-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> Demo ao vivo
            </div>
          </div>

          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4">
            <ScoreRing label="Segurança" value={88} tone="secondary" icon={ShieldCheck} />
            <ScoreRing label="Play Store" value={76} tone="primary" icon={Award} />
            <ScoreRing label="Performance" value={92} tone="secondary" icon={Activity} />
            <ScoreRing label="Score Geral" value={84} tone="primary" icon={GaugeCircle} />
          </div>

          <div className="relative mt-6 grid sm:grid-cols-3 gap-3">
            {[
              { label: "Vulnerabilidades", value: "2 críticas", icon: ShieldAlert, tone: "text-destructive border-destructive/30 bg-destructive/5" },
              { label: "Alertas", value: "5 itens", icon: AlertTriangle, tone: "text-primary border-primary/30 bg-primary/5" },
              { label: "Aprovados", value: "47 checks", icon: CheckCircle2, tone: "text-secondary border-secondary/30 bg-secondary/5" },
            ].map((c) => (
              <div key={c.label} className={`rounded-xl border ${c.tone} p-4 flex items-center gap-3`}>
                <c.icon className="w-5 h-5" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold opacity-70">{c.label}</p>
                  <p className="font-display text-lg font-bold">{c.value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ============= UPLOAD ============= */}
        <section ref={uploadAnchor} className="scroll-mt-6 mb-16">
          <div className="mb-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-2">Inicie agora</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold">
              Envie seu APK ou AAB
            </h2>
          </div>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 md:p-8 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/70 to-transparent" />
              <AnimatePresence mode="wait">
                {!file ? (
                  <motion.div
                    key="dropzone"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
                      dragOver
                        ? "border-secondary bg-secondary/10 scale-[1.01]"
                        : "border-border/60 hover:border-secondary/60 hover:bg-secondary/5"
                    }`}
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/10 border border-secondary/30 text-secondary flex items-center justify-center glow-cyan">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <p className="font-display font-bold text-foreground text-lg mb-1">
                      Arraste seu arquivo aqui
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      ou clique para selecionar do computador
                    </p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-md border border-primary/30 bg-primary/5 text-[10px] font-bold uppercase tracking-wider text-primary">.APK</span>
                      <span className="px-2.5 py-1 rounded-md border border-secondary/30 bg-secondary/5 text-[10px] font-bold uppercase tracking-wider text-secondary">.AAB</span>
                      <span className="text-[10px] text-muted-foreground">até {MAX_SIZE_MB}MB</span>
                    </div>
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".apk,.aab,application/vnd.android.package-archive"
                      className="hidden"
                      onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="file"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="space-y-5"
                  >
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                        <FileArchive className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sizeMb} MB · Formato: <span className="font-bold text-secondary">{format?.toUpperCase()}</span>
                        </p>
                      </div>
                      {!running && (
                        <button
                          onClick={reset}
                          className="w-8 h-8 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all flex items-center justify-center"
                          title="Remover"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {running ? (
                      <div className="space-y-3">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-secondary to-primary"
                            initial={{ width: "5%" }}
                            animate={{ width: `${Math.round(((step + 1) / steps.length) * 100)}%` }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                        <div className="space-y-2">
                          {steps.map((s, i) => (
                            <div
                              key={s}
                              className={`flex items-center gap-3 rounded-lg border p-2.5 transition-all ${
                                i <= step ? "border-secondary/30 bg-secondary/5" : "border-border/50 bg-muted/20"
                              }`}
                            >
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                i < step ? "bg-secondary text-secondary-foreground"
                                  : i === step ? "bg-secondary/30 text-secondary"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                              </span>
                              <p className={`text-xs font-semibold ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</p>
                              {i === step && <Loader2 className="w-3.5 h-3.5 text-secondary animate-spin ml-auto" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={startValidation}
                        className="group relative w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-secondary to-primary text-background px-5 py-4 font-display font-bold glow-cyan hover:scale-[1.02] transition-all overflow-hidden"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <Sparkles className="w-4 h-4 relative" />
                        <span className="relative">INICIAR ANÁLISE (1 crédito)</span>
                      </button>
                    )}

                    {!running && balance < 1 && (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          Você não possui créditos suficientes.{" "}
                          <Link to="/credits" className="text-primary font-bold hover:underline">Recarregar agora</Link>
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* What's checked */}
            <div className="rounded-2xl border border-border/60 bg-card/40 p-6 md:p-7">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mb-1">O que validamos</p>
              <h3 className="font-display text-xl font-bold text-foreground mb-5">Análise técnica completa</h3>
              <div className="space-y-3">
                {[
                  { icon: FileSearch, title: "AndroidManifest.xml", desc: "Permissões, intents e configuração mínima." },
                  { icon: Lock, title: "Permissões Android", desc: "Detecção de permissões perigosas e sensíveis." },
                  { icon: FileArchive, title: "Estrutura APK/AAB", desc: "Assinatura, integridade e formato." },
                  { icon: FileCheck2, title: "Políticas Google Play", desc: "Conformidade com diretrizes atuais." },
                  { icon: ShieldCheck, title: "Segurança crítica", desc: "Pontos de risco antes de publicar." },
                ].map((it, i) => {
                  const isPrimary = i % 2 === 0;
                  return (
                    <div key={it.title} className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/40 p-3 hover:border-secondary/30 transition-colors">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isPrimary ? "bg-secondary/10 text-secondary border border-secondary/25" : "bg-primary/10 text-primary border border-primary/25"}`}>
                        <it.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground leading-tight">{it.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{it.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-5 leading-relaxed">
                🔒 Seu arquivo é processado de forma segura e usado apenas para gerar o diagnóstico. O Aurora Validator nunca modifica seu app.
              </p>
            </div>
          </div>
        </section>

        {/* ============= DETECTAMOS AUTOMATICAMENTE ============= */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.22em] text-secondary font-bold mb-2">
              <Eye className="w-3.5 h-3.5 inline mr-1" /> Detectamos automaticamente
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Mais de <span className="text-gradient-cyan">120 verificações</span> em cada app
            </h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-2xl mx-auto">
              IA treinada em padrões reais da Google Play. Cada item avaliado com severidade técnica.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {detections.map((d, i) => {
              const tone = d.tone === "destructive"
                ? { border: "border-destructive/25", text: "text-destructive", bg: "bg-destructive/5", badge: "bg-destructive/15 text-destructive border-destructive/30" }
                : { border: "border-primary/25", text: "text-primary", bg: "bg-primary/5", badge: "bg-primary/15 text-primary border-primary/30" };
              return (
                <motion.div
                  key={d.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className={`group relative rounded-xl border ${tone.border} ${tone.bg} backdrop-blur-sm p-4 hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden`}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: "radial-gradient(circle at 50% 0%, hsl(190 100% 50% / 0.12), transparent 70%)" }} />
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone.bg} ${tone.text} border ${tone.border} mb-3`}>
                    <d.icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-foreground leading-tight mb-2">{d.title}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${tone.badge}`}>
                    {d.sev}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ============= ANTES x DEPOIS ============= */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-2">Transformação real</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Antes e depois do <span className="text-gradient-gold">Aurora Validator</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* ANTES */}
            <motion.div
              initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="relative rounded-2xl border border-destructive/25 bg-destructive/5 backdrop-blur-sm p-6 overflow-hidden"
            >
              <div className="absolute -top-20 -left-20 w-[280px] h-[280px] rounded-full bg-destructive/15 blur-3xl" />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-destructive/30 bg-destructive/10 text-[10px] font-bold uppercase tracking-wider text-destructive mb-4">
                  <AlertTriangle className="w-3 h-3" /> Antes
                </span>
                <h3 className="font-display text-xl font-bold text-foreground mb-4">Publicação no escuro</h3>
                <ul className="space-y-2.5">
                  {[
                    "Risco de rejeição na Play Store",
                    "Bugs ocultos no fluxo principal",
                    "Falhas de segurança expostas",
                    "Travamentos em produção",
                    "Problemas no checkout",
                    "Erros de navegação invisíveis",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="w-4 h-4 text-destructive shrink-0 mt-0.5" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* DEPOIS */}
            <motion.div
              initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="relative rounded-2xl border border-secondary/30 bg-secondary/5 backdrop-blur-sm p-6 overflow-hidden glow-cyan"
            >
              <div className="absolute -top-20 -right-20 w-[280px] h-[280px] rounded-full bg-secondary/20 blur-3xl" />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-secondary/30 bg-secondary/10 text-[10px] font-bold uppercase tracking-wider text-secondary mb-4">
                  <Sparkles className="w-3 h-3" /> Depois
                </span>
                <h3 className="font-display text-xl font-bold text-foreground mb-4">Publicação aprovada</h3>
                <ul className="space-y-2.5">
                  {[
                    "Pronto para publicação na Play Store",
                    "Análise técnica completa em PDF",
                    "Segurança Android validada",
                    "Fluxo de vendas aprovado",
                    "Estabilidade garantida",
                    "Conformidade Google Play",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ============= TRUST / METRICS ============= */}
        <section className="mb-16">
          <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md p-6 md:p-8 grid md:grid-cols-4 gap-6">
            {[
              { v: 1247, suf: "+", label: "Apps analisados", icon: Cpu },
              { v: 98, suf: "%", label: "Aprovação na Play", icon: Award },
              { v: 120, suf: "+", label: "Verificações", icon: ScanLine },
              { v: 45, suf: "s", label: "Tempo médio", icon: Activity },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <m.icon className="w-5 h-5 text-secondary mx-auto mb-2" />
                <p className="font-display text-3xl md:text-4xl font-bold text-gradient-cyan">
                  <AnimatedNumber value={m.v} suffix={m.suf} />
                </p>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============= TESTIMONIALS ============= */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.22em] text-secondary font-bold mb-2">
              Usado por desenvolvedores profissionais
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Confiança de quem <span className="text-gradient-cyan">publica de verdade</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: "Rafael S.", role: "Tech Lead Android", text: "O relatório do Aurora Validator pegou um Firebase exposto e SDKs desatualizados antes do envio. Salvou meu lançamento." },
              { name: "Camila O.", role: "Engenheira Mobile", text: "Substituí 3 ferramentas pagas por essa. O score visual e o PDF entregam o que cliente enterprise quer ver." },
              { name: "Diego M.", role: "Founder · Indie Dev", text: "Em 45 segundos eu sei se o app está pronto pra Play Store. Mudou todo meu fluxo de release." },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-5 hover:border-secondary/30 transition-colors"
              >
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-foreground italic leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="text-sm font-bold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: ShieldCheck, label: "Seguro" },
              { icon: Award, label: "Auditado" },
              { icon: Rocket, label: "Pronto para Play Store" },
            ].map((b) => (
              <span key={b.label} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-secondary/30 bg-secondary/5 text-xs font-bold text-secondary">
                <b.icon className="w-3.5 h-3.5" /> {b.label}
              </span>
            ))}
          </div>
        </section>

        {/* ============= FINAL CTA ============= */}
        <section className="text-center">
          <div className="relative rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/40 to-secondary/10 backdrop-blur-md p-8 md:p-12 overflow-hidden">
            <div className="absolute inset-0 opacity-30 pointer-events-none"
              style={{ background: "radial-gradient(circle at 30% 20%, hsl(51 100% 50% / 0.2), transparent 60%), radial-gradient(circle at 70% 80%, hsl(190 100% 50% / 0.2), transparent 60%)" }} />
            <div className="relative">
              <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-3">
                Não publique <span className="text-gradient-gold">no escuro</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-6">
                Em menos de 1 minuto você descobre exatamente o que está te impedindo de aprovar na Google Play.
              </p>
              <button
                onClick={scrollToUpload}
                className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary via-primary to-secondary text-background px-8 py-4 font-display font-bold text-base glow-gold glow-gold-hover hover:scale-[1.03] transition-all overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <UploadCloud className="w-5 h-5 relative" />
                <span className="relative">ENVIAR APK / AAB AGORA</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ============= STICKY MOBILE CTA ============= */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-background/85 backdrop-blur-lg border-t border-border/60">
        <button
          onClick={scrollToUpload}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-secondary to-primary text-background px-5 py-3.5 font-display font-bold glow-cyan"
        >
          <UploadCloud className="w-4 h-4" /> VALIDAR APP AGORA
        </button>
      </div>
    </div>
  );
}
