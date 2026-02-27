import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-[#050505] rounded-2xl border border-red-900/20 m-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">System Exception</h1>
            <p className="text-zinc-500 text-xs font-bold leading-relaxed">
              The application encountered an unexpected state in the neural buffer. 
              {this.state.error?.message && <span className="block mt-2 text-red-400 font-mono text-[10px] bg-red-500/5 p-2 rounded border border-red-500/10 italic">Error: {this.state.error.message}</span>}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-black text-white uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95"
            >
              <RefreshCcw size={14} className="text-emerald-500" /> Reset Context
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
