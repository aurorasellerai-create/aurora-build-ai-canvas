import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";

const steps = [
  { at: 0, text: "Analisando o site..." },
  { at: 20, text: "Verificando estrutura..." },
  { at: 40, text: "Construindo o app..." },
  { at: 60, text: "Compilando arquivos..." },
  { at: 80, text: "Otimizando performance..." },
  { at: 95, text: "Finalizando!" },
];

const Processing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const currentStep = [...steps].reverse().find((s) => progress >= s.at)?.text || steps[0].text;

  useEffect(() => {
    // Random duration between 5-10 seconds
    const totalMs = 5000 + Math.random() * 5000;
    const tick = 100;
    const increment = 100 / (totalMs / tick);

    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + increment, 100);
          if (next >= 100) {
            clearInterval(intervalRef.current);
            // Update project in DB — fetch actual format first
            supabase
              .from("projects")
              .select("format")
              .eq("id", id!)
              .single()
              .then(({ data: proj }) => {
                const ext = proj?.format === "pwa" ? "zip" : (proj?.format || "apk");
                return supabase
                  .from("projects")
                  .update({
                    status: "completed" as const,
                    progress: 100,
                    download_url: `https://aurora-build-ai.app/downloads/${id}.${ext}`,
                  })
                  .eq("id", id!);
              })
              .then(() => setDone(true));
        }
        return next;
      });
    }, tick);

    return () => clearInterval(intervalRef.current);
  }, [id]);

  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => navigate(`/project/${id}`), 1500);
      return () => clearTimeout(timer);
    }
  }, [done, id, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-aurora w-full max-w-md text-center space-y-8"
      >
        {done ? (
          <CheckCircle2 className="w-20 h-20 text-secondary mx-auto" />
        ) : (
          <Loader2 className="w-20 h-20 text-primary mx-auto animate-spin" />
        )}

        <div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            {done ? "App pronto!" : "Gerando seu app..."}
          </h2>
          <p className="text-muted-foreground text-sm">{done ? "Redirecionando..." : currentStep}</p>
        </div>

        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, hsl(190 100% 50%), hsl(51 100% 50%))",
            }}
            animate={{ width: `${Math.round(progress)}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        <p className="font-display text-lg font-bold text-primary">{Math.round(progress)}%</p>
        {!done && (
          <p className="text-muted-foreground text-xs">
            Tempo estimado: ~{Math.max(1, Math.ceil((100 - progress) / 15))}s
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default Processing;
