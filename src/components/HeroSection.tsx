import { useEffect, useState, useRef, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import auroraSymbol from "@/assets/aurora-symbol.png";

/* ── Animated counter (intersection-based) ── */
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
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return { count, ref };
}

/* ── CSS-only sparkle field (no React re-renders) ── */
const SparkleField = memo(() => {
  const sparkles = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 2 + 2,
      delay: Math.random() * 4,
      color: ["hsl(51,100%,50%)", "hsl(45,100%,60%)", "hsl(190,100%,60%)"][i % 3],
    }))
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {sparkles.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full animate-pulse"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            backgroundColor: s.color,
            boxShadow: `0 0 ${s.size * 3}px ${s.color}`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  );
});
SparkleField.displayName = "SparkleField";

/* ── Aurora gradient background (CSS-driven, reduced motion) ── */
const AuroraBackground = memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <div className="absolute inset-0" style={{ background: "#0B0F1A" }} />
    <div
      className="absolute aurora-blob-1"
      style={{
        top: "10%", left: "20%", width: "60%", height: "50%",
        background: "radial-gradient(ellipse at center, hsl(51 100% 50% / 0.06), transparent 60%)",
        filter: "blur(60px)",
      }}
    />
    <div
      className="absolute aurora-blob-2"
      style={{
        top: "30%", right: "10%", width: "50%", height: "45%",
        background: "radial-gradient(ellipse at center, hsl(190 100% 50% / 0.05), transparent 60%)",
        filter: "blur(80px)",
      }}
    />
  </div>
));
AuroraBackground.displayName = "AuroraBackground";

/* ── Typing text effect ── */
const rotatingTexts = ["com Inteligência Artificial", "sem escrever código", "em 5 minutos", "pronto pra Play Store"];

function TypingText({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % rotatingTexts.length), 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.span
      key={index}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {rotatingTexts[index]}
    </motion.span>
  );
}

const AnimatedCounter = memo(() => {
  const { count, ref } = useCountUp(1247, 2200);
  return (
    <p ref={ref} className="text-sm text-muted-foreground">
      🚀 <span className="text-foreground font-bold tabular-nums">{count.toLocaleString("pt-BR")}+</span> empreendedores já criaram seus apps com a Aurora
    </p>
  );
});
AnimatedCounter.displayName = "AnimatedCounter";

const trustBadges = ["Sem precisar programar", "Resultado em 5 min", "Pronto para Play Store"];

const HeroSection = () => {
  return (
    <section
      aria-label="Criar app Android com inteligência artificial"
      className="relative flex items-center justify-center overflow-hidden min-h-[90vh]"
    >
      <AuroraBackground />
      <SparkleField />

      <div className="relative z-10 max-w-[800px] mx-auto px-6 text-center space-y-6 py-24">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-primary">Plataforma #1 em criação de apps com IA</span>
        </div>

        {/* H1 */}
        <h1 className="font-display font-bold leading-[1.08] text-[28px] sm:text-[36px] md:text-[44px] lg:text-[52px] text-foreground">
          Crie seu app Android
          <br />
          <span className="text-gradient-gold">
            <TypingText />
          </span>
        </h1>

        <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
          Transforme qualquer site em aplicativo <strong className="text-foreground">pronto para vender</strong> em minutos.
          A IA faz tudo: app, vídeo, logo e conteúdo.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
          <Link
            to="/auth"
            aria-label="Criar meu app grátis agora"
            className="group relative px-8 py-4 bg-primary text-primary-foreground font-display font-bold rounded-xl text-sm overflow-hidden transition-all duration-300 hover:scale-[1.03] text-center"
          >
            <span className="relative z-10">Criar meu app grátis →</span>
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-yellow-400 to-primary bg-[length:200%_100%] animate-[shimmer_2s_infinite] opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <a
            href="#precos"
            className="px-8 py-4 border border-white/10 text-foreground/80 font-display font-semibold rounded-xl text-sm hover:bg-white/5 hover:border-primary/30 transition-all duration-300 text-center backdrop-blur-sm"
          >
            Ver planos
          </a>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-1 text-sm text-muted-foreground">
          {trustBadges.map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="text-primary">✔</span> {t}
            </span>
          ))}
        </div>

        {/* Social proof */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-xs font-semibold text-primary animate-pulse">⏳ Acesso gratuito por tempo limitado</p>
          <AnimatedCounter />
        </div>

        {/* Symbol */}
        <div className="pt-4 flex justify-center">
          <img
            src={auroraSymbol}
            alt="Aurora Build AI — plataforma de criação de apps Android com inteligência artificial"
            width={280}
            height={280}
            className="w-[160px] sm:w-[200px] md:w-[260px] h-auto object-contain"
            loading="eager"
            fetchPriority="high"
            style={{
              animation: "symbol-glow 3s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
