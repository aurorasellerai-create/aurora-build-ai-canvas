import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, PenTool, Lightbulb, Image, Smartphone, Sparkles, FileText, Brain, Search } from "lucide-react";

const tools = [
  { icon: PenTool, title: "Gerador de nomes", desc: "Nomes criativos para seu app com IA", color: "text-primary" },
  { icon: Lightbulb, title: "Gerador de ideias", desc: "Descubra nichos lucrativos", color: "text-secondary" },
  { icon: Image, title: "Gerador de ícones", desc: "Ícones profissionais com IA", color: "text-primary" },
  { icon: Smartphone, title: "Splash Screen", desc: "Tela de abertura personalizada", color: "text-secondary" },
  { icon: Sparkles, title: "Sugestão de nome", desc: "IA sugere nomes automaticamente", color: "text-primary" },
  { icon: FileText, title: "Descrição Play Store", desc: "Textos otimizados para conversão", color: "text-secondary" },
  { icon: Brain, title: "Análise inteligente", desc: "IA analisa e otimiza seu app", color: "text-primary" },
  { icon: Search, title: "Detectar problemas", desc: "Encontre issues no seu site", color: "text-secondary" },
];

const Tools = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border px-4 py-4">
      <div className="max-w-6xl mx-auto flex items-center gap-4">
        <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-display font-bold text-lg text-gradient-gold">Ferramentas IA</h1>
      </div>
    </header>

    <div className="max-w-6xl mx-auto px-4 py-12">
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-3xl font-display font-bold text-center text-gradient-cyan mb-12"
      >
        Ferramentas com Inteligência Artificial
      </motion.h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {tools.map((t, i) => (
          <motion.div
            key={t.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card-aurora group hover:glow-gold transition-all duration-500 cursor-pointer hover:scale-105 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
              <t.icon className={`w-7 h-7 ${t.color} group-hover:text-primary transition-colors`} />
            </div>
            <h3 className="font-display text-sm font-bold text-foreground mb-2">{t.title}</h3>
            <p className="text-muted-foreground text-xs">{t.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

export default Tools;
