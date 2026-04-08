import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { systemLogger } from "@/hooks/useMonitoring";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  retryCount: number;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    systemLogger.error("system", `Component error: ${error.message}`, {
      stack: error.stack?.slice(0, 500),
      componentStack: info.componentStack?.slice(0, 500),
    });
  }

  handleRetry = () => {
    if (this.state.retryCount >= 2) return;

    systemLogger.info("system", "Auto-retry triggered by user", {
      attempt: this.state.retryCount + 1,
    });

    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < 2;

      return (
        <div className="min-h-[200px] flex items-center justify-center p-8">
          <div className="text-center max-w-md card-aurora p-8">
            <AlertTriangle className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-display font-bold text-foreground text-lg mb-2">
              {this.props.fallbackMessage || "Estamos ajustando isso para você…"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {canRetry
                ? "Tente novamente em instantes."
                : "Nosso time já foi notificado e está trabalhando na correção."}
            </p>
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
