'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Globe, 
  CheckCircle2, 
  Layers, 
  Bold, 
  Italic, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Search, 
  Activity, 
  Zap, 
  ShieldCheck,
  Database,
  Cpu,
  Medal,
  Star
} from 'lucide-react';

export const LandingHero: React.FC = () => {
  const [activeTenant, setActiveTenant] = useState('jupsoft.com');
  const [editorText, setEditorText] = useState(
    "Architecture Blueprint 2026: Multi-Tenant Headless Content Hubs powering Next.js consumer frontends from a centralized NestJS 11 API engine."
  );
  const [avgSeoScore, setAvgSeoScore] = useState(85);

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Micro Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370f_1px,transparent_1px),linear-gradient(to_bottom,#1f29370f_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Technology Architecture Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold tracking-wide">
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span>Centralized Multi-Site Content Platform</span>
            <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Headless Cloud Architecture</span>
          </div>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.1] mb-6">
            One Unified Studio.{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-500 dark:from-indigo-400 dark:via-blue-300 dark:to-emerald-400 bg-clip-text text-transparent">
              Unlimited Brands & Sites.
            </span>
          </h1>

          {/* Quality Audit Metric */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Real-Time SEO Audit Engine Active (Average Score: 85/100)</span>
            </div>
          </div>

          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed mb-8">
            Enterprise multi-tenant content management hub designed to write, audit, optimize, and publish content across 10+ client domains in sub-300ms latency.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base shadow-lg shadow-indigo-500/25 transition-all duration-200 active:scale-95"
            >
              <span>Explore Admin Studio</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <a
              href="#architecture"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-medium text-base transition-all duration-200"
            >
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>View System Architecture</span>
            </a>
          </div>
        </div>

        {/* Coded Product Studio Mockup (Zero Fake Images) */}
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl border border-slate-300/80 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-2xl shadow-slate-900/10 dark:shadow-indigo-500/5 overflow-hidden">
            
            {/* Studio Header Bar */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090d16] flex items-center justify-between">
              
              {/* Window Controls & Title */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                </div>
                <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-800 mx-1"></div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Jupsoft Tiptap Editorial Studio v2.4</span>
                </div>
              </div>

              {/* Active Badges */}
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Zap className="w-3 h-3" />
                  ISR Live
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <Database className="w-3 h-3" />
                  Redis 7 Cached
                </span>
              </div>
            </div>

            {/* Tenant Website Tabs */}
            <div className="px-4 pt-2.5 bg-slate-100 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { domain: 'jupsoft.com', name: 'Corporate Main' },
                { domain: 'cloud-erp.io', name: 'Cloud ERP Portal' },
                { domain: 'edtech-schools.org', name: 'EdTech Portal' },
              ].map((site) => (
                <button
                  key={site.domain}
                  onClick={() => setActiveTenant(site.domain)}
                  className={`px-3 py-1.5 rounded-t-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTenant === site.domain
                      ? 'bg-white dark:bg-[#0f172a] text-indigo-600 dark:text-indigo-400 border-t border-x border-slate-200 dark:border-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{site.domain}</span>
                </button>
              ))}
            </div>

            {/* Studio Workspace Content */}
            <div className="p-6">
              
              {/* Tiptap Toolbar Simulator */}
              <div className="mb-4 p-2 rounded-xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <span className="px-2 py-1 rounded bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">H1 Heading</span>
                  <button className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <Bold className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <Italic className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <LinkIcon className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <ImageIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Real-time Live SEO Gauge Meter Badge */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-semibold">
                  <Activity className="w-3.5 h-3.5" />
                  <span>SEO Gauge Score: 96 / 100</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              </div>

              {/* Editor Canvas Input */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>Scope: <strong className="text-indigo-500">{activeTenant}</strong></span>
                  <span>Word Count: 1,420 words</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <textarea
                    value={editorText}
                    onChange={(e) => setEditorText(e.target.value)}
                    rows={3}
                    className="w-full bg-transparent text-slate-800 dark:text-slate-200 font-sans text-sm focus:outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Editorial Workflow Pill Stack */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Lifecycle Stage:</span>
                  <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium border border-purple-500/20">
                    Approved by Senior Editor
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-500 font-mono">
                  <span>Auto WebP S3 Upload: <strong className="text-emerald-500">Enabled</strong></span>
                  <span>•</span>
                  <span>301 Redirect Engine: <strong className="text-emerald-500">Active</strong></span>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
