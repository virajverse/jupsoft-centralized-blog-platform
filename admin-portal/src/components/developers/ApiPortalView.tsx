'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useBlogStore } from '../../store/useBlogStore';
import { Website } from '../../types';
import { apiClient, WebhookTestResult, API_BASE } from '../../services/apiClient';
import { ClientHandoverModal } from '../common/ClientHandoverModal';
import {
  Code2,
  Copy,
  Check,
  Play,
  Terminal,
  Globe,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Send,
  ExternalLink,
  Search,
  Share2,
  Radio,
  FileCode2,
} from 'lucide-react';

const FALLBACK_SITE: Website = {
  id: 'site-cloud',
  name: 'Jupsoft Cloud & ERP',
  domain: 'cloud.jupsoft.com',
  logoUrl: '/uploads/logos/jupsoft-cloud-logo.webp',
  description: 'Enterprise Cloud ERP, Distributed Systems & AI Infrastructure.',
  apiKey: 'jup_live_sec_cloud_9934afbc82a104',
  s3Prefix: 'blogs/cloud/',
  status: 'active',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'hi', 'fr', 'ar'],
  revalidateWebhookUrl: 'https://cloud.jupsoft.com/api/revalidate',
  createdAt: new Date().toISOString(),
};

interface ApiEndpointDef {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  title: string;
  description: string;
  hasSlug?: boolean;
  hasSearch?: boolean;
  hasLimit?: boolean;
}

const API_ENDPOINTS: ApiEndpointDef[] = [
  {
    id: 'health-check',
    method: 'GET',
    path: '/v1/health',
    title: 'Health Check',
    description: 'System health check endpoint for uptime and service monitoring.',
  },
  {
    id: 'blogs-list',
    method: 'GET',
    path: '/v1/blogs',
    title: 'List Published Blogs',
    description: 'Paginated list of published blogs with taxonomy and language filtering.',
    hasLimit: true,
  },
  {
    id: 'blog-by-slug',
    method: 'GET',
    path: '/v1/blogs/:slug',
    title: 'Get Blog by Slug',
    description: 'Full published article including SEO metadata, author details, and JSON-LD schema.',
    hasSlug: true,
  },
  {
    id: 'blogs-latest',
    method: 'GET',
    path: '/v1/blogs/latest',
    title: 'Get Latest Blogs',
    description: 'Retrieve newest published blogs for homepage or sidebar widgets.',
    hasLimit: true,
  },
  {
    id: 'blogs-popular',
    method: 'GET',
    path: '/v1/blogs/popular',
    title: 'Get Popular Blogs',
    description: 'Most-viewed published blogs based on verified reader telemetry.',
    hasLimit: true,
  },
  {
    id: 'categories-list',
    method: 'GET',
    path: '/v1/categories',
    title: 'Get Categories',
    description: 'Hierarchical taxonomy category tree configured for this website.',
  },
  {
    id: 'tags-list',
    method: 'GET',
    path: '/v1/tags',
    title: 'Get Tags',
    description: 'All active taxonomy tags and article association counts.',
  },
  {
    id: 'search-blogs',
    method: 'GET',
    path: '/v1/search',
    title: 'Search Blogs',
    description: 'Full-text search matching article titles, excerpts, and content keywords.',
    hasSearch: true,
    hasLimit: true,
  },
  {
    id: 'redirects-list',
    method: 'GET',
    path: '/v1/redirects',
    title: 'Get 301 Redirects',
    description: 'Active 301 permanent redirect rules for consuming website edge routing.',
  },
  {
    id: 'website-meta',
    method: 'GET',
    path: '/v1/website',
    title: 'Get Website Info',
    description: 'Website tenant configuration, domain settings, and supported languages.',
  },
];

