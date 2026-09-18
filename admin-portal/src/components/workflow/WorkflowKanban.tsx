'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useQueryState } from '../../hooks/useQueryState';
import { 
  CheckCircle2, 
  Send, 
  History, 
  FileText, 
  X, 
  Clock, 
  Archive, 
  Zap,
  Search,
  GripVertical,
  RefreshCw,
  ShieldCheck,
  Plus,
  RotateCcw
} from 'lucide-react';
import { BlogStatus, Blog, UserRole, WorkflowLog } from '../../types';
import { canCreateBlog } from '../../utils/permissions';

export const WorkflowKanban: React.FC = () => {
  const searchParams = useSearchParams();
  const { setParam, setParams } = useQueryState();

  const { 
    blogs, 
    activeWebsiteId, 
    websites, 
    activeRole, 
    transitionBlogStatus,
    showNotification,
    fetchBlogs,
    isLoading
  } = useBlogStore();

  useEffect(() => {
    fetchBlogs();
  }, [activeWebsiteId, fetchBlogs]);

  const isAllSites = activeWebsiteId === 'all';
  const tenantParam = searchParams.get('tenant');
  const effectiveSiteId = isAllSites ? (tenantParam || 'all') : activeWebsiteId;
  const activeSite = websites.find((w) => w.id === (effectiveSiteId !== 'all' ? effectiveSiteId : websites[0]?.id)) || websites[0];
  const siteBlogs = effectiveSiteId !== 'all' ? blogs.filter((b) => b.websiteId === effectiveSiteId) : blogs;

  // Search filter state (URL query bound)
  const qParam = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(qParam);
  const [prevQParam, setPrevQParam] = useState(qParam);

  if (prevQParam !== qParam) {
    setPrevQParam(qParam);
    setSearchQuery(qParam);
  }

  const filteredSiteBlogs = siteBlogs.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const titleMatch = Object.values(b.translations).some((t) => 
      t?.title?.toLowerCase().includes(q) || t?.slug?.toLowerCase().includes(q)
    );
    const authorMatch = (b.authorName || '').toLowerCase().includes(q);
    return titleMatch || authorMatch;
  });

  // Drag and Drop state
  const [draggedBlogId, setDraggedBlogId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<BlogStatus | null>(null);

  // URL bound modal state
  const logParam = searchParams.get('log');
  const transitionParam = searchParams.get('transition');
  const targetParam = searchParams.get('target') as BlogStatus;

  const [reviewNote, setReviewNote] = useState('');
  const [scheduledDate, setScheduledDate] = useState('2026-09-25T09:00');

  // Derive selectedAuditBlog from logParam without useEffect cascading renders
  const selectedAuditBlog = useMemo(() => {
    if (!logParam) return null;
    return blogs.find((b) => b.id === logParam) || null;
  }, [logParam, blogs]);

  // Derive activeNoteModal from transitionParam & targetParam without useEffect cascading renders
  const activeNoteModal = useMemo(() => {
    if (!transitionParam || !targetParam) return null;
    const found = blogs.find((b) => b.id === transitionParam);
    return found ? { blog: found, targetStatus: targetParam } : null;
  }, [transitionParam, targetParam, blogs]);

  const columns: { status: BlogStatus; label: string; desc: string; countBadge: string }[] = [
    { 
      status: 'Draft', 
      label: 'Drafts', 
      desc: 'Authoring in progress', 
      countBadge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700' 
    },
    { 
      status: 'Under Review', 
      label: 'Under Review', 
      desc: 'Editorial verification', 
      countBadge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60' 
    },
    { 
      status: 'Approved', 
      label: 'Approved', 
      desc: 'Ready for publishing', 
      countBadge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60' 
    },
    { 
      status: 'Scheduled', 
      label: 'Scheduled', 
      desc: 'Queued for automatic release', 
      countBadge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60' 
    },
    { 
      status: 'Published', 
      label: 'Published & Live', 
      desc: 'Live on consumer domain', 
      countBadge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' 
    },
    { 
      status: 'Archived', 
      label: 'Archived', 
      desc: 'Retired or deprecated', 
      countBadge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60' 
    },
  ];

  const canTransition = (from: BlogStatus, to: BlogStatus, role: UserRole): boolean => {
    if (role === 'Super Admin' || role === 'Website Admin') return true;
    if (role === 'Role Admin' || role === 'Editor') {
      if (from === 'Under Review' && (to === 'Approved' || to === 'Draft')) return true;
      if (from === 'Draft' && to === 'Under Review') return true;
      if (from === 'Approved' && to === 'Under Review') return true;
    }
    if (role === 'Content Writer' && from === 'Draft' && to === 'Under Review') return true;
    if (role === 'Publisher') {
      if (from === 'Approved' && (to === 'Published' || to === 'Scheduled')) return true;
      if (from === 'Scheduled' && to === 'Published') return true;
      if (from === 'Published' && to === 'Archived') return true;
      if (from === 'Archived' && to === 'Draft') return true;
    }
    return false;
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, blog: Blog) => {
    e.dataTransfer.setData('text/plain', blog.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedBlogId(blog.id);
  };

  const handleDragEnd = () => {
    setDraggedBlogId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, colStatus: BlogStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colStatus) {
      setDragOverColumn(colStatus);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colStatus: BlogStatus) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverColumn === colStatus) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: BlogStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const blogId = e.dataTransfer.getData('text/plain') || draggedBlogId;
    if (!blogId) return;

    const blog = blogs.find((b) => b.id === blogId);
    if (!blog) return;

    if (blog.status === targetStatus) return;

    if (!canTransition(blog.status, targetStatus, activeRole)) {
      showNotification(
        `Role "${activeRole}" is not authorized to transition "${blog.translations.en?.title || 'Blog'}" from "${blog.status}" to "${targetStatus}".`,
        'warning'
      );
      return;
    }

    handleAction(blog, targetStatus);
  };

  const handleAction = (blog: Blog, targetStatus: BlogStatus) => {
    setParams({ transition: blog.id, target: targetStatus });
    setReviewNote('');
  };

  const closeTransitionModal = () => {
    setParams({ transition: null, target: null });
  };

  const submitTransition = () => {
    if (!activeNoteModal) return;
    transitionBlogStatus(
      activeNoteModal.blog.id,
      activeNoteModal.targetStatus,
      reviewNote || undefined,
      activeNoteModal.targetStatus === 'Scheduled' ? scheduledDate : undefined
    );
    showNotification(
      `"${activeNoteModal.blog.translations.en?.title || 'Blog'}" moved to "${activeNoteModal.targetStatus}" successfully!`,
      'success'
    );
    closeTransitionModal();
  };

  const openLogModal = (blog: Blog) => {
    setParam('log', blog.id);
  };

  const closeLogModal = () => {
    setParam('log', null);
  };

  return (
    <div className="p-6 sm:p-8 w-full h-full flex flex-col space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Editorial Workflow
            </h1>
            <span className={`text-xs px-2.5 py-0.5 rounded-md font-semibold border ${
              isAllSites
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}>
              {isAllSites ? 'All Websites' : activeSite.name}
            </span>
          </div>

          {/* Tenant Selector Tabs if in All Websites mode - Smooth mobile scroll */}
          {isAllSites && (
            <div className="flex items-center gap-1.5 mt-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-fit border border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-none">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2 shrink-0">Scope:</span>
              <button
                onClick={() => setParam('tenant', null)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                  !tenantParam
                    ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Sites ({blogs.length})
              </button>
              {websites.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setParam('tenant', w.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                    tenantParam === w.id
                      ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {w.name} ({blogs.filter((b) => b.websiteId === w.id).length})
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Board Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search board..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setParam('q', e.target.value.trim() || null);
              }}
              className="pl-8 pr-7 py-1.5 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 w-36 sm:w-48 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setParam('q', null);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={() => fetchBlogs()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh board from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            <span>Role: <strong className="text-slate-900 dark:text-white">{activeRole}</strong></span>
          </div>

          <Link
            href={`/blogs/new?site=${effectiveSiteId}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-medium text-xs shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Draft</span>
          </Link>
        </div>
      </div>

      {/* Kanban Board Container - Touch momentum scroll with snap */}
      <div className="flex-1 min-h-0 overflow-x-auto pb-4 scrollbar-thin snap-x snap-mandatory">
        <div className="flex gap-4 min-w-[960px] h-full items-start">
          {columns.map((col) => {
            const colBlogs = filteredSiteBlogs.filter((b) => b.status === col.status);
            const isDragOver = dragOverColumn === col.status;

            return (
              <div
                key={col.status}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={(e) => handleDragLeave(e, col.status)}
                onDrop={(e) => handleDrop(e, col.status)}
                className={`snap-start w-72 sm:w-80 shrink-0 flex flex-col max-h-full rounded-2xl p-4 border transition-all duration-150 shadow-xs ${
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-400/50'
                    : 'bg-slate-50/75 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{col.label}</h3>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${col.countBadge}`}>
                      {colBlogs.length}
                    </span>
                  </div>
                </div>

                {/* Column Cards */}
                <div className="mt-3 space-y-3 overflow-y-auto flex-1 pr-1">
                  {colBlogs.length === 0 ? (
                    <div className={`py-12 text-center border border-dashed rounded-xl transition-colors ${
                      isDragOver
                        ? 'border-indigo-400 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800'
                    }`}>
                      <div className="text-xs font-medium">{isDragOver ? 'Drop to move here' : `No blogs in ${col.label}`}</div>
                      {!isDragOver && col.status === 'Draft' && canCreateBlog(activeRole) && (
                        <Link
                          href={`/blogs/new?site=${effectiveSiteId}`}
                          className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-block mx-auto"
                        >
                          + Write New Draft
                        </Link>
                      )}
                    </div>
                  ) : (
                    colBlogs.map((blog) => {
                      const enTrans = blog.translations.en || Object.values(blog.translations)[0];
                      const blogSite = websites.find((w) => w.id === blog.websiteId);
                      const isBeingDragged = draggedBlogId === blog.id;

                      return (
                        <div
                          key={blog.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, blog)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white dark:bg-[#0f172a] rounded-xl p-3.5 space-y-3 shadow-xs border transition-all duration-150 cursor-grab active:cursor-grabbing group ${
                            isBeingDragged
                              ? 'opacity-40 ring-2 ring-indigo-500 scale-[0.98]'
                              : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          {/* Cover thumbnail & Title */}
                          <div className="flex items-start space-x-2.5">
                            <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors shrink-0 mt-0.5 cursor-grab" />
                            {blog.featuredImage ? (
                              <img
                                src={blog.featuredImage}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              {isAllSites && blogSite && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-block mb-1">
                                  {blogSite.name}
                                </span>
                              )}
                              <Link
                                href={`/blogs/${blog.id}?site=${blog.websiteId}`}
                                className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug block"
                              >
                                {enTrans?.title || 'Untitled Post'}
                              </Link>
                            </div>
                          </div>

                          {/* Locales Available & Read Time */}
                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                            <div className="flex items-center gap-1">
                              {(['en', 'hi', 'fr', 'ar'] as const).map((lang) => {
                                const hasTranslation = !!blog.translations[lang]?.title;
                                return (
                                  <span
                                    key={lang}
                                    className={`px-1 py-0.2 rounded text-[9px] font-semibold uppercase ${
                                      hasTranslation
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        : 'text-slate-300 dark:text-slate-600'
                                    }`}
                                  >
                                    {lang}
                                  </span>
                                );
                              })}
                            </div>
                            <span className="font-mono">{blog.readTimeMinutes || 2}m read</span>
                          </div>

                          {/* Card metadata */}
                          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                            <span className="truncate">{blog.authorName || 'Author'}</span>
                            <button
                              onClick={() => openLogModal(blog)}
                              className="text-[10px] text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <History className="w-3 h-3" /> Logs ({blog.workflowLogs?.length || 0})
                            </button>
                          </div>

                          {/* Role-Guarded Actions - Only rendered if role has permission */}
                          {col.status === 'Draft' && canTransition('Draft', 'Under Review', activeRole) && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                              <button
                                onClick={() => handleAction(blog, 'Under Review')}
                                className="w-full py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                              >
                                <Send className="w-3 h-3" />
                                <span>Submit for Review</span>
                              </button>
                            </div>
                          )}

                          {col.status === 'Under Review' && (canTransition('Under Review', 'Approved', activeRole) || canTransition('Under Review', 'Draft', activeRole)) && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                              <div className="w-full flex items-center gap-2">
                                {canTransition('Under Review', 'Approved', activeRole) && (
                                  <button
                                    onClick={() => handleAction(blog, 'Approved')}
                                    className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                                  >
                                    <CheckCircle2 className="w-3 h-3" /> Approve
                                  </button>
                                )}
                                {canTransition('Under Review', 'Draft', activeRole) && (
                                  <button
                                    onClick={() => handleAction(blog, 'Draft')}
                                    className="py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                    title="Request revisions"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Changes
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {col.status === 'Approved' && (canTransition('Approved', 'Published', activeRole) || canTransition('Approved', 'Scheduled', activeRole)) && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                              <div className="w-full flex items-center gap-2">
                                {canTransition('Approved', 'Published', activeRole) && (
                                  <button
                                    onClick={() => handleAction(blog, 'Published')}
                                    className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                  >
                                    <Zap className="w-3 h-3" />
                                    <span>Publish</span>
                                  </button>
                                )}
                                {canTransition('Approved', 'Scheduled', activeRole) && (
                                  <button
                                    onClick={() => handleAction(blog, 'Scheduled')}
                                    className="py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60 hover:bg-purple-100"
                                    title="Schedule release"
                                  >
                                    <Clock className="w-3 h-3" />
                                    <span>Schedule</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {col.status === 'Scheduled' && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 text-[11px] text-purple-700 dark:text-purple-300 font-mono flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">
                                  {blog.scheduledAt ? new Date(blog.scheduledAt).toLocaleDateString() + ' ' + new Date(blog.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled'}
                                </span>
                              </div>
                              {canTransition('Scheduled', 'Published', activeRole) && (
                                <button
                                  onClick={() => handleAction(blog, 'Published')}
                                  className="w-full py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-xs"
                                >
                                  <Zap className="w-3 h-3" />
                                  <span>Release Now</span>
                                </button>
                              )}
                            </div>
                          )}

                          {col.status === 'Published' && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                              <div className="w-full text-center text-[11px] text-emerald-700 dark:text-emerald-400 font-mono py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                                ✓ Live on {activeSite.domain}
                              </div>
                              {canTransition('Published', 'Archived', activeRole) && (
                                <button
                                  onClick={() => handleAction(blog, 'Archived')}
                                  className="w-full py-1 px-2 rounded-md text-[11px] text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Archive className="w-3 h-3" />
                                  <span>Retire to Archive</span>
                                </button>
                              )}
                            </div>
                          )}

                          {col.status === 'Archived' && canTransition('Archived', 'Draft', activeRole) && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                              <button
                                onClick={() => handleAction(blog, 'Draft')}
                                className="w-full py-1.5 px-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reactivate as Draft</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Notes Modal - URL bound (?transition=&target=) */}
      {activeNoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                Transition to &quot;{activeNoteModal.targetStatus}&quot;
              </h3>
              <button
                onClick={closeTransitionModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Moving blog <strong className="text-slate-900 dark:text-white">&quot;{activeNoteModal.blog.translations.en?.title || 'Blog'}&quot;</strong> as role <strong className="text-slate-900 dark:text-white">{activeRole}</strong>.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Editorial Audit Notes</label>
              <textarea
                rows={3}
                placeholder="Add reviewer notes, editorial feedback, or scheduling remarks..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            {activeNoteModal.targetStatus === 'Scheduled' && (
              <div className="space-y-1.5 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50">
                <label className="text-xs font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Scheduled Publication Date & Time</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-400 font-mono"
                />
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={closeTransitionModal}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={submitTransition}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-xs cursor-pointer"
              >
                Confirm Transition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal - URL bound (?log=blog-id) */}
      {selectedAuditBlog && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  Workflow History
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm mt-0.5">
                  {selectedAuditBlog.translations.en?.title || 'Blog'}
                </p>
              </div>
              <button
                onClick={closeLogModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {(!selectedAuditBlog.workflowLogs || selectedAuditBlog.workflowLogs.length === 0) ? (
                <div className="py-8 text-center text-slate-400 text-xs">No recorded logs yet.</div>
              ) : (
                selectedAuditBlog.workflowLogs.map((log: WorkflowLog) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {log.fromStatus} &rarr; {log.toStatus}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">by {log.changedBy}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-slate-700 dark:text-slate-300 italic pt-1 text-[11px]">&quot;{log.notes}&quot;</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
