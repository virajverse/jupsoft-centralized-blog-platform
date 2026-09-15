'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useBlogStore } from '../../../store/useBlogStore';
import { useQueryState } from '../../../hooks/useQueryState';
import { 
  Globe, 
  ChevronDown, 
  Plus, 
  Search, 
  CheckCircle2, 
  Layers,
  X,
  Menu,
  Bell,
  MessageSquare,
  LogOut,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { isGlobalScopeRole, canCreateBlog } from '../../../utils/permissions';
import { UiThemeSwitcher } from '../UiThemeSwitcher';

export const ModernNavbar: React.FC = () => {
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

  // Compute concise dynamic page title and breadcrumbs
  const getPageInfo = () => {
    if (pathname.startsWith('/blogs/new')) return { title: 'New Article', breadcrumb: 'Articles / Create' };
    if (pathname.startsWith('/blogs/edit')) return { title: 'Edit Article', breadcrumb: 'Articles / Edit' };
    if (pathname.startsWith('/blogs')) return { title: 'Articles', breadcrumb: 'Content / All' };
    if (pathname.startsWith('/workflow')) return { title: 'Workflow', breadcrumb: 'Kanban / Review' };
    if (pathname.startsWith('/media')) return { title: 'Media', breadcrumb: 'Assets / CDN' };
    if (pathname.startsWith('/taxonomy')) return { title: 'Taxonomy', breadcrumb: 'Categories / Tags' };
    if (pathname.startsWith('/redirects')) return { title: 'Redirects', breadcrumb: 'Routing / 301' };
    if (pathname.startsWith('/analytics')) return { title: 'Analytics', breadcrumb: 'Insights / Stats' };
    if (pathname.startsWith('/developers')) return { title: 'API Developers', breadcrumb: 'Integration / REST' };
    if (pathname.startsWith('/users')) return { title: 'Team & RBAC', breadcrumb: 'Access / Roles' };
    if (pathname.startsWith('/settings')) return { title: 'Tenant Settings', breadcrumb: 'Config / Domains' };
    return { title: 'Dashboard', breadcrumb: 'Overview / Live' };
  };

  const { title, breadcrumb } = getPageInfo();
  const reviewCount = blogs.filter((b) => b.status === 'Under Review').length;

  return (
    <header className="h-16 sm:h-20 px-3 sm:px-5 lg:px-6 flex items-center justify-between shrink-0 z-30 bg-[#f0f2f8] w-full min-w-0">
      {/* Left: Sidebar Toggle + Dynamic Page Title & Inline Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white text-slate-700 hover:text-[#4c22cf] hover:shadow-md transition-all cursor-pointer shadow-xs border border-indigo-50/50 shrink-0"
          title="Toggle Navigation Menu"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-tight truncate">
            {title}
          </h1>
          <span className="hidden sm:inline text-[11px] font-medium text-slate-400 truncate">
            <span className="text-[#4c22cf] font-semibold">{breadcrumb.split('/')[0].trim()}</span>
            {' · ' + (breadcrumb.split('/')[1] || '').trim()}
          </span>
        </div>
      </div>

      {/* Center: Search Bar (Adaptive max-w with min-w-0 to prevent pushing right controls) */}
      <div className="hidden xl:flex items-center flex-1 min-w-0 max-w-[180px] 2xl:max-w-xs relative mx-2">
        <input
          type="text"
          placeholder="Search articles, slugs..."
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full bg-white border border-transparent rounded-full pl-4 pr-8 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#4c22cf] transition-all"
        />
        {localSearch ? (
          <button 
            onClick={() => handleSearchChange('')}
            className="absolute right-2.5 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <Search className="w-3.5 h-3.5 absolute right-2.5 text-slate-400 pointer-events-none" />
        )}
      </div>

      {/* Right: Dual UI Switcher, Notifications, Site Scope, User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
        {/* Instant Dual UI Switcher Button (Responsive) */}
        <UiThemeSwitcher variant="modern" />

        {/* Multi-Tenant Scope Pill (Visible across all devices) */}
        <div className="relative shrink-0">
          <button
            onClick={() => visibleWebsites.length > 1 && setSiteDropdownOpen(!siteDropdownOpen)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-white text-xs font-bold text-slate-800 shadow-xs border border-indigo-50/50 hover:shadow-md hover:border-indigo-200 transition-all ${
              visibleWebsites.length > 1 ? 'cursor-pointer' : 'cursor-default'
            }`}
            title="Switch Website Scope (All Websites, Cloud, Growth, School ERP)"
          >
            <Globe className="w-3.5 h-3.5 text-[#4c22cf] shrink-0" />
            <span className="max-w-[80px] sm:max-w-[120px] md:max-w-[140px] truncate">{displayName}</span>
            {visibleWebsites.length > 1 && (
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ${siteDropdownOpen ? 'rotate-180' : ''}`} />
            )}
          </button>

          {siteDropdownOpen && visibleWebsites.length > 1 && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-2 z-50 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                <span>Select Website Scope</span>
                <span className="text-[9px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Localhost</span>
              </div>
              <div className="py-1 space-y-1 max-h-60 overflow-y-auto">
                {isSuperAdmin && (
                  <button
                    onClick={() => handleSelectSite('all')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      isAllSites
                        ? 'bg-[#4c22cf]/10 text-[#4c22cf] font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-[#4c22cf]" />
                      <span>All Websites (Total)</span>
                    </div>
                    {isAllSites && <CheckCircle2 className="w-4 h-4 text-[#4c22cf]" />}
                  </button>
                )}

                {visibleWebsites.map((site) => (
                  <button
                    key={site.id}
                    onClick={() => handleSelectSite(site.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      site.id === activeWebsiteId
                        ? 'bg-[#4c22cf]/10 text-[#4c22cf] font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-[#4c22cf]" />
                      <div className="flex flex-col text-left truncate">
                        <span className="truncate">{site.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{site.domain}</span>
                      </div>
                    </div>
                    {site.id === activeWebsiteId && <CheckCircle2 className="w-4 h-4 text-[#4c22cf] shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modern Style Notification Badges */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button 
            onClick={() => router.push(`/workflow${siteQuery}`)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-slate-600 hover:text-[#4c22cf] flex items-center justify-center relative shadow-xs border border-indigo-50/50 hover:shadow-md transition-all cursor-pointer shrink-0"
            title="Workflow Notifications"
            aria-label="Workflow Notifications"
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="absolute -top-1 -right-1 bg-[#4c22cf] text-white text-[9px] font-black w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center shadow-xs">
              {reviewCount > 0 ? reviewCount : 4}
            </span>
          </button>

          <button 
            onClick={() => router.push(`/blogs${siteQuery}`)}
            className="hidden 2xl:flex w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white text-slate-600 hover:text-[#4c22cf] items-center justify-center relative shadow-xs border border-indigo-50/50 hover:shadow-md transition-all cursor-pointer shrink-0"
            title="Editorial Messages"
            aria-label="Editorial Messages"
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="absolute -top-1 -right-1 bg-[#4c22cf] text-white text-[9px] font-black w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center shadow-xs">
              52
            </span>
          </button>
        </div>

        {/* Super Admin How to Use Guide Button */}
        {isSuperAdmin && (
          <button
            onClick={() => setGuideOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 hover:text-[#4c22cf] text-[11px] font-bold shadow-xs border border-indigo-50/50 hover:shadow-md transition-all cursor-pointer shrink-0"
            title="Super Admin Platform Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#4c22cf]" />
            <span className="hidden lg:inline">How to Use</span>
          </button>
        )}

        {/* Primary Action Button (New Article) - Desktop */}
        {canCreateBlog(activeRole) && (
          <Link
            href={`/blogs/new${siteQuery}`}
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#4c22cf] hover:bg-[#3d1bb0] text-white font-bold text-xs shadow-xs transition-all hover:scale-102 shrink-0"
            title="Create New Article"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </Link>
        )}

        {/* Modern User Profile Badge */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-1.5 p-1 sm:p-1.5 rounded-full bg-white border border-indigo-50/50 shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
            title="Account & Session"
            aria-label="User profile menu"
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-[#4c22cf]/20 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#4c22cf]/10 text-[#4c22cf] flex items-center justify-center font-black text-xs shrink-0">
                {currentUser?.name?.charAt(0) || 'A'}
              </div>
            )}
            <div className="hidden 2xl:flex flex-col text-left pr-2 max-w-[100px]">
              <span className="text-xs font-bold text-slate-900 leading-tight truncate">
                {(currentUser?.name || 'Aarav').replace(/\s*\(Super Admin\)/i, '')}
              </span>
              <span className="text-[10px] font-semibold text-[#4c22cf] leading-tight truncate">
                {activeRole}
              </span>
            </div>
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-3 z-50 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1.5 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {(currentUser?.name || 'Aarav Sharma').replace(/\s*\(Super Admin\)/i, '')}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {currentUser?.email || 'admin@jupsoft.com'}
                </div>
                <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#4c22cf]/10 text-[#4c22cf]">
                  {activeRole}
                </div>
              </div>

              {/* Website Scope Switcher inside user menu on mobile */}
              <div className="py-2 border-b border-slate-100 xl:hidden">
                <div className="text-[10px] font-bold uppercase text-slate-400 px-2 mb-1">Scope</div>
                <select
                  value={activeWebsiteId}
                  onChange={(e) => handleSelectSite(e.target.value)}
                  className="w-full text-xs font-semibold bg-[#f0f2f8] p-1.5 rounded-xl text-slate-800 border-0 focus:ring-1 focus:ring-[#4c22cf]"
                >
                  {isSuperAdmin && <option value="all">All Websites ({websites.length})</option>}
                  {visibleWebsites.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    logout();
                    router.push('/login');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of CMS</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-indigo-100 text-xs font-medium text-slate-900 shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-150">
          <Sparkles className="w-4 h-4 text-[#4c22cf] shrink-0" />
          <span>{notification.message}</span>
          <button onClick={clearNotification} className="ml-2 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};
