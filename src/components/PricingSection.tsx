import { motion } from "framer-motion";
import { Check, Crown } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "Grátis",
    period: "",
    features: ["1 build por dia", "Apenas APK", "Suporte básico"],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "R$29",
    period: "/mês",
    features: ["APK liberado", "Nomes ilimitados", "Ideias limitadas", "Suporte prioritário"],
    highlighted: false,
  },
  {
    name: "Premium",
    price: "R$49",
    period: "/mês",
    badge: "Mais escolhido",
    features: [
      "APK + AAB + PWA",
      "Tudo liberado",
      "Prioridade total",
      "Mais rápido",
      "Suporte VIP",
    ],
    highlighted: true,
  },
];

const PricingSection = () => (
  <section className="py-20 px-4" id="pricing">
    <div className="max-w-6xl mx-auto">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-3xl md:text-5xl font-display font-bold text-center text-gradient-gold mb-16"
      >
        Escolha seu plano
      </motion.h2>

      <div className="grid md:grid-cols-3 gap-6 items-end">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className={`card-aurora relative transition-all duration-500 ${
              plan.highlighted
                ? "scale-105 border-primary glow-gold lg:py-10"
                : "hover:border-secondary"
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground font-display text-xs font-bold rounded-full flex items-center gap-1">
                <Crown className="w-3 h-3" /> {plan.badge}
              </div>
            )}
            <h3 className={`font-display text-2xl font-bold mb-2 ${plan.highlighted ? "text-gradient-gold" : "text-foreground"}`}>
              {plan.name}
            </h3>
            <div className="mb-6">
              <span className={`text-4xl font-display font-bold ${plan.highlighted ? "text-primary" : "text-foreground"}`}>
                {plan.price}
              </span>
              <span className="text-muted-foreground text-sm">{plan.period}</span>
            </div>
            <ul className="space-y-3 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className={`w-4 h-4 ${plan.highlighted ? "text-primary" : "text-secondary"}`} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={`w-full py-3 rounded-lg font-display font-bold transition-all duration-300 hover:scale-105 ${
                plan.highlighted
                  ? "bg-primary text-primary-foreground glow-gold glow-gold-hover"
                  : "border border-secondary text-secondary hover:bg-secondary/10"
              }`}
            >
              {plan.price === "Grátis" ? "Começar grátis" : "Assinar agora"}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default PricingSection;
