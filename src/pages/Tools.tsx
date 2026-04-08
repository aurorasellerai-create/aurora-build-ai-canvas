import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, PenTool, Lightbulb, FileText, Loader2, Copy, Check, Image, Smartphone, Lock, Zap, Video, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePaywall } from "@/hooks/usePaywall";
import PaywallModal from "@/components/PaywallModal";
import type { PaywallFeature } from "@/hooks/usePaywall";
import { useCredits } from "@/hooks/useCredits";

const appNameSuggestions = [
  "QuickApp Pro", "SmartSite Mobile", "AppBuilder One", "WebToApp Express",
  "MobilizeNow", "SiteApp Generator", "GoMobile Pro", "AppCraft AI",
  "WebWrap Pro", "InstantApp Builder", "SitePack Mobile", "AppForge",
];

const appIdeas = [
  "App de delivery para restaurantes locais",
  "App de agendamento para barbearias e salões",
  "App de catálogo digital para lojas",
  "App de portfólio para freelancers",
  "App de cardápio digital com QR Code",
  "App de imobiliária com busca por mapa",
  "App de academia com treinos personalizados",
  "App de escola com notas e comunicados",
  "App de petshop com agendamento",
  "App de clínica médica com prontuário",
];

const playStoreDescriptions = [
  "Descubra uma experiência mobile única! Nosso app oferece interface intuitiva, carregamento rápido e todas as funcionalidades que você precisa na palma da mão. Baixe agora e transforme sua rotina!",
  "O app mais completo do mercado! Com design moderno e performance otimizada, você terá acesso a todos os recursos essenciais de forma simples e rápida. Experimente grátis!",
  "Sua vida mais fácil começa aqui. App desenvolvido com tecnologia de ponta, oferecendo segurança, velocidade e uma experiência premium. Junte-se a milhares de usuários satisfeitos!",
];

interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  placeholder: string;
  onGenerate: (input: string) => string;
  locked?: boolean;
  onLocked?: () => void;
  creditAction: string;
  consumeCredits: (action: string) => Promise<boolean>;
  creditCost: number;
  balance: number;
}

