import React, { Component, ReactNode } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';

interface AppErrorBoundaryProps {
  children: ReactNode;
  onReset: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  componentDidMount() {
    // Capture global runtime errors
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    // Clean up event listeners
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  handleWindowError = (event: ErrorEvent) => {
    console.error('Window error caught:', event.error);
    this.setState({
      hasError: true,
      error: event.error || new Error(event.message),
      errorInfo: null,
    });
  };

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled promise rejection caught:', event.reason);
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    this.setState({
      hasError: true,
      error,
      errorInfo: null,
    });
  };

  handleReset = () => {
    // Reset the error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    // Call the parent reset callback to clear app state
    this.props.onReset();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-destructive" />
                <div>
                  <CardTitle className="text-2xl">Something Went Wrong</CardTitle>
                  <CardDescription>
                    The application encountered an unexpected error and needs to recover.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {this.state.error && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-semibold mb-2">Error Details:</p>
                  <p className="text-sm text-muted-foreground font-mono break-all">
                    {this.state.error.message || 'Unknown error'}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You can try to reset the application to continue working, or reload the page to start fresh.
                </p>
                
                <div className="flex gap-3">
                  <Button
                    onClick={this.handleReset}
                    className="flex-1"
                    size="lg"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Application
                  </Button>
                  <Button
                    onClick={this.handleReload}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload Page
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
