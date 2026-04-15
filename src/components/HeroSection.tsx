import { useEffect, useState, useRef, useCallback } from "react";
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

/* ── Sparkle particles ── */
interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  color: string;
}

const SPARKLE_COLORS = [
  "hsl(51, 100%, 50%)",   // gold
  "hsl(45, 100%, 60%)",   // warm gold
  "hsl(190, 100%, 60%)",  // cyan
  "hsl(200, 100%, 70%)",  // light cyan
  "hsl(51, 80%, 80%)",    // pale gold
];

function SparkleField() {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const nextId = useRef(0);

  const createSparkle = useCallback((): Sparkle => {
    return {
      id: nextId.current++,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.7 + 0.3,
      duration: Math.random() * 2 + 1.5,
      delay: Math.random() * 3,
      color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
    };
  }, []);

  useEffect(() => {
    const initial = Array.from({ length: 40 }, createSparkle);
    setSparkles(initial);

    const interval = setInterval(() => {
      setSparkles((prev) => {
        const updated = prev.filter(() => Math.random() > 0.08);
        while (updated.length < 40) updated.push(createSparkle());
        return updated;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [createSparkle]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, s.opacity, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            repeatDelay: Math.random() * 2,
          }}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            backgroundColor: s.color,
            boxShadow: `0 0 ${s.size * 3}px ${s.color}`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Aurora gradient background ── */
function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Base dark */}
      <div className="absolute inset-0" style={{ background: "#0B0F1A" }} />

      {/* Aurora blobs */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -20, 15, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute"
        style={{
          top: "10%",
          left: "20%",
          width: "60%",
          height: "50%",
          background: "radial-gradient(ellipse at center, hsl(51 100% 50% / 0.06), transparent 60%)",
          filter: "blur(60px)",
        }}
      />
      <motion.div
        animate={{
          x: [0, -25, 15, 0],
          y: [0, 15, -25, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute"
        style={{
          top: "30%",
          right: "10%",
          width: "50%",
          height: "45%",
          background: "radial-gradient(ellipse at center, hsl(190 100% 50% / 0.05), transparent 60%)",
          filter: "blur(80px)",
        }}
      />
      <motion.div
        animate={{
          x: [0, 20, -15, 0],
          y: [0, -10, 20, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute"
        style={{
          bottom: "0%",
          left: "30%",
          width: "40%",
          height: "40%",
          background: "radial-gradient(ellipse at center, hsl(45 100% 50% / 0.04), transparent 60%)",
          filter: "blur(70px)",
        }}
      />
    </div>
  );
}

/* ── Typing text effect ── */
function TypingText({ texts, className }: { texts: string[]; className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % texts.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [texts.length]);

  return (
    <motion.span
      key={index}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {texts[index]}
    </motion.span>
  );
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
      className="relative flex items-center justify-center overflow-hidden min-h-[90vh]"
    >
      <AuroraBackground />
      <SparkleField />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 max-w-[800px] mx-auto px-6 text-center space-y-6 py-24"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-primary">Plataforma #1 em criação de apps com IA</span>
        </motion.div>

        {/* H1 */}
        <h1 className="font-display font-bold leading-[1.08] text-[28px] sm:text-[36px] md:text-[44px] lg:text-[52px] text-foreground">
          Crie seu app Android
          <br />
          <span className="text-gradient-gold">
            <TypingText
              texts={["com Inteligência Artificial", "sem escrever código", "em 5 minutos", "pronto pra Play Store"]}
            />
          </span>
        </h1>

        <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
          Transforme qualquer site em aplicativo <strong className="text-foreground">pronto para vender</strong> em minutos.
          A IA faz tudo: app, vídeo, logo e conteúdo.
        </p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 pt-2 justify-center"
        >
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
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-1 text-sm text-muted-foreground"
        >
          {["Sem precisar programar", "Resultado em 5 min", "Pronto para Play Store"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="text-primary">✔</span> {t}
            </span>
          ))}
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col items-center gap-2 pt-2"
        >
          <p className="text-xs font-semibold text-primary animate-pulse">⏳ Acesso gratuito por tempo limitado</p>
          <AnimatedCounter />
        </motion.div>

        {/* Symbol */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="pt-4 flex justify-center"
        >
          <img
            src={auroraSymbol}
            alt="Aurora Build AI"
            width={280}
            height={280}
            className="w-[160px] sm:w-[200px] md:w-[260px] h-auto object-contain"
            loading="eager"
            style={{
              filter: "drop-shadow(0 0 20px hsl(51 100% 50% / 0.35)) drop-shadow(0 0 40px hsl(190 100% 50% / 0.2))",
              animation: "symbol-pulse 3s ease-in-out infinite",
            }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
