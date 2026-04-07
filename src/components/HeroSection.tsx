import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import heroImage from "@/assets/aurora-hero.jpeg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image with strong overlay */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Aurora Build AI"
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(5,8,22,0.92) 0%, rgba(5,8,22,0.85) 50%, rgba(5,8,22,0.5) 100%)",
          }}
        />
      </div>

      {/* Content - two column layout */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-8"
          >
            <h1 className="font-display font-bold leading-tight text-[28px] sm:text-[36px] md:text-[48px] lg:text-[56px]">
              <span className="text-foreground">Transforme qualquer site</span>
              <br />
              <span className="text-foreground">em </span>
              <span className="text-gradient-gold">app Android</span>
            </h1>

            <p className="text-lg md:text-xl max-w-lg" style={{ color: "#CFCFCF" }}>
              Crie APK, AAB ou PWA em minutos — sem programar
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                to="/auth"
                className="px-8 py-4 bg-primary text-primary-foreground font-display font-bold rounded-lg text-base glow-gold glow-gold-hover transition-all duration-300 hover:scale-105 text-center"
              >
                Criar meu app agora
              </Link>
              <Link
                to="/auth"
                className="px-8 py-4 border-2 border-secondary text-secondary font-display font-semibold rounded-lg text-base hover:bg-secondary/10 transition-all duration-300 text-center"
              >
                Testar grátis
              </Link>
            </div>
          </motion.div>

          {/* Right - visible on lg+ as decorative space where image shows through */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:block"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
