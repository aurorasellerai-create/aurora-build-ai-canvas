import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import auroraSymbol from "@/assets/aurora-symbol.png";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onFinish, 500); // wait for exit animation
    }, 1600);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 45%, #0E1A2B 0%, #0B0F1A 70%, #050816 100%)",
          }}
        >
          <motion.img
            src={auroraSymbol}
            alt="Aurora Build AI"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-[140px] sm:w-[180px] md:w-[220px] h-auto"
            style={{
              filter: "drop-shadow(0 0 24px hsl(51 100% 50% / 0.35)) drop-shadow(0 0 48px hsl(190 100% 50% / 0.15))",
            }}
          />
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.7, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-5 text-sm font-display font-medium tracking-wider text-muted-foreground"
          >
            Aurora Build AI
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
