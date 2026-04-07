import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Loader2, Target, DollarSign, Users, Lightbulb, TrendingUp, Smartphone, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BusinessPlan {
  name: string;
  description: string;
  targetAudience: string;
  monetization: string;
  profitIdeas: string[];
  estimatedRevenue: string;
  appSuggestion: string;
}

const ResultCard = ({ icon: Icon, title, children, delay = 0 }: { icon: React.ElementType; title: string; children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="card-aurora p-5"
  >
    <div className="flex items-center gap-3 mb-3">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h3 className="font-display font-bold text-sm text-foreground">{title}</h3>
    </div>
    <div className="text-muted-foreground text-sm leading-relaxed">{children}</div>
  </motion.div>
);

const BusinessGenerator = () => {
  const [businessType, setBusinessType] = useState("");
  const [niche, setNiche] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BusinessPlan | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleGenerate = async () => {
    if (!businessType.trim()) {
      toast({ title: "Digite o tipo de negócio", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-business", {
        body: { businessType: businessType.trim(), niche: niche.trim() || undefined },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data as BusinessPlan);
      toast({ title: "Negócio gerado com sucesso!" });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao gerar negócio", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAll = () => {
    if (!result) return;
    const text = `📌 ${result.name}\n\n${result.description}\n\n👥 Público-alvo: ${result.targetAudience}\n\n💰 Monetização: ${result.monetization}\n\n💡 Ideias:\n${result.profitIdeas.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}\n\n📊 Potencial: ${result.estimatedRevenue}\n\n📱 App: ${result.appSuggestion}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateApp = () => {
    if (result) {
      navigate("/generator", { state: { appName: result.name, fromBusiness: true } });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold text-lg text-gradient-gold">Criar Negócio com IA</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-gradient-cyan mb-3">
            Gere seu negócio digital completo
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Nossa IA cria um plano de negócio completo com nome, estratégia, público-alvo e potencial de ganho.
          </p>
        </motion.div>

        {/* Input Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-aurora p-6 space-y-4 mb-8">
          <div>
            <label className="block text-sm font-display font-bold text-foreground mb-2">
              Qual tipo de negócio você quer criar? *
            </label>
            <input
              type="text"
              placeholder="Ex: loja de roupas, academia, restaurante, escola online..."
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition text-sm"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-display font-bold text-foreground mb-2">
              Nicho específico (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: fitness feminino, comida japonesa, educação infantil..."
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition text-sm"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !businessType.trim()}
            className="w-full py-3.5 bg-primary text-primary-foreground font-display font-bold text-sm rounded-lg glow-gold transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? "Gerando seu negócio..." : "Gerar Negócio com IA"}
          </button>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Business Name */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-aurora p-6 text-center"
              >
                <h2 className="text-2xl md:text-3xl font-display font-bold text-gradient-gold mb-2">
                  {result.name}
                </h2>
                <p className="text-muted-foreground text-sm">{result.description}</p>
              </motion.div>

              {/* Revenue Highlight */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card-aurora p-5 border-primary/30"
              >
                <div className="flex items-center justify-center gap-3">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-display">Potencial de ganho estimado</p>
                    <p className="text-xl font-display font-bold text-primary">{result.estimatedRevenue}</p>
                  </div>
                </div>
              </motion.div>

              <ResultCard icon={Users} title="Público-Alvo" delay={0.2}>
                {result.targetAudience}
              </ResultCard>

              <ResultCard icon={DollarSign} title="Estratégia de Monetização" delay={0.3}>
                {result.monetization}
              </ResultCard>

              <ResultCard icon={Lightbulb} title="Ideias de Lucro" delay={0.4}>
                <ul className="space-y-2">
                  {result.profitIdeas.map((idea, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary font-bold text-xs mt-0.5">{i + 1}.</span>
                      <span>{idea}</span>
                    </li>
                  ))}
                </ul>
              </ResultCard>

              <ResultCard icon={Smartphone} title="Sugestão de App" delay={0.5}>
                {result.appSuggestion}
              </ResultCard>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-3 pt-4"
              >
                <button
                  onClick={handleCreateApp}
                  className="flex-1 py-3.5 bg-primary text-primary-foreground font-display font-bold text-sm rounded-lg glow-gold transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-5 h-5" /> Criar meu app com esse negócio
                </button>
                <button
                  onClick={handleCopyAll}
                  className="px-6 py-3.5 border border-border text-foreground font-display font-bold text-sm rounded-lg hover:bg-muted transition-all flex items-center justify-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copiado!" : "Copiar tudo"}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BusinessGenerator;
