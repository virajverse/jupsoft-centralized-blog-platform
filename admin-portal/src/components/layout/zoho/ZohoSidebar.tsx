'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useBlogStore } from '../../../store/useBlogStore';
import { useQueryState } from '../../../hooks/useQueryState';
import { canAccessModule, isGlobalScopeRole, AppModule } from '../../../utils/permissions';
import {
  LayoutDashboard,
  FileText,
  Kanban,
  Image as ImageIcon,
  Tags,
  BarChart3,
  Settings,
  Users,
  Boxes,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

export const ZohoSidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setParam } = useQueryState();
  const { 
    blogs, 
    activeWebsiteId, 
    setActiveWebsite, 
    activeRole, 
    websites, 
    sidebarOpen,
    setSidebarOpen,
    currentUser,
    modules
  } = useBlogStore();

  const [drawerCollapsed, setDrawerCollapsed] = useState(true);

  // Sync site param from URL
  const siteParam = searchParams.get('site');
  useEffect(() => {
    if (siteParam && siteParam !== activeWebsiteId) {
      if (siteParam === 'all' || websites.some((w) => w.id === siteParam)) {
        setActiveWebsite(siteParam);
      }
    }
  }, [siteParam, activeWebsiteId, websites, setActiveWebsite]);

  // Mobile drawer auto-close
  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const isSuperAdmin = isGlobalScopeRole(activeRole);
  const isAllSites = activeWebsiteId === 'all';
  const displayedBlogs = isAllSites ? blogs : blogs.filter((b) => b.websiteId === activeWebsiteId);
  const underReviewCount = displayedBlogs.filter((b) => b.status === 'Under Review').length;
  const publishedCount = displayedBlogs.filter((b) => b.status === 'Published').length;
  const draftCount = displayedBlogs.filter((b) => b.status === 'Draft').length;
  const scheduledCount = displayedBlogs.filter((b) => b.status === 'Scheduled').length;

  const siteQuery = `?site=${activeWebsiteId}`;

  // Primary Navigation Modules for Tier 1 Icon Rail
  const navItems: {
    href: string;
    basePath: string;
    module: AppModule;
    shortLabel: string;
    fullLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
    isActive: boolean;
  }[] = [
    {
      href: `/dashboard${siteQuery}`,
      basePath: '/dashboard',
      module: 'dashboard',
      shortLabel: 'Home',
      fullLabel: 'Dashboard',
      icon: LayoutDashboard,
      isActive: pathname === '/dashboard' || pathname === '/',
    },
    {
      href: `/blogs${siteQuery}`,
      basePath: '/blogs',
      module: 'blogs',
      shortLabel: 'Blogs',
      fullLabel: 'Blogs',
      icon: FileText,
      badge: displayedBlogs.length > 0 ? displayedBlogs.length : null,
      isActive: pathname.startsWith('/blogs'),
    },
    {
      href: `/workflow${siteQuery}`,
      basePath: '/workflow',
      module: 'workflow',
      shortLabel: 'Kanban',
      fullLabel: 'Workflow Kanban',
      icon: Kanban,
      badge: underReviewCount > 0 ? underReviewCount : null,
      isActive: pathname === '/workflow',
    },
    {
      href: `/media${siteQuery}`,
      basePath: '/media',
      module: 'media',
      shortLabel: 'Media',
      fullLabel: 'Media Library',
      icon: ImageIcon,
      isActive: pathname === '/media',
    },
    {
      href: `/taxonomy${siteQuery}`,
      basePath: '/taxonomy',
      module: 'taxonomy',
      shortLabel: 'Taxonomy',
      fullLabel: 'Taxonomy',
      icon: Tags,
      isActive: pathname === '/taxonomy',
    },
    {
      href: `/analytics${siteQuery}`,
      basePath: '/analytics',
      module: 'analytics',
      shortLabel: 'Reports',
      fullLabel: 'Analytics',
      icon: BarChart3,
      isActive: pathname === '/analytics',
    },
    {
      href: `/users${siteQuery}`,
      basePath: '/users',
      module: 'users',
      shortLabel: 'Users',
      fullLabel: 'Team & RBAC',
      icon: Users,
      isActive: pathname === '/users',
    },
    {
      href: `/settings${siteQuery}`,
      basePath: '/settings',
      module: 'settings',
      shortLabel: 'Settings',
      fullLabel: 'Tenant Settings',
      icon: Settings,
      isActive: pathname === '/settings',
    },
    {
      href: `/plugins${siteQuery}`,
      basePath: '/plugins',
      module: 'plugins',
      shortLabel: 'Plugins',
      fullLabel: 'Plugins & Modules',
      icon: Boxes,
      isActive: pathname === '/plugins',
    },
  ];

  const visibleNavItems = navItems.filter((item) => {
    // 1. Role-based capability check
    if (!canAccessModule(activeRole, item.module)) return false;
    // 2. Admin modular toggle check (Plugins module is always visible to authorized admins to prevent lockout)
    if (item.module === 'plugins') return true;
    const modConfig = modules?.find((m) => m.id === item.module);
    if (modConfig && !modConfig.enabled) return false;
    // 3. Website/Tenant scope check
    if (modConfig && modConfig.allowedWebsites && !modConfig.allowedWebsites.includes('all')) {
      if (activeWebsiteId !== 'all' && !modConfig.allowedWebsites.includes(activeWebsiteId)) {
        return false;
      }
    }
    return true;
  });

  const statusFilter = searchParams.get('status') || '';

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex h-full select-none transition-transform duration-200 ease-in-out shadow-2xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* ========================================================================= */}
        {/* TIER 1: Slim Dark Primary Icon Rail (64px wide)                           */}
        {/* ========================================================================= */}
        <div className="w-16 h-full bg-[#0d1527] border-r border-slate-800 flex flex-col justify-between items-center py-2.5 z-20 shrink-0">
          {/* Top Brand Logo */}
          <div className="flex flex-col items-center gap-1 mb-2">
            <Link
              href={`/dashboard${siteQuery}`}
              onClick={handleNavClick}
              className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center p-1.5 transition-transform hover:scale-105 border border-slate-700/60 shadow-xs"
              title="Jupsoft CMS - Editorial Studio"
            >
              <img src="/jupsoft-icon.png?v=2" alt="Jupsoft" className="w-full h-full object-contain" />
            </Link>
            {/* Multi-Tenant Status Indicator Dots */}
            <div className="flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Editorial Engine" />
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Connected API" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="CDN Active" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="SEO Live" />
            </div>
          </div>

          {/* Module Icon List */}
          <nav className="flex-1 w-full flex flex-col items-center space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none py-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.isActive;
              return (
                <Link
                  key={item.basePath}
                  href={item.href}
                  onClick={handleNavClick}
                  title={item.fullLabel}
                  className={`relative w-full h-[52px] flex flex-col items-center justify-center transition-all group ${
                    isActive
                      ? 'bg-slate-800/90 text-white font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  {/* Zoho signature active red rail bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1 bottom-1 w-1 bg-red-500 rounded-r-sm" />
                  )}

                  <div className="relative">
                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-red-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`} />
                    {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-mono font-bold flex items-center justify-center leading-none">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>

                  <span className={`text-[9px] tracking-tight mt-1 font-medium transition-colors ${
                    isActive ? 'text-white font-bold' : 'text-slate-400 group-hover:text-slate-300'
                  }`}>
                    {item.shortLabel}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions: Mobile Close */}
          <div className="w-full flex flex-col items-center gap-2 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TIER 2: Secondary Contextual Drawer (208px wide)                          */}
        {/* ========================================================================= */}
        <div
          className={`h-full bg-[#f8fafc] dark:bg-[#0a0f1d] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all duration-200 ease-in-out relative ${
            drawerCollapsed ? 'w-0 overflow-hidden border-r-0 opacity-0' : 'w-52 opacity-100'
          }`}
        >
          {/* Top Section Header */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Editorial Studio
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700">
              CMS
            </span>
          </div>

          {/* Contextual Sub-Nav Menu */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-none text-xs">
            {/* Context Filters */}
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Content Views
              </div>

              <Link
                href={`/blogs${siteQuery}`}
                onClick={handleNavClick}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  pathname.startsWith('/blogs') && !statusFilter
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>All Blogs</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {displayedBlogs.length}
                </span>
              </Link>

              <Link
                href={`/blogs${siteQuery}&status=Published`}
                onClick={handleNavClick}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  statusFilter === 'Published'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Published</span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                  {publishedCount}
                </span>
              </Link>

              <Link
                href={`/blogs${siteQuery}&status=Under%20Review`}
                onClick={handleNavClick}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  statusFilter === 'Under Review'
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>In Review</span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                  {underReviewCount}
                </span>
              </Link>

              <Link
                href={`/blogs${siteQuery}&status=Draft`}
                onClick={handleNavClick}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  statusFilter === 'Draft'
                    ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>Drafts</span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                  {draftCount}
                </span>
              </Link>

              <Link
                href={`/blogs${siteQuery}&status=Scheduled`}
                onClick={handleNavClick}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  statusFilter === 'Scheduled'
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>Scheduled</span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                  {scheduledCount}
                </span>
              </Link>
            </div>
          </div>

          {/* Drawer Footer Status */}
          <div className="p-2.5 border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center justify-between">
            <span className="truncate">Tenant: {isAllSites ? 'Network (All)' : (websites.find(w => w.id === activeWebsiteId)?.name || 'Custom')}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Connected" />
          </div>

          {/* Drawer Collapse Button (Floating on the border edge) */}
          <button
            type="button"
            onClick={() => setDrawerCollapsed(!drawerCollapsed)}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white shadow-xs z-30 cursor-pointer transition-transform hover:scale-110"
            title={drawerCollapsed ? 'Expand secondary drawer' : 'Collapse secondary drawer'}
          >
            {drawerCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
      </aside>
    </>
  );
};
