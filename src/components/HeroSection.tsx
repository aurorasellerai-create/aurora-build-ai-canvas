import { motion } from "framer-motion";
import heroImage from "@/assets/aurora-hero.jpeg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Aurora Build AI"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/70" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 30%, hsl(225 80% 4%) 80%)",
          }}
        />
      </div>

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-aurora-gold"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `particle-drift ${5 + Math.random() * 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: 0.4,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-gradient-gold mb-6 leading-tight"
        >
          Transforme qualquer site em app Android
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
        >
          Crie APK, AAB ou PWA em minutos — sem programar
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button className="px-8 py-4 bg-primary text-primary-foreground font-display font-bold rounded-lg text-lg glow-gold glow-gold-hover transition-all duration-300 hover:scale-105">
            Criar meu app agora
          </button>
          <button className="px-8 py-4 border-2 border-secondary text-secondary font-display font-semibold rounded-lg text-lg hover:bg-secondary/10 transition-all duration-300 glow-cyan">
            Testar grátis
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
