import { memo } from "react";
import { motion } from "framer-motion";
import { XCircle } from "lucide-react";

const pains = [
  "Você tem uma ideia de app, mas não sabe programar",
  "Já tentou criar um app e desistiu pela complexidade",
  "Quer faturar online, mas não sabe por onde começar",
  "Paga caro para desenvolvedores e o resultado demora meses",
  "Precisa de um app para o seu negócio, mas não tem orçamento",
];

const PainSection = memo(() => (
  <section className="py-16 px-4" aria-label="Problemas que a Aurora resolve">
    <div className="max-w-3xl mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3"
      >
        Se você se identifica com alguma dessas situações…
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-muted-foreground mb-8"
      >
        Você não está sozinho. Milhares de pessoas tinham o mesmo problema — até conhecer a Aurora.
      </motion.p>

      <div className="space-y-3 max-w-lg mx-auto text-left">
        {pains.map((pain, i) => (
          <motion.div
            key={pain}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-3 p-3.5 rounded-lg bg-destructive/5 border border-destructive/15"
          >
            <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <span className="text-foreground text-sm font-medium">{pain}</span>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-8 text-lg font-display font-bold text-gradient-gold"
      >
        A Aurora resolve tudo isso — em minutos, com IA.
      </motion.p>
    </div>
  </section>
));
PainSection.displayName = "PainSection";

export default PainSection;
