import React from 'react';

export const BlogEditorSkeleton: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-[#070b14] relative overflow-hidden animate-in fade-in duration-150">
      {/* 1. Studio Header Bar (48px) */}
      <header className="h-12 bg-white dark:bg-[#0c1322] border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 flex items-center justify-between shrink-0 gap-2 z-30 animate-pulse">
        {/* Left: Exit & Website Scope */}
        <div className="flex items-center gap-2">
          <div className="w-16 h-7 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="w-36 sm:w-44 h-7 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60" />
        </div>

        {/* Center: Language Switcher Tabs & Auto-save Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-lg gap-1">
            <div className="w-8 h-6 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="w-8 h-6 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="w-8 h-6 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="w-8 h-6 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="hidden sm:flex items-center gap-1.5 pl-2">
            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="w-14 h-3 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>

        {/* Right: Status, Preview, Save CTAs */}
        <div className="flex items-center gap-2">
          <div className="w-24 sm:w-28 h-7 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="w-20 h-7 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 hidden sm:block" />
          <div className="w-8 h-7 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="w-18 h-7 rounded-lg bg-red-600/30 dark:bg-red-600/20" />
        </div>
      </header>

      {/* 2. Main Studio Viewport */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Editor Main Canvas Column */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative scroll-smooth">
          <div className="max-w-4xl w-full mx-auto my-3 sm:my-6 px-3 sm:px-6 flex-1 flex flex-col">
            <div className="bg-white dark:bg-[#0c1322] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
              
              {/* Sticky Formatting Toolbar (42px) */}
              <div className="sticky top-0 z-20 px-3 sm:px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-[#0c1322]/95 backdrop-blur-xs flex items-center justify-between gap-2 animate-pulse">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                  {/* Headings */}
                  <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg gap-0.5">
                    <div className="w-12 h-6 rounded bg-slate-300 dark:bg-slate-700" />
                    <div className="w-7 h-6 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="w-7 h-6 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="w-7 h-6 rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
                  {/* Formatting marks */}
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />
                  {/* Link & Image */}
                  <div className="flex items-center gap-1">
                    <div className="w-14 h-6 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="w-16 h-6 rounded bg-blue-500/20 dark:bg-blue-500/10" />
                  </div>
                </div>

                {/* Right: Word Count Placeholder */}
                <div className="hidden lg:flex items-center gap-2">
                  <div className="w-16 h-3 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="w-14 h-3 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>

              {/* Document Sheet Body */}
              <div className="p-6 sm:p-12 space-y-6 flex-1 flex flex-col animate-pulse">
                
                {/* Cover Photo Placeholder */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="w-36 h-7 rounded-lg bg-slate-200 dark:bg-slate-800" />
                  <div className="w-24 h-4 rounded bg-slate-200 dark:bg-slate-800" />
                </div>

                {/* Title Shimmer */}
                <div className="space-y-3 pt-2">
                  <div className="h-10 sm:h-12 w-4/5 rounded-xl bg-slate-200 dark:bg-slate-800" />
                  <div className="h-6 w-2/5 rounded-lg bg-slate-100 dark:bg-slate-850" />
                </div>

                {/* Editorial Byline Strip: Permalink + Category + Tags */}
                <div className="flex flex-wrap items-center gap-2 py-2.5 px-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
                  <div className="w-56 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
                  <div className="w-24 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
                  <div className="w-20 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
                </div>

                {/* Lead Summary / Abstract Box */}
                <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 py-1 space-y-2">
                  <div className="h-4 w-11/12 rounded bg-slate-100 dark:bg-slate-850" />
                  <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-slate-850" />
                  <div className="flex justify-between pt-1">
                    <div className="w-36 h-2.5 rounded bg-slate-100 dark:bg-slate-850" />
                    <div className="w-16 h-2.5 rounded bg-slate-100 dark:bg-slate-850" />
                  </div>
                </div>

                {/* Multi-Line Content Body Shimmer */}
                <div className="space-y-3 pt-4 flex-1">
                  <div className="h-4 w-full rounded bg-slate-200/90 dark:bg-slate-800/90" />
                  <div className="h-4 w-11/12 rounded bg-slate-200/90 dark:bg-slate-800/90" />
                  <div className="h-4 w-5/6 rounded bg-slate-200/90 dark:bg-slate-800/90" />
                  <div className="h-4 w-3/4 rounded bg-slate-200/90 dark:bg-slate-800/90" />
                  
                  {/* Sub-heading divider shimmer */}
                  <div className="pt-6 pb-2">
                    <div className="h-7 w-2/5 rounded-lg bg-slate-200 dark:bg-slate-800" />
                  </div>

                  <div className="h-4 w-full rounded bg-slate-200/90 dark:bg-slate-800/90" />
                  <div className="h-4 w-11/12 rounded bg-slate-200/90 dark:bg-slate-800/90" />
                  <div className="h-4 w-4/5 rounded bg-slate-200/90 dark:bg-slate-800/90" />
                  <div className="h-4 w-2/3 rounded bg-slate-200/90 dark:bg-slate-800/90" />
                </div>

              </div>

              {/* Document Bottom Status & Health Bar */}
              <div className="px-6 sm:px-12 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#0b1120] flex items-center justify-between shrink-0 rounded-b-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-20 h-3 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="w-16 h-3 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="w-24 h-6 rounded-lg bg-emerald-500/20 dark:bg-emerald-500/10" />
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