export const ApiPortalView: React.FC = () => {
  const { websites, activeWebsiteId, blogs } = useBlogStore();
  const apiBaseUrl = API_BASE;

  // Active Tenant Selection
  const [selectedSiteId, setSelectedSiteId] = useState<string>(() => {
    if (activeWebsiteId && activeWebsiteId !== 'all') return activeWebsiteId;
    return websites[0]?.id || 'site-cloud';
  });

  useEffect(() => {
    if (activeWebsiteId && activeWebsiteId !== 'all') {
      setSelectedSiteId(activeWebsiteId);
    }
  }, [activeWebsiteId]);

  const activeSite = useMemo(() => {
    return websites.find((w) => w.id === selectedSiteId) || websites[0] || FALLBACK_SITE;
  }, [websites, selectedSiteId]);

  // Derive real sample slug from current tenant blogs
  const sampleSlug = useMemo(() => {
    const siteBlog = blogs.find((b) => b.websiteId === activeSite.id);
    const trans = siteBlog?.translations?.en || (siteBlog?.translations ? Object.values(siteBlog.translations)[0] : undefined);
    return trans?.slug || 'enterprise-technical-seo-playbook-2026';
  }, [blogs, activeSite.id]);

  // UI States
  const [activeTab, setActiveTab] = useState<'endpoints' | 'quickstart' | 'webhooks' | 'credentials'>('endpoints');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);

  // Interactive Tester States
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('blogs-list');
  const [testSlug, setTestSlug] = useState<string>('');
  const [testSearch, setTestSearch] = useState<string>('cloud');
  const [testLimit, setTestLimit] = useState<number>(5);
  const [testLang, setTestLang] = useState<string>('en');
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [testResponse, setTestResponse] = useState<{
    url: string;
    status: number;
    statusText: string;
    latencyMs: number;
    headers: Record<string, string>;
    body: unknown;
  } | null>(null);

  // Webhook Tab States
  const [webhookUrlInput, setWebhookUrlInput] = useState<string>('');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<WebhookTestResult | null>(null);

  // Quick Start Tab State
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'javascript' | 'nextjs' | 'php'>('curl');

  // Sync test inputs when tenant or sample slug changes
  useEffect(() => {
    setTestSlug(sampleSlug);
    setWebhookUrlInput(activeSite.revalidateWebhookUrl || `https://${activeSite.domain}/api/revalidate`);
  }, [sampleSlug, activeSite]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const activeEndpointDef = useMemo(() => {
    return API_ENDPOINTS.find((e) => e.id === selectedEndpointId) || API_ENDPOINTS[0];
  }, [selectedEndpointId]);

  // Construct real path for selected endpoint
  const resolvedApiPath = useMemo(() => {
    let p = activeEndpointDef.path;
    if (activeEndpointDef.hasSlug) {
      const slugVal = testSlug.trim() || sampleSlug;
      p = p.replace(':slug', encodeURIComponent(slugVal));
    }
    const params = new URLSearchParams();
    if (activeEndpointDef.hasLimit) {
      params.set('limit', String(testLimit));
    }
    if (activeEndpointDef.hasSearch && testSearch.trim()) {
      params.set('q', testSearch.trim());
    }
    if (testLang) {
      params.set('lang', testLang);
    }
    const qs = params.toString();
    return qs ? `${p}?${qs}` : p;
  }, [activeEndpointDef, testSlug, sampleSlug, testLimit, testSearch, testLang]);

  // Execute 100% Real HTTP API Request
  const handleExecuteRequest = async () => {
    setIsLoadingTest(true);
    const startTime = performance.now();
    const targetUrl = `${apiBaseUrl}${resolvedApiPath}`;

    try {
      const res = await fetch(targetUrl, {
        method: activeEndpointDef.method,
        headers: {
          Authorization: `Bearer ${activeSite.apiKey}`,
          Accept: 'application/json',
        },
      });

      const latencyMs = Math.round(performance.now() - startTime);
      let bodyData: unknown;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        bodyData = await res.json();
      } else {
        bodyData = await res.text();
      }

      setTestResponse({
        url: targetUrl,
        status: res.status,
        statusText: res.statusText || (res.status === 200 ? 'OK' : 'Error'),
        latencyMs,
        headers: {
          'content-type': contentType,
          'x-tenant-id': res.headers.get('x-tenant-id') || activeSite.id,
          'cache-control': res.headers.get('cache-control') || 'no-cache',
        },
        body: bodyData,
      });
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      setTestResponse({
        url: targetUrl,
        status: 0,
        statusText: 'Network / Connection Failed',
        latencyMs,
        headers: {},
        body: {
          error: 'ConnectionError',
          message: err?.message || 'Could not connect to API server. Ensure backend is running.',
          targetUrl,
        },
      });
    } finally {
      setIsLoadingTest(false);
    }
  };

  // Execute 100% Real Webhook Ping
  const handleSendWebhookPing = async () => {
    setIsTestingWebhook(true);
    try {
      const res = await apiClient.testWebhookPing(
        activeSite.id,
        webhookUrlInput.trim() || undefined,
        'test.ping'
      );
      setWebhookResult(res);
    } catch (err: any) {
      setWebhookResult({
        success: false,
        statusCode: 500,
        statusText: 'Request Failed',
        responseBody: err?.message || 'Network error triggering webhook',
        latencyMs: 0,
        url: webhookUrlInput,
        timestamp: new Date().toISOString(),
        message: err?.message || 'Failed to dispatch test ping',
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  // Real Code Snippets for Quick Start
  const snippets = useMemo(() => {
    const siteKey = activeSite.apiKey;
    const lang = activeSite.defaultLanguage || 'en';

    const curl = `curl -X GET "${apiBaseUrl}/v1/blogs?limit=10&lang=${lang}" \\
  -H "Authorization: Bearer ${siteKey}" \\
  -H "Accept: application/json"`;

    const js = `// Fetch published blogs (JavaScript / Browser / Node)
async function getPublishedBlogs() {
  const response = await fetch('${apiBaseUrl}/v1/blogs?limit=10&lang=${lang}', {
    headers: {
      'Authorization': 'Bearer ${siteKey}',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(\`Failed to fetch blogs: \${response.status}\`);
  }

  const { data } = await response.json();
  return data;
}`;

    const nextjs = `// app/blog/page.tsx (Next.js 15/16 Server Component with ISR)
export default async function BlogPage() {
  const res = await fetch('${apiBaseUrl}/v1/blogs?limit=12&lang=${lang}', {
    headers: {
      'Authorization': 'Bearer ${siteKey}',
    },
    next: {
      revalidate: 3600, // Revalidate in background every hour
      tags: ['blogs-${activeSite.id}'], // On-demand webhook cache tag
    },
  });

  const { data: blogs } = await res.json();

  return (
    <main className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Latest Blogs</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {blogs?.map((blog: any) => (
          <article key={blog.id} className="border border-slate-200 rounded-lg p-4">
            <h2 className="font-semibold text-lg">{blog.title}</h2>
            <p className="text-sm text-slate-600 mt-2">{blog.excerpt}</p>
          </article>
        ))}
      </div>
    </main>
  );
}`;

    const php = `<?php
// WordPress / PHP Integration
$response = wp_remote_get('${apiBaseUrl}/v1/blogs?limit=10&lang=${lang}', array(
    'headers' => array(
        'Authorization' => 'Bearer ${siteKey}',
        'Accept'        => 'application/json',
    ),
    'timeout' => 15,
));

if (is_wp_error($response)) {
    return array();
}

$body = wp_remote_retrieve_body($response);
$result = json_decode($body, true);
$blogs = $result['data'] ?? array();
?>`;

    return { curl, js, nextjs, php };
  }, [apiBaseUrl, activeSite]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* ─── ZOHO COMPACT HEADER & TENANT BAR ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#111827] p-3.5 px-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white shrink-0">
            <Code2 className="w-4 h-4 text-[#e42528]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                API &amp; Integrations
              </h1>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                v1 Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              REST endpoints, live test console &amp; cache invalidation for client websites
            </p>
          </div>
        </div>

        {/* Right Controls: Tenant Switcher + Fast Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tenant Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Tenant:</span>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="bg-transparent font-semibold text-xs text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-1"
            >
              {websites.map((w) => (
                <option key={w.id} value={w.id} className="dark:bg-slate-900">
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick API Key Copy */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono">
            <Key className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="text-slate-600 dark:text-slate-300 text-[11px]">
              {showApiKey ? activeSite.apiKey : `${activeSite.apiKey.slice(0, 12)}••••`}
            </span>
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              title={showApiKey ? 'Hide Key' : 'Show Key'}
            >
              {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
            <button
              onClick={() => copyToClipboard(activeSite.apiKey, 'hdr-key')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 ml-0.5 cursor-pointer"
              title="Copy API Key"
            >
              {copiedKey === 'hdr-key' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {/* Share Access Modal */}
          <button
            onClick={() => setIsHandoverOpen(true)}
            className="px-2.5 py-1 rounded bg-[#e42528] hover:bg-[#c91e21] text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Share2 className="w-3 h-3" />
            <span>Share Access</span>
          </button>
        </div>
      </div>

      {/* ─── ZOHO TABS BAR (36px Compact) ─────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-0">
        {[
          { id: 'endpoints', label: 'Endpoints & Test Console', icon: Terminal },
          { id: 'quickstart', label: 'Code Snippets', icon: FileCode2 },
          { id: 'webhooks', label: 'Webhooks & Cache', icon: Radio },
          { id: 'credentials', label: 'Credentials & Details', icon: Key },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#e42528] text-[#e42528] dark:text-[#f87171]'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: ENDPOINTS & INTERACTIVE TESTER ───────────────────────── */}
      {activeTab === 'endpoints' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Compact Endpoints Table (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#111827] rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs flex flex-col">
            <div className="p-3 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Available v1 Endpoints ({API_ENDPOINTS.length})
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Base: {apiBaseUrl}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 overflow-y-auto max-h-[580px]">
              {API_ENDPOINTS.map((ep) => {
                const isSelected = selectedEndpointId === ep.id;
                return (
                  <div
                    key={ep.id}
                    onClick={() => {
                      setSelectedEndpointId(ep.id);
                      setTestResponse(null);
                    }}
                    className={`p-3 px-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-l-2 border-l-[#e42528]'
                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {ep.method}
                        </span>
                        <code className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {ep.path}
                        </code>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {ep.title} — {ep.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1 ${
                        isSelected
                          ? 'bg-[#e42528] text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Test</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Interactive Execution Console (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-[#111827] rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-500" />
                  Live Request Console
                </span>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[280px]">
                  {activeEndpointDef.path}
                </p>
              </div>

              {testResponse && (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      testResponse.status === 200
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {testResponse.status} {testResponse.statusText}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {testResponse.latencyMs}ms
                  </span>
                </div>
              )}
            </div>

            {/* Parameter Inputs */}
            <div className="space-y-2 bg-slate-50/70 dark:bg-slate-900/50 p-2.5 rounded border border-slate-200/80 dark:border-slate-800/80 text-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Request Parameters
              </div>

              {activeEndpointDef.hasSlug && (
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5 font-medium">
                    Slug (:slug):
                  </label>
                  <input
                    type="text"
                    value={testSlug}
                    onChange={(e) => setTestSlug(e.target.value)}
                    placeholder="e.g. blog-slug-here"
                    className="w-full text-xs font-mono px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              )}

              {activeEndpointDef.hasSearch && (
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5 font-medium">
                    Keyword Search (?q=):
                  </label>
                  <input
                    type="text"
                    value={testSearch}
                    onChange={(e) => setTestSearch(e.target.value)}
                    placeholder="Search keywords..."
                    className="w-full text-xs font-mono px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {activeEndpointDef.hasLimit && (
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5 font-medium">
                      Limit:
                    </label>
                    <select
                      value={testLimit}
                      onChange={(e) => setTestLimit(Number(e.target.value))}
                      className="w-full text-xs px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
                    >
                      <option value={3}>3 items</option>
                      <option value={5}>5 items</option>
                      <option value={10}>10 items</option>
                      <option value={20}>20 items</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5 font-medium">
                    Language:
                  </label>
                  <select
                    value={testLang}
                    onChange={(e) => setTestLang(e.target.value)}
                    className="w-full text-xs px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="en">English (en)</option>
                    <option value="hi">Hindi (hi)</option>
                    <option value="fr">French (fr)</option>
                    <option value="ar">Arabic (ar)</option>
                  </select>
                </div>
              </div>

              {/* Resolved URL Preview & Send Button */}
              <div className="pt-1.5 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-slate-400 truncate">
                  {resolvedApiPath}
                </span>
                <button
                  onClick={handleExecuteRequest}
                  disabled={isLoadingTest}
                  className="px-3 py-1.5 rounded bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 transition-colors"
                >
                  {isLoadingTest ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3 fill-current" />
                  )}
                  <span>{isLoadingTest ? 'Executing...' : 'Send Request'}</span>
                </button>
              </div>
            </div>

            {/* Output View */}
            <div className="flex-1 flex flex-col min-h-0 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Response Body</span>
                {testResponse && (
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(testResponse.body, null, 2), 'resp-body')}
                    className="hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'resp-body' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'resp-body' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                )}
              </div>

              <div className="bg-[#0b101b] rounded border border-slate-800 p-3 text-[11px] font-mono text-emerald-400 overflow-auto max-h-[300px] leading-relaxed select-text">
                {testResponse ? (
                  <pre>{JSON.stringify(testResponse.body, null, 2)}</pre>
                ) : (
                  <span className="text-slate-500">
                    Click &quot;Send Request&quot; above to execute a real HTTP query against the live NestJS backend API.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: QUICK START CODE SNIPPETS ────────────────────────────── */}
      {activeTab === 'quickstart' && (
        <div className="bg-white dark:bg-[#111827] rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                Integration Code Snippet
              </h2>
              <p className="text-[11px] text-slate-500">
                Pre-configured with credentials for <strong className="text-slate-700 dark:text-slate-300">{activeSite.name}</strong>
              </p>
            </div>

            {/* Language Selector Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded border border-slate-200 dark:border-slate-800 text-xs font-medium">
              {[
                { id: 'curl', label: 'cURL' },
                { id: 'javascript', label: 'JavaScript (Fetch)' },
                { id: 'nextjs', label: 'Next.js App Router' },
                { id: 'php', label: 'PHP / WordPress' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setCodeLanguage(lang.id as any)}
                  className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                    codeLanguage === lang.id
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Snippet Code Box */}
          <div className="relative">
            <button
              onClick={() => {
                const code =
                  codeLanguage === 'curl'
                    ? snippets.curl
                    : codeLanguage === 'javascript'
                    ? snippets.js
                    : codeLanguage === 'nextjs'
                    ? snippets.nextjs
                    : snippets.php;
                copyToClipboard(code, 'quickstart-code');
              }}
              className="absolute top-3 right-3 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors z-10 border border-slate-700"
            >
              {copiedKey === 'quickstart-code' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'quickstart-code' ? 'Copied' : 'Copy Code'}</span>
            </button>

            <pre className="p-4 bg-[#0b101b] text-slate-200 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800 max-h-[460px]">
              {codeLanguage === 'curl' && snippets.curl}
              {codeLanguage === 'javascript' && snippets.js}
              {codeLanguage === 'nextjs' && snippets.nextjs}
              {codeLanguage === 'php' && snippets.php}
            </pre>
          </div>
        </div>
      )}

      {/* ─── TAB 3: WEBHOOKS & CACHE INVALIDATION ───────────────────────── */}
      {activeTab === 'webhooks' && (
        <div className="bg-white dark:bg-[#111827] rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-[#e42528]" />
              On-Demand Cache Revalidation Webhook
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              When an article is published, updated, or unpublished in Jupsoft CMS, the backend sends an instant HTTP POST ping to this webhook to purge Next.js ISR / CDN cache.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Webhook URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={webhookUrlInput}
                    onChange={(e) => setWebhookUrlInput(e.target.value)}
                    placeholder="https://your-domain.com/api/revalidate"
                    className="flex-1 text-xs font-mono px-3 py-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
                  />
                  <button
                    onClick={handleSendWebhookPing}
                    disabled={isTestingWebhook}
                    className="px-3.5 py-2 rounded bg-[#e42528] hover:bg-[#c91e21] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs shrink-0"
                  >
                    {isTestingWebhook ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{isTestingWebhook ? 'Sending...' : 'Test Ping'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  Payload includes: <code>event</code>, <code>websiteId</code>, <code>slug</code>, and timestamp.
                </p>
              </div>

              {/* Webhook Test Result Display */}
              {webhookResult && (
                <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      {webhookResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      )}
                      <span>Ping Result: {webhookResult.statusCode} {webhookResult.statusText}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {webhookResult.latencyMs}ms
                    </span>
                  </div>
                  <pre className="p-2 bg-[#0b101b] text-emerald-400 rounded text-[11px] font-mono overflow-auto max-h-36">
                    {webhookResult.responseBody || webhookResult.message}
                  </pre>
                </div>
              )}
            </div>

            {/* Next.js Webhook Sample Handler */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Sample Handler (<code>app/api/revalidate/route.ts</code>)
              </span>
              <pre className="p-2.5 bg-[#0b101b] text-slate-300 rounded text-[10px] font-mono overflow-x-auto max-h-[160px] border border-slate-800 leading-relaxed">
{`import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  if (body.slug) {
    revalidatePath(\`/blog/\${body.slug}\`);
  }
  revalidateTag('blogs');
  return NextResponse.json({ revalidated: true });
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: CREDENTIALS & DETAILS ──────────────────────────────── */}
      {activeTab === 'credentials' && (
        <div className="bg-white dark:bg-[#111827] rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white">
              Website Integration Credentials
            </h2>
            <p className="text-[11px] text-slate-500">
              Unique security identifiers for tenant authentication against the REST API.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Website ID */}
            <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Tenant Website ID</span>
                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {activeSite.id}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(activeSite.id, 'c-id')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {copiedKey === 'c-id' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* API Key */}
            <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Secret API Key</span>
                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {showApiKey ? activeSite.apiKey : `${activeSite.apiKey.slice(0, 16)}••••••••••••`}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => copyToClipboard(activeSite.apiKey, 'c-key')}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {copiedKey === 'c-key' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* API Base URL */}
            <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">REST API Base URL</span>
                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {apiBaseUrl}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(apiBaseUrl, 'c-url')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {copiedKey === 'c-url' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Domain & S3 Prefix */}
            <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Registered Domain &amp; Prefix</span>
                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {activeSite.domain} <span className="text-slate-400 font-normal">({activeSite.s3Prefix})</span>
                </div>
              </div>
              <a
                href={`https://${activeSite.domain}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Share Code Modal */}
      <ClientHandoverModal
        isOpen={isHandoverOpen}
        onClose={() => setIsHandoverOpen(false)}
        site={activeSite}
        apiBaseUrl={apiBaseUrl}
      />
    </div>
  );
};
