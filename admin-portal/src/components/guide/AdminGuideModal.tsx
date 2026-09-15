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
  Sparkles, 
  Tag, 
  Image as ImageIcon, 
  ArrowRightLeft, 
  BarChart3, 
  Users, 
  Code2, 
  Settings, 
  ShieldCheck, 
  Bot, 
  Zap, 
  ExternalLink,
  ChevronRight,
  Shield,
  KeyRound
} from 'lucide-react';

export const AdminGuideModal: React.FC = () => {
  const { isGuideOpen, setGuideOpen, activeRole } = useBlogStore();
  const [activeTab, setActiveTab] = useState<'all' | 'architecture' | 'modules' | 'workflow' | 'seo' | 'mcp' | 'settings'>('all');
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
    const text = `# 🏢 Jupsoft Centralized Blog Platform — Admin Panel Complete Guide
Super Admin Control Center & Multi-Site Operational Manual

## 🎯 1. Admin Panel Kya Hai Aur Kyun Banaya Gaya?
Pehle har website (Jupsoft Cloud, DigifyNext, School ERP) ke alag-alag CMS ya WordPress setup the, jisse:
- Content writers ko alag-alag logins karne padte the.
- SEO standards aur design consistent nahi the.
- Single post ko multiple sites ya multiple languages me manage karna mushkil tha.

### 🌟 Centralized Headless Architecture:
- **Single Source of Truth**: Saara content, media, aur users ek hi backend (localhost:4000) me store hote hain.
- **3 Connected Tenant Websites**:
  1. \`site-cloud\` ➔ Jupsoft Cloud & ERP (localhost:5001)
  2. \`site-growth\` ➔ DigifyNext Marketing (localhost:5002)
  3. \`site-edtech\` ➔ School ERP Platform (localhost:5003)
- **Instant Delivery via Webhooks & Edge Cache**: Jab aap Admin panel me blog publish karte hain, toh consumer websites ko HMAC signed webhook jata hai aur unka cache instantly purge ho jata hai.

---

## 🧭 2. Core Architecture: Scope Switcher (All Domains vs Tenant)
- **Global Scope (\`?site=all\`)**: Saari websites ka aggregate data dikhta hai (total blogs across all sites, pending reviews, overall traffic).
- **Tenant Scope (\`?site=site-cloud\`)**: Specific site filter ho jati hai — Blogs, Categories, Tags, Media, aur 301 Redirects usi site ke dikhte hain.

---

## 📱 3. Har Ek Module Ka Walkthrough (All 12 Modules)

1. **Dashboard (/dashboard)**: Stat cards, attention alerts, live published vs draft metric, quick shortcuts.
2. **All Articles & TipTap Editor (/blogs)**: Rich text editor, multi-language tabs (EN, HI, FR, AR), auto-slug, word counter.
3. **Editorial Workflow Kanban (/workflow)**: 6-Stage sequential pipeline:
   Draft ➔ Under Review ➔ Approved ➔ Published (or Scheduled / Archived).
4. **Automated SEO Audit Engine (0-100 Score)**: 8 real-time checks:
   - Title Length (50-60 chars)
   - Meta Description (150-160 chars)
   - Focus Keyword in Title
   - Focus Keyword in First 100 Words
   - Content Word Count (300+ words)
   - Heading Structure (H1/H2 hierarchy)
   - Image Alt Text validation
   - Robots Directive validation
5. **Taxonomy: Categories & Tags (/taxonomy)**: Hierarchical categories and flat tag keywords scoped per tenant.
6. **Media Asset Library (/media)**: WebP optimization, multi-resolution resizing, presigned S3 uploads, soft-delete.
7. **301 SEO Redirects (/redirects)**: Preserve SEO ranking and link equity when URLs change.
8. **Analytics & Reader Telemetry (/analytics)**: Pageviews, unique visitors, scroll completion depth (25%-100%), traffic referrers.
9. **Team Management & RBAC (/users)**: 7 granular roles (Super Admin, Website Admin, Role Admin, Editor, Content Writer, Publisher, SEO Manager).
10. **Developer Portal & Webhooks (/developers)**: Live interactive API console, Next.js 16 SDK snippets, webhook delivery logs, on-demand cache revalidation.
11. **Tenant & System Settings (/settings)**:
    - Onboard new websites in real-time.
    - **Tenant Live Secret API Key**: Generated via backend crypto & stored in PostgreSQL database. Unmask via Eye icon or regenerate instantly with Rotate Key.
    - Webhook revalidation endpoint configuration.
    - Danger Zone: Cascading website deletion (Super Admin only).
12. **System Audit Trail & Compliance (/settings?tab=audit)**:
    - Immutable audit logs capturing user, role, IP address, event, and timestamp.

---

## ⚡ 4. Real-World Walkthrough: Ek Blog Publish Karne Ka Complete Flow
1. Writer logs in ──> Scope select karta hai ("site-cloud")
2. /blogs/new me Title, Content aur Featured Image dalta hai
3. Focus keyword "Cloud ERP" set karta hai ──> SEO score 85/100 aata hai
4. Hindi Tab me jakar Hindi Translation paste karta hai
5. "Submit for Review" click karta hai ──> Status: Under Review
6. Super Admin / Editor /workflow me jakar review karta hai
7. "Approve" ──> "Publish" click karta hai
8. Backend Database update karta hai ──> Redis cache invalidate karta hai
9. Webhook trigger hota hai ──> localhost:5001 par instant article live ho jata hai!

---

## 🤖 5. Agent Mode (FastMCP Integration)
Viraj, aapne jo 51 Tools wala FastMCP Server banaya hai:
Aap kisi bhi AI agent (Antigravity IDE, Claude, GPT) ko bolenge:
"DigifyNext marketing ke liye AI trends 2026 par ek fresh blog likho, Hindi translation dalo, SEO audit run karo aur direct publish kardo."
Agent bina UI khole backend par saare 51 tools automatically execute kar dega!

---

## 🔒 6. Security: Database vs .env Secrets Architecture
- **Database (Website Table)**: Tenant ID, Domain, Name, API Key, Webhook URL.
- **.env / AWS Secrets Manager**: JWT Secret, Database Password, AWS Keys, HMAC Webhook Secret.
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
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/30 dark:from-[#131b2e] dark:via-[#0d121f] dark:to-[#17152b]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4c22cf] text-white flex items-center justify-center shadow-lg shadow-indigo-950/20 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Jupsoft Centralized Blog Platform
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-[#4c22cf] dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                  Super Admin Manual
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Complete operational guide, architecture reference, and publishing workflows
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
              { id: 'modules', label: '12 Core Modules' },
              { id: 'workflow', label: 'Publishing Flow' },
              { id: 'seo', label: 'SEO Engine' },
              { id: 'settings', label: 'API Keys & Secrets' },
              { id: 'mcp', label: 'AI Agent (MCP)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#4c22cf] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search topics (e.g. SEO, webhook, API key)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1 text-xs rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4c22cf]"
            />
          </div>
        </div>

        {/* Scrollable Manual Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 text-xs leading-relaxed scrollbar-thin">

          {/* Section 1: Introduction & Problem Statement */}
          {(activeTab === 'all' || activeTab === 'architecture') && matchesSearch('admin panel centralized headless architecture tenants') && (
            <div className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs">01</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  🎯 Admin Panel Kya Hai Aur Kyun Banaya Gaya?
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Pehle company ki har website (<strong>Jupsoft Cloud</strong>, <strong>DigifyNext</strong>, <strong>School ERP</strong>) ke alag-alag CMS ya WordPress setup the, jisse:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 ml-2">
                <li>Content writers aur editors ko har site ke liye alag-alag login aur credentials yaad rakhne padte the.</li>
                <li>SEO audit standards, structured data (JSON-LD), aur design language consistent nahi the.</li>
                <li>Ek single post ko multiple sites ya multiple languages (EN, HI, FR, AR) me publish karna almost impossible tha.</li>
              </ul>

              <div className="mt-4 p-4 rounded-xl bg-white dark:bg-[#0d121f] border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  🌟 Centralized Headless Architecture Solution
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
                    <div className="font-bold text-slate-900 dark:text-slate-100 mb-1">Single Source of Truth</div>
                    <p className="text-[11px] text-slate-500">Saara content, media aur user accounts ek centralized backend (<code className="font-mono text-indigo-600">localhost:4000</code>) me manage hote hain.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
                    <div className="font-bold text-slate-900 dark:text-slate-100 mb-1">3 Connected Tenants</div>
                    <p className="text-[11px] text-slate-500">
                      <strong>site-cloud</strong> ➔ ERP (:5001)<br />
                      <strong>site-growth</strong> ➔ Marketing (:5002)<br />
                      <strong>site-edtech</strong> ➔ School (:5003)
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
                    <div className="font-bold text-slate-900 dark:text-slate-100 mb-1">HMAC Instant Purge</div>
                    <p className="text-[11px] text-slate-500">Publish karte hi consumer websites ko SHA-256 HMAC webhook dispatch hota hai aur unka Next.js cache instant refresh ho jata hai.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Scope Switcher */}
          {(activeTab === 'all' || activeTab === 'architecture') && matchesSearch('scope switcher tenant global all domains') && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#4c22cf] text-white font-bold text-xs">02</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  🧭 Core Architecture: Scope Switcher (All Domains vs Tenant)
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Top Navbar aur Sidebar me aapko dynamic <strong>Scope Switcher</strong> milta hai jo poore portal ki state ko switch karta hai:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold mb-1">
                    <Layers className="w-4 h-4" />
                    <span>Global Scope (?site=all)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Super Admin bird&apos;s-eye view: Saari 3 websites ka aggregated data dikhta hai — total published blogs, pending workflow reviews, aur combined telemetry traffic.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold mb-1">
                    <Globe className="w-4 h-4" />
                    <span>Tenant Scope (?site=site-cloud)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Selected site filter ho jati hai — Articles, Categories, Tags, Media Assets, aur 301 Redirects usi single site ke context me display aur edit hote hain.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: All 12 Modules Detailed Walkthrough */}
          {(activeTab === 'all' || activeTab === 'modules') && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs">03</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  📱 Har Ek Module Ka Walkthrough (Complete 12 Modules)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Dashboard */}
                {matchesSearch('dashboard kpi stat cards metrics') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <span>1️⃣ Dashboard (/dashboard)</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                      <li><strong>KPI Stat Cards</strong>: Live blogs count, Under Review items, and Media assets.</li>
                      <li><strong>Recent Articles Table</strong>: Status pills, views, and instant 1-click edit shortcuts.</li>
                      <li><strong>Admin Profile Widget</strong>: Logged-in admin avatar, active role, and assigned domains.</li>
                    </ul>
                  </div>
                )}

                {/* 2. All Articles & TipTap Editor */}
                {matchesSearch('articles editor tiptap multi-language translations') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>2️⃣ Articles &amp; TipTap Editor (/blogs)</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                      <li><strong>TipTap Canvas</strong>: H2/H3 headings, bold, italic, code blocks, images, hyperlinks.</li>
                      <li><strong>Multi-Language (TRD §5)</strong>: Dedicated tabs for English (en), Hindi (hi), Arabic (ar), French (fr).</li>
                      <li><strong>Dynamic Slugs</strong>: Auto-generated SEO friendly slug with manual edit override.</li>
                    </ul>
                  </div>
                )}

                {/* 3. Workflow Kanban */}
                {matchesSearch('workflow kanban review approve publish scheduled') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <Kanban className="w-4 h-4 text-purple-600" />
                      <span>3️⃣ Editorial Kanban Pipeline (/workflow)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      <strong>6 Sequential Stages</strong>: Draft ➔ Under Review ➔ Approved ➔ Published (or Scheduled / Archived). Role-based guard rails ensure writers cannot publish directly without editor sign-off.
                    </p>
                  </div>
                )}

                {/* 4. Automated SEO Engine */}
                {matchesSearch('seo engine audit score checks') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>4️⃣ Real-Time SEO Engine (0-100 Score)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      <strong>8 Real-Time Checks</strong>: Title length (50-60 chars), Meta description (150-160 chars), Keyword in title, Keyword in opening 100 words, 300+ word count, H2/H3 structure, Alt text, and Robots directive.
                    </p>
                  </div>
                )}

                {/* 5. Taxonomy */}
                {matchesSearch('taxonomy categories tags') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <Tag className="w-4 h-4 text-emerald-600" />
                      <span>5️⃣ Taxonomy: Categories &amp; Tags (/taxonomy)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Hierarchical Categories (Parent-Child) and flat Tags. Each tenant maintains isolated categories so School ERP tags never bleed into Jupsoft Cloud.
                    </p>
                  </div>
                )}

                {/* 6. Media Library */}
                {matchesSearch('media library s3 webp upload') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <ImageIcon className="w-4 h-4 text-cyan-600" />
                      <span>6️⃣ Media Asset Library (/media)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Direct drag-and-drop, automated WebP compression, multi-size thumbnail generation, S3 presigned upload pipeline, and soft-delete security.
                    </p>
                  </div>
                )}

                {/* 7. 301 Redirects */}
                {matchesSearch('redirects 301 seo ranking') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <ArrowRightLeft className="w-4 h-4 text-rose-600" />
                      <span>7️⃣ 301 SEO Redirects (/redirects)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Prevents 404 errors and preserves search rankings when slugs change. Maps old URL path to new published slug with permanent 301 status.
                    </p>
                  </div>
                )}

                {/* 8. Analytics */}
                {matchesSearch('analytics telemetry views completion depth') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <BarChart3 className="w-4 h-4 text-violet-600" />
                      <span>8️⃣ Analytics &amp; Telemetry (/analytics)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Visualizes public website views, unique readers, scroll completion rate (25%, 50%, 75%, 100%), and referrers (Google, LinkedIn, Direct).
                    </p>
                  </div>
                )}

                {/* 9. Team & RBAC */}
                {matchesSearch('team users rbac permissions') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <Users className="w-4 h-4 text-orange-600" />
                      <span>9️⃣ Team Management &amp; RBAC (/users)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Multi-tenant Role-Based Access Control: Super Admin, Website Admin, Role Admin, Editor, Content Writer, Publisher, SEO Manager.
                    </p>
                  </div>
                )}

                {/* 10. Developer Portal */}
                {matchesSearch('developers api webhooks rest curl sdk') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <Code2 className="w-4 h-4 text-blue-600" />
                      <span>🔟 Developer API Portal &amp; Webhooks (/developers)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Live interactive REST console, Next.js 16 type-safe SDK snippets, webhook delivery logs with automatic retry queue, and manual cache purge.
                    </p>
                  </div>
                )}

                {/* 11. Tenant & System Settings (Added from Audit) */}
                {matchesSearch('settings tenant api key rotation onboard domain') && (
                  <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
                      <Settings className="w-4 h-4 text-amber-600" />
                      <span>1️⃣1️⃣ Tenant &amp; API Key Settings (/settings)</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                      <li><strong>Tenant Onboarding</strong>: Create new websites on the fly with custom domains and languages.</li>
                      <li><strong>Secret API Key &amp; Rotation</strong>: Database-stored API keys with Eye unmask toggle and 1-click &quot;Rotate Key&quot; feature.</li>
                      <li><strong>Webhook URL Config</strong>: Set custom revalidation endpoints per website.</li>
                    </ul>
                  </div>
                )}

                {/* 12. System Audit Trail (Added from Audit) */}
                {matchesSearch('audit trail compliance logs security') && (
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      <span>1️⃣2️⃣ System Audit Trail (/settings?tab=audit)</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Immutable enterprise audit logs capturing user name, assigned role, client IP address, action (<code className="font-mono text-indigo-600">website.created</code>, <code className="font-mono text-indigo-600">blog.published</code>), and precise timestamp.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 4: Publishing Flow */}
          {(activeTab === 'all' || activeTab === 'workflow') && matchesSearch('publishing flow workflow steps') && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/40 dark:from-purple-950/20 dark:via-[#0d121f] dark:to-indigo-950/20 border border-purple-200 dark:border-purple-900/40 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs">04</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  ⚡ Real-World Walkthrough: Ek Blog Publish Karne Ka Complete Flow
                </h3>
              </div>

              <div className="space-y-2.5">
                {[
                  { step: '1', title: 'Writer Logs In & Selects Scope', desc: 'Scope dropdown se target website select karta hai (e.g. "site-cloud").' },
                  { step: '2', title: 'Create Article (/blogs/new)', desc: 'Title, Content body (TipTap editor), excerpt, aur featured image upload karta hai.' },
                  { step: '3', title: 'Focus Keyword & SEO Audit', desc: 'Focus keyword set karta hai (e.g. "Cloud ERP") — system real-time 8 checks run karke 85/100 score dikhata hai.' },
                  { step: '4', title: 'Multi-Language Translation', desc: 'Hindi (HI) tab me switch karke translated Title aur Content paste karta hai.' },
                  { step: '5', title: 'Submit for Review', desc: 'Button click karta hai — article "Draft" se "Under Review" state me chala jata hai.' },
                  { step: '6', title: 'Editor / Super Admin Review', desc: 'Editorial team /workflow kanban board par article ko check karti hai aur "Approve" karti hai.' },
                  { step: '7', title: 'Publish Triggered', desc: '"Publish Now" click karne par article public database me "Published" mark hota hai.' },
                  { step: '8', title: 'Redis Cache & Edge Invalidation', desc: 'Backend Redis cache ko invalidate karta hai aur HMAC SHA-256 webhook consumer site ko dispatch karta hai.' },
                  { step: '9', title: 'Live on Consumer Site!', desc: 'Target website (e.g. localhost:5001) par bina build restart kiye article instantly live ho jata hai!' },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-[#4c22cf] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
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
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  🔍 Automated SEO Audit Engine (8 Standards)
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Har blog save hone par frontend aur backend dono par yeh 8 algorithmic SEO checks run hote hain:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: '1. Title Length', rule: '50 to 60 characters ideal. Google search results me cut-off prevent karta hai.' },
                  { label: '2. Meta Description', rule: '150 to 160 characters. SERP preview snippet ke liye optimal range.' },
                  { label: '3. Focus Keyword in Title', rule: 'Selected keyword post ke main title ke start ya body me hona chahiye.' },
                  { label: '4. Keyword in Opening 100 Words', rule: 'Search crawlers ko topic context confirm karne ke liye first paragraph me keyword zaroori hai.' },
                  { label: '5. Content Word Count', rule: 'Minimum 300+ words standard article depth ke liye required hain.' },
                  { label: '6. Heading Hierarchy', rule: 'Page par exactly 1 H1 hona chahiye aur structured H2/H3 subheadings hone chahiye.' },
                  { label: '7. Image Alt Attributes', rule: 'Featured image aur embedded content images me descriptive alt text hona mandatory hai.' },
                  { label: '8. Robots Directive', rule: 'Ensure karta hai ki robots meta tag search engines ko page index karne allow kare (index, follow).' },
                ].map((check, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="font-bold text-slate-900 dark:text-slate-200 text-xs mb-0.5">{check.label}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{check.rule}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 6: API Keys & Secrets Architecture */}
          {(activeTab === 'all' || activeTab === 'settings') && matchesSearch('api key rotation secrets env database security') && (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-600 text-white font-bold text-xs">06</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  🔒 Secrets vs Database Configuration Architecture
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                    <KeyRound className="w-4 h-4" />
                    <span>Database System (Website Table)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Tenant specific dynamic configs — Website ID, Domain, Name, Tenant Secret API Key, aur Webhook URL. Naye websites create hone par automatically database me store hote hain bina <code className="font-mono">.env</code> chhue.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-purple-800 dark:text-purple-300">
                    <Shield className="w-4 h-4" />
                    <span>System Secrets (.env / AWS Secrets Manager)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Global infrastructure secrets — <code className="font-mono">JWT_SECRET</code>, <code className="font-mono">DATABASE_URL</code>, <code className="font-mono">WEBHOOK_DEFAULT_SECRET</code>, aur AWS S3 Credentials. Inhe code ya client-side se strictly isolate rakha jata hai.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 7: Agent Mode MCP */}
          {(activeTab === 'all' || activeTab === 'mcp') && matchesSearch('agent mode mcp fastmcp tools autonomous') && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900 to-[#250f6b] text-white space-y-4 shadow-xl">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-white/20 text-white font-bold text-xs">07</span>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-amber-300" />
                  🤖 AI Agent Mode (51 FastMCP Tools Integration)
                </h3>
              </div>
              <p className="text-indigo-100 text-xs leading-relaxed">
                Aapke platform me <strong>51 Tools wala FastMCP Server</strong> configured hai. Aap kisi bhi autonomous AI agent (Antigravity IDE, Claude, GPT-4) ko natural language me prompt dekar poora content lifecycle automate kar sakte hain:
              </p>

              <div className="p-4 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 font-mono text-xs text-amber-200">
                &ldquo;DigifyNext marketing ke liye AI trends 2026 par ek fresh blog likho, Hindi translation dalo, SEO audit run karo aur direct publish kardo.&rdquo;
              </div>

              <p className="text-indigo-200/80 text-[11px]">
                Agent bina browser khole backend ke saare tools (<code className="text-white">create_blog</code>, <code className="text-white">auto_translate</code>, <code className="text-white">audit_seo</code>, <code className="text-white">approve_blog</code>, <code className="text-white">publish_blog</code>) automatically execute karke 30 seconds me post live kar dega!
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            Jupsoft Enterprise CMS v2.0 · Centralized Multi-Site Architecture
          </div>
          <button
            onClick={() => setGuideOpen(false)}
            className="px-5 py-2 rounded-xl bg-[#4c22cf] hover:bg-[#3d1bb0] text-white font-bold text-xs transition-all shadow-md cursor-pointer"
          >
            Got It, Close Manual
          </button>
        </div>
      </div>
    </div>
  );
};
