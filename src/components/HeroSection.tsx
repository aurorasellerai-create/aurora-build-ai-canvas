import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import heroImage from "@/assets/aurora-hero.jpeg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-background">
      {/* Subtle background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 70% 50%, hsl(190 100% 50% / 0.06), transparent)",
        }}
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-[600px] space-y-6 text-center lg:text-left mx-auto lg:mx-0"
          >
            <h1 className="font-display font-bold leading-[1.15] text-[28px] sm:text-[36px] md:text-[44px] lg:text-[48px] text-foreground">
              Transforme qualquer site
              <br />
              <span className="text-foreground">em </span>
              <span className="text-gradient-gold">app Android</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Crie APK, AAB ou PWA em minutos — sem programar
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
              <Link
                to="/auth"
                className="px-8 py-3.5 bg-primary text-primary-foreground font-display font-bold rounded-lg text-sm glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.03] text-center"
              >
                Criar meu app agora
              </Link>
              <Link
                to="/auth"
                className="px-8 py-3.5 border-2 border-secondary text-secondary font-display font-semibold rounded-lg text-sm hover:bg-secondary/10 transition-all duration-300 text-center"
              >
                Testar grátis
              </Link>
            </div>
          </motion.div>

          {/* Right — Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative flex items-center justify-center"
          >
            <div className="relative w-full max-w-md mx-auto rounded-2xl overflow-hidden border border-border/50 shadow-2xl">
              <img
                src={heroImage}
                alt="Aurora Build AI — plataforma de criação de apps"
                className="w-full h-auto object-cover"
                loading="eager"
              />
              <div
                className="absolute inset-0"
                style={{ background: "rgba(5, 8, 22, 0.35)" }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
