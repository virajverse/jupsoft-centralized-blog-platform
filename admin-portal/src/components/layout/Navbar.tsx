'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useQueryState } from '../../hooks/useQueryState';
import { 
  Globe, 
  ChevronDown, 
  Plus, 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  ExternalLink,
  Layers,
  X,
  Command,
  Sun,
  Moon,
  Sparkles,
  PanelLeft,
  PanelLeftClose,
  LogOut,
  BookOpen
} from 'lucide-react';
import { UserRole } from '../../types';
import { isGlobalScopeRole, canCreateBlog, cleanAvatarUrl } from '../../utils/permissions';
import { UiThemeSwitcher } from './UiThemeSwitcher';

export const Navbar: React.FC = () => {
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
    theme,
    toggleTheme,
    sidebarOpen,
    toggleSidebar,
    currentUser,
    logout,
    setGuideOpen
  } = useBlogStore();

  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Global keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  // Search input state with adjust-during-render pattern
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
  const displayDomain = isAllSites ? `${websites.length} Connected Domains` : (activeSite?.domain || 'Multi-Tenant');

  // Multi-tenant visible websites: Super Admin sees all; others see only assigned websites
  const visibleWebsites = isSuperAdmin
    ? websites
    : websites.filter((site) => currentUser?.roleAssignments?.[site.id]);

  const roles: { role: UserRole; color: string; desc: string }[] = [
    { role: 'Super Admin', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40', desc: 'Full System & Global Control' },
    { role: 'Website Admin', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40', desc: 'Manage Single Tenant & Team' },
    { role: 'Role Admin', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/40', desc: 'Functional Department Lead' },
    { role: 'Editor', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40', desc: 'Review & Approve Content' },
    { role: 'Content Writer', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40', desc: 'Draft & Submit Blogs' },
    { role: 'Publisher', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40', desc: 'Schedule & Publish to CDN' },
    { role: 'SEO Manager', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40', desc: 'Meta, Schemas & Audits' },
  ];

  const activeRoleConfig = roles.find((r) => r.role === activeRole) || roles[0];

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => clearNotification(), 4000);
      return () => clearTimeout(t);
    }
  }, [notification, clearNotification]);

  const siteQuery = `?site=${activeWebsiteId}`;

  return (
    <header className="h-14 b2b-header px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 transition-colors duration-150 border-b border-slate-200 dark:border-slate-800">
      {/* Left: Sidebar Toggle + Scope indicator & live domain */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Sidebar Enable/Disable Button */}
        <button
          onClick={toggleSidebar}
          title={sidebarOpen ? "Collapse sidebar (Ctrl+B)" : "Expand sidebar (Ctrl+B)"}
          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
          aria-label="Toggle Sidebar"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          ) : (
            <PanelLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          )}
        </button>

        {!sidebarOpen && (
          <Link href={`/dashboard${siteQuery}`} className="hidden sm:flex items-center space-x-2 shrink-0 group">
            <div className="w-6 h-6 rounded-md overflow-hidden bg-transparent p-0.5 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center">
              <img src="/jupsoft-icon.png?v=2" alt="Jupsoft" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-xs tracking-tight text-slate-900 dark:text-white">Blogary</span>
<span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">by Jupsoft</span>
          </Link>
        )}

        <div className="relative">
          <button
            onClick={() => visibleWebsites.length > 1 && setSiteDropdownOpen(!siteDropdownOpen)}
            className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs ${visibleWebsites.length > 1 ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{displayName}</span>
            {visibleWebsites.length > 1 && (
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${siteDropdownOpen ? 'rotate-180' : ''}`} />
            )}
          </button>

          {siteDropdownOpen && visibleWebsites.length > 1 && (
            <div className="absolute left-0 mt-1.5 w-72 rounded-xl b2b-dropdown p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 shadow-lg">
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                Select Scope
              </div>
              <div className="py-1 space-y-0.5">
                {isSuperAdmin && (
                  <button
                    onClick={() => handleSelectSite('all')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      isAllSites
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>All Websites (Total)</span>
                    </div>
                    {isAllSites && <CheckCircle2 className="w-3.5 h-3.5 text-slate-900 dark:text-white" />}
                  </button>
                )}

                {visibleWebsites.map((site) => (
                  <button
                    key={site.id}
                    onClick={() => handleSelectSite(site.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      site.id === activeWebsiteId
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span className="truncate">{site.name}</span>
                    </div>
                    {site.id === activeWebsiteId && <CheckCircle2 className="w-3.5 h-3.5 text-slate-900 dark:text-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Domain pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{displayDomain}</span>
          {!isAllSites && activeSite?.domain && (
            <a 
              href={activeSite.domain.startsWith('http') ? activeSite.domain : (activeSite.domain.includes('localhost') || activeSite.domain.includes('127.0.0.1') ? `http://${activeSite.domain}` : `https://${activeSite.domain}`)} 
              target="_blank" 
              rel="noreferrer" 
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Open site"
            >
              <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
            </a>
          )}
        </div>
      </div>

      {/* Center: Search Bar with URL synchronization */}
      <div className="hidden lg:flex items-center w-72 relative">
        <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search blogs, slugs (Enter)..."
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8.5 pr-10 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
        {localSearch ? (
          <button 
            onClick={() => handleSearchChange('')}
            className="absolute right-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs cursor-pointer"
            title="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <div className="absolute right-2 flex items-center gap-0.5 px-1 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800 text-[9px] text-slate-400 font-mono">
            <Command className="w-2 h-2" /> K
          </div>
        )}
      </div>

      {/* Right: Controls & Actions */}
      <div className="flex items-center space-x-2">
        {/* Instant Dual UI Switcher */}
        <UiThemeSwitcher variant="classic" />

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
          aria-label="Toggle color theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Real User Role Badge - derived from JWT session */}
        <div
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${activeRoleConfig.color}`}
          title={`Your assigned role: ${activeRole}`}
        >
          <ShieldCheck className="w-3 h-3" />
          <span>{activeRole}</span>
        </div>

        {/* Super Admin How to Use Guide Button */}
        {isSuperAdmin && (
          <button
            onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Super Admin Platform Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">How to Use</span>
          </button>
        )}

        {/* Primary CTA — only if allowed to create blogs */}
        {canCreateBlog(activeRole) && (
          <Link
            href={`/blogs/new${siteQuery}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Blog</span>
          </Link>
        )}

        {/* User Profile & Sign Out Dropdown */}
        <div className="relative pl-1 border-l border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="User Profile & Session"
          >
            {(() => {
              const safeAvatar = cleanAvatarUrl(currentUser?.avatar);
              return safeAvatar ? (
                <img
                  src={safeAvatar}
                  alt={currentUser?.name || 'User profile'}
                  className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
                  {currentUser?.name?.charAt(0) || activeRole?.charAt(0) || 'U'}
                </div>
              );
            })()}
            <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-56 rounded-xl b2b-dropdown p-2 z-50 animate-in fade-in zoom-in-95 duration-100 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d121f]">
              <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800/80">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {currentUser?.name || activeRole || 'Administrator'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {currentUser?.email || (currentUser?.name ? `${currentUser.name.toLowerCase().replace(/\s+/g, '.')}@jupsoft.com` : 'Active Session')}
                </div>
                <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {activeRole}
                </div>
              </div>

              <div className="pt-1.5">
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    logout();
                    router.push('/login');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out of CMS</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-2.5 rounded-xl b2b-dropdown border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white shadow-lg animate-in fade-in slide-in-from-bottom-3 duration-150">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>{notification.message}</span>
          <button onClick={clearNotification} className="ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </header>
  );
};

