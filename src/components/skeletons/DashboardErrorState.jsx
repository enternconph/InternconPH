import React from 'react';

/**
 * Resilient Error State displayed when initial dashboard fetch fails.
 * Provides a clear user message and retry trigger without infinite skeleton hanging.
 */
export function DashboardErrorState({
  title = 'Unable to Load Dashboard Data',
  message = 'A network or server connectivity issue occurred while loading this dashboard. Please verify your connection and try again.',
  onRetry,
  className = '',
}) {
  return (
    <div className={`p-4 md:p-8 w-full max-w-4xl mx-auto ${className}`}>
      <div className="bento-card !p-8 text-center space-y-4 border-error/30 bg-error-container/10">
        <div className="w-14 h-14 rounded-2xl bg-error-container text-error mx-auto flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px]">cloud_off</span>
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h2 className="text-lg font-bold text-on-surface">{title}</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">{message}</p>
        </div>
        {onRetry && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onRetry}
              className="px-5 py-2.5 bg-vibrant-orange hover:bg-deep-orange text-white rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-2 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Try Again</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardErrorState;

