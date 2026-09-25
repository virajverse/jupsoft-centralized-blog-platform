'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  AlertCircle,
  Plus,
  Globe,
  Clock,
  ExternalLink,
  ChevronRight,
  ArrowRightLeft,
  Kanban,
  CheckCircle2,
  Users,
  Settings,
  TrendingUp,
  Radio,
  BookOpen
} from 'lucide-react';
import { Blog, Website, UserAccount, UserRole, LanguageCode } from '../../types';
import { canCreateBlog, canAccessModule, cleanAvatarUrl } from '../../utils/permissions';
import { apiClient } from '../../services/apiClient';

interface ZohoDashboardViewProps {
  blogs: Blog[];
  displayedBlogs: Blog[];
  publishedBlogs: Blog[];
  underReviewBlogs: Blog[];
  approvedBlogs: Blog[];
  draftBlogs: Blog[];
  totalWords: number;
  websites: Website[];
  activeWebsiteId: string;
  activeSite: Website;
  isAllSites: boolean;
  activeRole: UserRole;
  currentUser: UserAccount;
  isLoading?: boolean;
}

const ALL_LANGUAGES: LanguageCode[] = ['en', 'hi', 'fr', 'ar'];

export const ZohoDashboardView: React.FC<ZohoDashboardViewProps> = ({
  blogs,
  displayedBlogs,
  publishedBlogs,
  underReviewBlogs,
  approvedBlogs,
  draftBlogs,
  totalWords,
  websites,
  activeWebsiteId,
  activeSite,
  isAllSites,
  activeRole,
  currentUser,
  isLoading,
}) => {
  const router = useRouter();
  const siteQuery = `?site=${activeWebsiteId}`;

  // Recent 8 blogs
  const recentBlogs = [...displayedBlogs]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  const scheduledBlogs = displayedBlogs.filter((b) => b.status === 'Scheduled');

  if (isLoading) {
    return (
      <div className="space-y-3 font-sans text-slate-800 dark:text-slate-200 animate-in fade-in duration-150">
        {/* Context Strip Skeleton */}
        <div className="h-9 px-3 py-2 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500/40 shrink-0" />
            <div className="w-36 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="w-24 h-3 bg-slate-100 dark:bg-slate-850 rounded hidden sm:block" />
          </div>
          <div className="w-20 h-5 bg-red-600/30 rounded" />
        </div>

        {/* 4 Scorecards Shimmer */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-3 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="w-16 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-5 h-5 bg-slate-100 dark:bg-slate-800 rounded-full" />
              </div>
              <div className="w-12 h-6 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-24 h-2 bg-slate-100 dark:bg-slate-850 rounded" />
            </div>
          ))}
        </div>

        {/* Two-Column Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 p-3 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg space-y-2.5 animate-pulse">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                <div className="w-1/2 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-16 h-4 bg-slate-100 dark:bg-slate-850 rounded-full" />
              </div>
            ))}
          </div>

          <div className="p-3 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 animate-pulse">
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1 py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <div className="w-3/4 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-1/3 h-2 bg-slate-100 dark:bg-slate-850 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-sans text-slate-800 dark:text-slate-200">
      {/* Top Compact Action & Context Strip (Height ~36px) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
            {isAllSites ? 'Network Content Matrix' : activeSite?.name || 'Website Workspace'}
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
            {isAllSites ? `${websites.length} Connected Domains` : activeSite?.domain}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {canCreateBlog(activeRole) && (
            <Link
              href={`/blogs/new${siteQuery}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Blog</span>
            </Link>
          )}
        </div>
      </div>

      {/* Zoho Signature Compact Metrics Grid (4 in a row, ~64px height) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {/* Metric 1: Total Blogs */}
        <Link
          href={`/blogs${siteQuery}`}
          className="p-2.5 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg hover:border-red-400 dark:hover:border-red-500 transition-colors group block"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Total Blogs</span>
            <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 transition-colors" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {displayedBlogs.length}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">100% Total</span>
          </div>
        </Link>

        {/* Metric 2: Published */}
        <Link
          href={`/blogs${siteQuery}&status=Published`}
          className="p-2.5 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors group block"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Published</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {publishedBlogs.length}
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              {displayedBlogs.length > 0 ? Math.round((publishedBlogs.length / displayedBlogs.length) * 100) : 0}% Live
            </span>
          </div>
        </Link>

        {/* Metric 3: Under Review */}
        <Link
          href={`/blogs${siteQuery}&status=Under%20Review`}
          className="p-2.5 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg hover:border-amber-400 dark:hover:border-amber-500 transition-colors group block"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>In Review</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {underReviewBlogs.length}
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
              {underReviewBlogs.length > 0 ? 'Action Req' : 'Clear'}
            </span>
          </div>
        </Link>

        {/* Metric 4: Drafts & Scheduled */}
        <Link
          href={`/blogs${siteQuery}&status=Draft`}
          className="p-2.5 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors group block"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Drafts / Sched</span>
            <Clock className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-700 dark:text-slate-300 tracking-tight">
              {draftBlogs.length + scheduledBlogs.length}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {draftBlogs.length} d · {scheduledBlogs.length} s
            </span>
          </div>
        </Link>

        {/* Metric 5: Word Count / Content Volume */}
        <div className="p-2.5 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Total Words</span>
            <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
              {totalWords.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Published Words</span>
          </div>
        </div>
      </div>

      {/* Main Split-Screen Data Grid (Recent Editorial Pipeline + Multi-Tenant Infrastructure) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-2.5 items-start">
        {/* Left 2 Cols: Compact Spreadsheet Recent Blogs Table */}
        <div className="xl:col-span-2 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Recent Editorial Stream
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                {recentBlogs.length} items
              </span>
            </div>

            <Link
              href={`/blogs${siteQuery}`}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-0.5 transition-colors"
            >
              <span>View All</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/30 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2 px-3">Title & Slug</th>
                  {isAllSites && <th className="py-2 px-2.5">Tenant</th>}
                  <th className="py-2 px-2.5">Status</th>
                  <th className="py-2 px-2.5">Author</th>
                  <th className="py-2 px-2.5">Languages</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {recentBlogs.map((blog) => {
                  const defaultTrans = blog.translations['en'] || Object.values(blog.translations)[0];
                  const tenant = websites.find((w) => w.id === blog.websiteId);
                  const availableLangs = ALL_LANGUAGES.filter((l) => blog.translations[l]);

                  return (
                    <tr
                      key={blog.id}
                      onMouseEnter={() => {
                        try {
                          const existing = sessionStorage.getItem(`jupsoft_editing_blog_${blog.id}`);
                          if (!existing) {
                            apiClient.getBlogById(blog.id).then((full) => {
                              if (full) sessionStorage.setItem(`jupsoft_editing_blog_${blog.id}`, JSON.stringify(full));
                            }).catch(() => {});
                          }
                        } catch {}
                      }}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors h-9"
                    >
                      {/* Title & Slug */}
                      <td className="py-1.5 px-3 max-w-[220px]">
                        <div className="truncate font-semibold text-slate-900 dark:text-slate-100 hover:text-red-600 text-xs">
                          <Link 
                            href={`/blogs/${blog.id}${siteQuery}`}
                            prefetch={true}
                            onClick={() => {
                              try {
                                sessionStorage.setItem(`jupsoft_editing_blog_${blog.id}`, JSON.stringify(blog));
                              } catch {}
                            }}
                          >
                            {defaultTrans?.title || 'Untitled Blog'}
                          </Link>
                        </div>
                        <div className="truncate text-[10px] text-slate-400 font-mono">
                          /{defaultTrans?.slug || blog.id}
                        </div>
                      </td>

                      {/* Tenant (If All Sites) */}
                      {isAllSites && (
                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                            {tenant?.name?.replace(/Jupsoft | Platform/g, '') || 'Custom'}
                          </span>
                        </td>
                      )}

                      {/* Status Pill */}
                      <td className="py-1.5 px-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          blog.status === 'Published'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : blog.status === 'Under Review'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                            : blog.status === 'Approved'
                            ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            blog.status === 'Published' ? 'bg-emerald-500' :
                            blog.status === 'Under Review' ? 'bg-amber-500' :
                            blog.status === 'Approved' ? 'bg-cyan-500' : 'bg-slate-400'
                          }`} />
                          {blog.status}
                        </span>
                      </td>

                      {/* Author */}
                      <td className="py-1.5 px-2.5 whitespace-nowrap text-[11px] text-slate-600 dark:text-slate-400">
                        {blog.authorName}
                      </td>

                      {/* Languages */}
                      <td className="py-1.5 px-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-0.5">
                          {availableLangs.map((lang) => (
                            <span
                              key={lang}
                              className="text-[9px] font-mono font-bold px-1 py-0.1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-1.5 px-3 text-right whitespace-nowrap">
                        <Link
                          href={`/blogs/${blog.id}${siteQuery}`}
                          prefetch={true}
                          onClick={() => {
                            try {
                              sessionStorage.setItem(`jupsoft_editing_blog_${blog.id}`, JSON.stringify(blog));
                            } catch {}
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Multi-Tenant Infrastructure & Quick Ops */}
        <div className="space-y-2.5">
          {/* Active Websites Status Card */}
          <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                Connected Tenants
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {websites.length} Active
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {websites.map((site) => {
                const count = blogs.filter((b) => b.websiteId === site.id).length;
                const isSelected = activeWebsiteId === site.id;

                return (
                  <div
                    key={site.id}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
                        : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate">{site.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {site.domain}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                        {count}
                      </span>
                      <div className="text-[9px] text-slate-400">blogs</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick System Links */}
          <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              System Workbench
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Link
                href={`/workflow${siteQuery}`}
                className="flex items-center gap-1.5 p-2 rounded bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors"
              >
                <Kanban className="w-3.5 h-3.5 text-amber-500" />
                <span>Review Kanban</span>
              </Link>

              <Link
                href={`/taxonomy${siteQuery}`}
                className="flex items-center gap-1.5 p-2 rounded bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors"
              >
                <Radio className="w-3.5 h-3.5 text-purple-500" />
                <span>Taxonomy</span>
              </Link>

              <Link
                href={`/settings${siteQuery}&tab=redirects`}
                className="flex items-center gap-1.5 p-2 rounded bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
                <span>301 Rules</span>
              </Link>

              <Link
                href={`/settings${siteQuery}`}
                className="flex items-center gap-1.5 p-2 rounded bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
