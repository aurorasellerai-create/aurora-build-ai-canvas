import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Download, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const InstallBanner = () => {
  const { canInstall, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-4 pb-4"
      >
        <div className="flex items-center gap-3 rounded-xl bg-card/95 backdrop-blur-md border border-border/60 p-3.5 shadow-lg shadow-black/30">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <Download size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-display font-bold text-foreground leading-tight">Instalar Aurora</p>
            <p className="text-xs text-muted-foreground mt-0.5">Acesse rápido pela tela inicial</p>
          </div>
          <button
            onClick={install}
            className="flex-shrink-0 px-4 py-2 text-xs font-display font-bold rounded-lg bg-primary text-primary-foreground glow-gold transition-transform hover:scale-[1.03]"
          >
            Instalar
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallBanner;
