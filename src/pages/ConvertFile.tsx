import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, Upload, Zap, AlertTriangle, Info, Smartphone, Globe, ArrowRight } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "@/hooks/use-toast";

type ConversionType = null | "apk-to-aab" | "aab-to-apk" | "to-pwa";

const CONVERSIONS = [
  { id: "apk-to-aab" as const, label: "APK → AAB", desc: "Converter APK para o formato da Play Store", icon: Smartphone },
  { id: "aab-to-apk" as const, label: "AAB → APK", desc: "Converter AAB para instalação direta", icon: Smartphone },
  { id: "to-pwa" as const, label: "Converter para PWA", desc: "Gerar versão web instalável do seu app", icon: Globe },
];

const ConvertFile = () => {
  const [conversionType, setConversionType] = useState<ConversionType>(null);
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const { balance, consumeCredits, getCost } = useCredits();

  const handleConvert = async () => {
    if (!file || !conversionType) return;

    const credited = await consumeCredits("generate_app");
    if (!credited) return;

    setConverting(true);

    // Simulate conversion (real implementation would use an edge function)
    setTimeout(() => {
      setConverting(false);
      toast({
        title: "Conversão em processamento",
        description: "Seu arquivo está sendo convertido. Você receberá o resultado em breve.",
      });
    }, 3000);
  };

  const currentStep = conversionType === null ? 1 : !file ? 2 : 3;

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

      <div className="max-w-lg mx-auto px-4 pb-12">
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
              Tipo de conversão
            </label>
            <div className="space-y-2">
              {CONVERSIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setConversionType(c.id)}
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
                  {conversionType === c.id && <ArrowRight className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>
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
                  <p className="text-sm text-foreground font-semibold">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-foreground font-semibold">Clique para selecionar</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {conversionType === "apk-to-aab" ? ".apk" : conversionType === "aab-to-apk" ? ".aab" : ".apk ou .aab"}
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

              <button
                onClick={handleConvert}
                disabled={converting}
                className="w-full py-4 bg-primary text-primary-foreground font-display font-bold text-lg rounded-lg glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {converting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" /> Convertendo...
                  </>
                ) : (
                  "Converter"
                )}
              </button>
            </motion.div>
          )}

          {/* Info */}
          <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-2">
            <p className="text-xs text-foreground font-semibold flex items-center gap-1.5">
              <Info className="w-3 h-3 text-primary" /> Dicas importantes
            </p>
            <ul className="space-y-1">
              {[
                "APK → AAB: Necessário para publicar na Google Play",
                "AAB → APK: Útil para testes em dispositivos",
                "A Play Store exige exclusivamente o formato AAB",
              ].map((t, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary shrink-0">•</span> {t}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ConvertFile;
