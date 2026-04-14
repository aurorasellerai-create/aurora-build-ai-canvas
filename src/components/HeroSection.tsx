import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import auroraSymbol from "@/assets/aurora-symbol.png";

function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLParagraphElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

const AnimatedCounter = () => {
  const { count, ref } = useCountUp(1247, 2200);
  return (
    <p ref={ref} className="text-sm text-muted-foreground">
      🚀 <span className="text-foreground font-bold tabular-nums">{count.toLocaleString("pt-BR")}+</span> empreendedores já criaram seus apps com a Aurora
    </p>
  );
};

const HeroSection = () => {
  return (
    <section
      aria-label="Criar app Android com inteligência artificial"
      className="relative flex items-center justify-center overflow-hidden"
      style={{ paddingTop: 100, paddingBottom: 80 }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, #0B0F1A 0%, #0E1A2B 50%, #0B0F1A 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 40%, hsl(51 100% 50% / 0.04), transparent)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-[750px] mx-auto px-6 text-center space-y-5"
      >
        {/* Keyword-rich H1 with emotional promise */}
        <h1 className="font-display font-bold leading-[1.12] text-[24px] sm:text-[32px] md:text-[40px] lg:text-[46px] text-foreground">
          Crie seu app Android com IA
          <br />
          <span className="text-gradient-gold">— sem código, sem complicação</span>
        </h1>

        <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
          Transforme qualquer site em aplicativo <strong className="text-foreground">pronto para vender</strong> em minutos.
          A IA faz tudo: app, vídeo, logo e conteúdo.
        </p>

        {/* Single strong CTA + secondary */}
        <div className="flex flex-col sm:flex-row gap-3 pt-3 justify-center">
          <Link
            to="/auth"
            aria-label="Criar meu app grátis agora"
            className="px-7 py-3.5 bg-primary text-primary-foreground font-display font-bold rounded-lg text-sm glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.03] text-center"
          >
            Criar meu app grátis →
          </Link>
          <a
            href="#precos"
            className="px-7 py-3.5 border-2 border-secondary text-secondary font-display font-semibold rounded-lg text-sm hover:bg-secondary/10 transition-all duration-300 text-center"
          >
            Ver planos
          </a>
        </div>

        {/* Objection crushers */}
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="text-secondary">✔</span> Sem precisar programar</span>
          <span className="flex items-center gap-1.5"><span className="text-secondary">✔</span> Resultado em 5 minutos</span>
          <span className="flex items-center gap-1.5"><span className="text-secondary">✔</span> Pronto para a Play Store</span>
        </div>

        {/* Urgency + Social proof */}
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <p className="text-xs font-semibold text-primary animate-pulse">⏳ Acesso gratuito por tempo limitado</p>
          <AnimatedCounter />
        </div>

        {/* Aurora Symbol */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="pt-6 flex justify-center"
        >
          <img
            src={auroraSymbol}
            alt="Aurora Build AI — plataforma para criar aplicativos Android com inteligência artificial"
            width={280}
            height={280}
            className="w-[180px] sm:w-[220px] md:w-[280px] h-auto object-contain"
            loading="eager"
            style={{
              filter:
                "drop-shadow(0 0 16px hsl(51 100% 50% / 0.3)) drop-shadow(0 0 30px hsl(190 100% 50% / 0.15))",
              animation: "symbol-pulse 3s ease-in-out infinite",
            }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
