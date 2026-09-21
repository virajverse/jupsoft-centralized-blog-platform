'use client';

import React from 'react';
import { 
  ShieldCheck, 
  PenTool, 
  CheckSquare, 
  Send, 
  Search, 
  UserCheck 
} from 'lucide-react';

export const LandingRbac: React.FC = () => {
  const roles = [
    {
      title: 'Super Admin',
      icon: ShieldCheck,
      color: 'from-rose-500 to-amber-500',
      description: 'Full platform ownership, manage tenant websites, assign global user roles, inspect audit logs.',
      badge: 'Level 01',
    },
    {
      title: 'Content Writer',
      icon: PenTool,
      color: 'from-blue-500 to-cyan-500',
      description: 'Draft and edit personal articles using Tiptap Studio, upload media, submit drafts for editorial review.',
      badge: 'Level 02',
    },
    {
      title: 'Editor',
      icon: CheckSquare,
      color: 'from-purple-500 to-indigo-500',
      description: 'Review submitted drafts, leave editorial feedback notes, approve content for publication release.',
      badge: 'Level 03',
    },
    {
      title: 'Publisher',
      icon: Send,
      color: 'from-emerald-500 to-teal-500',
      description: 'Publish approved drafts globally, schedule future releases, trigger HMAC-signed webhook ISR events.',
      badge: 'Level 04',
    },
    {
      title: 'SEO Manager',
      icon: Search,
      color: 'from-amber-500 to-orange-500',
      description: 'Inspect real-time 0-100 SEO scores, configure canonical tags, manage 301 permanent redirect rules.',
      badge: 'Level 05',
    },
  ];

  return (
    <section id="rbac" className="py-20 md:py-28 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#080c14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3">
            Governance & Access Control
          </h2>
          <h3 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            Role-Based Permission Matrix (RBAC)
          </h3>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
            Granular permissions scoped per website tenant, ensuring writers, editors, publishers, and SEO leads operate securely within their domain bounds.
          </p>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((r, i) => {
            const IconComponent = r.icon;
            return (
              <div
                key={i}
                className="p-6 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-tr ${r.color} text-white shadow-md`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                    {r.badge}
                  </span>
                </div>

                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {r.title}
                </h4>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {r.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
