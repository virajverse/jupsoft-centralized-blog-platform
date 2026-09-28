'use client';

import React, { useState } from 'react';
import { useBlogStore } from '../../store/useBlogStore';
import { HelpCircle, Sparkles, X, ChevronRight } from 'lucide-react';

export const FloatingHelpButton: React.FC = () => {
  const setGuideOpen = useBlogStore((s) => s.setGuideOpen);
  const isGuideOpen = useBlogStore((s) => s.isGuideOpen);
  const [minimized, setMinimized] = useState(false);

  // If the modal is already open, hide the floating trigger so it doesn't distract
  if (isGuideOpen) return null;

  return (
    <aside 
      aria-label="Help &amp; Support Widget"
      className="fixed bottom-5 right-5 z-40 flex items-center select-none"
    >
      {!minimized ? (
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.35)] text-white animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Main Action Trigger */}
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="flex items-center gap-2.5 pl-3 pr-3.5 py-1.5 rounded-full hover:bg-slate-800/90 transition-all group cursor-pointer"
            title="Open Option-Wise Help Center (Beta Testing)"
          >
            {/* Animated Help Icon */}
            <div className="relative flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <HelpCircle className="w-4 h-4 text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" />
            </div>

            {/* Label and Subtitle */}
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-tight text-white group-hover:text-red-300 transition-colors">
                  Need Help?
                </span>
                {/* User requested: Beta Testing tag */}
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-2xs">
                  <Sparkles className="w-2.5 h-2.5" />
                  BETA TESTING
                </span>
              </div>
              <span className="text-[10px] text-slate-300 font-medium">
                Option-Wise Guide &bull; सहायता
              </span>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Minimize / Collapse to compact pill */}
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer mr-1"
            title="Minimize help button"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        /* Minimized Compact Floating Button */
        <button
          type="button"
          onClick={() => {
            setMinimized(false);
            setGuideOpen(true);
          }}
          className="relative group w-11 h-11 rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 dark:bg-slate-900 text-white flex items-center justify-center shadow-2xl border border-slate-700/80 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer animate-in fade-in zoom-in-90"
          title="Open Help Center (Beta Testing)"
        >
          <HelpCircle className="w-5 h-5 text-red-400 group-hover:text-red-300 transition-colors" />
          {/* Micro Beta Pip */}
          <span className="absolute -top-1 -right-1 px-1 py-[1px] rounded bg-amber-400 text-slate-950 font-black text-[7.5px] uppercase tracking-wider shadow-xs">
            BETA
          </span>
        </button>
      )}
    </aside>
  );
};
