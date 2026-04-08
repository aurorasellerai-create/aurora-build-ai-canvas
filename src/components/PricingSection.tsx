import { motion } from "framer-motion";
import { Check, Crown, Flame } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Free",
    price: "Grátis",
    period: "",
    features: [
      "1 build por dia",
      "Apenas APK",
      "Acesso limitado",
    ],
    highlighted: false,
    badge: null,
    cta: "Começar grátis",
  },
  {
    name: "Pro",
    price: "R$29",
    period: "/mês",
    features: [
      "5 builds por dia",
      "APK liberado",
      "Acesso à IA",
      "Ferramentas extras",
      "Suporte padrão",
    ],
    highlighted: true,
    badge: "🔥 Mais escolhido",
    cta: "Começar agora",
  },
  {
    name: "Premium",
    price: "R$49",
    period: "/mês",
    features: [
      "Builds ilimitados",
      "APK + AAB + PWA",
      "IA ilimitada",
      "Prioridade total",
      "Maior velocidade",
    ],
    highlighted: false,
    badge: "💰 Máximo desempenho",
    cta: "Começar agora",
  },
];

const PricingSection = () => (
  <section className="py-20 px-4" id="precos">
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <h2 className="text-3xl md:text-4xl font-display font-bold text-gradient-gold mb-3">
          Escolha seu plano e comece a faturar
        </h2>
        <p className="text-muted-foreground">
          Cancele quando quiser · Sem surpresas · Resultado real
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-5 items-stretch">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
            className={`card-aurora relative flex flex-col transition-all duration-500 ${
              plan.highlighted
                ? "border-primary glow-gold md:scale-105 md:py-10"
                : "hover:border-secondary"
            }`}
          >
            {plan.badge && (
              <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 font-display text-xs font-bold rounded-full flex items-center gap-1 whitespace-nowrap ${
                plan.highlighted
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted border border-border text-foreground"
              }`}>
                {plan.badge}
              </div>
            )}
            <h3 className={`font-display text-2xl font-bold mb-1 ${plan.highlighted ? "text-gradient-gold" : "text-foreground"}`}>
              {plan.name}
            </h3>
            <div className="mb-5">
              <span className={`text-4xl font-display font-bold ${plan.highlighted ? "text-primary" : "text-foreground"}`}>
                {plan.price}
              </span>
              <span className="text-muted-foreground text-sm">{plan.period}</span>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className={`w-4 h-4 shrink-0 ${plan.highlighted ? "text-primary" : "text-secondary"}`} />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/auth"
              className={`w-full py-3 rounded-lg font-display font-bold text-sm transition-all duration-300 hover:scale-105 text-center block ${
                plan.highlighted
                  ? "bg-primary text-primary-foreground glow-gold glow-gold-hover"
                  : "border border-secondary text-secondary hover:bg-secondary/10"
              }`}
            >
              {plan.cta}
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Upsell */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-10 text-center space-y-2"
      >
        <p className="text-xs text-muted-foreground">
          💡 <span className="text-foreground font-semibold">Desbloqueie mais recursos</span> no plano Pro · <span className="text-foreground font-semibold">Ative IA completa</span> no plano Elite
        </p>
        <p className="text-xs text-muted-foreground">
          💰 Potencial de renda ativa · 🚀 Comece em minutos
        </p>
      </motion.div>
    </div>
  </section>
);

export default PricingSection;
