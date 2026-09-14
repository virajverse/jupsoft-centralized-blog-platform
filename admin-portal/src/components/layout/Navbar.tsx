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
  User
} from 'lucide-react';
import { UserRole } from '../../types';

export const Navbar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setParam, setParams } = useQueryState();
  const { 
    websites, 
    activeWebsiteId, 
    setActiveWebsite, 
    activeRole, 
    setActiveRole, 
    notification,
    clearNotification,
    theme,
    toggleTheme,
    sidebarOpen,
    toggleSidebar,
    currentUser,
    logout
  } = useBlogStore();

  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchParams.get('q') || '');

  // Sync role param from URL on load
  const roleParam = searchParams.get('role');
  useEffect(() => {
    if (roleParam && roleParam !== activeRole) {
      setActiveRole(roleParam as UserRole);
    }
  }, [roleParam, activeRole, setActiveRole]);

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

  // Keep local search synced if URL param changes
  const qParam = searchParams.get('q') || '';
  useEffect(() => {
    setLocalSearch(qParam);
  }, [qParam]);

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

  const handleSelectRole = (r: UserRole) => {
    setActiveRole(r);
    setRoleDropdownOpen(false);
    setParam('role', r);
  };

  const isAllSites = activeWebsiteId === 'all';
  const activeSite = websites.find((w) => w.id === activeWebsiteId);
  const displayName = isAllSites ? 'All Websites' : (activeSite?.name || 'All Websites');
  const displayDomain = isAllSites ? `${websites.length} Connected Domains` : (activeSite?.domain || 'Multi-Tenant');

  const roles: { role: UserRole; color: string; desc: string }[] = [
    { role: 'Super Admin', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40', desc: 'Full System & Tenant Control' },
    { role: 'Editor', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40', desc: 'Review & Approve Content' },
    { role: 'Content Writer', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40', desc: 'Draft & Submit Articles' },
    { role: 'Publisher', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40', desc: 'Schedule & Publish to CDN' },
    { role: 'SEO Manager', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40', desc: 'Meta, Schemas & Audits' },
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

        <div className="relative">
          <button
            onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
            className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span>{displayName}</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${siteDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {siteDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-72 rounded-xl b2b-dropdown p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 shadow-lg">
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                Select Scope
              </div>
              <div className="py-1 space-y-0.5">
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

                {websites.map((site) => (
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
          {!isAllSites && activeSite && (
            <a 
              href={`https://${activeSite.domain}`} 
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
          placeholder="Search articles, slugs (Enter)..."
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

        {/* Role Selector with URL param */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${activeRoleConfig.color}`}
            title="Simulate RBAC role"
          >
            <ShieldCheck className="w-3 h-3" />
            <span>{activeRole}</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-60 rounded-xl b2b-dropdown p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 shadow-lg">
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                Simulate RBAC Role
              </div>
              <div className="py-1 space-y-0.5">
                {roles.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => handleSelectRole(r.role)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      r.role === activeRole
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-semibold">{r.role}</div>
                      <div className="text-[10px] text-slate-400">{r.desc}</div>
                    </div>
                    {r.role === activeRole && <CheckCircle2 className="w-3.5 h-3.5 text-slate-900 dark:text-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Primary CTA */}
        <Link
          href={`/blogs/new${siteQuery}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Article</span>
        </Link>

        {/* User Profile & Sign Out Dropdown */}
        <div className="relative pl-1 border-l border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="User Profile & Session"
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
            )}
            <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-56 rounded-xl b2b-dropdown p-2 z-50 animate-in fade-in zoom-in-95 duration-100 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d121f]">
              <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800/80">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {currentUser?.name || 'Aarav Sharma'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {currentUser?.email || 'admin@jupsoft.com'}
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
