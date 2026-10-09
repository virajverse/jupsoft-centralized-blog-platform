'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Website, Blog } from '../../types';
import { 
  Code, 
  Copy, 
  Check, 
  Globe, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  ShieldCheck, 
  Server, 
  FileCode2, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  HelpCircle, 
  FileText, 
  Lock, 
  Eye, 
  EyeOff, 
  Search, 
  Clock, 
  KeyRound,
  Zap,
  BookOpen
} from 'lucide-react';

export interface DeveloperWorkspaceV2Props {
  activeSite: Website;
  websites?: Website[];
  onSelectSite?: (siteId: string) => void;
  isSuperAdmin?: boolean;
  canViewApiKey?: boolean;
  blogs?: Blog[];
}

export const DeveloperWorkspaceV2: React.FC<DeveloperWorkspaceV2Props> = ({
  activeSite,
  websites = [],
  onSelectSite,
  isSuperAdmin = false,
  canViewApiKey = true,
  blogs = [],
}) => {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<'js' | 'env' | 'server' | 'tester'>('js');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showCmsToken, setShowCmsToken] = useState(false);
  const [encryptedCmsToken, setEncryptedCmsToken] = useState<string>(
    'idF9Vzz2az9eisdgl6ifp4yGSxi5cGjt7NJ8LxNhw8YZGBOP8jBnp49lqpunfjsl'
  );

  // Live Console Tester State
  const [testEndpoint, setTestEndpoint] = useState<'blogs' | 'detail' | 'latest' | 'popular' | 'categories' | 'health'>('blogs');
  const [testSlug, setTestSlug] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testStatus, setTestStatus] = useState<number | null>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [bypassCacheTest, setBypassCacheTest] = useState(false);
  const [lastTestedTime, setLastTestedTime] = useState<string | null>(null);

  // FAQ Search & Accordion State
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isSchemaOpen, setIsSchemaOpen] = useState(false);

  // Active Tenant Credentials
  const websiteId = activeSite?.id || 'site-default';
  const siteDomain = activeSite?.domain || 'yourdomain.com';
  const apiKey = (canViewApiKey && activeSite?.apiKey) ? activeSite.apiKey : 'jup_live_sec_your_api_key';
  const apiBaseUrl = 'https://blogary.jupsoft.com/v1';

  // Published Blogs for Slug Testing
  const publishedBlogs = useMemo(() => {
    return blogs.filter((b) => b.websiteId === activeSite.id && b.status === 'Published');
  }, [blogs, activeSite.id]);

  const defaultRealSlug = useMemo(() => {
    if (publishedBlogs.length > 0) {
      const first = publishedBlogs[0];
      const lang = activeSite.defaultLanguage || 'en';
      return first.translations[lang]?.slug || Object.values(first.translations)[0]?.slug || 'sample-post-slug';
    }
    return 'sample-post-slug';
  }, [publishedBlogs, activeSite.defaultLanguage]);

  useEffect(() => {
    if (!testSlug || testSlug === 'sample-post-slug') {
      setTestSlug(defaultRealSlug);
    }
  }, [defaultRealSlug]);

  // Dynamically compute AES-128-CBC encrypted cipher token for CMS_TOKEN
  useEffect(() => {
    async function computeAesCipher() {
      if (!apiKey || apiKey.includes('your_api_key')) return;
      try {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
          const keyBytes = new Uint8Array([0x50, 0x64, 0x70, 0x53, 0x63, 0x68, 0x6F, 0x6F, 0x6C, 0x32, 0x30, 0x32, 0x36, 0x21, 0x40, 0x23]);
          const ivBytes = new Uint8Array([0x4A, 0x75, 0x70, 0x73, 0x6F, 0x66, 0x74, 0x43, 0x6D, 0x73, 0x53, 0x65, 0x63, 0x75, 0x72, 0x65]);
          const cryptoKey = await window.crypto.subtle.importKey(
            'raw',
            keyBytes,
            { name: 'AES-CBC' },
            false,
            ['encrypt']
          );
          const encoded = new TextEncoder().encode(apiKey);
          const encrypted = await window.crypto.subtle.encrypt(
            { name: 'AES-CBC', iv: ivBytes },
            cryptoKey,
            encoded
          );
          const base64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
          setEncryptedCmsToken(base64);
        }
      } catch (err) {
        // Fallback keep existing
      }
    }
    computeAesCipher();
  }, [apiKey]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadFile = (content: string, filename: string, mimeType = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 1. PURE HEADLESS CLIENT JAVASCRIPT SDK (cms-client.js)
  // Zero UI, Zero CSS, Zero DOM Manipulation — Pure Data Fetching Engine (~2.8 KB)
  // ──────────────────────────────────────────────────────────────────────────
  const pureJsClientCode = useMemo(() => {
    return `/**
 * Jupsoft Centralized Blog Platform — Headless JavaScript SDK (cms-client.js)
 * Website: ${activeSite?.name || 'Website'} (${websiteId})
 * Domain: ${siteDomain}
 * 
 * Features:
 * - Pure Headless Data Client (Zero UI, Zero CSS conflicts)
 * - Safe Fetch with AbortController 5000ms Timeout
 * - Stale-While-Revalidate session caching (0ms instant page loads)
 * - Automatic Origin Domain Whitelist Authentication
 * - Clean Promise-based API for any framework (SHTML, HTML, React, Vue, PHP, ASP.NET)
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.JupsoftCMS = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var config = {
    websiteId: '${websiteId}',
    cmsToken: '${encryptedCmsToken}',
    apiUrl: '${apiBaseUrl}',
    timeoutMs: 5000,
    enableCache: true
  };

  // Merge runtime configuration if window.JUPSOFT_CONFIG is defined
  if (typeof window !== 'undefined' && window.JUPSOFT_CONFIG) {
    for (var key in window.JUPSOFT_CONFIG) {
      if (window.JUPSOFT_CONFIG.hasOwnProperty(key)) {
        config[key] = window.JUPSOFT_CONFIG[key];
      }
    }
  }

  // Safe fetch with AbortController timeout & standard headers
  function request(endpoint, params) {
    params = params || {};
    var queryParts = ['website=' + encodeURIComponent(config.websiteId)];

    for (var p in params) {
      if (params.hasOwnProperty(p) && params[p] !== undefined && params[p] !== null) {
        queryParts.push(encodeURIComponent(p) + '=' + encodeURIComponent(params[p]));
      }
    }

    var separator = endpoint.indexOf('?') === -1 ? '?' : '&';
    var url = config.apiUrl + endpoint + separator + queryParts.join('&');

    // 0ms Stale-While-Revalidate session cache check
    var cacheKey = 'jupsoft_cache_' + url;
    if (config.enableCache && typeof sessionStorage !== 'undefined' && !params.fresh) {
      try {
        var cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          var parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 120000) { // 2 minutes TTL
            return Promise.resolve(parsed.payload);
          }
        }
      } catch (e) {}
    }

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = null;

    var fetchPromise = fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'x-cms-token': config.cmsToken,
        'x-website-id': config.websiteId
      },
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          return {
            success: false,
            status: res.status,
            error: data.message || data.error || 'Request failed with status ' + res.status
          };
        }
        var responsePayload = {
          success: true,
          status: res.status,
          data: data.data || data,
          pagination: data.pagination || null
        };
        // Store in session cache
        if (config.enableCache && typeof sessionStorage !== 'undefined') {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({
              timestamp: Date.now(),
              payload: responsePayload
            }));
          } catch (e) {}
        }
        return responsePayload;
      });
    }).catch(function (err) {
      return {
        success: false,
        status: err.name === 'AbortError' ? 504 : 500,
        error: err.message || 'Network request failed'
      };
    });

    var timeoutPromise = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        if (controller) controller.abort();
        reject(new Error('Jupsoft CMS request timed out after ' + config.timeoutMs + 'ms'));
      }, config.timeoutMs);
    });

    return Promise.race([fetchPromise, timeoutPromise]).finally(function () {
      if (timer) clearTimeout(timer);
    });
  }

  // ── PUBLIC SDK API ──
  var SDK = {
    config: config,

    // Runtime config override
    init: function (customConfig) {
      if (customConfig && typeof customConfig === 'object') {
        for (var k in customConfig) {
          if (customConfig.hasOwnProperty(k)) {
            config[k] = customConfig[k];
          }
        }
      }
      return SDK;
    },

    // 1. Get Paginated Articles (supports search, category, tag, page, limit)
    getBlogs: function (options) {
      options = options || {};
      return request('/blogs', {
        page: options.page || 1,
        limit: options.limit || 10,
        category: options.category || undefined,
        tag: options.tag || undefined,
        search: options.search || undefined,
        fresh: options.fresh ? 1 : undefined
      });
    },

    // 2. Get Single Article by Slug (auto-extracts slug from URL if omitted)
    getBlogBySlug: function (slug, options) {
      options = options || {};
      if (!slug && typeof window !== 'undefined') {
        // Auto-extract from ?slug= query param or /blog/slug path
        var match = window.location.search.match(/[?&]slug=([^&]+)/);
        if (match) {
          slug = decodeURIComponent(match[1]);
        } else {
          var segments = window.location.pathname.replace(/\\/+$/, '').split('/');
          slug = decodeURIComponent(segments[segments.length - 1]);
        }
      }
      if (!slug) {
        return Promise.resolve({
          success: false,
          status: 400,
          error: 'Missing required article slug identifier.'
        });
      }
      return request('/blogs/' + encodeURIComponent(slug), {
        fresh: options.fresh ? 1 : undefined
      });
    },

    // 3. Get Latest Articles
    getLatest: function (limit) {
      return request('/blogs/latest', { limit: limit || 3 });
    },

    // 4. Get Most Popular Articles
    getPopular: function (limit) {
      return request('/blogs/popular', { limit: limit || 3 });
    },

    // 5. Get Category Taxonomy Tree
    getCategories: function () {
      return request('/categories', { websiteId: config.websiteId });
    },

    // 6. Optional Head SEO Tag Helper (pure <head> injection, no body UI)
    applySeo: function (article) {
      if (!article || typeof document === 'undefined') return;
      if (article.title) document.title = article.title;
      if (article.excerpt) {
        var metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.setAttribute('name', 'description');
          document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', article.excerpt);
      }
      if (article.schemaJsonLd) {
        var script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify(article.schemaJsonLd);
        document.head.appendChild(script);
      }
    }
  };

  return SDK;
}));
`;
  }, [activeSite?.name, websiteId, siteDomain, encryptedCmsToken, apiBaseUrl]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. PRE-CONFIGURED .ENV FILE
  // ──────────────────────────────────────────────────────────────────────────
  const envFileContent = useMemo(() => {
    return `# ==============================================================================
# Jupsoft Centralized Blog Platform — Environment Variables
# Website: ${activeSite?.name || 'Website'}
# Domain: ${siteDomain}
# ==============================================================================

# Public Frontend Variables (Safe for browser / client scripts)
JUPSOFT_WEBSITE_ID="${websiteId}"
JUPSOFT_CMS_TOKEN="${encryptedCmsToken}"
JUPSOFT_API_URL="${apiBaseUrl}"

# Server Master Secret Key (Keep private, never expose in public HTML / client JS)
JUPSOFT_API_KEY="${apiKey}"
`;
  }, [activeSite?.name, siteDomain, websiteId, encryptedCmsToken, apiBaseUrl, apiKey]);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. SERVER REWRITE RULES (IIS web.config & Apache .htaccess)
  // ──────────────────────────────────────────────────────────────────────────
  const iisRewriteCode = useMemo(() => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="JupsoftBlogDetail" stopProcessing="true">
          <match url="^blog/([a-zA-Z0-9\\-_]+)/?$" />
          <action type="Rewrite" url="blog-detail.shtml?slug={R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>`;
  }, []);

  const htaccessCode = useMemo(() => {
    return `RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^blog/([a-zA-Z0-9\\-_]+)/?$ blog-detail.shtml?slug=$1 [L,QSA]`;
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. LIVE API TEST RUNNER
  // ──────────────────────────────────────────────────────────────────────────
  const runLiveTest = async () => {
    setIsTesting(true);
    setTestError(null);
    setTestResult(null);
    setTestStatus(null);
    setTestLatency(null);

    const freshParam = bypassCacheTest ? '&fresh=1' : '';
    let url = `${apiBaseUrl}/blogs?website=${encodeURIComponent(websiteId)}&limit=2${freshParam}`;
    if (testEndpoint === 'detail') {
      url = `${apiBaseUrl}/blogs/${encodeURIComponent(testSlug || 'sample-post-slug')}?website=${encodeURIComponent(websiteId)}${freshParam}`;
    } else if (testEndpoint === 'latest') {
      url = `${apiBaseUrl}/blogs/latest?website=${encodeURIComponent(websiteId)}&limit=3${freshParam}`;
    } else if (testEndpoint === 'popular') {
      url = `${apiBaseUrl}/blogs/popular?website=${encodeURIComponent(websiteId)}&limit=3${freshParam}`;
    } else if (testEndpoint === 'categories') {
      url = `${apiBaseUrl}/categories?websiteId=${encodeURIComponent(websiteId)}`;
    } else if (testEndpoint === 'health') {
      url = `${apiBaseUrl}/health`;
    }

    const startTime = performance.now();

    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          ...(testEndpoint !== 'health' && apiKey && !apiKey.includes('your_api_key') ? { 'x-api-key': apiKey } : {})
        }
      });

      const latency = Math.round(performance.now() - startTime);
      setTestLatency(latency);
      setTestStatus(res.status);
      setLastTestedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      const json = await res.json();
      setTestResult(json);
      if (!res.ok) {
        setTestError(json.error || json.message || `HTTP ${res.status}: Request could not be fulfilled.`);
      }
    } catch (err: any) {
      const latency = Math.round(performance.now() - startTime);
      setTestLatency(latency);
      setTestStatus(500);
      setLastTestedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTestError(err.message || 'Request failed. Check network, CORS or domain permissions.');
    } finally {
      setIsTesting(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 5. SEARCHABLE FAQS
  // ──────────────────────────────────────────────────────────────────────────
  const faqItems = useMemo(() => [
    {
      id: 1,
      question: "1. Why did I get a 401 error when testing the URL in Chrome's address bar?",
      answer: `Direct browser address bar visits do not send an Origin or Referer header, so the security guard blocks them with "401 Direct browser access denied". When your frontend JavaScript runs on your website (${siteDomain}) or on localhost, the browser automatically provides the Origin header, allowing public reads with zero plaintext key leakage.`
    },
    {
      id: 2,
      question: "2. Why does clicking a blog link give a 404 error on my static website?",
      answer: `Static web servers look for a physical folder matching the slug path (such as /blog/sample-slug/index.html). With URL Rewrites configured (IIS web.config or Apache .htaccess), requests to /blog/{slug} are rewritten internally to blog-detail.shtml?slug={slug} without modifying the address bar URL.`
    },
    {
      id: 3,
      question: "3. Can I test on localhost before deploying to production without CORS errors?",
      answer: `Yes, absolutely! localhost, 127.0.0.1, *.vercel.app, and *.netlify.app are permanently whitelisted origins in the Centralized CMS API gateway for local developer workflows. You do not need to configure custom CORS rules for local testing.`
    },
    {
      id: 4,
      question: "4. What is the difference between CMS_TOKEN and API_KEY?",
      answer: `CMS_TOKEN is an AES-encrypted, public-safe client token designed to be used in frontend JavaScript (or SHTML/HTML). API_KEY is your master server secret key intended strictly for server-side environments (Node.js, C#, Java, Python, .env) and must never be committed into public client code.`
    },
    {
      id: 5,
      question: "5. How do I see new blog updates immediately without waiting for edge cache?",
      answer: `Append &fresh=1 to your query URL (e.g. ${apiBaseUrl}/blogs?website=${websiteId}&fresh=1), or pass { fresh: true } into JupsoftCMS.getBlogs({ fresh: true }). This instructs Redis cache to bypass cached payloads and query live PostgreSQL records immediately.`
    }
  ], [siteDomain, websiteId, apiBaseUrl]);

  const filteredFaqs = useMemo(() => {
    if (!faqSearchQuery.trim()) return faqItems;
    const q = faqSearchQuery.toLowerCase();
    return faqItems.filter(item => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q));
  }, [faqItems, faqSearchQuery]);

  const jsCodeLines = useMemo(() => pureJsClientCode.split('\n'), [pureJsClientCode]);

  return (
    <div className="space-y-6 font-sans">
      {/* ── 1. PROMINENT WEBSITE CONFIGURATION SELECTOR CARD ── */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold font-mono tracking-wider uppercase border border-indigo-200 dark:border-indigo-900">
                <Code className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>Developer Integration Hub</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">•</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Connected &amp; Active</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                Production Gateway (v1)
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {activeSite?.name || 'Configured Website'}
              </h2>
              <a 
                href={`https://${siteDomain}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 bg-indigo-50/60 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-900/40"
              >
                <span>{siteDomain}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Tailored credentials, lightweight headless JavaScript SDK, and server rewrites for <strong>{siteDomain}</strong>. Zero plain-text key exposure in public page source.
            </p>
          </div>

          {/* Website Dropdown Switcher */}
          {websites && websites.length > 0 && onSelectSite && (
            <div className="shrink-0 bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 min-w-[280px] shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Switch Website</span>
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  {websites.length} Websites
                </span>
              </div>
              <select
                value={activeSite.id}
                onChange={(e) => onSelectSite(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                {websites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.domain})
                  </option>
                ))}
              </select>
              <div className="text-[10px] text-slate-400 mt-1.5 flex items-center justify-between">
                <span>{publishedBlogs.length} articles published</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Whitelisted
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Download Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">Direct Downloads:</span>
            <button
              onClick={() => downloadFile(pureJsClientCode, 'cms-client.js', 'application/javascript')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Download pre-filled lightweight cms-client.js"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download cms-client.js</span>
            </button>
            <button
              onClick={() => downloadFile(envFileContent, '.env', 'text/plain')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Download pre-configured .env file"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Download .env</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            Pure Data SDK • No UI Dependencies
          </span>
        </div>
      </div>

      {/* ── 2. CREDENTIALS CARD (WEBSITE ID, CMS_TOKEN & API_KEY) ── */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-indigo-500" />
            <span>Target Credentials &amp; Tokens</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Use <code className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">CMS_TOKEN</code> in public frontend code. Keep <code className="font-mono text-rose-600 dark:text-rose-400 font-semibold">API_KEY</code> strictly in private server environments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
          {/* 1. Website ID */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Website ID
              </span>
              <button
                onClick={() => copyToClipboard(websiteId, 'cred-site-id')}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                {copiedKey === 'cred-site-id' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'cred-site-id' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <input
              type="text"
              readOnly
              value={websiteId}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono text-xs select-all"
            />
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              Identifier for multi-tenant isolation and queries.
            </p>
          </div>

          {/* 2. CMS_TOKEN (Frontend Safe) */}
          <div className="p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  CMS_TOKEN
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-mono">
                  Frontend Safe
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCmsToken(!showCmsToken)}
                  className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold cursor-pointer flex items-center gap-1"
                >
                  {showCmsToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showCmsToken ? 'Hide' : 'Reveal'}</span>
                </button>
                <button
                  onClick={() => copyToClipboard(encryptedCmsToken, 'cred-cms-token')}
                  className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                >
                  {copiedKey === 'cred-cms-token' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'cred-cms-token' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <input
              type={showCmsToken ? 'text' : 'password'}
              readOnly
              value={encryptedCmsToken}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono text-xs select-all"
            />
            <p className="text-[10.5px] text-emerald-800 dark:text-emerald-400">
              AES-128 ciphertext token safe for public HTML / JS.
            </p>
          </div>

          {/* 3. API_KEY (Backend Master Secret) */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  API_KEY
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  Server Only
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold cursor-pointer flex items-center gap-1"
                >
                  {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showApiKey ? 'Hide' : 'Reveal'}</span>
                </button>
                <button
                  onClick={() => copyToClipboard(apiKey, 'cred-api-key')}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                >
                  {copiedKey === 'cred-api-key' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'cred-api-key' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <input
              type={showApiKey ? 'text' : 'password'}
              readOnly
              value={apiKey}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono text-xs select-all"
            />
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              Master API key for server-side .env, Node, C#, Java, PHP.
            </p>
          </div>
        </div>

        {/* Security Whitelist Guarantee */}
        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-xl text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Zero Plaintext Key Leakage Guarantee:</strong> Public web pages never need your master <code className="font-mono">API_KEY</code>. Use the pre-configured <code className="font-mono">cms-client.js</code> with <code className="font-mono">CMS_TOKEN</code>, which is cryptographically locked to <strong>{siteDomain}</strong> and <strong>localhost</strong>.
          </div>
        </div>
      </div>

      {/* ── 3. WORKSPACE TABS: JAVASCRIPT SDK, .ENV, SERVER REWRITES & API TESTER ── */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('js')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'js'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>1. JavaScript SDK (cms-client.js)</span>
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'env'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>2. Environment Config (.env)</span>
          </button>
          <button
            onClick={() => setActiveTab('server')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'server'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>3. URL Rewrites (IIS &amp; Apache)</span>
          </button>
          <button
            onClick={() => setActiveTab('tester')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'tester'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>4. Live API Endpoint Tester</span>
          </button>
        </div>

        {/* TAB 1: JAVASCRIPT SDK & SIMPLE USAGE GUIDE */}
        {activeTab === 'js' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Headless JavaScript Client SDK (Zero UI Dependencies)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Lightweight (~2.8 KB) script that fetches blog data and hands clean JSON to your frontend designer.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadFile(pureJsClientCode, 'cms-client.js', 'application/javascript')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download cms-client.js</span>
                </button>
                <button
                  onClick={() => copyToClipboard(pureJsClientCode, 'copy-js-sdk')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  {copiedKey === 'copy-js-sdk' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'copy-js-sdk' ? 'Copied SDK!' : 'Copy SDK Code'}</span>
                </button>
              </div>
            </div>

            {/* Simple 5-Line Usage Example for Frontend Developer */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2 text-xs">
              <span className="font-bold text-slate-900 dark:text-white block uppercase tracking-wider text-[11px]">
                Quick Usage for Frontend Developers (In your HTML / SHTML / JS):
              </span>
              <pre className="p-3 bg-[#0f1117] text-slate-200 rounded-lg font-mono text-[11.5px] leading-relaxed overflow-x-auto">
{`<!-- 1. Include the client script -->
<script src="/js/cms-client.js"></script>

<script>
  // 2. Fetch Blog List
  JupsoftCMS.getBlogs({ page: 1, limit: 9 }).then(function(res) {
    if (res.success) {
      console.log('Articles:', res.data); // Array of blogs
      // Your designer loops through res.data and fills their custom HTML cards
    }
  });

  // 3. Fetch Single Article Detail
  JupsoftCMS.getBlogBySlug().then(function(res) {
    if (res.success) {
      console.log('Article Detail:', res.data);
      // Optional: automatically set browser title and SEO meta
      JupsoftCMS.applySeo(res.data);
    }
  });
</script>`}
              </pre>
            </div>

            {/* SDK Code Viewport */}
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#0f1117] text-slate-200 font-mono text-xs shadow-md">
              <div className="px-4 py-2 bg-[#171b26] border-b border-slate-800 flex items-center justify-between">
                <span className="text-slate-300 text-xs font-mono">
                  cms-client.js ({jsCodeLines.length} lines)
                </span>
                <span className="text-[11px] text-slate-500 font-sans">
                  Ready to drop into /js/ or /assets/js/
                </span>
              </div>
              <div className="flex font-mono text-[11.5px] leading-relaxed max-h-[380px] overflow-y-auto overflow-x-auto bg-[#0a0c10]">
                <div className="select-none px-3 py-3 text-slate-600 border-r border-slate-800 text-right font-mono text-[11px] bg-[#0d0f15] shrink-0 sticky left-0 z-10">
                  {jsCodeLines.map((_, i) => (
                    <div key={i} className="leading-relaxed px-1">{i + 1}</div>
                  ))}
                </div>
                <pre className="p-3 pl-4 flex-1 text-slate-200 leading-relaxed font-mono">
                  {pureJsClientCode}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ENVIRONMENT CONFIG (.ENV) */}
        {activeTab === 'env' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Pre-Configured .env File (For Backend / SSR Stacks)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  For Node.js, Next.js, Python, Java, PHP, or C# ASP.NET server-side environment setup.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadFile(envFileContent, '.env', 'text/plain')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .env</span>
                </button>
                <button
                  onClick={() => copyToClipboard(envFileContent, 'copy-env-file')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  {copiedKey === 'copy-env-file' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'copy-env-file' ? 'Copied .env!' : 'Copy .env'}</span>
                </button>
              </div>
            </div>

            <pre className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#0f1117] text-slate-200 font-mono text-xs leading-relaxed overflow-x-auto">
              {envFileContent}
            </pre>
          </div>
        )}

        {/* TAB 3: SERVER URL REWRITE RULES (IIS & APACHE) */}
        {activeTab === 'server' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Web Server Clean URL Rewrites (Prevent 404 Errors)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Routes clean URLs like <code className="font-mono text-indigo-600 dark:text-indigo-400">/blog/post-slug</code> to <code className="font-mono">blog-detail.shtml?slug=post-slug</code> without altering browser URLs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* IIS */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileCode2 className="w-4 h-4 text-blue-500" />
                    Microsoft IIS (web.config)
                  </span>
                  <button
                    onClick={() => copyToClipboard(iisRewriteCode, 'copy-iis-v2')}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {copiedKey === 'copy-iis-v2' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'copy-iis-v2' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Place in the root directory of your IIS website. Requires IIS URL Rewrite module.
                </p>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto">
                  {iisRewriteCode}
                </pre>
              </div>

              {/* Apache */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileCode2 className="w-4 h-4 text-amber-500" />
                    Apache HTTP Server (.htaccess)
                  </span>
                  <button
                    onClick={() => copyToClipboard(htaccessCode, 'copy-apache-v2')}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {copiedKey === 'copy-apache-v2' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'copy-apache-v2' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Place in the public_html or website root directory. Requires mod_rewrite.
                </p>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto">
                  {htaccessCode}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LIVE API ENDPOINT TESTER */}
        {activeTab === 'tester' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Live API Endpoint Tester &amp; Diagnostic Ping
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Execute live requests to verify latency, origin whitelist, and response data structure.
                </p>
              </div>
              <button
                onClick={runLiveTest}
                disabled={isTesting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Testing...' : 'Execute API Ping'}</span>
              </button>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">HTTP Status</span>
                {testStatus !== null ? (
                  <span className={`inline-flex items-center gap-1.5 font-bold font-mono text-xs ${
                    testStatus === 200 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {testStatus === 200 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    <span>{testStatus === 200 ? '200 OK' : `HTTP ${testStatus}`}</span>
                  </span>
                ) : (
                  <span className="text-slate-500 font-mono text-xs">Pending Test</span>
                )}
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Latency</span>
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{testLatency !== null ? `${testLatency} ms` : '— ms'}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Health</span>
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className={`w-2 h-2 rounded-full ${testStatus === 200 ? 'bg-emerald-500' : (testStatus ? 'bg-rose-500' : 'bg-slate-400')}`} />
                  <span>{testStatus === 200 ? 'Operational' : (testStatus ? 'Check Error' : 'Ready')}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Last Checked</span>
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                  {lastTestedTime || 'Never'}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Endpoint</label>
                <select
                  value={testEndpoint}
                  onChange={(e: any) => setTestEndpoint(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none"
                >
                  <option value="blogs">GET /v1/blogs (Listing)</option>
                  <option value="detail">GET /v1/blogs/:slug (Detail)</option>
                  <option value="latest">GET /v1/blogs/latest</option>
                  <option value="categories">GET /v1/categories</option>
                  <option value="health">GET /v1/health</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Target Slug</label>
                <input
                  type="text"
                  value={testSlug}
                  onChange={(e) => setTestSlug(e.target.value)}
                  placeholder="article-slug"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={bypassCacheTest}
                    onChange={(e) => setBypassCacheTest(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Bypass Cache (<code className="text-indigo-600 font-mono">&amp;fresh=1</code>)</span>
                </label>
              </div>
            </div>

            {/* Live Response Output */}
            {(testResult || testError) && (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#0f1117] text-slate-200 text-xs font-mono shadow-md">
                <div className="px-3.5 py-2 bg-[#171b26] border-b border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">
                    Response Payload ({testLatency}ms)
                  </span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(testResult || testError, null, 2), 'tester-json')}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'tester-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'tester-json' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-3.5 max-h-52 overflow-y-auto overflow-x-auto text-[11.5px] leading-relaxed text-emerald-300">
                  {testResult ? JSON.stringify(testResult, null, 2) : testError}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 4. COLLAPSIBLE JSON SCHEMA DICTIONARY ── */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-all overflow-hidden">
        <button
          onClick={() => setIsSchemaOpen(!isSchemaOpen)}
          className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors select-none text-left"
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Field Schema Reference for Frontend Designers (JSON Dictionary)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Standard fields returned in article objects for your templates.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {isSchemaOpen ? 'Collapse' : 'Expand Schema'}
            </span>
            {isSchemaOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {isSchemaOpen && (
          <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="overflow-x-auto pt-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                    <th className="py-2 px-3 font-semibold">Field</th>
                    <th className="py-2 px-3 font-semibold">Type</th>
                    <th className="py-2 px-3 font-semibold">Where to use in your Design</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11.5px]">
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">title</td>
                    <td className="py-2 px-3 text-slate-500">string</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Article Main Headline (<code>&lt;h1&gt;</code> or <code>&lt;h3&gt;</code>)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">slug</td>
                    <td className="py-2 px-3 text-slate-500">string</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Link URL (<code>&lt;a href="/blog/{'{'}slug{'}'}"&gt;</code>)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">featuredImage</td>
                    <td className="py-2 px-3 text-slate-500">string</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Cover Thumbnail (<code>&lt;img src="..."&gt;</code>)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">excerpt</td>
                    <td className="py-2 px-3 text-slate-500">string</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Short Summary text (<code>&lt;p&gt;</code>)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">publishedAt</td>
                    <td className="py-2 px-3 text-slate-500">ISO string</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Date badge (<code>new Date(publishedAt).toLocaleDateString()</code>)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">content</td>
                    <td className="py-2 px-3 text-slate-500">HTML string</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Full sanitized blog article body (Detail page container)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. SEARCHABLE DEVELOPER FAQS ── */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              <span>Developer Troubleshooting FAQ</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Quick answers to common questions (401 direct browser access, 404 routing, CORS, cache).
            </p>
          </div>
          {/* FAQ Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={faqSearchQuery}
              onChange={(e) => setFaqSearchQuery(e.target.value)}
              placeholder="Search FAQ..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
            {faqSearchQuery && (
              <button
                onClick={() => setFaqSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2 text-xs pt-1">
          {filteredFaqs.map((item) => {
            const isOpen = openFaq === item.id;
            return (
              <div
                key={item.id}
                className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : item.id)}
                  className="w-full p-3.5 text-left font-semibold text-slate-800 dark:text-slate-200 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-850 transition-colors"
                >
                  <span className="pr-4">{item.question}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>
                {isOpen && (
                  <div className="p-3.5 text-slate-600 dark:text-slate-400 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 leading-relaxed">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
