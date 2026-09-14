'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useQueryState } from '../../hooks/useQueryState';
import {
  LayoutDashboard,
  FileText,
  Kanban,
  Image as ImageIcon,
  Tags,
  BarChart3,
  Settings,
  Zap,
  Radio,
  Globe,
  Plus,
  ArrowRightLeft,
  Users,
  Code2,
  PanelLeftClose,
  LogOut
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setParam } = useQueryState();
  const { 
    blogs, 
    activeWebsiteId, 
    setActiveWebsite,
    websites,
    redirects,
    sidebarOpen,
    toggleSidebar,
    currentUser,
    logout
  } = useBlogStore();

  // Sync site param from URL to store on mount/change
  const siteParam = searchParams.get('site');
  useEffect(() => {
    if (siteParam && siteParam !== activeWebsiteId) {
      if (siteParam === 'all' || websites.some((w) => w.id === siteParam)) {
        setActiveWebsite(siteParam);
      }
    }
  }, [siteParam, activeWebsiteId, websites, setActiveWebsite]);

  const isAllSites = activeWebsiteId === 'all';
  const activeSite = websites.find((w) => w.id === activeWebsiteId) || websites[0];
  
  const displayedBlogs = isAllSites ? blogs : blogs.filter((b) => b.websiteId === activeWebsiteId);
  const underReviewCount = displayedBlogs.filter((b) => b.status === 'Under Review').length;

  // Preserve site query param when navigating between pages
  const siteQuery = `?site=${activeWebsiteId}`;

  const navItems = [
    {
      href: `/dashboard${siteQuery}`,
      basePath: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      isActive: pathname === '/dashboard' || pathname === '/',
    },
    {
      href: `/blogs${siteQuery}`,
      basePath: '/blogs',
      label: 'All Articles',
      icon: FileText,
      badge: displayedBlogs.length > 0 ? displayedBlogs.length.toString() : null,
      isActive: pathname.startsWith('/blogs') && !pathname.includes('/new'),
    },
    {
      href: `/workflow${siteQuery}`,
      basePath: '/workflow',
      label: 'Workflow Kanban',
      icon: Kanban,
      badge: underReviewCount > 0 ? underReviewCount.toString() : null,
      badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
      isActive: pathname === '/workflow',
    },
    {
      href: `/media${siteQuery}`,
      basePath: '/media',
      label: 'Media Library',
      icon: ImageIcon,
      badge: 'WebP',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
      isActive: pathname === '/media',
    },
    {
      href: `/taxonomy${siteQuery}`,
      basePath: '/taxonomy',
      label: 'Categories & Tags',
      icon: Tags,
      badge: null,
      isActive: pathname === '/taxonomy',
    },
    {
      href: `/redirects${siteQuery}`,
      basePath: '/redirects',
      label: '301 Redirects',
      icon: ArrowRightLeft,
      badge: redirects.length > 0 ? redirects.length.toString() : null,
      badgeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
      isActive: pathname === '/redirects',
    },
    {
      href: `/analytics${siteQuery}`,
      basePath: '/analytics',
      label: 'Content Analytics',
      icon: BarChart3,
      badge: null,
      isActive: pathname === '/analytics',
    },
    {
      href: `/developers${siteQuery}`,
      basePath: '/developers',
      label: 'Developer API Portal',
      icon: Code2,
      badge: 'REST',
      badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
      isActive: pathname === '/developers',
    },
    {
      href: `/users${siteQuery}`,
      basePath: '/users',
      label: 'Team & RBAC',
      icon: Users,
      badge: null,
      isActive: pathname === '/users',
    },
    {
      href: `/settings${siteQuery}`,
      basePath: '/settings',
      label: 'Tenant & Settings',
      icon: Settings,
      badge: null,
      isActive: pathname === '/settings',
    },
  ];

  const handleSelectSite = (id: string) => {
    setActiveWebsite(id);
    setParam('site', id);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-40 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`w-64 h-full b2b-sidebar flex flex-col justify-between shrink-0 overflow-y-auto transition-all duration-200 ease-in-out border-r border-slate-200 dark:border-slate-800 fixed md:static inset-y-0 left-0 z-50 md:z-30 bg-white dark:bg-[#090d16] ${
          sidebarOpen ? 'ml-0 translate-x-0 opacity-100' : '-ml-64 -translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Top Brand & Navigation */}
        <div className="p-4 space-y-5">
          {/* Brand Header with Collapse Toggle */}
          <div className="flex items-center justify-between px-2 py-1">
            <Link href={`/dashboard${siteQuery}`} className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-xs shrink-0 font-black text-xs">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  JUPSOFT <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">CMS</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">v1.0 &middot; Multi-Tenant</div>
              </div>
            </Link>

            {/* Collapse Sidebar Button */}
            <button
              onClick={toggleSidebar}
              title="Collapse sidebar (Ctrl+B)"
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

        {/* Quick Action: New Post */}
        <div className="px-1">
          <Link
            href={`/blogs/new${siteQuery}`}
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Article</span>
          </Link>
        </div>

        {/* Websites Scope Selector */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Websites Scope
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
              {websites.length} sites
            </span>
          </div>

          {/* All Websites (Total Overview) */}
          <button
            onClick={() => handleSelectSite('all')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isAllSites
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-2 min-w-0">
              <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="truncate text-xs">All Websites (Total)</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {blogs.length}
            </span>
          </button>

          {/* Individual Websites */}
          <div className="space-y-0.5 pt-0.5">
            {websites.map((site) => {
              const isSelected = activeWebsiteId === site.id;
              const count = blogs.filter((b) => b.websiteId === site.id).length;
              return (
                <button
                  key={site.id}
                  onClick={() => handleSelectSite(site.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span className="truncate text-xs">{site.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800" />

        {/* Content Engine Navigation with Real Next.js Links */}
        <nav className="space-y-0.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 pb-1">
            Content Engine
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.basePath}
                href={item.href}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  item.isActive
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${item.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md border ${
                      item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Tenant Info Card */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <div className="bg-white dark:bg-[#0f172a] rounded-lg p-2.5 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 font-semibold text-slate-800 dark:text-slate-200 truncate">
              {isAllSites ? (
                <>
                  <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">All Websites</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate max-w-[110px]">{activeSite.name}</span>
                </>
              )}
            </div>
            <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${
              isAllSites
                ? 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800/40'
            }`}>
              {isAllSites ? 'Network' : 'Active'}
            </span>
          </div>

          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            <span className="truncate max-w-[120px]">
              {isAllSites ? `${websites.length} Domains` : activeSite.domain}
            </span>
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  </>
  );
};
