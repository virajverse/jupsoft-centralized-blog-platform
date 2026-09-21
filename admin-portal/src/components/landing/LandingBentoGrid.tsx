'use client';

import React from 'react';
import { 
  FileEdit, 
  Kanban, 
  GitMerge, 
  Image as ImageIcon, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  ArrowRight,
  Database,
  Search,
  Lock,
  RefreshCw,
  Award  // Added for SEO score
} from 'lucide-react';

export const LandingBentoGrid: React.FC = () => {
  return (
    <section id="features" className="py-20 md:py-28 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3">
            Core Platform Capabilities
          </h2>
          <h3 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            Engineered for Enterprise Content Operations
          </h3>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Four core architectural pillars providing complete control over authoring, editorial review, SEO equity, and automated WebP media pipelines.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card A: Tiptap Editorial Studio (Col Span 2) */}
          <div className="md:col-span-2 relative p-8 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <FileEdit className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-mono text-blue-500 font-semibold uppercase tracking-wider">Editorial</span>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                  Distraction-Free Rich Text Studio
                </h4>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
              Structured block content with rich typography, embedded media, code blocks, zero layout shifts, and real-time telemetry.
            </p>

            {/* Visual Article Preview Mockup */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Live Editor Canvas</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Saved
                </span>
              </div>
              <div className="space-y-1.5">
                <h5 className="text-base font-bold text-slate-900 dark:text-white">
                  Modern Enterprise Content Distribution
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Decoupled headless publishing allows organizations to govern multiple digital touchpoints from a single administrative hub while serving lightweight, cache-optimized pages to end readers.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-slate-400">
                <span>384 Words</span>
                <span>•</span>
                <span>2 Min Read</span>
                <span>•</span>
                <span className="text-indigo-500 font-medium">4 Languages Synced</span>
              </div>
            </div>
          </div>

          {/* Card B: 5-Stage Kanban Workflow (Col Span 1) */}
          <div className="relative p-8 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Kanban className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-mono text-purple-500 font-semibold uppercase tracking-wider">Governance</span>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                    Multi-Stage Editorial Kanban
                  </h4>
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                Guarded editorial pipeline recording timestamps, editor notes, and user roles for complete compliance.
              </p>
            </div>

            {/* Kanban Column Stack Preview */}
            <div className="space-y-2.5">
              {[
                { stage: 'Draft', color: 'bg-slate-500/10 text-slate-500' },
                { stage: 'Under Review', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
                { stage: 'Approved', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
                { stage: 'Scheduled', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
                { stage: 'Published', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 text-xs font-medium">
                  <span className="text-slate-700 dark:text-slate-300">{item.stage}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${item.color}`}>
                    Stage 0{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card C: Smart 301 Redirect Engine (Col Span 1) */}
          <div className="relative p-8 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <GitMerge className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-mono text-emerald-500 font-semibold uppercase tracking-wider">SEO Continuity</span>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                    Automated 301 Redirect Engine
                  </h4>
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                Modifying published slugs automatically writes permanent 301 redirects, preserving search equity and eliminating broken links.
              </p>
            </div>

            {/* Visual Flow Indicator */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-500">
                <span>From Slug:</span>
                <span className="line-through text-rose-500">/old-cloud-erp-post</span>
              </div>
              <div className="flex items-center justify-center py-1 text-emerald-500 font-bold">
                <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> 301 Permanent Redirect
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>To Slug:</span>
                <span className="text-emerald-400 font-semibold">/enterprise-cloud-erp</span>
              </div>
            </div>
          </div>

          {/* Card D: AWS S3 & WebP Pipeline (Col Span 2) */}
          <div className="md:col-span-2 relative p-8 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-mono text-amber-500 font-semibold uppercase tracking-wider">Media Delivery</span>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                  Automated WebP Media & CDN Distribution
                </h4>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
              High-efficiency image processing pipeline with automated WebP conversion, dimension extraction, and distributed edge delivery.
            </p>

            {/* S3 Bucket Path Mockup */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="text-amber-500">s3://jupsoft-blogs/site-cloud/2026/09/architecture.webp</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                85% Compression Saved
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
