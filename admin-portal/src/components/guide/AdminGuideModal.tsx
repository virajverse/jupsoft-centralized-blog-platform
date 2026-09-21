'use client';

import React, { useState, useEffect } from 'react';
import { useBlogStore } from '../../store/useBlogStore';
import { 
  BookOpen, 
  X, 
  Search, 
  Copy, 
  Check, 
  Layers, 
  Globe, 
  FileText, 
  Kanban, 
  Tag, 
  Image as ImageIcon, 
  ArrowRightLeft, 
  BarChart3, 
  Users, 
  Settings, 
  ShieldCheck, 
  Zap, 
  ChevronRight,
  Shield,
  KeyRound,
  CheckCircle2,
  Lock,
  Cpu
} from 'lucide-react';

export const AdminGuideModal: React.FC = () => {
  const isGuideOpen = useBlogStore((s) => s.isGuideOpen);
  const setGuideOpen = useBlogStore((s) => s.setGuideOpen);
  const [activeTab, setActiveTab] = useState<'all' | 'architecture' | 'modules' | 'workflow' | 'seo' | 'api' | 'settings'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGuideOpen(false);
    };
    if (isGuideOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isGuideOpen, setGuideOpen]);

  if (!isGuideOpen) return null;

  const copyFullGuide = () => {
    const text = `# 🏢 Jupsoft Centralized Multi-Site Content Engine — Administrator Manual
Super Admin Operations & Architecture Reference

## 1. Centralized Multi-Tenant Architecture Overview
The Jupsoft Centralized Content Platform consolidates editorial and publishing operations across multiple tenant domains into a single unified control hub.

### Core Architectural Principles:
- **Single Source of Truth**: All articles, media assets, categories, and user credentials reside in a central PostgreSQL database.
- **Connected Tenant Properties**:
  1. \`site-cloud\` ➔ Jupsoft Cloud & ERP (cloud.jupsoft.com)
  2. \`site-growth\` ➔ DigifyNext Marketing (digifynext.com)
  3. \`site-edtech\` ➔ School ERP Platform (schoolerp.in)
- **Instant Edge Invalidation**: Publishing or updating articles triggers HMAC-SHA256 signed webhooks to target consumer frontends, immediately purging edge cache without rebuilding or redeploying sites.

---

## 2. Multi-Tenant Scoping: Network vs. Site Scope
- **Global Network Scope (\`?site=all\`)**: Provides an aggregated view of total articles across all client domains, cross-site publishing velocity, pending reviews, and unified telemetry.
- **Tenant Scope (\`?site=site-cloud\`)**: Filters the entire workspace context—including Articles, Taxonomy, Media Library, and 301 Permanent Redirects—strictly to the selected brand domain.

---

## 3. Core Operational Modules Directory

1. **Dashboard (/dashboard)**: High-level KPI metrics, active publications, pending editorial reviews, and recent content stream.
2. **Blog Studio (/blogs)**: Structured article drafting, multi-language tabs (EN, HI, FR, AR), auto-generated SEO slugs, and word count telemetry.
3. **Editorial Workflow Kanban (/workflow)**: 6-Stage sequential pipeline: Draft ➔ Under Review ➔ Approved ➔ Published (or Scheduled / Archived).
4. **Automated SEO Engine**: Real-time 8-point algorithmic quality audit verifying titles, meta descriptions, focus keywords, heading hierarchy, and image alt text.
5. **Taxonomy & Tags (/taxonomy)**: Tenant-isolated category hierarchy and flat keyword tags preventing cross-domain taxonomy bleeding.
6. **Media Asset Library (/media)**: Automated WebP conversion, dimension extraction, secure storage, and soft-delete retention.
7. **301 SEO Redirects (/settings?tab=redirects)**: Preserves search ranking equity and eliminates 404 errors by automating permanent redirects when slugs update.
8. **Analytics Hub (/analytics)**: Real-time reader telemetry, unique visitors, pageview velocity, and author productivity metrics.
9. **Team Management & RBAC (/users)**: 7 granular roles (Super Admin, Website Admin, Role Admin, Editor, Content Writer, Publisher, SEO Manager).
10. **Tenant & System Settings (/settings)**: Domain mapping, cryptographic API key rotation, webhook subscriptions, and storage prefixes.
11. **System Audit Trail (/settings?tab=audit)**: Immutable compliance logs recording user actions, IP addresses, events, and timestamps.

---

## 4. End-to-End Content Publishing Lifecycle
1. **Scope Selection**: Writer selects target domain from the scope selector.
2. **Article Drafting**: Content is authored in the editor canvas with featured media and excerpts.
3. **SEO Optimization**: Focus keyword is assigned, and the 8-point automated audit scores the article.
4. **Multi-Language Translations**: Content is translated and reviewed across supported locale tabs.
5. **Editorial Review**: Writer submits draft; article transitions to "Under Review".
6. **Editorial Approval**: Editor reviews content on Kanban board and approves for release.
7. **Publication & Cache Purge**: Publisher triggers release; backend updates database, clears Redis cache, and fires HMAC webhook.
8. **Instant Edge Availability**: Consumer frontend updates within sub-300ms.

---

## 5. Security Architecture: Database vs. Environment Secrets
- **Database Level (Website Table)**: Tenant IDs, domain mappings, public brand names, secret API keys, and webhook endpoints.
- **Environment Level (.env / Secrets Manager)**: JWT signing keys, PostgreSQL credentials, AWS S3 storage keys, and HMAC signing secrets.
`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="relative w-full max-w-5xl h-[90vh] bg-white dark:bg-[#0d121f] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
      >
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 bg-slate-50/80 dark:bg-[#131b2e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Jupsoft Centralized Content Platform
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">
                  Operations Manual
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Architecture overview, module directory, and publishing workflows
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyFullGuide}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
              title="Copy entire manual in Markdown"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Guide'}</span>
            </button>
            <button
              onClick={() => setGuideOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close guide (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subheader Filter Bar & Search */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Sections' },
              { id: 'architecture', label: 'Architecture & Scopes' },
              { id: 'modules', label: 'Core Modules' },
              { id: 'workflow', label: 'Publishing Lifecycle' },
              { id: 'seo', label: 'SEO Engine' },
              { id: 'settings', label: 'Security & Secrets' },
              { id: 'api', label: 'Headless API & Webhooks' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1 text-xs rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>

        {/* Scrollable Manual Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 text-xs leading-relaxed scrollbar-thin">

          {/* Section 1: Introduction & Architecture */}
          {(activeTab === 'all' || activeTab === 'architecture') && matchesSearch('admin panel centralized headless architecture tenants single source truth') && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#111827]/60 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-600 text-white font-bold text-xs">01</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Centralized Multi-Tenant Architecture Overview
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                The platform consolidates content operations across multiple enterprise properties (<strong>Jupsoft Cloud</strong>, <strong>DigifyNext</strong>, <strong>School ERP</strong>) into an integrated management engine.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Single Source of Truth</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    All articles, media assets, categories, and users are managed in one centralized database engine.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span>Connected Tenant Sites</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Supports isolated brand domains with distinct categories, tags, and media folders.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Instant Edge Cache Purge</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Publishing events automatically trigger signed HMAC webhooks for sub-300ms live site updates.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Scope Switcher */}
          {(activeTab === 'all' || activeTab === 'architecture') && matchesSearch('scope switcher tenant global all domains') && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-600 text-white font-bold text-xs">02</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Scope Management: Global Network vs Tenant Scope
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                The top navigation and sidebar provide a dynamic <strong>Scope Switcher</strong> to seamlessly filter administrative views:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
                    <Layers className="w-4 h-4" />
                    <span>Global Scope (?site=all)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Network-wide visibility: aggregated metrics, total publication counts, review queues across all domains, and cross-site telemetry.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold mb-1">
                    <Globe className="w-4 h-4" />
                    <span>Tenant Scope (?site=site-cloud)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Domain-specific workspace: articles, taxonomies, media assets, and 301 redirects are strictly partitioned to the selected tenant.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Core Modules Directory */}
          {(activeTab === 'all' || activeTab === 'modules') && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs">03</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Core Operational Modules Directory
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Dashboard */}
                {matchesSearch('dashboard kpi stat cards metrics') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <span>1. Dashboard (/dashboard)</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                      <li><strong>Scorecard Metrics</strong>: Live published articles, under review queue, draft totals, and word volume.</li>
                      <li><strong>Recent Editorial Stream</strong>: Fast-action table with instant edit shortcuts and language coverage.</li>
                      <li><strong>Tenant Infrastructure</strong>: Connected domain statuses and quick links.</li>
                    </ul>
                  </div>
                )}

                {/* 2. Blog Studio */}
                {matchesSearch('articles editor tiptap multi-language translations') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>2. Blog Studio &amp; Content Editor (/blogs)</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                      <li><strong>Structured Editor</strong>: Headings, block formatting, hyperlinks, and embedded media assets.</li>
                      <li><strong>Multi-Language Support</strong>: Independent translation tabs for English, Hindi, Arabic, and French.</li>
                      <li><strong>Auto-Generated Slugs</strong>: Dynamic SEO slug generation with manual override.</li>
                    </ul>
                  </div>
                )}

                {/* 3. Workflow Kanban */}
                {matchesSearch('workflow kanban review approve publish scheduled') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <Kanban className="w-4 h-4 text-purple-600" />
                      <span>3. Editorial Workflow Kanban (/workflow)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      <strong>6 Sequential Stages</strong>: Draft ➔ Under Review ➔ Approved ➔ Published (or Scheduled / Archived). Granular RBAC ensures content writers cannot release articles without editorial approval.
                    </p>
                  </div>
                )}

                {/* 4. Automated SEO Engine */}
                {matchesSearch('seo engine audit score checks') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>4. Real-Time SEO Quality Engine</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      <strong>8 Quality Standards</strong>: Title length, meta description character limits, focus keyword placement, minimum word depth, heading structure, image alt text, and indexability tags.
                    </p>
                  </div>
                )}

                {/* 5. Taxonomy */}
                {matchesSearch('taxonomy categories tags') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <Tag className="w-4 h-4 text-emerald-600" />
                      <span>5. Taxonomy &amp; Tags Engine (/taxonomy)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Hierarchical Categories (Parent/Child trees) and flat Tags. Each tenant maintains isolated taxonomies to keep brand content clearly structured.
                    </p>
                  </div>
                )}

                {/* 6. Media Library */}
                {matchesSearch('media library s3 webp upload') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <ImageIcon className="w-4 h-4 text-cyan-600" />
                      <span>6. Media Asset Library (/media)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Drag-and-drop asset management, automated WebP compression, dimension metadata extraction, and multi-tenant folder isolation.
                    </p>
                  </div>
                )}

                {/* 7. 301 Redirects */}
                {matchesSearch('redirects 301 seo ranking') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <ArrowRightLeft className="w-4 h-4 text-rose-600" />
                      <span>7. 301 SEO Redirects (/settings?tab=redirects)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Preserves search rankings and eliminates broken links by automating permanent 301 redirect rules when article slugs change.
                    </p>
                  </div>
                )}

                {/* 8. Analytics */}
                {matchesSearch('analytics telemetry views completion depth') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <BarChart3 className="w-4 h-4 text-violet-600" />
                      <span>8. Analytics &amp; Telemetry (/analytics)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Tracks public reader engagement, unique views, publication velocity trends, and author productivity metrics.
                    </p>
                  </div>
                )}

                {/* 9. Team & RBAC */}
                {matchesSearch('team users rbac permissions') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <Users className="w-4 h-4 text-orange-600" />
                      <span>9. Team Management &amp; RBAC (/users)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Role-Based Access Control: Super Admin, Website Admin, Role Admin, Editor, Content Writer, Publisher, and SEO Manager.
                    </p>
                  </div>
                )}

                {/* 10. Tenant Settings */}
                {matchesSearch('settings tenant api key rotation onboard domain') && (
                  <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
                      <Settings className="w-4 h-4 text-amber-600" />
                      <span>10. Tenant Configuration &amp; API Keys (/settings)</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                      <li><strong>Tenant Onboarding</strong>: Create new website properties with custom domains and languages.</li>
                      <li><strong>API Key Management</strong>: Secure tenant API key generation with 1-click rotation.</li>
                      <li><strong>Webhook Endpoints</strong>: Configure cache revalidation webhook targets per domain.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 4: Publishing Lifecycle */}
          {(activeTab === 'all' || activeTab === 'workflow') && matchesSearch('publishing flow workflow steps') && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#111827]/60 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs">04</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Content Publishing Lifecycle
                </h3>
              </div>

              <div className="space-y-2.5">
                {[
                  { step: '1', title: 'Scope Selection', desc: 'Select the target website domain from the global scope selector.' },
                  { step: '2', title: 'Draft Authoring', desc: 'Draft article content in the editor canvas, adding excerpts and featured media.' },
                  { step: '3', title: 'SEO Optimization', desc: 'Assign a focus keyword and run real-time checks to achieve an optimal quality score.' },
                  { step: '4', title: 'Multi-Language Localization', desc: 'Add translations across supported locale tabs (EN, HI, FR, AR).' },
                  { step: '5', title: 'Editorial Review Submission', desc: 'Submit the completed draft, transitioning status to "Under Review".' },
                  { step: '6', title: 'Editorial Approval', desc: 'Reviewers inspect content on the Kanban board and mark it "Approved".' },
                  { step: '7', title: 'Production Release Trigger', desc: 'Publisher triggers release, updating the database and publishing status.' },
                  { step: '8', title: 'Edge Cache Invalidation', desc: 'Backend clears Redis cache and dispatches an HMAC-signed webhook to the consumer frontend.' },
                  { step: '9', title: 'Live on Public Domain', desc: 'Consumer website serves updated article content with sub-300ms read latency.' },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {s.step}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{s.title}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: SEO Engine */}
          {(activeTab === 'all' || activeTab === 'seo') && matchesSearch('seo checks title meta keyword alt robots') && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs">05</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Automated SEO Quality Standards (8 Benchmarks)
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Every article is evaluated against 8 real-time algorithmic quality checks:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: '1. Title Length', rule: 'Optimal between 50 and 60 characters to prevent SERP truncation.' },
                  { label: '2. Meta Description', rule: 'Optimal between 150 and 160 characters for complete SERP snippet previews.' },
                  { label: '3. Focus Keyword in Title', rule: 'Target search query must be present in the article headline.' },
                  { label: '4. Keyword in Opening 100 Words', rule: 'Search crawlers require immediate topic context in introductory paragraphs.' },
                  { label: '5. Content Depth & Length', rule: 'Minimum 300+ words required for topical depth and search indexing.' },
                  { label: '6. Heading Structure', rule: 'Exactly one H1 element followed by properly nested H2 and H3 subheadings.' },
                  { label: '7. Image Alt Text Attributes', rule: 'All cover photos and embedded images must include descriptive alt attributes.' },
                  { label: '8. Indexing Directives', rule: 'Verifies robots directives allow proper search engine crawling (index, follow).' },
                ].map((check, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="font-bold text-slate-900 dark:text-slate-200 text-xs mb-0.5">{check.label}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{check.rule}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 6: Security Architecture */}
          {(activeTab === 'all' || activeTab === 'settings') && matchesSearch('api key rotation secrets env database security') && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-600 text-white font-bold text-xs">06</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Security Architecture: Database vs Infrastructure Secrets
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                    <KeyRound className="w-4 h-4" />
                    <span>Database Configuration (Website Table)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Tenant-scoped settings—Website ID, domain mapping, tenant secret API keys, and webhook URLs. Adding new websites stores credentials dynamically without modifying environment files.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-purple-800 dark:text-purple-300">
                    <Shield className="w-4 h-4" />
                    <span>System Secrets (.env / Cloud Secret Store)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Infrastructure-level secrets—<code className="font-mono text-indigo-600 dark:text-indigo-400">JWT_SECRET</code>, <code className="font-mono text-indigo-600 dark:text-indigo-400">DATABASE_URL</code>, and AWS credentials. Strictly isolated from client-side bundles.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 7: Headless API & Webhooks */}
          {(activeTab === 'all' || activeTab === 'api') && matchesSearch('api webhooks headless integration revalidation') && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#111827]/60 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs">07</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-500" />
                  Headless API &amp; Webhook Integration
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                The platform exposes REST API endpoints for headless consumer frontends and automated editorial workflows:
              </p>

              <div className="p-4 rounded-xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <div><span className="text-emerald-600 font-bold">POST</span> /api/blogs ── Create content programmatically</div>
                <div><span className="text-blue-600 font-bold">GET</span> /api/public/blogs/:slug ── Fetch published article by slug</div>
                <div><span className="text-amber-600 font-bold">POST</span> /api/revalidate ── HMAC-signed ISR revalidation webhook</div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            Jupsoft Enterprise Content Management Platform
          </div>
          <button
            onClick={() => setGuideOpen(false)}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
          >
            Close Manual
          </button>
        </div>
      </div>
    </div>
  );
};
