import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Crown } from "lucide-react";

interface UpsellPromptProps {
  balance: number;
  type?: "post-generation" | "no-credits";
}

const UpsellPrompt = ({ balance, type = "post-generation" }: UpsellPromptProps) => {
  if (type === "no-credits" || balance === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-3 text-center"
      >
        <p className="text-sm font-semibold text-foreground">
          Você precisa de créditos para continuar
        </p>
        <p className="text-xs text-muted-foreground">
          Adicione créditos para continuar criando com IA
        </p>
        <div className="flex gap-2 justify-center">
          <Link
            to="/credits"
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg glow-gold transition hover:scale-105 flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4" /> Comprar créditos
          </Link>
          <Link
            to="/pricing"
            className="px-4 py-2 border border-border text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
          >
            <Crown className="w-4 h-4" /> Assinar plano
          </Link>
        </div>
      </motion.div>
    );
  }

  if (balance <= 5) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-center space-y-2"
      >
        <p className="text-xs text-muted-foreground">
          ⚡ Seus créditos estão acabando — <span className="text-foreground font-semibold">restam {balance}</span>
        </p>
        <Link to="/credits" className="text-xs text-primary font-bold hover:underline">
          Adicionar créditos →
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-2"
    >
      <p className="text-xs text-muted-foreground">
        ✅ Conteúdo gerado! <Link to="/credits" className="text-primary font-semibold hover:underline">Quer criar mais?</Link>
      </p>
    </motion.div>
  );
};

export default UpsellPrompt;
