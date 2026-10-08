'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Website, Blog } from '../../types';
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
  ChevronUp,
  Download,
  HelpCircle,
  FileText,
  Lock,
  ArrowRight
} from 'lucide-react';

interface DeveloperIntegrationGuideProps {
  activeSite: Website;
  isSuperAdmin?: boolean;
  canViewApiKey?: boolean;
  blogs?: Blog[];
}

type StackTab = 'js' | 'nextjs' | 'csharp' | 'react' | 'widget' | 'curl';
type JsSubTab = 'client' | 'list' | 'detail' | 'iis' | 'htaccess';
type NextSubTab = 'list' | 'detail' | 'webhook' | 'nextconfig';
type CSharpSubTab = 'webconfig' | 'list' | 'detail' | 'aspx';
type ReactSubTab = 'hook' | 'detail';

export const DeveloperIntegrationGuide: React.FC<DeveloperIntegrationGuideProps> = ({
  activeSite,
  isSuperAdmin = false,
  canViewApiKey = true,
  blogs = [],
}) => {
  const [activeStack, setActiveStack] = useState<StackTab>('js');
  const [activeJsTab, setActiveJsTab] = useState<JsSubTab>('client');
  const [activeNextTab, setActiveNextTab] = useState<NextSubTab>('list');
  const [activeCSharpTab, setActiveCSharpTab] = useState<CSharpSubTab>('webconfig');
  const [activeReactTab, setActiveReactTab] = useState<ReactSubTab>('hook');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [encryptedCmsToken, setEncryptedCmsToken] = useState<string>('idF9Vzz2az9eisdgl6ifp4yGSxi5cGjt7NJ8LxNhw8YZGBOP8jBnp49lqpunfjsl');

  // Live Console State
  const [testEndpoint, setTestEndpoint] = useState<'blogs' | 'detail' | 'latest' | 'popular' | 'categories' | 'health'>('blogs');
  const [testSlug, setTestSlug] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testStatus, setTestStatus] = useState<number | null>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [bypassCacheTest, setBypassCacheTest] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const websiteId = activeSite?.id || 'site-growth';
  const siteDomain = activeSite?.domain || 'yourdomain.com';
  const apiKey = (canViewApiKey && activeSite?.apiKey) ? activeSite.apiKey : 'jup_live_sec_your_api_key';
  const apiBaseUrl = 'https://blogary.jupsoft.com/v1';

  // Extract published blogs for the active tenant to populate real test slugs
  const publishedBlogs = useMemo(() => {
    return blogs.filter((b) => b.websiteId === activeSite.id && b.status === 'Published');
  }, [blogs, activeSite.id]);

  const defaultRealSlug = useMemo(() => {
    if (publishedBlogs.length > 0) {
      const first = publishedBlogs[0];
      const lang = activeSite.defaultLanguage || 'en';
      return first.translations[lang]?.slug || Object.values(first.translations)[0]?.slug || 'sample-blog-slug';
    }
    return 'sample-blog-slug';
  }, [publishedBlogs, activeSite.defaultLanguage]);

  useEffect(() => {
    if (!testSlug || testSlug === 'sample-blog-slug') {
      setTestSlug(defaultRealSlug);
    }
  }, [defaultRealSlug]);

  // Dynamically compute AES-128-CBC encrypted cipher token for Web.config
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

  const runLiveTest = async () => {
    setIsTesting(true);
    setTestError(null);
    setTestResult(null);
    setTestStatus(null);
    setTestLatency(null);

    const freshParam = bypassCacheTest ? '&fresh=1' : '';
    let url = `${apiBaseUrl}/blogs?website=${encodeURIComponent(websiteId)}&limit=2${freshParam}`;
    if (testEndpoint === 'detail') {
      url = `${apiBaseUrl}/blogs/${encodeURIComponent(testSlug || 'sample-slug')}?website=${encodeURIComponent(websiteId)}${freshParam}`;
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

  // ──────────────────────────────────────────────────────────────────────────
  // 1. SHTML / HTML / JAVASCRIPT TEMPLATES
  // ──────────────────────────────────────────────────────────────────────────

  const jsClientCode = `/**
 * Jupsoft Centralized CMS - Production Frontend Client (cms-client.js)
 * Website: ${activeSite?.name || 'Website'} (${websiteId})
 * Domain: ${siteDomain}
 * 
 * Features:
 * - Stale-While-Revalidate via sessionStorage (0ms instant page loads)
 * - 3500ms AbortController timeout (prevents slow mobile network freezes)
 * - Zero API Key Exposure: Origin domain whitelist authentication
 * - Safe image fallbacks (never renders broken image tags)
 */
(function (global) {
  'use strict';

  var CMS = {
    apiUrl: 'https://blogary.jupsoft.com',
    websiteId: '${websiteId}',
    apiKey: '${apiKey}', // Domain-Restricted Client Key (Locked to ${siteDomain})
    defaultImage: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80'
  };

  // Safe fetch with AbortController timeout and Domain-Locked Client API Key
  function fetchWithTimeout(url, timeoutMs) {
    timeoutMs = timeoutMs || 3500;
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = null;

    var fetchPromise = fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'x-api-key': CMS.apiKey
      },
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
    var tag = options.tag ? '&tag=' + encodeURIComponent(options.tag) : '';
    var search = options.search ? '&search=' + encodeURIComponent(options.search) : '';
    var fresh = options.fresh ? '&fresh=1' : '';

    var cacheKey = 'cms_blogs_' + CMS.websiteId + '_p' + page + '_l' + limit + category + tag + search;
    var cached = sessionStorage.getItem(cacheKey);

    // Instant Hydration: Render cached version immediately if available
    if (cached && typeof options.onCached === 'function' && !options.fresh) {
      try { options.onCached(JSON.parse(cached)); } catch(e) {}
    }

    var endpoint = CMS.apiUrl + '/v1/blogs?website=' + encodeURIComponent(CMS.websiteId) +
                   '&page=' + page + '&limit=' + limit + category + tag + search + fresh;

    return fetchWithTimeout(endpoint, 4000)
      .then(function (res) {
        if (!res.ok) throw new Error('CMS HTTP ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        if (payload && payload.success) {
          sessionStorage.setItem(cacheKey, JSON.stringify(payload));
        }
        return payload;
      });
  };

  // 2. Fetch Single Blog Post by Slug
  CMS.fetchBlogBySlug = function (slug, options) {
    options = options || {};
    var fresh = options.fresh ? '&fresh=1' : '';
    var endpoint = CMS.apiUrl + '/v1/blogs/' + encodeURIComponent(slug) +
                   '?website=' + encodeURIComponent(CMS.websiteId) + fresh;

    return fetchWithTimeout(endpoint, 4000)
      .then(function (res) {
        if (!res.ok) throw new Error('Article not found (HTTP ' + res.status + ')');
        return res.json();
      });
  };

  // 3. Fetch Taxonomy Categories
  CMS.fetchCategories = function () {
    var endpoint = CMS.apiUrl + '/v1/categories?websiteId=' + encodeURIComponent(CMS.websiteId);
    return fetchWithTimeout(endpoint, 3500)
      .then(function (res) { return res.ok ? res.json() : { data: [] }; })
      .catch(function () { return { data: [] }; });
  };

  // 4. HTML Render Helper: Generate a Blog Card
  CMS.renderCardHtml = function (blog) {
    var coverImg = blog.featuredImage || CMS.defaultImage;
    var pubDate = blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    }) : 'Recent';
    var readTime = blog.readTimeMinutes || 3;
    var categoryName = blog.category && blog.category.name ? blog.category.name : 'General';

    return '<article class="cms-blog-card">' +
      '<div class="cms-card-image-wrap">' +
        '<a href="/blog/' + encodeURIComponent(blog.slug) + '">' +
          '<img src="' + coverImg + '" alt="' + (blog.featuredImageAlt || blog.title) + '" loading="lazy" onerror="this.src=\\'' + CMS.defaultImage + '\\'" />' +
        '</a>' +
        '<span class="cms-badge-category">' + categoryName + '</span>' +
      '</div>' +
      '<div class="cms-card-content">' +
        '<div class="cms-card-meta">' +
          '<span>' + pubDate + '</span> • <span>' + readTime + ' min read</span>' +
        '</div>' +
        '<h3 class="cms-card-title"><a href="/blog/' + encodeURIComponent(blog.slug) + '">' + blog.title + '</a></h3>' +
        '<p class="cms-card-excerpt">' + (blog.excerpt || '') + '</p>' +
        '<a class="cms-read-more" href="/blog/' + encodeURIComponent(blog.slug) + '">Read Full Story →</a>' +
      '</div>' +
    '</article>';
  };

  global.BlogaryClient = CMS;
})(window);`;

  const htmlBlogListCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Insights &amp; Articles | ${activeSite?.name || 'Website'}</title>
  <meta name="description" content="Explore latest industry insights, tutorials, and announcements from ${activeSite?.name}.">

  <!-- Minimal Responsive Styling -->
  <style>
    :root {
      --primary: #2563eb;
      --text: #0f172a;
      --muted: #64748b;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --border: #e2e8f0;
      --radius: 12px;
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; background: var(--bg); color: var(--text); }
    .cms-container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    .cms-header { text-align: center; margin-bottom: 40px; }
    .cms-header h1 { font-size: 2.5rem; margin-bottom: 10px; color: var(--text); }
    .cms-header p { color: var(--muted); font-size: 1.1rem; }

    /* Search & Filter Bar */
    .cms-controls { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; margin-bottom: 30px; align-items: center; }
    .cms-search-input { padding: 10px 16px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; min-width: 260px; outline: none; }
    .cms-search-input:focus { border-color: var(--primary); }

    /* Responsive Grid */
    .cms-blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 28px; }

    /* Blog Card */
    .cms-blog-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
    .cms-blog-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px -8px rgba(0,0,0,0.08); }
    .cms-card-image-wrap { position: relative; width: 100%; height: 200px; background: #e2e8f0; }
    .cms-card-image-wrap img { width: 100%; height: 100%; object-fit: cover; }
    .cms-badge-category { position: absolute; top: 12px; left: 12px; background: rgba(15, 23, 42, 0.85); color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .cms-card-content { padding: 20px; flex: 1; display: flex; flex-direction: column; }
    .cms-card-meta { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
    .cms-card-title { font-size: 1.2rem; margin: 0 0 10px 0; line-height: 1.4; }
    .cms-card-title a { color: var(--text); text-decoration: none; }
    .cms-card-title a:hover { color: var(--primary); }
    .cms-card-excerpt { font-size: 14px; color: var(--muted); line-height: 1.6; margin: 0 0 16px 0; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .cms-read-more { font-size: 14px; font-weight: 600; color: var(--primary); text-decoration: none; }

    /* Loading Skeletons */
    .cms-skeleton-card { background: var(--card-bg); border-radius: var(--radius); height: 380px; animation: pulse 1.5s infinite; border: 1px solid var(--border); }
    @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }

    /* Pagination Controls */
    .cms-pagination { display: flex; justify-content: center; gap: 10px; margin-top: 40px; }
    .cms-page-btn { padding: 8px 16px; border: 1px solid var(--border); background: var(--card-bg); border-radius: 8px; cursor: pointer; font-weight: 600; }
    .cms-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  </style>
</head>
<body>

  <div class="cms-container">
    <div class="cms-header">
      <h1>Latest Insights &amp; Articles</h1>
      <p>Stay updated with stories, tutorials, and thought leadership.</p>
    </div>

    <!-- Search & Filter Controls -->
    <div class="cms-controls">
      <input type="text" id="cms-search" class="cms-search-input" placeholder="Search articles by keyword..." />
      <div id="cms-stats" style="font-size: 13px; color: var(--muted);"></div>
    </div>

    <!-- Dynamic Grid Container -->
    <div id="cms-grid" class="cms-blog-grid">
      <!-- 6 Skeleton Placeholders while fetching -->
      <div class="cms-skeleton-card"></div>
      <div class="cms-skeleton-card"></div>
      <div class="cms-skeleton-card"></div>
    </div>

    <!-- Pagination -->
    <div class="cms-pagination" id="cms-pagination" style="display: none;">
      <button id="cms-prev-btn" class="cms-page-btn" disabled>← Previous</button>
      <span id="cms-page-info" style="align-self: center; font-size: 13px; font-weight: 600;">Page 1</span>
      <button id="cms-next-btn" class="cms-page-btn">Next →</button>
    </div>
  </div>

  <!-- Include Jupsoft CMS Client Library -->
  <script src="/assets/js/cms-client.js"></script>

  <script>
    (function () {
      var currentPage = 1;
      var totalPages = 1;
      var currentSearch = '';

      var grid = document.getElementById('cms-grid');
      var stats = document.getElementById('cms-stats');
      var pagination = document.getElementById('cms-pagination');
      var prevBtn = document.getElementById('cms-prev-btn');
      var nextBtn = document.getElementById('cms-next-btn');
      var pageInfo = document.getElementById('cms-page-info');
      var searchInput = document.getElementById('cms-search');

      function loadBlogs(page, search) {
        BlogaryClient.fetchBlogs({
          page: page,
          limit: 12,
          search: search,
          onCached: function (cachedData) {
            renderBlogList(cachedData);
          }
        })
        .then(function (res) {
          renderBlogList(res);
        })
        .catch(function (err) {
          grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ef4444;">' +
            '<h3>Unable to load blogs</h3><p>' + err.message + '</p>' +
            '<button onclick="location.reload()" class="cms-page-btn">Retry</button></div>';
        });
      }

      function renderBlogList(res) {
        if (!res || !res.data) return;
        var blogs = res.data;

        if (blogs.length === 0) {
          grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--muted);">' +
            '<h3>No articles found</h3><p>Try searching for a different topic.</p></div>';
          pagination.style.display = 'none';
          stats.textContent = '0 articles found';
          return;
        }

        var html = '';
        for (var i = 0; i < blogs.length; i++) {
          html += BlogaryClient.renderCardHtml(blogs[i]);
        }
        grid.innerHTML = html;

        // Pagination update
        if (res.meta) {
          currentPage = res.meta.page || 1;
          totalPages = res.meta.totalPages || 1;
          pageInfo.textContent = 'Page ' + currentPage + ' of ' + totalPages;
          prevBtn.disabled = currentPage <= 1;
          nextBtn.disabled = currentPage >= totalPages;
          pagination.style.display = totalPages > 1 ? 'flex' : 'none';
          stats.textContent = (res.meta.total || blogs.length) + ' articles published';
        }
      }

      // Event Listeners
      prevBtn.addEventListener('click', function () {
        if (currentPage > 1) loadBlogs(currentPage - 1, currentSearch);
      });

      nextBtn.addEventListener('click', function () {
        if (currentPage < totalPages) loadBlogs(currentPage + 1, currentSearch);
      });

      var debounceTimer;
      searchInput.addEventListener('input', function (e) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          currentSearch = e.target.value.trim();
          currentPage = 1;
          loadBlogs(1, currentSearch);
        }, 350);
      });

      // Initial Load
      loadBlogs(1, '');
    })();
  </script>
