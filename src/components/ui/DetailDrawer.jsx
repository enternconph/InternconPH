import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * "View Details" container.
 * Desktop: right slide-over. Mobile: bottom sheet.
 */
export default function DetailDrawer({ open, onClose, title, subtitle, footer, children, width = 'lg:max-w-lg' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end lg:items-stretch lg:justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true" />
      <aside
        className={`relative w-full ${width} max-h-[88dvh] lg:max-h-none lg:h-full flex flex-col bg-surface-container-lowest text-on-surface
          rounded-t-sheet lg:rounded-t-none lg:rounded-l-sheet shadow-overlay animate-sheet-in-up lg:animate-drawer-in-right`}
      >
        <div className="lg:hidden mx-auto mt-2 h-1.5 w-10 rounded-full bg-outline-variant" />
        <header className="flex items-start justify-between gap-3 px-6 pt-4 pb-3 border-b border-outline-variant/60">
          <div className="min-w-0">
            {subtitle && <p className="eyebrow">{subtitle}</p>}
            <h2 className="font-headline text-xl font-bold truncate">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-btn shrink-0" aria-label="Close details">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">{children}</div>
        {footer && <footer className="px-6 py-4 border-t border-outline-variant/60 flex flex-wrap gap-2 justify-end pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</footer>}
      </aside>
    </div>,
    document.body
  );
}

/** Label/value row for use inside the drawer. */
export function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-outline-variant/40 last:border-0">
      <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-sm font-medium text-on-surface text-right break-words min-w-0">{children || '—'}</span>
    </div>
  );
}
