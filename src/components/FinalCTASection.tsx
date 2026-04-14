import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const FinalCTASection = () => (
  <section className="py-20 px-4 bg-aurora-gradient" aria-label="Comece a criar seu app agora">
    <div className="max-w-2xl mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3"
      >
        Enquanto você pensa, outros já estão faturando.
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-muted-foreground mb-6"
      >
        Mais de 1.200 empreendedores já criaram seus apps com a Aurora.
        <br />
        <span className="text-gradient-gold font-bold">Seu app pode estar pronto em 5 minutos.</span>
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="space-y-4 pt-2"
      >
        <Link
          to="/auth"
          aria-label="Criar meu app grátis agora"
          className="inline-block px-10 py-4 bg-primary text-primary-foreground font-display font-bold rounded-lg text-base glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.04]"
        >
          Criar meu app grátis →
        </Link>
        <p className="text-xs text-muted-foreground">
          ✅ Sem cartão de crédito · Cancele quando quiser
        </p>
        <p className="text-xs font-semibold text-primary animate-pulse">
          ⚠️ Oferta gratuita pode sair do ar a qualquer momento
        </p>
      </motion.div>
    </div>
  </section>
);

export default FinalCTASection;
