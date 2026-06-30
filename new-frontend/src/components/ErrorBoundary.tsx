import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw, Home, Bug } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

function generateErrorId(): string {
  return `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorId: generateErrorId() };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    if (this.state.errorId) {
      fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorId: this.state.errorId,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="font-display text-xl font-semibold text-text-primary mb-2">Something went wrong</h2>
            <p className="text-sm text-text-secondary mb-2">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            {this.state.errorId && (
              <p className="text-[10px] text-text-muted mb-6 font-mono">
                Error ID: {this.state.errorId}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
              >
                <RefreshCw className="h-4 w-4" /> Try again
              </button>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
              >
                <Home className="h-4 w-4" /> Dashboard
              </Link>
            </div>
            <button
              onClick={() => {
                const body = `Error ID: ${this.state.errorId}\nMessage: ${this.state.error?.message}\nStack: ${this.state.error?.stack}`;
                navigator.clipboard?.writeText(body);
              }}
              className="mt-4 inline-flex items-center gap-1.5 text-[10px] text-text-muted hover:text-text-secondary transition-colors"
            >
              <Bug className="h-3 w-3" />
              Copy error details
            </button>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
