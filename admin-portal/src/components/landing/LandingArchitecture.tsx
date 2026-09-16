'use client';

import React from 'react';
import { 
  Server, 
  Cpu, 
  Database, 
  Layers, 
  Globe, 
  Zap, 
  ShieldCheck, 
  ArrowRight,
  HardDrive
} from 'lucide-react';

export const LandingArchitecture: React.FC = () => {
  return (
    <section id="architecture" className="py-20 md:py-28 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3">
            System Topology & Infrastructure
          </h2>
          <h3 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            Decoupled Multi-Tenant Headless Architecture
          </h3>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
            A single administrative console governs multiple consumer frontend domains via high-speed REST APIs, Redis caching, and HMAC-signed webhooks.
          </p>
        </div>

        {/* Architecture Node Visualizer */}
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            
            {/* Node 1: Admin Frontend */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  <Layers className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Port 3000
                </span>
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  Next.js 16 Admin Portal
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Linear-grade authoring studio, Tiptap editor, Kanban workflow, and real-time SEO score gauge.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Protocol: REST + JWT</span>
                <span className="text-emerald-500 font-semibold">Strict RBAC</span>
              </div>
            </div>

            {/* Node 2: Central Backend Engine */}
            <div className="p-6 rounded-2xl bg-indigo-500/5 dark:bg-indigo-950/20 border-2 border-indigo-500/40 relative space-y-4 shadow-lg shadow-indigo-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-mono font-bold uppercase tracking-wider shadow-md">
                Central Core Engine
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-md">
                  <Cpu className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Port 4000
                </span>
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  NestJS 11 Backend API
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Modular REST controllers, Prisma ORM, Webhook revalidation dispatcher, and rate limiting.
                </p>
              </div>

              {/* Data & Cache Sub-nodes */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-500/20 text-[10px] font-mono">
                <div className="p-2 rounded bg-white/60 dark:bg-slate-900/60 border border-indigo-500/20 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  <span>PostgreSQL 16</span>
                </div>
                <div className="p-2 rounded bg-white/60 dark:bg-slate-900/60 border border-indigo-500/20 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Redis 7 Cache</span>
                </div>
              </div>
            </div>

            {/* Node 3: Consumer Webfronts */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Globe className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Public Frontends
                </span>
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  External Consumer Sites
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Isolated client domains (`jupsoft.com`, `cloud-erp.io`) receiving instant webhook ISR cache updates.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Read Latency</span>
                <span className="text-emerald-500 font-semibold">&lt; 300ms</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
