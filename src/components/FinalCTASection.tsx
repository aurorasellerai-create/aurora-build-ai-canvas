import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const FinalCTASection = () => (
  <section className="py-20 px-4 bg-aurora-gradient">
    <div className="max-w-2xl mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4"
      >
        Você pode continuar só pensando…
        <br />
        <span className="text-gradient-gold">ou começar hoje e ver resultado</span>
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="space-y-4 pt-4"
      >
        <Link
          to="/auth"
          className="inline-block px-10 py-4 bg-primary text-primary-foreground font-display font-bold rounded-lg text-base glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.04]"
        >
          Começar agora
        </Link>
        <p className="text-xs text-muted-foreground animate-pulse">
          ⚠️ Oferta pode sair do ar a qualquer momento
        </p>
      </motion.div>
    </div>
  </section>
);

export default FinalCTASection;
