import { motion } from "framer-motion";
import { Sparkles, Lightbulb, FileText, Brain } from "lucide-react";

const features = [
  { icon: Sparkles, title: "Sugestão de nome", desc: "IA gera nomes criativos automaticamente" },
  { icon: Lightbulb, title: "Ideias de apps", desc: "Receba sugestões de apps lucrativos" },
  { icon: FileText, title: "Descrição Play Store", desc: "Textos otimizados para conversão" },
  { icon: Brain, title: "Análise inteligente", desc: "IA analisa e otimiza seu app" },
];

const AISection = () => (
  <section className="py-20 px-4 bg-aurora-gradient">
    <div className="max-w-6xl mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-3xl md:text-5xl font-display font-bold text-gradient-cyan mb-4"
      >
        Inteligência Artificial Integrada
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-muted-foreground mb-16 max-w-xl mx-auto"
      >
        A IA trabalha por você em cada etapa do processo
      </motion.p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="card-aurora group hover:glow-gold transition-all duration-500 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
              <f.icon className="w-7 h-7 text-secondary group-hover:text-primary transition-colors" />
            </div>
            <h3 className="font-display text-base font-bold text-foreground mb-2">{f.title}</h3>
            <p className="text-muted-foreground text-sm">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default AISection;
