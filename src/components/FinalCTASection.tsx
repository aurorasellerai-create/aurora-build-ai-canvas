import { motion } from "framer-motion";
import { Link } from "react-router-dom";

/* ── Animated gradient background ── */
function GradientAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <motion.div
        animate={{
          background: [
            "radial-gradient(ellipse 80% 50% at 30% 50%, hsl(51 100% 50% / 0.08), transparent 70%)",
            "radial-gradient(ellipse 80% 50% at 70% 50%, hsl(190 100% 50% / 0.06), transparent 70%)",
            "radial-gradient(ellipse 80% 50% at 50% 30%, hsl(51 100% 50% / 0.08), transparent 70%)",
            "radial-gradient(ellipse 80% 50% at 30% 50%, hsl(51 100% 50% / 0.08), transparent 70%)",
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0"
      />

      {/* Pulsing orbs */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(51 100% 50% / 0.1), transparent 60%)",
          filter: "blur(40px)",
        }}
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/4 right-1/4 w-40 h-40 rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(190 100% 50% / 0.08), transparent 60%)",
          filter: "blur(50px)",
        }}
      />
    </div>
  );
}

const FinalCTASection = () => (
  <section className="py-24 px-4 relative overflow-hidden" aria-label="Comece a criar seu app agora">
    <GradientAnimation />

    {/* Border top glow */}
    <div
      className="absolute top-0 left-[10%] right-[10%] h-px pointer-events-none"
      style={{
        background: "linear-gradient(90deg, transparent, hsl(51 100% 50% / 0.3), transparent)",
      }}
    />

    <div className="max-w-2xl mx-auto text-center relative z-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="inline-block px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-medium text-primary mb-6"
        >
          Não fique para trás
        </motion.span>

        <h2 className="text-2xl md:text-4xl font-display font-bold text-foreground mb-4 leading-tight">
          Enquanto você pensa,
          <br />
          <span className="text-gradient-gold">outros já estão faturando.</span>
        </h2>

        <p className="text-muted-foreground mb-8 text-lg">
          Mais de <span className="text-foreground font-bold">1.200 empreendedores</span> já criaram seus apps com a Aurora.
          <br />
          Seu app pode estar pronto em 5 minutos.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="space-y-5"
      >
        <Link
          to="/auth"
          aria-label="Criar meu app grátis agora"
          className="group relative inline-flex items-center gap-2 px-12 py-5 bg-primary text-primary-foreground font-display font-bold rounded-2xl text-lg overflow-hidden transition-all duration-300 hover:scale-[1.04]"
        >
          <span className="relative z-10">Criar meu app grátis →</span>

          {/* Shimmer effect */}
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
            className="absolute inset-0 w-1/3"
            style={{
              background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.2), transparent)",
            }}
          />
        </Link>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            ✅ Sem cartão de crédito · Cancele quando quiser
          </p>
          <motion.p
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xs font-semibold text-primary"
          >
            ⚠️ Oferta gratuita pode sair do ar a qualquer momento
          </motion.p>
        </div>
      </motion.div>
    </div>
  </section>
);

export default FinalCTASection;
