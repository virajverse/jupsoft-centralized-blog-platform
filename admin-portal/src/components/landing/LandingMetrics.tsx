'use client';

import React from 'react';
import { Zap, Shield, Globe2, Languages } from 'lucide-react';

export const LandingMetrics: React.FC = () => {
  const metrics = [
    {
      value: '< 300ms',
      label: 'Public Read Latency',
      sublabel: 'Redis 7 ElastiCache Public Read TTL',
      icon: Zap,
      color: 'from-amber-500 to-orange-500',
    },
    {
      value: '100%',
      label: 'Zero-CLS & Web Vitals',
      sublabel: 'Lighthouse 95+ Performance Target',
      icon: Shield,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      value: '10+ Sites',
      label: 'Multi-Tenant Scoping',
      sublabel: 'Isolated Domains & S3 Prefixes',
      icon: Globe2,
      color: 'from-indigo-500 to-purple-500',
    },
    {
      value: '4 Native',
      label: 'Translation Languages',
      sublabel: 'EN, HI, FR, AR with RTL Support',
      icon: Languages,
      color: 'from-blue-500 to-indigo-500',
    },
  ];

  return (
    <section className="py-12 border-y border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#080c14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {metrics.map((m, i) => {
            const IconComponent = m.icon;
            return (
              <div
                key={i}
                className="relative p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
                    {m.value}
                  </span>
                  <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${m.color} text-white shadow-md`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                </div>
                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  {m.label}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {m.sublabel}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
