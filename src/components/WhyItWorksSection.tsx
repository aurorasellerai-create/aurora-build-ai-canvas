import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const items = [
  "Cria o app automaticamente",
  "Organiza estrutura de vendas",
  "Integra com monetização",
  "Funciona 24h por dia",
];

const WhyItWorksSection = () => (
  <section className="py-20 px-4">
    <div className="max-w-3xl mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-display font-bold text-gradient-cyan mb-4"
      >
        Não é só um app… é um sistema de vendas automático
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-muted-foreground mb-10"
      >
        Cada app criado já nasce pronto para gerar receita
      </motion.p>

      <div className="grid sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto">
        {items.map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border"
          >
            <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
            <span className="text-foreground text-sm font-medium">{item}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WhyItWorksSection;
