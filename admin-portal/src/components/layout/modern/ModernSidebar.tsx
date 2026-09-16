'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../../store/useBlogStore';
import { canAccessModule, isGlobalScopeRole, AppModule } from '../../../utils/permissions';
import {
  LayoutDashboard,
  FileText,
  Kanban,
  Image as ImageIcon,
  Tags,
  BarChart3,
  Settings,
  ArrowRightLeft,
  Users,
  Code2,
  Sparkles,
  X
} from 'lucide-react';

export const ModernSidebar: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { 
    blogs, 
    activeWebsiteId, 
    activeRole, 
    websites, 
    redirects,
    sidebarOpen,
    setSidebarOpen,
    setActiveWebsite,
  } = useBlogStore();

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Auto-close on mobile mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  // Lock scroll when mobile drawer is open
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (sidebarOpen && window.innerWidth < 1024) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [sidebarOpen]);

  // Sync site param from URL
  const siteParam = searchParams.get('site');
  useEffect(() => {
    if (siteParam && siteParam !== activeWebsiteId) {
      if (siteParam === 'all' || websites.some((w) => w.id === siteParam)) {
        setActiveWebsite(siteParam);
      }
    }
  }, [siteParam, activeWebsiteId, websites, setActiveWebsite]);

  const isAllSites = activeWebsiteId === 'all';
  const displayedBlogs = isAllSites ? blogs : blogs.filter((b) => b.websiteId === activeWebsiteId);
  const underReviewCount = displayedBlogs.filter((b) => b.status === 'Under Review').length;

  const siteQuery = `?site=${activeWebsiteId}`;

  const navItems: {
    href: string;
    basePath: string;
    module: AppModule;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number | null;
    isActive: boolean;
  }[] = [
    {
      href: `/dashboard${siteQuery}`,
      basePath: '/dashboard',
      module: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      isActive: pathname === '/dashboard' || pathname === '/',
    },
    {
      href: `/blogs${siteQuery}`,
      basePath: '/blogs',
      module: 'blogs',
      label: 'All Articles',
      icon: FileText,
      badge: displayedBlogs.length > 0 ? displayedBlogs.length : null,
      isActive: pathname.startsWith('/blogs') && !pathname.includes('/new'),
    },
    {
      href: `/workflow${siteQuery}`,
      basePath: '/workflow',
      module: 'workflow',
      label: 'Workflow Kanban',
      icon: Kanban,
      badge: underReviewCount > 0 ? underReviewCount : null,
      isActive: pathname === '/workflow',
    },
    {
      href: `/media${siteQuery}`,
      basePath: '/media',
      module: 'media',
      label: 'Media Library',
      icon: ImageIcon,
      isActive: pathname === '/media',
    },
    {
      href: `/taxonomy${siteQuery}`,
      basePath: '/taxonomy',
      module: 'taxonomy',
      label: 'Categories & Tags',
      icon: Tags,
      isActive: pathname === '/taxonomy',
    },
    {
      href: `/redirects${siteQuery}`,
      basePath: '/redirects',
      module: 'redirects',
      label: '301 Redirects',
      icon: ArrowRightLeft,
      badge: redirects.length > 0 ? redirects.length : null,
      isActive: pathname === '/redirects',
    },
    {
      href: `/analytics${siteQuery}`,
      basePath: '/analytics',
      module: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      isActive: pathname === '/analytics',
    },
    {
      href: `/developers${siteQuery}`,
      basePath: '/developers',
      module: 'developers',
      label: 'Developer API',
      icon: Code2,
      isActive: pathname === '/developers',
    },
    {
      href: `/users${siteQuery}`,
      basePath: '/users',
      module: 'users',
      label: 'Team & RBAC',
      icon: Users,
      isActive: pathname === '/users',
    },
    {
      href: `/settings${siteQuery}`,
      basePath: '/settings',
      module: 'settings',
      label: 'Settings',
      icon: Settings,
      isActive: pathname === '/settings',
    },
  ];

  const visibleNavItems = navItems.filter((item) => canAccessModule(activeRole, item.module));

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-[#250f6b]/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-[#4c22cf] text-white transition-all duration-300 ease-in-out select-none shadow-2xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-64'
        }`}
      >
        {/* Brand Logo Header (Modern Style) */}
        <div className="h-20 flex items-center justify-between px-6 shrink-0">
          <Link href={`/dashboard${siteQuery}`} className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center p-1.5 shadow-lg shadow-indigo-950/20 group-hover:scale-105 transition-transform overflow-hidden">
              <img src="/jupsoft-icon.png?v=2" alt="Jupsoft" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight text-white flex items-center gap-1">
                Jupsoft<span className="text-amber-300 text-base">●</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200/70 -mt-1">
                Modern Admin
              </span>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items with Signature Modern Cutout Curve */}
        <div className="flex-1 overflow-y-auto py-4 pl-4 pr-0 scrollbar-none space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.isActive;

            if (isActive) {
              return (
                <div key={item.href} className="relative z-10">
                  {/* Top Fillet Concave Curve */}
                  <div className="absolute -top-4 right-0 w-4 h-4 bg-transparent pointer-events-none">
                    <div className="w-full h-full bg-[#4c22cf] rounded-br-2xl" />
                  </div>
                  <div className="absolute -top-4 right-0 w-4 h-4 bg-[#f0f2f8] -z-10" />

                  {/* The Active Link Item (White bridge extending into canvas) */}
                  <Link
                    href={item.href}
                    onClick={handleNavClick}
                    className="flex items-center justify-between pl-5 pr-4 py-3.5 bg-[#f0f2f8] text-[#4c22cf] rounded-l-3xl font-bold text-sm shadow-sm transition-all relative"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-8 h-8 rounded-xl bg-[#4c22cf]/10 flex items-center justify-center text-[#4c22cf]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="tracking-tight">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#4c22cf] text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {/* Bottom Fillet Concave Curve */}
                  <div className="absolute -bottom-4 right-0 w-4 h-4 bg-[#f0f2f8] -z-10" />
                  <div className="absolute -bottom-4 right-0 w-4 h-4 bg-transparent pointer-events-none">
                    <div className="w-full h-full bg-[#4c22cf] rounded-tr-2xl" />
                  </div>
                </div>
              );
            }

            return (
              <div key={item.href} className="pr-4">
                <Link
                  href={item.href}
                  onClick={handleNavClick}
                  className="flex items-center justify-between px-5 py-3 rounded-2xl text-white/75 hover:text-white hover:bg-white/10 font-medium text-sm transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 rounded-xl text-white/70 group-hover:text-white flex items-center justify-center transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="tracking-tight">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white group-hover:bg-white/25 transition-colors">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Footer info (Modern Theme style) */}
        <div className="p-6 shrink-0 border-t border-white/10 text-white/50 text-[11px] leading-relaxed">
          <div className="font-semibold text-white/80 flex items-center gap-1.5 mb-0.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Modern Portal v2.0</span>
          </div>
          <p>© 2026 Jupsoft. All Rights Reserved.</p>
        </div>
      </aside>
    </>
  );
};
