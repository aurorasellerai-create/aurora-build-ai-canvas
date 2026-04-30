import { Loader2 } from "lucide-react";

type GenerationRetryButtonProps = {
  loading: boolean;
  lastError?: string;
  onRetry: () => void;
};

const getErrorSummary = (message?: string) => {
  if (!message) return "A última tentativa falhou. Revise os dados antes de reenviar.";
  const [summary] = message.split(/[.!?]/).filter(Boolean);
  return summary?.trim() || message;
};

const GenerationRetryButton = ({ loading, lastError, onRetry }: GenerationRetryButtonProps) => (
  <div className="space-y-2 rounded-lg border border-destructive/20 bg-background/30 p-3">
    <p className="text-xs text-muted-foreground">
      <span className="font-bold text-foreground">Último erro:</span> {getErrorSummary(lastError)}
    </p>
    <button
      type="button"
      onClick={onRetry}
      disabled={loading}
      className="w-full rounded-lg border border-destructive/30 bg-background/40 px-3 py-2 text-sm font-bold text-foreground transition hover:border-destructive/60 disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      Tentar novamente
    </button>
  </div>
);

export default GenerationRetryButton;