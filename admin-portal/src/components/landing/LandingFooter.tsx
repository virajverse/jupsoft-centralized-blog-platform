'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-100/50 dark:bg-[#060911]">
      
      {/* Final Call to Action Box */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          
          <div className="max-w-2xl">
            <span className="text-xs font-mono font-semibold uppercase tracking-widest text-indigo-300 mb-2 block">
              Enterprise Ready
            </span>
            <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
              Ready to centralize your multi-site publishing operations?
            </h3>
            <p className="text-sm sm:text-base text-indigo-200 leading-relaxed">
              Launch the administrative studio now or inspect the Swagger REST API documentation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm shadow-lg transition-all active:scale-95 whitespace-nowrap"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href={process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/docs` : "/api/docs"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-indigo-400/30 bg-indigo-950/50 hover:bg-indigo-900/50 text-white font-medium text-sm transition-all whitespace-nowrap"
            >
              <span>Swagger API Docs</span>
              <ExternalLink className="w-3.5 h-3.5 text-indigo-300" />
            </a>
          </div>

        </div>
      </div>

      {/* Main Footer Links & Metadata */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          
          {/* Logo & Copyright */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                Jupsoft Systems Pvt. Ltd.
              </span>
              <p className="text-xs text-slate-500 font-mono">
                Centralized Multi-Site Blog Management Platform (TRD v1.0 Compliant)
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
            <a href="#features" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
              Capabilities
            </a>
            <a href="#interactive-demo" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
              Playground
            </a>
            <a href="#architecture" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
              Architecture
            </a>
            <a href={process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/docs` : "/api/docs"} target="_blank" rel="noopener noreferrer" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
              API Docs
            </a>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <span>Architected & Maintained for Jupsoft Systems</span>
          <div className="flex items-center gap-1">
            <span>Built with Next.js 16 & NestJS 11</span>
          </div>
        </div>
      </div>

    </footer>
  );
};
