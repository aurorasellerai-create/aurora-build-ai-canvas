import { motion } from "framer-motion";
import { Code2, Smartphone, ShieldCheck, Zap } from "lucide-react";

const benefits = [
  { icon: Code2, title: "Sem programação", desc: "Nenhuma linha de código necessária" },
  { icon: Smartphone, title: "APK + AAB + PWA", desc: "Todos os formatos em um só lugar" },
  { icon: ShieldCheck, title: "Pronto para Play Store", desc: "App otimizado para publicação" },
  { icon: Zap, title: "Rápido e automatizado", desc: "Pronto em poucos minutos" },
];

const BenefitsSection = () => (
  <section id="beneficios" className="py-20 px-4 bg-aurora-gradient">
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {benefits.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="card-aurora group hover:glow-gold transition-all duration-500 cursor-default"
          >
            <b.icon className="w-10 h-10 text-secondary mb-4 group-hover:text-primary transition-colors" />
            <h3 className="font-display text-lg font-bold text-foreground mb-2">{b.title}</h3>
            <p className="text-muted-foreground text-sm">{b.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default BenefitsSection;
