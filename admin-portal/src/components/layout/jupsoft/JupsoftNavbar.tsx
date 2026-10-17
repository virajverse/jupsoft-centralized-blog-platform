'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useBlogStore } from '../../../store/useBlogStore';
import { useShallow } from 'zustand/react/shallow';
import { useQueryState } from '../../../hooks/useQueryState';
import {
  Search,
  Plus,
  Globe,
  ChevronDown,
  Bell,
  BookOpen,
  LogOut,
  X,
  Menu,
  FileText,
  Image as ImageIcon,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Info,
  Layers,
  HelpCircle,
  Tags,
  User as UserIcon,
  Loader2,
  Target,
  CheckCheck,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { isGlobalScopeRole, canCreateBlog, cleanAvatarUrl, canAccessModule } from '../../../utils/permissions';
import { apiClient } from '../../../services/apiClient';
import { SystemNotification } from '../../../types';

export const JupsoftNavbar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setParam } = useQueryState();
  const { 
    websites, 
    activeWebsiteId, 
    setActiveWebsite, 
    activeRole, 
    notification,
    clearNotification,
    toggleSidebar,
    currentUser,
    logout,
    blogs,
    setGuideOpen
  } = useBlogStore(
    useShallow((s) => ({
      websites: s.websites,
      activeWebsiteId: s.activeWebsiteId,
      setActiveWebsite: s.setActiveWebsite,
      activeRole: s.activeRole,
      notification: s.notification,
      clearNotification: s.clearNotification,
      toggleSidebar: s.toggleSidebar,
      currentUser: s.currentUser,
      logout: s.logout,
      blogs: s.blogs,
      setGuideOpen: s.setGuideOpen,
    }))
  );

  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      router.push('/login');
    } finally {
      setIsSigningOut(false);
      setUserDropdownOpen(false);
    }
  };

  const siteDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = React.useCallback(async () => {
    try {
      const currentSiteId = activeWebsiteId;
      if (currentSiteId !== 'all' && websites.length > 0 && !websites.some((w) => w.id === currentSiteId)) {
        return; // Stale / deleted websiteId — skip invalid query until store reconciles
      }
      setIsLoadingNotifs(true);
      const res = await apiClient.getNotifications(currentSiteId === 'all' ? undefined : currentSiteId);
      if (res && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingNotifs(false);
    }
  }, [activeWebsiteId, websites]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 1-minute live poll
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (e: React.MouseEvent, id: string, link?: string) => {
    e.stopPropagation();
    try {
      await apiClient.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (link) {
        setNotifDropdownOpen(false);
        router.push(link);
      }
    } catch {
      // Non-blocking
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.markAllNotificationsRead(activeWebsiteId === 'all' ? undefined : activeWebsiteId);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Non-blocking
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Search input state synchronized with URL query
  const qParam = searchParams.get('q') || '';
  const [localSearch, setLocalSearch] = useState(qParam);
  const [prevQParam, setPrevQParam] = useState(qParam);

  if (prevQParam !== qParam) {
    setPrevQParam(qParam);
    setLocalSearch(qParam);
  }

  const handleSearchChange = (val: string) => {
    setLocalSearch(val);
    if (pathname === '/blogs') {
      setParam('q', val || null, true);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (pathname !== '/blogs') {
        const query = localSearch ? `?q=${encodeURIComponent(localSearch)}` : '';
        router.push(`/blogs${query}`);
      }
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(target)) {
        setSiteDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }
      if (quickCreateRef.current && !quickCreateRef.current.contains(target)) {
        setQuickCreateOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSite = (id: string) => {
    setActiveWebsite(id);
    setSiteDropdownOpen(false);
    setParam('site', id);
  };

  const hasGlobalAll = Boolean(currentUser?.roleAssignments?.['all']);
  const isSuperAdmin = isGlobalScopeRole(activeRole) || hasGlobalAll;
  const isAllSites = activeWebsiteId === 'all';
  const activeSite = websites.find((w) => w.id === activeWebsiteId);
  const displayName = isAllSites ? 'All Websites' : (activeSite?.name || 'All Websites');

  // Multi-tenant visible websites
  const userAssignedWebsites = websites.filter((site) => currentUser?.roleAssignments?.[site.id]);
  const visibleWebsites = isSuperAdmin
    ? websites
    : (userAssignedWebsites.length > 0 ? userAssignedWebsites : (activeSite ? [activeSite] : []));

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => clearNotification(), 4000);
      return () => clearTimeout(t);
    }
  }, [notification, clearNotification]);

  const siteQuery = `?site=${activeWebsiteId}`;

  // Dynamic breadcrumb
  const getPageInfo = () => {
    if (pathname.startsWith('/blogs/new')) return { title: 'New Blog', path: 'Blogs / Create' };
    if (pathname.startsWith('/blogs/') && pathname !== '/blogs') return { title: 'Edit Blog', path: 'Blogs / Edit' };
    if (pathname.startsWith('/blogs')) return { title: 'Blogs', path: 'Content / Blogs' };
    if (pathname.startsWith('/workflow')) return { title: 'Workflow Board', path: 'Review / Approval' };
    if (pathname.startsWith('/media')) return { title: 'Media Assets', path: 'Storage / CDN' };
    if (pathname.startsWith('/taxonomy')) return { title: 'Categories & Tags', path: 'Categories / Tags' };
    if (pathname.startsWith('/redirects')) return { title: 'Link Redirects', path: 'Routing / Rules' };
    if (pathname.startsWith('/analytics')) return { title: 'Analytics', path: 'Reports / Traffic' };
    if (pathname.startsWith('/users')) return { title: 'Team Roles & Permissions', path: 'Access / Roles' };
    if (pathname.startsWith('/settings')) return { title: 'Settings', path: 'Websites / Config' };
    return { title: 'Dashboard', path: 'Workspace / Overview' };
  };

  const { title, path } = getPageInfo();
  const reviewCount = blogs.filter((b) => (activeWebsiteId === 'all' || b.websiteId === activeWebsiteId) && b.status === 'Under Review').length;

  return (
    <header className="h-[50px] px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 bg-white dark:bg-[#0a0f1d] border-b border-slate-200 dark:border-slate-800 w-full min-w-0 select-none">
      {/* Left: Mobile hamburger & Breadcrumb Trail */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        <img src="/logomobileapp.png" alt="Jupsoft" className="lg:hidden h-5 w-auto object-contain shrink-0" />

        <div className="flex items-center gap-2 text-xs truncate">
          <span className="font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </span>
          <span className="hidden md:inline text-slate-300 dark:text-slate-700">|</span>
          <span className="hidden md:inline text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            {path}
          </span>
        </div>
      </div>

      {/* Center: Jupsoft Signature Omnibox Search (hidden on /blogs to prevent dual search bar collision) */}
      {pathname !== '/blogs' && (
        <div className="hidden md:flex items-center flex-1 max-w-sm mx-4 relative">
          <div className="w-full relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search blogs, authors, slugs... (Press Enter)"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-12 py-1 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
            />
            {localSearch ? (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="absolute right-2 text-[10px] font-mono px-1 py-[1px] rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                /
              </kbd>
            )}
          </div>
        </div>
      )}

      {/* Right Controls: Quick Create (+), Site Pill, Notifications, Guide, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
        {/* Universal Quick Create Dropdown (+) */}
        {canCreateBlog(activeRole) && (
          <div ref={quickCreateRef} className="relative">
            <button
              type="button"
              onClick={() => setQuickCreateOpen(!quickCreateOpen)}
              className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer"
              title="Quick Create Action"
            >
              <Plus className={`w-4 h-4 transition-transform ${quickCreateOpen ? 'rotate-45' : ''}`} />
            </button>

            {quickCreateOpen && (
              <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/60 mb-1">
                  Quick Create
                </div>
                <Link
                  href={`/blogs/new${siteQuery}`}
                  onClick={() => setQuickCreateOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                  <span>New Blog</span>
                </Link>
                {canAccessModule(activeRole, 'media', currentUser?.customModules) && (
                  <Link
                    href={`/media${siteQuery}`}
                    onClick={() => setQuickCreateOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Upload Media</span>
                  </Link>
                )}
                {canAccessModule(activeRole, 'redirects', currentUser?.customModules) && (
                  <Link
                    href={`/settings${siteQuery}&tab=redirects`}
                    onClick={() => setQuickCreateOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
                    <span>Add Link Redirect</span>
                  </Link>
                )}
                {canAccessModule(activeRole, 'taxonomy', currentUser?.customModules) && (
                  <Link
                    href={`/taxonomy${siteQuery}`}
                    onClick={() => setQuickCreateOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <Tags className="w-3.5 h-3.5 text-purple-500" />
                    <span>Categories &amp; Tags</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Website Scope Pill */}
        <div ref={siteDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => visibleWebsites.length > 1 && setSiteDropdownOpen(!siteDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Website Scope"
          >
            <Globe className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="max-w-[100px] sm:max-w-[130px] truncate">{displayName}</span>
            {visibleWebsites.length > 1 && (
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${siteDropdownOpen ? 'rotate-180' : ''}`} />
            )}
          </button>

          {siteDropdownOpen && visibleWebsites.length > 1 && (
            <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-white dark:bg-[#0f172a] p-1.5 z-50 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/60 mb-1">
                Select Website
              </div>
              <div className="space-y-0.5 max-h-60 overflow-y-auto">
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => handleSelectSite('all')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isAllSites
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-red-500" />
                      <span>All Websites</span>
                    </div>
                    {isAllSites && <CheckCircle2 className="w-3.5 h-3.5 text-red-500" />}
                  </button>
                )}
                {visibleWebsites.map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => handleSelectSite(site.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      site.id === activeWebsiteId
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="truncate">{site.name}</span>
                    {site.id === activeWebsiteId && <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Interactive System Notifications Popover (Phase 4 & 5 SaaS UX) */}
        <div ref={notifDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className={`relative p-1.5 rounded-lg transition-colors cursor-pointer ${
              notifDropdownOpen
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={unreadCount > 0 ? `${unreadCount} unread alert(s)` : 'Notifications'}
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-[9px] font-bold text-white flex items-center justify-center shadow-xs animate-in zoom-in">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            {unreadCount === 0 && reviewCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          {notifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#0f172a] shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Mark all notifications as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="px-4 pt-2 pb-1.5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#0f172a]">
                <button
                  type="button"
                  onClick={() => setNotifFilter('all')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    notifFilter === 'all'
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter('unread')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    notifFilter === 'unread'
                      ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Notification Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {isLoadingNotifs && notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                    <span>Loading alerts...</span>
                  </div>
                ) : (
                  (() => {
                    const filtered = notifications.filter((n) =>
                      notifFilter === 'unread' ? !n.isRead : true
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="p-8 text-center space-y-2">
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            All caught up!
                          </div>
                          <div className="text-[11px] text-slate-400 max-w-[220px] mx-auto">
                            No unread target alerts, cadence warnings, or publish notifications.
                          </div>
                        </div>
                      );
                    }

                    return filtered.map((n) => {
                      const isDeficit = n.type === 'TARGET_DEFICIT';
                      const isPublished = n.type === 'BLOG_PUBLISHED';
                      const isSystem = n.type === 'SYSTEM_ALERT';

                      return (
                        <div
                          key={n.id}
                          onClick={(e) => handleMarkAsRead(e, n.id, n.link || '/workflow')}
                          className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                            !n.isRead
                              ? 'bg-red-50/20 dark:bg-red-950/10 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-75 hover:opacity-100'
                          }`}
                        >
                          {/* Type Icon */}
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isDeficit
                                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                                : isPublished
                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : isSystem
                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                                : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                            }`}
                          >
                            {isDeficit ? (
                              <Target className="w-4 h-4" />
                            ) : isPublished ? (
                              <Globe className="w-4 h-4" />
                            ) : isSystem ? (
                              <Sparkles className="w-4 h-4" />
                            ) : (
                              <AlertCircle className="w-4 h-4" />
                            )}
                          </div>

                          {/* Message Body */}
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className={`text-xs truncate ${!n.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                {n.title}
                              </span>
                              {!n.isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {n.message}
                            </p>

                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center gap-2">
                                {n.website && (
                                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {n.website.name}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">
                                  {formatTimeAgo(n.createdAt)}
                                </span>
                              </div>

                              {!n.isRead && (
                                <button
                                  type="button"
                                  onClick={(e) => handleMarkAsRead(e, n.id)}
                                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-[11px]">
                <Link
                  href={`/workflow${siteQuery}`}
                  onClick={() => setNotifDropdownOpen(false)}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium flex items-center gap-1"
                >
                  <span>Workflow Board</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>

                <Link
                  href={`/settings?tab=general${siteQuery ? '&' + siteQuery.slice(1) : ''}`}
                  onClick={() => setNotifDropdownOpen(false)}
                  className="text-red-600 dark:text-red-400 hover:underline font-semibold"
                >
                  Configure Target Quotas &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Universal Help & Knowledge Center Trigger */}
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
          title="Help Center & User Guide (सहायता केंद्र)"
        >
          <HelpCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span className="hidden sm:inline">Help &amp; Guide</span>
        </button>

        {/* User Profile Dropdown */}
        <div ref={userDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-1.5 p-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="User Profile &amp; Settings"
            aria-label="User Profile &amp; Settings"
          >
            {(() => {
              const safeAvatar = cleanAvatarUrl(currentUser?.avatar);
              return safeAvatar ? (
                <img
                  src={safeAvatar}
                  alt={currentUser?.name || 'User avatar'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fall back to initial letter if image fails to load
                    (e.currentTarget as HTMLElement).style.display = 'none';
                    const parent = (e.currentTarget as HTMLElement).parentElement;
                    const fallback = parent?.querySelector('.avatar-navbar-fallback');
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                  className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : null;
            })()}
            <div className={`avatar-navbar-fallback w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs ${cleanAvatarUrl(currentUser?.avatar) ? 'hidden' : ''}`}>
              {currentUser?.name?.charAt(0) || activeRole?.charAt(0) || 'A'}
            </div>
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-white dark:bg-[#0f172a] p-2.5 z-50 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1 border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {currentUser?.name || activeRole || 'Administrator'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {currentUser?.email || 'admin@jupsoft.com'}
                </div>
                <div className="mt-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                  {activeRole}
                </div>
              </div>

              <Link
                href="/profile"
                onClick={() => setUserDropdownOpen(false)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer mb-1"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>My Profile</span>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSigningOut ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>{isSigningOut ? 'Signing out...' : 'Sign Out of CMS'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-20 right-5 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : notification.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          ) : notification.type === 'warning' ? (
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
          )}
          <span>{notification.message}</span>
          <button type="button" onClick={clearNotification} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};
