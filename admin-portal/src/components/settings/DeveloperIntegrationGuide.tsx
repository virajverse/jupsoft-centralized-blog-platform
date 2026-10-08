'use client';

import React, { useState } from 'react';
import { Website } from '../../types';
import { 
  Code, 
  Copy, 
  Check, 
  Terminal, 
  Globe, 
  Zap, 
  Play, 
  RefreshCw, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Server,
  FileCode2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DeveloperIntegrationGuideProps {
  activeSite: Website;
  isSuperAdmin?: boolean;
  canViewApiKey?: boolean;
}

type StackTab = 'js' | 'csharp' | 'nextjs' | 'widget' | 'curl';

export const DeveloperIntegrationGuide: React.FC<DeveloperIntegrationGuideProps> = ({
  activeSite,
  isSuperAdmin = false,
  canViewApiKey = true,
}) => {
  const [activeStack, setActiveStack] = useState<StackTab>('js');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Console State
  const [testEndpoint, setTestEndpoint] = useState<'blogs' | 'detail' | 'categories' | 'health'>('blogs');
  const [testSlug, setTestSlug] = useState('sample-blog-slug');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testStatus, setTestStatus] = useState<number | null>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const websiteId = activeSite?.id || 'site-growth';
  const siteDomain = activeSite?.domain || 'yourdomain.com';
  const apiKey = (canViewApiKey && activeSite?.apiKey) ? activeSite.apiKey : 'jup_live_sec_your_api_key';
  const apiBaseUrl = 'https://blogary.jupsoft.com/v1';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const runLiveTest = async () => {
    setIsTesting(true);
    setTestError(null);
    setTestResult(null);
    setTestStatus(null);
    setTestLatency(null);

    let url = `${apiBaseUrl}/blogs?website=${encodeURIComponent(websiteId)}&limit=2`;
    if (testEndpoint === 'detail') {
      url = `${apiBaseUrl}/blogs/${encodeURIComponent(testSlug)}?website=${encodeURIComponent(websiteId)}`;
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

      const json = await res.json();
      setTestResult(json);
    } catch (err: any) {
      const latency = Math.round(performance.now() - startTime);
      setTestLatency(latency);
      setTestStatus(500);
      setTestError(err.message || 'Request failed. Check network or CORS settings.');
    } finally {
      setIsTesting(false);
    }
  };

  // Code Snippet Definitions with Dynamic Context
  const vanillaJsCode = `/**
 * Jupsoft Centralized CMS - Production Frontend Client
 * Target Website: ${activeSite?.name || 'Website'} (${websiteId})
 * 
 * Features:
 * - 3000ms AbortController fast-timeout (never hangs on slow mobile)
 * - In-memory & SessionStorage Stale-While-Revalidate caching (0ms instant render)
 * - Zero API Key Exposure: Origin domain whitelist authentication
 */
(function (global) {
  'use strict';

  var CMS = {
    apiUrl: 'https://blogary.jupsoft.com',
    websiteId: '${websiteId}', // Pre-configured Website ID
    defaultImage: 'images/default-blog.jpg'
  };

  // Safe fetch with AbortController timeout
  function fetchWithTimeout(url, timeoutMs) {
    timeoutMs = timeoutMs || 3000;
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = null;

    var fetchPromise = fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: { 'Accept': 'application/json' },
      signal: controller ? controller.signal : undefined
    });

    var timeoutPromise = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        if (controller) controller.abort();
        reject(new Error('CMS request timed out after ' + timeoutMs + 'ms'));
      }, timeoutMs);
    });

    return Promise.race([fetchPromise, timeoutPromise]).finally(function () {
      if (timer) clearTimeout(timer);
    });
  }

  // 1. Fetch Paginated Blog List (With Stale-While-Revalidate cache)
  CMS.fetchBlogs = function (options) {
    options = options || {};
    var page = options.page || 1;
    var limit = options.limit || 12;
    var category = options.category ? '&category=' + encodeURIComponent(options.category) : '';
    var search = options.search ? '&search=' + encodeURIComponent(options.search) : '';

    var cacheKey = 'cms_blogs_' + CMS.websiteId + '_p' + page + '_l' + limit + category + search;
    var cached = sessionStorage.getItem(cacheKey);

    // Instant Hydration: Render cached version immediately if available
    if (cached && typeof options.onCached === 'function') {
      try { options.onCached(JSON.parse(cached)); } catch(e) {}
    }

    var endpoint = CMS.apiUrl + '/v1/blogs?website=' + encodeURIComponent(CMS.websiteId) +
                   '&page=' + page + '&limit=' + limit + category + search;

    return fetchWithTimeout(endpoint, 3500)
      .then(function (res) {
        if (!res.ok) throw new Error('CMS HTTP ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        sessionStorage.setItem(cacheKey, JSON.stringify(payload));
        return payload;
      });
  };

  // 2. Fetch Single Blog Post by Slug
  CMS.fetchBlogBySlug = function (slug) {
    var endpoint = CMS.apiUrl + '/v1/blogs/' + encodeURIComponent(slug) +
                   '?website=' + encodeURIComponent(CMS.websiteId);

    return fetchWithTimeout(endpoint, 3500)
      .then(function (res) {
        if (!res.ok) throw new Error('Article not found');
        return res.json();
      });
  };

  // 3. Helper: Render a Blog Card to HTML
  CMS.renderCardHtml = function (blog) {
    var coverImg = blog.featuredImage || CMS.defaultImage;
    var pubDate = new Date(blog.publishedAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });

    return '<div class="blog-card">' +
      '<a href="/blog/' + encodeURIComponent(blog.slug) + '">' +
        '<img src="' + coverImg + '" alt="' + (blog.featuredImageAlt || blog.title) + '" loading="lazy" />' +
      '</a>' +
      '<div class="blog-meta">' +
        '<span>' + pubDate + '</span> • <span>' + (blog.readTimeMinutes || 3) + ' min read</span>' +
      '</div>' +
      '<h3><a href="/blog/' + encodeURIComponent(blog.slug) + '">' + blog.title + '</a></h3>' +
      '<p>' + (blog.excerpt || '') + '</p>' +
    '</div>';
  };

  global.BlogaryClient = CMS;
})(window);`;

  const csharpCode = `// ==============================================================================
// ASP.NET C# Integration Blueprint (PDP School / Enterprise .NET Pattern)
// Target Website: ${activeSite?.name || 'Website'} (${websiteId})
// ==============================================================================

// ── 1. Web.config Configuration ─────────────────────────────────────────────
/*
<appSettings>
  <add key="CmsHost" value="https://blogary.jupsoft.com" />
  <add key="CmsSite" value="${websiteId}" />
  <add key="CmsApiKey" value="${apiKey}" />
</appSettings>

<system.webServer>
  <rewrite>
    <rules>
      <rule name="RewriteBlogList" stopProcessing="true">
        <match url="^blog/?$" />
        <action type="Rewrite" url="blog.aspx" />
      </rule>
      <rule name="RewriteBlogDetail" stopProcessing="true">
        <match url="^blog/([^/]+)/?$" />
        <action type="Rewrite" url="blog-detail.aspx?slug={R:1}" />
      </rule>
    </rules>
  </rewrite>
</system.webServer>
*/

// ── 2. blog.aspx.cs (Blog List Code-Behind) ──────────────────────────────────
using System;
using System.Configuration;
using System.Net;
using System.Text;
using System.Web.UI;

public partial class blog : System.Web.UI.Page
{
    public string BlogsJson = "null";

    protected void Page_Load(object sender, EventArgs e)
    {
        if (!IsPostBack)
        {
            LoadBlogs();
        }
    }

    private void LoadBlogs()
    {
        try
        {
            // Enforce modern TLS security protocol (required for HTTPS AWS / VPS APIs)
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | SecurityProtocolType.Tls12;

            string host = ConfigurationManager.AppSettings["CmsHost"] ?? "https://blogary.jupsoft.com";
            string siteId = ConfigurationManager.AppSettings["CmsSite"] ?? "${websiteId}";
            string apiKey = ConfigurationManager.AppSettings["CmsApiKey"] ?? "";

            string url = host.TrimEnd('/') + "/v1/blogs?website=" + siteId + "&limit=50";

            using (WebClient client = new WebClient())
            {
                client.Encoding = Encoding.UTF8;
                client.Headers[HttpRequestHeader.UserAgent] = "BlogaryClient/1.0 (Windows NT 10.0)";
                
                if (!string.IsNullOrEmpty(apiKey))
                {
                    client.Headers[HttpRequestHeader.Authorization] = "Bearer " + apiKey;
                }

                BlogsJson = client.DownloadString(url);
            }
        }
        catch (Exception ex)
        {
            BlogsJson = "{\"success\":false,\"data\":[]}";
        }
    }
}

// ── 3. blog-detail.aspx.cs (Single Post Code-Behind) ─────────────────────────
using System;
using System.Configuration;
using System.Net;
using System.Text;
using System.Web;
using System.Web.UI;

public partial class blog_detail : System.Web.UI.Page
{
    public string BlogDetailJson = "null";
    public string CurrentSlug = "";

    protected void Page_Load(object sender, EventArgs e)
    {
        CurrentSlug = Request.QueryString["slug"] ?? "";
        if (string.IsNullOrEmpty(CurrentSlug.Trim()))
        {
            Response.Redirect("/blog", true);
            return;
        }

        if (!IsPostBack)
        {
            LoadBlogDetail(CurrentSlug.Trim());
        }
    }

    private void LoadBlogDetail(string slug)
    {
        try
        {
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | SecurityProtocolType.Tls12;
            string host = ConfigurationManager.AppSettings["CmsHost"] ?? "https://blogary.jupsoft.com";
            string siteId = ConfigurationManager.AppSettings["CmsSite"] ?? "${websiteId}";
            string apiKey = ConfigurationManager.AppSettings["CmsApiKey"] ?? "";

            string url = host.TrimEnd('/') + "/v1/blogs/" + HttpUtility.UrlEncode(slug) + "?website=" + siteId;

            using (WebClient client = new WebClient())
            {
                client.Encoding = Encoding.UTF8;
                if (!string.IsNullOrEmpty(apiKey))
                {
                    client.Headers[HttpRequestHeader.Authorization] = "Bearer " + apiKey;
                }
                BlogDetailJson = client.DownloadString(url);
            }
        }
        catch (Exception ex)
        {
            BlogDetailJson = "null";
        }
    }
}`;

  const nextjsCode = `// ==============================================================================
// Next.js 14/15 App Router (Incremental Static Regeneration Blueprint)
// Target Website: ${activeSite?.name || 'Website'} (${websiteId})
// ==============================================================================

// ── app/blog/[slug]/page.tsx ──────────────────────────────────────────────────
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface Props {
  params: { slug: string };
}

// 1. Fetch post with 60-second Incremental Static Regeneration (ISR)
async function getArticle(slug: string) {
  const res = await fetch(
    \`https://blogary.jupsoft.com/v1/blogs/\${slug}?website=${websiteId}\`,
    {
      headers: {
        'x-api-key': '${apiKey}',
      },
      next: { revalidate: 60 }, // Sub-50ms static edge cache with background revalidation
    }
  );

  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

// 2. Automated Dynamic SEO Meta Tags
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getArticle(params.slug);
  if (!post) return { title: 'Article Not Found' };

  return {
    title: post.seo?.metaTitle || post.title,
    description: post.seo?.metaDescription || post.excerpt,
    openGraph: {
      title: post.seo?.ogTitle || post.title,
      description: post.seo?.ogDescription || post.excerpt,
      images: [post.seo?.ogImage || post.featuredImage],
      url: post.seo?.canonicalUrl,
    },
  };
}

// 3. Blog Detail Component
export default async function BlogPostPage({ params }: Props) {
  const post = await getArticle(params.slug);
  if (!post) notFound();

  return (
    <article className="max-w-4xl mx-auto px-4 py-12 font-sans">
      {/* Schema.org Structured Data for Google Rich Snippets */}
      {post.schemaJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(post.schemaJsonLd) }}
        />
      )}

      <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
        {post.title}
      </h1>

      <div className="flex items-center gap-3 text-sm text-slate-500 mb-8">
        <span>By {post.authorName || 'Editorial Staff'}</span>
        <span>•</span>
        <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
        <span>•</span>
        <span>{post.readTimeMinutes} min read</span>
      </div>

      {post.featuredImage && (
        <img
          src={post.featuredImage}
          alt={post.featuredImageAlt || post.title}
          className="w-full h-96 object-cover rounded-2xl mb-8 shadow-sm"
        />
      )}

      {/* Render Sanitized Semantic HTML Content */}
      <div
        className="prose dark:prose-invert max-w-none leading-relaxed"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}`;

  const widgetCode = `<!-- ============================================================================== -->
<!-- Universal 1-Line Drop-In Blog Widget (WordPress, Webflow, Shopify, HTML)       -->
<!-- Target Website: ${activeSite?.name || 'Website'} (${websiteId})                -->
<!-- ============================================================================== -->

<!-- 1. Place this container div where the blog feed should render -->
<div id="blogary-widget"></div>

<!-- 2. Drop-in Blogary embed script -->
<script
  src="https://blogary.jupsoft.com/widget/blog.js"
  data-website="${websiteId}"
  data-limit="6"
  data-theme="auto"
  data-layout="grid"
  defer>
</script>`;

  const curlCode = `# 1. List published blogs for ${activeSite?.name || 'this website'}
curl -s -X GET "https://blogary.jupsoft.com/v1/blogs?website=${websiteId}&limit=10&page=1" \\
     -H "Accept: application/json"

# 2. Fetch full blog article detail by slug with Bearer Auth
curl -s -X GET "https://blogary.jupsoft.com/v1/blogs/sample-slug?website=${websiteId}" \\
     -H "Authorization: Bearer ${apiKey}" \\
     -H "Accept: application/json"

# 3. Fetch category taxonomy tree
curl -s -X GET "https://blogary.jupsoft.com/v1/categories?websiteId=${websiteId}" \\
     -H "Authorization: Bearer ${apiKey}"

# 4. Trigger on-demand cache revalidation webhook
curl -s -X POST "https://blogary.jupsoft.com/v1/revalidate" \\
     -H "Content-Type: application/json" \\
     -d '{"website": "${websiteId}", "slug": "sample-slug"}'`;

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER CARD ── */}
      <div className="bg-gradient-to-br from-indigo-900/10 via-slate-900/5 to-purple-900/10 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-purple-950/30 border border-indigo-200/60 dark:border-indigo-800/40 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold font-mono tracking-wider uppercase mb-2">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>Junior Developer Integration Guide</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Dynamic Blog Connection: {activeSite?.name}</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Connect your frontend website to Blogary CMS in under 10 minutes. The code examples below are automatically tailored with your active Website ID and domain configuration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => copyToClipboard(websiteId, 'top-site-id')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {copiedKey === 'top-site-id' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>ID: {websiteId}</span>
            </button>
            <button
              onClick={() => copyToClipboard(apiBaseUrl, 'top-api-url')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {copiedKey === 'top-api-url' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>API: {apiBaseUrl}</span>
            </button>
          </div>
        </div>

        {/* 3 Steps Overview Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-indigo-100/60 dark:border-indigo-900/40">
          <div className="flex items-start gap-2.5 bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Domain Whitelist</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Saved domain: <code className="font-mono text-indigo-600 dark:text-indigo-400">{siteDomain}</code>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Copy Code Snippet</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Choose ASP.NET C#, Vanilla JS, or Next.js</div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Test Connection</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Verify live response in interactive console</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 1: INTERACTIVE LIVE API CONSOLE ── */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-500" />
              <span>Step 1: Test Live API Connection for {activeSite?.name}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click below to execute a real live fetch against production API to ensure your website catalog is active.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {testStatus && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold ${
                testStatus === 200
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
              }`}>
                {testStatus === 200 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>HTTP {testStatus}</span>
                {testLatency && <span>• {testLatency}ms</span>}
              </span>
            )}
            <button
              onClick={runLiveTest}
              disabled={isTesting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>
        </div>

        {/* Console Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Endpoint</label>
            <select
              value={testEndpoint}
              onChange={(e: any) => setTestEndpoint(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none"
            >
              <option value="blogs">GET /v1/blogs (List Articles)</option>
              <option value="detail">GET /v1/blogs/:slug (Single Post)</option>
              <option value="categories">GET /v1/categories (Categories)</option>
              <option value="health">GET /v1/health (System Health)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Target Website ID</label>
            <input
              type="text"
              readOnly
              value={websiteId}
              className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-600 dark:text-slate-400 font-mono text-xs cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
              {testEndpoint === 'detail' ? 'Article Slug' : 'Request Filter'}
            </label>
            {testEndpoint === 'detail' ? (
              <input
                type="text"
                value={testSlug}
                onChange={(e) => setTestSlug(e.target.value)}
                placeholder="enter-blog-slug"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none"
              />
            ) : (
              <div className="text-slate-500 dark:text-slate-400 pt-2 font-mono text-[11px]">
                limit=2 &bull; page=1
              </div>
            )}
          </div>
        </div>

        {/* Live Response Box */}
        {(testResult || testError) && (
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#0f1117] text-slate-200 text-xs font-mono">
            <div className="px-3.5 py-2 bg-[#171b26] border-b border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Live Response Output</span>
              <button
                onClick={() => copyToClipboard(JSON.stringify(testResult || testError, null, 2), 'console-json')}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedKey === 'console-json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'console-json' ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="p-3.5 max-h-52 overflow-y-auto overflow-x-auto text-[11.5px] leading-relaxed text-emerald-300">
              {testResult ? JSON.stringify(testResult, null, 2) : testError}
            </pre>
          </div>
        )}
      </div>

      {/* ── STEP 2: CODE BLUEPRINTS TABS ── */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Code className="w-4 h-4 text-indigo-500" />
            <span>Step 2: Choose Your Tech Stack &amp; Copy Code</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Production-grade implementations with error boundaries, timeouts, and edge caching built in.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveStack('js')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeStack === 'js'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Vanilla JS (DigifyNext)</span>
          </button>
          <button
            onClick={() => setActiveStack('csharp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeStack === 'csharp'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>ASP.NET C# (PDP School)</span>
          </button>
          <button
            onClick={() => setActiveStack('nextjs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeStack === 'nextjs'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Next.js &amp; React ISR</span>
          </button>
          <button
            onClick={() => setActiveStack('widget')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeStack === 'widget'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>1-Line Embed Widget</span>
          </button>
          <button
            onClick={() => setActiveStack('curl')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeStack === 'curl'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>cURL &amp; Terminal</span>
          </button>
        </div>

        {/* Code Container */}
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#0f1117] text-slate-200 font-mono text-xs">
          <div className="px-4 py-2.5 bg-[#171b26] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-slate-400 text-xs ml-2 font-sans font-medium">
                {activeStack === 'js' && 'assets/js/cms-client.js (DigifyNext Pattern)'}
                {activeStack === 'csharp' && 'blog.aspx.cs & web.config (PDP School Pattern)'}
                {activeStack === 'nextjs' && 'app/blog/[slug]/page.tsx (Next.js 14/15)'}
                {activeStack === 'widget' && 'Universal Drop-in HTML Embed'}
                {activeStack === 'curl' && 'cURL Terminal Commands'}
              </span>
            </div>
            <button
              onClick={() => {
                let code = vanillaJsCode;
                if (activeStack === 'csharp') code = csharpCode;
                else if (activeStack === 'nextjs') code = nextjsCode;
                else if (activeStack === 'widget') code = widgetCode;
                else if (activeStack === 'curl') code = curlCode;
                copyToClipboard(code, 'tab-code');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-sans font-semibold transition-colors cursor-pointer border border-slate-700"
            >
              {copiedKey === 'tab-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'tab-code' ? 'Copied to Clipboard!' : 'Copy Snippet'}</span>
            </button>
          </div>
          <div className="p-4 max-h-[460px] overflow-y-auto overflow-x-auto text-[12px] leading-relaxed">
            <pre>
              {activeStack === 'js' && vanillaJsCode}
              {activeStack === 'csharp' && csharpCode}
              {activeStack === 'nextjs' && nextjsCode}
              {activeStack === 'widget' && widgetCode}
              {activeStack === 'curl' && curlCode}
            </pre>
          </div>
        </div>
      </div>

      {/* ── STEP 3: JSON SCHEMA DICTIONARY ── */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-slate-500" />
          <span>Step 3: Response Fields Reference (JSON Schema)</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Fields returned for every article by <code className="font-mono text-indigo-600 dark:text-indigo-400">/v1/blogs</code>:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                <th className="py-2 px-3 font-semibold">Field</th>
                <th className="py-2 px-3 font-semibold">Type</th>
                <th className="py-2 px-3 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11.5px]">
              <tr>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">slug</td>
                <td className="py-2 px-3 text-slate-500">string</td>
                <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">URL path for blog link (e.g. <code>/blog/sample-slug</code>)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">title</td>
                <td className="py-2 px-3 text-slate-500">string</td>
                <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Main headline title</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">excerpt</td>
                <td className="py-2 px-3 text-slate-500">string</td>
                <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Short summary for post cards and meta description</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">content</td>
                <td className="py-2 px-3 text-slate-500">HTML string</td>
                <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Full sanitized blog article body (detail endpoint)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">featuredImage</td>
                <td className="py-2 px-3 text-slate-500">URL string</td>
                <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">CDN cover image URL. Always supply fallback if null</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">publishedAt</td>
                <td className="py-2 px-3 text-slate-500">ISO string</td>
                <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Publication date for sorting &amp; date badge</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">readTimeMinutes</td>
                <td className="py-2 px-3 text-slate-500">number</td>
                <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Estimated reading time in minutes</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">authorName</td>
                <td className="py-2 px-3 text-slate-500">string</td>
                <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Author display name</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">seo</td>
                <td className="py-2 px-3 text-slate-500">object</td>
                <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300"><code>metaTitle</code>, <code>metaDescription</code>, <code>canonicalUrl</code>, <code>ogImage</code></td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">schemaJsonLd</td>
                <td className="py-2 px-3 text-slate-500">object</td>
                <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Ready-to-inject Google Schema.org structured data</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── JUNIOR DEVELOPER FAQ ACCORDION ── */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500" />
          <span>Junior Developer FAQ &amp; Troubleshooting</span>
        </h3>

        <div className="space-y-2 text-xs">
          {/* FAQ 1 */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenFaq(openFaq === 1 ? null : 1)}
              className="w-full p-3 text-left font-semibold text-slate-800 dark:text-slate-200 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between cursor-pointer"
            >
              <span>1. Why does my frontend get a 401 or CORS error?</span>
              {openFaq === 1 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {openFaq === 1 && (
              <div className="p-3 text-slate-600 dark:text-slate-400 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 leading-relaxed">
                Blogary uses Origin Domain Scope. Ensure your website's exact production domain (e.g. <code>{siteDomain}</code>) is entered in the <strong>Production Domain / Hostname</strong> field above. Note: <code>localhost</code> and <code>127.0.0.1</code> are automatically whitelisted for local development!
              </div>
            )}
          </div>

          {/* FAQ 2 */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenFaq(openFaq === 2 ? null : 2)}
              className="w-full p-3 text-left font-semibold text-slate-800 dark:text-slate-200 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between cursor-pointer"
            >
              <span>2. Do I need to expose my secret API key in frontend JavaScript?</span>
              {openFaq === 2 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {openFaq === 2 && (
              <div className="p-3 text-slate-600 dark:text-slate-400 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 leading-relaxed">
                <strong>No! Never put secret API keys in public JavaScript.</strong> Public reads only need <code>?website={websiteId}</code>. The backend verifies the browser's <code>Origin</code> and <code>Referer</code> headers automatically. Secret keys are only needed for server-side code (ASP.NET C# or Next.js server components).
              </div>
            )}
          </div>

          {/* FAQ 3 */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenFaq(openFaq === 3 ? null : 3)}
              className="w-full p-3 text-left font-semibold text-slate-800 dark:text-slate-200 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between cursor-pointer"
            >
              <span>3. How do I see edits or new blogs immediately without waiting for edge cache?</span>
              {openFaq === 3 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {openFaq === 3 && (
              <div className="p-3 text-slate-600 dark:text-slate-400 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 leading-relaxed">
                Append <code className="font-mono text-indigo-600 dark:text-indigo-400">&amp;fresh=1</code> to your query URL. This instructs the Redis cache layer to bypass edge memory and query the latest database state in real-time.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
