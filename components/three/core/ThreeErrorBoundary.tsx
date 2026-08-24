import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
  title?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMsg: string;
}

export class ThreeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMsg: error?.message || 'Error de renderizado 3D' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ThreeJS 3D Scene Error Caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-slate-950 p-6 text-center text-amber-200 font-serif">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-xl font-bold mb-2 text-amber-400">
            {this.props.title || 'Restablecimiento de Escena 3D'}
          </h2>
          <p className="text-sm text-slate-400 max-w-md mb-2">
            Ocurrió un evento en el motor WebGL 3D:
          </p>
          <p className="text-xs text-amber-300/80 font-mono bg-slate-900 px-3 py-1.5 rounded border border-amber-500/20 max-w-lg mb-6 truncate">
            {this.state.hasError ? this.state.errorMsg : ''}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, errorMsg: '' });
              if (this.props.onReset) this.props.onReset();
            }}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-sans font-bold rounded-lg shadow-lg transition-all"
          >
            🔄 Reiniciar Renderizador 3D
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
