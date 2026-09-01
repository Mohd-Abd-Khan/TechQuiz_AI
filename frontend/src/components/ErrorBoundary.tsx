import React, { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary — catches any unhandled render/lifecycle errors
 * in the subtree and displays a graceful fallback instead of a blank screen.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught unhandled render error:', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen gradient-bg flex items-center justify-center text-white px-6">
          <div className="max-w-md w-full glass-card p-8 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-red-500/10 rounded-full border border-red-500/20 mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Something Went Wrong</h2>
            <p className="text-gray-400 text-sm mb-1">An unexpected error occurred in the application.</p>
            {this.state.error?.message && (
              <p className="text-red-400/80 text-xs font-mono bg-red-500/5 border border-red-500/10 rounded-lg p-3 mb-6 text-left break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                id="error-boundary-retry"
                onClick={this.handleReset}
                className="btn-primary py-2.5 px-5 text-sm"
              >
                Try Again
              </button>
              <button
                id="error-boundary-reload"
                onClick={() => window.location.href = '/dashboard'}
                className="btn-secondary py-2.5 px-5 text-sm"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
