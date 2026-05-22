import { Component, lazy, Suspense, type ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConversionJobLike {
  status?: string | null;
  [key: string]: unknown;
}

interface SafeBuildPipelineViewProps {
  job: ConversionJobLike;
  formatLabel: string;
  packageName: string;
  onCancel?: () => unknown | Promise<unknown>;
  onRetry?: () => unknown | Promise<unknown>;
}


// Lazy import isolates resolution errors from the parent bundle.
// If the chunk fails to load (missing file, network error, build mismatch),
// the ErrorBoundary below renders a friendly placeholder instead of crashing.
const LazyBuildPipelineView = lazy(() =>
  import("./BuildPipelineView").catch((err) => {
    console.error("[SafeBuildPipelineView] Falha ao carregar BuildPipelineView:", err);
    return {
      default: () => <PipelineUnavailable reason="module-not-found" />,
    };
  })
);

function PipelineUnavailable({ reason }: { reason: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-6 text-center"
    >
      <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-yellow-400" aria-hidden />
      <h3 className="mb-1 text-lg font-semibold text-yellow-200">
        Visualização do pipeline indisponível
      </h3>
      <p className="text-sm text-yellow-100/80">
        Não foi possível carregar o painel de etapas da conversão no momento.
        Sua conversão continua em andamento normalmente em segundo plano.
      </p>
      <p className="mt-2 text-xs text-yellow-100/50">
        Atualize a página em alguns instantes. (motivo: {reason})
      </p>
    </div>
  );
}

function PipelineLoading() {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-border bg-card/40 p-6 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span className="text-sm">Carregando pipeline de build...</span>
    </div>
  );
}

interface BoundaryState {
  hasError: boolean;
}

class PipelineErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[SafeBuildPipelineView] Render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return <PipelineUnavailable reason="render-error" />;
    }
    return this.props.children;
  }
}

export default function SafeBuildPipelineView(props: SafeBuildPipelineViewProps) {
  return (
    <PipelineErrorBoundary>
      <Suspense fallback={<PipelineLoading />}>
        <LazyBuildPipelineView {...(props as any)} />
      </Suspense>
    </PipelineErrorBoundary>
  );
}
