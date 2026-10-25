import React from 'react';
import { Skeleton } from './BaseSkeleton';
import { StatCardSkeleton } from './StatCardSkeleton';

/**
 * 1:1 Structural Skeleton for the Student Dashboard (StudentDashboard.jsx).
 * Matches exact 3-stat metric row, OJT progress bar, 4-pillar digital portfolio grid,
 * and 3-column opportunities bento.
 */
export function StudentDashboardSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-200">
      {/* Header Banner Bento */}
      <div className="bento-card flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton variant="text" className="h-7 w-60 sm:w-72" />
            <Skeleton variant="pill" className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton variant="text" className="h-4 w-72 sm:w-96 opacity-70" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton variant="rounded" className="h-8 w-36 rounded-lg" />
          <Skeleton variant="rounded" className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      {/* Metrics Row (EXACTLY 3 cards matching real dashboard) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <StatCardSkeleton key={`student-metric-${i}`} variant="horizontal" />
        ))}
      </div>

      {/* Active OJT Progress Card */}
      <div className="bento-card space-y-4">
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <Skeleton variant="circular" className="w-5 h-5" />
            <Skeleton variant="text" className="h-5 w-56" />
          </div>
          <Skeleton variant="pill" className="h-6 w-20 rounded-full" />
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-surface-container rounded-xl flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-1">
              <Skeleton variant="text" className="h-5 w-44" />
              <Skeleton variant="text" className="h-3.5 w-32 opacity-70" />
            </div>
            <div className="text-right space-y-1">
              <Skeleton variant="text" className="h-6 w-16" />
              <Skeleton variant="text" className="h-3 w-28 opacity-70" />
            </div>
          </div>

          {/* Progress Bar */}
          <Skeleton variant="pill" className="w-full h-3 rounded-full" />

          <div className="flex justify-end">
            <Skeleton variant="text" className="h-3.5 w-56" />
          </div>
        </div>
      </div>

      {/* Digital Career Portfolio & Credentials Bento Card */}
      <div className="bento-card space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton variant="circular" className="w-5 h-5" />
              <Skeleton variant="text" className="h-5 w-64" />
              <Skeleton variant="pill" className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton variant="text" className="h-3 w-80 opacity-70" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton variant="rounded" className="h-7 w-28 rounded-lg" />
            <Skeleton variant="rounded" className="h-7 w-36 rounded-lg" />
          </div>
        </div>

        {/* 4 Pillars Grid: Academic Portfolio, Credentials, Academic Records, Resume */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`portfolio-pillar-${i}`}
              className="p-3.5 rounded-xl border border-outline-variant bg-surface flex flex-col justify-between h-28"
            >
              <div className="flex items-start justify-between">
                <Skeleton variant="rounded" className="w-9 h-9 rounded-lg" />
                <Skeleton variant="text" className="h-6 w-8" />
              </div>
              <div className="space-y-1 mt-2">
                <Skeleton variant="text" className="h-3.5 w-28" />
                <Skeleton variant="text" className="h-2.5 w-full opacity-70" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Opportunities Section */}
      <div className="bento-card space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton variant="circular" className="w-5 h-5" />
              <Skeleton variant="text" className="h-5 w-64" />
              <Skeleton variant="pill" className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton variant="text" className="h-3 w-80 opacity-70" />
          </div>
          <Skeleton variant="text" className="h-3 w-36" />
        </div>

        {/* 3-Column Job Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`student-opp-${i}`}
              className="p-4 rounded-xl border border-outline-variant bg-white dark:bg-surface flex flex-col justify-between space-y-3 shadow-xs h-48"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <Skeleton variant="pill" className="h-4.5 w-24 rounded-full" />
                  <Skeleton variant="pill" className="h-4.5 w-20 rounded-full" />
                </div>
                <div className="space-y-1">
                  <Skeleton variant="text" className="h-4.5 w-4/5" />
                  <Skeleton variant="text" className="h-3.5 w-3/5 text-vibrant-orange" />
                  <Skeleton variant="text" className="h-3 w-1/2 opacity-70" />
                </div>
              </div>
              <div className="pt-2 border-t border-outline-variant/60 flex items-center justify-between">
                <Skeleton variant="text" className="h-3 w-20 opacity-70" />
                <Skeleton variant="rounded" className="h-7 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboardSkeleton;

