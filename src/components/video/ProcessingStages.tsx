import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Check } from "lucide-react";

const STAGES = [
  { icon: "🔄", label: "Criando roteiro..." },
  { icon: "🎬", label: "Gerando cenas..." },
  { icon: "🎨", label: "Aplicando estilo..." },
  { icon: "🎵", label: "Gerando áudio e voz..." },
  { icon: "📦", label: "Finalizando..." },
];

interface Props {
  active: boolean;
  onCancel?: () => void;
  onEditPrompt?: () => void;
}

const ProcessingStages = ({ active, onCancel, onEditPrompt }: Props) => {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [notify, setNotify] = useState(false);

  useEffect(() => {
    if (!active) { setStage(0); setProgress(0); return; }
    const totalMs = 12000; // simulated
    const start = Date.now();
    const id = setInterval(() => {
      const pct = Math.min(98, ((Date.now() - start) / totalMs) * 100);
      setProgress(pct);
      setStage(Math.min(STAGES.length - 1, Math.floor((pct / 100) * STAGES.length)));
    }, 200);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-5 rounded-xl bg-muted/40 border border-border"
    >
      <div className="space-y-2">
        {STAGES.map((s, i) => {
          const done = i < stage;
          const current = i === stage;
          return (
            <div key={i} className={`flex items-center gap-3 text-sm transition-opacity ${i > stage ? "opacity-40" : "opacity-100"}`}>
              <span className="w-6 h-6 flex items-center justify-center">
                {done ? (
                  <Check className="w-4 h-4 text-secondary" />
                ) : current ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <span className="text-base">{s.icon}</span>
                )}
              </span>
              <span className={current ? "text-foreground font-medium" : "text-muted-foreground"}>{s.label}</span>
            </div>
          );
        })}
      </div>

      <div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-secondary"
            animate={{ width: `${progress}%` }}
            transition={{ ease: "linear", duration: 0.2 }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
          <span>{Math.round(progress)}%</span>
          <span>⏱️ 30 a 90 segundos</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Seu vídeo está sendo criado com IA. Você poderá continuar, expandir ou gerar variações.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setNotify((v) => !v)}
          className={`flex-1 min-w-[120px] py-2 rounded-lg text-xs font-medium border transition ${
            notify ? "bg-secondary/10 border-secondary text-secondary" : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          🔔 {notify ? "Aviso ativado" : "Avisar quando pronto"}
        </button>
        {onEditPrompt && (
          <button onClick={onEditPrompt} className="flex-1 min-w-[100px] py-2 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-muted">
            ✏️ Editar prompt
          </button>
        )}
        {onCancel && (
          <button onClick={onCancel} className="flex-1 min-w-[100px] py-2 rounded-lg text-xs font-medium border border-destructive/40 text-destructive hover:bg-destructive/10">
            ❌ Cancelar
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default ProcessingStages;
