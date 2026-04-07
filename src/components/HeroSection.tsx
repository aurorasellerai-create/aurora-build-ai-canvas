import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import auroraSymbol from "@/assets/aurora-symbol.png";

const HeroSection = () => {
  return (
    <section
      className="relative flex items-center justify-center overflow-hidden"
      style={{ paddingTop: 100, paddingBottom: 100 }}
    >
      {/* Clean gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, #0B0F1A 0%, #0E1A2B 50%, #0B0F1A 100%)",
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
        <h1 className="font-display font-bold leading-[1.15] text-[26px] sm:text-[34px] md:text-[42px] lg:text-[48px] text-foreground">
          Crie um app que gera vendas todos os dias
          <br />
          <span className="text-gradient-gold">— sem programar</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto">
          Sem código, sem complicação — sua renda digital pronta em minutos
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center">
          <Link
            to="/auth"
            className="px-8 py-3.5 bg-primary text-primary-foreground font-display font-bold rounded-lg text-sm glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.03] text-center"
          >
            Quero criar meu app e começar a ganhar
          </Link>
          <Link
            to="/auth"
            className="px-8 py-3.5 border-2 border-secondary text-secondary font-display font-semibold rounded-lg text-sm hover:bg-secondary/10 transition-all duration-300 text-center"
          >
            Testar grátis
          </Link>
        </div>

        {/* Redução de objeção */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="text-secondary">✔</span> Sem precisar aparecer</span>
          <span className="flex items-center gap-1.5"><span className="text-secondary">✔</span> Sem estoque</span>
          <span className="flex items-center gap-1.5"><span className="text-secondary">✔</span> Sem experiência</span>
        </div>

        {/* Urgência + Prova social */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-xs font-semibold text-primary animate-pulse">🔥 Acesso gratuito por tempo limitado</p>
          <p className="text-xs text-muted-foreground">+1.000 apps criados com a Aurora</p>
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
            className="w-[260px] sm:w-[340px] md:w-[420px] lg:w-[500px] h-auto object-contain"
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
