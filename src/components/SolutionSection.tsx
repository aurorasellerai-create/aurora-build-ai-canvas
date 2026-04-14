import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const steps = [
  { number: "01", title: "Cole a URL do seu site", desc: "Ou descreva sua ideia — a IA entende o que você precisa." },
  { number: "02", title: "A IA cria seu app", desc: "Em minutos, seu aplicativo Android fica pronto automaticamente." },
  { number: "03", title: "Exporte e publique", desc: "Baixe em APK, AAB ou PWA e publique na Play Store." },
];

const SolutionSection = () => (
  <section className="py-16 px-4 bg-aurora-gradient" aria-label="Como criar app com a Aurora">
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-display font-bold text-gradient-gold mb-3">
          Como funciona: 3 passos para criar seu app
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Simples assim. Sem código, sem espera, sem complicação.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {steps.map((step, i) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
            className="card-aurora text-center relative"
          >
            <span className="text-4xl font-display font-black text-primary/20 absolute top-3 right-4">{step.number}</span>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">{step.title}</h3>
            <p className="text-muted-foreground text-sm">{step.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Mid-page CTA */}
      <div className="text-center">
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold glow-gold-hover transition-all hover:scale-105"
        >
          Criar meu app agora <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  </section>
);

export default SolutionSection;
