import { Loader2 } from "lucide-react";

type GenerationRetryButtonProps = {
  loading: boolean;
  onRetry: () => void;
};

const GenerationRetryButton = ({ loading, onRetry }: GenerationRetryButtonProps) => (
  <button
    type="button"
    onClick={onRetry}
    disabled={loading}
    className="w-full rounded-lg border border-destructive/30 bg-background/40 px-3 py-2 text-sm font-bold text-foreground transition hover:border-destructive/60 disabled:opacity-50 flex items-center justify-center gap-2"
  >
    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
    Tentar novamente
  </button>
);

export default GenerationRetryButton;