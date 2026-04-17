import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Video, Sparkles, Clock, Palette, Loader2, Zap, AlertTriangle, Music, Mic, Languages, Wand2 } from "lucide-react";
import UpsellPrompt from "@/components/UpsellPrompt";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import { usePaywall } from "@/hooks/usePaywall";
import PaywallModal from "@/components/PaywallModal";
import MediaUpload, { MediaItem } from "@/components/video/MediaUpload";
import ProcessingStages from "@/components/video/ProcessingStages";
import VideoResultPlayer from "@/components/video/VideoResultPlayer";
import { toast } from "@/hooks/use-toast";

const STYLES = [
  { value: "cinematic", label: "Cinemático" },
  { value: "realistic", label: "Realista" },
  { value: "cartoon", label: "Cartoon" },
  { value: "abstract", label: "Abstrato" },
  { value: "minimalist", label: "Minimalista" },
  { value: "retro", label: "Retrô" },
];

const DURATIONS = [5, 10, 15, 30] as const;
type Duration = typeof DURATIONS[number];

const DURATION_ACTIONS: Record<Duration, string> = {
  5: "ai_video_5s",
  10: "ai_video_10s",
  15: "ai_video_15s",
  30: "ai_video_30s",
};

const VOICE_TONES = [
  { value: "none", label: "Sem voz" },
  { value: "soft", label: "Suave" },
  { value: "professional", label: "Profissional" },
  { value: "emotional", label: "Emocional" },
];

