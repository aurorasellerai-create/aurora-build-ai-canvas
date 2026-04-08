import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Wrench, Unlock, Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const expandedDetails: Record<string, { sections: { emoji: string; title: string; items: string[] }[] }> = {
  Free: {
    sections: [
      { emoji: "🔓", title: "Acesso incluído", items: ["Acesso básico ao sistema", "1 geração de vídeo para teste", "1 geração de carrossel para teste"] },
    ],
  },
  Pro: {
    sections: [
      { emoji: "🔓", title: "Acesso incluído", items: ["Gerador de vídeos com IA", "Gerador de carrossel automático", "Converter site em app", "Exportar APK"] },
      { emoji: "⚙️", title: "Ferramentas", items: ["Gerador de nomes", "Gerador de ideias", "Tradução automática", "Criador de logo", "Remover fundo de imagem", "Estrutura de vendas"] },
      { emoji: "💰", title: "Créditos", items: ["As ferramentas utilizam créditos conforme o uso", "50 créditos inclusos no plano"] },
    ],
  },
  Premium: {
    sections: [
      { emoji: "🔓", title: "Acesso incluído", items: ["Gerador de vídeos com IA", "Gerador de carrossel automático", "APK + AAB + PWA", "IA avançada", "Prioridade no processamento"] },
      { emoji: "⚙️", title: "Ferramentas", items: ["Gerador de nomes", "Gerador de ideias", "Tradução automática", "Criador de logo", "Remover fundo de imagem", "Estrutura de vendas"] },
      { emoji: "💰", title: "Créditos", items: ["Ferramentas de IA com créditos", "500 créditos inclusos no plano"] },
    ],
  },
};

const plans = [
  {
    name: "Free",
    price: "Grátis",
    period: "",
    features: ["Acesso básico ao sistema", "🎬 1 geração de vídeo (teste)", "🎠 1 geração de carrossel (teste)"],
    highlighted: false,
    badge: null,
    cta: "Começar grátis",
    href: "/auth",
    external: false,
    subtitle: null,
  },
  {
    name: "Pro",
    price: "R$39",
    period: "/mês",
    features: ["Gerador de vídeos com IA", "Gerador de carrossel automático", "IA integrada", "APK liberado", "Recursos essenciais"],
    highlighted: false,
    badge: null,
    cta: "Começar agora",
    href: "https://pay.kiwify.com.br/rnou5oN",
    external: true,
    subtitle: null,
  },
  {
    name: "Premium",
    price: "R$59",
    period: "/mês",
    features: ["Gerador de vídeos com IA", "Gerador de carrossel automático", "APK + AAB + PWA liberados", "IA avançada", "Prioridade no processamento", "Melhor desempenho"],
    highlighted: true,
    badge: "⭐ Mais escolhido",
    cta: "Começar agora",
    href: "https://pay.kiwify.com.br/edN32V9",
    external: true,
    subtitle: "Máximo desempenho para criar e escalar",
  },
];

const sectionIcons: Record<string, React.ElementType> = {
  "Acesso incluído": Unlock,
  "Ferramentas": Wrench,
  "Créditos": Coins,
};

const PricingSection = () => {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
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

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {plans.map((plan, i) => {
            const isExpanded = expanded === plan.name;
            const details = expandedDetails[plan.name];

            return (
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
                {plan.subtitle && (
                  <p className="text-xs text-primary/80 font-medium mb-2">{plan.subtitle}</p>
                )}
                <div className="mb-5">
                  <span className={`text-4xl font-display font-bold ${plan.highlighted ? "text-primary" : "text-foreground"}`}>
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-2.5 mb-4 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className={`w-4 h-4 shrink-0 ${plan.highlighted ? "text-primary" : "text-secondary"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : plan.name)}
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 group"
                >
                  <span>Ver tudo que está incluso</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {isExpanded && details && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden mb-4"
                    >
                      <div className="space-y-4 pt-2 border-t border-border/50">
                        {details.sections.map((section) => {
                          const SIcon = sectionIcons[section.title] || Wrench;
                          return (
                            <div key={section.title} className="pt-3">
                              <p className="text-xs font-display font-bold text-foreground flex items-center gap-1.5 mb-2">
                                <SIcon className="w-3.5 h-3.5 text-primary" />
                                {section.emoji} {section.title}
                              </p>
                              <ul className="space-y-1.5">
                                {section.items.map((item) => (
                                  <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <Check className="w-3 h-3 shrink-0 text-primary/60 mt-0.5" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {plan.external ? (
                  <a
                    href={plan.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => toast.success("Redirecionando para pagamento...")}
                    className={`w-full py-3 rounded-lg font-display font-bold text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg text-center block ${
                      plan.highlighted
                        ? "bg-primary text-primary-foreground glow-gold glow-gold-hover"
                        : "border border-secondary text-secondary hover:bg-secondary/10"
                    }`}
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <Link
                    to={plan.href}
                    className={`w-full py-3 rounded-lg font-display font-bold text-sm transition-all duration-300 hover:scale-105 text-center block ${
                      plan.highlighted
                        ? "bg-primary text-primary-foreground glow-gold glow-gold-hover"
                        : "border border-secondary text-secondary hover:bg-secondary/10"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Upsell */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 text-center space-y-2"
        >
          <p className="text-xs text-muted-foreground">
            💡 Algumas funcionalidades utilizam créditos conforme o uso.
          </p>
          <p className="text-xs text-muted-foreground">
            💰 Potencial de renda ativa · 🚀 Comece em minutos
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
