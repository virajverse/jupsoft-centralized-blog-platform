'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  RefreshCw,
  X,
  Building2,
  Trash2,
  Edit3,
  ExternalLink,
  Globe,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckSquare,
  Square
} from 'lucide-react';
import { Blog, Website, UserRole, LanguageCode } from '../../types';
import { canCreateBlog, canDeleteBlog } from '../../utils/permissions';
import { useBlogStore } from '../../store/useBlogStore';

interface ZohoBlogListViewProps {
  blogs: Blog[];
  baseBlogs: Blog[];
  filteredBlogs: Blog[];
  activeWebsiteId: string;
  websites: Website[];
  activeRole: UserRole;
  isAllSites: boolean;
  activeSite: Website;
  selectedStatus: string;
  selectedTenantFilter: string;
  searchVal: string;
  queryParam: string;
  handleStatusChange: (status: string) => void;
  handleTenantChange: (tenant: string) => void;
  handleSearchChange: (val: string) => void;
  clearSearch: () => void;
  deleteBlog: (id: string) => void;
  fetchBlogs: () => void;
  isLoading: boolean;
}

const ALL_LANGUAGES: LanguageCode[] = ['en', 'hi', 'fr', 'ar'];

export const ZohoBlogListView: React.FC<ZohoBlogListViewProps> = ({
  blogs,
  baseBlogs,
  filteredBlogs,
  activeWebsiteId,
  websites,
  activeRole,
  isAllSites,
  activeSite,
  selectedStatus,
  selectedTenantFilter,
  searchVal,
  queryParam,
  handleStatusChange,
  handleTenantChange,
  handleSearchChange,
  clearSearch,
  deleteBlog,
  fetchBlogs,
  isLoading,
}) => {
  const categories = useBlogStore((s) => s.categories);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const siteQuery = `?site=${activeWebsiteId}`;

  // Pagination state (0-delay performance)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, selectedTenantFilter, queryParam]);

  const totalPages = Math.max(1, Math.ceil(filteredBlogs.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedBlogs = filteredBlogs.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const statuses = [
    { label: 'All', value: 'All', count: baseBlogs.length },
    { label: 'Published', value: 'Published', count: baseBlogs.filter((b) => b.status === 'Published').length },
    { label: 'In Review', value: 'Under Review', count: baseBlogs.filter((b) => b.status === 'Under Review').length },
    { label: 'Approved', value: 'Approved', count: baseBlogs.filter((b) => b.status === 'Approved').length },
    { label: 'Drafts', value: 'Draft', count: baseBlogs.filter((b) => b.status === 'Draft').length },
    { label: 'Scheduled', value: 'Scheduled', count: baseBlogs.filter((b) => b.status === 'Scheduled').length },
  ];

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredBlogs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredBlogs.map((b) => b.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const isAllSelected = filteredBlogs.length > 0 && selectedIds.length === filteredBlogs.length;

  return (
    <div className="space-y-2 font-sans text-slate-800 dark:text-slate-200">
      {/* 1. Ultra-Compact Top Toolbar (Height ~36px) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
        {/* Left: Micro Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {statuses.map((s) => {
            const isActive = selectedStatus === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => handleStatusChange(s.value)}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-red-600 text-white font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{s.label}</span>
                <span className={`text-[9px] px-1 py-0.1 rounded font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500'
                }`}>
                  {s.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Compact Search, Refresh, New Blog CTA */}
        <div className="flex items-center gap-1.5 ml-auto">

          {/* Compact Search */}
          <div className="relative w-44 sm:w-56">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search blogs..."
              value={searchVal}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-7 pr-6 py-1 text-[11px] rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-red-500"
            />
            {searchVal && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => fetchBlogs()}
            disabled={isLoading}
            className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
            title="Refresh Blogs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-red-500' : ''}`} />
          </button>

          {/* New Blog CTA */}
          {canCreateBlog(activeRole) && (
            <Link
              href={`/blogs/new${siteQuery}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Bulk Action Bar (Visible when rows selected) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-lg text-xs animate-in fade-in duration-100">
          <div className="flex items-center gap-2">
            <span className="font-bold text-red-700 dark:text-red-400 text-[11px]">
              {selectedIds.length} of {filteredBlogs.length} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canDeleteBlog(activeRole) && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete ${selectedIds.length} selected blogs?`)) {
                    selectedIds.forEach((id) => deleteBlog(id));
                    setSelectedIds([]);
                  }
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Selected</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-[10px] text-slate-500 hover:text-slate-800 underline"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* 3. Spreadsheet-Style Data Grid (Row Height: 34px - 36px) */}
      <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-3 border-b border-slate-100 dark:border-slate-800/60 animate-pulse">
                <div className="w-3.5 h-3.5 bg-slate-200 dark:bg-slate-800 rounded shrink-0" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                  <div className="h-2 bg-slate-100 dark:bg-slate-850 rounded w-1/4" />
                </div>
                <div className="w-16 h-3 bg-slate-200 dark:bg-slate-800 rounded shrink-0" />
                <div className="w-20 h-3 bg-slate-200 dark:bg-slate-800 rounded hidden sm:block shrink-0" />
                <div className="w-12 h-3 bg-slate-200 dark:bg-slate-800 rounded shrink-0" />
              </div>
            ))}
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Globe className="w-8 h-8 mx-auto text-slate-400" />
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">No blogs match this view</div>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              {queryParam ? 'Try adjusting your search query or status filter.' : 'There are currently no blog articles in this website.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider h-8">
                  <th className="w-8 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="rounded text-red-600 focus:ring-red-500 w-3 h-3 cursor-pointer"
                    />
                  </th>
                  <th className="py-1.5 px-3">Title & Slug</th>
                  {isAllSites && <th className="py-1.5 px-2.5">Website</th>}
                  <th className="py-1.5 px-2.5">Status</th>
                  <th className="py-1.5 px-2.5">Author</th>
                  <th className="py-1.5 px-2.5">Languages</th>
                  <th className="py-1.5 px-2.5">Updated</th>
                  <th className="py-1.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedBlogs.map((blog) => {
                  const isChecked = selectedIds.includes(blog.id);
                  const defaultTrans = blog.translations['en'] || Object.values(blog.translations)[0];
                  const tenant = websites.find((w) => w.id === blog.websiteId);
                  const availableLangs = ALL_LANGUAGES.filter((l) => blog.translations[l]);

                  return (
                    <tr
                      key={blog.id}
                      className={`hover:bg-red-50/25 dark:hover:bg-red-950/15 transition-colors h-9 ${
                        isChecked ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-2 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(blog.id)}
                          className="rounded text-red-600 focus:ring-red-500 w-3 h-3 cursor-pointer"
                        />
                      </td>

                      {/* Title & Slug & Category Badge */}
                      <td className="py-1.5 px-3 max-w-[260px] sm:max-w-xs">
                        <div className="truncate font-semibold text-slate-900 dark:text-slate-100 hover:text-red-600 text-xs">
                          <Link href={`/blogs/${blog.id}${siteQuery}`}>
                            {defaultTrans?.title || 'Untitled Blog'}
                          </Link>
                        </div>
                        <div className="truncate text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>/{defaultTrans?.slug || blog.id}</span>
                          {blog.categoryIds && blog.categoryIds.length > 0 && (
                            <>
                              <span>•</span>
                              {blog.categoryIds.slice(0, 2).map((catId) => {
                                const cat = (categories[blog.websiteId] || []).find((c) => c.id === catId);
                                if (!cat) return null;
                                return (
                                  <span key={cat.id} className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-sans font-medium">
                                    {cat.name}
                                  </span>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </td>

                      {/* Website Tenant (If All Sites) */}
                      {isAllSites && (
                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                            {tenant?.name?.replace(/Jupsoft | Platform/g, '') || 'Custom'}
                          </span>
                        </td>
                      )}

                      {/* Status */}
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

                      {/* Updated Date */}
                      <td className="py-1.5 px-2.5 whitespace-nowrap text-[10px] text-slate-400 font-mono">
                        {new Date(blog.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </td>

                      {/* Quick Action Icons (24px buttons) */}
                      <td className="py-1.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/blogs/${blog.id}${siteQuery}`}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Blog"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>

                          {canDeleteBlog(activeRole) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this blog?')) {
                                  deleteBlog(blog.id);
                                }
                              }}
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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
          </div>
        )}

        {/* 4. Compact Footer with Active Pagination */}
        <div className="px-3 py-1.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span>
              {isLoading
                ? 'Fetching latest records...'
                : filteredBlogs.length === 0
                ? 'Showing 0 records'
                : `Showing ${(safeCurrentPage - 1) * pageSize + 1}-${Math.min(safeCurrentPage * pageSize, filteredBlogs.length)} of ${filteredBlogs.length} records`}
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value={15}>15 / page</option>
              <option value={30}>30 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[10px]">
              {safeCurrentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