const VideoGenerator = () => {
  const [description, setDescription] = useState("");
  const [continuePrompt, setContinuePrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [duration, setDuration] = useState<Duration>(5);
  const [music, setMusic] = useState("");
  const [autoMusic, setAutoMusic] = useState(false);
  const [voice, setVoice] = useState("none");
  const [language, setLanguage] = useState<"pt" | "en">("pt");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ enhancedPrompt: string } | null>(null);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);
  const [variationLoading, setVariationLoading] = useState(false);

  const { balance, consumeCredits, getCost } = useCredits();
  const { isFree, checkAccess, paywallOpen, setPaywallOpen, paywallFeature } = usePaywall();

  const creditAction = DURATION_ACTIONS[duration];
  const creditCost = getCost(creditAction);

  const handleRequestGenerate = () => {
    if (!description.trim()) {
      setError("Descreva o vídeo que deseja criar.");
      return;
    }
    if (isFree) { checkAccess("advanced_ai"); return; }
    setError("");
    setConfirmOpen(true);
  };

  const callGenerate = async (descOverride?: string) => {
    const finalDesc = descOverride ?? description.trim();
    const { data, error: fnError } = await supabase.functions.invoke("generate-video", {
      body: {
        description: finalDesc,
        style,
        duration,
        music: autoMusic ? "auto" : music.trim() || undefined,
        language,
        voice: voice === "none" ? undefined : voice,
        mediaCount: media.length,
      },
    });
    if (fnError) throw fnError;
    if (data?.error) throw new Error(data.error);
    return data.enhancedPrompt as string;
  };

  const handleConfirmGenerate = async () => {
    setConfirmOpen(false);
    setLoading(true);
    setResult(null);
    setError("");

    const credited = await consumeCredits(creditAction);
    if (!credited) { setLoading(false); return; }

    try {
      const enhancedPrompt = await callGenerate();
      setResult({ enhancedPrompt });
      toast({ title: "Vídeo processado!", description: "Roteiro otimizado gerado com sucesso." });
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
      const desc = `Continuação. Contexto anterior: ${result.enhancedPrompt}. Próximo passo: ${continuePrompt || description}`;
      const enhancedPrompt = await callGenerate(desc);
      setResult({ enhancedPrompt });
      toast({ title: "Continuação gerada!" });
    } catch (err: any) {
      setError(err.message || "Erro ao continuar.");
    } finally {
      setContinueLoading(false);
    }
  };

  const handleVariation = async () => {
    if (!result?.enhancedPrompt) return;
    setVariationLoading(true);
    const credited = await consumeCredits("ai_video_continue");
    if (!credited) { setVariationLoading(false); return; }
    try {
      const desc = `Variação alternativa do mesmo conceito (mesmo tema, abordagem diferente): ${description}`;
      const enhancedPrompt = await callGenerate(desc);
      setResult({ enhancedPrompt });
      toast({ title: "Variação gerada!" });
    } catch (err: any) {
      setError(err.message || "Erro ao gerar variação.");
    } finally {
      setVariationLoading(false);
    }
  };

  const handleEditAndRegenerate = () => {
    setResult(null);
    document.querySelector<HTMLTextAreaElement>("#video-prompt")?.focus();
  };

  return (
    <div className="min-h-screen bg-background">
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} feature={paywallFeature} />

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
                  Vídeo de <strong>{duration}s</strong> consumirá <strong className="text-primary">{creditCost} créditos</strong>.
                </p>
                <p className="text-xs text-muted-foreground">Saldo atual: {balance} créditos</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmOpen(false)} className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition">Cancelar</button>
                  <button onClick={handleConfirmGenerate} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold glow-gold hover:scale-[1.02] transition-all">Confirmar</button>
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
            <Video className="w-5 h-5" /> Gerador de Vídeo com IA
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-aurora space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Sem edição, tudo automático</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Crie vídeos completos com IA — roteiro, voz, cenas e música — sem editar nada.
            </p>
          </div>

          {/* Language */}
          <div className="flex items-center gap-2 justify-center">
            <Languages className="w-4 h-4 text-muted-foreground" />
            <div className="inline-flex rounded-lg border border-border bg-muted p-1">
              <button
                onClick={() => setLanguage("pt")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${language === "pt" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >🇧🇷 Português</button>
              <button
                onClick={() => setLanguage("en")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${language === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >🇺🇸 English</button>
            </div>
          </div>

          {/* Step 1: Upload */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
              Mídia (opcional)
            </label>
            <MediaUpload items={media} onChange={setMedia} />
          </div>

          {/* Step 2: Prompt */}
          <div>
            <label htmlFor="video-prompt" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
              Descreva seu vídeo
            </label>
            <textarea
              id="video-prompt"
              placeholder="Ex: Crie um vídeo promocional com uma mulher apresentando um app de IA..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition text-sm resize-none"
            />
            <input
              type="text"
              placeholder="Continuar ou expandir vídeo existente (opcional)"
              value={continuePrompt}
              onChange={(e) => setContinuePrompt(e.target.value)}
              className="w-full mt-2 px-4 py-2.5 rounded-lg bg-muted/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition text-sm"
            />
          </div>

          {/* Step 3: Style */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
              <Palette className="w-4 h-4" /> Estilo
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
                >{s.label}</button>
              ))}
            </div>
          </div>

          {/* Step 4: Duration */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
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

          {/* Step 5: Voice */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</span>
              <Mic className="w-4 h-4" /> Voz / Narração
            </label>
            <div className="grid grid-cols-4 gap-2">
              {VOICE_TONES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setVoice(v.value)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                    voice === v.value
                      ? "bg-primary text-primary-foreground glow-gold"
                      : "bg-muted text-muted-foreground border border-border hover:border-secondary"
                  }`}
                >{v.label}</button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">🎙️ Síntese de voz em PT-BR — disponível em breve</p>
          </div>

          {/* Step 6: Music */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">6</span>
              <Music className="w-4 h-4" /> Música (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: lo-fi, épica, relaxante..."
              value={music}
              disabled={autoMusic}
              onChange={(e) => setMusic(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition text-sm disabled:opacity-50"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setAutoMusic((v) => !v)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition flex items-center justify-center gap-1.5 ${
                  autoMusic ? "bg-secondary/10 border-secondary text-secondary" : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" /> {autoMusic ? "Trilha automática ativa" : "🎼 Gerar trilha exclusiva"}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">🎵 Geração e exportação de música — disponível em breve</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          {!loading && !result && (
            <button
              onClick={handleRequestGenerate}
              className="w-full py-4 bg-primary text-primary-foreground font-display font-bold text-lg rounded-lg glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.02] flex flex-col items-center justify-center gap-1"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> Gerar vídeo com IA
              </span>
              <span className="text-xs opacity-75 flex items-center gap-1">
                <Zap className="w-3 h-3" /> {creditCost} créditos · Saldo: {balance}
              </span>
            </button>
          )}

          {/* Processing */}
          <ProcessingStages
            active={loading}
            onCancel={() => setLoading(false)}
            onEditPrompt={() => { setLoading(false); document.querySelector<HTMLTextAreaElement>("#video-prompt")?.focus(); }}
          />

          {/* Result */}
          {result && !loading && (
            <VideoResultPlayer
              enhancedPrompt={result.enhancedPrompt}
              onContinue={handleContinue}
              onVariation={handleVariation}
              onEdit={handleEditAndRegenerate}
              continueLoading={continueLoading}
              variationLoading={variationLoading}
              hasMusic={autoMusic || !!music.trim()}
            />
          )}

          <UpsellPrompt balance={balance} type={balance === 0 ? "no-credits" : "post-generation"} />
        </motion.div>
      </div>
    </div>
  );
};

export default VideoGenerator;
