'use client';

import React from 'react';
import { Cpu, Server, Database, Zap, Code, ShieldCheck, Box } from 'lucide-react';

export const LandingTechStack: React.FC = () => {
  const stack = [
    { name: 'Next.js 16.3.5', role: 'Admin Studio & SSR/ISR', category: 'Frontend' },
    { name: 'NestJS 11', role: 'Modular REST API & RBAC', category: 'Backend' },
    { name: 'Tailwind CSS v4', role: 'Obsidian Design System', category: 'Styling' },
    { name: 'Prisma ORM', role: 'Type-Safe Schema & Migrations', category: 'Database' },
    { name: 'PostgreSQL 16', role: 'Relational Source of Truth', category: 'Database' },
    { name: 'Redis Cache', role: 'Sub-300ms High-Throughput Layer', category: 'Cache' },
    { name: 'AWS S3 & CloudFront', role: 'WebP Image Pipeline & CDN', category: 'Storage' },
    { name: 'Tiptap WYSIWYG', role: 'Structured Content Studio', category: 'Editor' },
    { name: 'Zustand 5', role: 'Client State & Website Scoping', category: 'State' },
    { name: 'Docker Compose', role: 'Containerized Infrastructure', category: 'DevOps' },
  ];

  return (
    <section id="tech-stack" className="py-20 md:py-28 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3">
            Platform Infrastructure
          </h2>
          <h3 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            Production Technology Matrix
          </h3>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
            Engineered with modern decoupled services, strict schema validation, and high-performance edge caching.
          </p>
        </div>

        {/* Tech Stack Chips Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stack.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-500/50 transition-colors"
            >
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-semibold mb-2 inline-block">
                  {item.category}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {item.name}
                </h4>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {item.role}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
