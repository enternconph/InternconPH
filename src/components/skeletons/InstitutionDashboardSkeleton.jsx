import React from 'react';
import { Skeleton } from './BaseSkeleton';
import { StatCardSkeleton } from './StatCardSkeleton';
import { TableSkeleton } from './TableSkeleton';

/**
 * 1:1 Structural Skeleton for the Institution Dashboard (InstitutionDashboard.jsx).
 * Matches exact responsive paddings, 4 metric cards, 2-column pending/active grid,
 * dispatched opportunities grid, and student directory table.
 */
export function InstitutionDashboardSkeleton() {
  return (
    <div className="p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 w-full max-w-full min-w-0 overflow-x-hidden animate-in fade-in duration-200">
      {/* Banner */}
      <div className="bento-card flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton variant="text" className="h-7 w-64 sm:w-80" />
            <Skeleton variant="pill" className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton variant="text" className="h-4 w-72 sm:w-96 opacity-70" />
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Skeleton variant="pill" className="h-6 w-28 rounded-full" />
          <Skeleton variant="rounded" className="h-8 w-28 rounded-lg" />
          <Skeleton variant="rounded" className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      {/* Metrics Row (4 cards in horizontal format) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={`inst-metric-${i}`} variant="horizontal" />
        ))}
      </div>

      {/* Grid: Pending Students & Recent Deployments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Student Registrations */}
        <div className="bento-card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton variant="circular" className="w-5 h-5" />
              <Skeleton variant="text" className="h-5 w-48" />
            </div>
            <Skeleton variant="text" className="h-3 w-16" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`pending-stu-${i}`}
                className="p-3 bg-surface-container-low rounded-xl border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <Skeleton variant="text" className="h-4 w-36" />
                  <Skeleton variant="text" className="h-3 w-48 opacity-70" />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Skeleton variant="rounded" className="h-5 w-14 rounded-md" />
                  <Skeleton variant="rounded" className="h-7 w-16 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Deployments */}
        <div className="bento-card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton variant="circular" className="w-5 h-5" />
              <Skeleton variant="text" className="h-5 w-44" />
            </div>
            <Skeleton variant="text" className="h-3 w-16" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`active-dep-${i}`}
                className="p-3 bg-surface-container-low rounded-xl border border-outline-variant flex items-center justify-between gap-3"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <Skeleton variant="text" className="h-4 w-36" />
                  <Skeleton variant="text" className="h-3 w-48 opacity-70" />
                </div>
                <div className="text-right space-y-1 shrink-0">
                  <Skeleton variant="text" className="h-4 w-20" />
                  <Skeleton variant="text" className="h-2.5 w-12 opacity-70" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dispatched Opportunities Section */}
      <div className="bento-card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton variant="circular" className="w-5 h-5" />
              <Skeleton variant="text" className="h-5 w-64" />
              <Skeleton variant="pill" className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton variant="text" className="h-3 w-80 opacity-70" />
          </div>
          <Skeleton variant="text" className="h-3 w-36" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`opp-card-${i}`}
              className="p-4 bg-surface-container-low rounded-xl border border-outline-variant flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <Skeleton variant="pill" className="h-4 w-24 rounded-full" />
                  <Skeleton variant="text" className="h-3 w-20 opacity-70" />
                </div>
                <Skeleton variant="text" className="h-4.5 w-4/5" />
                <Skeleton variant="text" className="h-3.5 w-3/5" />
                <Skeleton variant="text" className="h-3 w-1/2 opacity-70" />
              </div>
              <div className="pt-2 border-t border-outline-variant flex justify-end">
                <Skeleton variant="rounded" className="h-7 w-28 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Student Directory ── */}
      <div className="bento-card space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton variant="circular" className="w-5 h-5" />
              <Skeleton variant="text" className="h-5 w-36" />
            </div>
            <Skeleton variant="text" className="h-3 w-72 sm:w-96 opacity-70" />
          </div>
          <Skeleton variant="pill" className="h-6 w-24 rounded-full" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full max-w-full">
          <Skeleton variant="rounded" className="h-9 flex-1 min-w-[200px] rounded-xl" />
          <Skeleton variant="rounded" className="h-9 w-full sm:w-36 rounded-xl" />
          <Skeleton variant="rounded" className="h-9 w-full sm:w-36 rounded-xl" />
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <TableSkeleton
            rows={5}
            cols={4}
            columns={[
              { width: 'w-2/5', align: 'left', primary: true },
              { width: 'w-1/4', align: 'left' },
              { width: 'w-1/5', align: 'left' },
              { width: 'w-1/6', align: 'right', isAction: true },
            ]}
          />
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden divide-y divide-outline-variant/60 rounded-xl border border-outline-variant bg-surface-container-low/40 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`mobile-stu-${i}`} className="p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1">
                  <Skeleton variant="text" className="h-4 w-36" />
                  <Skeleton variant="text" className="h-3 w-20 opacity-70" />
                </div>
                <Skeleton variant="pill" className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-outline-variant/40">
                <Skeleton variant="text" className="h-3 w-24" />
                <Skeleton variant="text" className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default InstitutionDashboardSkeleton;

