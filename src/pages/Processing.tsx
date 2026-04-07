import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const Processing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("Analisando o site...");

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          // Simulate completion
          supabase
            .from("projects")
            .update({ status: "completed", progress: 100 })
            .eq("id", id!)
            .then(() => {
              setTimeout(() => navigate(`/project/${id}`), 1000);
            });
          return 100;
        }
        const next = p + 1;
        if (next < 25) setStep("Analisando o site...");
        else if (next < 50) setStep("Construindo estrutura...");
        else if (next < 75) setStep("Compilando o app...");
        else if (next < 95) setStep("Otimizando...");
        else setStep("Finalizando!");
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [id, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-aurora w-full max-w-md text-center space-y-8"
      >
        <Loader2 className="w-20 h-20 text-primary mx-auto animate-spin" />

        <div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Gerando seu app...</h2>
          <p className="text-muted-foreground text-sm">{step}</p>
        </div>

        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, hsl(190 100% 50%), hsl(51 100% 50%))",
              width: `${progress}%`,
            }}
          />
        </div>

        <p className="font-display text-lg font-bold text-primary">{progress}%</p>
        <p className="text-muted-foreground text-xs">Tempo estimado: ~{Math.max(1, Math.ceil((100 - progress) / 10))} segundos</p>
      </motion.div>
    </div>
  );
};

export default Processing;