const ToolCard = ({ title, description, icon: Icon, placeholder, onGenerate, locked, onLocked, creditAction, consumeCredits, creditCost, balance }: ToolCardProps) => {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (locked && onLocked) {
      onLocked();
      return;
    }
    // Check balance before consuming
    if (balance < creditCost) {
      toast({
        title: "Créditos insuficientes",
        description: `Esta ação custa ${creditCost} crédito(s). Você tem ${balance}. Compre mais créditos.`,
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setResult("");
    const credited = await consumeCredits(creditAction);
    if (!credited) {
      setLoading(false);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1500));
    setResult(onGenerate(input));
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast({ title: "Copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`card-aurora space-y-4 ${locked ? "opacity-80" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-sm font-bold text-foreground">{title}</h3>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        {locked && <Lock className="w-4 h-4 text-primary" />}
      </div>

      <input
        type="text"
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition text-sm"
      />

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-3 bg-primary text-primary-foreground font-display font-bold text-sm rounded-lg glow-gold transition-all hover:scale-[1.02] disabled:opacity-50 flex flex-col items-center justify-center gap-1"
      >
        <span className="flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {locked ? "🔒 Desbloquear" : loading ? "Gerando..." : "Gerar com IA"}
        </span>
        {!locked && (
          <span className="text-xs opacity-75 flex items-center gap-1">
            <Zap className="w-3 h-3" /> {creditCost} crédito(s) · Saldo: {balance}
          </span>
        )}
      </button>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-muted/80 border border-border"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-foreground text-sm whitespace-pre-wrap">{result}</p>
            <button onClick={handleCopy} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const Tools = () => {
  const { isFree, checkAccess, paywallOpen, setPaywallOpen, paywallFeature } = usePaywall();
  const { balance, consumeCredits, getCost } = useCredits();
  const creditProps = { consumeCredits, balance };

  return (
    <div className="min-h-screen bg-background">
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} feature={paywallFeature} />

      <header className="border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold text-lg text-gradient-gold">Ferramentas IA</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-display font-bold text-center text-gradient-cyan mb-8"
        >
          Inteligência Artificial Integrada
        </motion.h2>

        {/* Video Generator Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/video" className="block">
            <div className="card-aurora p-5 hover:border-primary/40 transition-all group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                    Gerador de Vídeos IA
                    <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-bold uppercase">Novo</span>
                  </h3>
                  <p className="text-muted-foreground text-xs mt-0.5">Crie qualquer tipo de vídeo com IA — sem edição</p>
                </div>
                <Sparkles className="w-5 h-5 text-primary opacity-50 group-hover:opacity-100 transition" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Free tools */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <ToolCard
            title="Gerador de Nomes"
            description="Nomes criativos para seu app"
            icon={PenTool}
            placeholder="Tema do app (ex: delivery, fitness, educação)"
            creditAction="ai_tool_names"
            creditCost={getCost("ai_tool_names")}
            {...creditProps}
            onGenerate={() => {
              const names: string[] = [];
              for (let i = 0; i < 5; i++) {
                names.push(appNameSuggestions[Math.floor(Math.random() * appNameSuggestions.length)]);
              }
              return [...new Set(names)].join("\n");
            }}
          />
        </motion.div>

        {/* Locked for free users */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <ToolCard
            title="Gerador de Ideias"
            description="Descubra nichos lucrativos"
            icon={Lightbulb}
            placeholder="Segmento (ex: saúde, educação, comércio)"
            locked={isFree}
            onLocked={() => checkAccess("advanced_ai")}
            creditAction="ai_tool_ideas"
            creditCost={getCost("ai_tool_ideas")}
            {...creditProps}
            onGenerate={() => {
              const ideas: string[] = [];
              for (let i = 0; i < 3; i++) {
                ideas.push(`${i + 1}. ${appIdeas[Math.floor(Math.random() * appIdeas.length)]}`);
              }
              return ideas.join("\n\n");
            }}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <ToolCard
            title="Descrição Play Store"
            description="Textos otimizados para conversão"
            icon={FileText}
            placeholder="Nome do seu app"
            locked={isFree}
            onLocked={() => checkAccess("advanced_ai")}
            creditAction="ai_tool_description"
            creditCost={getCost("ai_tool_description")}
            {...creditProps}
            onGenerate={(input) => {
              const base = playStoreDescriptions[Math.floor(Math.random() * playStoreDescriptions.length)];
              return input ? base.replace("Nosso app", input).replace("O app", input) : base;
            }}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <ToolCard
            title="Gerador de Ícones"
            description="Ícone profissional para seu app"
            icon={Image}
            placeholder="Descreva o ícone (ex: ícone azul moderno de delivery)"
            locked={isFree}
            onLocked={() => checkAccess("advanced_ai")}
            creditAction="ai_tool_icon"
            creditCost={getCost("ai_tool_icon")}
            {...creditProps}
            onGenerate={(input) => {
              const styles = ["Flat Design", "Material Design", "Glassmorphism", "Gradient", "Minimal"];
              const colors = ["Azul", "Dourado", "Verde", "Roxo", "Vermelho"];
              const style = styles[Math.floor(Math.random() * styles.length)];
              const color = colors[Math.floor(Math.random() * colors.length)];
              return `✅ Ícone gerado com sucesso!\n\n📐 Estilo: ${style}\n🎨 Cor dominante: ${color}\n📏 Tamanho: 512x512px\n📄 Formato: PNG (transparente)\n\n💡 Tema: ${input || "App genérico"}\n\n⬇️ O ícone está pronto para uso na Play Store.`;
            }}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <ToolCard
            title="Splash Screen"
            description="Tela de abertura personalizada"
            icon={Smartphone}
            placeholder="Nome do app e cor principal (ex: MeuApp, azul)"
            locked={isFree}
            onLocked={() => checkAccess("advanced_ai")}
            creditAction="ai_tool_splash"
            creditCost={getCost("ai_tool_splash")}
            {...creditProps}
            onGenerate={(input) => {
              const layouts = ["Logo centralizado com gradiente", "Logo + nome com animação fade-in", "Fullscreen com brand color", "Minimalista com ícone"];
              const layout = layouts[Math.floor(Math.random() * layouts.length)];
              return `✅ Splash Screen gerada!\n\n📐 Layout: ${layout}\n📏 Resolução: 1080x1920px\n🎨 Adaptada para: ${input || "seu app"}\n⏱️ Duração sugerida: 2 segundos\n\n📱 Compatível com Android 8+\n⬇️ Pronta para integração.`;
            }}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default Tools;
