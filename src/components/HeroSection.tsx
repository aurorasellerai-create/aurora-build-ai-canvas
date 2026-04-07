import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import auroraSymbol from "@/assets/aurora-symbol.png";

const HeroSection = () => {
  return (
    <section
      className="relative flex items-center justify-center overflow-hidden"
      style={{ paddingTop: 100, paddingBottom: 100 }}
    >
      {/* Background image – blurred & faded */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/aurora-hero-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(6px)",
          opacity: 0.25,
          transform: "scale(1.05)",
        }}
      />
      {/* Dark overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(5,8,22,0.9) 0%, rgba(13,27,61,0.85) 100%)",
        }}
      />
      {/* Subtle radial glow */}
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
        className="relative z-10 max-w-[700px] mx-auto px-6 text-center space-y-6"
      >
        <h1 className="font-display font-bold leading-[1.15] text-[28px] sm:text-[36px] md:text-[44px] lg:text-[48px] text-foreground">
          Transforme qualquer site
          <br />
          <span className="text-foreground">em </span>
          <span className="text-gradient-gold">app Android</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto">
          Crie APK, AAB ou PWA em minutos — sem programar
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center">
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

        {/* Aurora Symbol */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="pt-10 flex justify-center"
        >
          <img
            src={auroraSymbol}
            alt="Aurora Build AI"
            className="w-[200px] sm:w-[280px] md:w-[340px] lg:w-[400px] h-auto object-contain"
            style={{
              filter:
                "drop-shadow(0 0 20px hsl(51 100% 50% / 0.35)) drop-shadow(0 0 40px hsl(190 100% 50% / 0.2))",
              animation: "symbol-pulse 3s ease-in-out infinite",
            }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
