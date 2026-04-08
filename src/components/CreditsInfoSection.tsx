import { motion } from "framer-motion";
import { Coins, Sparkles, Languages, Image, Eraser, PenTool, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const usages = [
  { icon: Sparkles, label: "Gerar aplicativo", cost: 3 },
  { icon: PenTool, label: "Criar copy / descrição", cost: 1 },
  { icon: Languages, label: "Traduzir conteúdo", cost: 1 },
  { icon: Image, label: "Gerar imagens / ícones", cost: 1 },
  { icon: Eraser, label: "Remover fundo de imagem", cost: 1 },
  { icon: PenTool, label: "Criar logo", cost: 1 },
];

const CreditsInfoSection = () => (
  <section className="py-20 px-4" id="creditos">
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <span className="text-3xl mb-4 block">💰</span>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-gradient-gold mb-3">
          Sistema de Créditos
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Pague apenas pelo que usar dentro da IA. Cada ação consome créditos do seu saldo.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {usages.map((u, i) => (
          <motion.div
            key={u.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="card-aurora flex items-center gap-4 group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <u.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{u.label}</p>
            </div>
            <span className="text-xs font-display font-bold text-primary bg-primary/10 px-2 py-1 rounded-full whitespace-nowrap">
              {u.cost} {u.cost === 1 ? "crédito" : "créditos"}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center"
      >
        <Link
          to="/credits"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-display font-bold text-sm hover:scale-105 transition-transform glow-gold"
        >
          <Coins className="w-4 h-4" />
          Comprar créditos
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </div>
  </section>
);

export default CreditsInfoSection;
