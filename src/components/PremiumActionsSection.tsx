import { motion } from "framer-motion";
import { Zap, Palette, Smartphone, Globe, Rocket, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const CARDS = [
  {
    icon: Zap,
    emoji: "⚡",
    title: "Geração automática de ideias lucrativas",
    subtitle: "Receba ideias validadas com potencial real de vendas.",
    cta: "Gerar ideias",
    link: "/business",
    gradient: "from-amber-500/20 via-yellow-500/10 to-transparent",
    iconColor: "text-amber-400",
    btnGradient: "from-amber-500 to-yellow-500",
  },
  {
    icon: Palette,
    emoji: "🎨",
    title: "Criação de logotipo com IA",
    subtitle: "Crie uma identidade profissional em poucos segundos.",
    cta: "Criar logo",
    link: "/tools",
    gradient: "from-fuchsia-500/20 via-purple-500/10 to-transparent",
    iconColor: "text-fuchsia-400",
    btnGradient: "from-fuchsia-500 to-purple-500",
  },
  {
    icon: Smartphone,
    emoji: "📲",
    title: "Conversão de site em app em minutos",
    subtitle: "Transforme qualquer site em aplicativo pronto para monetizar.",
    cta: "Converter agora",
    link: "/converter-app",
    gradient: "from-cyan-500/20 via-sky-500/10 to-transparent",
    iconColor: "text-cyan-400",
    btnGradient: "from-cyan-500 to-sky-500",
  },
  {
    icon: Globe,
    emoji: "🌍",
    title: "Tradução automática para múltiplos idiomas",
    subtitle: "Venda globalmente sem barreiras de idioma.",
    cta: "Ativar tradução",
    link: "/tools",
    gradient: "from-emerald-500/20 via-green-500/10 to-transparent",
    iconColor: "text-emerald-400",
    btnGradient: "from-emerald-500 to-green-500",
  },
  {
    icon: Rocket,
    emoji: "🚀",
    title: "Estrutura pronta para escalar",
    subtitle: "Tenha uma base sólida para crescer e automatizar vendas.",
    cta: "Ativar estrutura",
    link: "/generator",
    gradient: "from-primary/20 via-yellow-500/10 to-transparent",
    iconColor: "text-primary",
    btnGradient: "from-primary to-amber-400",
  },
];

export default function PremiumActionsSection() {
  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 mb-4">
            Ferramentas Premium
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            Tudo que você precisa para{" "}
            <span className="text-gradient-gold">faturar online</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
            Ferramentas profissionais com Inteligência Artificial para criar, escalar e monetizar.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CARDS.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className={`${i === 4 ? "sm:col-span-2 lg:col-span-1" : ""}`}
            >
              <Link to={card.link} className="block h-full">
                <div className="premium-card group relative h-full flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30">
                  {/* Light sweep overlay */}
                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="light-sweep absolute inset-0" />
                  </div>

                  {/* Gradient accent top */}
                  <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b ${card.gradient} pointer-events-none`} />

                  <div className="relative z-10 p-7 flex flex-col flex-1">
                    {/* Icon */}
                    <div className="mb-5 flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-muted/80 border border-border/50 flex items-center justify-center ${card.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                        <card.icon className="w-6 h-6" />
                      </div>
                      <span className="text-2xl">{card.emoji}</span>
                    </div>

                    {/* Text */}
                    <h3 className="font-display font-bold text-foreground text-lg mb-2 leading-snug">
                      {card.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">
                      {card.subtitle}
                    </p>

                    {/* 3D Button */}
                    <div className="relative">
                      <div className={`btn-3d relative w-full py-3.5 px-6 rounded-xl bg-gradient-to-r ${card.btnGradient} text-background font-display font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-200`}>
                        {card.cta}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
