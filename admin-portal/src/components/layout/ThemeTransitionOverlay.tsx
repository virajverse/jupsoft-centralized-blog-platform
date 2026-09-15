'use client';

import React, { useEffect, useState } from 'react';
import { useBlogStore } from '../../store/useBlogStore';
import { Sparkles, Layout, ArrowRight, Zap, Layers, CheckCircle2 } from 'lucide-react';

export const ThemeTransitionOverlay: React.FC = () => {
  const { isUiThemeSwitching, uiThemeSwitchTarget } = useBlogStore();
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Target theme determination
  const targetTheme = uiThemeSwitchTarget || 'modern';
  const isToModern = targetTheme === 'modern';

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

  // Live status ticker based on progress
  let phaseText = 'Initializing layout engine...';
  if (progress >= 25 && progress < 60) {
    phaseText = isToModern 
      ? 'Mounting royal purple canvas & curved navigation...' 
      : 'Switching to dense enterprise data grid...';
  } else if (progress >= 60 && progress < 88) {
    phaseText = isToModern 
      ? 'Applying responsive cards & ergonomic widgets...' 
      : 'Restoring classic workspace & technical workbench...';
  } else if (progress >= 88) {
    phaseText = isToModern ? 'Modern UI Ready!' : 'Classic UI Ready!';
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
        {isToModern ? (
          <>
            <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full bg-[#4c22cf]/30 blur-[120px] animate-pulse-glow" />
            <div className="absolute -bottom-32 right-1/4 w-[450px] h-[450px] rounded-full bg-[#7c3aed]/25 blur-[120px] animate-pulse-glow" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-amber-400/10 blur-[90px] animate-float-gentle" />
          </>
        ) : (
          <>
            <div className="absolute -top-32 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/20 blur-[120px] animate-pulse-glow" />
            <div className="absolute -bottom-32 left-1/4 w-[450px] h-[450px] rounded-full bg-indigo-600/25 blur-[120px] animate-pulse-glow" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-blue-500/10 blur-[90px] animate-float-gentle" />
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
          <Zap className={`w-3.5 h-3.5 ${isToModern ? 'text-amber-300' : 'text-cyan-400'}`} />
          <span>{isToModern ? 'Transforming to Modern UI' : 'Switching to Classic UI'}</span>
        </div>

        {/* Interactive Motion Node Flow (Source -> Laser Beam -> Destination Hero) */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 my-3 w-full">
          {/* Source Node (Previous Mode) */}
          <div className="flex flex-col items-center gap-2 opacity-50 scale-95 transition-opacity">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white/70 shadow-inner">
              {isToModern ? (
                <Layout className="w-5 h-5 text-slate-300" />
              ) : (
                <Sparkles className="w-5 h-5 text-amber-300" />
              )}
            </div>
            <span className="text-[10px] font-semibold text-white/50 tracking-wider uppercase">
              {isToModern ? 'Classic' : 'Modern'}
            </span>
          </div>

          {/* Energy Pulse Laser Beam Channel */}
          <div className="flex-1 max-w-[120px] sm:max-w-[140px] flex flex-col items-center gap-1">
            <div className="w-full h-1.5 rounded-full bg-white/10 relative overflow-hidden">
              <div 
                className={`absolute inset-y-0 w-16 rounded-full animate-beam-travel ${
                  isToModern 
                    ? 'bg-gradient-to-r from-[#4c22cf] via-amber-300 to-white shadow-[0_0_12px_#4c22cf]' 
                    : 'bg-gradient-to-r from-cyan-500 via-blue-400 to-white shadow-[0_0_12px_#06b6d4]'
                }`}
              />
            </div>
            <ArrowRight className={`w-4 h-4 animate-pulse ${isToModern ? 'text-amber-300/80' : 'text-cyan-400/80'}`} />
          </div>

          {/* Destination Hero Node (Target Mode) */}
          <div className="flex flex-col items-center gap-2 relative scale-105">
            {/* Pulsing orbital aura behind hero node */}
            <div 
              className={`absolute -inset-2 rounded-3xl blur-md opacity-60 animate-pulse ${
                isToModern ? 'bg-[#4c22cf]' : 'bg-cyan-500'
              }`} 
            />

            <div 
              className={`w-14 h-14 rounded-2xl flex items-center justify-center relative z-10 shadow-xl transition-transform ${
                isToModern 
                  ? 'bg-gradient-to-br from-[#4c22cf] to-[#7c3aed] text-white border-2 border-indigo-300/40 shadow-indigo-500/50' 
                  : 'bg-gradient-to-br from-slate-900 to-[#1e293b] text-cyan-300 border-2 border-cyan-400/50 shadow-cyan-500/40'
              }`}
            >
              {isToModern ? (
                <Sparkles className="w-7 h-7 text-amber-300" />
              ) : (
                <Layout className="w-7 h-7 text-cyan-400" />
              )}
            </div>

            <span className={`text-[11px] font-black tracking-wider uppercase ${isToModern ? 'text-amber-300' : 'text-cyan-300'}`}>
              {isToModern ? 'Modern' : 'Classic'}
            </span>
          </div>
        </div>

        {/* Dynamic Title & Subtitle */}
        <div className="mt-5 space-y-1.5">
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            {isToModern ? (
              <>
                <span>Activating Modern UI</span>
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              </>
            ) : (
              <>
                <span>Restoring Classic Studio</span>
                <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
              </>
            )}
          </h3>
          <p className="text-xs text-white/60 max-w-xs mx-auto leading-relaxed">
            {isToModern 
              ? 'Fluid curved canvas, ergonomic cards & royal purple theme' 
              : 'High-density operational data tables & compact workbench'}
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
                isToModern
                  ? 'bg-gradient-to-r from-[#4c22cf] via-[#7c3aed] to-amber-300'
                  : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500'
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