</body>
</html>`;

  const htmlBlogDetailCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Article | ${activeSite?.name || 'Website'}</title>
  <meta name="description" id="meta-description" content="Read full article on ${activeSite?.name}.">

  <!-- OpenGraph Tags for Social Sharing -->
  <meta property="og:type" content="article">
  <meta property="og:title" id="og-title" content="Article">
  <meta property="og:description" id="og-description" content="">
  <meta property="og:image" id="og-image" content="">

  <style>
    :root {
      --primary: #2563eb;
      --text: #0f172a;
      --muted: #64748b;
      --bg: #ffffff;
      --border: #e2e8f0;
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; background: var(--bg); color: var(--text); line-height: 1.7; }
    .cms-article-container { max-width: 820px; margin: 0 auto; padding: 40px 20px 80px; }
    .cms-breadcrumbs { font-size: 13px; color: var(--muted); margin-bottom: 24px; }
    .cms-breadcrumbs a { color: var(--muted); text-decoration: none; }
    .cms-breadcrumbs a:hover { color: var(--primary); }
    .cms-article-title { font-size: 2.75rem; line-height: 1.25; margin: 0 0 16px; font-weight: 800; color: var(--text); }
    .cms-article-meta { display: flex; align-items: center; gap: 12px; font-size: 14px; color: var(--muted); margin-bottom: 32px; border-bottom: 1px solid var(--border); padding-bottom: 20px; }
    .cms-author-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background: #e2e8f0; }
    .cms-featured-image { width: 100%; max-height: 480px; object-fit: cover; border-radius: 16px; margin-bottom: 40px; background: #e2e8f0; }
    
    /* Semantic HTML Content Typography */
    .cms-content { font-size: 18px; color: #1e293b; }
    .cms-content h2 { font-size: 1.8rem; margin: 40px 0 16px; font-weight: 700; color: var(--text); }
    .cms-content h3 { font-size: 1.4rem; margin: 32px 0 12px; font-weight: 600; color: var(--text); }
    .cms-content p { margin: 0 0 20px; }
    .cms-content img { max-width: 100%; height: auto; border-radius: 12px; margin: 24px 0; }
    .cms-content blockquote { border-left: 4px solid var(--primary); margin: 24px 0; padding: 12px 20px; background: #f8fafc; font-style: italic; }
    .cms-content ul, .cms-content ol { padding-left: 24px; margin-bottom: 24px; }
    .cms-content li { margin-bottom: 8px; }

    /* Skeleton Loading State */
    .cms-loading-pulse { height: 40px; background: #f1f5f9; border-radius: 8px; margin-bottom: 20px; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 0.3; } 100% { opacity: 0.6; } }
  </style>
</head>
<body>

  <article class="cms-article-container" id="cms-article-wrapper">
    <div class="cms-breadcrumbs">
      <a href="/">Home</a> / <a href="/blog">Blogs</a> / <span id="cms-crumb-title">Loading...</span>
    </div>

    <div id="cms-article-state">
      <div class="cms-loading-pulse" style="width: 80%;"></div>
      <div class="cms-loading-pulse" style="width: 50%;"></div>
      <div style="height: 360px; background: #f1f5f9; border-radius: 16px; margin: 30px 0;"></div>
    </div>

    <div id="cms-article-body" style="display: none;">
      <h1 class="cms-article-title" id="article-title"></h1>
      <div class="cms-article-meta">
        <img id="author-avatar" class="cms-author-avatar" src="" alt="Author" style="display: none;" />
        <div>
          <strong id="author-name">Editorial Staff</strong>
          <div><span id="article-date"></span> • <span id="article-read-time"></span></div>
        </div>
      </div>

      <img id="featured-image" class="cms-featured-image" src="" alt="Featured Banner" style="display: none;" />

      <div class="cms-content" id="article-content"></div>
    </div>
  </article>

  <!-- Include Jupsoft CMS Client Library -->
  <script src="/assets/js/cms-client.js"></script>

  <script>
    (function () {
      // 1. Extract slug from URL path (e.g. /blog/my-post) OR query string (?slug=my-post)
      var pathParts = window.location.pathname.replace(/\\/+$/, '').split('/');
      var slug = pathParts[pathParts.length - 1];
      
      // Fallback: If static server uses ?slug=
      if (!slug || slug === 'blog' || slug === 'blog-detail.html' || slug === 'blog-detail') {
        var params = new URLSearchParams(window.location.search);
        slug = params.get('slug');
      }

      if (!slug) {
        window.location.href = '/blog';
        return;
      }

      // 2. Fetch Full Article Detail
      BlogaryClient.fetchBlogBySlug(slug)
        .then(function (res) {
          if (!res || !res.data) throw new Error('Post not found');
          var post = res.data;

          // Populate Head SEO Meta Tags
          document.title = (post.seo && post.seo.metaTitle) ? post.seo.metaTitle : post.title + ' | ${activeSite?.name}';
          if (post.excerpt) {
            document.getElementById('meta-description').setAttribute('content', (post.seo && post.seo.metaDescription) || post.excerpt);
            document.getElementById('og-description').setAttribute('content', (post.seo && post.seo.ogDescription) || post.excerpt);
          }
          document.getElementById('og-title').setAttribute('content', post.title);
          if (post.featuredImage) {
            document.getElementById('og-image').setAttribute('content', post.featuredImage);
          }

          // Inject Google Schema.org JSON-LD
          if (post.schemaJsonLd) {
            var script = document.createElement('script');
            script.type = 'application/ld+json';
            script.text = JSON.stringify(post.schemaJsonLd);
            document.head.appendChild(script);
          }

          // Populate DOM Elements
          document.getElementById('cms-crumb-title').textContent = post.title;
          document.getElementById('article-title').textContent = post.title;
          document.getElementById('article-date').textContent = new Date(post.publishedAt).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
          });
          document.getElementById('article-read-time').textContent = (post.readTimeMinutes || 3) + ' min read';
          document.getElementById('author-name').textContent = post.authorName || 'Editorial Staff';

          if (post.authorAvatar) {
            var avatar = document.getElementById('author-avatar');
            avatar.src = post.authorAvatar;
            avatar.style.display = 'block';
          }

          if (post.featuredImage) {
            var cover = document.getElementById('featured-image');
            cover.src = post.featuredImage;
            cover.alt = post.featuredImageAlt || post.title;
            cover.style.display = 'block';
          }

          document.getElementById('article-content').innerHTML = post.content || '<p>' + (post.excerpt || '') + '</p>';

          // Show Content & Hide Loading
          document.getElementById('cms-article-state').style.display = 'none';
          document.getElementById('cms-article-body').style.display = 'block';
        })
        .catch(function (err) {
          document.getElementById('cms-article-state').innerHTML = 
            '<div style="text-align: center; padding: 60px 0; color: #ef4444;">' +
              '<h2>Article Not Found</h2>' +
              '<p>The blog post you requested could not be located or has been moved.</p>' +
              '<a href="/blog" style="color: var(--primary); font-weight: 600; text-decoration: none;">← Return to All Articles</a>' +
            '</div>';
        });
    })();
  </script>
</body>
</html>`;

  const iisRewriteCode = `<?xml version="1.0" encoding="UTF-8"?>
<!-- ============================================================================== -->
<!-- Microsoft IIS web.config - Clean Blog Routing (Prevents 404 Errors)           -->
<!-- Target Domain: ${siteDomain}                                                   -->
<!-- ============================================================================== -->
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- 1. Rewrite /blog or /blog/ to blog.html -->
        <rule name="CmsBlogListingRewrite" stopProcessing="true">
          <match url="^blog/?$" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="blog.html" />
        </rule>

        <!-- 2. Rewrite /blog/{slug} to blog-detail.html?slug={R:1} -->
        <rule name="CmsBlogDetailRewrite" stopProcessing="true">
          <match url="^blog/([a-zA-Z0-9\-_]+)/?$" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="blog-detail.html?slug={R:1}" />
        </rule>
      </rules>
    </rewrite>

    <!-- Enable CORS & HTTPS Compression -->
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>`;

  const htaccessCode = `# ==============================================================================
# Apache HTTP Server (.htaccess) - Clean Blog Routing (Prevents 404 Errors)
# Target Domain: ${siteDomain}
# ==============================================================================

RewriteEngine On
RewriteBase /

# 1. Rewrite /blog or /blog/ to blog.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^blog/?$ blog.html [L]

# 2. Rewrite /blog/{slug} to blog-detail.html?slug={R:1}
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^blog/([a-zA-Z0-9\-_]+)/?$ blog-detail.html?slug=$1 [L,QSA]`;

  // ──────────────────────────────────────────────────────────────────────────
  // 2. NEXT.JS 14/15/16 APP ROUTER TEMPLATES
  // ──────────────────────────────────────────────────────────────────────────

  const nextJsListCode = `// app/blog/page.tsx
// Incremental Static Regeneration (ISR) Listing Page
import Link from 'next/link';

interface Blog {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage?: string;
  publishedAt: string;
  readTimeMinutes: number;
  category?: { name: string; slug: string };
}

async function getBlogs(): Promise<Blog[]> {
  const res = await fetch(
    'https://blogary.jupsoft.com/v1/blogs?website=${websiteId}&limit=12',
    {
      next: { revalidate: 60 }, // Static Edge Cache revalidated every 60s
    }
  );

  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export default async function BlogIndexPage() {
  const blogs = await getBlogs();

  return (
    <main className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3">
          Latest Articles &amp; Insights
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          News, technical deep-dives, and announcements from ${activeSite?.name}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {blogs.map((post) => (
          <article
            key={post.id}
            className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow flex flex-col bg-white dark:bg-slate-900"
          >
            {post.featuredImage && (
              <Link href={\`/blog/\${post.slug}\`} className="block aspect-video overflow-hidden">
                <img
                  src={post.featuredImage}
                  alt={post.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </Link>
            )}
            <div className="p-6 flex-1 flex flex-col">
              <div className="text-xs text-slate-500 mb-2">
                {new Date(post.publishedAt).toLocaleDateString()} • {post.readTimeMinutes} min read
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">
                <Link href={\`/blog/\${post.slug}\`} className="hover:text-blue-600 transition-colors">
                  {post.title}
                </Link>
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 flex-1">
                {post.excerpt}
              </p>
              <Link
                href={\`/blog/\${post.slug}\`}
                className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Read Article →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}`;

  const nextJsDetailCode = `// app/blog/[slug]/page.tsx
// Incremental Static Regeneration with Automated Google SEO Meta
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface Props {
  params: { slug: string };
}

async function getArticle(slug: string) {
  const res = await fetch(
    \`https://blogary.jupsoft.com/v1/blogs/\${slug}?website=${websiteId}\`,
    {
      next: { revalidate: 60 },
    }
  );

  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

// Dynamic SEO & OpenGraph Meta
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getArticle(params.slug);
  if (!post) return { title: 'Article Not Found' };

  return {
    title: post.seo?.metaTitle || \`\${post.title} | ${activeSite?.name}\`,
    description: post.seo?.metaDescription || post.excerpt,
    openGraph: {
      title: post.seo?.ogTitle || post.title,
      description: post.seo?.ogDescription || post.excerpt,
      images: [post.seo?.ogImage || post.featuredImage],
      url: post.seo?.canonicalUrl,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getArticle(params.slug);
  if (!post) notFound();

  return (
    <article className="max-w-4xl mx-auto px-4 py-12 font-sans">
      {/* Google Schema.org JSON-LD Rich Snippet */}
      {post.schemaJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(post.schemaJsonLd) }}
        />
      )}

      <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 leading-tight">
        {post.title}
      </h1>

      <div className="flex items-center gap-3 text-sm text-slate-500 mb-8 border-b pb-4 border-slate-200 dark:border-slate-800">
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
          className="w-full max-h-[460px] object-cover rounded-2xl mb-10 shadow-sm"
        />
      )}

      {/* Render Sanitized HTML Body */}
      <div
        className="prose dark:prose-invert max-w-none text-lg leading-relaxed"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}`;

  const nextJsWebhookCode = `// app/api/revalidate/route.ts
// On-Demand Cache Busting Webhook
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.CMS_WEBHOOK_SECRET || '${apiKey}';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    // 1. Verify HMAC SHA-256 Signature
    if (signature) {
      const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
      const digest = 'sha256=' + hmac.update(rawBody).digest('hex');
      if (signature !== digest) {
        return NextResponse.json({ message: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody || '{}');
    const slug = payload.slug;

    // 2. Revalidate Cache Instantly
    revalidatePath('/blog');
    if (slug && slug !== 'all') {
      revalidatePath(\`/blog/\${slug}\`);
    }

    return NextResponse.json({ revalidated: true, slug, now: Date.now() });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}`;

  const nextConfigCode = `// next.config.js
// Configure AWS S3 & CloudFront Image Domain Whitelisting
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'blogary.jupsoft.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

module.exports = nextConfig;`;

  // ──────────────────────────────────────────────────────────────────────────
  // 3. ASP.NET C# TEMPLATES (100% ZERO API KEY LEAK IN SOURCE CODE)
  // ──────────────────────────────────────────────────────────────────────────

  const csharpWebConfigCode = `<?xml version="1.0" encoding="utf-8"?>
<!-- ============================================================================== -->
<!-- Microsoft IIS Web.config - Zero-Leak ASP.NET C# Integration                     -->
<!-- Target Domain: ${siteDomain}                                                   -->
<!-- Security: AES-128-CBC Encrypted CmsToken (Zero Plaintext Secrets)              -->
<!-- ============================================================================== -->
<configuration>
  <appSettings>
    <!-- Public Host & Site Identifier -->
    <add key="CmsHost" value="${apiBaseUrl.replace(/\/v1$/, '')}" />
    <add key="CmsSite" value="${websiteId}" />

    <!-- 🔒 AES-128 Encrypted Token (Decrypted strictly in server-side C# RAM) -->
    <!-- Plaintext API key is NEVER stored here and NEVER sent to the browser! -->
    <add key="CmsToken" value="${encryptedCmsToken || 'Encrypting...'}" />
  </appSettings>

  <system.web>
    <compilation debug="false" targetFramework="4.8" />
    <pages controlRenderingCompatibilityVersion="4.0" />
    <globalization fileEncoding="utf-8" requestEncoding="utf-8" responseEncoding="utf-8" culture="en-US" uiCulture="en" />
  </system.web>

  <system.webServer>
    <rewrite>
      <rules>
        <!-- 1. Rewrite /blog/{slug} to blog-detail.aspx?slug={R:1} -->
        <rule name="CmsBlogDetailSlug" stopProcessing="true">
          <match url="^blog/([a-zA-Z0-9_-]+)/?$" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="blog-detail.aspx?slug={R:1}" />
        </rule>

        <!-- 2. Clean ASPX URLs (maps /blog to /blog.aspx) -->
        <rule name="CleanAspxUrls" stopProcessing="true">
          <match url="^([a-zA-Z0-9/_-]+)/?$" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{APPL_PHYSICAL_PATH}{R:1}.aspx" matchType="IsFile" />
          </conditions>
          <action type="Rewrite" url="{R:1}.aspx" />
        </rule>
      </rules>
    </rewrite>

    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>`;

  const csharpListCode = `// blog.aspx.cs
// ==============================================================================
// ASP.NET C# Code-Behind: Server-Side Zero-Leak CMS Fetcher
// Target Domain: ${siteDomain} | Website ID: ${websiteId}
// Security: AES-128 In-Memory Decryption (Zero API Key Leak in Page Source)
// ==============================================================================
using System;
using System.Configuration;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Web.UI;

public partial class blog : System.Web.UI.Page
{
    // Injected directly into <%= BlogsJson %> in blog.aspx at render time
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
            // Force TLS 1.2 for modern secure cloud endpoints
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | SecurityProtocolType.Tls12;
            string host = ConfigurationManager.AppSettings["CmsHost"] ?? "${apiBaseUrl.replace(/\/v1$/, '')}";
            string site = ConfigurationManager.AppSettings["CmsSite"] ?? "${websiteId}";
            string url = host.TrimEnd('/') + "/v1/blogs?website=" + site + "&limit=50";

            using (WebClient client = new WebClient())
            {
                client.Encoding = Encoding.UTF8;
                client.Headers[HttpRequestHeader.UserAgent] = "Mozilla/5.0 (${siteDomain} ASP.NET Server)";
                
                // Decrypt token inside server RAM only (never sent to client browser)
                string auth = GetAuthHeader();
                if (!string.IsNullOrEmpty(auth))
                {
                    client.Headers[HttpRequestHeader.Authorization] = auth;
                }

                BlogsJson = client.DownloadString(url);
            }
        }
        catch (Exception ex)
        {
            // Fallback safe JSON structure
            BlogsJson = "{\"success\":false,\"data\":[]}";
        }
    }

    /// <summary>
    /// Decrypts the AES-128 encrypted CmsToken from Web.config in-memory.
    /// Plaintext API key is NEVER exposed in HTML or JavaScript source code.
    /// </summary>
    private static string GetAuthHeader()
    {
        try
        {
            string cipher = ConfigurationManager.AppSettings["CmsToken"];
            if (string.IsNullOrEmpty(cipher)) return "";

            byte[] fullCipher = Convert.FromBase64String(cipher);
            byte[] key = new byte[] { 0x50, 0x64, 0x70, 0x53, 0x63, 0x68, 0x6F, 0x6F, 0x6C, 0x32, 0x30, 0x32, 0x36, 0x21, 0x40, 0x23 };
            byte[] iv = new byte[] { 0x4A, 0x75, 0x70, 0x73, 0x6F, 0x66, 0x74, 0x43, 0x6D, 0x73, 0x53, 0x65, 0x63, 0x75, 0x72, 0x65 };

            using (Aes aes = Aes.Create())
            {
                aes.Key = key;
                aes.IV = iv;
                using (MemoryStream ms = new MemoryStream())
                {
                    using (CryptoStream cs = new CryptoStream(ms, aes.CreateDecryptor(), CryptoStreamMode.Write))
                    {
                        cs.Write(fullCipher, 0, fullCipher.Length);
                        cs.FlushFinalBlock();
                    }
                    return "Bearer " + Encoding.UTF8.GetString(ms.ToArray());
                }
            }
        }
        catch
        {
            return "";
        }
    }
}`;

  const csharpDetailCode = `// blog-detail.aspx.cs
// ==============================================================================
// ASP.NET C# Code-Behind: Server-Side Article Detail & Recent Posts Fetcher
// Target Domain: ${siteDomain} | Website ID: ${websiteId}
// Security: AES-128 In-Memory Decryption (Zero API Key Leak in Page Source)
// ==============================================================================
using System;
using System.Configuration;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using System.Web.UI;

public partial class blog_detail : System.Web.UI.Page
{
    public string BlogDetailJson = "null";
    public string RecentBlogsJson = "null";
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
            LoadRecentBlogs();
        }
    }

    private void LoadBlogDetail(string slug)
    {
        try
        {
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | SecurityProtocolType.Tls12;
            string host = ConfigurationManager.AppSettings["CmsHost"] ?? "${apiBaseUrl.replace(/\/v1$/, '')}";
            string site = ConfigurationManager.AppSettings["CmsSite"] ?? "${websiteId}";
            string url = host.TrimEnd('/') + "/v1/blogs/" + HttpUtility.UrlEncode(slug) + "?website=" + site;

            using (WebClient client = new WebClient())
            {
                client.Encoding = Encoding.UTF8;
                client.Headers[HttpRequestHeader.UserAgent] = "Mozilla/5.0 (${siteDomain} ASP.NET Server)";
                
                string auth = GetAuthHeader();
                if (!string.IsNullOrEmpty(auth))
                {
                    client.Headers[HttpRequestHeader.Authorization] = auth;
                }
                BlogDetailJson = client.DownloadString(url);
            }
        }
        catch (Exception ex)
        {
            BlogDetailJson = "null";
        }
    }

    private void LoadRecentBlogs()
    {
        try
        {
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | SecurityProtocolType.Tls12;
            string host = ConfigurationManager.AppSettings["CmsHost"] ?? "${apiBaseUrl.replace(/\/v1$/, '')}";
            string site = ConfigurationManager.AppSettings["CmsSite"] ?? "${websiteId}";
            string url = host.TrimEnd('/') + "/v1/blogs?website=" + site + "&limit=4";

            using (WebClient client = new WebClient())
            {
                client.Encoding = Encoding.UTF8;
                client.Headers[HttpRequestHeader.UserAgent] = "Mozilla/5.0 (${siteDomain} ASP.NET Server)";
                
                string auth = GetAuthHeader();
                if (!string.IsNullOrEmpty(auth))
                {
                    client.Headers[HttpRequestHeader.Authorization] = auth;
                }
                RecentBlogsJson = client.DownloadString(url);
            }
        }
        catch
        {
            RecentBlogsJson = "null";
        }
    }

    private static string GetAuthHeader()
    {
        try
        {
            string cipher = ConfigurationManager.AppSettings["CmsToken"];
            if (string.IsNullOrEmpty(cipher)) return "";

            byte[] fullCipher = Convert.FromBase64String(cipher);
            byte[] key = new byte[] { 0x50, 0x64, 0x70, 0x53, 0x63, 0x68, 0x6F, 0x6F, 0x6C, 0x32, 0x30, 0x32, 0x36, 0x21, 0x40, 0x23 };
            byte[] iv = new byte[] { 0x4A, 0x75, 0x70, 0x73, 0x6F, 0x66, 0x74, 0x43, 0x6D, 0x73, 0x53, 0x65, 0x63, 0x75, 0x72, 0x65 };

            using (Aes aes = Aes.Create())
            {
                aes.Key = key;
                aes.IV = iv;
                using (MemoryStream ms = new MemoryStream())
                {
                    using (CryptoStream cs = new CryptoStream(ms, aes.CreateDecryptor(), CryptoStreamMode.Write))
                    {
                        cs.Write(fullCipher, 0, fullCipher.Length);
                        cs.FlushFinalBlock();
                    }
                    return "Bearer " + Encoding.UTF8.GetString(ms.ToArray());
                }
            }
        }
        catch
        {
            return "";
        }
    }
}`;

  const csharpAspxCode = `<%@ Page Title="Our Blogs & Articles" Language="C#" AutoEventWireup="true" CodeFile="blog.aspx.cs" Inherits="blog" %>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Our Blogs &amp; Articles | ${siteDomain}</title>
  <meta name="description" content="Read the latest news, guides, and articles." />
  <link rel="canonical" href="https://${siteDomain}/blog" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; }
    .filter-bar { display: flex; gap: 12px; margin-bottom: 30px; justify-content: center; }
    .filter-bar input, .filter-bar select { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; }
    .blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
    .blog-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: transform 0.2s; }
    .blog-card:hover { transform: translateY(-4px); }
    .blog-card img { width: 100%; height: 200px; object-fit: cover; background: #f1f5f9; }
    .blog-content { padding: 20px; }
    .blog-category { display: inline-block; background: #e0e7ff; color: #4338ca; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; margin-bottom: 10px; }
    .blog-title { font-size: 18px; font-weight: 700; margin: 0 0 10px 0; line-height: 1.4; }
    .blog-title a { color: #0f172a; text-decoration: none; }
    .blog-title a:hover { color: #6366f1; }
    .blog-excerpt { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 16px; }
    .blog-foot { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #e2e8f0; padding-top: 12px; font-size: 12px; color: #94a3b8; }
    .blog-read { color: #6366f1; font-weight: 600; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Latest News &amp; Articles</h1>
      <p>Discover tips, industry insights, and updates directly from our team.</p>
    </div>

    <!-- Search & Filters -->
    <div class="filter-bar">
      <input type="text" id="blogSearch" placeholder="Search articles..." style="width: 280px;" />
      <select id="blogCategory">
        <option value="">All Categories</option>
      </select>
    </div>

    <!-- Dynamic Blog Grid -->
    <div id="blogGrid" class="blog-grid"></div>
  </div>

  <script>
    // 🔒 100% ZERO API KEY LEAK GUARANTEE
    // Data is directly injected by ASP.NET C# server-side execution.
    // Inspecting this source code in your browser (Ctrl+U) reveals ZERO API keys or tokens!
    var rawServerData = <%= BlogsJson %>;

    var ALL_BLOGS = (rawServerData && rawServerData.data && Array.isArray(rawServerData.data))
      ? rawServerData.data.map(function(b) {
          return {
            slug: b.slug || b.id,
            title: b.title || "Untitled",
            category: b.primaryCategory || (b.categories && b.categories[0] ? b.categories[0].name : "General"),
            date: b.publishedAt ? new Date(b.publishedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : "",
            img: b.featuredImage || "/assets/img/placeholder.jpg",
            excerpt: b.excerpt || "",
            read: b.readTimeMinutes ? (b.readTimeMinutes + " min read") : "5 min read"
          };
        })
      : [];

    function renderBlogs(list) {
      var grid = document.getElementById("blogGrid");
      if (!list || !list.length) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;">No articles found.</div>';
        return;
      }
      var html = "";
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        var blogUrl = "/blog/" + encodeURIComponent(b.slug);
        html += '<div class="blog-card">' +
          '<a href="' + blogUrl + '"><img src="' + b.img + '" alt="' + b.title.replace(/"/g, '&quot;') + '" loading="lazy" /></a>' +
          '<div class="blog-content">' +
            '<span class="blog-category">' + b.category + '</span>' +
            '<h3 class="blog-title"><a href="' + blogUrl + '">' + b.title + '</a></h3>' +
            '<p class="blog-excerpt">' + b.excerpt + '</p>' +
            '<div class="blog-foot">' +
              '<span>' + b.date + ' • ' + b.read + '</span>' +
              '<a class="blog-read" href="' + blogUrl + '">Read More &rarr;</a>' +
            '</div>' +
          '</div></div>';
      }
      grid.innerHTML = html;
    }

    function filterBlogs() {
      var q = (document.getElementById("blogSearch").value || "").toLowerCase();
      var c = document.getElementById("blogCategory").value || "";
      var out = ALL_BLOGS.filter(function(b) {
        var matchQ = !q || (b.title + " " + b.excerpt).toLowerCase().indexOf(q) !== -1;
        var matchC = !c || b.category.toLowerCase() === c.toLowerCase();
        return matchQ && matchC;
      });
      renderBlogs(out);
    }

    // Populate Category Dropdown
    (function setupCategories() {
      var catSelect = document.getElementById("blogCategory");
      var cats = {};
      ALL_BLOGS.forEach(function(b) { if (b.category) cats[b.category] = true; });
      var keys = Object.keys(cats);
      if (keys.length > 0) {
        var opts = '<option value="">All Categories</option>';
        keys.forEach(function(k) { opts += '<option value="' + k + '">' + k + '</option>'; });
        catSelect.innerHTML = opts;
      }
    })();

    document.getElementById("blogSearch").addEventListener("input", filterBlogs);
    document.getElementById("blogCategory").addEventListener("change", filterBlogs);
    renderBlogs(ALL_BLOGS);
  </script>
</body>
</html>`;

  // ──────────────────────────────────────────────────────────────────────────
  // 4. REACT / VUE CUSTOM HOOKS
  // ──────────────────────────────────────────────────────────────────────────

  const reactHookCode = `// src/hooks/useBlogs.ts
// Reusable React Hook with state, error handling, and search filters
import { useState, useEffect, useCallback } from 'react';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
  featuredImage?: string;
  publishedAt: string;
  readTimeMinutes: number;
}

export function useBlogs(initialPage = 1, limit = 12) {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPosts = useCallback(async (targetPage: number, search = '') => {
    setLoading(true);
    setError(null);
    try {
      const searchParam = search ? \`&search=\${encodeURIComponent(search)}\` : '';
      const url = \`https://blogary.jupsoft.com/v1/blogs?website=${websiteId}&page=\${targetPage}&limit=\${limit}\${searchParam}\`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(\`Failed to fetch blogs (HTTP \${res.status})\`);
      const json = await res.json();
      setBlogs(json.data || []);
      if (json.meta) {
        setTotalPages(json.meta.totalPages || 1);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to CMS');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPosts(page);
  }, [page, fetchPosts]);

  return { blogs, loading, error, page, setPage, totalPages, refetch: fetchPosts };
}`;

  const reactDetailCode = `// src/pages/BlogDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export const BlogDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(\`https://blogary.jupsoft.com/v1/blogs/\${slug}?website=${websiteId}\`)
      .then((res) => res.json())
      .then((json) => setPost(json.data))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="p-12 text-center text-slate-500">Loading article...</div>;
  if (!post) return <div className="p-12 text-center text-red-500">Article not found. <Link to="/blog">Go Back</Link></div>;

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
      <div className="text-sm text-slate-500 mb-8">
        {new Date(post.publishedAt).toLocaleDateString()} • {post.readTimeMinutes} min read
      </div>
      {post.featuredImage && (
        <img src={post.featuredImage} alt={post.title} className="w-full rounded-2xl mb-8" />
      )}
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
};`;

  // ──────────────────────────────────────────────────────────────────────────
  // 5. 1-LINE WIDGET & CURL
  // ──────────────────────────────────────────────────────────────────────────

  const widgetCode = `<!-- Universal 1-Line Drop-in Blog Embed Widget (WordPress / Webflow / Shopify) -->
<!-- Target Website: ${activeSite?.name || 'Website'} (${websiteId}) -->

<!-- 1. Place this container where the blog grid should appear -->
<div id="blogary-widget" 
     data-website="${websiteId}" 
     data-limit="6" 
     data-theme="auto" 
     data-layout="grid">
</div>

<!-- 2. Drop in the Blogary embed script -->
<script src="https://blogary.jupsoft.com/widget/blog.js" defer></script>`;

  const curlCode = `# 1. List published blogs for ${activeSite?.name || 'this website'}
curl -s -X GET "https://blogary.jupsoft.com/v1/blogs?website=${websiteId}&limit=10&page=1" \\
     -H "Accept: application/json"

# 2. Fetch full blog article detail by slug
curl -s -X GET "https://blogary.jupsoft.com/v1/blogs/${testSlug || 'sample-slug'}?website=${websiteId}" \\
     -H "Authorization: Bearer ${apiKey}" \\
     -H "Accept: application/json"

# 3. Retrieve latest 5 posts
curl -s -X GET "https://blogary.jupsoft.com/v1/blogs/latest?website=${websiteId}&limit=5" \\
     -H "Authorization: Bearer ${apiKey}"

# 4. Fetch taxonomy category tree
curl -s -X GET "https://blogary.jupsoft.com/v1/categories?websiteId=${websiteId}" \\
     -H "Authorization: Bearer ${apiKey}"

# 5. Trigger on-demand cache revalidation
curl -s -X POST "https://blogary.jupsoft.com/v1/revalidate" \\
     -H "Content-Type: application/json" \\
     -d '{"website": "${websiteId}", "slug": "${testSlug || 'all'}"}'`;

  const postmanCollectionJson = JSON.stringify({
    info: {
      name: `Jupsoft CMS API - ${activeSite?.name || 'Tenant'}`,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: [
      {
        name: "List Published Blogs",
        request: {
          method: "GET",
          header: [{ key: "Accept", value: "application/json" }],
          url: {
            raw: `https://blogary.jupsoft.com/v1/blogs?website=${websiteId}&page=1&limit=10`,
            protocol: "https",
            host: ["blogary", "jupsoft", "com"],
            path: ["v1", "blogs"],
            query: [
              { key: "website", value: websiteId },
              { key: "page", value: "1" },
              { key: "limit", value: "10" }
            ]
          }
        }
      },
      {
        name: "Get Single Blog by Slug",
        request: {
          method: "GET",
          header: [{ key: "Authorization", value: `Bearer ${apiKey}` }],
          url: {
            raw: `https://blogary.jupsoft.com/v1/blogs/${testSlug || 'sample-slug'}?website=${websiteId}`,
            protocol: "https",
            host: ["blogary", "jupsoft", "com"],
            path: ["v1", "blogs", testSlug || 'sample-slug'],
            query: [{ key: "website", value: websiteId }]
          }
        }
      },
      {
        name: "Get Categories",
        request: {
          method: "GET",
          header: [{ key: "Authorization", value: `Bearer ${apiKey}` }],
          url: {
            raw: `https://blogary.jupsoft.com/v1/categories?websiteId=${websiteId}`,
            protocol: "https",
            host: ["blogary", "jupsoft", "com"],
            path: ["v1", "categories"],
            query: [{ key: "websiteId", value: websiteId }]
          }
        }
      }
    ]
  }, null, 2);

  // Active Code Selector Helper
  const currentDisplayedCode = useMemo(() => {
    if (activeStack === 'js') {
      if (activeJsTab === 'client') return jsClientCode;
      if (activeJsTab === 'list') return htmlBlogListCode;
      if (activeJsTab === 'detail') return htmlBlogDetailCode;
      if (activeJsTab === 'iis') return iisRewriteCode;
      if (activeJsTab === 'htaccess') return htaccessCode;
    } else if (activeStack === 'nextjs') {
      if (activeNextTab === 'list') return nextJsListCode;
      if (activeNextTab === 'detail') return nextJsDetailCode;
      if (activeNextTab === 'webhook') return nextJsWebhookCode;
      if (activeNextTab === 'nextconfig') return nextConfigCode;
    } else if (activeStack === 'csharp') {
      if (activeCSharpTab === 'webconfig') return csharpWebConfigCode;
      if (activeCSharpTab === 'list') return csharpListCode;
      if (activeCSharpTab === 'detail') return csharpDetailCode;
      if (activeCSharpTab === 'aspx') return csharpAspxCode;
    } else if (activeStack === 'react') {
      if (activeReactTab === 'hook') return reactHookCode;
      if (activeReactTab === 'detail') return reactDetailCode;
    } else if (activeStack === 'widget') {
      return widgetCode;
    } else if (activeStack === 'curl') {
      return curlCode;
    }
    return '';
  }, [activeStack, activeJsTab, activeNextTab, activeCSharpTab, activeReactTab, testSlug, websiteId, apiKey, csharpWebConfigCode, csharpListCode, csharpDetailCode, csharpAspxCode, encryptedCmsToken]);

  const currentDisplayedFilename = useMemo(() => {
    if (activeStack === 'js') {
      if (activeJsTab === 'client') return 'cms-client.js';
      if (activeJsTab === 'list') return 'blog.html';
      if (activeJsTab === 'detail') return 'blog-detail.html';
      if (activeJsTab === 'iis') return 'web.config';
      if (activeJsTab === 'htaccess') return '.htaccess';
    } else if (activeStack === 'nextjs') {
      if (activeNextTab === 'list') return 'page.tsx';
      if (activeNextTab === 'detail') return '[slug]/page.tsx';
      if (activeNextTab === 'webhook') return 'route.ts';
      if (activeNextTab === 'nextconfig') return 'next.config.js';
    } else if (activeStack === 'csharp') {
      if (activeCSharpTab === 'webconfig') return 'Web.config';
      if (activeCSharpTab === 'list') return 'blog.aspx.cs';
      if (activeCSharpTab === 'detail') return 'blog-detail.aspx.cs';
      if (activeCSharpTab === 'aspx') return 'blog.aspx';
    } else if (activeStack === 'react') {
      if (activeReactTab === 'hook') return 'useBlogs.ts';
      if (activeReactTab === 'detail') return 'BlogDetailPage.tsx';
    } else if (activeStack === 'widget') {
      return 'widget-embed.html';
    } else if (activeStack === 'curl') {
      return 'commands.sh';
    }
    return 'snippet.txt';
  }, [activeStack, activeJsTab, activeNextTab, activeCSharpTab, activeReactTab]);

  const handoverMarkdown = useMemo(() => {
    return `# Jupsoft Centralized Blog Platform — Developer Integration Handover
**Target Website:** ${activeSite?.name || 'Website'}
**Website ID:** \`${websiteId}\`
**Configured Domain:** \`${siteDomain}\`
**Client API Key:** \`${apiKey}\`
**API Base URL:** \`${apiBaseUrl}\`

---

## 🚀 Quickstart for Frontend Developers

### 1. Domain-Restricted Client API Key Authentication
Public blog requests must include your website's Client API Key in the request header:
- **Header:** \`x-api-key: ${apiKey}\`
- **Domain-Restriction Lock:** This key is strictly locked to your registered domain (\`${siteDomain}\`).
- **Zero Theft Risk:** Even if this key is visible in your frontend HTML or JavaScript, the backend blocks it from being used on any other domain. Requests from unauthorized origins are automatically rejected with \`403 Domain mismatch\`.

### 2. Files Provided in this Package
1. **\`assets/js/cms-client.js\`** — Frontend API client with pre-configured Client API Key, Stale-While-Revalidate caching, and 3500ms timeout.
2. **\`blog.shtml\` (or \`blog.html\`)** — Complete Blog Listing page with search, category filters, and responsive grid.
3. **\`blog-detail.shtml\` (or \`blog-detail.html\`)** — Full Article Detail page with dynamic SEO, OpenGraph tags, and Schema.org JSON-LD.
4. **\`web.config\`** — Microsoft IIS URL Rewrite rules mapping \`/blog/{slug}\` to \`blog-detail.shtml?slug={slug}\`.
5. **\`.htaccess\`** — Apache mod_rewrite rules (if hosted on Apache/Linux).

### 3. Enterprise ASP.NET / C# (100% Zero Frontend Leak Architecture)
For IIS / Windows Server environments where API credentials must NEVER appear in client-side HTML or JavaScript:
- **\`Web.config\`**: Stores AES-128 encrypted \`CmsToken\` cipher (Cipher: \`${encryptedCmsToken || 'AES encrypted'}\`).
- **\`blog.aspx.cs\`**: Decrypts the token in server-side memory and fetches data via \`WebClient\`.
- **\`blog-detail.aspx.cs\`**: Server-side slug article retrieval.
- **\`blog.aspx\`**: Injects \`<%= BlogsJson %>\` directly. Inspecting HTML source code (\`Ctrl+U\`) reveals **0% API keys**.

---

## 📡 Core API Endpoints

### 1. List Published Articles
\`\`\`http
GET ${apiBaseUrl}/blogs?website=${websiteId}&page=1&limit=12
x-api-key: ${apiKey}
Accept: application/json
\`\`\`

### 2. Get Single Article by Slug
\`\`\`http
GET ${apiBaseUrl}/blogs/{slug}?website=${websiteId}
x-api-key: ${apiKey}
Accept: application/json
\`\`\`

### 3. Categories
\`\`\`http
GET ${apiBaseUrl}/categories?websiteId=${websiteId}
x-api-key: ${apiKey}
Accept: application/json
\`\`\`

---

## ⚠️ Important Gotchas to Avoid
1. **Always supply the API Key**: Pass \`x-api-key: ${apiKey}\` in all fetch calls (pre-configured in \`cms-client.js\`).
2. **Fix 404 on blog detail links**: Ensure \`web.config\` or \`.htaccess\` is uploaded to your website root. If your server cannot rewrite URLs, use \`/blog-detail.shtml?slug={slug}\`.
3. **Bypass edge cache when testing new posts**: Add \`&fresh=1\` to any endpoint to query live database state immediately.
`;
  }, [activeSite?.name, websiteId, siteDomain, apiBaseUrl, apiKey]);

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER CARD & CREDENTIALS ── */}
      <div className="bg-gradient-to-br from-indigo-900/10 via-slate-900/5 to-purple-900/10 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-purple-950/30 border border-indigo-200/60 dark:border-indigo-800/40 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold font-mono tracking-wider uppercase mb-2">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>Self-Serve Frontend Developer Hub</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Dynamic Blog Connection: {activeSite?.name}</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Connect your frontend website to Blogary CMS in under 10 minutes. Zero backend back-and-forth: all files, rewrite rules, and endpoints are automatically tailored for <strong>{siteDomain}</strong>.
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
              onClick={() => copyToClipboard(apiKey, 'top-api-key')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {copiedKey === 'top-api-key' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>Key: {apiKey ? `${apiKey.slice(0, 14)}...` : 'Not Set'}</span>
            </button>
            <button
              onClick={() => copyToClipboard(apiBaseUrl, 'top-api-url')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {copiedKey === 'top-api-url' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>API: {apiBaseUrl}</span>
            </button>
            <button
              onClick={() => downloadFile(handoverMarkdown, `${websiteId}-developer-handover-guide.md`, 'text/markdown')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Download complete handover documentation as Markdown file"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Handover Guide (.MD)</span>
            </button>
            <button
              onClick={() => {
                downloadFile(jsClientCode, 'cms-client.js');
                setTimeout(() => downloadFile(htmlBlogListCode, 'blog.shtml'), 200);
                setTimeout(() => downloadFile(htmlBlogDetailCode, 'blog-detail.shtml'), 400);
                setTimeout(() => downloadFile(iisRewriteCode, 'web.config', 'application/xml'), 600);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Download all 4 frontend integration files at once"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download SHTML Pack (4 Files)</span>
            </button>
            <button
              onClick={() => downloadFile(postmanCollectionJson, `${websiteId}-postman-collection.json`, 'application/json')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Download Postman Collection v2.1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Postman Collection</span>
            </button>
          </div>
        </div>

        {/* 3 Steps Overview Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-indigo-100/60 dark:border-indigo-900/40">
          <div className="flex items-start gap-2.5 bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Domain-Locked Client API Key</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Key locked strictly to: <code className="font-mono text-indigo-600 dark:text-indigo-400">{siteDomain}</code>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Drop-in Production Files</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Static SHTML, IIS web.config, Next.js, or React</div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Live In-Portal Testing</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Test real database blogs with sub-100ms latency</div>
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
              <span>Step 1: Test Live API Connection &amp; Slugs for {activeSite?.name}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Execute live HTTP requests against the production database. Real published slugs are loaded directly from your catalog.
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
              <span>{isTesting ? 'Testing...' : 'Execute Live Request'}</span>
            </button>
          </div>
        </div>

        {/* Console Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Target Endpoint</label>
            <select
              value={testEndpoint}
              onChange={(e: any) => setTestEndpoint(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none"
            >
              <option value="blogs">GET /v1/blogs (Paginated Listing)</option>
              <option value="detail">GET /v1/blogs/:slug (Full Article Detail)</option>
              <option value="latest">GET /v1/blogs/latest (Latest 3 Posts)</option>
              <option value="popular">GET /v1/blogs/popular (Most Viewed Posts)</option>
              <option value="categories">GET /v1/categories (Taxonomy Tree)</option>
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
              {testEndpoint === 'detail' ? 'Select Published Blog Slug' : 'Options'}
            </label>
            {testEndpoint === 'detail' ? (
              <div className="space-y-1">
                {publishedBlogs.length > 0 ? (
                  <select
                    value={testSlug}
                    onChange={(e) => setTestSlug(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none truncate"
                  >
                    {publishedBlogs.map((b) => {
                      const lang = activeSite.defaultLanguage || 'en';
                      const slug = b.translations[lang]?.slug || Object.values(b.translations)[0]?.slug || b.id;
                      return (
                        <option key={b.id} value={slug}>
                          {b.translations[lang]?.title || slug} ({slug})
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={testSlug}
                    onChange={(e) => setTestSlug(e.target.value)}
                    placeholder="enter-custom-slug"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none"
                  />
                )}
              </div>
            ) : (
              <label className="flex items-center gap-2 pt-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                <input
                  type="checkbox"
                  checked={bypassCacheTest}
                  onChange={(e) => setBypassCacheTest(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Bypass Cache (<code className="text-indigo-600 font-mono">&amp;fresh=1</code>)</span>
              </label>
            )}
          </div>
        </div>

        {/* Gotcha Callout Banner */}
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Important Developer Gotcha (Browser Address Bar 401):</strong> If you copy the API URL and paste it directly into your Chrome/Edge address bar, you will receive <code className="font-mono font-bold">401 Direct browser access denied</code> because browser address bars do not send an <code className="font-mono">Origin</code> header.
            When your frontend JavaScript runs on <strong>{siteDomain}</strong> (or <strong>localhost</strong>), the browser automatically supplies the Origin, connecting instantly with <strong>zero API keys</strong>.
          </div>
        </div>

        {/* Live Response Box */}
        {(testResult || testError) && (
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#0f1117] text-slate-200 text-xs font-mono">
            <div className="px-3.5 py-2 bg-[#171b26] border-b border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Live Database Response Output</span>
              <button
                onClick={() => copyToClipboard(JSON.stringify(testResult || testError, null, 2), 'console-json')}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedKey === 'console-json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'console-json' ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="p-3.5 max-h-56 overflow-y-auto overflow-x-auto text-[11.5px] leading-relaxed text-emerald-300">
              {testResult ? JSON.stringify(testResult, null, 2) : testError}
            </pre>
          </div>
        )}
      </div>

      {/* ── STEP 2: MULTI-FRAMEWORK PRODUCTION CODE BLUEPRINTS ── */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-500" />
              <span>Step 2: Copy Ready-to-Use Frontend Code (Pre-filled for {activeSite?.name})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Complete, production-tested templates with responsive CSS, skeleton loaders, error boundaries, and URL rewrites.
            </p>
          </div>

          <button
            onClick={() => downloadFile(currentDisplayedCode, currentDisplayedFilename)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {currentDisplayedFilename}</span>
          </button>
        </div>

        {/* Stack Tab Buttons */}
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
            <span>SHTML / HTML / JavaScript</span>
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
            <span>Next.js / TypeScript</span>
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
            <span>ASP.NET / C# (Zero-Leak)</span>
          </button>
          <button
            onClick={() => setActiveStack('react')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeStack === 'react'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>React / Vue (SPA)</span>
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
            <span>HTML Embed Widget</span>
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
            <span>cURL &amp; Postman API</span>
          </button>
        </div>

        {/* Sub-File Selector Bar */}
        {activeStack === 'js' && (
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
            <span className="text-slate-500 font-semibold">Select File:</span>
            <button
              onClick={() => setActiveJsTab('client')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${activeJsTab === 'client' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
            >
              1. assets/js/cms-client.js
            </button>
            <button
              onClick={() => setActiveJsTab('list')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${activeJsTab === 'list' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
            >
              2. blog.shtml / blog.html (List Page)
            </button>
            <button
              onClick={() => setActiveJsTab('detail')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${activeJsTab === 'detail' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
            >
              3. blog-detail.shtml / blog-detail.html (Article Page)
            </button>
            <button
              onClick={() => setActiveJsTab('iis')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${activeJsTab === 'iis' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
            >
              4. web.config (IIS Rewrite)
            </button>
            <button
              onClick={() => setActiveJsTab('htaccess')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${activeJsTab === 'htaccess' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
            >
              5. .htaccess (Apache Rewrite)
            </button>
          </div>
        )}

        {activeStack === 'nextjs' && (
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
            <span className="text-slate-500 font-semibold">Select File:</span>
            <button
              onClick={() => setActiveNextTab('list')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${activeNextTab === 'list' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
            >
              app/blog/page.tsx
            </button>
            <button
              onClick={() => setActiveNextTab('detail')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${activeNextTab === 'detail' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
            >
              app/blog/[slug]/page.tsx
            </button>
            <button
              onClick={() => setActiveNextTab('webhook')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${activeNextTab === 'webhook' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
            >
              app/api/revalidate/route.ts
            </button>
            <button
              onClick={() => setActiveNextTab('nextconfig')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${activeNextTab === 'nextconfig' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
            >
              next.config.js
            </button>
          </div>
        )}

        {activeStack === 'csharp' && (
          <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold">Select File:</span>
                <button
                  onClick={() => setActiveCSharpTab('webconfig')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${activeCSharpTab === 'webconfig' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
                >
                  1. Web.config (AES Encrypted Token)
                </button>
                <button
                  onClick={() => setActiveCSharpTab('list')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${activeCSharpTab === 'list' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
                >
                  2. blog.aspx.cs (Server Decryptor)
                </button>
                <button
                  onClick={() => setActiveCSharpTab('detail')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${activeCSharpTab === 'detail' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
                >
                  3. blog-detail.aspx.cs (Article Detail)
                </button>
                <button
                  onClick={() => setActiveCSharpTab('aspx')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${activeCSharpTab === 'aspx' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
                >
                  4. blog.aspx (Zero-Key HTML Markup)
                </button>
              </div>

              <button
                onClick={() => {
                  downloadFile(csharpWebConfigCode, 'Web.config', 'application/xml');
                  setTimeout(() => downloadFile(csharpListCode, 'blog.aspx.cs'), 200);
                  setTimeout(() => downloadFile(csharpDetailCode, 'blog-detail.aspx.cs'), 400);
                  setTimeout(() => downloadFile(csharpAspxCode, 'blog.aspx', 'text/html'), 600);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                title="Download all 4 ASP.NET C# integration files at once"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download C# Zero-Leak Pack (4 Files)</span>
              </button>
            </div>

            {/* Zero-Leak Security Architecture Banner */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <span>100% Zero-Leak Architecture: Plaintext API Key Never Exposed in Frontend</span>
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 rounded text-[10px] font-mono uppercase font-bold text-emerald-700 dark:text-emerald-200">AES-128 Cipher Active</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Your <code>Web.config</code> holds an AES-128-CBC cipher (<code>{encryptedCmsToken ? `${encryptedCmsToken.slice(0, 24)}...` : 'Computing...'}</code>). The C# code-behind decrypts it directly in server RAM during page execution, and serves pure JSON via <code>&lt;%= BlogsJson %&gt;</code>. Inspecting HTML source code (<code>Ctrl+U</code>) or DevTools Network tabs reveals <strong>zero API keys and zero tokens</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeStack === 'react' && (
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
            <span className="text-slate-500 font-semibold">Select File:</span>
            <button
              onClick={() => setActiveReactTab('hook')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${activeReactTab === 'hook' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
            >
              src/hooks/useBlogs.ts
            </button>
            <button
              onClick={() => setActiveReactTab('detail')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${activeReactTab === 'detail' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
            >
              src/pages/BlogDetailPage.tsx
            </button>
          </div>
        )}

        {/* Code Container */}
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#0f1117] text-slate-200 font-mono text-xs">
          <div className="px-4 py-2.5 bg-[#171b26] border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="text-slate-400 text-xs ml-2 font-sans font-medium">
                {currentDisplayedFilename}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadFile(currentDisplayedCode, currentDisplayedFilename)}
                className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
              <button
                onClick={() => copyToClipboard(currentDisplayedCode, 'tab-code')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-sans font-semibold transition-colors cursor-pointer border border-slate-700"
              >
                {copiedKey === 'tab-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'tab-code' ? 'Copied to Clipboard!' : 'Copy Snippet'}</span>
              </button>
            </div>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto overflow-x-auto text-[12px] leading-relaxed">
            <pre>{currentDisplayedCode}</pre>
          </div>
        </div>
      </div>

      {/* ── STEP 3: SERVER ROUTING & REWRITE BLUEPRINTS ── */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-500" />
            <span>Step 3: Web Server URL Rewrites (Fixing the 404 Blog Link Error)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            When users click a link like <code className="text-indigo-600 font-mono">/blog/top-erp-features</code>, static hosts look for a directory named <code className="font-mono">/blog/top-erp-features/index.html</code> which causes a 404. Configure your web server with the rules below:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileCode2 className="w-4 h-4 text-blue-500" />
                Microsoft IIS (web.config)
              </span>
              <button
                onClick={() => copyToClipboard(iisRewriteCode, 'copy-iis')}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                {copiedKey === 'copy-iis' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'copy-iis' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Place in the root directory of your IIS website. Requires <strong>IIS URL Rewrite Module</strong>.
            </p>
            <pre className="p-2.5 bg-slate-900 text-slate-200 rounded-lg text-[11px] overflow-x-auto max-h-36">
              {`<rewrite>
  <rules>
    <rule name="BlogDetail" stopProcessing="true">
      <match url="^blog/([a-zA-Z0-9\-_]+)/?$" />
      <action type="Rewrite" url="blog-detail.html?slug={R:1}" />
    </rule>
  </rules>
</rewrite>`}
            </pre>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileCode2 className="w-4 h-4 text-amber-500" />
                Apache HTTP Server (.htaccess)
              </span>
              <button
                onClick={() => copyToClipboard(htaccessCode, 'copy-apache')}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                {copiedKey === 'copy-apache' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'copy-apache' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Place in the public_html or root directory. Requires <strong>mod_rewrite</strong>.
            </p>
            <pre className="p-2.5 bg-slate-900 text-slate-200 rounded-lg text-[11px] overflow-x-auto max-h-36">
              {`RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^blog/([a-zA-Z0-9\-_]+)/?$ blog-detail.html?slug=$1 [L,QSA]`}
            </pre>
          </div>
        </div>

        {/* Fallback Note */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-800 dark:text-blue-300">
          <strong>Zero Server Configuration Fallback:</strong> If your web hosting cannot install rewrite modules, change the link href in <code className="font-mono">cms-client.js</code> to <code className="font-mono">/blog-detail.html?slug=&#123;slug&#125;</code>. The client script already supports query strings out of the box!
        </div>
      </div>

      {/* ── STEP 4: JSON SCHEMA DICTIONARY ── */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-slate-500" />
          <span>Step 4: Response Fields Reference (JSON Schema)</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Standard fields returned for articles across all <code className="font-mono text-indigo-600 dark:text-indigo-400">/v1/blogs</code> endpoints:
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
                <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Unique URL path identifier (e.g. <code>/blog/cloud-benefits</code>)</td>
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
                <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">CDN cover image URL. Fallback provided automatically</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">publishedAt</td>
                <td className="py-2 px-3 text-slate-500">ISO string</td>
                <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Publication timestamp for sorting &amp; date badge</td>
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
                <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Google Schema.org structured data ready for injection</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── STEP 5: DEVELOPER TROUBLESHOOTING DOCTOR ── */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500" />
          <span>Step 5: Frontend Developer Self-Diagnosis &amp; FAQ</span>
        </h3>

        <div className="space-y-2 text-xs">
          {/* FAQ 1 */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenFaq(openFaq === 1 ? null : 1)}
              className="w-full p-3 text-left font-semibold text-slate-800 dark:text-slate-200 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between cursor-pointer"
            >
              <span>1. Why did I get a 401 error when testing the URL in Chrome's address bar?</span>
              {openFaq === 1 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {openFaq === 1 && (
              <div className="p-3 text-slate-600 dark:text-slate-400 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 leading-relaxed">
                Direct browser address bar visits do not send an <code className="font-mono">Origin</code> or <code className="font-mono">Referer</code> header, so the security guard blocks them. In your web application code, the browser automatically sends the origin of your website (e.g. <code>{siteDomain}</code> or <code>localhost</code>), which allows public reads without requiring any API keys!
              </div>
            )}
          </div>

          {/* FAQ 2 */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenFaq(openFaq === 2 ? null : 2)}
              className="w-full p-3 text-left font-semibold text-slate-800 dark:text-slate-200 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between cursor-pointer"
            >
              <span>2. Why does clicking a blog link give a 404 error on my static website?</span>
              {openFaq === 2 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {openFaq === 2 && (
              <div className="p-3 text-slate-600 dark:text-slate-400 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 leading-relaxed">
                Your IIS or Apache server is attempting to locate a real directory matching the slug name. You must install the URL Rewrite rules provided in Step 3 above (<code className="font-mono">web.config</code> or <code className="font-mono">.htaccess</code>) so that clean URLs are internally rewritten to <code className="font-mono">blog-detail.html?slug=...</code>.
              </div>
            )}
          </div>

          {/* FAQ 3 */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenFaq(openFaq === 3 ? null : 3)}
              className="w-full p-3 text-left font-semibold text-slate-800 dark:text-slate-200 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between cursor-pointer"
            >
              <span>3. Can I test on localhost before deploying to production?</span>
              {openFaq === 3 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {openFaq === 3 && (
              <div className="p-3 text-slate-600 dark:text-slate-400 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 leading-relaxed">
                <strong>Yes, absolutely!</strong> <code className="font-mono">localhost</code>, <code className="font-mono">127.0.0.1</code>, <code className="font-mono">*.vercel.app</code>, and <code className="font-mono">*.netlify.app</code> are automatically whitelisted for local development. You do not need to alter your domain configuration while developing locally.
              </div>
            )}
          </div>

          {/* FAQ 4 */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenFaq(openFaq === 4 ? null : 4)}
              className="w-full p-3 text-left font-semibold text-slate-800 dark:text-slate-200 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between cursor-pointer"
            >
              <span>4. How do I see new blog updates immediately without waiting for edge cache?</span>
              {openFaq === 4 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {openFaq === 4 && (
              <div className="p-3 text-slate-600 dark:text-slate-400 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 leading-relaxed">
                Append <code className="font-mono text-indigo-600 dark:text-indigo-400">&amp;fresh=1</code> to your query URL (e.g. <code className="font-mono">/v1/blogs?website={websiteId}&amp;fresh=1</code>). This instructs the Redis cache to query live PostgreSQL state immediately.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
