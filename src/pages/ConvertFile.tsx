import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, Upload, Zap, AlertTriangle, Info, Smartphone, Globe, Lightbulb, CheckCircle2 } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "@/hooks/use-toast";
import { useConversionJob } from "@/hooks/useConversionJob";

type ConversionType = null | "apk-to-aab" | "aab-to-apk" | "to-pwa";

const CONVERSIONS = [
  {
    id: "apk-to-aab" as const,
    label: "APK → AAB",
    desc: "Converter APK para o formato da Play Store",
    icon: Smartphone,
    tip: "Necessário para publicar na Google Play",
  },
  {
    id: "aab-to-apk" as const,
    label: "AAB → APK",
    desc: "Converter AAB para instalação direta",
    icon: Smartphone,
    tip: "Usado para testes em dispositivos",
  },
  {
    id: "to-pwa" as const,
    label: "Converter para PWA",
    desc: "Gerar versão web instalável do seu app",
    icon: Globe,
    tip: "Funciona em Android e iPhone",
  },
];

const fileToBase64 = (input: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
  reader.readAsDataURL(input);
});

const ConvertFile = () => {
  const [conversionType, setConversionType] = useState<ConversionType>(null);
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const { balance, consumeCredits, getCost } = useCredits();
  const job = useConversionJob();

  const handleConvert = async () => {
    if (!file || !conversionType) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Envie um AAB de até 20MB.", variant: "destructive" });
      return;
    }

    setConverting(true);
    try {
      const credited = await consumeCredits("generate_app");
      if (!credited) return;

      if (conversionType === "aab-to-apk") {
        const fileBase64 = await fileToBase64(file);
        const started = await job.submit("aab-upload", {
          functionName: "convert-aab-to-apk",
          body: { fileName: file.name, fileBase64 },
        });
        if (started) toast({ title: "Conversão iniciada", description: "Usando bundletool oficial do Google em modo universal." });
        return;
      }

      toast({
        title: "Conversão em processamento",
        description: "Seu arquivo está sendo convertido. Você receberá o resultado em breve.",
      });
    } catch (error) {
      toast({ title: "Erro na conversão", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    } finally {
      setConverting(false);
    }
  };

  const currentStep = conversionType === null ? 1 : !file ? 2 : 3;
  const selectedConversion = CONVERSIONS.find((c) => c.id === conversionType);
  const isAabToApkRunning = conversionType === "aab-to-apk" && (job.status === "processing" || job.status === "submitting" || job.status === "reconnecting");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/generator" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold text-lg text-gradient-gold">Converter Arquivo</h1>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-primary" /> {balance}
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-lg mx-auto px-4 pt-8">
        <div className="flex items-center gap-2 mb-8">
          {["Tipo de conversão", "Upload do arquivo", "Converter"].map((step, i) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                i + 1 <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i + 1 <= currentStep ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {step}
              </span>
              {i < 2 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-12 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-aurora space-y-6">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-accent-foreground mx-auto mb-2" />
            <h2 className="font-display text-xl font-bold text-foreground">Converter arquivos de aplicativo</h2>
            <p className="text-sm text-muted-foreground mt-1">Converta entre APK, AAB e PWA</p>
          </div>

          {/* Step 1: Conversion type */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
              O que você quer converter?
            </label>
            <div className="space-y-2">
              {CONVERSIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setConversionType(c.id); setFile(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                    conversionType === c.id
                      ? "bg-primary text-primary-foreground glow-gold"
                      : "bg-muted text-foreground border border-border hover:border-secondary"
                  }`}
                >
                  <c.icon className={`w-5 h-5 shrink-0 ${conversionType === c.id ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  <div className="text-left flex-1">
                    <p className="font-display font-bold">{c.label}</p>
                    <p className={`text-xs ${conversionType === c.id ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{c.desc}</p>
                  </div>
                  {conversionType === c.id && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>
            {selectedConversion && (
              <p className="text-xs text-primary flex items-center gap-1 mt-2">
                <Lightbulb className="w-3 h-3" /> {selectedConversion.tip}
              </p>
            )}
          </div>

          {/* Step 2: File upload */}
          {conversionType && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                Envie seu arquivo
              </label>
              <label className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-border bg-muted/30 hover:border-primary/40 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                {file ? (
                  <div className="text-center">
                    <p className="text-sm text-foreground font-semibold">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-foreground font-semibold">Clique para selecionar</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Arquivo {conversionType === "apk-to-aab" ? ".apk" : conversionType === "aab-to-apk" ? ".aab" : ".apk ou .aab"}
                    </p>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept={conversionType === "apk-to-aab" ? ".apk" : conversionType === "aab-to-apk" ? ".aab" : ".apk,.aab"}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </motion.div>
          )}

          {/* Step 3: Convert */}
          {conversionType && file && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3 text-primary" />
                  Essa ação consumirá <span className="font-bold text-foreground">{getCost("generate_app")} créditos</span>
                  <span className="text-border mx-1">·</span>
                  Saldo: <span className="font-bold text-primary">{balance}</span>
                </p>
              </div>

              {conversionType === "aab-to-apk" && (
                <div className="rounded-lg border border-secondary/25 bg-secondary/5 p-3 text-xs text-muted-foreground space-y-1.5">
                  <p className="font-bold text-foreground">Método oficial Google</p>
                  <p>Usa bundletool em modo universal para gerar APK de teste local, sem modificar manualmente a estrutura do AAB.</p>
                  <p className="font-semibold text-primary">Comando base: bundletool build-apks --mode=universal</p>
                </div>
              )}

              <button
                onClick={handleConvert}
                disabled={converting || isAabToApkRunning}
                className="w-full py-4 bg-primary text-primary-foreground font-display font-bold text-lg rounded-lg glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {converting || isAabToApkRunning ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" /> Convertendo...
                  </>
                ) : (
                  "Converter agora"
                )}
              </button>

              {conversionType === "aab-to-apk" && job.status !== "idle" && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{job.stepLabel || "Preparando bundletool..."}</span>
                    <span className="font-bold text-primary">{Math.round(job.progress)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div className="h-full bg-primary" animate={{ width: `${Math.min(job.progress, 100)}%` }} transition={{ duration: 0.35 }} />
                  </div>
                  {job.status === "success" && job.downloadUrl && (
                    <a href={job.downloadUrl} target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center rounded-lg bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground glow-cyan">
                      Baixar APK universal
                    </a>
                  )}
                  {(job.status === "error" || job.status === "timeout") && <p className="text-xs font-semibold text-destructive">{job.errorMessage || "Não foi possível concluir a conversão."}</p>}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Education block */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          {/* Warnings */}
          <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5">
            <h3 className="font-display font-bold text-xs text-foreground flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Atenção
            </h3>
            <ul className="space-y-1.5">
              <li className="text-xs text-foreground font-bold flex items-start gap-1.5">
                <span className="text-destructive shrink-0">⚠️</span> A Play Store NÃO aceita APK
              </li>
              <li className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-destructive shrink-0">⚠️</span> Se você tentar enviar APK, seu app será recusado
              </li>
              <li className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-destructive shrink-0">⚠️</span> Use a conversão APK → AAB antes de publicar
              </li>
            </ul>
          </div>

          {/* Tips */}
          <div className="p-4 rounded-xl border border-border bg-muted/20">
            <h3 className="font-display font-bold text-xs text-foreground flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-primary" /> Quando usar cada conversão
            </h3>
            <div className="space-y-2">
              {[
                { label: "APK → AAB", desc: "Quando você já tem um APK e quer publicar na Play Store" },
                { label: "AAB → APK", desc: "Quando você tem um AAB e quer testar no seu celular" },
                { label: "Para PWA", desc: "Quando você quer distribuir como app web sem precisar de loja" },
              ].map((t) => (
                <div key={t.label} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground"><strong className="text-foreground">{t.label}:</strong> {t.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced tip */}
          <div className="p-3 rounded-xl border border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">
              🔧 <strong>AAB → APK:</strong> a conversão usa bundletool oficial do Google com modo universal para facilitar testes locais. O AAB precisa estar assinado corretamente.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ConvertFile;
