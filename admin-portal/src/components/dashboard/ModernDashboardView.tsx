'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  AlertCircle,
  ArrowUpRight,
  Plus,
  Layers,
  Zap,
  Globe,
  ChevronRight,
  Mail,
  Phone
} from 'lucide-react';
import { Blog, Website, UserRole } from '../../types';
import { canCreateBlog, canAccessModule, cleanAvatarUrl } from '../../utils/permissions';

interface ModernDashboardViewProps {
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
  currentUser: any;
}

export const ModernDashboardView: React.FC<ModernDashboardViewProps> = ({
  displayedBlogs,
  publishedBlogs,
  underReviewBlogs,
  draftBlogs,
  totalWords,
  websites,
  activeWebsiteId,
  activeSite,
  isAllSites,
  activeRole,
  currentUser,
}) => {
  const router = useRouter();
  const siteQuery = `?site=${activeWebsiteId}`;

  // Recent 6 blogs
  const recentBlogs = [...displayedBlogs]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  // Compute language translation metrics
  let enCount = 0;
  let hiCount = 0;
  let frCount = 0;
  displayedBlogs.forEach((b) => {
    if (b.translations?.en?.content) enCount++;
    if (b.translations?.hi?.content) hiCount++;
    if (b.translations?.fr?.content) frCount++;
  });
  const totalDisplay = displayedBlogs.length || 1;
  const enPct = Math.round((enCount / totalDisplay) * 100);
  const hiPct = Math.round((hiCount / totalDisplay) * 100);
  const frPct = Math.round((frCount / totalDisplay) * 100);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome / Status Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-indigo-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 sm:space-y-1.5 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#4c22cf]/10 text-[#4c22cf] text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4c22cf] animate-pulse" />
            <span className="truncate">
              {isAllSites
                ? `Global Scope · All ${websites.length} Domains`
                : `Tenant · ${activeSite?.name || 'Default'}`}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
            Content Operations
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
          {canCreateBlog(activeRole) && (
            <Link
              href={`/blogs/new${siteQuery}`}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-[#4c22cf] hover:bg-[#3d1bb0] text-white font-bold text-xs shadow-sm shadow-indigo-600/25 transition-all hover:scale-102 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Article</span>
            </Link>
          )}

          {canAccessModule(activeRole, 'workflow') && (
            <Link
              href={`/workflow${siteQuery}`}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-[#f0f2f8] hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5 text-[#4c22cf]" />
              <span>Workflow ({underReviewBlogs.length})</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Grid: 8 Columns Left + 4 Columns Right (modern Theme Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Side: KPIs + Recent Articles Table (8 Cols) */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          {/* Section: GENERALS */}
          <div>
            <div className="flex items-center gap-2.5 mb-3.5">
              <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-slate-400 uppercase">
                Generals & Metrics
              </span>
              <div className="flex-1 h-px bg-slate-200/70" />
            </div>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {/* Card 1: Total Articles */}
              <div
                onClick={() => router.push(`/blogs${siteQuery}`)}
                className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-indigo-50/50 hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Articles</span>
                  <div className="w-9 h-9 rounded-xl bg-[#4c22cf]/10 text-[#4c22cf] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {displayedBlogs.length}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100/70 text-emerald-800">
                    {publishedBlogs.length} Live
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1.5 truncate">
                  {draftBlogs.length} in draft status
                </p>
              </div>

              {/* Card 2: Workflow Attention */}
              <div
                onClick={() => router.push(`/workflow${siteQuery}`)}
                className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-indigo-50/50 hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Workflow Review</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {underReviewBlogs.length}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${underReviewBlogs.length > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'
                    }`}>
                    {underReviewBlogs.length > 0 ? 'Pending' : 'Cleared'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1.5 truncate">
                  {underReviewBlogs.length > 0 ? 'Articles awaiting sign-off' : 'All reviews completed'}
                </p>
              </div>

              {/* Card 3: Total Words */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-indigo-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Words Authored</span>
                  <div className="w-9 h-9 rounded-xl bg-[#4c22cf]/10 text-[#4c22cf] flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {totalWords.toLocaleString()}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#4c22cf]/10 text-[#4c22cf]">
                    Multilingual
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1.5 truncate">
                  Across 4 active locales
                </p>
              </div>

              {/* Card 4: Edge CDN & API */}
              <div
                onClick={() => router.push(`/developers${siteQuery}`)}
                className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-indigo-50/50 hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">CDN & Cache</span>
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Globe className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Active
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800">
                    HMAC Synced
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1.5 truncate">
                  Edge revalidation online
                </p>
              </div>
            </div>
          </div>

          {/* Section: RECENT ARTICLES TABLE */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-indigo-50/50">
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-slate-400 uppercase">
                  Recent Articles
                </span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-[#4c22cf]/10 text-[#4c22cf]">
                  {displayedBlogs.length} Total
                </span>
              </div>
              <Link
                href={`/blogs${siteQuery}`}
                className="text-xs font-bold text-[#4c22cf] hover:text-[#3d1bb0] flex items-center gap-1 group"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {recentBlogs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No articles found for this scope.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentBlogs.map((blog) => {
                  const enTrans = blog.translations?.en || Object.values(blog.translations || {})[0];
                  const titleText = enTrans?.title || 'Untitled Article';
                  const slugText = enTrans?.slug || blog.id;

                  const statusColors: Record<string, string> = {
                    Published: 'bg-emerald-100 text-emerald-800',
                    'Under Review': 'bg-amber-100 text-amber-800',
                    Approved: 'bg-cyan-100 text-cyan-800',
                    Draft: 'bg-slate-100 text-slate-700',
                    Archived: 'bg-rose-100 text-rose-800',
                  };

                  return (
                    <div
                      key={blog.id}
                      className="py-3 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 -mx-2 sm:-mx-3 px-2 sm:px-3 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 text-[#4c22cf] flex items-center justify-center shrink-0 font-black text-xs">
                          {titleText.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/blogs/edit/${blog.id}${siteQuery}`}
                            className="font-bold text-xs sm:text-sm text-slate-900 hover:text-[#4c22cf] transition-colors truncate block max-w-[170px] sm:max-w-xs md:max-w-sm lg:max-w-md"
                            title={titleText}
                          >
                            {titleText}
                          </Link>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 truncate">
                            <span className="font-mono text-slate-500">/{slugText}</span>
                            <span>·</span>
                            <span>{new Date(blog.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${statusColors[blog.status] || 'bg-slate-100 text-slate-700'
                          }`}>
                          {blog.status}
                        </span>

                        <Link
                          href={`/blogs/edit/${blog.id}${siteQuery}`}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#f0f2f8] hover:bg-[#4c22cf] hover:text-white text-slate-600 flex items-center justify-center transition-all"
                          title="Edit article"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Profile Card, Gauges, Quick Actions (Modern Theme 4 Cols) */}
        <div className="lg:col-span-4 space-y-5 sm:space-y-6">
          {/* Card 1: Modern User Profile Widget */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-indigo-50/50 text-center">
            {/* Circular Avatar with Purple Ring */}
            <div className="relative inline-block mx-auto mb-3">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full p-1 border-3 border-[#4c22cf] bg-white shadow-sm flex items-center justify-center">
                {(() => {
                  const safeAvatar = cleanAvatarUrl(currentUser?.avatar);
                  return safeAvatar ? (
                    <img
                      src={safeAvatar}
                      alt={currentUser.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#4c22cf]/10 text-[#4c22cf] flex items-center justify-center font-black text-xl">
                      {currentUser?.name?.charAt(0) || activeRole?.charAt(0) || 'U'}
                    </div>
                  );
                })()}
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
              {(currentUser?.name || 'Aarav Sharma').replace(/\s*\(Super Admin\)/i, '')}
            </h3>
            <p className="text-[11px] font-bold text-[#4c22cf] mt-0.5">
              {activeRole}
            </p>

            {/* Counts */}
            <div className="grid grid-cols-2 gap-3 py-3.5 my-4 border-y border-slate-100">
              <div className="text-center">
                <div className="text-lg font-black text-slate-900">
                  {displayedBlogs.length}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Articles
                </div>
              </div>
              <div className="text-center border-l border-slate-100">
                <div className="text-lg font-black text-slate-900">
                  {totalWords.toLocaleString()}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Words
                </div>
              </div>
            </div>

            {/* Contact / Domain list */}
            <div className="space-y-2 text-left">
              {(() => {
                const rawDomain = activeSite?.domain || 'localhost:5001';
                const siteUrl = rawDomain.startsWith('http')
                  ? rawDomain
                  : rawDomain.includes('localhost') || rawDomain.includes('127.0.0.1')
                    ? `http://${rawDomain}`
                    : `https://${rawDomain}`;

                return (
                  <a
                    href={siteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-[#f0f2f8] hover:bg-indigo-50/80 transition-colors group cursor-pointer"
                    title={`Open ${activeSite?.name || 'Website'} in new tab`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#4c22cf] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <span className="truncate text-xs font-semibold text-slate-700 group-hover:text-[#4c22cf] transition-colors">
                        {siteUrl}
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-[#4c22cf] shrink-0" />
                    </div>
                  </a>
                );
              })()}

              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#f0f2f8]">
                <div className="w-7 h-7 rounded-lg bg-[#4c22cf] text-white flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div className="truncate text-xs font-semibold text-slate-700 max-w-[180px] sm:max-w-[220px]">
                  {currentUser?.email || (currentUser?.name ? `${currentUser.name.toLowerCase().replace(/\s+/g, '.')}@jupsoft.com` : 'Active Session')}
                </div>
              </div>
            </div>

            {/* Circular Progress Rings */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-3">
                Locale Translation Coverage
              </span>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                <div>
                  <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full border-3 border-amber-500 flex items-center justify-center mx-auto text-[11px] font-black text-slate-900">
                    {enPct}%
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 mt-1 block">EN</span>
                </div>

                <div>
                  <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full border-3 border-emerald-500 flex items-center justify-center mx-auto text-[11px] font-black text-slate-900">
                    {hiPct}%
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 mt-1 block">HI</span>
                </div>

                <div>
                  <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full border-3 border-[#4c22cf] flex items-center justify-center mx-auto text-[11px] font-black text-slate-900">
                    {frPct}%
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 mt-1 block">FR</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Quick Links & Fast Shortcuts */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-indigo-50/50 space-y-2">
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-2">
              Quick Shortcuts
            </span>

            <Link
              href={`/taxonomy${siteQuery}`}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f0f2f8] text-xs font-bold text-slate-700 hover:text-[#4c22cf] transition-all group"
            >
              <span>Manage Taxonomy</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href={`/redirects${siteQuery}`}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f0f2f8] text-xs font-bold text-slate-700 hover:text-[#4c22cf] transition-all group"
            >
              <span>Manage 301 Redirects</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href={`/developers${siteQuery}`}
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f0f2f8] text-xs font-bold text-slate-700 hover:text-[#4c22cf] transition-all group"
            >
              <span>Developer REST API Keys</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
