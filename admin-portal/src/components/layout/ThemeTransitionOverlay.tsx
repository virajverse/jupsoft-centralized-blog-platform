'use client';

import React, { useEffect, useState } from 'react';
import { useBlogStore } from '../../store/useBlogStore';
import { Sparkles, Zap, CheckCircle2, Briefcase } from 'lucide-react';

export const ThemeTransitionOverlay: React.FC = () => {
  const { isUiThemeSwitching, uiThemeSwitchTarget } = useBlogStore();
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Target theme determination ('modern' | 'zoho')
  const targetTheme = uiThemeSwitchTarget || 'modern';

  useEffect(() => {
    if (!isUiThemeSwitching) {
      setProgress(0);
      setIsExiting(false);
      return;
    }

    setProgress(10);
    setIsExiting(false);

    // Smooth simulated progress ramp over 850ms
    const start = Date.now();
    const duration = 850;

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct >= 85 && !isExiting) {
        setIsExiting(true);
      }

      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [isUiThemeSwitching, isExiting]);

  if (!isUiThemeSwitching) {
    return null;
  }

  // Live status ticker based on progress & target theme
  let phaseText = 'Initializing layout engine...';
  if (progress >= 25 && progress < 60) {
    if (targetTheme === 'modern') {
      phaseText = 'Mounting royal purple canvas & curved navigation...';
    } else {
      phaseText = 'Mounting two-tier icon rail & contextual sub-drawer...';
    }
  } else if (progress >= 60 && progress < 88) {
    if (targetTheme === 'modern') {
      phaseText = 'Applying responsive cards & ergonomic widgets...';
    } else {
      phaseText = 'Initializing Zoho omnibox search & quick actions...';
    }
  } else if (progress >= 88) {
    phaseText = targetTheme === 'modern' ? 'Modern UI Ready!' : 'Zoho Enterprise Ready!';
  }

  return (
    <aside
      aria-label="Theme Transition"
      aria-live="polite"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none transition-all duration-300 ease-out ${
        isExiting 
          ? 'opacity-0 scale-105 pointer-events-none' 
          : 'opacity-100 scale-100 backdrop-blur-2xl bg-slate-950/85'
      }`}
    >
      {/* Dynamic Ambient Background Glow Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {targetTheme === 'modern' ? (
          <>
            <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full bg-[#4c22cf]/30 blur-[120px] animate-pulse-glow" />
            <div className="absolute -bottom-32 right-1/4 w-[450px] h-[450px] rounded-full bg-[#7c3aed]/25 blur-[120px] animate-pulse-glow" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-amber-400/10 blur-[90px] animate-float-gentle" />
          </>
        ) : (
          <>
            <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full bg-red-600/25 blur-[120px] animate-pulse-glow" />
            <div className="absolute -bottom-32 right-1/4 w-[450px] h-[450px] rounded-full bg-rose-500/25 blur-[120px] animate-pulse-glow" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-amber-400/15 blur-[90px] animate-float-gentle" />
          </>
        )}
      </div>

      {/* Central Glassmorphic Transformation Card */}
      <div className="relative max-w-md w-full mx-4 rounded-3xl p-8 sm:p-10 border border-white/15 bg-white/[0.07] shadow-2xl backdrop-blur-3xl overflow-hidden flex flex-col items-center text-center">
        {/* Shimmer Border Light Accent */}
        <div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden">
          <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer-slide opacity-40" />
        </div>

        {/* Top Transformation Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase mb-6 shadow-sm border border-white/10 bg-white/5 text-white/90">
          <Zap className={`w-3.5 h-3.5 ${targetTheme === 'modern' ? 'text-amber-300' : 'text-red-400'}`} />
          <span>
            {targetTheme === 'modern' ? 'Transforming to Modern UI' : 'Activating Zoho Enterprise'}
          </span>
        </div>

        {/* Destination Hero Icon Node */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 my-3 w-full">
          <div className="flex flex-col items-center gap-2 relative scale-105">
            {/* Pulsing orbital aura */}
            <div 
              className={`absolute -inset-2 rounded-3xl blur-md opacity-60 animate-pulse ${
                targetTheme === 'modern' ? 'bg-[#4c22cf]' : 'bg-red-500'
              }`} 
            />

            <div 
              className={`w-16 h-16 rounded-2xl flex items-center justify-center relative z-10 shadow-xl transition-transform ${
                targetTheme === 'modern' 
                  ? 'bg-gradient-to-br from-[#4c22cf] to-[#7c3aed] text-white border-2 border-indigo-300/40 shadow-indigo-500/50' 
                  : 'bg-gradient-to-br from-red-600 to-rose-700 text-white border-2 border-red-400/50 shadow-red-500/50'
              }`}
            >
              {targetTheme === 'modern' ? <Sparkles className="w-8 h-8 text-amber-300" /> : <Briefcase className="w-8 h-8 text-white" />}
            </div>

            <span className={`text-[12px] font-black tracking-wider uppercase ${
              targetTheme === 'modern' ? 'text-amber-300' : 'text-red-400'
            }`}>
              {targetTheme === 'modern' ? 'Modern' : 'Zoho'}
            </span>
          </div>
        </div>

        {/* Dynamic Title & Subtitle */}
        <div className="mt-5 space-y-1.5">
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            {targetTheme === 'modern' ? (
              <>
                <span>Activating Modern UI</span>
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              </>
            ) : (
              <>
                <span>Activating Zoho UI</span>
                <Briefcase className="w-4 h-4 text-red-400 shrink-0" />
              </>
            )}
          </h3>
          <p className="text-xs text-white/60 max-w-xs mx-auto leading-relaxed">
            {targetTheme === 'modern' 
              ? 'Fluid curved canvas, ergonomic cards & royal purple theme' 
              : 'Two-tier navigation, 50px omnibox header & high data density'}
          </p>
        </div>

        {/* Live Animated Progress Bar & Percentage */}
        <div className="w-full mt-7 space-y-2">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-[11px] font-medium text-white/70 truncate max-w-[240px] text-left">
              {phaseText}
            </span>
            <span className="font-mono font-black text-white/90 text-xs">
              {progress}%
            </span>
          </div>

          {/* Progress Track */}
          <div className="w-full h-2 rounded-full bg-white/10 p-0.5 overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-75 relative overflow-hidden ${
                targetTheme === 'modern'
                  ? 'bg-gradient-to-r from-[#4c22cf] via-[#7c3aed] to-amber-300'
                  : 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-400'
              }`}
              style={{ width: `${progress}%` }}
            >
              {/* Internal Shimmer Highlight */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-slide" />
            </div>
          </div>
        </div>

        {/* Micro Footer Indicator */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-white/40">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/80" />
          <span>Zero state loss · Instant workspace preservation</span>
        </div>
      </div>
    </aside>
  );
};