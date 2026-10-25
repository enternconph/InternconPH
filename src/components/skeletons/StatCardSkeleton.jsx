import React from 'react';
import { Skeleton } from './BaseSkeleton';

/**
 * Stat Card Skeleton.
 * - 'compact': Small stacked layout used by Admin Dashboard (w-8 h-8 icon, big number, uppercase label)
 * - 'horizontal': Left icon box (w-12 h-12) + right label & large value, used by Institution, Org, Student
 */
export function StatCardSkeleton({ variant = 'horizontal', className = '' }) {
  if (variant === 'compact') {
    return (
      <div className={`bento-card !p-3 space-y-1.5 relative overflow-hidden ${className}`}>
        <Skeleton variant="rounded" className="w-8 h-8 rounded-lg mb-2" />
        <Skeleton variant="text" className="h-6 w-16 mb-1" />
        <Skeleton variant="text" className="h-3 w-20 opacity-80" />
      </div>
    );
  }

  return (
    <div className={`bento-card flex items-center gap-4 ${className}`}>
      <Skeleton variant="rounded" className="w-12 h-12 rounded-2xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton variant="text" className="h-3 w-28 opacity-80" />
        <Skeleton variant="text" className="h-7 w-20" />
      </div>
    </div>
  );
}

/**
 * Grid wrapper for stat cards
 */
export function StatsGridSkeleton({
  count = 4,
  variant = 'horizontal',
  gridClass = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
  className = '',
}) {
  return (
    <div className={`${gridClass} ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={`stat-skeleton-${i}`} variant={variant} />
      ))}
    </div>
  );
}

export default StatCardSkeleton;

