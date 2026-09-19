'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useQueryState } from '../../hooks/useQueryState';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Globe, 
  Clock, 
  X,
  Building2,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { LanguageCode } from '../../types';
import { canDeleteBlog, canCreateBlog } from '../../utils/permissions';
import { ZohoBlogListView } from './ZohoBlogListView';
import { resolveMediaUrl } from '../../utils/mediaUtils';

const ALL_LANGUAGES: LanguageCode[] = ['en', 'hi', 'fr', 'ar'];

export const BlogList: React.FC = () => {
  const searchParams = useSearchParams();
  const { setParam } = useQueryState();

  const { 
    blogs, 
    activeWebsiteId, 
    websites, 
    activeRole,
    uiTheme,
    deleteBlog,
    fetchBlogs,
    isLoading
  } = useBlogStore();

  useEffect(() => {
    fetchBlogs();
  }, [activeWebsiteId, fetchBlogs]);

  // Read URL query params
  const statusParam = searchParams.get('status') || 'All';
  const tenantParam = searchParams.get('tenant') || 'all';
  const queryParam = searchParams.get('q') || '';

  // Derive status and tenant filters directly from URL state
  const selectedStatus = statusParam;
  const selectedTenantFilter = tenantParam;

  // Search input state with adjust-during-render pattern
  const [searchVal, setSearchVal] = useState<string>(queryParam);
  const [prevQueryParam, setPrevQueryParam] = useState<string>(queryParam);

  if (prevQueryParam !== queryParam) {
    setPrevQueryParam(queryParam);
    setSearchVal(queryParam);
  }

  // Debounce syncing search to URL query parameter (stops router thrashing on keystrokes)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchVal.trim() !== queryParam.trim()) {
        setParam('q', searchVal.trim() || null);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [searchVal, queryParam, setParam]);

  const handleStatusChange = (status: string) => {
    setParam('status', status === 'All' ? null : status);
  };

  const handleTenantChange = (tenant: string) => {
    setParam('tenant', tenant === 'all' ? null : tenant);
  };

  const isAllSites = activeWebsiteId === 'all';
  const activeSite = websites.find((w) => w.id === activeWebsiteId) || websites[0];

  // Pre-calculate tenant blog counts in O(N) single pass
  const tenantBlogCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of blogs) {
      counts.set(b.websiteId, (counts.get(b.websiteId) || 0) + 1);
    }
    return counts;
  }, [blogs]);

  // Memoized Base Blogs filter
  const baseBlogs = useMemo(() => {
    return isAllSites
      ? (selectedTenantFilter === 'all' ? blogs : blogs.filter((b) => b.websiteId === selectedTenantFilter))
      : blogs.filter((b) => b.websiteId === activeWebsiteId);
  }, [isAllSites, blogs, selectedTenantFilter, activeWebsiteId]);

  // Memoized Filtered Blogs with optimized string lookup
  const filteredBlogs = useMemo(() => {
    const query = queryParam.trim().toLowerCase();
    return baseBlogs.filter((blog) => {
      const matchesStatus = selectedStatus === 'All' || blog.status === selectedStatus;
      if (!matchesStatus) return false;
      if (!query) return true;

      const titleMatch = Object.values(blog.translations || {}).some((t) => 
        t?.title?.toLowerCase().includes(query) || t?.slug?.toLowerCase().includes(query)
      );
      const authorMatch = blog.authorName ? blog.authorName.toLowerCase().includes(query) : false;
      return titleMatch || authorMatch;
    });
  }, [baseBlogs, selectedStatus, queryParam]);

  // Single-pass memoized status counts
  const statuses = useMemo(() => {
    let pub = 0, sch = 0, rev = 0, app = 0, drf = 0, arc = 0;
    for (const b of baseBlogs) {
      if (b.status === 'Published') pub++;
      else if (b.status === 'Scheduled') sch++;
      else if (b.status === 'Under Review') rev++;
      else if (b.status === 'Approved') app++;
      else if (b.status === 'Draft') drf++;
      else if (b.status === 'Archived') arc++;
    }
    return [
      { label: 'All Blogs', value: 'All', count: baseBlogs.length },
      { label: 'Published', value: 'Published', count: pub },
      { label: 'Scheduled', value: 'Scheduled', count: sch },
      { label: 'Under Review', value: 'Under Review', count: rev },
      { label: 'Approved', value: 'Approved', count: app },
      { label: 'Drafts', value: 'Draft', count: drf },
      { label: 'Archived', value: 'Archived', count: arc },
    ];
  }, [baseBlogs]);

  // Pagination state (0-delay performance optimization)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, selectedTenantFilter, queryParam]);

  const totalPages = Math.max(1, Math.ceil(filteredBlogs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedBlogs = filteredBlogs.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  if (uiTheme === 'zoho') {
    return (
      <ZohoBlogListView
        blogs={blogs}
        baseBlogs={baseBlogs}
        filteredBlogs={filteredBlogs}
        activeWebsiteId={activeWebsiteId}
        websites={websites}
        activeRole={activeRole}
        isAllSites={isAllSites}
        activeSite={activeSite}
        selectedStatus={selectedStatus}
        selectedTenantFilter={selectedTenantFilter}
        searchVal={searchVal}
        queryParam={queryParam}
        handleStatusChange={handleStatusChange}
        handleTenantChange={handleTenantChange}
        handleSearchChange={(val) => {
          setSearchVal(val);
        }}
        clearSearch={() => {
          setSearchVal('');
          setParam('q', null);
        }}
        deleteBlog={deleteBlog}
        fetchBlogs={fetchBlogs}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Blogs
            </h1>
            <span className={`text-xs px-2.5 py-0.5 rounded-md font-semibold border ${
              isAllSites
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}>
              {isAllSites ? 'All Websites' : (activeSite?.name || 'Website')}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Centrally curate, edit, translate, and publish content across multi-tenant domains
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchBlogs()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh blogs from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
          </button>
          {canCreateBlog(activeRole) && (
            <Link
              href={`/blogs/new?site=${activeWebsiteId}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-medium text-xs shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Blog</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter Tabs and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
        {/* Status Filter Tabs - Smooth horizontal swipe on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 lg:pb-0 w-full lg:w-auto">
          {statuses.map((s) => {
            const isActive = selectedStatus === s.value;
            return (
              <button
                key={s.value}
                onClick={() => handleStatusChange(s.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{s.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                  isActive
                    ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {s.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          {/* Tenant Filter Dropdown */}
          {isAllSites && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium whitespace-nowrap shrink-0">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Tenant:
              </span>
              <select
                value={selectedTenantFilter}
                onChange={(e) => handleTenantChange(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#4c22cf] cursor-pointer w-full sm:w-auto"
              >
                <option value="all">All Sites ({blogs.length})</option>
                {websites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({tenantBlogCounts.get(w.id) || 0})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Real-time Search Input */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search blogs..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4c22cf] w-full"
            />
            {searchVal && (
              <button
                onClick={() => {
                  setSearchVal('');
                  setParam('q', null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Blogs Table */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs">
        {filteredBlogs.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Globe className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500" />
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">No blogs found</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {queryParam 
                ? `No blogs match the current search query "${queryParam}".` 
                : 'No blogs created for this filter yet.'}
            </p>
            {queryParam ? (
              <button
                onClick={() => setParam('q', null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Clear Search Filter
              </button>
            ) : canCreateBlog(activeRole) ? (
              <Link
                href={`/blogs/new?site=${activeWebsiteId}`}
                className="inline-block px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium shadow-xs hover:bg-slate-800 cursor-pointer"
              >
                Draft New Post
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/60 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-5">Blog</th>
                  {isAllSites && <th className="py-3 px-4">Website</th>}
                  <th className="py-3 px-4">Languages</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Readership</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {paginatedBlogs.map((blog) => {
                  const enTrans = blog.translations.en || Object.values(blog.translations)[0];
                  const availableLangs = ALL_LANGUAGES.filter((l) => Boolean(blog.translations[l]?.title));
                  const site = websites.find((w) => w.id === blog.websiteId);

                  return (
                    <tr
                      key={blog.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Title & Cover */}
                      <td className="py-3.5 px-5 max-w-md">
                        <div className="flex items-center space-x-3.5">
                          {blog.featuredImage ? (
                            <img
                              src={resolveMediaUrl(blog.featuredImage)}
                              alt={blog.featuredImageAlt || 'Featured'}
                              loading="lazy"
                              className="w-11 h-11 rounded-lg object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                              <Globe className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/blogs/${blog.id}?site=${blog.websiteId}`}
                              className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate block text-xs sm:text-sm"
                            >
                              {enTrans?.title || 'Untitled Post'}
                            </Link>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                              Updated {new Date(blog.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tenant Badge (in All Websites view) */}
                      {isAllSites && (
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                            {site?.name || blog.websiteId}
                          </span>
                        </td>
                      )}

                      {/* Language badges */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          {ALL_LANGUAGES.map((lang) => {
                            const isAvailable = availableLangs.includes(lang);
                            return (
                              <Link
                                key={lang}
                                href={`/blogs/${blog.id}?lang=${lang}&site=${blog.websiteId}`}
                                className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-semibold transition-colors ${
                                  isAvailable
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                                    : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-transparent'
                                }`}
                                title={isAvailable ? `Edit in ${lang.toUpperCase()}` : `Missing ${lang.toUpperCase()}`}
                              >
                                {lang}
                              </Link>
                            );
                          })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                            blog.status === 'Published'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                              : blog.status === 'Under Review'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                              : blog.status === 'Approved'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              blog.status === 'Published'
                                ? 'bg-emerald-500'
                                : blog.status === 'Under Review'
                                ? 'bg-amber-500'
                                : blog.status === 'Approved'
                                ? 'bg-blue-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          {blog.status}
                        </span>
                      </td>

                      {/* Author */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {blog.authorName}
                      </td>

                      {/* Readership / Views */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{blog.readTimeMinutes || 2}m read</span>
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                          {blog.viewCount || 0} views
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Link
                            href={`/blogs/${blog.id}?site=${blog.websiteId}`}
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            title="Edit Blog"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                          {canDeleteBlog(activeRole) && (
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this article?')) {
                                  deleteBlog(blog.id);
                                }
                              }}
                              className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete Blog"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {filteredBlogs.length > 0 && (
              <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span>
                    Showing <strong className="text-slate-700 dark:text-slate-200">{(safeCurrentPage - 1) * pageSize + 1}</strong> to <strong className="text-slate-700 dark:text-slate-200">{Math.min(safeCurrentPage * pageSize, filteredBlogs.length)}</strong> of <strong className="text-slate-700 dark:text-slate-200">{filteredBlogs.length}</strong> blogs
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <label className="flex items-center gap-1.5">
                    <span>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </label>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        return (
                          <React.Fragment key={p}>
                            {prev && p - prev > 1 && <span className="px-1 text-slate-400">...</span>}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                safeCurrentPage === p
                                  ? 'bg-[#4c22cf] text-white shadow-xs'
                                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
