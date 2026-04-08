import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Zap, Copy, Check, LayoutGrid } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCredits } from "@/hooks/useCredits";
import { usePaywall } from "@/hooks/usePaywall";
import PaywallModal from "@/components/PaywallModal";
import { Textarea } from "@/components/ui/textarea";

const STYLES = [
  { id: "modern", label: "Moderno", emoji: "🎨" },
  { id: "minimal", label: "Minimalista", emoji: "⚪" },
  { id: "bold", label: "Impactante", emoji: "🔥" },
  { id: "elegant", label: "Elegante", emoji: "✨" },
];

const SLIDE_COUNTS = [3, 5, 7, 10];

const CarouselGenerator = () => {
  const { balance, consumeCredits, getCost, isAdmin } = useCredits();
  const { isFree, checkAccess, paywallOpen, setPaywallOpen, paywallFeature } = usePaywall();

  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("modern");
  const [slideCount, setSlideCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const creditCost = getCost("ai_carousel");

  const handleGenerate = () => {
    if (isFree) {
      checkAccess("advanced_ai");
      return;
    }
    if (!topic.trim()) {
      toast({ title: "Informe o tema do carrossel", variant: "destructive" });
      return;
    }
    setShowConfirm(true);
  };

  const confirmGenerate = async () => {
    setShowConfirm(false);
    if (!isAdmin && balance < creditCost) {
      toast({
        title: "Créditos insuficientes",
        description: "Você precisa de créditos para criar carrosséis.",
        variant: "destructive",
        action: <Link to="/credits" className="text-primary font-bold text-xs underline">Comprar créditos</Link>,
      });
      return;
    }

    setLoading(true);
    const credited = await consumeCredits("ai_carousel");
    if (!credited) { setLoading(false); return; }

    // Simulate AI generation
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));

    const selectedStyle = STYLES.find(s => s.id === style)?.label || "Moderno";
    const slides: string[] = [];
    const hooks = [
      `🔥 ${topic} — O que ninguém te conta`,
      `💡 Por que ${topic} muda tudo?`,
      `📊 Dados que comprovam`,
      `⚡ Como aplicar hoje`,
      `🎯 Estratégia prática`,
      `🧠 Mentalidade certa`,
      `📱 Ferramentas recomendadas`,
      `✅ Checklist rápido`,
      `💰 Resultados reais`,
      `👉 Próximo passo — Aja agora`,
    ];

    for (let i = 0; i < slideCount; i++) {
      const title = hooks[i % hooks.length];
      const body = i === 0
        ? `[Capa]\n\nTema: ${topic}\nEstilo: ${selectedStyle}\n\nUse uma imagem forte e texto curto.`
        : i === slideCount - 1
        ? `[CTA Final]\n\nComente "${topic}" para receber mais conteúdo.\nSiga para não perder.`
        : `Slide ${i + 1}:\n\n${title}\n\n• Ponto principal sobre ${topic}\n• Dado ou exemplo relevante\n• Conclusão do slide`;
      slides.push(body);
    }

    setResult(slides);
    setLoading(false);
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.join("\n\n---\n\n"));
    setCopied(true);
    toast({ title: "Carrossel copiado!" });
    setTimeout(() => setCopied(false), 2000);
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
            <LayoutGrid className="w-5 h-5" /> Gerador de Carrossel IA
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h2 className="text-2xl font-display font-bold text-gradient-cyan mb-2">🎠 Criar Carrossel com IA</h2>
          <p className="text-muted-foreground text-sm">Crie carrosséis prontos para redes sociais automaticamente.</p>
        </motion.div>

        {/* Topic */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-2">
          <label className="text-sm font-display font-bold text-foreground">Tema do carrossel *</label>
          <Textarea
            placeholder="Ex: vendas online, motivacional, dicas de marketing, apresentação de produto..."
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="bg-muted border-border"
          />
        </motion.div>

        {/* Style */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
          <label className="text-sm font-display font-bold text-foreground">Estilo visual</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  style === s.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                }`}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Slide count */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
          <label className="text-sm font-display font-bold text-foreground">Quantidade de slides</label>
          <div className="flex gap-2">
            {SLIDE_COUNTS.map(c => (
              <button
                key={c}
                onClick={() => setSlideCount(c)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-bold transition-all ${
                  slideCount === c
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                }`}
              >
                {c} slides
              </button>
            ))}
          </div>
        </motion.div>

        {/* Generate button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-4 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold transition-all hover:scale-[1.02] disabled:opacity-50 flex flex-col items-center gap-1"
          >
            <span className="flex items-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LayoutGrid className="w-5 h-5" />}
              {loading ? "Gerando carrossel..." : "Gerar carrossel com IA"}
            </span>
            <span className="text-xs opacity-75 flex items-center gap-1">
              <Zap className="w-3 h-3" /> {creditCost} crédito(s) · Saldo: {balance}
            </span>
          </button>
        </motion.div>

        {/* Confirm modal */}
        <AnimatePresence>
          {showConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
              onClick={() => setShowConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-card border border-border rounded-xl p-6 max-w-sm w-full space-y-4"
              >
                <h3 className="font-display font-bold text-lg text-foreground">Confirmar geração</h3>
                <p className="text-sm text-muted-foreground">
                  Este carrossel irá consumir <span className="text-primary font-bold">{creditCost} crédito(s)</span>.
                </p>
                <p className="text-xs text-muted-foreground">Saldo atual: {balance} créditos</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition">Cancelar</button>
                  <button onClick={confirmGenerate} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm glow-gold transition hover:scale-105">Confirmar</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-foreground">Carrossel gerado</h3>
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copiado!" : "Copiar tudo"}
                </button>
              </div>
              <div className="grid gap-3">
                {result.map((slide, i) => (
                  <div key={i} className="p-4 rounded-lg bg-muted/80 border border-border">
                    <p className="text-xs text-primary font-bold mb-1">Slide {i + 1}</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{slide}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CarouselGenerator;
