import { memo } from "react";
import { motion } from "framer-motion";
import { Zap, Shield, Clock, TrendingUp, Sparkles } from "lucide-react";

const items = [
  { icon: Zap, text: "Geração automática de ideias lucrativas com IA" },
  { icon: Sparkles, text: "Criação de logotipo profissional em segundos" },
  { icon: Clock, text: "Conversão de site em app em menos de 5 minutos" },
  { icon: TrendingUp, text: "Estrutura pronta para escalar e monetizar" },
  { icon: Shield, text: "App pronto para publicar na Google Play Store" },
];

const DifferentialSection = memo(() => (
  <section className="py-20 px-4 bg-aurora-gradient" aria-label="Diferenciais exclusivos da Aurora Build AI">
    <div className="max-w-3xl mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-display font-bold text-gradient-gold mb-4"
      >
        Por que a Aurora é diferente de tudo que existe
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-muted-foreground mb-10"
      >
        Recursos que você não encontra em nenhum outro lugar
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
            <item.icon className="w-5 h-5 text-primary shrink-0" />
            <span className="text-foreground text-sm font-medium">{item.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
));
DifferentialSection.displayName = "DifferentialSection";

export default DifferentialSection;
