'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  AlertCircle,
  Plus,
  Clock,
  ChevronRight,
  ArrowRightLeft,
  Kanban,
  CheckCircle2,
  Settings,
  TrendingUp,
  Radio,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Target,
  Sparkles,
  Zap,
  Flame,
  Check,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { Blog, Website, UserAccount, UserRole, LanguageCode } from '../../types';
import { canCreateBlog, canAccessModule, isGlobalScopeRole } from '../../utils/permissions';
import { apiClient } from '../../services/apiClient';
import { useBlogStore } from '../../store/useBlogStore';
import { useQueryState } from '../../hooks/useQueryState';

interface JupsoftDashboardViewProps {
  blogs: Blog[];
  displayedBlogs: Blog[];
  publishedBlogs: Blog[];
  underReviewBlogs: Blog[];
  approvedBlogs: Blog[];
  draftBlogs: Blog[];
  totalWords: number;
  websites: Website[];
  activeWebsiteId: string;
  activeSite: Website;
  isAllSites: boolean;
  activeRole: UserRole;
  currentUser: UserAccount | null;
  isLoading?: boolean;
}

const ALL_LANGUAGES: LanguageCode[] = ['en', 'hi', 'fr', 'ar'];

export const JupsoftDashboardView: React.FC<JupsoftDashboardViewProps> = ({
  blogs,
  displayedBlogs,
  publishedBlogs,
  underReviewBlogs,
  approvedBlogs,
  draftBlogs,
  totalWords,
  websites,
  activeWebsiteId,
  activeSite,
  isAllSites,
  activeRole,
  currentUser,
  isLoading,
}) => {
  const { setParam } = useQueryState();
  const setActiveWebsite = useBlogStore((s) => s.setActiveWebsite);
  const updateWebsite = useBlogStore((s) => s.updateWebsite);
  const showNotification = useBlogStore((s) => s.showNotification);
  const siteQuery = `?site=${activeWebsiteId}`;

  const [isQuotaDropdownOpen, setIsQuotaDropdownOpen] = React.useState(false);
  const [isCustomQuotaOpen, setIsCustomQuotaOpen] = React.useState(false);
  const [customQuotaVal, setCustomQuotaVal] = React.useState(activeSite?.monthlyBlogTarget ?? 15);
  const quotaDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (quotaDropdownRef.current && !quotaDropdownRef.current.contains(e.target as Node)) {
        setIsQuotaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleUpdateQuota = async (newTarget: number) => {
    if (!activeSite || isAllSites) return;
    try {
      await updateWebsite(activeSite.id, { monthlyBlogTarget: newTarget });
      showNotification(`Publishing target updated to ${newTarget} blogs/month!`, 'success');
      setIsQuotaDropdownOpen(false);
      setIsCustomQuotaOpen(false);
    } catch {
      showNotification('Failed to update publishing target', 'warning');
    }
  };

  const handleUpdateCadence = async (newCadence: string) => {
    if (!activeSite || isAllSites) return;
    try {
      await updateWebsite(activeSite.id, { targetCadence: newCadence });
      showNotification(`Cadence pacing cycle updated to ${newCadence}!`, 'success');
    } catch {
      showNotification('Failed to update cadence cycle', 'warning');
    }
  };

  // Multi-tenant visible websites (hide unauthorized tenants from non-super admins)
  const isSuperAdmin = isGlobalScopeRole(activeRole);
  const userAssignedWebsites = websites.filter((site) => currentUser?.roleAssignments?.[site.id]);
  const visibleWebsites = isSuperAdmin
    ? websites
    : (userAssignedWebsites.length > 0 ? userAssignedWebsites : (activeSite ? [activeSite] : []));

  // Role-based System Workbench module permissions
  const canAccessWorkflow = canAccessModule(activeRole, 'workflow', currentUser?.customModules);
  const canAccessTaxonomy = canAccessModule(activeRole, 'taxonomy', currentUser?.customModules);
  const canAccessRedirects = canAccessModule(activeRole, 'redirects', currentUser?.customModules);
  const canAccessSettings = canAccessModule(activeRole, 'settings', currentUser?.customModules);
  const hasAnyWorkbenchItem = canAccessWorkflow || canAccessTaxonomy || canAccessRedirects || canAccessSettings;

  // Recent 8 blogs
  const recentBlogs = [...displayedBlogs]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  const scheduledBlogs = displayedBlogs.filter((b) => b.status === 'Scheduled');

  // Role restriction: Monthly Publishing Cadence is strictly available to Super Admin and Website Admin
  const isAdmin = activeRole === 'Super Admin' || activeRole === 'Website Admin';

  // Monthly Publishing Cadence State
  const [monthlyPeriod, setMonthlyPeriod] = React.useState<string>('12m'); // '12m' | '6m' | 'YYYY'
  const [isChartCollapsed, setIsChartCollapsed] = React.useState<boolean>(false);
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = React.useState<boolean>(false);
  const [hoveredMonthKey, setHoveredMonthKey] = React.useState<string | null>(null);
  const periodDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close period dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target as Node)) {
        setIsPeriodDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Available Years extracted dynamically from blogs dataset
  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    displayedBlogs.forEach((b) => {
      const d = b.publishDate || b.createdAt;
      if (d) {
        const y = new Date(d).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [displayedBlogs]);

  // Real-time Monthly Publishing Target & Cadence Progress calculation (Phase 4 & 5 SaaS UX)
  const targetMetrics = React.useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0).getTime();
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).getTime();

    const targetCount = isAllSites
      ? visibleWebsites.reduce((acc, w) => acc + (w.monthlyBlogTarget || 15), 0)
      : (activeSite?.monthlyBlogTarget || 15);

    const publishedThisMonth = displayedBlogs.filter((b) => {
      if (b.status !== 'Published') return false;
      const d = b.publishDate ? new Date(b.publishDate).getTime() : new Date(b.createdAt).getTime();
      return d >= startOfMonth && d <= endOfMonth;
    }).length;

    const inReviewCount = displayedBlogs.filter((b) => b.status === 'Under Review').length;
    const draftsCount = displayedBlogs.filter((b) => b.status === 'Draft').length;

    const percentage = targetCount > 0 ? Math.min(100, Math.round((publishedThisMonth / targetCount) * 100)) : 0;
    const deficit = Math.max(0, targetCount - publishedThisMonth);
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysRemaining = Math.max(1, totalDaysInMonth - now.getDate());
    const weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7));
    const weeklyPaceRequired = Math.ceil(deficit / weeksRemaining);

    const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    let status: 'COMPLETED' | 'ON_TRACK' | 'BEHIND' | 'CRITICAL' = 'ON_TRACK';
    if (publishedThisMonth >= targetCount) {
      status = 'COMPLETED';
    } else if (daysRemaining <= 7 && deficit > 0) {
      status = 'CRITICAL';
    } else if (percentage < ((now.getDate() / totalDaysInMonth) * 100) - 15) {
      status = 'BEHIND';
    }

    return {
      targetCount,
      publishedThisMonth,
      inReviewCount,
      draftsCount,
      percentage,
      deficit,
      daysRemaining,
      weeklyPaceRequired,
      monthName,
      status,
    };
  }, [displayedBlogs, isAllSites, visibleWebsites, activeSite]);

  // Monthly buckets calculation
  const monthlyTrajectory = React.useMemo(() => {
    const now = new Date();
    const buckets: Array<{
      key: string;
      label: string;
      year: number;
      monthIndex: number;
      fullLabel: string;
      publishedCount: number;
      pipelineCount: number;
      totalCount: number;
    }> = [];

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const FULL_MONTHS = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    if (monthlyPeriod === '6m' || monthlyPeriod === '12m') {
      const count = monthlyPeriod === '6m' ? 6 : 12;
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        buckets.push({
          key,
          label: MONTH_NAMES[m],
          year: y,
          monthIndex: m,
          fullLabel: `${FULL_MONTHS[m]} ${y}`,
          publishedCount: 0,
          pipelineCount: 0,
          totalCount: 0,
        });
      }
    } else {
      const targetYear = parseInt(monthlyPeriod, 10) || now.getFullYear();
      for (let m = 0; m < 12; m++) {
        const key = `${targetYear}-${String(m + 1).padStart(2, '0')}`;
        buckets.push({
          key,
          label: MONTH_NAMES[m],
          year: targetYear,
          monthIndex: m,
          fullLabel: `${FULL_MONTHS[m]} ${targetYear}`,
          publishedCount: 0,
          pipelineCount: 0,
          totalCount: 0,
        });
      }
    }

    const bucketMap = new Map(buckets.map((b) => [b.key, b]));

    displayedBlogs.forEach((blog) => {
      const rawDate = blog.publishDate || blog.createdAt;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const targetBucket = bucketMap.get(key);
      if (targetBucket) {
        if (blog.status === 'Published') {
          targetBucket.publishedCount += 1;
        } else {
          targetBucket.pipelineCount += 1;
        }
        targetBucket.totalCount += 1;
      }
    });

    return buckets;
  }, [displayedBlogs, monthlyPeriod]);

  // Summary Metrics for the active period
  const { totalPublishedInPeriod, totalPipelineInPeriod, peakMonth, avgMonthlyPublished, maxTrajectoryCount } =
    React.useMemo(() => {
      let pub = 0;
      let pipe = 0;
      let peak = monthlyTrajectory[0];
      let maxCount = 0;

      monthlyTrajectory.forEach((b) => {
        pub += b.publishedCount;
        pipe += b.pipelineCount;
        if (b.totalCount > maxCount) {
          maxCount = b.totalCount;
        }
        if (!peak || b.publishedCount > peak.publishedCount) {
          peak = b;
        }
      });

      const avg = monthlyTrajectory.length > 0 ? (pub / monthlyTrajectory.length).toFixed(1) : '0';
      return {
        totalPublishedInPeriod: pub,
        totalPipelineInPeriod: pipe,
        peakMonth: peak,
        avgMonthlyPublished: avg,
        maxTrajectoryCount: Math.max(maxCount, 1),
      };
    }, [monthlyTrajectory]);

  // Only show full skeleton on cold initial load (never on tenant switch)
  if (isLoading && blogs.length === 0) {
    return (
      <div className="space-y-3 font-sans text-slate-800 dark:text-slate-200 animate-in fade-in duration-150">
        {/* Context Strip Skeleton */}
        <div className="h-9 px-3 py-2 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500/40 shrink-0" />
            <div className="w-36 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="w-24 h-3 bg-slate-100 dark:bg-slate-850 rounded hidden sm:block" />
          </div>
          <div className="w-20 h-5 bg-red-600/30 rounded" />
        </div>

        {/* 4 Scorecards Shimmer */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-3 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="w-16 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-5 h-5 bg-slate-100 dark:bg-slate-800 rounded-full" />
              </div>
              <div className="w-12 h-6 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-24 h-2 bg-slate-100 dark:bg-slate-850 rounded" />
            </div>
          ))}
        </div>

        {/* Two-Column Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 p-3 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg space-y-2.5 animate-pulse">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60">
                <div className="w-1/2 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-16 h-4 bg-slate-100 dark:bg-slate-850 rounded-full" />
              </div>
            ))}
          </div>

          <div className="p-3 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 animate-pulse">
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1 py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <div className="w-3/4 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-1/3 h-2 bg-slate-100 dark:bg-slate-850 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-sans text-slate-800 dark:text-slate-200">
      {/* Top Compact Action & Context Strip (Height ~36px) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
            {isAllSites ? 'Network Content Matrix' : activeSite?.name || 'Website Workspace'}
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
            {isAllSites ? `${visibleWebsites.length} Connected Domains` : activeSite?.domain}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {canCreateBlog(activeRole) && (
            <Link
              href={`/blogs/new${siteQuery}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Blog</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Executive Real-Time Monthly Publishing Target & Cadence Progress Widget (Phase 4 & 5 SaaS UX) ── */}
      <div className="p-4 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200/60 dark:border-red-900/60">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {targetMetrics.monthName} Publishing Cadence Target
                </h2>
                {targetMetrics.status === 'COMPLETED' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <Sparkles className="w-3 h-3" />
                    Target Hit
                  </span>
                ) : targetMetrics.status === 'CRITICAL' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                    <Flame className="w-3 h-3" />
                    Critical Shortfall ({targetMetrics.deficit} Behind)
                  </span>
                ) : targetMetrics.status === 'BEHIND' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <Zap className="w-3 h-3" />
                    Pacing Behind ({targetMetrics.deficit} Remaining)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    <TrendingUp className="w-3 h-3" />
                    On Track
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAllSites ? 'Network aggregate quota across all websites' : `Active Tenant: ${activeSite?.name || 'Website Workspace'}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Quick Quota Preset Dropdown (Direct SaaS Control) */}
            {!isAllSites && canAccessSettings && (
              <div className="relative" ref={quotaDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsQuotaDropdownOpen(!isQuotaDropdownOpen)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-[11px] border border-slate-200 dark:border-slate-750 transition-colors"
                  title="Change monthly quota preset"
                >
                  <SlidersHorizontal className="w-3 h-3 text-red-500" />
                  <span>Quota: <strong>{targetMetrics.targetCount}/mo</strong></span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isQuotaDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-30">
                    <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Presets</p>
                    </div>
                    {[
                      { label: '5 blogs / mo', value: 5, tag: 'Starter' },
                      { label: '10 blogs / mo', value: 10, tag: 'Standard' },
                      { label: '15 blogs / mo', value: 15, tag: 'Default' },
                      { label: '20 blogs / mo', value: 20, tag: 'Aggressive' },
                      { label: '30 blogs / mo', value: 30, tag: 'Enterprise' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => handleUpdateQuota(item.value)}
                        className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                          targetMetrics.targetCount === item.value ? 'font-bold text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {targetMetrics.targetCount === item.value && <Check className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />}
                          <span>{item.label}</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                          {item.tag}
                        </span>
                      </button>
                    ))}
                    <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuotaDropdownOpen(false);
                          setCustomQuotaVal(targetMetrics.targetCount);
                          setIsCustomQuotaOpen(true);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-1.5 font-semibold"
                      >
                        <span>Custom Target...</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Cadence Cycle Dropdown */}
            {!isAllSites && canAccessSettings && (
              <select
                value={activeSite?.targetCadence || 'monthly'}
                onChange={(e) => handleUpdateCadence(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-[11px] border border-slate-200 dark:border-slate-750 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                title="Cadence Pacing Cycle"
              >
                <option value="monthly">Monthly Cycle</option>
                <option value="weekly">Weekly Cycle</option>
                <option value="bi-weekly">Bi-Weekly Cycle</option>
              </select>
            )}

            {canAccessSettings && (
              <Link
                href={`/settings?tab=general${siteQuery ? '&' + siteQuery.slice(1) : ''}`}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 text-[11px] font-semibold"
                title="Configure full alerts, digests & default assets in settings"
              >
                <Settings className="w-3 h-3" />
                <span>Full Settings</span>
              </Link>
            )}

            <div className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-semibold">
              <span className="text-slate-900 dark:text-white font-bold">{targetMetrics.daysRemaining}</span> days left
            </div>
          </div>
        </div>

        {/* Progress Bar & Numerical Metrics */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-xs">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {targetMetrics.publishedThisMonth}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                / {targetMetrics.targetCount} Blogs Published
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                {targetMetrics.percentage}%
              </span>
              {targetMetrics.deficit > 0 && (
                <span className="text-[11px] text-slate-500 font-mono">
                  (Pace needed: <strong className="text-slate-800 dark:text-slate-200">{targetMetrics.weeklyPaceRequired}</strong>/week)
                </span>
              )}
            </div>
          </div>

          {/* Visual Progress Bar - Multi-Segment (Published: Green, In Review: Orange) */}
          <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            {targetMetrics.targetCount > 0 && targetMetrics.publishedThisMonth > 0 && (
              <div
                className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-500"
                style={{
                  width: `${Math.min(100, (targetMetrics.publishedThisMonth / targetMetrics.targetCount) * 100)}%`,
                }}
                title={`Published: ${targetMetrics.publishedThisMonth}`}
              />
            )}
            {targetMetrics.targetCount > 0 && targetMetrics.inReviewCount > 0 && (
              <div
                className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                style={{
                  width: `${Math.min(
                    Math.max(0, 100 - (targetMetrics.publishedThisMonth / targetMetrics.targetCount) * 100),
                    (targetMetrics.inReviewCount / targetMetrics.targetCount) * 100
                  )}%`,
                }}
                title={`In Review: ${targetMetrics.inReviewCount}`}
              />
            )}
          </div>
        </div>

        {/* Pipeline Breakdown Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-850 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Published: <strong>{targetMetrics.publishedThisMonth}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span>In Review: <strong>{targetMetrics.inReviewCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              <span>Drafts: <strong>{targetMetrics.draftsCount}</strong></span>
            </div>
          </div>

          {targetMetrics.inReviewCount > 0 && (
            <Link
              href={`/workflow${siteQuery}`}
              className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
            >
              <span>{targetMetrics.inReviewCount} article(s) ready to review &amp; publish &rarr;</span>
            </Link>
          )}
        </div>
      </div>

      {/* Custom Target Quota Modal */}
      {isCustomQuotaOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-red-600" />
                <span>Set Custom Publishing Target</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomQuotaOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set the monthly target article count for <strong className="text-slate-800 dark:text-slate-200">{activeSite?.name}</strong>. Real-time pacing and email alert triggers will instantly recalculate.
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Monthly Target (Blogs)
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={customQuotaVal}
                onChange={(e) => setCustomQuotaVal(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCustomQuotaOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateQuota(customQuotaVal)}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Save Target
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jupsoft Signature Compact Metrics Grid (4 in a row, ~64px height) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {/* Metric 1: Total Blogs */}
        <Link
          href={`/blogs${siteQuery}`}
          className="p-2.5 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg hover:border-red-400 dark:hover:border-red-500 transition-colors group block"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Total Blogs</span>
            <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 transition-colors" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {displayedBlogs.length}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">100% Total</span>
          </div>
        </Link>

        {/* Metric 2: Published */}
        <Link
          href={`/blogs${siteQuery}&status=Published`}
          className="p-2.5 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors group block"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Published</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {publishedBlogs.length}
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              {displayedBlogs.length > 0 ? Math.round((publishedBlogs.length / displayedBlogs.length) * 100) : 0}% Live
            </span>
          </div>
        </Link>

        {/* Metric 3: Under Review */}
        <Link
          href={`/blogs${siteQuery}&status=Under%20Review`}
          className="p-2.5 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg hover:border-amber-400 dark:hover:border-amber-500 transition-colors group block"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>In Review</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {underReviewBlogs.length}
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
              {underReviewBlogs.length > 0 ? 'Action Req' : 'Clear'}
            </span>
          </div>
        </Link>

        {/* Metric 4: Drafts & Scheduled */}
        <Link
          href={`/blogs${siteQuery}&status=Draft`}
          className="p-2.5 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors group block"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Drafts / Scheduled</span>
            <Clock className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-700 dark:text-slate-300 tracking-tight">
              {draftBlogs.length + scheduledBlogs.length}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {draftBlogs.length} d · {scheduledBlogs.length} s
            </span>
          </div>
        </Link>

        {/* Metric 5: Word Count / Content Volume */}
        <div className="p-2.5 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Total Words</span>
            <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
              {totalWords.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Published Words</span>
          </div>
        </div>
      </div>

      {/* Monthly Publishing Cadence - Role Protected (Super Admin & Website Admin Only) */}
      {isAdmin && (
        <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs relative overflow-visible transition-all duration-200">
          {/* Executive Header - Ultra-Compact */}
          <div className="px-3 py-1.5 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 rounded-t-lg">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <BarChart3 className="w-3 h-3" />
              </div>
              <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider truncate">
                Monthly Publishing Cadence
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                {isAllSites ? 'Network' : activeSite?.name || 'Website'}
              </span>
            </div>

            {/* Inline Legend & Period Controls */}
            <div className="flex items-center gap-2.5 text-xs shrink-0">
              {/* Micro Legend */}
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-gradient-to-t from-emerald-600 to-teal-500" />
                  Published
                </span>
                {totalPipelineInPeriod > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-amber-400" />
                    Workflow
                  </span>
                )}
              </div>

              {/* Period Dropdown */}
              <div className="relative" ref={periodDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors shadow-2xs cursor-pointer"
                >
                  <Calendar className="w-2.5 h-2.5 text-slate-500" />
                  <span>
                    {monthlyPeriod === '12m'
                      ? 'Past 12 Months'
                      : monthlyPeriod === '6m'
                      ? 'Past 6 Months'
                      : `Year ${monthlyPeriod}`}
                  </span>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                </button>

                {isPeriodDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-30 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Select Period
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMonthlyPeriod('12m');
                        setIsPeriodDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between cursor-pointer ${
                        monthlyPeriod === '12m'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      <span>Past 12 Months</span>
                      {monthlyPeriod === '12m' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMonthlyPeriod('6m');
                        setIsPeriodDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between cursor-pointer ${
                        monthlyPeriod === '6m'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      <span>Past 6 Months</span>
                      {monthlyPeriod === '6m' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      By Calendar Year
                    </div>
                    {availableYears.map((year) => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          setMonthlyPeriod(String(year));
                          setIsPeriodDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between cursor-pointer ${
                          monthlyPeriod === String(year)
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'
                        }`}
                      >
                        <span>Year {year}</span>
                        {monthlyPeriod === String(year) && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Collapse/Expand Toggle */}
              <button
                type="button"
                onClick={() => setIsChartCollapsed(!isChartCollapsed)}
                className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={isChartCollapsed ? 'Expand Graph' : 'Collapse Graph'}
              >
                {isChartCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Chart Body - Compact & Practically Perfect */}
          {!isChartCollapsed ? (
            <div className="px-3 py-2 sm:px-4 sm:py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6 rounded-b-lg">
              {/* Left: 12-Month Cadence - Tight grouping with NO awkward gaps */}
              <div className="w-full md:max-w-xl lg:max-w-2xl">
                <div className="flex items-end justify-between gap-1 sm:gap-1.5 h-40">
                  {monthlyTrajectory.map((month, idx) => {
                    const isHovered = hoveredMonthKey === month.key;
                    const total = month.totalCount;
                    const published = month.publishedCount;
                    const pipeline = month.pipelineCount;

                    // Height percentage (scale max 100%, min 20% if total > 0)
                    const totalHeightPct = total > 0 ? Math.max(20, Math.round((total / maxTrajectoryCount) * 100)) : 0;
                    const publishedSharePct = total > 0 ? (published / total) * 100 : 0;
                    const pipelineSharePct = total > 0 ? (pipeline / total) * 100 : 0;

                    const tooltipAlign =
                      idx <= 1
                        ? 'left-0'
                        : idx >= monthlyTrajectory.length - 2
                        ? 'right-0'
                        : 'left-1/2 -translate-x-1/2';

                    return (
                      <div
                        key={month.key}
                        className="group flex-1 flex flex-col items-center h-full justify-end relative cursor-pointer"
                        onMouseEnter={() => setHoveredMonthKey(month.key)}
                        onMouseLeave={() => setHoveredMonthKey(null)}
                      >
                        {/* Hover Tooltip Card */}
                        {isHovered && (
                          <div
                            className={`absolute bottom-full mb-2 z-50 pointer-events-none min-w-[125px] p-2 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] shadow-2xl border border-slate-700/60 dark:border-slate-200 animate-in fade-in zoom-in-95 duration-100 ${tooltipAlign}`}
                          >
                            <div className="font-bold border-b border-slate-700 dark:border-slate-200 pb-0.5 mb-1">
                              {month.fullLabel}
                            </div>
                            <div className="flex items-center justify-between gap-2 text-emerald-400 dark:text-emerald-600">
                              <span>Published:</span>
                              <span className="font-mono font-bold">{published}</span>
                            </div>
                            {pipeline > 0 && (
                              <div className="flex items-center justify-between gap-2 text-amber-400 dark:text-amber-600">
                                <span>Workflow:</span>
                                <span className="font-mono font-bold">{pipeline}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-2 pt-0.5 mt-0.5 border-t border-slate-800 dark:border-slate-100 font-bold">
                              <span>Total:</span>
                              <span className="font-mono">{total}</span>
                            </div>
                          </div>
                        )}

                        {/* The Bar Track */}
                        <div className="w-full flex-1 flex flex-col justify-end">
                          {total > 0 ? (
                            <div
                              className={`w-full max-w-[24px] sm:max-w-[28px] mx-auto flex flex-col justify-end rounded-t-sm overflow-hidden transition-all duration-300 ${
                                isHovered ? 'ring-2 ring-emerald-500/60 shadow-xs' : ''
                              }`}
                              style={{ height: `${totalHeightPct}%` }}
                            >
                              {pipeline > 0 && (
                                <div
                                  className="w-full bg-amber-400 dark:bg-amber-500 transition-all duration-300"
                                  style={{ height: `${pipelineSharePct}%` }}
                                />
                              )}
                              {published > 0 && (
                                <div
                                  className="w-full bg-gradient-to-t from-emerald-600 to-teal-500 dark:from-emerald-500 dark:to-teal-400 transition-all duration-300"
                                  style={{ height: `${publishedSharePct}%` }}
                                />
                              )}
                            </div>
                          ) : (
                            /* Clean subtle baseline tick for months with 0 posts */
                            <div
                              className={`w-full max-w-[24px] sm:max-w-[28px] mx-auto h-[3px] rounded-full transition-all duration-200 ${
                                isHovered
                                  ? 'bg-slate-400 dark:bg-slate-600 h-[4px]'
                                  : 'bg-slate-200 dark:bg-slate-850'
                              }`}
                            />
                          )}
                        </div>

                        {/* Month Label */}
                        <div className="mt-1.5 text-center select-none leading-none">
                          <span
                            className={`text-[9px] uppercase font-bold tracking-tight block ${
                              isHovered
                                ? 'text-emerald-600 dark:text-emerald-400 font-black'
                                : total > 0
                                ? 'text-slate-800 dark:text-slate-200'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {month.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Executive Practical Summary Scorecards */}
              <div className="w-full md:w-auto md:border-l md:border-slate-200 md:dark:border-slate-800 md:pl-5 flex items-center justify-between md:justify-end gap-2.5 sm:gap-3 shrink-0">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  {/* Metric 1: In Period */}
                  <div className="px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">In Period</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        {totalPublishedInPeriod}
                      </span>
                      <span className="text-[10px] text-slate-400">posts</span>
                    </div>
                  </div>

                  {/* Metric 2: Peak Month */}
                  <div className="px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Peak Month</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {peakMonth && peakMonth.publishedCount > 0 ? `${peakMonth.label} (${peakMonth.publishedCount})` : 'None'}
                      </span>
                    </div>
                  </div>

                  {/* Metric 3: Monthly Average */}
                  <div className="px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avg Rate</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {avgMonthlyPublished}
                      </span>
                      <span className="text-[10px] text-slate-400">/mo</span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Link */}
                <Link
                  href={`/blogs${siteQuery}&status=Published`}
                  className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/60 text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 text-[10px] font-bold transition-colors shrink-0"
                >
                  <span>Browse</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ) : (
            /* Collapsed Summary Banner */
            <div className="px-3 py-1.5 flex items-center justify-between text-xs bg-slate-50/40 dark:bg-slate-900/30 rounded-b-lg">
              <span className="text-[11px] text-slate-500 font-mono">
                {totalPublishedInPeriod} published articles recorded in selected timeframe ({peakMonth ? `Peak: ${peakMonth.fullLabel} with ${peakMonth.publishedCount}` : 'No posts'}).
              </span>
              <button
                type="button"
                onClick={() => setIsChartCollapsed(false)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
              >
                Expand Chart
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Split-Screen Data Grid (Recent Editorial Pipeline + Multi-Tenant Infrastructure) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-2.5 items-start">
        {/* Left 2 Cols: Compact Spreadsheet Recent Blogs Table */}
        <div className="xl:col-span-2 bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/60">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Recent Editorial Stream
              </span>
              <span className="text-[10px] font-mono px-1.5 py-[1px] rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                {recentBlogs.length} items
              </span>
            </div>

            <Link
              href={`/blogs${siteQuery}`}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-0.5 transition-colors"
            >
              <span>View All</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/30 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2 px-3">Title & Slug</th>
                  {isAllSites && <th className="py-2 px-2.5">Website</th>}
                  <th className="py-2 px-2.5">Status</th>
                  <th className="py-2 px-2.5">Author</th>
                  <th className="py-2 px-2.5">Languages</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {recentBlogs.map((blog) => {
                  const defaultTrans = blog.translations['en'] || Object.values(blog.translations)[0];
                  const tenant = websites.find((w) => w.id === blog.websiteId);
                  const availableLangs = ALL_LANGUAGES.filter((l) => blog.translations[l]);

                  return (
                    <tr
                      key={blog.id}
                      onMouseEnter={() => {
                        try {
                          const existing = sessionStorage.getItem(`jupsoft_editing_blog_${blog.id}`);
                          if (!existing) {
                            apiClient.getBlogById(blog.id).then((full) => {
                              if (full) sessionStorage.setItem(`jupsoft_editing_blog_${blog.id}`, JSON.stringify(full));
                            }).catch(() => {});
                          }
                        } catch {}
                      }}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors h-9"
                    >
                      {/* Title & Slug */}
                      <td className="py-1.5 px-3 max-w-[220px]">
                        <div className="truncate font-semibold text-slate-900 dark:text-slate-100 hover:text-red-600 text-xs">
                          <Link 
                            href={`/blogs/${blog.id}${siteQuery}`}
                            prefetch={true}
                            onClick={() => {
                              try {
                                sessionStorage.setItem(`jupsoft_editing_blog_${blog.id}`, JSON.stringify(blog));
                              } catch {}
                            }}
                          >
                            {defaultTrans?.title || 'Untitled Blog'}
                          </Link>
                        </div>
                        <div className="truncate text-[10px] text-slate-400 font-mono">
                          /{defaultTrans?.slug || blog.id}
                        </div>
                      </td>

                      {/* Tenant (If All Sites) */}
                      {isAllSites && (
                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                          <span className="text-[10px] font-medium px-1.5 py-[1px] rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                            {tenant?.name?.replace(/Jupsoft | Platform/g, '') || 'Custom'}
                          </span>
                        </td>
                      )}

                      {/* Status Pill */}
                      <td className="py-1.5 px-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-[1px] rounded ${
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
                              className="text-[9px] font-mono font-bold px-1 py-[1px] rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-1.5 px-3 text-right whitespace-nowrap">
                        <Link
                          href={`/blogs/${blog.id}${siteQuery}`}
                          prefetch={true}
                          onClick={() => {
                            try {
                              sessionStorage.setItem(`jupsoft_editing_blog_${blog.id}`, JSON.stringify(blog));
                            } catch {}
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Multi-Tenant Infrastructure & Quick Ops */}
        <div className="space-y-2.5">
          {/* Active Websites Status Card (Only show if user has accessible tenants) */}
          {visibleWebsites.length > 0 && (
            <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                  Connected Websites
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {visibleWebsites.length} Active
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {visibleWebsites.map((site) => {
                  const serverCount = site._count?.blogs;
                  const localCount = blogs.filter((b) => b.websiteId === site.id).length;
                  const count = typeof serverCount === 'number' ? Math.max(serverCount, localCount) : localCount;
                  const isSelected = activeWebsiteId === site.id;

                  return (
                    <div
                      key={site.id}
                      onClick={() => {
                        setActiveWebsite(site.id);
                        setParam('site', site.id, true);
                      }}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                          : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="truncate">{site.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {site.domain}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {count}
                        </span>
                        <div className="text-[9px] text-slate-400">blogs</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick System Links (Only visible if role has access to at least 1 workbench module) */}
          {hasAnyWorkbenchItem && (
            <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                System Workbench
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {canAccessWorkflow && (
                  <Link
                    href={`/workflow${siteQuery}`}
                    className="flex items-center gap-1.5 p-2 rounded bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors"
                  >
                    <Kanban className="w-3.5 h-3.5 text-amber-500" />
                    <span>In Review</span>
                  </Link>
                )}

                {canAccessTaxonomy && (
                  <Link
                    href={`/taxonomy${siteQuery}`}
                    className="flex items-center gap-1.5 p-2 rounded bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors"
                  >
                    <Radio className="w-3.5 h-3.5 text-purple-500" />
                    <span>Categories &amp; Tags</span>
                  </Link>
                )}

                {canAccessRedirects && (
                  <Link
                    href={`/settings${siteQuery}&tab=redirects`}
                    className="flex items-center gap-1.5 p-2 rounded bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
                    <span>Link Redirects</span>
                  </Link>
                )}

                {canAccessSettings && (
                  <Link
                    href={`/settings${siteQuery}`}
                    className="flex items-center gap-1.5 p-2 rounded bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    <span>Settings</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
