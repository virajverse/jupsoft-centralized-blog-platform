'use client';

import React, { useEffect, useState } from 'react';
import { useBlogStore } from '../../store/useBlogStore';
import { Sparkles, Layout } from 'lucide-react';

export const UiThemeSwitcher: React.FC<{ variant?: 'modern' | 'classic' }> = ({ variant = 'classic' }) => {
  const { uiTheme, setUiTheme, isUiThemeSwitching, uiThemeSwitchTarget } = useBlogStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-7 w-28 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
    );
  }

  // Active theme during transition reflects the target immediately
  const effectiveTheme = isUiThemeSwitching && uiThemeSwitchTarget ? uiThemeSwitchTarget : uiTheme;
  const isModern = effectiveTheme === 'modern';

  return (
    <div 
      className={`inline-flex items-center p-0.5 rounded-full text-[11px] font-bold select-none shadow-xs transition-all shrink-0 ${
        variant === 'modern'
          ? 'bg-white/95 border border-indigo-100 shadow-2xs'
          : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60'
      } ${isUiThemeSwitching ? 'opacity-80' : ''}`}
      title="Switch between Modern and Classic UI"
    >
      <button
        type="button"
        disabled={isUiThemeSwitching}
        onClick={() => setUiTheme('modern')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
          isUiThemeSwitching ? 'cursor-wait' : 'cursor-pointer'
        } ${
          isModern
            ? 'bg-[#4c22cf] text-white shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
        }`}
        aria-label="Modern"
      >
        <Sparkles className={`w-3 h-3 shrink-0 ${isModern ? 'text-amber-300' : 'text-slate-400'}`} />
        <span>Modern</span>
      </button>

      <button
        type="button"
        disabled={isUiThemeSwitching}
        onClick={() => setUiTheme('classic')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
          isUiThemeSwitching ? 'cursor-wait' : 'cursor-pointer'
        } ${
          !isModern
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
        }`}
        aria-label="Classic"
      >
        <Layout className="w-3 h-3 shrink-0 text-slate-500" />
        <span>Classic</span>
      </button>
    </div>
  );
};
