import React from 'react';
import Link from 'next/link';
import { Home, FileText, Image as ImageIcon, ArrowLeft, ShieldAlert, Settings } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#070b14] px-4 py-12 antialiased select-none">
      <div className="w-full max-w-lg text-center space-y-8">
        {/* Brand Logo Header */}
        <div className="flex justify-center items-center gap-2.5">
          <img
            src="/logoadminapp.png"
            alt="Jupsoft CMS"
            className="h-9 w-auto object-contain"
          />
        </div>

        {/* 404 Hero Illustration Card */}
        <div className="relative bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-xl dark:shadow-2xl overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-red-500/10 dark:bg-red-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative space-y-4">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/50 border border-red-200/80 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-mono font-bold tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>ERROR 404 &bull; ROUTE NOT FOUND</span>
            </div>

            {/* Large 404 Display */}
            <h1 className="text-7xl sm:text-8xl font-black text-slate-900 dark:text-white tracking-tighter font-mono">
              4<span className="text-red-600">0</span>4
            </h1>

            <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Page or Resource Does Not Exist
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              The page you are looking for might have been moved, deleted, or you might not have authorization to view this resource.
            </p>

            {/* Primary Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Return to Dashboard</span>
              </Link>

              <Link
                href="/blogs"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Browse Blogs</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Module Shortcuts */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Quick Navigation
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/blogs"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Blogs</span>
            </Link>
            <Link
              href="/media"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Media Library</span>
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>
          </div>
        </div>

        {/* Footer brand label */}
        <p className="text-[11px] text-slate-400 dark:text-slate-600">
          Jupsoft Centralized Multi-Site Editorial Engine &bull; System Status: Active
        </p>
      </div>
    </div>
  );
}
