import React from 'react';
import { Skeleton } from './BaseSkeleton';
import { StatCardSkeleton } from './StatCardSkeleton';
import { ActivityListSkeleton, ItemListSkeleton } from './ActivitySkeleton';

/**
 * 1:1 Structural Skeleton for the System Administrator Dashboard (AdminDashboard.jsx).
 * Matches exact padding, grid columns, 8-card core metrics, demographics, AI engine, and recent lists.
 */
export function AdminDashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-4 animate-in fade-in duration-200">
      {/* ═══ Header ═══ */}
      <div className="bento-card !p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <Skeleton variant="text" className="h-6 w-36" />
            <Skeleton variant="pill" className="h-5 w-14 rounded-full" />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Skeleton variant="rounded" className="h-7 w-20 rounded-lg" />
            <Skeleton variant="rounded" className="h-7 w-24 rounded-lg" />
            <Skeleton variant="rounded" className="h-7 w-16 rounded-lg" />
            <Skeleton variant="rounded" className="h-7 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      {/* ═══ Stat Cards (8 cards in 2x4 grid) ═══ */}
      <div>
        <div className="flex items-center justify-between mb-2 px-0.5">
          <div className="flex items-center gap-1.5">
            <Skeleton variant="circular" className="w-3.5 h-3.5" />
            <Skeleton variant="text" className="h-3 w-24" />
          </div>
          <Skeleton variant="text" className="h-3 w-16" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Array.from({ length: 8 }).map((_, idx) => (
            <StatCardSkeleton key={`admin-stat-${idx}`} variant="compact" />
          ))}
        </div>
      </div>

      {/* ═══ Row 2: Demographics + AI Skills ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* LEFT: User Demographics & Recent Activity */}
        <div className="space-y-4">
          <div className="bento-card !p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-1.5">
                <Skeleton variant="circular" className="w-4 h-4" />
                <Skeleton variant="text" className="h-4 w-32" />
              </div>
              <Skeleton variant="text" className="h-3 w-14" />
            </div>

            {/* Distribution Bar */}
            <Skeleton variant="pill" className="w-full h-2.5 rounded-full mb-3" />

            {/* Role Breakdown (4 items) */}
            <div className="space-y-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`demographic-${i}`}
                  className="flex items-center justify-between p-2 rounded-lg border border-outline-variant/30 bg-surface"
                >
                  <div className="flex items-center gap-2">
                    <Skeleton variant="circular" className="w-2 h-2" />
                    <Skeleton variant="text" className="h-3 w-28" />
                  </div>
                  <Skeleton variant="text" className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>

          {/* Audit Trail / Recent Activity */}
          <div className="bento-card !p-4">
            <div className="flex justify-between items-center mb-2.5">
              <div className="flex items-center gap-1.5">
                <Skeleton variant="circular" className="w-4 h-4" />
                <Skeleton variant="text" className="h-4 w-28" />
              </div>
              <Skeleton variant="text" className="h-3 w-16" />
            </div>

            <ActivityListSkeleton count={5} />
          </div>
        </div>

        {/* RIGHT: AI Skill Intelligence */}
        <div className="bento-card !p-4">
          <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Skeleton variant="circular" className="w-4 h-4" />
                <Skeleton variant="text" className="h-4 w-56" />
                <Skeleton variant="rounded" className="h-4 w-10 rounded" />
              </div>
              <Skeleton variant="text" className="h-3 w-72 opacity-70" />
            </div>
            <Skeleton variant="rounded" className="h-7 w-28 rounded-lg shrink-0" />
          </div>

          {/* Top Skills (8 rows) */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <Skeleton variant="text" className="h-3 w-32" />
              <Skeleton variant="text" className="h-3 w-20" />
            </div>

            <div className="space-y-1.5">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={`skill-${idx}`}
                  className="p-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest flex items-center gap-2"
                >
                  <Skeleton variant="rounded" className="h-4 w-6 rounded shrink-0" />
                  <Skeleton variant="text" className="h-3.5 w-1/3 flex-1" />
                  <Skeleton variant="text" className="h-3 w-16 shrink-0 opacity-70" />
                  <Skeleton variant="circular" className="w-3 h-3 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* CHED Coverage */}
          <div className="p-3 rounded-lg bg-surface-container-low/60 border border-outline-variant/20 space-y-2">
            <div className="flex items-center gap-1.5">
              <Skeleton variant="circular" className="w-3.5 h-3.5" />
              <Skeleton variant="text" className="h-3 w-36" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={`discipline-${i}`} variant="rounded" className="h-5 w-12 rounded" />
              ))}
              <Skeleton variant="rounded" className="h-5 w-16 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Row 3: Recent Orgs + Recent Institutions ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Organizations */}
        <div className="bento-card !p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-1.5">
              <Skeleton variant="circular" className="w-4 h-4" />
              <Skeleton variant="text" className="h-4 w-36" />
            </div>
            <Skeleton variant="text" className="h-3 w-16" />
          </div>

          <ItemListSkeleton count={5} />
        </div>

        {/* Recent Institutions */}
        <div className="bento-card !p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-1.5">
              <Skeleton variant="circular" className="w-4 h-4" />
              <Skeleton variant="text" className="h-4 w-36" />
            </div>
            <Skeleton variant="text" className="h-3 w-16" />
          </div>

          <ItemListSkeleton count={5} />
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardSkeleton;

