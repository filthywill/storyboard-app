import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    // This simple reset attempts to re-render the children.
    // A more robust solution might involve clearing state or navigating.
    this.setState({ hasError: false, error: undefined });
    // Or force a page reload for a hard reset.
    // window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <Card className="w-full max-w-lg text-center shadow-lg border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                <AlertTriangle size={24} />
                Something Went Wrong
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                An unexpected error occurred. You can try to recover by clicking the button below.
              </p>
              {import.meta.env.DEV && this.state.error && (
                <details className="bg-muted p-3 rounded-lg text-left mb-4">
                  <summary className="cursor-pointer font-medium text-sm">
                    Error Details
                  </summary>
                  <pre className="text-xs bg-background p-2 rounded overflow-x-auto mt-2">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              <Button onClick={() => window.location.reload()} variant="destructive">
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 