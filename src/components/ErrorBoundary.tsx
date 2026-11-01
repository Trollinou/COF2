import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('cof2_active_character');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-stone-900 border border-red-900/60 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-red-950/80 border border-red-700/60 flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-serif font-bold text-amber-200">
                Une anomalie critique est survenue
              </h2>
              <p className="text-xs text-stone-400 leading-relaxed">
                Une erreur inattendue a interrompu l'affichage de la fiche. Vos données sauvegardées sur disque restent intactes.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-stone-950/80 border border-stone-800 rounded-lg p-3 text-left font-mono text-[11px] text-red-300 max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center space-x-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold py-2.5 px-4 rounded-lg transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recharger l'application</span>
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold py-2.5 px-4 rounded-lg transition"
              >
                <span>Réinitialiser la session</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

