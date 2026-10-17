import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="space-y-3 font-sans text-slate-800 dark:text-slate-200 animate-in fade-in duration-150">
      {/* 1. Top Toolbar Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg text-xs animate-pulse">
        {/* Left: Filter tabs shimmer */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <div className="w-16 h-6 rounded bg-red-600/30" />
          <div className="w-20 h-6 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="w-18 h-6 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="w-16 h-6 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="w-16 h-6 rounded bg-slate-200 dark:bg-slate-800 hidden sm:block" />
        </div>

        {/* Right: Search, Refresh, New CTA shimmer */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="w-36 sm:w-48 h-6 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60" />
          <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="w-14 h-6 rounded bg-red-600/40" />
        </div>
      </div>

      {/* 2. Spreadsheet Data Grid / Cards Shimmer Skeleton */}
      <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        {/* Table Header Bar Shimmer */}
        <div className="h-8 bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center px-3 gap-3">
          <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="w-48 h-3 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="w-24 h-3 rounded bg-slate-200 dark:bg-slate-800 ml-auto hidden md:block" />
          <div className="w-20 h-3 rounded bg-slate-200 dark:bg-slate-800 hidden sm:block" />
          <div className="w-16 h-3 rounded bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* 7 Row Shimmers */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-3 px-3 animate-pulse"
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <div className="w-3.5 h-3.5 bg-slate-200 dark:bg-slate-800 rounded shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div
                  className="h-3 bg-slate-200 dark:bg-slate-800 rounded"
                  style={{ width: `${Math.max(40, 75 - i * 5)}%` }}
                />
                <div className="h-2 bg-slate-100 dark:bg-slate-850 rounded w-1/4" />
              </div>
              <div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded hidden md:block shrink-0" />
              <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded hidden sm:block shrink-0" />
              <div className="w-14 h-5 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
