import React from 'react';
import { Skeleton } from './BaseSkeleton';
import { StatCardSkeleton } from './StatCardSkeleton';
import { TableSkeleton } from './TableSkeleton';

/**
 * 1:1 Structural Skeleton for the Hiring Organization Dashboard (OrgDashboard.jsx).
 * Automatically supports both Workplace Mentor and HR Main Account layouts.
 */
export function OrgDashboardSkeleton({ isMentor = false }) {
  if (isMentor) {
    return (
      <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-200">
        {/* Mentor Header Banner */}
        <div className="bento-card flex items-center justify-between flex-wrap gap-4 bg-gradient-to-r from-orange-tint/40 to-surface border border-vibrant-orange/20">
          <div className="space-y-1.5 flex-1 min-w-0">
            <Skeleton variant="pill" className="h-5 w-48 rounded-full" />
            <Skeleton variant="text" className="h-7 w-64 sm:w-80" />
            <Skeleton variant="text" className="h-4 w-full max-w-2xl opacity-70" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton variant="rounded" className="h-9 w-32 rounded-lg" />
            <Skeleton variant="rounded" className="h-9 w-28 rounded-lg" />
          </div>
        </div>

        {/* Mentor Access Scope Cards */}
        <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton variant="circular" className="w-4 h-4" />
            <Skeleton variant="text" className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`mentor-scope-${i}`} className="p-3 bg-surface rounded-xl border border-outline-variant space-y-2">
                <Skeleton variant="text" className="h-4 w-40" />
                <Skeleton variant="text" className="h-3 w-full opacity-70" />
                <Skeleton variant="text" className="h-3 w-4/5 opacity-70" />
              </div>
            ))}
          </div>
        </div>

        {/* Mentor Key Metrics (3 cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={`mentor-stat-${i}`} variant="horizontal" />
          ))}
        </div>

        {/* Assigned Interns Table Card */}
        <div className="bento-card space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="space-y-1">
              <Skeleton variant="text" className="h-5 w-48" />
              <Skeleton variant="text" className="h-3 w-72 opacity-70" />
            </div>
            <Skeleton variant="text" className="h-3 w-28" />
          </div>

          <TableSkeleton
            rows={4}
            cols={4}
            columns={[
              { width: 'w-2/5', align: 'left', primary: true },
              { width: 'w-1/4', align: 'left' },
              { width: 'w-1/5', align: 'left' },
              { width: 'w-1/6', align: 'right', isAction: true },
            ]}
          />
        </div>
      </div>
    );
  }

  // HR Account Dashboard Skeleton
  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-200">
      {/* Banner */}
      <div className="bento-card flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton variant="text" className="h-7 w-64 sm:w-80" />
          <Skeleton variant="text" className="h-4 w-full max-w-xl opacity-70" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton variant="rounded" className="h-9 w-28 rounded-lg" />
          <Skeleton variant="rounded" className="h-9 w-44 rounded-lg" />
        </div>
      </div>

      {/* Metrics Row (4 cards in horizontal format) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={`org-metric-${i}`} variant="horizontal" />
        ))}
      </div>

      {/* Posted Opportunities Section */}
      <div className="bento-card space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton variant="text" className="h-5 w-60" />
              <Skeleton variant="pill" className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton variant="text" className="h-3 w-80 opacity-70" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" className="h-7 w-32 rounded-lg" />
            <Skeleton variant="text" className="h-3 w-32" />
          </div>
        </div>

        {/* 5-Column Table Skeleton */}
        <TableSkeleton
          rows={4}
          cols={5}
          columns={[
            { width: 'w-2/5', align: 'left', primary: true },
            { width: 'w-1/5', align: 'left' },
            { width: 'w-1/6', align: 'left' },
            { width: 'w-1/6', align: 'left' },
            { width: 'w-1/6', align: 'right', isAction: true },
          ]}
        />
      </div>

      {/* Recent Candidate Applicants */}
      <div className="bento-card space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="space-y-1">
            <Skeleton variant="text" className="h-5 w-52" />
            <Skeleton variant="text" className="h-3 w-72 opacity-70" />
          </div>
          <Skeleton variant="text" className="h-3 w-28" />
        </div>

        {/* 4-Column Table Skeleton */}
        <TableSkeleton
          rows={3}
          cols={4}
          columns={[
            { width: 'w-1/3', align: 'left', primary: true },
            { width: 'w-1/4', align: 'left' },
            { width: 'w-1/4', align: 'left' },
            { width: 'w-1/6', align: 'left' },
          ]}
        />
      </div>
    </div>
  );
}

export default OrgDashboardSkeleton;

