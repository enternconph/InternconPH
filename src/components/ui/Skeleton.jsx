import React from 'react';
import {
  Skeleton,
  TableSkeleton,
  StatCardSkeleton,
  StatsGridSkeleton,
  ActivityListSkeleton,
  ItemListSkeleton,
  AdminDashboardSkeleton,
  InstitutionDashboardSkeleton,
  OrgDashboardSkeleton,
  StudentDashboardSkeleton,
  DashboardSkeleton,
  DashboardErrorState,
} from '../skeletons';

// Re-export core primitives and role-specific skeletons
export {
  Skeleton,
  TableSkeleton,
  StatCardSkeleton,
  StatsGridSkeleton,
  ActivityListSkeleton,
  ItemListSkeleton,
  AdminDashboardSkeleton,
  InstitutionDashboardSkeleton,
  OrgDashboardSkeleton,
  StudentDashboardSkeleton,
  DashboardSkeleton,
  DashboardErrorState,
};

// Legacy backwards-compatibility aliases
export function StatsSkeleton({ count = 4, className = '' }) {
  return <StatsGridSkeleton count={count} variant="horizontal" className={className} />;
}

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

export function ListSkeleton({ count = 5, className = '' }) {
  return <ActivityListSkeleton count={count} className={className} />;
}

export default Skeleton;
