'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log exception for audit logs
    console.error('Next.js caught runtime render error:', error);
  }, [error]);

  const handleRecover = () => {
    try {
      reset();
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#080c14] p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 text-center space-y-6">
        
        {/* Brand Header Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
          <AlertTriangle className="w-7 h-7" />
        </div>

        {/* Informational Message */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Jupsoft CMS Resilience Shield</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Workspace Temporarily Interrupted
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            The application intercepted a render update. Your data and draft articles are safe in the central datastore.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <button
            onClick={handleRecover}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recover Workspace</span>
          </button>

          <Link
            href="/dashboard"
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Developer Diagnostics Disclosure */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] font-mono text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
          >
            <span>{showDetails ? 'Hide Diagnostics' : 'Diagnostics & Digest'}</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showDetails && (
            <div className="mt-3 text-left p-3 rounded-lg bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-400 space-y-1.5 break-all max-h-40 overflow-y-auto">
              <div className="font-semibold text-rose-600 dark:text-rose-400">
                {error.name}: {error.message || 'Unknown Exception'}
              </div>
              {error.digest && (
                <div className="text-slate-500">Digest: {error.digest}</div>
              )}
              {error.stack && (
                <pre className="text-[9px] text-slate-400 whitespace-pre-wrap mt-1 max-h-24 overflow-y-auto">
                  {error.stack}
                </pre>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
