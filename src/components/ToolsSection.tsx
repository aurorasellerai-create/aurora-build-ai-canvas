import { motion } from "framer-motion";
import { PenTool, Lightbulb, Image, Smartphone } from "lucide-react";

const tools = [
  { icon: PenTool, title: "Gerador de nomes", desc: "Nomes criativos para seu app" },
  { icon: Lightbulb, title: "Gerador de ideias", desc: "Descubra nichos lucrativos" },
  { icon: Image, title: "Gerador de ícones", desc: "Ícones profissionais com IA" },
  { icon: Smartphone, title: "Splash Screen", desc: "Tela de abertura personalizada" },
];

const ToolsSection = () => (
  <section className="py-20 px-4">
    <div className="max-w-6xl mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-3xl md:text-5xl font-display font-bold text-gradient-gold mb-16"
      >
        Ferramentas Extras
      </motion.h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {tools.map((t, i) => (
          <motion.div
            key={t.title}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="card-aurora group hover:glow-gold transition-all duration-500 cursor-pointer hover:scale-105"
          >
            <t.icon className="w-10 h-10 text-primary mb-4 mx-auto" />
            <h3 className="font-display text-base font-bold text-foreground mb-2">{t.title}</h3>
            <p className="text-muted-foreground text-sm">{t.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ToolsSection;
