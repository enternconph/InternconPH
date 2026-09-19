import React from 'react';

/**
 * Base Skeleton component for shimmering placeholder blocks
 */
export function Skeleton({
  className = '',
  variant = 'rounded', // 'text' | 'circular' | 'rectangular' | 'rounded' | 'pill'
  width,
  height,
  style = {},
  ...props
}) {
  const variantClasses = {
    text: 'rounded-md h-4 w-full',
    circular: 'rounded-full shrink-0',
    rectangular: 'rounded-none w-full',
    rounded: 'rounded-xl w-full',
    pill: 'rounded-full w-full',
  };

  const inlineStyles = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  };

  return (
    <div
      className={`relative overflow-hidden bg-surface-container-high/60 dark:bg-surface-container-high/40 animate-pulse ${
        variantClasses[variant] || 'rounded-xl'
      } ${className}`}
      style={inlineStyles}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent animate-shimmer" />
    </div>
  );
}

/**
 * Table Loading Skeleton for tabular views
 */
export function TableSkeleton({ rows = 6, cols = 6, className = '' }) {
  const colWidths = ['w-1/3', 'w-1/5', 'w-1/4', 'w-1/6', 'w-1/6', 'w-1/5'];

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Table Header Placeholder */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
        {Array.from({ length: cols }).map((_, idx) => (
          <div key={`th-${idx}`} className={`px-4 ${colWidths[idx % colWidths.length]}`}>
            <Skeleton variant="text" className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Table Body Rows Placeholder */}
      <div className="divide-y divide-outline-variant/40">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={`tr-${rIdx}`} className="py-4 flex items-center justify-between gap-4">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div key={`td-${rIdx}-${cIdx}`} className={`px-4 ${colWidths[cIdx % colWidths.length]}`}>
                {cIdx === 0 ? (
                  <div className="space-y-2">
                    <Skeleton variant="text" className="h-4 w-3/4" />
                    <Skeleton variant="text" className="h-3 w-1/2 opacity-70" />
                  </div>
                ) : cIdx === cols - 1 ? (
                  <div className="flex justify-end gap-2">
                    <Skeleton variant="rounded" className="h-7 w-16" />
                  </div>
                ) : (
                  <Skeleton variant="text" className="h-4 w-2/3" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Metrics / Stats Cards Skeleton (e.g. Overview cards)
 */
export function StatsSkeleton({ count = 4, className = '' }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`stat-${idx}`}
          className="bento-card p-5 space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <Skeleton variant="text" className="h-3 w-24" />
            <Skeleton variant="circular" className="w-10 h-10" />
          </div>
          <Skeleton variant="text" className="h-8 w-20" />
          <Skeleton variant="text" className="h-3 w-32 opacity-70" />
        </div>
      ))}
    </div>
  );
}

/**
 * Card / Bento Box Skeleton
 */
export function CardSkeleton({ count = 3, className = '' }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={`card-${idx}`} className="bento-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" className="h-5 w-36" />
            <Skeleton variant="pill" className="h-5 w-16" />
          </div>
          <Skeleton variant="text" className="h-4 w-full" />
          <Skeleton variant="text" className="h-4 w-4/5" />
          <div className="pt-4 border-t border-outline-variant flex items-center justify-between">
            <Skeleton variant="circular" className="w-8 h-8" />
            <Skeleton variant="rounded" className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * List item skeleton (e.g. Audit logs, notifications, applicants)
 */
export function ListSkeleton({ count = 5, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`list-${idx}`}
          className="p-4 rounded-xl bg-surface border border-outline-variant flex items-center gap-4"
        >
          <Skeleton variant="circular" className="w-10 h-10" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-1/3" />
            <Skeleton variant="text" className="h-3 w-2/3 opacity-70" />
          </div>
          <Skeleton variant="rounded" className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Full Dashboard Overview Skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-300">
      {/* Greeting Header Skeleton */}
      <div className="space-y-2">
        <Skeleton variant="text" className="h-7 w-64" />
        <Skeleton variant="text" className="h-4 w-96 opacity-70" />
      </div>

      {/* Metric Cards Skeleton */}
      <StatsSkeleton count={4} />

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bento-card p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
            <Skeleton variant="text" className="h-5 w-40" />
            <Skeleton variant="rounded" className="h-7 w-20" />
          </div>
          <TableSkeleton rows={5} cols={4} />
        </div>

        <div className="bento-card p-6 space-y-4">
          <Skeleton variant="text" className="h-5 w-32 pb-2 border-b border-outline-variant" />
          <ListSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
