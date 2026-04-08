import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Video, Sparkles, Clock, Palette, Loader2, Zap, AlertTriangle, Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import { usePaywall } from "@/hooks/usePaywall";
import PaywallModal from "@/components/PaywallModal";
import { toast } from "@/hooks/use-toast";

const STYLES = [
  { value: "cinematic", label: "Cinemático" },
  { value: "cartoon", label: "Cartoon / Animação" },
  { value: "realistic", label: "Realista" },
  { value: "abstract", label: "Abstrato / Artístico" },
  { value: "minimalist", label: "Minimalista" },
  { value: "retro", label: "Retrô / Vintage" },
];

const VideoGenerator = () => {
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [duration, setDuration] = useState<5 | 10>(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ enhancedPrompt: string; videoUrl?: string } | null>(null);
  const [error, setError] = useState("");

  const { balance, consumeCredits, getCost, isAdmin } = useCredits();
  const { isFree, checkAccess, paywallOpen, setPaywallOpen, paywallFeature } = usePaywall();

  const creditAction = duration === 10 ? "ai_video_10s" : "ai_video_5s";
  const creditCost = getCost(creditAction);

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError("Descreva o vídeo que deseja criar.");
      return;
    }

    if (isFree) {
      checkAccess("advanced_ai");
      return;
    }

    setError("");
    setLoading(true);
    setResult(null);

    // Consume credits
    const credited = await consumeCredits(creditAction);
    if (!credited) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-video", {
        body: { description: description.trim(), style, duration },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setResult({
        enhancedPrompt: data.enhancedPrompt,
      });

      toast({ title: "Vídeo processado!", description: "O prompt otimizado foi gerado com sucesso." });
    } catch (err: any) {
      setError(err.message || "Erro ao gerar vídeo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (result?.enhancedPrompt) {
      setDescription((prev) => `${prev}. Continuar com: `);
      setResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} feature={paywallFeature} />

      <header className="border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/tools" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold text-lg text-gradient-gold flex items-center gap-2">
            <Video className="w-5 h-5" /> Gerador de Vídeos IA
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-aurora space-y-6"
        >
          {/* Header */}
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Crie qualquer tipo de vídeo com IA</h2>
            <p className="text-muted-foreground text-sm mt-1">Sem edição — descreva e a IA gera para você</p>
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
              Descreva seu vídeo
            </label>
            <textarea
              placeholder="Ex: Um pôr do sol na praia com ondas suaves e gaivotas voando..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition text-sm resize-none"
            />
          </div>

          {/* Style */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
              <Palette className="w-4 h-4" /> Estilo (opcional)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStyle(s.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    style === s.value
                      ? "bg-primary text-primary-foreground glow-gold"
                      : "bg-muted text-muted-foreground border border-border hover:border-secondary"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
              <Clock className="w-4 h-4" /> Duração
            </label>
            <div className="grid grid-cols-2 gap-3">
              {([5, 10] as const).map((d) => {
                const cost = getCost(d === 10 ? "ai_video_10s" : "ai_video_5s");
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`px-4 py-3 rounded-lg text-sm font-display font-bold transition-all ${
                      duration === d
                        ? "bg-primary text-primary-foreground glow-gold"
                        : "bg-muted text-foreground border border-border hover:border-secondary"
                    }`}
                  >
                    {d} segundos
                    <span className={`block text-xs font-normal mt-0.5 ${duration === d ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                      {cost} créditos
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-4 bg-primary text-primary-foreground font-display font-bold text-lg rounded-lg glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 flex flex-col items-center justify-center gap-1"
          >
            <span className="flex items-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {loading ? "Gerando vídeo..." : "Gerar Vídeo com IA"}
            </span>
            <span className="text-xs opacity-75 flex items-center gap-1">
              <Zap className="w-3 h-3" /> {creditCost} créditos · Saldo: {balance}
            </span>
          </button>

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
                <p className="text-sm font-semibold text-secondary mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Prompt otimizado pela IA
                </p>
                <p className="text-foreground text-sm whitespace-pre-wrap">{result.enhancedPrompt}</p>
              </div>

              <div className="p-4 rounded-lg bg-muted border border-border text-center">
                <Video className="w-10 h-10 text-primary mx-auto mb-2" />
                <p className="text-foreground font-display font-bold text-sm">Vídeo em processamento</p>
                <p className="text-muted-foreground text-xs mt-1">
                  O vídeo está sendo gerado com IA. Você será notificado quando estiver pronto.
                </p>
              </div>

              {/* Continue Button */}
              <button
                onClick={handleContinue}
                className="w-full py-3 bg-muted text-foreground border border-border font-display font-bold text-sm rounded-lg hover:border-secondary transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Continuar vídeo (manter contexto)
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VideoGenerator;
