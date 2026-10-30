'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Code2, 
  Globe, 
  Hash, 
  Key, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Activity, 
  Terminal, 
  Zap, 
  ArrowRight, 
  Database, 
  Server, 
  LifeBuoy, 
  FileCode2, 
  Palette,
  BookOpen
} from 'lucide-react';
import { Website, UserAccount } from '../../types';

interface DeveloperDashboardViewProps {
  activeSite?: Website;
  websites: Website[];
  currentUser: UserAccount | null;
}

export const DeveloperDashboardView: React.FC<DeveloperDashboardViewProps> = ({
  activeSite,
  websites,
  currentUser,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'curl' | 'fetch' | 'axios'>('curl');

  const siteName = activeSite?.name || 'Selected Tenant';
  const siteDomain = activeSite?.domain || 'jupsoft.com';
  const websiteId = activeSite?.id || 'site-tenant';
  const apiKey = activeSite?.apiKey || 'jup_live_sec_your_api_key';
  const apiBaseUrl = 'https://blogary.jupsoft.com';

  const copyToClipboard = (text: string, keyName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(keyName);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const coreEndpoints = [
    {
      id: 'list-blogs',
      method: 'GET',
      path: '/v1/blogs',
      title: 'List Published Articles',
      desc: 'Paginated article list for blogs feed, ISR pre-rendering.',
    },
    {
      id: 'get-blog-by-slug',
      method: 'GET',
      path: '/v1/blogs/:slug',
      title: 'Get Article by Slug',
      desc: 'Full HTML body, SEO tags, OpenGraph & JSON-LD structured data.',
    },
    {
      id: 'list-categories',
      method: 'GET',
      path: '/v1/categories',
      title: 'Categories Hierarchy',
      desc: 'Taxonomy categories with live published article counters.',
    },
    {
      id: 'list-tags',
      method: 'GET',
      path: '/v1/tags',
      title: 'Tags Cloud',
      desc: 'Tags taxonomy associated with published articles.',
    },
    {
      id: 'search-blogs',
      method: 'GET',
      path: '/v1/search',
      title: 'Full-Text Search',
      desc: 'PostgreSQL tsvector full-text search across titles & content.',
    },
    {
      id: 'revalidate',
      method: 'POST',
      path: '/v1/revalidate',
      title: 'Cache Invalidation Webhook',
      desc: 'Instant On-Demand ISR cache purge ping for edge CDNs.',
    },
  ];

  const quickSnippets = {
    curl: `curl -X GET "${apiBaseUrl}/v1/blogs?website=${websiteId}" \\
  -H "x-api-key: ${apiKey}" \\
  -H "Accept: application/json"`,
    fetch: `const response = await fetch("${apiBaseUrl}/v1/blogs?website=${websiteId}", {
  headers: {
    "x-api-key": "${apiKey}",
    "Accept": "application/json"
  }
});
const { data, meta } = await response.json();
console.log(data);`,
    axios: `import axios from 'axios';

const { data } = await axios.get("${apiBaseUrl}/v1/blogs", {
  params: { website: "${websiteId}" },
  headers: { "x-api-key": "${apiKey}" }
});
console.log(data);`,
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 select-none">
      {/* ─── Hero Welcome Header ─── */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Developer Integration Hub &bull; REST API v1</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {currentUser?.name || 'Developer'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              API credentials, live endpoints, and code snippets for{' '}
              <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/10">
                {siteName}
              </span>{' '}
              (<span className="font-mono text-indigo-300">{siteDomain}</span>). Upar header se aap kisi bhi permitted website ka API switch kar sakte hain.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href={`/settings?tab=developer${websiteId ? '&site=' + websiteId : ''}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-600/30 hover:shadow-red-600/40 transition-all cursor-pointer"
            >
              <Code2 className="w-4 h-4" />
              <span>Launch API Explorer &amp; Live Tester</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
            <Link
              href={`/docs${websiteId ? '?site=' + websiteId : ''}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Integration Guide &amp; Code</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── API Credentials Quick Access (3 Cards) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: API Base URL */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              API Base URL
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              HTTPS Live
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <code className="text-xs font-mono text-slate-900 dark:text-slate-100 truncate select-all">
              {apiBaseUrl}
            </code>
            <button
              onClick={() => copyToClipboard(apiBaseUrl, 'baseUrl')}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              title="Copy Base URL"
            >
              {copiedKey === 'baseUrl' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Card 2: Website ID */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-indigo-500" />
              Website ID (Tenant)
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
              Header / Query
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold truncate select-all">
              {websiteId}
            </code>
            <button
              onClick={() => copyToClipboard(websiteId, 'siteId')}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              title="Copy Website ID"
            >
              {copiedKey === 'siteId' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Card 3: API Key */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-500" />
              API Secret Key
            </span>
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition flex items-center gap-1 cursor-pointer"
            >
              {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showApiKey ? 'Hide' : 'Show'}</span>
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <code className="text-xs font-mono text-slate-900 dark:text-slate-100 truncate select-all">
              {showApiKey ? apiKey : `${apiKey.slice(0, 14)}••••••••••••••••`}
            </code>
            <button
              onClick={() => copyToClipboard(apiKey, 'apiKey')}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              title="Copy API Key"
            >
              {copiedKey === 'apiKey' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Gateway Health & Status Bar ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">API Gateway</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Active (v1)</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">PostgreSQL DB</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Connected</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Redis L2 Cache</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Accelerated</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Language Scope</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase">
              {activeSite?.defaultLanguage || 'en'}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Two-Column Section: Endpoints Reference & Quick Code Snippets ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Core Endpoints Cheat Sheet */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Core Endpoints Reference
              </h2>
              <p className="text-[11px] text-slate-500">
                Direct endpoints ready for frontend integration and edge caching.
              </p>
            </div>
            <Link
              href={`/settings?tab=developer${websiteId ? '&site=' + websiteId : ''}`}
              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All 10 Endpoints</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {coreEndpoints.map((ep) => (
              <div key={ep.id} className="py-3 flex items-start justify-between gap-3 group">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        ep.method === 'GET'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <code className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {ep.path}
                    </code>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {ep.title} &bull; {ep.desc}
                  </p>
                </div>

                <Link
                  href={`/settings?tab=developer&endpoint=${ep.id}${websiteId ? '&site=' + websiteId : ''}`}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0 transition cursor-pointer flex items-center gap-1"
                >
                  <span>Test Live</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): Instant Code Snippet Preview */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-500" />
                <span>Instant Code Snippet</span>
              </h2>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
                {(['curl', 'fetch', 'axios'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setSelectedLang(l)}
                    className={`px-2 py-0.5 rounded font-mono font-semibold transition cursor-pointer ${
                      selectedLang === l
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative rounded-xl bg-slate-950 p-4 border border-slate-800 overflow-hidden font-mono text-[11px] text-slate-300">
              <button
                onClick={() => copyToClipboard(quickSnippets[selectedLang], 'snippet')}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title="Copy snippet"
              >
                {copiedKey === 'snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <pre className="overflow-x-auto pr-8 scrollbar-none whitespace-pre-wrap leading-relaxed">
                {quickSnippets[selectedLang]}
              </pre>
            </div>
          </div>

          {/* Quick Help & Next Step CTA */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Palette className="w-3.5 h-3.5 text-indigo-500" />
              <span>Article Layout Typography</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Attach <code className="text-indigo-600 dark:text-indigo-400 font-mono font-semibold">.blog-content</code> CSS class to your article container to automatically format h2-h4, blockquotes, and tables.
            </p>
            <Link
              href={`/settings?tab=developer${websiteId ? '&site=' + websiteId : ''}`}
              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 pt-1"
            >
              <span>Copy CSS Stylesheet &amp; Full Specs &rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
