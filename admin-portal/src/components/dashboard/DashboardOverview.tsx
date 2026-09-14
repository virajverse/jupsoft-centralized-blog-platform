'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { 
  FileText, 
  AlertCircle, 
  ArrowUpRight, 
  Plus, 
  Layers, 
  ShieldCheck, 
  Zap,
  Globe,
  Clock,
  ExternalLink,
  ChevronRight,
  Code2,
  ArrowRightLeft,
  Users
} from 'lucide-react';
import { LanguageCode } from '../../types';

const ALL_LANGUAGES: LanguageCode[] = ['en', 'hi', 'fr', 'ar'];

export const DashboardOverview: React.FC = () => {
  const router = useRouter();
  const { 
    blogs, 
    activeWebsiteId, 
    setActiveWebsite,
    websites, 
    activeRole
  } = useBlogStore();

  const isAllSites = activeWebsiteId === 'all';
  const activeSite = websites.find((w) => w.id === activeWebsiteId) || websites[0];
  
  // Isolated vs Global aggregation
  const displayedBlogs = isAllSites ? blogs : blogs.filter((b) => b.websiteId === activeWebsiteId);

  const publishedBlogs = displayedBlogs.filter((b) => b.status === 'Published');
  const underReviewBlogs = displayedBlogs.filter((b) => b.status === 'Under Review');
  const approvedBlogs = displayedBlogs.filter((b) => b.status === 'Approved');
  const draftBlogs = displayedBlogs.filter((b) => b.status === 'Draft');

  // Real word count computation from actual articles
  let totalWords = 0;
  displayedBlogs.forEach((blog) => {
    Object.values(blog.translations).forEach((trans) => {
      if (trans?.content) {
        const plain = trans.content.replace(/<[^>]*>/g, ' ').trim();
        if (plain) {
          totalWords += plain.split(/\s+/).filter(Boolean).length;
        }
      }
    });
  });

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Executive B2B Workspace Header */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-[11px] font-medium text-slate-700 dark:text-slate-300">
              <span className={`w-2 h-2 rounded-full ${
                isAllSites 
                  ? 'bg-cyan-500' 
                  : 'bg-emerald-500'
              }`} />
              <span>
                {isAllSites 
                  ? `Global Control Plane · All ${websites.length} Websites Aggregated`
                  : `Isolated Tenant Boundary · ${activeSite.name}`
                }
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isAllSites ? 'Network-Wide Content Operations' : 'Content Operations'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              {isAllSites ? (
                <>
                  Aggregated overview for <span className="font-semibold text-slate-800 dark:text-slate-200">{websites.length} tenant libraries</span> ({websites.map((s) => s.domain).join(', ')}) with on-demand ISR revalidation and strict tenant isolation.
                </>
              ) : (
                <>
                  Serving <span className="font-semibold text-slate-800 dark:text-slate-200">{activeSite.domain}</span> over Next.js SSR/ISR REST APIs with Redis caching and real-time webhook revalidation.
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href={`/blogs/new?site=${activeWebsiteId}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-medium text-xs shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Article</span>
            </Link>
            <Link
              href={`/workflow?site=${activeWebsiteId}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-medium text-xs border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <Layers className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Workflow ({underReviewBlogs.length})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Articles */}
        <Link
          href={`/blogs?site=${activeWebsiteId}&status=All`}
          className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700 block"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isAllSites ? 'Total Network Articles' : 'Total Articles'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{displayedBlogs.length}</div>
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60">
              {publishedBlogs.length} Live
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {draftBlogs.length} in Draft state
          </div>
        </Link>

        {/* Workflow Attention */}
        <Link
          href={`/workflow?site=${activeWebsiteId}`}
          className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700 block"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Under Review</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{underReviewBlogs.length}</div>
            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60">
              {approvedBlogs.length} Approved
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Awaiting editorial sign-off
          </div>
        </Link>

        {/* Authored Words */}
        <Link
          href={`/analytics?site=${activeWebsiteId}`}
          className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700 block"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Words Authored</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {totalWords.toLocaleString()}
            </div>
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              4 Locales
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Across {displayedBlogs.length} active articles
          </div>
        </Link>

        {/* Network Tenants or SLA */}
        <Link
          href={`/settings?site=${activeWebsiteId}`}
          className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700 block"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isAllSites ? 'Connected Tenants' : 'Architecture SLA'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
              {isAllSites ? <Globe className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isAllSites ? `${websites.length} Sites` : '< 300ms'}
            </div>
            <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60">
              TRD v1.0
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAllSites ? 'Full tenant isolation' : 'Next.js SSR/ISR cache'}
          </div>
        </Link>
      </div>

      {/* Multi-Tenant Comparison Scorecard */}
      {isAllSites && (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Layers className="w-3 h-3 text-slate-500" /> Multi-Tenant Comparison Scorecard
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Connected Websites &amp; Libraries</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any tenant to filter operations down to its independent content boundary
              </p>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Total Network Articles: <strong className="text-slate-900 dark:text-white">{blogs.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-4">Tenant / Website</th>
                  <th className="py-3 px-4">Consumer Domain</th>
                  <th className="py-3 px-4 text-center">Total Articles</th>
                  <th className="py-3 px-4 text-center">Live / Published</th>
                  <th className="py-3 px-4 text-center">In Review</th>
                  <th className="py-3 px-4 text-center">Words Authored</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {websites.map((site) => {
                  const sBlogs = blogs.filter((b) => b.websiteId === site.id);
                  const sPub = sBlogs.filter((b) => b.status === 'Published').length;
                  const sRev = sBlogs.filter((b) => b.status === 'Under Review').length;
                  
                  let sWords = 0;
                  sBlogs.forEach((blog) => {
                    Object.values(blog.translations).forEach((t) => {
                      if (t?.content) {
                        const plain = t.content.replace(/<[^>]*>/g, ' ').trim();
                        if (plain) sWords += plain.split(/\s+/).filter(Boolean).length;
                      }
                    });
                  });

                  return (
                    <tr 
                      key={site.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => {
                        setActiveWebsite(site.id);
                        router.push(`/dashboard?site=${site.id}`);
                      }}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                            {site.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {site.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">UUID: {site.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span>{site.domain}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-900 dark:text-white">
                        {sBlogs.length}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60 text-[11px]">
                          {sPub} Live
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                          sRev > 0 
                            ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60' 
                            : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}>
                          {sRev} Review
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                        {sWords.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveWebsite(site.id);
                            router.push(`/dashboard?site=${site.id}`);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Manage</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Articles */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isAllSites ? 'Recent Network Articles (All Tenants)' : `Articles for ${activeSite.name}`}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAllSites ? 'Live content stream across all connected websites' : 'Independent library scoped to this tenant'}
              </p>
            </div>
            {displayedBlogs.length > 0 && (
              <Link
                href={`/blogs?site=${activeWebsiteId}`}
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
              >
                View All ({displayedBlogs.length}) <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {displayedBlogs.length === 0 ? (
              <div className="py-14 text-center text-slate-500 dark:text-slate-400 space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <FileText className="w-8 h-8 mx-auto text-slate-400" />
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {isAllSites ? 'No articles created in any tenant yet' : 'No articles in this tenant library yet'}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Start drafting your first post with live Tiptap editing, real-time SEO scoring, and multi-language translation.
                </p>
                <Link
                  href={`/blogs/new?site=${activeWebsiteId}`}
                  className="inline-block px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-medium shadow-xs hover:bg-slate-800 cursor-pointer"
                >
                  Create First Article
                </Link>
              </div>
            ) : (
              displayedBlogs.slice(0, 5).map((blog) => {
                const enTrans = blog.translations.en;
                const availableLangs = ALL_LANGUAGES.filter((l) => Boolean(blog.translations[l]?.title));
                const site = websites.find((w) => w.id === blog.websiteId);

                return (
                  <div
                    key={blog.id}
                    onClick={() => router.push(`/blogs/${blog.id}?site=${blog.websiteId}`)}
                    className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl px-2 transition-colors group"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      {blog.featuredImage ? (
                        <img
                          src={blog.featuredImage}
                          alt={blog.featuredImageAlt || 'Cover'}
                          className="w-11 h-11 rounded-lg object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {isAllSites && site && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {site.name}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              blog.status === 'Published'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                                : blog.status === 'Under Review'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                                : blog.status === 'Approved'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {blog.status}
                          </span>
                          <div className="flex items-center gap-1">
                            {availableLangs.map((lang) => (
                              <span
                                key={lang}
                                className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700"
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {enTrans?.title || 'Untitled Post'}
                        </h4>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                          <span>/blog/{enTrans?.slug || 'draft'}</span>
                          <span>&middot;</span>
                          <span>{blog.authorName}</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/blogs/${blog.id}?site=${blog.websiteId}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-medium transition-colors shrink-0"
                    >
                      Edit
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Workflow Pipeline & Delivery Architecture */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                Editorial Pipeline
              </h3>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full font-semibold">
                RBAC Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active Role: <strong className="text-slate-800 dark:text-slate-200">{activeRole}</strong>
            </p>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Drafts in progress</span>
                <span className="font-bold text-slate-900 dark:text-white">{draftBlogs.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
                <span className="text-amber-800 dark:text-amber-300 font-medium">Awaiting Editor Review</span>
                <span className="font-bold text-amber-900 dark:text-amber-200">{underReviewBlogs.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60">
                <span className="text-blue-800 dark:text-blue-300 font-medium">Approved for Publishing</span>
                <span className="font-bold text-blue-900 dark:text-blue-200">{approvedBlogs.length}</span>
              </div>
            </div>

            <Link
              href={`/workflow?site=${activeWebsiteId}`}
              className="w-full mt-2 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              Open Workflow Board <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                Delivery Architecture
              </h3>
              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full font-semibold">
                Operational
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 mt-1.5 shrink-0" />
                <span>Consumer sites fetch via <strong>SSR / ISR REST APIs</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 mt-1.5 shrink-0" />
                <span>Redis cache layer absorbs traffic (&lt; 300ms SLA target).</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 mt-1.5 shrink-0" />
                <span>HMAC webhook sends on-demand revalidation on publish.</span>
              </div>
            </div>
          </div>

          {/* System Control & Developer Hub */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-3 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              Developer &amp; System Hub
            </h3>

            <div className="space-y-1.5 pt-1">
              <Link
                href={`/developers?site=${activeWebsiteId}`}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors border border-slate-200/80 dark:border-slate-800/80 group"
              >
                <div className="flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>REST API Tester &amp; Next.js 15 SDK</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href={`/redirects?site=${activeWebsiteId}`}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors border border-slate-200/80 dark:border-slate-800/80 group"
              >
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
                  <span>301 Permanent Redirects Guard</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href={`/users?site=${activeWebsiteId}`}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors border border-slate-200/80 dark:border-slate-800/80 group"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-purple-500" />
                  <span>Team RBAC Matrix &amp; Invites</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
