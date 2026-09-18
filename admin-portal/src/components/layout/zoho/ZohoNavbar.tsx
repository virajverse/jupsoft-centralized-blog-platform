'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useBlogStore } from '../../../store/useBlogStore';
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
  Tags,
  CheckCircle2,
  Layers,
  Sparkles
} from 'lucide-react';
import { isGlobalScopeRole, canCreateBlog, cleanAvatarUrl } from '../../../utils/permissions';
import { UiThemeSwitcher } from '../UiThemeSwitcher';

export const ZohoNavbar: React.FC = () => {
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
  } = useBlogStore();

  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  const siteDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSite = (id: string) => {
    setActiveWebsite(id);
    setSiteDropdownOpen(false);
    setParam('site', id);
  };

  const isSuperAdmin = isGlobalScopeRole(activeRole);
  const isAllSites = activeWebsiteId === 'all';
  const activeSite = websites.find((w) => w.id === activeWebsiteId);
  const displayName = isAllSites ? 'All Websites' : (activeSite?.name || 'All Websites');

  // Multi-tenant visible websites
  const visibleWebsites = isSuperAdmin
    ? websites
    : websites.filter((site) => currentUser?.roleAssignments?.[site.id]);

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
    if (pathname.startsWith('/blogs/edit')) return { title: 'Edit Blog', path: 'Blogs / Edit' };
    if (pathname.startsWith('/blogs')) return { title: 'Blogs', path: 'Content / Blogs' };
    if (pathname.startsWith('/workflow')) return { title: 'Workflow', path: 'Kanban / Review' };
    if (pathname.startsWith('/media')) return { title: 'Media Assets', path: 'Storage / CDN' };
    if (pathname.startsWith('/taxonomy')) return { title: 'Taxonomy', path: 'Categories / Tags' };
    if (pathname.startsWith('/redirects')) return { title: '301 Redirects', path: 'Routing / Rules' };
    if (pathname.startsWith('/analytics')) return { title: 'Analytics', path: 'Reports / Traffic' };
    if (pathname.startsWith('/developers')) return { title: 'Developer API', path: 'Integrations / API' };
    if (pathname.startsWith('/users')) return { title: 'Team & RBAC', path: 'Access / Roles' };
    if (pathname.startsWith('/settings')) return { title: 'Settings', path: 'Tenants / Domains' };
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

      {/* Center: Zoho Signature Omnibox Search */}
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
            <kbd className="absolute right-2 text-[10px] font-mono px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Right Controls: Quick Create (+), Site Pill, UiThemeSwitcher, Notifications, Guide, Profile */}
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
                <Link
                  href={`/media${siteQuery}`}
                  onClick={() => setQuickCreateOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Upload Media</span>
                </Link>
                <Link
                  href={`/redirects${siteQuery}`}
                  onClick={() => setQuickCreateOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
                  <span>Add 301 Redirect</span>
                </Link>
                <Link
                  href={`/taxonomy${siteQuery}`}
                  onClick={() => setQuickCreateOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <Tags className="w-3.5 h-3.5 text-purple-500" />
                  <span>Manage Taxonomy</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* 3-Way UI Theme Switcher Dropdown */}
        <UiThemeSwitcher variant="zoho" />

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

        {/* Notifications */}
        <button
          type="button"
          onClick={() => router.push(`/workflow${siteQuery}`)}
          className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={reviewCount > 0 ? `${reviewCount} reviews pending` : 'No pending reviews'}
        >
          <Bell className="w-4 h-4" />
          {reviewCount > 0 && (
            <span className="absolute 0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>

        {/* How to Use Guide */}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Admin Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden xl:inline">Guide</span>
          </button>
        )}

        {/* User Profile Dropdown */}
        <div ref={userDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-1.5 p-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {(() => {
              const safeAvatar = cleanAvatarUrl(currentUser?.avatar);
              return safeAvatar ? (
                <img
                  src={safeAvatar}
                  alt={currentUser?.name || 'User avatar'}
                  className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                  {currentUser?.name?.charAt(0) || activeRole?.charAt(0) || 'A'}
                </div>
              );
            })()}
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
                <div className="mt-1 inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                  {activeRole}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUserDropdownOpen(false);
                  logout();
                  router.push('/login');
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of CMS</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Sparkles className="w-4 h-4 text-red-500 shrink-0" />
          <span>{notification.message}</span>
          <button type="button" onClick={clearNotification} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};
