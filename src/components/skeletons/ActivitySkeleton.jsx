import React from 'react';
import { Skeleton } from './BaseSkeleton';

/**
 * Activity List Skeleton for audit logs, activity feeds, and recent event streams.
 */
export function ActivityListSkeleton({ count = 5, className = '' }) {
  return (
    <div className={`divide-y divide-surface-container-high ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={`activity-${i}`} className="py-2 flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2 flex-1">
            <Skeleton variant="rounded" className="h-5 w-14 rounded shrink-0" />
            <Skeleton variant="text" className="h-3.5 w-1/2 max-w-[180px]" />
          </div>
          <Skeleton variant="text" className="h-3 w-12 shrink-0 opacity-70" />
        </div>
      ))}
    </div>
  );
}

/**
 * Card item list skeleton for lists with status badges (e.g. recent orgs, institutions, students)
 */
export function ItemListSkeleton({ count = 4, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`item-skel-${i}`}
          className="p-2.5 rounded-lg border border-outline-variant/30 bg-surface flex items-center justify-between gap-3"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <Skeleton variant="text" className="h-3.5 w-2/5" />
            <Skeleton variant="text" className="h-3 w-1/4 opacity-70" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Skeleton variant="pill" className="h-5 w-14 rounded-full" />
            <Skeleton variant="rounded" className="h-7 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActivityListSkeleton;

