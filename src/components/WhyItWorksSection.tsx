import { memo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const before = [
  "Pagar R$ 5.000+ para um desenvolvedor",
  "Esperar meses para ter seu app pronto",
  "Depender de equipe técnica para cada mudança",
  "Aprender programação do zero",
];

const after = [
  "Criar seu app sozinho em 5 minutos",
  "Exportar em APK, AAB e PWA instantaneamente",
  "A IA faz tudo por você automaticamente",
  "Zero código — só colar a URL e pronto",
];

const WhyItWorksSection = memo(() => (
  <section id="como-funciona" className="py-20 px-4" aria-label="Antes e depois com Aurora Build AI">
    <div className="max-w-4xl mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-display font-bold text-gradient-cyan mb-4"
      >
        Sem a Aurora vs. Com a Aurora
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-muted-foreground mb-10"
      >
        Veja a diferença de criar um app do jeito antigo vs. com inteligência artificial
      </motion.p>

      <div className="grid md:grid-cols-2 gap-6 text-left">
        {/* Before */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="p-5 rounded-xl border border-destructive/20 bg-destructive/5"
        >
          <h3 className="font-display font-bold text-destructive text-sm mb-4 uppercase tracking-wider">❌ Sem a Aurora</h3>
          <div className="space-y-3">
            {before.map((item) => (
              <p key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-destructive shrink-0 mt-0.5">•</span> {item}
              </p>
            ))}
          </div>
        </motion.div>

        {/* After */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="p-5 rounded-xl border border-primary/20 bg-primary/5"
        >
          <h3 className="font-display font-bold text-primary text-sm mb-4 uppercase tracking-wider">✅ Com a Aurora</h3>
          <div className="space-y-3">
            {after.map((item) => (
              <p key={item} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> {item}
              </p>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  </section>
));
WhyItWorksSection.displayName = "WhyItWorksSection";

export default WhyItWorksSection;
