'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { RedirectItem } from '../../types';
import { 
  ArrowRightLeft, 
  Plus, 
  Search, 
  Trash2, 
  Globe, 
  Check, 
  TrendingUp, 
  ShieldCheck, 
  ExternalLink,
  ArrowRight,
  Zap,
  Info
} from 'lucide-react';

export const RedirectsView: React.FC = () => {
  const searchParams = useSearchParams();
  const { 
    redirects, 
    websites, 
    activeWebsiteId, 
    addRedirect, 
    deleteRedirect, 
    showNotification 
  } = useBlogStore();

  const isAllSites = activeWebsiteId === 'all';
  const activeSite = websites.find((w) => w.id === activeWebsiteId) || websites[0];

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [targetSiteId, setTargetSiteId] = useState<string>(activeWebsiteId === 'all' ? websites[0]?.id : activeWebsiteId);
  const [fromSlug, setFromSlug] = useState('');
  const [toSlug, setToSlug] = useState('');

  const filteredRedirects = redirects.filter((r) => {
    const matchesSite = isAllSites || r.websiteId === activeWebsiteId;
    if (!matchesSite) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.fromSlug.toLowerCase().includes(q) || r.toSlug.toLowerCase().includes(q);
  });

  const totalHits = redirects.reduce((sum, r) => sum + r.hitCount, 0);

  const handleCreateRedirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromSlug.trim() || !toSlug.trim()) {
      showNotification('Please specify both source slug and target slug.', 'warning');
      return;
    }

    const cleanFrom = fromSlug.trim().replace(/^\/+|\/+$/g, '');
    const cleanTo = toSlug.trim().replace(/^\/+|\/+$/g, '');

    if (cleanFrom === cleanTo) {
      showNotification('Source and target slugs cannot be identical.', 'warning');
      return;
    }

    const newRedirect: RedirectItem = {
      id: `red-${Date.now()}`,
      websiteId: targetSiteId,
      fromSlug: cleanFrom,
      toSlug: cleanTo,
      statusCode: 301,
      hitCount: 0,
      createdAt: new Date().toISOString(),
    };

    addRedirect(newRedirect);
    setIsModalOpen(false);
    setFromSlug('');
    setToSlug('');
    showNotification(`301 redirect rule created: /${cleanFrom} → /${cleanTo}`, 'success');
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              301 Permanent Redirects
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
              TRD Section 7 &amp; 17
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Preserve organic SEO authority and prevent 404 errors whenever published slugs or URLs are updated.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New 301 Rule</span>
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <ArrowRightLeft className="w-4 h-4 text-blue-500" />
            Active Redirect Rules
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {redirects.length}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Total Hits Forwarded
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {totalHits.toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            SEO Link Equity Preserved
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
            100%
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs space-y-4">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Permanent URL Mapping Rules
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluated by CloudFront Edge / Next.js middleware prior to page rendering.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search source or target slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold">Tenant Domain</th>
                <th className="py-3 px-4 font-semibold">Old Slug (Origin)</th>
                <th className="py-3 px-4 font-semibold text-center">Redirect</th>
                <th className="py-3 px-4 font-semibold">New Slug (Destination)</th>
                <th className="py-3 px-4 font-semibold">HTTP Code</th>
                <th className="py-3 px-4 font-semibold">Traffic Hits</th>
                <th className="py-3 px-4 font-semibold">Created</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredRedirects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                    No redirect rules match current filter.
                  </td>
                </tr>
              ) : (
                filteredRedirects.map((r) => {
                  const site = websites.find((w) => w.id === r.websiteId);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{site?.name || r.websiteId}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{site?.domain}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        <span className="text-slate-400">/</span>{r.fromSlug}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <ArrowRight className="w-4 h-4 text-slate-400 mx-auto" />
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="text-emerald-400/60">/</span>{r.toSlug}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold border bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                          {r.statusCode}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {r.hitCount.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Delete redirect from /${r.fromSlug}?`)) {
                              deleteRedirect(r.id);
                              showNotification('Redirect rule deleted', 'info');
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer border border-rose-200 dark:border-rose-800/60"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Architecture Alert */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-slate-900 dark:text-white">
            Automated Slug Protection Guarantee
          </div>
          <p className="leading-relaxed">
            Whenever a published article&apos;s slug is updated in the Blog Editor, Jupsoft CMS automatically registers a 301 Permanent Redirect rule linking the previous slug to the new slug, preventing search engines from dropping indexed rank or penalizing broken back-links.
          </p>
        </div>
      </div>

      {/* MODAL: CREATE 301 REDIRECT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Add 301 Permanent Redirect Rule
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRedirect} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tenant Scope
                </label>
                <select
                  value={targetSiteId}
                  onChange={(e) => setTargetSiteId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  {websites.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.domain})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Source Old Slug (From) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center">
                  <span className="px-2.5 py-2 bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-800 rounded-l-lg text-slate-500 font-mono">
                    /
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="legacy-article-path"
                    value={fromSlug}
                    onChange={(e) => setFromSlug(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-r-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target New Slug (To) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center">
                  <span className="px-2.5 py-2 bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-800 rounded-l-lg text-slate-500 font-mono">
                    /
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="new-canonical-article-slug"
                    value={toSlug}
                    onChange={(e) => setToSlug(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-r-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <div>&bull; Status code returned: <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">301 Moved Permanently</span></div>
                <div>&bull; Informs Googlebot and Bingbot to transfer search rankings immediately.</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold cursor-pointer shadow-xs"
                >
                  Save Redirect Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
