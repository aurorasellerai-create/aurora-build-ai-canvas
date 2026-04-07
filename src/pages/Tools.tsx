import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, PenTool, Lightbulb, FileText, Loader2, Copy, Check, Image, Smartphone } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
}

const ToolCard = ({ title, description, icon: Icon, placeholder, onGenerate }: ToolCardProps) => {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setResult("");
    // Simulate AI processing
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
    <div className="card-aurora space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-sm font-bold text-foreground">{title}</h3>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
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
        className="w-full py-3 bg-primary text-primary-foreground font-display font-bold text-sm rounded-lg glow-gold transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? "Gerando..." : "Gerar com IA"}
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

const Tools = () => (
  <div className="min-h-screen bg-background">
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
        <ToolCard
          title="Gerador de Nomes"
          description="Nomes criativos para seu app"
          icon={PenTool}
          placeholder="Tema do app (ex: delivery, fitness, educação)"
          onGenerate={() => {
            const names = [];
            for (let i = 0; i < 5; i++) {
              names.push(appNameSuggestions[Math.floor(Math.random() * appNameSuggestions.length)]);
            }
            return [...new Set(names)].join("\n");
          }}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <ToolCard
          title="Gerador de Ideias"
          description="Descubra nichos lucrativos"
          icon={Lightbulb}
          placeholder="Segmento (ex: saúde, educação, comércio)"
          onGenerate={() => {
            const ideas = [];
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
          onGenerate={(input) => {
            const base = playStoreDescriptions[Math.floor(Math.random() * playStoreDescriptions.length)];
            return input ? base.replace("Nosso app", input).replace("O app", input) : base;
          }}
        />
      </motion.div>
    </div>
  </div>
);

export default Tools;
