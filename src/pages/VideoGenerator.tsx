import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Video, Sparkles, Clock, Palette, Loader2, Zap, AlertTriangle, RefreshCw, Music } from "lucide-react";
import UpsellPrompt from "@/components/UpsellPrompt";
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

const DURATIONS = [5, 10, 15, 30] as const;
type Duration = typeof DURATIONS[number];

const DURATION_ACTIONS: Record<Duration, string> = {
  5: "ai_video_5s",
  10: "ai_video_10s",
  15: "ai_video_15s",
  30: "ai_video_30s",
};

const VideoGenerator = () => {
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [duration, setDuration] = useState<Duration>(5);
  const [music, setMusic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ enhancedPrompt: string } | null>(null);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);

  const { balance, consumeCredits, getCost, isAdmin } = useCredits();
  const { isFree, checkAccess, paywallOpen, setPaywallOpen, paywallFeature } = usePaywall();

  const creditAction = DURATION_ACTIONS[duration];
  const creditCost = getCost(creditAction);
  const continueCost = getCost("ai_video_continue");

  const handleRequestGenerate = () => {
    if (!description.trim()) {
      setError("Descreva o vídeo que deseja criar.");
      return;
    }
    if (isFree) {
      checkAccess("advanced_ai");
      return;
    }
    setError("");
    setConfirmOpen(true);
  };

  const handleConfirmGenerate = async () => {
    setConfirmOpen(false);
    setLoading(true);
    setResult(null);

    const credited = await consumeCredits(creditAction);
    if (!credited) { setLoading(false); return; }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-video", {
        body: { description: description.trim(), style, duration, music: music.trim() || undefined },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setResult({ enhancedPrompt: data.enhancedPrompt });
      toast({ title: "Vídeo processado!", description: "O prompt otimizado foi gerado com sucesso." });
    } catch (err: any) {
      setError(err.message || "Erro ao gerar vídeo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!result?.enhancedPrompt) return;
    setContinueLoading(true);

    const credited = await consumeCredits("ai_video_continue");
    if (!credited) { setContinueLoading(false); return; }

    try {
      const continueDesc = `Continuação do vídeo anterior. Contexto: ${result.enhancedPrompt}. ${description}`;
      const { data, error: fnError } = await supabase.functions.invoke("generate-video", {
        body: { description: continueDesc, style, duration, music: music.trim() || undefined },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setResult({ enhancedPrompt: data.enhancedPrompt });
      toast({ title: "Continuação gerada!", description: "A continuação do vídeo foi processada." });
    } catch (err: any) {
      setError(err.message || "Erro ao continuar vídeo.");
    } finally {
      setContinueLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} feature={paywallFeature} />

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            onClick={() => setConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground">Confirmar geração</h3>
                <p className="text-muted-foreground text-sm">
                  Este vídeo de <strong>{duration}s</strong> irá consumir <strong className="text-primary">{creditCost} créditos</strong>.
                </p>
                <p className="text-xs text-muted-foreground">Saldo atual: {balance} créditos</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmOpen(false)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmGenerate}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold glow-gold hover:scale-[1.02] transition-all"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/tools" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold text-lg text-gradient-gold flex items-center gap-2">
            <Video className="w-5 h-5" /> Criar Vídeos com IA
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-aurora space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Crie qualquer tipo de vídeo com IA</h2>
            <p className="text-muted-foreground text-sm mt-1">Sem edição — apenas descreva o que você quer</p>
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
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map((d) => {
                const cost = getCost(DURATION_ACTIONS[d]);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`px-3 py-3 rounded-lg text-sm font-display font-bold transition-all ${
                      duration === d
                        ? "bg-primary text-primary-foreground glow-gold"
                        : "bg-muted text-foreground border border-border hover:border-secondary"
                    }`}
                  >
                    {d}s
                    <span className={`block text-xs font-normal mt-0.5 ${duration === d ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                      {cost} créd.
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Music */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
              <Music className="w-4 h-4" /> Música (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: música calma, lo-fi, épica..."
              value={music}
              onChange={(e) => setMusic(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition text-sm"
            />
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
            onClick={handleRequestGenerate}
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
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
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
                disabled={continueLoading}
                className="w-full py-3 bg-muted text-foreground border border-border font-display font-bold text-sm rounded-lg hover:border-secondary transition-all flex flex-col items-center justify-center gap-1"
              >
                <span className="flex items-center gap-2">
                  {continueLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Continuar vídeo (manter contexto)
                </span>
                <span className="text-xs text-muted-foreground">
                  {continueCost} créditos
                </span>
              </button>
            </motion.div>
          )}

          <UpsellPrompt balance={balance} type={balance === 0 ? "no-credits" : "post-generation"} />
        </motion.div>
      </div>
    </div>
  );
};

export default VideoGenerator;
