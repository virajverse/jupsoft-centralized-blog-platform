'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useBlogStore } from '../../store/useBlogStore';
import { Website } from '../../types';
import { getIntegrationSnippets } from './snippets';
import { ClientHandoverModal } from '../common/ClientHandoverModal';
import { 
  Code2, 
  Copy, 
  Check, 
  Play, 
  Terminal, 
  Globe, 
  ShieldCheck, 
  Key, 
  Zap, 
  BookOpen, 
  FileCode2, 
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Laptop,
  ArrowRight,
  Eye,
  Hash,
  FolderTree,
  Search,
  ExternalLink,
  ChevronRight,
  Layers,
  FileText,
  Package
} from 'lucide-react';

const FALLBACK_SITE: Website = {
  id: 'site-cloud',
  name: 'Jupsoft Cloud & ERP',
  domain: 'localhost:5001',
  logoUrl: '/uploads/logos/jupsoft-cloud-logo.webp',
  description: 'Enterprise Cloud ERP, Distributed Systems & AI Infrastructure.',
  apiKey: 'jup_live_sec_cloud_9934afbc82a104',
  s3Prefix: 'blogs/cloud/',
  status: 'active',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'hi', 'fr', 'ar'],
  revalidateWebhookUrl: 'http://localhost:5001/api/revalidate',
  createdAt: new Date().toISOString(),
};

