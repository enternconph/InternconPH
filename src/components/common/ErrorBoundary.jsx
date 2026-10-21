import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-6 text-on-surface">
          <div className="max-w-md w-full bg-surface-container rounded-3xl p-8 border border-outline-variant shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-4xl">warning</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Something went wrong</h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                An unexpected interface error occurred. Your attendance and database records are safe.
              </p>
              {this.state.error?.message && (
                <p className="text-[11px] font-mono p-2 bg-surface rounded-xl border border-outline-variant text-rose-500 max-h-24 overflow-y-auto">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-vibrant-orange hover:bg-deep-orange text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Reload Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

