import { useCallback, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, UploadCloud, FileArchive, ShieldCheck, Lock, FileSearch,
  FileCheck2, Sparkles, Zap, Loader2, X, CheckCircle2, AlertTriangle,
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

export default function ValidatorUpload() {
  const navigate = useNavigate();
  const { balance, consumeCredits } = useCredits();
  const inputRef = useRef<HTMLInputElement>(null);
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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

        {/* Title */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-secondary/40 bg-secondary/10 text-[10px] font-bold uppercase tracking-wider text-secondary mb-3">
            <ShieldCheck className="w-3 h-3" /> Aurora Validator
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight">
            <span className="text-gradient-cyan">Envie seu APK ou AAB</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Análise técnica completa: manifest, permissões Android e conformidade com as políticas da Google Play Store.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          {/* Upload card */}
          <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 md:p-8">
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
                        {sizeMb} MB · Formato detectado: <span className="font-bold text-secondary">{format?.toUpperCase()}</span>
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
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-secondary to-primary text-background px-5 py-4 font-display font-bold glow-cyan hover:scale-[1.02] transition-all"
                    >
                      <Sparkles className="w-4 h-4" /> Iniciar Validação (1 crédito)
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
            <h2 className="font-display text-xl font-bold text-foreground mb-5">Análise técnica completa</h2>

            <div className="space-y-3">
              {[
                { icon: FileSearch, title: "Inspeção do AndroidManifest.xml", desc: "Permissões declaradas, intents e configuração mínima." },
                { icon: Lock, title: "Permissões Android", desc: "Detecta permissões perigosas e sensíveis para revisão." },
                { icon: FileArchive, title: "Estrutura APK/AAB", desc: "Validação de assinatura, integridade e formato." },
                { icon: FileCheck2, title: "Políticas Google Play", desc: "Conformidade com diretrizes atuais da Play Store." },
                { icon: ShieldCheck, title: "Segurança básica", desc: "Pontos críticos antes de publicar oficialmente." },
              ].map((it, i) => {
                const isPrimary = i % 2 === 0;
                return (
                  <div key={it.title} className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/40 p-3">
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
              🔒 Seu arquivo é processado localmente e usado apenas para gerar o diagnóstico. O Aurora Validator nunca modifica seu app.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
