import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-900 p-6">
          <div className="max-w-lg w-full bg-white dark:bg-dark-800 rounded-2xl shadow-xl p-8 border border-red-100 dark:border-red-900/20 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
               <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h1>
            <p className="text-slate-500 dark:text-gray-400 mb-6">We encountered an unexpected error. Please try refreshing the page.</p>
            
            <div className="flex gap-3 justify-center">
                <button onClick={() => window.location.reload()} className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2 rounded-lg font-bold transition-colors">Reload Page</button>
                <button onClick={() => this.setState({ hasError: false })} className="bg-slate-200 dark:bg-dark-700 text-slate-700 dark:text-slate-300 px-6 py-2 rounded-lg font-bold transition-colors">Try Again</button>
            </div>
            
            {this.state.error && (
              <details className="mt-6 text-left bg-slate-100 dark:bg-black/30 p-4 rounded-lg border border-slate-200 dark:border-white/5">
                <summary className="text-red-500 font-bold text-xs uppercase cursor-pointer mb-2 select-none">Error Details</summary>
                <pre className="text-[10px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;