export const ApiPortalView: React.FC = () => {
  const { websites, activeWebsiteId, blogs } = useBlogStore();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Interactive Tenant State
  const [selectedSiteId, setSelectedSiteId] = useState<string>(() => {
    if (activeWebsiteId && activeWebsiteId !== 'all') return activeWebsiteId;
    return websites[0]?.id || 'site-cloud';
  });

  // Keep selected site synced if global activeWebsiteId changes and is not 'all'
  useEffect(() => {
    if (activeWebsiteId && activeWebsiteId !== 'all') {
      setSelectedSiteId(activeWebsiteId);
    }
  }, [activeWebsiteId]);

  const activeSite = useMemo(() => {
    return websites.find((w) => w.id === selectedSiteId) || websites[0] || FALLBACK_SITE;
  }, [websites, selectedSiteId]);

  // Find a real sample slug for this website if available
  const sampleSlug = useMemo(() => {
    const siteBlog = blogs.find((b) => b.websiteId === activeSite.id);
    const trans = siteBlog?.translations?.en || (siteBlog?.translations ? Object.values(siteBlog.translations)[0] : undefined);
    return trans?.slug || (activeSite.id === 'site-growth' ? 'enterprise-technical-seo-playbook-2026' : 'zero-downtime-migration-nextjs-micro-frontends');
  }, [blogs, activeSite.id]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'tester' | 'snippets' | 'specs'>('snippets');
  const [activeSnippetFilter, setActiveSnippetFilter] = useState<'all' | 'npm' | 'widget' | 'env' | 'nextconfig' | 'sdk' | 'listing' | 'detail' | 'revalidate' | 'sitemap'>('all');
  const [scaffoldShell, setScaffoldShell] = useState<'powershell' | 'bash'>('powershell');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);

  // Tab 1 (Tester) State
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/v1/blogs');
  const [selectedLang, setSelectedLang] = useState<string>('en');
  const [slugParam, setSlugParam] = useState<string>('');
  const [searchQueryParam, setSearchQueryParam] = useState<string>('enterprise');
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [testResponse, setTestResponse] = useState<{
    status: number;
    latencyMs: number;
    headers: Record<string, string>;
    body: unknown;
  } | null>(null);

  // Tab 2 (Live SDK Playground) State
  const [sdkMethod, setSdkMethod] = useState<'getBlogs' | 'getLatest' | 'getPopular' | 'getCategories' | 'getTags' | 'getBlogBySlug' | 'search' | 'getWebsiteInfo'>('getBlogs');
  const [sdkSlugInput, setSdkSlugInput] = useState<string>('');
  const [sdkSearchInput, setSdkSearchInput] = useState<string>('enterprise');
  const [sdkLimitInput, setSdkLimitInput] = useState<number>(5);
  const [isSdkRunning, setIsSdkRunning] = useState<boolean>(false);
  const [sdkResponse, setSdkResponse] = useState<{
    method: string;
    url: string;
    status: number;
    latencyMs: number;
    headers: Record<string, string>;
    body: unknown;
    error?: string;
  } | null>(null);

  // Auto-sync slug input when website changes
  useEffect(() => {
    setSdkSlugInput(sampleSlug);
    setSlugParam(sampleSlug);
  }, [sampleSlug]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Get dynamically generated production snippets for active site
  const {
    npmCliSnippet,
    universalWidgetSnippet,
    envConfigSnippet,
    nextConfigSnippet,
    nextjsSdkSnippet,
    nextjsListingSnippet,
    nextjsConsumerSnippet,
    webhookHandlerSnippet,
    sitemapSnippet,
    cliScaffoldPowerShell,
    cliScaffoldBash,
  } = useMemo(() => getIntegrationSnippets(apiBaseUrl, activeSite), [apiBaseUrl, activeSite]);

  // Tab 1 API execution (Direct HTTP probe)
  const handleExecuteApi = async () => {
    setIsLoadingTest(true);
    const startTime = performance.now();

    let resolvedPath = selectedEndpoint;
    if (selectedEndpoint === '/v1/blogs/{slug}') {
      resolvedPath = `/v1/blogs/${slugParam || sampleSlug}`;
    } else if (selectedEndpoint === '/v1/search') {
      resolvedPath = `/v1/search?q=${encodeURIComponent(searchQueryParam)}&lang=${selectedLang}`;
    } else if (selectedEndpoint === '/v1/blogs') {
      resolvedPath = `/v1/blogs?lang=${selectedLang}`;
    }

    try {
      const res = await fetch(`${apiBaseUrl}${resolvedPath}`, {
        headers: {
          'Authorization': `Bearer ${activeSite.apiKey}`,
          'X-Tenant-ID': activeSite.id,
          'Accept': 'application/json',
        },
      });

      const data = await res.json();
      const latency = Math.round(performance.now() - startTime);

      setTestResponse({
        status: res.status,
        latencyMs: latency,
        headers: {
          'Content-Type': res.headers.get('content-type') || 'application/json; charset=utf-8',
          'X-Tenant-ID': activeSite.id,
          'X-RateLimit-Limit': res.headers.get('x-ratelimit-limit') || '1000',
          'X-RateLimit-Remaining': res.headers.get('x-ratelimit-remaining') || '996',
          'X-Cache': res.headers.get('x-cache') || 'MISS (Live NestJS Server)',
        },
        body: data,
      });
    } catch (err: any) {
      const latency = Math.round(performance.now() - startTime);
      setTestResponse({
        status: 0,
        latencyMs: latency,
        headers: {
          'X-Status': 'Network Connection Failed',
          'X-Tenant-ID': activeSite.id,
          'X-Target-URL': `${apiBaseUrl}${resolvedPath}`,
        },
        body: {
          error: 'NetworkConnectionError',
          message: err?.message || `Failed to connect to backend server. Make sure NestJS is running on ${apiBaseUrl}`,
          endpoint: resolvedPath,
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      setIsLoadingTest(false);
    }
  };

  // Tab 2 Live SDK Runner
  const handleRunSdkMethod = async (targetMethod: typeof sdkMethod) => {
    setSdkMethod(targetMethod);
    setIsSdkRunning(true);
    const startTime = performance.now();

    let path = '/v1/blogs';
    let methodDisplay = '';

    if (targetMethod === 'getBlogs') {
      path = `/v1/blogs?limit=${sdkLimitInput}&lang=${selectedLang}`;
      methodDisplay = `jupsoft.getBlogs({ limit: ${sdkLimitInput}, lang: '${selectedLang}' })`;
    } else if (targetMethod === 'getLatest') {
      path = `/v1/blogs/latest?limit=${sdkLimitInput}&lang=${selectedLang}`;
      methodDisplay = `jupsoft.getLatest(${sdkLimitInput}, '${selectedLang}')`;
    } else if (targetMethod === 'getPopular') {
      path = `/v1/blogs/popular?limit=${sdkLimitInput}&lang=${selectedLang}`;
      methodDisplay = `jupsoft.getPopular(${sdkLimitInput}, '${selectedLang}')`;
    } else if (targetMethod === 'getCategories') {
      path = `/v1/categories`;
      methodDisplay = `jupsoft.getCategories()`;
    } else if (targetMethod === 'getTags') {
      path = `/v1/tags`;
      methodDisplay = `jupsoft.getTags()`;
    } else if (targetMethod === 'getBlogBySlug') {
      const slug = sdkSlugInput || sampleSlug;
      path = `/v1/blogs/${encodeURIComponent(slug)}?lang=${selectedLang}`;
      methodDisplay = `jupsoft.getBlogBySlug('${slug}', '${selectedLang}')`;
    } else if (targetMethod === 'search') {
      const q = sdkSearchInput || 'enterprise';
      path = `/v1/search?q=${encodeURIComponent(q)}&lang=${selectedLang}&limit=${sdkLimitInput}`;
      methodDisplay = `jupsoft.search('${q}', '${selectedLang}', ${sdkLimitInput})`;
    } else if (targetMethod === 'getWebsiteInfo') {
      path = `/v1/website`;
      methodDisplay = `jupsoft.getWebsiteInfo()`;
    }

    try {
      const targetUrl = `${apiBaseUrl}${path}`;
      const res = await fetch(targetUrl, {
        headers: {
          'Authorization': `Bearer ${activeSite.apiKey}`,
          'Accept': 'application/json',
        },
      });
      const data = await res.json();
      const latency = Math.round(performance.now() - startTime);

      setSdkResponse({
        method: methodDisplay,
        url: targetUrl,
        status: res.status,
        latencyMs: latency,
        headers: {
          'Content-Type': res.headers.get('content-type') || 'application/json; charset=utf-8',
          'X-Tenant-ID': activeSite.id,
          'X-Cache': res.headers.get('x-cache') || 'MISS (Live NestJS Server)',
        },
        body: data,
      });
    } catch (err: any) {
      const latency = Math.round(performance.now() - startTime);
      setSdkResponse({
        method: methodDisplay,
        url: `${apiBaseUrl}${path}`,
        status: 0,
        latencyMs: latency,
        headers: {
          'X-Status': 'Failed',
        },
        body: {
          error: 'NetworkError',
          message: err?.message || 'Connection failed to backend API',
        },
        error: err?.message,
      });
    } finally {
      setIsSdkRunning(false);
    }
  };

  const curlCommand = `curl -X GET "${apiBaseUrl}${selectedEndpoint.replace('{slug}', slugParam || sampleSlug)}?website_id=${activeSite.id}&lang=${selectedLang}" \\
  -H "Authorization: Bearer ${activeSite.apiKey}" \\
  -H "Accept: application/json"`;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Developer API Portal &amp; SDK
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
              Next.js 16 Ready
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Backend
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time TypeScript SDK, endpoints, on-demand revalidation webhooks &amp; multi-tenant scaffolds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsHandoverOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Copy 1-command installer or ready message to send to client"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>⚡ Share Code with Client</span>
          </button>

          {/* Interactive Tenant Switcher */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs">
          <Globe className="w-4 h-4 text-blue-500 ml-1.5 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 leading-none">Target Tenant</span>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="text-xs font-bold text-slate-900 dark:text-white bg-transparent border-0 outline-none cursor-pointer pr-4 py-0.5"
            >
              {websites.map((w) => (
                <option key={w.id} value={w.id} className="dark:bg-slate-900 dark:text-white">
                  {w.name} ({w.domain})
                </option>
              ))}
            </select>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {activeSite.id}
          </span>
        </div>
      </div>
    </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-1 bg-white dark:bg-[#0f172a] p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-800 shadow-2xs">
        <button
          onClick={() => setActiveTab('snippets')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'snippets'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span>Next.js 16 SDK &amp; Integration</span>
        </button>

        <button
          onClick={() => setActiveTab('tester')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'tester'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Interactive Endpoint Tester</span>
        </button>

        <button
          onClick={() => setActiveTab('specs')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'specs'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>API Specs &amp; Headers</span>
        </button>
      </div>

      {/* TAB: NEXT.JS 16 SDK & INTEGRATION */}
      {activeTab === 'snippets' && (
        <div className="space-y-6">
          {/* Active Tenant Credentials Banner */}
          <div className="bg-linear-to-r from-blue-900/10 via-indigo-900/10 to-violet-900/10 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-violet-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Active Scaffolding Context
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-medium">
                    Verified Database Key
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{activeSite.name}</span>
                  <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">({activeSite.domain})</span>
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-slate-400">API Key:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{activeSite.apiKey}</span>
                  <button
                    onClick={() => copyToClipboard(activeSite.apiKey, 'badge-key')}
                    className="ml-1 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    title="Copy API Key"
                  >
                    {copiedCode === 'badge-key' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <Hash className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-slate-400">Tenant:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{activeSite.id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ⚡ LIVE SDK PLAYGROUND CONSOLE */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Live SDK Playground (Zero-Mock Real HTTP Execution)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click any SDK method below to execute live against NestJS <code className="font-mono text-blue-600 dark:text-blue-400">{apiBaseUrl}/v1</code> with credentials for <span className="font-semibold">{activeSite.name}</span>.
                </p>
              </div>

              {sdkResponse && (
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold flex items-center gap-1 ${
                    sdkResponse.status >= 200 && sdkResponse.status < 300
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                  }`}>
                    {sdkResponse.status === 200 && <CheckCircle2 className="w-3 h-3" />}
                    {sdkResponse.status} {sdkResponse.status === 200 ? 'OK' : 'Error'}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {sdkResponse.latencyMs}ms
                  </span>
                </div>
              )}
            </div>

            {/* Playground Method Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleRunSdkMethod('getBlogs')}
                disabled={isSdkRunning}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  sdkMethod === 'getBlogs' && sdkResponse
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Play className="w-3 h-3 text-blue-500 fill-blue-500" />
                <span>jupsoft.getBlogs()</span>
              </button>

              <button
                onClick={() => handleRunSdkMethod('getLatest')}
                disabled={isSdkRunning}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  sdkMethod === 'getLatest' && sdkResponse
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Play className="w-3 h-3 text-blue-500 fill-blue-500" />
                <span>jupsoft.getLatest(3)</span>
              </button>

              <button
                onClick={() => handleRunSdkMethod('getPopular')}
                disabled={isSdkRunning}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  sdkMethod === 'getPopular' && sdkResponse
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Play className="w-3 h-3 text-blue-500 fill-blue-500" />
                <span>jupsoft.getPopular(3)</span>
              </button>

              <button
                onClick={() => handleRunSdkMethod('getCategories')}
                disabled={isSdkRunning}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  sdkMethod === 'getCategories' && sdkResponse
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FolderTree className="w-3 h-3 text-emerald-500" />
                <span>jupsoft.getCategories()</span>
              </button>

              <button
                onClick={() => handleRunSdkMethod('getTags')}
                disabled={isSdkRunning}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  sdkMethod === 'getTags' && sdkResponse
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Hash className="w-3 h-3 text-purple-500" />
                <span>jupsoft.getTags()</span>
              </button>

              <button
                onClick={() => handleRunSdkMethod('getBlogBySlug')}
                disabled={isSdkRunning}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  sdkMethod === 'getBlogBySlug' && sdkResponse
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileText className="w-3 h-3 text-amber-500" />
                <span>jupsoft.getBlogBySlug('{sampleSlug.slice(0, 20)}...')</span>
              </button>

              <button
                onClick={() => handleRunSdkMethod('getWebsiteInfo')}
                disabled={isSdkRunning}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  sdkMethod === 'getWebsiteInfo' && sdkResponse
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Globe className="w-3 h-3 text-cyan-500" />
                <span>jupsoft.getWebsiteInfo()</span>
              </button>
            </div>

            {/* Live Playground Output Box */}
            {isSdkRunning ? (
              <div className="py-12 text-center space-y-2 bg-slate-900/80 rounded-xl border border-slate-800 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
                <div className="text-xs font-mono">Executing live SDK query on NestJS /v1...</div>
              </div>
            ) : sdkResponse ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 text-slate-300 text-xs font-mono border border-slate-800">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-emerald-400">Method:</span>
                    <span className="text-white font-semibold">{sdkResponse.method}</span>
                    <span className="text-slate-500 hidden sm:inline">&rarr;</span>
                    <span className="text-slate-400 hidden sm:inline truncate">{sdkResponse.url}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(sdkResponse.body, null, 2), 'sdk-resp')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                  >
                    {copiedCode === 'sdk-resp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode === 'sdk-resp' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>

                <pre className="p-4 bg-[#0a0f1d] text-emerald-400 rounded-xl text-xs font-mono overflow-auto max-h-72 leading-relaxed border border-slate-800">
                  {JSON.stringify(sdkResponse.body, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span>Click any method above to run a genuine live SDK call against the PostgreSQL-backed API.</span>
                </div>
                <button
                  onClick={() => handleRunSdkMethod('getBlogs')}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Run Initial Test</span>
                </button>
              </div>
            )}
          </div>

          {/* 1-CLICK CLI TERMINAL SCAFFOLDING COMMAND */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-500" />
                  1-Click Terminal Scaffolding Command
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Run this single command inside your Next.js 16 project root to initialize folders and create <code className="font-mono text-emerald-600">.env.local</code>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setScaffoldShell('powershell')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      scaffoldShell === 'powershell'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    PowerShell
                  </button>
                  <button
                    onClick={() => setScaffoldShell('bash')}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      scaffoldShell === 'bash'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Bash / macOS
                  </button>
                </div>

                <button
                  onClick={() => copyToClipboard(
                    scaffoldShell === 'powershell' ? cliScaffoldPowerShell : cliScaffoldBash,
                    'cli-scaffold'
                  )}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  {copiedCode === 'cli-scaffold' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'cli-scaffold' ? 'Copied' : 'Copy Script'}</span>
                </button>
              </div>
            </div>

            <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
              {scaffoldShell === 'powershell' ? cliScaffoldPowerShell : cliScaffoldBash}
            </pre>
          </div>

          {/* CODE SNIPPET JUMP TABS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Filter Files:</span>
            {[
              { id: 'all', label: 'All Options' },
              { id: 'npm', label: '⚡ 1-Command CLI Wizard' },
              { id: 'widget', label: '🌐 Universal HTML/PHP Widget' },
              { id: 'env', label: '1. .env.local' },
              { id: 'nextconfig', label: '2. next.config.ts' },
              { id: 'sdk', label: '3. lib/jupsoft-sdk.ts' },
              { id: 'listing', label: '4. app/blog/page.tsx' },
              { id: 'detail', label: '5. app/blog/[slug]/page.tsx' },
              { id: 'revalidate', label: '6. app/api/revalidate/route.ts' },
              { id: 'sitemap', label: '7. app/sitemap.ts' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSnippetFilter(tab.id as any)}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeSnippetFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                    : 'bg-white dark:bg-[#0f172a] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* CARD 0: 1-COMMAND NPM PACKAGE CLI */}
          {(activeSnippetFilter === 'all' || activeSnippetFilter === 'npm') && (
            <div className="bg-linear-to-r from-blue-900/5 via-indigo-900/10 to-purple-900/5 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 border-2 border-indigo-500/40 dark:border-indigo-500/50 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      Recommended • Zero-Config Setup
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Next.js 14/15/16 Ready
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
                    <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    1-Command Auto-Installer (<code className="font-mono text-indigo-600 dark:text-indigo-400">@jupsoft/next-blog</code>)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Run this single command in your Next.js root. It auto-installs the package, generates listing &amp; reader pages with sleek auto-locale dropdown, sets up webhook cache revalidation, and configures <code className="font-mono text-indigo-600">.env.local</code> for <strong>{activeSite.name}</strong>.
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(npmCliSnippet, 'npm-cli')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0"
                >
                  {copiedCode === 'npm-cli' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode === 'npm-cli' ? 'Copied Command' : 'Copy CLI Command'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-950 text-indigo-300 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-indigo-900/50 shadow-inner">
                {npmCliSnippet}
              </pre>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                  <span className="text-indigo-500 font-bold">1.</span>
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">Auto-installs package:</strong>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Detects your package manager and installs missing dependencies.</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                  <span className="text-indigo-500 font-bold">2.</span>
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">Generates all routes:</strong>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Creates <code>app/blog</code>, <code>[slug]</code>, and webhook API route.</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                  <span className="text-indigo-500 font-bold">3.</span>
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">Auto-Locale Dropdown:</strong>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Detects browser language with compact micro-dropdown &amp; SEO tags.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CARD: UNIVERSAL HTML/PHP EMBED WIDGET */}
          {(activeSnippetFilter === 'all' || activeSnippetFilter === 'widget') && (
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                      Non-Next.js / Universal
                    </span>
                    <span className="text-xs text-slate-500">HTML · PHP · WordPress · Laravel · Shopify</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    Universal Blog Feed Widget (2-Line Drop-in)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    For non-Next.js websites: embed your live blog feed with auto-locale micro-dropdown and responsive grid cards anywhere.
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(universalWidgetSnippet, 'universal-widget')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0"
                >
                  {copiedCode === 'universal-widget' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'universal-widget' ? 'Copied' : 'Copy Widget Code'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
                {universalWidgetSnippet}
              </pre>
            </div>
          )}

          {/* CARD 1: .env.local */}
          {(activeSnippetFilter === 'all' || activeSnippetFilter === 'env') && (
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-500" />
                    1. Environment Configuration (<code className="font-mono text-blue-600 dark:text-blue-400">.env.local</code>)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tenant-specific secrets automatically calibrated for {activeSite.name}.
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(envConfigSnippet, 'env-config')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  {copiedCode === 'env-config' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'env-config' ? 'Copied' : 'Copy Env'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
                {envConfigSnippet}
              </pre>
            </div>
          )}

          {/* CARD 2: next.config.ts */}
          {(activeSnippetFilter === 'all' || activeSnippetFilter === 'nextconfig') && (
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-cyan-500" />
                    2. WebP Image Optimization Config (<code className="font-mono text-blue-600 dark:text-blue-400">next.config.ts</code>)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Permits remote WebP image loading from S3, CMS uploads, and tenant domains without host errors.
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(nextConfigSnippet, 'next-config')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  {copiedCode === 'next-config' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'next-config' ? 'Copied' : 'Copy Config'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[380px] leading-relaxed border border-slate-800">
                {nextConfigSnippet}
              </pre>
            </div>
          )}

          {/* CARD 3: lib/jupsoft-sdk.ts */}
          {(activeSnippetFilter === 'all' || activeSnippetFilter === 'sdk') && (
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-blue-500" />
                    3. Turnkey Next.js 16 Type-Safe Client SDK (<code className="font-mono text-blue-600 dark:text-blue-400">lib/jupsoft-sdk.ts</code>)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Complete client with ISR cache tags, crypto HMAC signature verification, search, taxonomy &amp; fire-and-forget view telemetry.
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(nextjsSdkSnippet, 'next-sdk')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  {copiedCode === 'next-sdk' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'next-sdk' ? 'Copied' : 'Copy SDK'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed border border-slate-800">
                {nextjsSdkSnippet}
              </pre>
            </div>
          )}

          {/* CARD 4: app/blog/page.tsx */}
          {(activeSnippetFilter === 'all' || activeSnippetFilter === 'listing') && (
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    4. Blog Archive &amp; Category Grid (<code className="font-mono text-blue-600 dark:text-blue-400">app/blog/page.tsx</code>)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Next.js 16 Server Component: async searchParams, category pills, responsive grid of article cards, author, WebP thumbnail &amp; pagination.
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(nextjsListingSnippet, 'next-listing')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  {copiedCode === 'next-listing' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'next-listing' ? 'Copied' : 'Copy Listing'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed border border-slate-800">
                {nextjsListingSnippet}
              </pre>
            </div>
          )}

          {/* CARD 5: app/blog/[slug]/page.tsx */}
          {(activeSnippetFilter === 'all' || activeSnippetFilter === 'detail') && (
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-emerald-500" />
                    5. Dynamic Article Post Detail (<code className="font-mono text-blue-600 dark:text-blue-400">app/blog/[slug]/page.tsx</code>)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Next.js 16 Server Component: async params Promise, automated OpenGraph metadata, Schema.org JSON-LD &amp; background ISR.
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(nextjsConsumerSnippet, 'next-page')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  {copiedCode === 'next-page' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'next-page' ? 'Copied' : 'Copy Detail'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[500px] leading-relaxed border border-slate-800">
                {nextjsConsumerSnippet}
              </pre>
            </div>
          )}

          {/* CARD 6: app/api/revalidate/route.ts */}
          {(activeSnippetFilter === 'all' || activeSnippetFilter === 'revalidate') && (
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-violet-500" />
                    6. On-Demand ISR Cache Purge Webhook (<code className="font-mono text-blue-600 dark:text-blue-400">app/api/revalidate/route.ts</code>)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Next.js 16 App Router Route Handler: validates HMAC SHA-256 signatures and executes zero-downtime cache purges.
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(webhookHandlerSnippet, 'webhook-route')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  {copiedCode === 'webhook-route' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'webhook-route' ? 'Copied' : 'Copy Webhook'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[460px] leading-relaxed border border-slate-800">
                {webhookHandlerSnippet}
              </pre>
            </div>
          )}

          {/* CARD 7: app/sitemap.ts */}
          {(activeSnippetFilter === 'all' || activeSnippetFilter === 'sitemap') && (
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-teal-500" />
                    7. Dynamic Automated Sitemap (<code className="font-mono text-blue-600 dark:text-blue-400">app/sitemap.ts</code>)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Generates dynamic XML sitemaps for search engines querying all published articles via the SDK.
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(sitemapSnippet, 'sitemap-code')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  {copiedCode === 'sitemap-code' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'sitemap-code' ? 'Copied' : 'Copy Sitemap'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[380px] leading-relaxed border border-slate-800">
                {sitemapSnippet}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* TAB: INTERACTIVE ENDPOINT TESTER */}
      {activeTab === 'tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Request Builder Panel (5 Cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-500" />
                Live Request Builder
              </h2>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                GET
              </span>
            </div>

            {/* Endpoint Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Endpoint Route</label>
              <select
                value={selectedEndpoint}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white outline-none cursor-pointer focus:border-blue-500"
              >
                <option value="/v1/blogs">GET /v1/blogs (List Published Posts)</option>
                <option value="/v1/blogs/{slug}">GET /v1/blogs/:slug (Single Post by Slug)</option>
                <option value="/v1/blogs/latest">GET /v1/blogs/latest (Latest Posts)</option>
                <option value="/v1/blogs/popular">GET /v1/blogs/popular (Most Viewed Posts)</option>
                <option value="/v1/categories">GET /v1/categories (Taxonomy Tree)</option>
                <option value="/v1/tags">GET /v1/tags (Website Tags)</option>
                <option value="/v1/search">GET /v1/search (Full-Text Search)</option>
                <option value="/v1/website">GET /v1/website (Tenant Metadata)</option>
              </select>
            </div>

            {/* Dynamic Param Inputs */}
            {selectedEndpoint === '/v1/blogs/{slug}' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Article Slug</label>
                <input
                  type="text"
                  value={slugParam}
                  onChange={(e) => setSlugParam(e.target.value)}
                  placeholder={sampleSlug}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
            )}

            {selectedEndpoint === '/v1/search' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Search Query (q)</label>
                <input
                  type="text"
                  value={searchQueryParam}
                  onChange={(e) => setSearchQueryParam(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* Language Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Language Locale</label>
              <div className="flex items-center gap-2">
                {['en', 'hi', 'fr', 'ar'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-colors cursor-pointer border ${
                      selectedLang === lang
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Auth Token Preview */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Resolved Authorization Header</div>
              <div className="font-mono text-[11px] text-slate-800 dark:text-slate-300 truncate">
                Bearer {activeSite.apiKey}
              </div>
            </div>

            {/* Execute Button */}
            <button
              onClick={handleExecuteApi}
              disabled={isLoadingTest}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isLoadingTest ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Live Request...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Send Request to NestJS Server</span>
                </>
              )}
            </button>

            {/* Generated cURL */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Equivalent cURL</span>
                <button
                  onClick={() => copyToClipboard(curlCommand, 'curl')}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode === 'curl' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode === 'curl' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                {curlCommand}
              </pre>
            </div>
          </div>

          {/* Response Inspector Panel (7 Cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Live Response Inspector
                </h2>

                {testResponse && (
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded-md font-mono font-bold ${
                      testResponse.status >= 200 && testResponse.status < 300
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                    }`}>
                      {testResponse.status} {testResponse.status === 200 ? 'OK' : 'Error'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {testResponse.latencyMs}ms
                    </span>
                  </div>
                )}
              </div>

              {testResponse ? (
                <div className="mt-3 space-y-3">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] font-mono space-y-0.5 text-slate-500 dark:text-slate-400">
                    <div>Content-Type: {testResponse.headers['Content-Type']}</div>
                    <div>X-Tenant-ID: {testResponse.headers['X-Tenant-ID']}</div>
                    <div>X-RateLimit-Remaining: {testResponse.headers['X-RateLimit-Remaining']} / 1000</div>
                    <div>X-Cache: {testResponse.headers['X-Cache']}</div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(testResponse.body, null, 2), 'body')}
                      className="absolute right-3 top-3 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer border border-slate-700"
                    >
                      {copiedCode === 'body' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode === 'body' ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                    <pre className="p-4 bg-[#0a0f1d] text-emerald-400 rounded-xl text-xs font-mono overflow-auto max-h-[440px] leading-relaxed border border-slate-800">
                      {JSON.stringify(testResponse.body, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-xs text-slate-400 space-y-2">
                  <Code2 className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                  <div>Click "Send Request to NestJS Server" to execute a live probe.</div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>REST API v1 (NestJS)</span>
              <span>PostgreSQL + Redis Cached</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SPECS & HEADERS */}
      {activeTab === 'specs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-500" />
              Required Request Headers
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 font-mono font-semibold text-slate-800 dark:text-slate-200">
                Authorization: Bearer &lt;API_KEY&gt;
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 font-mono font-semibold text-slate-800 dark:text-slate-200">
                Accept: application/json
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 font-mono font-semibold text-slate-800 dark:text-slate-200">
                x-signature: &lt;HMAC_SHA256&gt;
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              Status Codes &amp; Errors
            </h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                <span className="font-bold">200 OK</span>
                <span>Request successful &amp; payload returned</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                <span className="font-bold">301 Moved Permanently</span>
                <span>Slug redirected to new URL</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                <span className="font-bold">401 Unauthorized</span>
                <span>Missing or invalid API key</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                <span className="font-bold">404 Not Found</span>
                <span>Slug does not exist or unpublished</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40">
                <span className="font-bold">429 Too Many Requests</span>
                <span>Exceeded 1,000 req/min rate limit</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT HANDOVER & INSTALL MODAL */}
      <ClientHandoverModal
        isOpen={isHandoverOpen}
        site={activeSite}
        onClose={() => setIsHandoverOpen(false)}
      />
    </div>
  );
};
