import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type UrlHistoryClearButtonProps = {
  onConfirm: () => void;
};

const UrlHistoryClearButton = ({ onConfirm }: UrlHistoryClearButtonProps) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <button type="button" className="text-[11px] font-bold text-muted-foreground transition hover:text-destructive">
        Limpar histórico
      </button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Limpar histórico de URLs?</AlertDialogTitle>
        <AlertDialogDescription>
          As URLs recentes salvas neste dispositivo serão removidas e não aparecerão mais como atalhos nos formulários de geração.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          Limpar histórico
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default UrlHistoryClearButton;