import { motion } from "framer-motion";

const items = [
  { emoji: "⚡", text: "Geração automática de ideias lucrativas" },
  { emoji: "🎨", text: "Criação de logotipo com IA" },
  { emoji: "📲", text: "Conversão de site em app em minutos" },
  { emoji: "🌍", text: "Tradução automática para múltiplos idiomas" },
  { emoji: "🚀", text: "Estrutura pronta para escalar" },
];

const DifferentialSection = () => (
  <section className="py-20 px-4 bg-aurora-gradient">
    <div className="max-w-3xl mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-display font-bold text-gradient-gold mb-4"
      >
        O que só a Aurora faz (e ninguém te conta)
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-muted-foreground mb-10"
      >
        Recursos exclusivos que colocam você à frente
      </motion.p>

      <div className="space-y-3 max-w-md mx-auto">
        {items.map((item, i) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 p-3.5 rounded-lg bg-muted/30 border border-border text-left"
          >
            <span className="text-xl">{item.emoji}</span>
            <span className="text-foreground text-sm font-medium">{item.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default DifferentialSection;
