import { motion } from "framer-motion";
import { Play, Download, RefreshCw, Plus, Edit3, Music, Sparkles, Video } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  enhancedPrompt: string;
  onContinue: () => void;
  onVariation: () => void;
  onEdit: () => void;
  continueLoading?: boolean;
  variationLoading?: boolean;
  hasMusic?: boolean;
}

const VideoResultPlayer = ({ enhancedPrompt, onContinue, onVariation, onEdit, continueLoading, variationLoading, hasMusic }: Props) => {
  const soon = () => toast({ title: "Em breve", description: "Esta funcionalidade será liberada em breve." });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Player placeholder */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-muted via-background to-muted border border-border flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.15),transparent_70%)]" />
        <div className="relative text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-7 h-7 text-primary ml-1" fill="currentColor" />
          </div>
          <p className="text-foreground text-sm font-display font-bold">Preview do vídeo</p>
          <p className="text-muted-foreground text-xs px-4">Em breve: renderização de vídeo real integrada</p>
        </div>
      </div>

      {/* Prompt otimizado */}
      <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
        <p className="text-sm font-semibold text-secondary mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Roteiro otimizado pela IA
        </p>
        <p className="text-foreground text-sm whitespace-pre-wrap">{enhancedPrompt}</p>
      </div>

      {/* Ações principais */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={soon} className="py-3 rounded-lg bg-primary text-primary-foreground font-display font-bold text-sm glow-gold flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Baixar vídeo
        </button>
        <button onClick={soon} className="py-3 rounded-lg bg-muted text-foreground border border-border font-display font-bold text-sm hover:border-secondary transition flex items-center justify-center gap-2">
          <Play className="w-4 h-4" /> Reproduzir
        </button>
      </div>

      {/* Ações secundárias */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onVariation}
          disabled={variationLoading}
          className="py-2.5 rounded-lg bg-muted text-foreground border border-border font-medium text-xs hover:border-secondary transition disabled:opacity-50 flex flex-col items-center justify-center gap-1"
        >
          <RefreshCw className={`w-4 h-4 ${variationLoading ? "animate-spin" : ""}`} />
          Gerar variação
        </button>
        <button
          onClick={onContinue}
          disabled={continueLoading}
          className="py-2.5 rounded-lg bg-muted text-foreground border border-border font-medium text-xs hover:border-secondary transition disabled:opacity-50 flex flex-col items-center justify-center gap-1"
        >
          <Plus className={`w-4 h-4 ${continueLoading ? "animate-spin" : ""}`} />
          Continuar história
        </button>
        <button
          onClick={onEdit}
          className="py-2.5 rounded-lg bg-muted text-foreground border border-border font-medium text-xs hover:border-secondary transition flex flex-col items-center justify-center gap-1"
        >
          <Edit3 className="w-4 h-4" />
          Editar e gerar
        </button>
      </div>

      {hasMusic && (
        <div className="p-3 rounded-lg bg-muted/40 border border-border">
          <p className="text-xs font-semibold text-foreground flex items-center gap-2 mb-2">
            <Music className="w-3.5 h-3.5 text-primary" /> Trilha sonora
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={soon} className="py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted">🎵 Baixar (MP3)</button>
            <button onClick={soon} className="py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted">🎧 Spotify (em breve)</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default VideoResultPlayer;
