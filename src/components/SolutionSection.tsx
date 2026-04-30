import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Globe, Sparkles, Download } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Cole a URL do seu site",
    desc: "Ou descreva sua ideia — a IA entende o que você precisa.",
    icon: Globe,
    color: "hsl(190, 100%, 50%)",
  },
  {
    number: "02",
    title: "A IA cria seu app",
    desc: "Em minutos, seu aplicativo Android fica pronto automaticamente.",
    icon: Sparkles,
    color: "hsl(51, 100%, 50%)",
  },
  {
    number: "03",
    title: "Exporte e publique",
    desc: "Baixe em APK, AAB ou PWA e publique na Play Store.",
    icon: Download,
    color: "hsl(150, 80%, 50%)",
  },
];

function OrbitalTimeline() {
  return (
    <div className="relative flex flex-col md:flex-row items-center justify-center gap-8 md:gap-0 py-8">
      {/* Connecting line (desktop) */}
      <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-px" aria-hidden="true">
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3 }}
          className="h-full origin-left"
          style={{
            background: "linear-gradient(90deg, hsl(190 100% 50% / 0.3), hsl(51 100% 50% / 0.5), hsl(150 80% 50% / 0.3))",
          }}
        />
      </div>

      {/* Connecting line (mobile) */}
      <div className="md:hidden absolute top-[10%] bottom-[10%] left-1/2 w-px -translate-x-1/2" aria-hidden="true">
        <motion.div
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3 }}
          className="h-full origin-top"
          style={{
            background: "linear-gradient(180deg, hsl(190 100% 50% / 0.3), hsl(51 100% 50% / 0.5), hsl(150 80% 50% / 0.3))",
          }}
        />
      </div>

      {steps.map((step, i) => (
        <motion.div
          key={step.number}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.2, duration: 0.5, type: "spring" }}
          className="relative z-10 flex-1 max-w-[280px] mx-4"
        >
          {/* Orbiting ring */}
          <div className="relative w-24 h-24 mx-auto mb-5">
            {/* Outer ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border"
              style={{ borderColor: `${step.color}20` }}
            >
              <div
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                style={{
                  backgroundColor: step.color,
                  boxShadow: `0 0 8px ${step.color}`,
                }}
              />
            </motion.div>

            {/* Inner circle */}
            <div
              className="absolute inset-3 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle, ${step.color}15, transparent)`,
                border: `1px solid ${step.color}30`,
              }}
            >
              <step.icon className="w-7 h-7" style={{ color: step.color }} />
            </div>

            {/* Step number */}
            <div
              className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: step.color,
                color: "#0B0F1A",
              }}
            >
              {step.number}
            </div>
          </div>

          {/* Text */}
          <div className="text-center">
            <h3 className="font-display text-lg font-bold text-foreground mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const SolutionSection = () => (
  <section className="py-20 px-4 relative overflow-hidden" aria-label="Como criar app com a Aurora">
    {/* Background glow */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: "radial-gradient(ellipse 60% 40% at 50% 50%, hsl(51 100% 50% / 0.03), transparent)",
      }}
    />

    <div className="max-w-4xl mx-auto relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-8"
      >
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="inline-block px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-medium text-primary mb-4"
        >
          Simples como 1-2-3
        </motion.span>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-gradient-gold mb-3">
          Como funciona
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Sem código, sem espera, sem complicação.
        </p>
      </motion.div>

      <OrbitalTimeline />

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6 }}
        className="text-center mt-10"
      >
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-display font-bold rounded-xl glow-gold glow-gold-hover transition-all hover:scale-105"
        >
          Criar meu app agora <ArrowRight className="w-4 h-4" />
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.45 }}
          className="aurora-premium-info-card group relative mx-auto mt-8 max-w-xl overflow-hidden rounded-xl px-5 py-4 text-left backdrop-blur-md transition-all duration-700 hover:scale-[1.015]"
        >
          <h3 className="relative z-10 font-display text-sm font-bold text-foreground mb-3 drop-shadow-[0_0_10px_hsl(var(--primary)/0.18)]">
            🧠 É difícil transformar meu site em app?
          </h3>
          <p className="relative z-10 text-sm text-foreground/78 leading-relaxed">
            Não. Você não precisa saber programar nem mexer com código.
          </p>
          <div className="relative z-10 mt-3 space-y-1.5 text-sm text-foreground/78 leading-relaxed">
            <p><span className="text-primary font-semibold">1.</span> Você cola o link do seu site</p>
            <p><span className="text-primary font-semibold">2.</span> Clica no botão para criar</p>
            <p><span className="text-primary font-semibold">3.</span> Baixa o aplicativo pronto</p>
          </div>
          <p className="relative z-10 mt-3 text-sm text-foreground/78 leading-relaxed">
            Depois disso, é só abrir no Android Studio e clicar em “Build”. Pronto. Seu aplicativo está criado — mesmo que você nunca tenha feito isso antes.
          </p>
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-3 text-xs text-foreground/68">
            <span className="flex items-center justify-center gap-1.5 text-center whitespace-nowrap"><span className="text-primary">✔</span> Qualquer pessoa consegue fazer</span>
            <span className="flex items-center justify-center gap-1.5 text-center whitespace-nowrap"><span className="text-primary">✔</span> Não precisa de experiência</span>
            <span className="flex items-center justify-center gap-1.5 text-center whitespace-nowrap"><span className="text-primary">✔</span> Processo rápido e simples</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  </section>
);

export default SolutionSection;
