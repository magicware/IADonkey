import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
    try {
      window.electronAPI?.recordCrash?.(
        this.props.fallbackTitle || 'Chyba vykreslení komponenty (React ErrorBoundary)',
        error,
        { componentStack: errorInfo?.componentStack }
      );
    } catch {}
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-[#0e0f12] text-gray-200 select-none">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-2xl">error_outline</span>
          </div>
          <h2 className="text-base font-semibold text-white mb-2">
            Něco se pokazilo při vykreslování
          </h2>
          <p className="text-xs text-gray-400 max-w-md mb-4 leading-relaxed">
            Došlo k neočekávané chybě v uživatelském rozhraní. Chyba byla automaticky zaznamenána do crashlogu.
          </p>
          <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-left max-w-lg w-full mb-6 overflow-x-auto text-[11px] font-mono text-rose-300">
            {this.state.error?.message || 'Neznámá chyba'}
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Obnovit zobrazení
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
