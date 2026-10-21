import React from 'react';

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="font-headline text-2xl md:text-3xl font-bold text-on-surface">{title}</h1>
        {description && <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, hint, tone = 'amber' }) {
  const tones = {
    amber: 'bg-vibrant-orange text-accent-ink',
    mint: 'bg-brand-mint text-accent-ink',
    neutral: 'bg-surface-container text-on-surface',
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      {icon && (
        <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${tones[tone] || tones.amber}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide truncate">{label}</p>
        <p className="font-headline text-2xl font-bold tabular">{value}</p>
        {hint && <p className="text-xs text-on-surface-variant truncate">{hint}</p>}
      </div>
    </div>
  );
}

export function StatusChip({ tone = 'neutral', children }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

export function DetailLink({ onClick, children = 'View Details', ...rest }) {
  return (
    <button type="button" onClick={onClick} className="link-detail" {...rest}>
      {children}
    </button>
  );
}

export function EmptyState({ icon = 'inbox', title, description, action }) {
  return (
    <div className="card-inset p-8 text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-3">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <p className="font-bold text-on-surface">{title}</p>
      {description && <p className="text-sm text-on-surface-variant mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Avatar({ name = '', src, size = 40 }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  return src ? (
    <img src={src} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />
  ) : (
    <div style={{ width: size, height: size }} className="rounded-full bg-brand-mint text-accent-ink font-bold flex items-center justify-center text-sm shrink-0">
      {initials}
    </div>
  );
}

export function ProgressBar({ value = 0, striped = false }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-surface-container overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full bg-vibrant-orange transition-all ${striped ? 'striped-bar' : ''}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SegmentedTabs({ items, value, onChange }) {
  return (
    <div className="seg" role="tablist">
      {items.map((it) => (
        <button key={it.value} type="button" role="tab" className="seg-item" data-active={value === it.value} onClick={() => onChange(it.value)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function FilterPills({ items, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <button key={it.value} type="button" className="pill-filter" data-active={value === it.value} onClick={() => onChange(it.value)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}
