import { Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
  <div className="space-y-3 rounded-lg border border-destructive/20 bg-background/30 p-3">
    <p className="text-xs text-muted-foreground">
      <span className="font-bold text-foreground">Último erro:</span> {getErrorSummary(lastError)}
    </p>
    <Accordion type="single" collapsible className="rounded-md border border-border bg-muted/20 px-3">
      <AccordionItem value="faq-erros" className="border-b-0">
        <AccordionTrigger className="py-2 text-xs font-bold text-foreground hover:no-underline">
          FAQ de erros
        </AccordionTrigger>
        <AccordionContent className="space-y-2 pb-3 text-xs text-muted-foreground">
          <p><span className="font-bold text-foreground">Créditos:</span> confira seu saldo ou compre mais créditos antes de reenviar.</p>
          <p><span className="font-bold text-foreground">URL:</span> confirme se o domínio abre no navegador e usa HTTP ou HTTPS.</p>
          <p><span className="font-bold text-foreground">Sessão:</span> se continuar falhando, saia e entre novamente na conta.</p>
          <p><span className="font-bold text-foreground">Conexão:</span> recarregue a página se houver instabilidade ou timeout.</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
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