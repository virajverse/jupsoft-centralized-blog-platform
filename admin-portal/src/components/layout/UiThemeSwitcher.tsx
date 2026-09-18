'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useBlogStore } from '../../store/useBlogStore';
import { Sparkles, Layout, Briefcase, ChevronDown, Check } from 'lucide-react';

const THEMES: {
  id: 'modern' | 'classic' | 'zoho';
  label: string;
  badge: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeBg: string;
}[] = [
  {
    id: 'modern',
    label: 'Modern',
    badge: 'Linear',
    desc: 'Sleek rounded cards & royal purple theme',
    icon: Sparkles,
    color: 'text-purple-600 dark:text-purple-400',
    activeBg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300',
  },
  {
    id: 'classic',
    label: 'Classic',
    badge: 'Studio',
    desc: 'Traditional clean admin CMS layout',
    icon: Layout,
    color: 'text-slate-600 dark:text-slate-400',
    activeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white',
  },
  {
    id: 'zoho',
    label: 'Zoho',
    badge: 'Enterprise',
    desc: 'Two-tier dark icon rail & high data density',
    icon: Briefcase,
    color: 'text-red-500 dark:text-red-400',
    activeBg: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300',
  },
];

export const UiThemeSwitcher: React.FC<{ variant?: 'modern' | 'classic' | 'zoho' }> = ({ variant = 'classic' }) => {
  const { uiTheme, setUiTheme, isUiThemeSwitching, uiThemeSwitchTarget } = useBlogStore();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!mounted) {
    return (
      <div className="h-7 w-24 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
    );
  }

  const effectiveTheme = isUiThemeSwitching && uiThemeSwitchTarget ? uiThemeSwitchTarget : uiTheme;
  const currentThemeConfig = THEMES.find((t) => t.id === effectiveTheme) || THEMES[0];
  const CurrentIcon = currentThemeConfig.icon;

  return (
    <div ref={dropdownRef} className="relative inline-block text-left select-none">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={isUiThemeSwitching}
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs transition-all cursor-pointer ${
          variant === 'modern'
            ? 'bg-white hover:bg-slate-50 text-slate-800 border border-indigo-100 shadow-2xs'
            : variant === 'zoho'
            ? 'bg-white dark:bg-[#182230] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60'
        } ${isUiThemeSwitching ? 'opacity-80 cursor-wait' : ''}`}
        title={`UI Theme: ${currentThemeConfig.label} (Click to switch)`}
      >
        <CurrentIcon className={`w-3.5 h-3.5 ${currentThemeConfig.color}`} />
        <span>{currentThemeConfig.label}</span>
        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-200/60 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 font-medium">
          {currentThemeConfig.badge}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-60 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-[100] animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/60 mb-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Select Workspace UI
            </span>
          </div>

          <div className="space-y-0.5 px-1">
            {THEMES.map((t) => {
              const Icon = t.icon;
              const isSelected = effectiveTheme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setUiTheme(t.id);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer group ${
                    isSelected
                      ? t.activeBg
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected 
                        ? 'bg-white dark:bg-slate-900 shadow-xs' 
                        : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-900'
                    }`}>
                      <Icon className={`w-4 h-4 ${t.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold">{t.label}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded font-medium bg-slate-200/60 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                          {t.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[150px]">
                        {t.desc}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
