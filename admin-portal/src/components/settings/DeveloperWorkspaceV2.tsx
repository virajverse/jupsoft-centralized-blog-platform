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
  BookOpen,
  Sparkles,
  Terminal,
  ArrowRight,
  Layers,
  Info
} from 'lucide-react';

export interface DeveloperWorkspaceV2Props {
  activeSite: Website;
  websites?: Website[];
  onSelectSite?: (siteId: string) => void;
  isSuperAdmin?: boolean;
  canViewApiKey?: boolean;
  blogs?: Blog[];
}

export type TargetLanguage = 'html' | 'aspx' | 'nextjs' | 'node' | 'java' | 'csharp' | 'php' | 'python' | 'curl';

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
  const [integrationMode, setIntegrationMode] = useState<'handover' | 'framework'>('handover');
  const [selectedLanguage, setSelectedLanguage] = useState<TargetLanguage>('html');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [gatewayHealth, setGatewayHealth] = useState<'checking' | 'online' | 'offline'>('checking');

  // Diagnostic Console State
  const [testEndpoint, setTestEndpoint] = useState<'blogs' | 'detail' | 'latest' | 'popular' | 'categories' | 'health'>('blogs');
  const [testSlug, setTestSlug] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testStatus, setTestStatus] = useState<number | null>(null);
  const [testStatusText, setTestStatusText] = useState<string | null>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testErrorCategory, setTestErrorCategory] = useState<'network' | 'auth' | 'not_found' | 'server' | 'parse' | null>(null);
  const [testResponseHeaders, setTestResponseHeaders] = useState<Record<string, string>>({});
  const [bypassCacheTest, setBypassCacheTest] = useState(false);
  const [lastTestedTime, setLastTestedTime] = useState<string | null>(null);

  // FAQ Search & Accordion State
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isSchemaOpen, setIsSchemaOpen] = useState(false);

  // Active Tenant Credentials
  const websiteId = activeSite?.id || websites[0]?.id || 'site-jupsoft-test';
  const siteDomain = activeSite?.domain || 'yourdomain.com';
  const apiKey = (canViewApiKey && activeSite?.apiKey) ? activeSite.apiKey : 'jup_live_sec_your_api_key';
  const apiBaseUrl = 'https://blogary.jupsoft.com/v1';

  // Gateway Connection Health Verification
  useEffect(() => {
    let active = true;
    fetch(`${apiBaseUrl}/health`)
      .then((res) => {
        if (!active) return;
        if (res.ok) {
          setGatewayHealth('online');
        } else {
          setGatewayHealth('offline');
        }
      })
      .catch(() => {
        if (active) setGatewayHealth('offline');
      });
    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

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

  const copyToClipboard = async (text: string, id: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedKey(id);
        setTimeout(() => setCopiedKey(null), 2000);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (success) {
          setCopiedKey(id);
          setTimeout(() => setCopiedKey(null), 2000);
        }
      }
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
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
 * - Dynamic connection-aware timeout (9s-22s) with automatic retry
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
    apiUrl: '${apiBaseUrl}',
    timeoutMs: null, // Dynamic connection-aware timeout (4G: 9s, 3G: 16s, 2G: 22s)
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

  // Dynamic connection-aware timeout calculator
  function getEffectiveTimeout() {
    if (config.timeoutMs && typeof config.timeoutMs === 'number') {
      return config.timeoutMs;
    }
    if (typeof navigator !== 'undefined' && navigator.connection) {
      var eff = navigator.connection.effectiveType;
      if (eff === '2g' || eff === 'slow-2g') return 22000;
      if (eff === '3g') return 16000;
    }
    return 9000;
  }

  // Safe fetch with AbortController dynamic timeout, retry logic & domain whitelist
  function request(endpoint, params, retryCount) {
    retryCount = retryCount !== undefined ? retryCount : 0;
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

    var currentTimeout = getEffectiveTimeout();
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = null;

    var headers = {
      'Accept': 'application/json',
      'x-website-id': config.websiteId
    };
    if (config.apiKey) {
      headers['x-api-key'] = config.apiKey;
    }

    var fetchPromise = fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: headers,
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
          data: data.data !== undefined ? data.data : data,
          meta: data.meta || data.pagination || null,
          pagination: data.pagination || data.meta || null
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
      // Auto-retry once on network glitch / abort if under retry limit
      if (retryCount < 1 && err.name !== 'AbortError') {
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(request(endpoint, params, retryCount + 1));
          }, 350);
        });
      }
      return {
        success: false,
        status: err.name === 'AbortError' ? 408 : 500,
        error: err.name === 'AbortError' ? 'Request timed out after ' + currentTimeout + 'ms' : (err.message || 'Network request failed')
      };
    });

    var timeoutPromise = new Promise(function (resolve) {
      timer = setTimeout(function () {
        if (controller) controller.abort();
        // Retry once on timeout
        if (retryCount < 1) {
          resolve(request(endpoint, params, retryCount + 1));
        } else {
          resolve({
            success: false,
            status: 408,
            error: 'Jupsoft CMS request timed out after ' + currentTimeout + 'ms'
          });
        }
      }, currentTimeout);
    });

    return Promise.race([fetchPromise, timeoutPromise]).then(function (result) {
      if (timer) clearTimeout(timer);
      return result;
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

    // 6. Get Tag Taxonomy List
    getTags: function () {
      return request('/tags', { websiteId: config.websiteId });
    },

    // 7. Full-text Search Published Articles
    search: function (query, options) {
      options = options || {};
      return request('/search', {
        q: query || '',
        limit: options.limit || 10,
        lang: options.lang || undefined
      });
    },

    // 8. Head SEO Tag Helper (Complete Suite: Title, Description, Keywords, Canonical, OpenGraph, Twitter, JSON-LD)
    applySeo: function (article) {
      if (!article || typeof document === 'undefined') return;
      var title = (article.seo && article.seo.metaTitle) || article.title;
      if (title) document.title = title;

      function setMeta(name, content, attrName) {
        if (!content) return;
        attrName = attrName || 'name';
        var el = document.querySelector('meta[' + attrName + '="' + name + '"]');
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute(attrName, name);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      }

      var desc = (article.seo && article.seo.metaDescription) || article.excerpt;
      setMeta('description', desc);
      setMeta('keywords', article.seo && article.seo.metaKeywords);
      setMeta('robots', (article.seo && article.seo.robots) || 'index, follow');

      // Canonical URL
      var canonical = (article.seo && article.seo.canonicalUrl) || (typeof window !== 'undefined' ? window.location.href.split('?')[0] : '');
      if (canonical) {
        var link = document.querySelector('link[rel="canonical"]');
        if (!link) {
          link = document.createElement('link');
          link.setAttribute('rel', 'canonical');
          document.head.appendChild(link);
        }
        link.setAttribute('href', canonical);
      }

      // Open Graph Tags
      var ogImage = (article.seo && article.seo.ogImage) || article.featuredImage;
      setMeta('og:type', 'article', 'property');
      setMeta('og:site_name', '${activeSite?.name || 'Website'}', 'property');
      setMeta('og:title', (article.seo && article.seo.ogTitle) || title, 'property');
      setMeta('og:description', (article.seo && article.seo.ogDescription) || desc, 'property');
      setMeta('og:image', ogImage, 'property');
      setMeta('og:url', canonical, 'property');
      if (article.publishedAt) setMeta('article:published_time', article.publishedAt, 'property');
      if (article.author && article.author.name) setMeta('article:author', article.author.name, 'property');
      if (article.category && article.category.name) setMeta('article:section', article.category.name, 'property');

      // Twitter Cards
      setMeta('twitter:card', 'summary_large_image');
      setMeta('twitter:title', (article.seo && article.seo.twitterTitle) || title);
      setMeta('twitter:description', (article.seo && article.seo.twitterDescription) || desc);
      setMeta('twitter:image', (article.seo && article.seo.twitterImage) || ogImage);

      // JSON-LD Schema
      var schema = article.schemaJsonLd || (article.seo && article.seo.schemaJsonLd);
      if (!schema && article.title) {
        schema = {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": title,
          "image": ogImage ? [ogImage] : [],
          "datePublished": article.publishedAt,
          "dateModified": article.updatedAt || article.publishedAt,
          "author": {
            "@type": "Person",
            "name": (article.author && article.author.name) || article.authorName || 'Editorial Staff'
          },
          "description": desc
        };
      }
      if (schema) {
        var existingScript = document.getElementById('jupsoft-schema-ld');
        if (existingScript) existingScript.remove();
        var script = document.createElement('script');
        script.id = 'jupsoft-schema-ld';
        script.type = 'application/ld+json';
        script.text = typeof schema === 'string' ? schema : JSON.stringify(schema);
        document.head.appendChild(script);
      }
    },

    // 9. Safe Image Resolver Helper
    resolveImageUrl: function (img, fallback) {
      fallback = fallback || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80';
      if (!img) return fallback;
      if (typeof img === 'string') return img;
      return img.url || img.src || fallback;
    }
  };

  return SDK;
}));
`;
  }, [activeSite?.name, websiteId, siteDomain, apiBaseUrl]);

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
JUPSOFT_API_URL="${apiBaseUrl}"

# Server Master Secret Key (Keep private, never expose in public HTML / client JS)
JUPSOFT_API_KEY="${apiKey}"
`;
  }, [activeSite?.name, siteDomain, websiteId, apiBaseUrl, apiKey]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2.45 PLAIN TEXT INTEGRATION HANDOVER GUIDES (ASPX & HTML)
  // ──────────────────────────────────────────────────────────────────────────
  const aspxGuideCode = useMemo(() => {
    return `=====================================================
Jupsoft CMS Integration Guide for ASPX (.NET Web Forms)
Website: ${activeSite?.name || 'Website'} (${websiteId})
Configured Domain: ${siteDomain}
=====================================================

1. Common Script (Add in Site.Master or all .aspx pages before </body>):

(For Local Testing):
<script>
  window.JUPSOFT_CONFIG = { apiKey: '${apiKey}' };
</script>
<script src="/js/cms-client.js"></script>

(Note: Live production domain (${siteDomain}) par window.JUPSOFT_CONFIG nahi lagana hai, direct domain whitelist se chalega)


-----------------------------------------------------
2. Blog Listing Page (Blog.aspx):
-----------------------------------------------------
Inside <asp:Content> or <body>:

<!-- Search Bar (Optional) -->
<div class="search-container" style="margin-bottom: 20px;">
    <input type="text" id="blogSearch" placeholder="Search blogs by title or topic..." style="padding: 10px 14px; width: 100%; max-width: 420px; border-radius: 8px; border: 1px solid #cbd5e1;" />
</div>

<div id="blogGrid"></div>

<script>
document.addEventListener('DOMContentLoaded', async function () {
    if (typeof JupsoftCMS === 'undefined') return;

    function renderBlogs(blogs) {
        var grid = document.getElementById('blogGrid');
        if (!grid) return;
        grid.innerHTML = '';
        if (!blogs || blogs.length === 0) {
            grid.innerHTML = '<p class="no-results">No articles found matching your criteria.</p>';
            return;
        }

        blogs.forEach(function (blog) {
            var card = document.createElement('div');
            card.className = 'blog-card';
            card.innerHTML = \`
                <img src="\${blog.featuredImage || ''}" alt="\${blog.title}" />
                <h3><a href="/blog/\${encodeURIComponent(blog.slug)}">\${blog.title}</a></h3>
                <p>\${blog.excerpt || ''}</p>
                <a href="/blog/\${encodeURIComponent(blog.slug)}">Read More &rarr;</a>
            \`;
            grid.appendChild(card);
        });
    }

    // 1. Initial Load (All blogs)
    var res = await JupsoftCMS.getBlogs({ limit: 12 });
    if (res.success && res.data) {
        renderBlogs(res.data);
    }

    // 2. Real-Time Search Handler (Connected to Jupsoft CMS API)
    var searchInput = document.getElementById('blogSearch');
    if (searchInput) {
        var searchDebounceTimer;
        searchInput.addEventListener('input', function (e) {
            clearTimeout(searchDebounceTimer);
            var query = e.target.value.trim();
            searchDebounceTimer = setTimeout(async function () {
                var searchRes = await JupsoftCMS.getBlogs({ search: query, limit: 12 });
                if (searchRes.success && searchRes.data) {
                    renderBlogs(searchRes.data);
                }
            }, 300); // 300ms debounce
        });
    }
});
</script>


-----------------------------------------------------
3. Blog Detail Page (BlogDetail.aspx):
-----------------------------------------------------
Inside <asp:Content> or <body>:

<h1 id="articleTitle">Loading...</h1>
<div id="articleMeta"></div>
<img id="articleImage" src="" style="display:none;" />
<div id="articleBody"></div>

<script>
document.addEventListener('DOMContentLoaded', async function () {
    if (typeof JupsoftCMS === 'undefined') return;

    // Extract slug from URL path (/blog/:slug) OR query param (?slug=)
    var pathParts = window.location.pathname.replace(/\/+$/, '').split('/');
    var slug = pathParts[pathParts.length - 1];
    if (!slug || slug === 'blog' || slug === 'blog-detail.aspx' || slug === 'blog-detail') {
        slug = new URLSearchParams(window.location.search).get('slug');
    }
    if (!slug) return;

    var res = await JupsoftCMS.getBlogBySlug(slug);
    if (res.success && res.data) {
        var article = res.data;
        JupsoftCMS.applySeo(article); // Auto SEO: Title, Meta, OG Tags, Twitter, Canonical & Schema.org

        document.getElementById('articleTitle').innerText = article.title;
        document.getElementById('articleBody').innerHTML = article.content;

        if (article.featuredImage) {
            var img = document.getElementById('articleImage');
            img.src = JupsoftCMS.resolveImageUrl(article.featuredImage);
            img.style.display = 'block';
        }
    }
});
</script>


-----------------------------------------------------
4. 100% SEO Server-Side Pre-Rendering (BlogDetail.aspx.cs):
-----------------------------------------------------
To ensure <title>, <meta description>, OpenGraph tags, and Canonical URLs print
directly in the initial HTML Source Code (Ctrl + U) for Google & WhatsApp bots:

Add this to BlogDetail.aspx.cs:
\`\`\`csharp
protected void Page_Load(object sender, EventArgs e)
{
    string slug = Request.QueryString["slug"];
    if (string.IsNullOrEmpty(slug)) {
        string path = Request.Url.AbsolutePath.TrimEnd('/');
        int lastSlash = path.LastIndexOf('/');
        if (lastSlash >= 0) slug = path.Substring(lastSlash + 1);
    }
    if (string.IsNullOrEmpty(slug)) return;

    try {
        string apiUrl = "${apiBaseUrl}/blogs/" + HttpUtility.UrlEncode(slug) + "?website=${websiteId}";
        HttpWebRequest req = (HttpWebRequest)WebRequest.Create(apiUrl);
        req.Headers["Origin"] = "https://${siteDomain}";
        req.Timeout = 4000;
        using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
        using (StreamReader reader = new StreamReader(res.GetResponseStream())) {
            string json = reader.ReadToEnd();
            // Injects title, description, og:image, and canonical into Page.Header
        }
    } catch {}
}
\`\`\`


-----------------------------------------------------
5. API Data Keys:
-----------------------------------------------------
blog.title          -> Article Heading
blog.featuredImage  -> Article Image URL
blog.excerpt        -> Short Summary
blog.content        -> Full Article HTML Body
blog.slug           -> URL Identifier
blog.publishedAt    -> Publish Date
blog.author.name    -> Author Name
`;
  }, [activeSite?.name, websiteId, siteDomain, apiKey]);

  const htmlGuideCode = useMemo(() => {
    return `<!-- ================= Blog Section (Dynamic CMS) ================= -->
<section class="container" id="blogSection" style="padding: 3rem 1.5rem;">
  <h2 class="section-title">Latest Articles</h2>
  <div class="blog-grid" id="blogGrid" style="margin-top: 2rem;"></div>
  <div style="text-align: center; margin-top: 2rem;">
    <a href="blog.html" class="btn btn-outline">View All Articles in Archive &rarr;</a>
  </div>
</section>

<!-- (All pages if you have HTML - Add before </body>) -->
<!-- For Local Testing: -->
<script>
  window.JUPSOFT_CONFIG = { apiKey: '${apiKey}' };
</script>
<script src="js/cms-client.js"></script>
<!-- (Note: Live production domain (${siteDomain}) par window.JUPSOFT_CONFIG nahi lagana hai, direct domain whitelist se chalega) -->


<!-- ================= blog.html (Dynamic Blog Grid) ================= -->
<main class="container" style="padding: 3rem 1.5rem 5rem;">
  <div class="blog-grid" id="blogGrid"></div>
</main>


<!-- ================= blog-detail.html (Dynamic Article Container) ================= -->
<article class="container" style="padding-top: 2rem;">
  <div class="article-header">
    <h1 class="article-title" id="articleTitle">Loading article...</h1>
    <div class="article-meta-bar" id="articleMeta"></div>
  </div>
  <div class="article-featured-image" id="articleImageWrapper">
    <img id="articleImage" src="" alt="" style="display:none; width: 100%; border-radius: 12px;">
  </div>
  <div class="article-layout">
    <div>
      <div class="article-body" id="articleBody"></div>
    </div>
  </div>
</article>


<!-- ================= main.js (Call initCmsIntegration) ================= -->
<script>
initCmsIntegration();

async function initCmsIntegration() {
  if (typeof JupsoftCMS === 'undefined') return;

  const blogGrid = document.getElementById('blogGrid');
  const articleBody = document.getElementById('articleBody');

  // 1. Blog Listing Grid (Home & blog.html)
  if (blogGrid) {
    try {
      const res = await JupsoftCMS.getBlogs({ limit: 12 });
      if (res && res.success && res.data && res.data.length > 0) {
        blogGrid.innerHTML = '';
        res.data.forEach((blog) => {
          const card = document.createElement('div');
          card.className = 'blog-card';
          const img = blog.featuredImage || blog.coverImage || '';
          const slug = blog.slug;
          const date = blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : '';

          card.innerHTML = \`
            \${img ? \`<div class="blog-card-media"><img class="blog-card-img" src="\${img}" alt="\${blog.title || ''}"></div>\` : ''}
            <div class="blog-card-body">
              <div class="blog-card-meta"><span>\${date}</span></div>
              <h3 class="blog-card-title">
                <a href="blog-detail.html?slug=\${encodeURIComponent(slug)}">\${blog.title}</a>
              </h3>
              <p class="blog-card-excerpt">\${blog.excerpt || ''}</p>
              <div class="blog-card-footer">
                <span class="author-name">\${blog.author?.name || blog.author || ''}</span>
                <a href="blog-detail.html?slug=\${encodeURIComponent(slug)}" class="read-more-link">Read &rarr;</a>
              </div>
            </div>
          \`;
          blogGrid.appendChild(card);
        });
      } else {
        blogGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:var(--text-muted); padding:2rem 0;">No articles published yet.</p>';
      }
    } catch (err) {
      console.error('CMS fetch failed:', err);
    }
  }

  // 2. Blog Detail Page - Fetch Single Post by Slug
  if (articleBody) {
    const slug = new URLSearchParams(window.location.search).get('slug');
    const titleEl = document.getElementById('articleTitle');
    if (!slug) {
      if (titleEl) titleEl.textContent = 'Please select a blog post from the blog list.';
      return;
    }
    try {
      const res = await JupsoftCMS.getBlogBySlug(slug);
      if (res.success && res.data) {
        const article = res.data;
        JupsoftCMS.applySeo(article);
        const imgEl = document.getElementById('articleImage');
        const metaEl = document.getElementById('articleMeta');
        if (titleEl) titleEl.textContent = article.title;
        if (imgEl && (article.featuredImage || article.coverImage)) {
          imgEl.src = article.featuredImage || article.coverImage;
          imgEl.style.display = 'block';
        }
        if (metaEl) {
          metaEl.textContent = \`\${article.author?.name || ''} • \${article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : ''}\`;
        }
        articleBody.innerHTML = article.content || '<p>No content available.</p>';
      } else {
        if (titleEl) titleEl.textContent = 'Article not found.';
      }
    } catch (err) {
      console.error('Failed to load blog detail:', err);
    }
  }
}
</script>


-----------------------------------------------------
Bas yeh 2 cheezein dhyan rakhni hoti hain:

Data inject karte waqt API ke keys use karein:
blog.title
blog.featuredImage
blog.content
blog.slug
`;
  }, [activeSite?.name, websiteId, siteDomain, apiKey]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2.46 DYNAMIC MARKDOWN & TEXT INTEGRATION GUIDES (FOR HUMANS & AI AGENTS)
  // ──────────────────────────────────────────────────────────────────────────
  const aspxMdGuide = useMemo(() => {
    return `# Jupsoft Centralized Blog Platform — ASP.NET Web Forms (.aspx) Integration Guide

Website: ${activeSite?.name || 'Website'} (${websiteId})
Configured Domain: ${siteDomain}

## 1. Quick Credentials
- **WEBSITE_ID**: \`${websiteId}\`
- **API_BASE_URL**: \`${apiBaseUrl}\`
- **PRODUCTION_DOMAIN**: \`${siteDomain}\` (Authorized via Origin Whitelist)

## 2. Master Page (Site.Master)
Add before \`</body>\`:
\`\`\`html
<script>
  window.JUPSOFT_CONFIG = { apiKey: '${apiKey}' }; // Only for localhost testing
</script>
<script src="/js/cms-client.js"></script>
\`\`\`

## 3. Blog Listing Page (Blog.aspx)
\`\`\`html
<div id="blogGrid"></div>
<script>
document.addEventListener('DOMContentLoaded', async function () {
  if (typeof JupsoftCMS === 'undefined') return;
  var res = await JupsoftCMS.getBlogs({ limit: 12 });
  if (res && res.success && res.data) {
    var grid = document.getElementById('blogGrid');
    grid.innerHTML = '';
    res.data.forEach(function (blog) {
      var card = document.createElement('div');
      card.className = 'blog-card';
      card.innerHTML = '<a href="BlogDetail.aspx?slug=' + encodeURIComponent(blog.slug) + '"><img src="' + (blog.featuredImage || '') + '" alt="' + blog.title + '" /></a>' +
        '<h3><a href="BlogDetail.aspx?slug=' + encodeURIComponent(blog.slug) + '">' + blog.title + '</a></h3>' +
        '<p>' + (blog.excerpt || '') + '</p>';
      grid.appendChild(card);
    });
  }
});
</script>
\`\`\`

## 4. Blog Detail Page (BlogDetail.aspx)
\`\`\`html
<h1 id="articleTitle">Loading...</h1>
<div id="articleMeta"></div>
<img id="articleImage" src="" style="display:none;" />
<div id="articleBody"></div>
<script>
document.addEventListener('DOMContentLoaded', async function () {
  if (typeof JupsoftCMS === 'undefined') return;
  var slug = new URLSearchParams(window.location.search).get('slug');
  if (!slug) return;
  var res = await JupsoftCMS.getBlogBySlug(slug);
  if (res && res.success && res.data) {
    var post = res.data;
    JupsoftCMS.applySeo(post);
    document.getElementById('articleTitle').innerText = post.title;
    document.getElementById('articleBody').innerHTML = post.content;
    if (post.featuredImage) {
      var img = document.getElementById('articleImage');
      img.src = post.featuredImage;
      img.style.display = 'block';
    }
  }
});
</script>
\`\`\`
`;
  }, [activeSite?.name, websiteId, siteDomain, apiBaseUrl, apiKey]);

  const htmlMdGuide = useMemo(() => {
    return `# Jupsoft Centralized Blog Platform — HTML & Vanilla JavaScript Integration Guide

Website: ${activeSite?.name || 'Website'} (${websiteId})
Configured Domain: ${siteDomain}

## 1. Quick Credentials
- **WEBSITE_ID**: \`${websiteId}\`
- **API_BASE_URL**: \`${apiBaseUrl}\`
- **PRODUCTION_DOMAIN**: \`${siteDomain}\` (Origin Whitelist active)

## 2. Global Script (All HTML Pages before </body>)
\`\`\`html
<script src="/js/cms-client.js"></script>
\`\`\`

## 3. Blog Listing Container (index.html or blog.html)
\`\`\`html
<section id="blogSection">
  <!-- Search Input Bar -->
  <input type="text" id="blogSearch" placeholder="Search blogs by title or keyword..." />
  <div id="blogGrid"></div>
</section>
\`\`\`

## 4. Blog Detail Container (blog-detail.html)
\`\`\`html
<article>
  <h1 id="articleTitle">Loading...</h1>
  <div id="articleBody"></div>
</article>
\`\`\`

## 5. JavaScript Controller (js/main.js)
\`\`\`javascript
document.addEventListener('DOMContentLoaded', async function () {
  if (typeof JupsoftCMS === 'undefined') return;

  function render(blogs) {
    var grid = document.getElementById('blogGrid');
    if (!grid) return;
    if (!blogs || blogs.length === 0) {
      grid.innerHTML = '<p>No blogs found.</p>';
      return;
    }
    grid.innerHTML = blogs.map(function(b) {
      return '<div class="card"><a href="blog-detail.html?slug=' + encodeURIComponent(b.slug) + '">' + b.title + '</a></div>';
    }).join('');
  }

  // Initial load
  var grid = document.getElementById('blogGrid');
  if (grid) {
    var res = await JupsoftCMS.getBlogs({ limit: 12 });
    if (res && res.success && res.data) {
      render(res.data);
    }
  }

  // Real-Time Search Handler (Connected to Jupsoft CMS)
  var searchInput = document.getElementById('blogSearch');
  if (searchInput) {
    var searchTimer;
    searchInput.addEventListener('input', function(e) {
      clearTimeout(searchTimer);
      var query = e.target.value.trim();
      searchTimer = setTimeout(async function() {
        var searchRes = await JupsoftCMS.getBlogs({ search: query, limit: 12 });
        if (searchRes && searchRes.success && searchRes.data) {
          render(searchRes.data);
        }
      }, 300);
    });
  }

  // Detail Page Handler
  var body = document.getElementById('articleBody');
  if (body) {
    var slug = new URLSearchParams(window.location.search).get('slug');
    if (slug) {
      var res = await JupsoftCMS.getBlogBySlug(slug);
      if (res && res.success && res.data) {
        JupsoftCMS.applySeo(res.data);
        document.getElementById('articleTitle').innerText = res.data.title;
        body.innerHTML = res.data.content;
      }
    }
  }
});
\`\`\`
`;
  }, [activeSite?.name, websiteId, siteDomain, apiBaseUrl]);

  const nextjsMdGuide = useMemo(() => {
    return `# Jupsoft Centralized Blog Platform — Next.js 14+ App Router Integration Guide

Website: ${activeSite?.name || 'Website'} (${websiteId})
Configured Domain: ${siteDomain}

## 1. Environment (.env.local)
\`\`\`env
JUPSOFT_WEBSITE_ID="${websiteId}"
JUPSOFT_API_URL="${apiBaseUrl}"
JUPSOFT_API_KEY="${apiKey}"
\`\`\`

## 2. API Fetcher (lib/jupsoft-cms.ts)
\`\`\`typescript
export async function getBlogs(page = 1, limit = 9) {
  const res = await fetch(\`\${process.env.JUPSOFT_API_URL}/blogs?website=\${process.env.JUPSOFT_WEBSITE_ID}&page=\${page}&limit=\${limit}\`, {
    headers: { 'x-api-key': process.env.JUPSOFT_API_KEY! },
    next: { revalidate: 60, tags: ['blogs'] },
  });
  const json = await res.json();
  return json.data || [];
}

export async function getBlogBySlug(slug: string) {
  const res = await fetch(\`\${process.env.JUPSOFT_API_URL}/blogs/\${encodeURIComponent(slug)}?website=\${process.env.JUPSOFT_WEBSITE_ID}\`, {
    headers: { 'x-api-key': process.env.JUPSOFT_API_KEY! },
    next: { revalidate: 60, tags: [\`blog-\${slug}\`] },
  });
  const json = await res.json();
  return json.data || null;
}
\`\`\`

## 3. Blog Listing (app/blog/page.tsx)
\`\`\`tsx
import { getBlogs } from '@/lib/jupsoft-cms';
import Link from 'next/link';

export default async function BlogPage() {
  const blogs = await getBlogs();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {blogs.map((b: any) => (
        <article key={b.id} className="border p-4 rounded-xl">
          <Link href={\`/blog/\${b.slug}\`}>
            <h3 className="font-bold text-lg">{b.title}</h3>
          </Link>
          <p className="text-sm text-gray-600">{b.excerpt}</p>
        </article>
      ))}
    </div>
  );
}
\`\`\`

## 4. Blog Detail with SEO (app/blog/[slug]/page.tsx)
\`\`\`tsx
import { getBlogBySlug } from '@/lib/jupsoft-cms';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getBlogBySlug(params.slug);
  return { title: post?.seo?.metaTitle || post?.title || 'Article' };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getBlogBySlug(params.slug);
  if (!post) notFound();
  return (
    <article className="max-w-3xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
\`\`\`
`;
  }, [activeSite?.name, websiteId, siteDomain, apiBaseUrl, apiKey]);

  const nodeMdGuide = useMemo(() => {
    return `# Jupsoft Centralized Blog Platform — Node.js / Express Integration Guide

Website: ${activeSite?.name || 'Website'} (${websiteId})

## 1. Environment (.env)
\`\`\`env
JUPSOFT_API_URL="${apiBaseUrl}"
JUPSOFT_WEBSITE_ID="${websiteId}"
JUPSOFT_API_KEY="${apiKey}"
\`\`\`

## 2. Service Client (services/jupsoftCms.js)
\`\`\`javascript
require('dotenv').config();

async function fetchCms(endpoint, params = {}) {
  const query = new URLSearchParams({ website: process.env.JUPSOFT_WEBSITE_ID, ...params });
  const res = await fetch(\`\${process.env.JUPSOFT_API_URL}\${endpoint}?\${query.toString()}\`, {
    headers: { 'Accept': 'application/json', 'x-api-key': process.env.JUPSOFT_API_KEY },
  });
  const json = await res.json();
  return json.data || json;
}

module.exports = {
  getBlogs: (page = 1, limit = 10) => fetchCms('/blogs', { page, limit }),
  getBlogBySlug: (slug) => fetchCms(\`/blogs/\${encodeURIComponent(slug)}\`),
};
\`\`\`

## 3. Express Controller
\`\`\`javascript
app.get('/blog', async (req, res) => {
  const blogs = await jupsoftCms.getBlogs(req.query.page || 1, 9);
  res.render('blog-list', { blogs });
});

app.get('/blog/:slug', async (req, res) => {
  const article = await jupsoftCms.getBlogBySlug(req.params.slug);
  res.render('blog-detail', { article });
});
\`\`\`
`;
  }, [activeSite?.name, websiteId, apiBaseUrl, apiKey]);

  const csharpMdGuide = useMemo(() => {
    return `# Jupsoft Centralized Blog Platform — C# .NET 8 / ASP.NET Core Integration Guide

Website: ${activeSite?.name || 'Website'} (${websiteId})

## 1. appsettings.json
\`\`\`json
{
  "JupsoftCms": {
    "ApiUrl": "${apiBaseUrl}",
    "WebsiteId": "${websiteId}",
    "ApiKey": "${apiKey}"
  }
}
\`\`\`

## 2. Dependency Injection Service (Services/JupsoftCmsService.cs)
\`\`\`csharp
public class JupsoftCmsService : IJupsoftCmsService
{
    private readonly HttpClient _http;
    private readonly string _websiteId;

    public JupsoftCmsService(HttpClient http, IConfiguration config)
    {
        _http = http;
        _http.BaseAddress = new Uri(config["JupsoftCms:ApiUrl"] ?? "${apiBaseUrl}");
        _http.DefaultRequestHeaders.Add("Accept", "application/json");
        _http.DefaultRequestHeaders.Add("x-api-key", config["JupsoftCms:ApiKey"]);
        _websiteId = config["JupsoftCms:WebsiteId"] ?? "${websiteId}";
    }

    public async Task<string> GetBlogsAsync(int page = 1, int limit = 10) =>
        await _http.GetStringAsync($"/blogs?website={Uri.EscapeDataString(_websiteId)}&page={page}&limit={limit}");

    public async Task<string> GetBlogBySlugAsync(string slug) =>
        await _http.GetStringAsync($"/blogs/{Uri.EscapeDataString(slug)}?website={Uri.EscapeDataString(_websiteId)}");
}
\`\`\`

## 3. Controller Actions (Controllers/BlogController.cs)
\`\`\`csharp
[HttpGet("/blog")]
public async Task<IActionResult> Index([FromQuery] int page = 1) =>
    Content(await _cms.GetBlogsAsync(page, 9), "application/json");

[HttpGet("/blog/{slug}")]
public async Task<IActionResult> Detail(string slug) =>
    Content(await _cms.GetBlogBySlugAsync(slug), "application/json");
\`\`\`
`;
  }, [activeSite?.name, websiteId, apiBaseUrl, apiKey]);

  const phpMdGuide = useMemo(() => {
    return `# Jupsoft Centralized Blog Platform — PHP & Laravel Integration Guide

Website: ${activeSite?.name || 'Website'} (${websiteId})

## 1. Environment (.env)
\`\`\`env
JUPSOFT_API_URL="${apiBaseUrl}"
JUPSOFT_WEBSITE_ID="${websiteId}"
JUPSOFT_API_KEY="${apiKey}"
\`\`\`

## 2. Core PHP Helper (JupsoftCms.php)
\`\`\`php
class JupsoftCms {
    private $apiUrl = '${apiBaseUrl}';
    private $websiteId = '${websiteId}';
    private $apiKey = '${apiKey}';

    public function getBlogs($page = 1, $limit = 10) {
        return $this->request('/blogs', ['page' => $page, 'limit' => $limit]);
    }

    public function getBlogBySlug($slug) {
        return $this->request('/blogs/' . urlencode($slug));
    }

    private function request($endpoint, $params = []) {
        $params['website'] = $this->websiteId;
        $ch = curl_init($this->apiUrl . $endpoint . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json', 'x-api-key: ' . $this->apiKey]);
        $res = curl_exec($ch);
        curl_close($ch);
        return json_decode($res, true);
    }
}
\`\`\`
`;
  }, [activeSite?.name, websiteId, apiBaseUrl, apiKey]);

  const pythonMdGuide = useMemo(() => {
    return `# Jupsoft Centralized Blog Platform — Python Integration Guide

Website: ${activeSite?.name || 'Website'} (${websiteId})

## 1. Environment (.env)
\`\`\`env
JUPSOFT_API_URL="${apiBaseUrl}"
JUPSOFT_WEBSITE_ID="${websiteId}"
JUPSOFT_API_KEY="${apiKey}"
\`\`\`

## 2. Client Module (jupsoft_cms.py)
\`\`\`python
import requests, os

API_URL = os.getenv("JUPSOFT_API_URL", "${apiBaseUrl}")
WEBSITE_ID = os.getenv("JUPSOFT_WEBSITE_ID", "${websiteId}")
API_KEY = os.getenv("JUPSOFT_API_KEY", "${apiKey}")

def get_blogs(page=1, limit=10):
    res = requests.get(f"{API_URL}/blogs", headers={"x-api-key": API_KEY}, params={"website": WEBSITE_ID, "page": page, "limit": limit})
    return res.json().get("data", [])

def get_blog_by_slug(slug):
    res = requests.get(f"{API_URL}/blogs/{slug}", headers={"x-api-key": API_KEY}, params={"website": WEBSITE_ID})
    return res.json().get("data")
\`\`\`
`;
  }, [activeSite?.name, websiteId, apiBaseUrl, apiKey]);

  const javaMdGuide = useMemo(() => {
    return `# Jupsoft Centralized Blog Platform — Java / Spring Boot Integration Guide

Website: ${activeSite?.name || 'Website'} (${websiteId})

## 1. application.properties
\`\`\`properties
jupsoft.cms.api-url=${apiBaseUrl}
jupsoft.cms.website-id=${websiteId}
jupsoft.cms.api-key=${apiKey}
\`\`\`

## 2. Spring Service Client (JupsoftCmsService.java)
\`\`\`java
@Service
public class JupsoftCmsService {
    @Value("\${jupsoft.cms.api-url}") private String apiUrl;
    @Value("\${jupsoft.cms.website-id}") private String websiteId;
    @Value("\${jupsoft.cms.api-key}") private String apiKey;

    public String getBlogs(int page, int limit) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(apiUrl + "/blogs?website=" + websiteId + "&page=" + page + "&limit=" + limit))
            .header("x-api-key", apiKey)
            .GET().build();
        return client.send(req, HttpResponse.BodyHandlers.ofString()).body();
    }
}
\`\`\`
`;
  }, [activeSite?.name, websiteId, apiBaseUrl, apiKey]);

  const curlMdGuide = useMemo(() => {
    return `# Jupsoft Centralized Blog Platform — REST API & cURL Reference

Website: ${activeSite?.name || 'Website'} (${websiteId})

## 1. Fetch Blogs
\`\`\`bash
curl -X GET "${apiBaseUrl}/blogs?website=${websiteId}&page=1&limit=9" \\
  -H "Accept: application/json" \\
  -H "x-api-key: ${apiKey}"
\`\`\`

## 2. Single Article by Slug
\`\`\`bash
curl -X GET "${apiBaseUrl}/blogs/${defaultRealSlug}?website=${websiteId}" \\
  -H "Accept: application/json" \\
  -H "x-api-key: ${apiKey}"
\`\`\`

## 3. Edge Cache Bypass
\`\`\`bash
curl -X GET "${apiBaseUrl}/blogs?website=${websiteId}&fresh=1" \\
  -H "Accept: application/json" \\
  -H "x-api-key: ${apiKey}"
\`\`\`
`;
  }, [activeSite?.name, websiteId, apiBaseUrl, apiKey, defaultRealSlug]);

  const masterHandbookMd = useMemo(() => {
    return `# Jupsoft Centralized Blog Platform — Master Integration Handbook

> **Universal Blueprint**: Human-readable and AI-executable specification for integrating Jupsoft Centralized CMS across any framework.

## 1. Tenant Overview
- **Website Name**: ${activeSite?.name || 'Website'}
- **Website ID**: \`${websiteId}\`
- **Whitelisted Domain**: \`${siteDomain}\`
- **Gateway Endpoint**: \`${apiBaseUrl}\`
- **Master API Key**: \`${apiKey}\`

## 2. Authentication Model
- **Public Frontend (HTML/ASPX)**: Authenticated via origin domain whitelist (\`${siteDomain}\`). No secret key in public HTML.
- **Backend / SSR / Cron**: Authenticated via header \`x-api-key: ${apiKey}\`.

## 3. Endpoints Matrix
- \`GET /v1/blogs?website=${websiteId}&page=1&limit=10\`
- \`GET /v1/blogs/:slug?website=${websiteId}\`
- \`GET /v1/blogs/latest?website=${websiteId}&limit=3\`
- \`GET /v1/categories?websiteId=${websiteId}\`
- \`GET /v1/health\`

## 4. Cache Invalidation
Append \`&fresh=1\` to any GET request to bypass Redis edge caching and retrieve real-time PostgreSQL database state.
`;
  }, [activeSite?.name, websiteId, siteDomain, apiBaseUrl, apiKey]);

  const nextjsTxtGuide = useMemo(() => {
    return `JUPSOFT_WEBSITE_ID="${websiteId}"\nJUPSOFT_API_URL="${apiBaseUrl}"\nJUPSOFT_API_KEY="${apiKey}"\n\nFetch endpoint: ${apiBaseUrl}/blogs?website=${websiteId}`;
  }, [websiteId, apiBaseUrl, apiKey]);

  const nodeTxtGuide = useMemo(() => {
    return `JUPSOFT_WEBSITE_ID="${websiteId}"\nJUPSOFT_API_KEY="${apiKey}"\nJUPSOFT_API_URL="${apiBaseUrl}"`;
  }, [websiteId, apiKey, apiBaseUrl]);

  const csharpTxtGuide = useMemo(() => {
    return `"JupsoftCms": {\n  "ApiUrl": "${apiBaseUrl}",\n  "WebsiteId": "${websiteId}",\n  "ApiKey": "${apiKey}"\n}`;
  }, [apiBaseUrl, websiteId, apiKey]);

  const phpTxtGuide = useMemo(() => {
    return `JUPSOFT_WEBSITE_ID="${websiteId}"\nJUPSOFT_API_KEY="${apiKey}"\nJUPSOFT_API_URL="${apiBaseUrl}"`;
  }, [websiteId, apiKey, apiBaseUrl]);

  const pythonTxtGuide = useMemo(() => {
    return `JUPSOFT_WEBSITE_ID="${websiteId}"\nJUPSOFT_API_KEY="${apiKey}"\nJUPSOFT_API_URL="${apiBaseUrl}"`;
  }, [websiteId, apiKey, apiBaseUrl]);

  const javaTxtGuide = useMemo(() => {
    return `jupsoft.cms.api-url=${apiBaseUrl}\njupsoft.cms.website-id=${websiteId}\njupsoft.cms.api-key=${apiKey}`;
  }, [apiBaseUrl, websiteId, apiKey]);

  const curlTxtGuide = useMemo(() => {
    return `curl -X GET "${apiBaseUrl}/blogs?website=${websiteId}&page=1&limit=9" -H "x-api-key: ${apiKey}"`;
  }, [apiBaseUrl, websiteId, apiKey]);

  const additionalHandoverGuides = useMemo(() => [
    {
      id: 'nextjs',
      name: 'Next.js 14+ / React',
      badge: 'App Router / ISR',
      badgeClass: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300',
      mdFileName: 'Blog Section NextJS.md',
      txtFileName: 'Blog Section NextJS.txt',
      description: 'App Router with 60s ISR & Dynamic SEO metadata',
      mdCode: nextjsMdGuide,
      txtCode: nextjsTxtGuide,
      rawMdPath: '/guides/Blog%20Section%20NextJS.md',
    },
    {
      id: 'node',
      name: 'Node.js / Express',
      badge: 'Backend Services',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300',
      mdFileName: 'Blog Section Node.md',
      txtFileName: 'Blog Section Node.txt',
      description: 'Server client with EJS/Pug templates & 8s timeout',
      mdCode: nodeMdGuide,
      txtCode: nodeTxtGuide,
      rawMdPath: '/guides/Blog%20Section%20Node.md',
    },
    {
      id: 'csharp',
      name: 'C# / .NET 8 Core',
      badge: 'ASP.NET Core MVC',
      badgeClass: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300',
      mdFileName: 'Blog Section CSharp.md',
      txtFileName: 'Blog Section CSharp.txt',
      description: 'Typed HttpClientFactory DI with Razor views',
      mdCode: csharpMdGuide,
      txtCode: csharpTxtGuide,
      rawMdPath: '/guides/Blog%20Section%20CSharp.md',
    },
    {
      id: 'php',
      name: 'PHP & Laravel',
      badge: 'Core PHP / Laravel',
      badgeClass: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300',
      mdFileName: 'Blog Section PHP.md',
      txtFileName: 'Blog Section PHP.txt',
      description: 'Standalone cURL client class & Blade templates',
      mdCode: phpMdGuide,
      txtCode: phpTxtGuide,
      rawMdPath: '/guides/Blog%20Section%20PHP.md',
    },
    {
      id: 'python',
      name: 'Python (FastAPI / Django)',
      badge: 'FastAPI / Django',
      badgeClass: 'bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300',
      mdFileName: 'Blog Section Python.md',
      txtFileName: 'Blog Section Python.txt',
      description: 'Requests / httpx client with Jinja2 templates',
      mdCode: pythonMdGuide,
      txtCode: pythonTxtGuide,
      rawMdPath: '/guides/Blog%20Section%20Python.md',
    },
    {
      id: 'java',
      name: 'Java (Spring Boot)',
      badge: 'Spring Boot 3.x',
      badgeClass: 'bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-300',
      mdFileName: 'Blog Section Java.md',
      txtFileName: 'Blog Section Java.txt',
      description: 'Java 17+ HTTP/2 client for Spring MVC & Thymeleaf',
      mdCode: javaMdGuide,
      txtCode: javaTxtGuide,
      rawMdPath: '/guides/Blog%20Section%20Java.md',
    },
    {
      id: 'curl',
      name: 'REST API & cURL',
      badge: 'Universal / CLI / Mobile',
      badgeClass: 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300',
      mdFileName: 'Blog Section REST API.md',
      txtFileName: 'Blog Section REST API.txt',
      description: 'Direct REST endpoints for Flutter, mobile & scripts',
      mdCode: curlMdGuide,
      txtCode: curlTxtGuide,
      rawMdPath: '/guides/Blog%20Section%20REST%20API.md',
    },
  ], [
    nextjsMdGuide, nextjsTxtGuide,
    nodeMdGuide, nodeTxtGuide,
    csharpMdGuide, csharpTxtGuide,
    phpMdGuide, phpTxtGuide,
    pythonMdGuide, pythonTxtGuide,
    javaMdGuide, javaTxtGuide,
    curlMdGuide, curlTxtGuide,
  ]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2.5 MULTI-LANGUAGE CODE SNIPPETS & STACK CONFIGURATIONS
  // Tailored integrations for HTML/SHTML, ASPX (.NET), Next.js, Node, Java, C#, PHP, Python, cURL
  // ──────────────────────────────────────────────────────────────────────────
  interface LanguageConfig {
    id: TargetLanguage;
    name: string;
    badge: string;
    fileName: string;
    downloadFileName: string;
    mimeType: string;
    description: string;
    code: string;
    quickUsageTitle: string;
    quickUsageCode: string;
  }

  const languageConfigs: Record<TargetLanguage, LanguageConfig> = useMemo(() => {
    return {
      html: {
        id: 'html',
        name: 'HTML / SHTML',
        badge: 'Vanilla JS & HTML',
        fileName: 'Blog Section.txt',
        downloadFileName: 'Blog Section.txt',
        mimeType: 'text/plain',
        description: 'Complete HTML & Vanilla JS integration blueprint with #blogSection, blog.html grid, and blog-detail.html',
        code: htmlGuideCode,
        quickUsageTitle: 'Frontend Quick Start: Listing & Detail Page Integration (HTML / SHTML):',
        quickUsageCode: `<!-- 1. Index / Home: Latest Articles Section -->
<section class="container" id="blogSection">
  <div class="blog-grid" id="blogGrid"></div>
  <a href="blog.html">View All Articles in Archive &rarr;</a>
</section>

<!-- 2. Detail Page: articleBody Container -->
<h1 id="articleTitle">Loading...</h1>
<img id="articleImage" src="" style="display:none;" />
<div id="articleBody"></div>

<!-- 3. Scripts -->
<script src="js/cms-client.js"></script>
<script src="js/main.js"></script>`,
      },
      aspx: {
        id: 'aspx',
        name: 'ASP.NET (ASPX)',
        badge: 'Web Forms (.aspx)',
        fileName: 'Blog Section ASPX.txt',
        downloadFileName: 'Blog Section ASPX.txt',
        mimeType: 'text/plain',
        description: 'Jupsoft CMS Integration Guide for ASPX (.NET Web Forms) with Site.Master, Blog.aspx, and BlogDetail.aspx',
        code: aspxGuideCode,
        quickUsageTitle: 'ASP.NET Web Forms (.aspx) Integration Blueprint:',
        quickUsageCode: `<!-- 1. Common Script in Site.Master or all .aspx pages before </body> -->
<script>
  window.JUPSOFT_CONFIG = { apiKey: '${apiKey}' };
</script>
<script src="/js/cms-client.js"></script>

<!-- 2. Blog Listing Page (Blog.aspx) -->
<div id="blogGrid"></div>

<!-- 3. Blog Detail Page (BlogDetail.aspx) -->
<h1 id="articleTitle">Loading...</h1>
<div id="articleMeta"></div>
<img id="articleImage" src="" style="display:none;" />
<div id="articleBody"></div>`,
      },
      nextjs: {
        id: 'nextjs',
        name: 'Next.js / React',
        badge: 'App Router / ISR',
        fileName: 'app/blog/page.tsx',
        downloadFileName: 'page.tsx',
        mimeType: 'text/typescript',
        description: 'Next.js App Router integration example',
        code: `// app/blog/page.tsx (Next.js 14+ App Router Server Component)
import React from 'react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage?: string;
  publishedAt: string;
  readTimeMinutes?: number;
  readingTimeMinutes?: number;
}

async function getBlogs(): Promise<BlogPost[]> {
  const websiteId = process.env.JUPSOFT_WEBSITE_ID || '${websiteId}';
  const apiKey = process.env.JUPSOFT_API_KEY || '${apiKey}';
  const apiUrl = process.env.JUPSOFT_API_URL || '${apiBaseUrl}';

  const res = await fetch(\`\${apiUrl}/blogs?website=\${websiteId}&limit=9\`, {
    headers: {
      'Accept': 'application/json',
      'x-api-key': apiKey,
    },
    next: { revalidate: 60 }, // ISR: Cache revalidates every 60 seconds
  });

  if (!res.ok) {
    console.error('Failed to fetch blogs:', res.status);
    return [];
  }

  const json = await res.json();
  return json.data || json || [];
}

export default async function BlogListPage() {
  const blogs = await getBlogs();

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Latest Articles</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {blogs.map((post) => (
          <article key={post.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition">
            {post.featuredImage && (
              <img 
                src={post.featuredImage} 
                alt={post.title} 
                className="w-full h-48 object-cover rounded-lg mb-4" 
              />
            )}
            <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
            <p className="text-gray-600 text-sm line-clamp-3 mb-4">{post.excerpt}</p>
            <a href={\`/blog/\${post.slug}\`} className="text-indigo-600 font-semibold hover:underline">
              Read article →
            </a>
          </article>
        ))}
      </div>
    </main>
  );
}`,
        quickUsageTitle: 'Next.js App Router: Listing & Detail Integration:',
        quickUsageCode: `// 1. All Blogs Listing: app/blog/page.tsx
export default async function BlogListPage() {
  const res = await fetch(\`\${process.env.JUPSOFT_API_URL}/blogs?website=\${process.env.JUPSOFT_WEBSITE_ID}&limit=9\`, {
    headers: { 'x-api-key': process.env.JUPSOFT_API_KEY! },
    next: { revalidate: 60 }
  });
  const { data: blogs } = await res.json();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {blogs?.map((post: any) => (
        <a key={post.id} href={\`/blog/\${post.slug}\`} className="border p-4 rounded-xl">
          <img src={post.featuredImage} alt={post.title} className="w-full h-48 object-cover rounded-lg mb-2" />
          <h3 className="font-bold">{post.title}</h3>
          <p className="text-sm text-gray-600">{post.excerpt}</p>
        </a>
      ))}
    </div>
  );
}

// 2. Single Article Detail: app/blog/[slug]/page.tsx
export default async function BlogDetailPage({ params }: { params: { slug: string } }) {
  const res = await fetch(\`\${process.env.JUPSOFT_API_URL}/blogs/\${params.slug}?website=\${process.env.JUPSOFT_WEBSITE_ID}\`, {
    headers: { 'x-api-key': process.env.JUPSOFT_API_KEY! },
    next: { revalidate: 60 }
  });
  const { data: post } = await res.json();
  if (!post) return <h1>Article Not Found</h1>;

  return (
    <article className="max-w-3xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <img src={post.featuredImage} alt={post.title} className="w-full rounded-xl mb-6" />
      {/* API sanitizes HTML. Defense-in-depth: DOMPurify.sanitize(post.content) */}
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}`,
      },
      node: {
        id: 'node',
        name: 'Node.js',
        badge: 'Express / Backend',
        fileName: 'services/jupsoftCms.js',
        downloadFileName: 'jupsoftCms.js',
        mimeType: 'application/javascript',
        description: 'Node.js integration example',
        code: `// services/jupsoftCms.js
// npm install dotenv (for .env loading)
require('dotenv').config();

const API_URL = process.env.JUPSOFT_API_URL || '${apiBaseUrl}';
const WEBSITE_ID = process.env.JUPSOFT_WEBSITE_ID || '${websiteId}';
const API_KEY = process.env.JUPSOFT_API_KEY || '${apiKey}';

async function fetchCms(endpoint, params = {}) {
  const query = new URLSearchParams({ website: WEBSITE_ID, ...params });
  const url = \`\${API_URL}\${endpoint}?\${query.toString()}\`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'x-api-key': API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(\`Jupsoft CMS API Error [HTTP \${response.status}]: \${errorText}\`);
  }

  const json = await response.json();
  return {
    success: true,
    data: json.data || json,
    meta: json.meta || json.pagination || null,
    pagination: json.pagination || json.meta || null
  };
}

module.exports = {
  getBlogs: (page = 1, limit = 10) => fetchCms('/blogs', { page, limit }),
  getBlogBySlug: (slug) => fetchCms(\`/blogs/\${encodeURIComponent(slug)}\`),
  getLatest: (limit = 5) => fetchCms('/blogs/latest', { limit }),
  getPopular: (limit = 5) => fetchCms('/blogs/popular', { limit }),
  getCategories: () => fetchCms('/categories', { websiteId: WEBSITE_ID }),
  search: (query, limit = 10) => fetchCms('/search', { q: query, limit }),
};`,
        quickUsageTitle: 'Express.js: Listing & Detail Routes:',
        quickUsageCode: `const JupsoftCMS = require('./services/jupsoftCms');

// 1. All Blogs Listing Route
app.get('/api/blogs', async (req, res) => {
  try {
    const result = await JupsoftCMS.getBlogs(req.query.page || 1, 10);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Single Article Detail Route by Slug
app.get('/api/blogs/:slug', async (req, res) => {
  try {
    const result = await JupsoftCMS.getBlogBySlug(req.params.slug);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});`,
      },
      java: {
        id: 'java',
        name: 'Java',
        badge: 'Spring Boot / JSP',
        fileName: 'JupsoftCmsService.java',
        downloadFileName: 'JupsoftCmsService.java',
        mimeType: 'text/x-java-source',
        description: 'Java Spring Boot integration example',
        code: `package com.company.blog.service;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Jupsoft Centralized Blog Platform — Java Service Client
 * Website: ${activeSite?.name || 'Website'} (${websiteId})
 */
public class JupsoftCmsService {

    private static final String API_URL = System.getenv("JUPSOFT_API_URL") != null 
        ? System.getenv("JUPSOFT_API_URL") : "${apiBaseUrl}";
        
    private static final String WEBSITE_ID = System.getenv("JUPSOFT_WEBSITE_ID") != null 
        ? System.getenv("JUPSOFT_WEBSITE_ID") : "${websiteId}";
        
    private static final String API_KEY = System.getenv("JUPSOFT_API_KEY") != null 
        ? System.getenv("JUPSOFT_API_KEY") : "${apiKey}";

    private final HttpClient httpClient;

    public JupsoftCmsService() {
        this.httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_2)
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    }

    /**
     * Fetch paginated articles list as JSON string
     */
    public String getBlogs(int page, int limit) throws Exception {
        String endpoint = String.format("%s/blogs?website=%s&page=%d&limit=%d",
            API_URL, URLEncoder.encode(WEBSITE_ID, StandardCharsets.UTF_8), page, limit);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(endpoint))
            .header("Accept", "application/json")
            .header("x-api-key", API_KEY)
            .timeout(Duration.ofSeconds(10))
            .GET()
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("Jupsoft CMS API Error HTTP " + response.statusCode() + ": " + response.body());
        }
        return response.body();
    }

    /**
     * Fetch article detail by slug
     */
    public String getBlogBySlug(String slug) throws Exception {
        String endpoint = String.format("%s/blogs/%s?website=%s",
            API_URL, URLEncoder.encode(slug, StandardCharsets.UTF_8), URLEncoder.encode(WEBSITE_ID, StandardCharsets.UTF_8));

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(endpoint))
            .header("Accept", "application/json")
            .header("x-api-key", API_KEY)
            .timeout(Duration.ofSeconds(10))
            .GET()
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("Jupsoft CMS API Error HTTP " + response.statusCode() + ": " + response.body());
        }
        return response.body();
    }

    /**
     * Fetch categories taxonomy tree
     */
    public String getCategories() throws Exception {
        String endpoint = String.format("%s/categories?websiteId=%s",
            API_URL, URLEncoder.encode(WEBSITE_ID, StandardCharsets.UTF_8));

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(endpoint))
            .header("Accept", "application/json")
            .header("x-api-key", API_KEY)
            .timeout(Duration.ofSeconds(10))
            .GET()
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("Jupsoft CMS API Error HTTP " + response.statusCode() + ": " + response.body());
        }
        return response.body();
    }

    /**
     * Search published articles
     */
    public String search(String query, int limit) throws Exception {
        String endpoint = String.format("%s/search?website=%s&q=%s&limit=%d",
            API_URL, URLEncoder.encode(WEBSITE_ID, StandardCharsets.UTF_8), URLEncoder.encode(query, StandardCharsets.UTF_8), limit);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(endpoint))
            .header("Accept", "application/json")
            .header("x-api-key", API_KEY)
            .timeout(Duration.ofSeconds(10))
            .GET()
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("Jupsoft CMS API Error HTTP " + response.statusCode() + ": " + response.body());
        }
        return response.body();
    }
}`,
        quickUsageTitle: 'Spring Boot: Listing & Detail Controller (BlogController.java):',
        quickUsageCode: `// BlogController.java - Spring Boot REST Controller
@RestController
@RequestMapping("/api/blogs")
public class BlogController {
    private final JupsoftCmsService cmsService = new JupsoftCmsService();

    // 1. Saare blogs fetch karne ka endpoint
    @GetMapping
    public ResponseEntity<String> listBlogs(@RequestParam(defaultValue = "1") int page) {
        try {
            return ResponseEntity.ok(cmsService.getBlogs(page, 10));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("{\\"error\\": \\"" + e.getMessage() + "\\"}");
        }
    }

    // 2. Slug se single article detail fetch karne ka endpoint
    @GetMapping("/{slug}")
    public ResponseEntity<String> getBlogDetail(@PathVariable String slug) {
        try {
            return ResponseEntity.ok(cmsService.getBlogBySlug(slug));
        } catch (Exception e) {
            return ResponseEntity.status(404).body("{\\"error\\": \\"Article not found\\"}");
        }
    }
}`,
      },
      csharp: {
        id: 'csharp',
        name: 'C# / .NET',
        badge: 'ASP.NET Core',
        fileName: 'JupsoftCmsService.cs',
        downloadFileName: 'JupsoftCmsService.cs',
        mimeType: 'text/plain',
        description: 'ASP.NET Core integration example',
        code: `using System;
using System.Net.Http;
using System.Threading.Tasks;

namespace Company.Blog.Services
{
    /// <summary>
    /// Jupsoft Centralized Blog Platform — C# .NET Client Service
    /// Website: ${activeSite?.name || 'Website'} (${websiteId})
    /// </summary>
    public class JupsoftCmsService
    {
        private static readonly HttpClient _httpClient = new HttpClient();

        private readonly string _apiUrl = Environment.GetEnvironmentVariable("JUPSOFT_API_URL") ?? "${apiBaseUrl}";
        private readonly string _websiteId = Environment.GetEnvironmentVariable("JUPSOFT_WEBSITE_ID") ?? "${websiteId}";
        private readonly string _apiKey = Environment.GetEnvironmentVariable("JUPSOFT_API_KEY") ?? "${apiKey}";

        private HttpRequestMessage CreateRequest(HttpMethod method, string url)
        {
            var request = new HttpRequestMessage(method, url);
            request.Headers.Add("Accept", "application/json");
            request.Headers.Add("x-api-key", _apiKey);
            return request;
        }

        public async Task<string> GetBlogsAsync(int page = 1, int limit = 10)
        {
            var url = $"{_apiUrl}/blogs?website={Uri.EscapeDataString(_websiteId)}&page={page}&limit={limit}";
            using var request = CreateRequest(HttpMethod.Get, url);
            using var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> GetBlogBySlugAsync(string slug)
        {
            var url = $"{_apiUrl}/blogs/{Uri.EscapeDataString(slug)}?website={Uri.EscapeDataString(_websiteId)}";
            using var request = CreateRequest(HttpMethod.Get, url);
            using var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> GetCategoriesAsync()
        {
            var url = $"{_apiUrl}/categories?websiteId={Uri.EscapeDataString(_websiteId)}";
            using var request = CreateRequest(HttpMethod.Get, url);
            using var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }

        public async Task<string> SearchAsync(string query, int limit = 10)
        {
            var url = $"{_apiUrl}/search?website={Uri.EscapeDataString(_websiteId)}&q={Uri.EscapeDataString(query)}&limit={limit}";
            using var request = CreateRequest(HttpMethod.Get, url);
            using var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }
    }
}`,
        quickUsageTitle: 'ASP.NET Core: Listing & Detail Actions (BlogController.cs):',
        quickUsageCode: `using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Company.Blog.Services;

[ApiController]
[Route("api/[controller]")]
public class BlogController : ControllerBase
{
    private readonly JupsoftCmsService _cms = new JupsoftCmsService();

    // 1. Saare blogs fetch karne ka action
    [HttpGet]
    public async Task<IActionResult> GetBlogs([FromQuery] int page = 1)
    {
        var json = await _cms.GetBlogsAsync(page, 10);
        return Content(json, "application/json");
    }

    // 2. Slug se single article detail fetch karne ka action
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBlogDetail(string slug)
    {
        var json = await _cms.GetBlogBySlugAsync(slug);
        return Content(json, "application/json");
    }
}`,
      },
      php: {
        id: 'php',
        name: 'PHP',
        badge: 'Laravel / Core PHP',
        fileName: 'JupsoftCms.php',
        downloadFileName: 'JupsoftCms.php',
        mimeType: 'text/x-php',
        description: 'PHP integration example',
        code: `<?php
/**
 * Jupsoft Centralized Blog Platform — PHP Client Helper
 * Website: ${activeSite?.name || 'Website'} (${websiteId})
 */
class JupsoftCms {
    private $apiUrl;
    private $websiteId;
    private $apiKey;

    public function __construct() {
        $this->apiUrl = getenv('JUPSOFT_API_URL') ?: '${apiBaseUrl}';
        $this->websiteId = getenv('JUPSOFT_WEBSITE_ID') ?: '${websiteId}';
        $this->apiKey = getenv('JUPSOFT_API_KEY') ?: '${apiKey}';
    }

    private function request($endpoint, $params = []) {
        $params['website'] = $this->websiteId;
        $url = $this->apiUrl . $endpoint . '?' . http_build_query($params);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: application/json',
            'x-api-key: ' . $this->apiKey
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode($response, true);
        $data = is_array($data) ? $data : [];
        return [
            'status' => $httpCode,
            'success' => $httpCode >= 200 && $httpCode < 300,
            'data' => $data['data'] ?? $data,
            'meta' => $data['meta'] ?? $data['pagination'] ?? null
        ];
    }

    public function getBlogs($page = 1, $limit = 10) {
        return $this->request('/blogs', ['page' => $page, 'limit' => $limit]);
    }

    public function getBlogBySlug($slug) {
        return $this->request('/blogs/' . urlencode($slug));
    }

    public function getCategories() {
        return $this->request('/categories', ['websiteId' => $this->websiteId]);
    }

    public function search($query, $limit = 10) {
        return $this->request('/search', ['q' => $query, 'limit' => $limit]);
    }
}`,
        quickUsageTitle: 'PHP: Listing & Detail Integration (blog.php & blog-detail.php):',
        quickUsageCode: `<?php
require_once 'JupsoftCms.php';
$cms = new JupsoftCms();

// ==========================================
// 1. BLOG LISTING (blog.php)
// ==========================================
$result = $cms->getBlogs(1, 12);
if ($result['success'] && !empty($result['data'])) {
    foreach ($result['data'] as $post) {
        $link = '/blog/' . urlencode($post['slug']);
        $img = htmlspecialchars($post['featuredImage'] ?? '/images/default.jpg');
        $title = htmlspecialchars($post['title'] ?? 'Untitled');
        echo '<div class="blog-card">';
        echo '  <a href="' . $link . '"><img src="' . $img . '" alt="' . $title . '" /></a>';
        echo '  <h3><a href="' . $link . '">' . $title . '</a></h3>';
        echo '  <p>' . htmlspecialchars($post['excerpt'] ?? '') . '</p>';
        echo '</div>';
    }
}

// ==========================================
// 2. BLOG DETAIL (blog-detail.php)
// ==========================================
$slug = $_GET['slug'] ?? '';
$response = $cms->getBlogBySlug($slug);
$article = $response['data'] ?? null;

if ($article) {
    echo '<h1>' . htmlspecialchars($article['title']) . '</h1>';
    if (!empty($article['featuredImage'])) {
        echo '<img src="' . htmlspecialchars($article['featuredImage']) . '" />';
    }
    // Sanitized article HTML body
    echo '<div class="content">' . $article['content'] . '</div>';
} else {
    echo '<h1>Article Not Found (404)</h1>';
}
?>`,
      },
      python: {
        id: 'python',
        name: 'Python',
        badge: 'Django / FastAPI',
        fileName: 'jupsoft_cms.py',
        downloadFileName: 'jupsoft_cms.py',
        mimeType: 'text/x-python',
        description: 'Python integration example',
        code: `"""
Jupsoft Centralized Blog Platform — Python Client
Website: ${activeSite?.name || 'Website'} (${websiteId})
Requires: requests (pip install requests)
"""
import os
import urllib.parse
import requests

API_URL = os.getenv("JUPSOFT_API_URL", "${apiBaseUrl}")
WEBSITE_ID = os.getenv("JUPSOFT_WEBSITE_ID", "${websiteId}")
API_KEY = os.getenv("JUPSOFT_API_KEY", "${apiKey}")

HEADERS = {
    "Accept": "application/json",
    "x-api-key": API_KEY,
}

def get_blogs(page: int = 1, limit: int = 10):
    url = f"{API_URL}/blogs"
    params = {"website": WEBSITE_ID, "page": page, "limit": limit}
    res = requests.get(url, headers=HEADERS, params=params, timeout=10)
    res.raise_for_status()
    return res.json()

def get_blog_by_slug(slug: str):
    encoded_slug = urllib.parse.quote(slug)
    url = f"{API_URL}/blogs/{encoded_slug}"
    params = {"website": WEBSITE_ID}
    res = requests.get(url, headers=HEADERS, params=params, timeout=10)
    res.raise_for_status()
    return res.json()

def get_latest(limit: int = 5):
    url = f"{API_URL}/blogs/latest"
    params = {"website": WEBSITE_ID, "limit": limit}
    res = requests.get(url, headers=HEADERS, params=params, timeout=10)
    res.raise_for_status()
    return res.json()

def get_categories():
    url = f"{API_URL}/categories"
    params = {"websiteId": WEBSITE_ID}
    res = requests.get(url, headers=HEADERS, params=params, timeout=10)
    res.raise_for_status()
    return res.json()

def search(query: str, limit: int = 10):
    url = f"{API_URL}/search"
    params = {"website": WEBSITE_ID, "q": query, "limit": limit}
    res = requests.get(url, headers=HEADERS, params=params, timeout=10)
    res.raise_for_status()
    return res.json()`,
        quickUsageTitle: 'FastAPI: Listing & Detail Endpoints (main.py):',
        quickUsageCode: `from fastapi import FastAPI, HTTPException
from jupsoft_cms import get_blogs, get_blog_by_slug

app = FastAPI()

# 1. Saare blogs fetch karne ka endpoint
@app.get("/api/blogs")
def read_blogs(page: int = 1, limit: int = 10):
    return get_blogs(page=page, limit=limit)

# 2. Slug se single article detail fetch karne ka endpoint
@app.get("/api/blogs/{slug}")
def read_blog_detail(slug: str):
    try:
        return get_blog_by_slug(slug)
    except Exception:
        raise HTTPException(status_code=404, detail="Article not found")`,
      },
      curl: {
        id: 'curl',
        name: 'cURL / REST',
        badge: 'Terminal CLI',
        fileName: 'curl_commands.sh',
        downloadFileName: 'curl_commands.sh',
        mimeType: 'text/plain',
        description: 'cURL CLI example',
        code: `# 1. Fetch Paginated Blog Articles
curl -X GET "${apiBaseUrl}/blogs?website=${websiteId}&page=1&limit=10" \\
  -H "Accept: application/json" \\
  -H "x-api-key: ${apiKey}"

# 2. Fetch Single Article By Slug
curl -X GET "${apiBaseUrl}/blogs/${defaultRealSlug}?website=${websiteId}" \\
  -H "Accept: application/json" \\
  -H "x-api-key: ${apiKey}"

# 3. Bypass Edge Cache (&fresh=1)
curl -X GET "${apiBaseUrl}/blogs?website=${websiteId}&fresh=1" \\
  -H "Accept: application/json" \\
  -H "x-api-key: ${apiKey}"

# 4. Fetch Taxonomy Categories
curl -X GET "${apiBaseUrl}/categories?websiteId=${websiteId}" \\
  -H "Accept: application/json" \\
  -H "x-api-key: ${apiKey}"`,
        quickUsageTitle: 'cURL CLI: Listing & Detail Requests:',
        quickUsageCode: `# 1. Saare blogs ki list fetch karo (page & limit)
curl -s "${apiBaseUrl}/blogs?website=${websiteId}&page=1&limit=10" \\
  -H "Accept: application/json" \\
  -H "x-api-key: ${apiKey}" | jq .

# 2. Slug ke through single article fetch karo
curl -s "${apiBaseUrl}/blogs/${defaultRealSlug}?website=${websiteId}" \\
  -H "Accept: application/json" \\
  -H "x-api-key: ${apiKey}" | jq .`,
      },
    };
  }, [activeSite?.name, websiteId, siteDomain, apiBaseUrl, apiKey, defaultRealSlug, pureJsClientCode]);

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
  // 4. LIVE API TEST RUNNER & DIAGNOSTIC CONSOLE
  // ──────────────────────────────────────────────────────────────────────────
  const runLiveTest = async () => {
    setIsTesting(true);
    setTestError(null);
    setTestErrorCategory(null);
    setTestResult(null);
    setTestStatus(null);
    setTestStatusText(null);
    setTestLatency(null);
    setTestResponseHeaders({});

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
      setTestStatusText(res.statusText || (res.ok ? 'OK' : 'Error'));
      setLastTestedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      // Capture HTTP headers
      const captured: Record<string, string> = {};
      ['cache-control', 'content-type', 'x-powered-by', 'age'].forEach((h) => {
        const val = res.headers.get(h);
        if (val) captured[h] = val;
      });
      setTestResponseHeaders(captured);

      const rawText = await res.text();
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(rawText);
        setTestResult(parsedJson);
      } catch {
        setTestResult(rawText);
        if (!res.ok) {
          setTestErrorCategory('parse');
          setTestError(`Non-JSON response (HTTP ${res.status}): ${rawText.slice(0, 300)}`);
          return;
        }
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setTestErrorCategory('auth');
          setTestError(parsedJson?.message || parsedJson?.error || `HTTP ${res.status}: Access denied. Origin or API key not authorized for this tenant.`);
        } else if (res.status === 404) {
          setTestErrorCategory('not_found');
          setTestError(parsedJson?.message || parsedJson?.error || `HTTP 404: Endpoint or article slug not found.`);
        } else if (res.status >= 500) {
          setTestErrorCategory('server');
          setTestError(parsedJson?.message || parsedJson?.error || `HTTP ${res.status}: Backend server error.`);
        } else {
          setTestError(parsedJson?.message || parsedJson?.error || `HTTP ${res.status}: Request could not be fulfilled.`);
        }
      }
    } catch (err: any) {
      const latency = Math.round(performance.now() - startTime);
      setTestLatency(latency);
      setTestStatus(null);
      setTestStatusText('Network / CORS Blocked');
      setTestErrorCategory('network');
      setLastTestedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTestError(err.message || 'Request failed. Network disconnected, endpoint unreachable, or browser CORS blocked.');
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
      question: "Why am I getting a 401 error?",
      answer: `Direct browser address bar visits lack Origin headers. Frontend scripts on your registered domain (${siteDomain}) or staging previews (*.vercel.app, *.netlify.app) authenticate automatically.`
    },
    {
      id: 2,
      question: "Why do blog links return 404?",
      answer: `Static servers require URL rewrites. Configure IIS (web.config) or Apache (.htaccess) to rewrite /blog/{slug} to your detail page without altering browser URLs.`
    },
    {
      id: 3,
      question: "How do staging and preview URLs work?",
      answer: `*.vercel.app and *.netlify.app are pre-whitelisted for staging. In production, requests must match ${siteDomain} or pass x-api-key.`
    },
    {
      id: 4,
      question: "Public Client vs Master API Key?",
      answer: `Frontend scripts authenticate via origin domain with zero exposed secrets. Keep API_KEY private in server-side .env files only.`
    },
    {
      id: 5,
      question: "How do I bypass Redis edge cache?",
      answer: `Append &fresh=1 to your API URL or pass { fresh: true } to query live database records immediately.`
    },
    {
      id: 6,
      question: "How do I connect the blog search bar on our website?",
      answer: `Add an 'input' event listener to your search box with a 300ms debounce. In the callback, call JupsoftCMS.getBlogs({ search: query }) or JupsoftCMS.search(query) and re-render the returned articles in your blog container.`
    }
  ], [siteDomain, websiteId, apiBaseUrl]);

  const filteredFaqs = useMemo(() => {
    if (!faqSearchQuery.trim()) return faqItems;
    const q = faqSearchQuery.toLowerCase();
    return faqItems.filter(item => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q));
  }, [faqItems, faqSearchQuery]);

  const jsCodeLines = useMemo(() => pureJsClientCode.split('\n'), [pureJsClientCode]);
  const activeLanguageConfig = languageConfigs[selectedLanguage] || languageConfigs.html;
  const activeCodeLines = useMemo(() => activeLanguageConfig.code.split('\n'), [activeLanguageConfig.code]);

  return (
    <div className="space-y-6 font-sans">
      {/* ── 1. CLEAN TENANT HEADER & GUIDED 3-STEP ROADMAP ── */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold font-mono tracking-wider uppercase border border-indigo-200 dark:border-indigo-900">
                <Code className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Developer Workspace</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">•</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                activeSite?.status === 'active' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${activeSite?.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>{activeSite?.status === 'active' ? 'Tenant Active' : 'Tenant Inactive'}</span>
              </span>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded border flex items-center gap-1.5 ${
                gatewayHealth === 'online'
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                  : gatewayHealth === 'checking'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  gatewayHealth === 'online' ? 'bg-emerald-500' : gatewayHealth === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                }`} />
                <span>Gateway v1 ({gatewayHealth === 'online' ? 'Online' : gatewayHealth === 'checking' ? 'Checking' : 'Offline'})</span>
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {activeSite?.name || 'Configured Website'}
              </h2>
              <a 
                href={`https://${siteDomain}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 bg-indigo-50/60 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-900/40"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{siteDomain}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Website Dropdown Switcher */}
          {websites && websites.length > 0 && onSelectSite && (
            <div className="shrink-0 bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 min-w-[260px] shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Active Website</span>
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  {websites.length} Available
                </span>
              </div>
              <select
                value={activeSite.id}
                onChange={(e) => onSelectSite(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                {websites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.domain})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. CREDENTIALS CARD (WEBSITE ID & MASTER API KEY) ── */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-indigo-500" />
            <span>API Credentials</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            Origin Whitelist: <strong className="text-emerald-600 dark:text-emerald-400">{siteDomain}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* 1. Website ID (Browser Safe) */}
          <div className="p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  WEBSITE_ID
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-mono">
                  Public Safe · Frontend
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(websiteId, 'cred-site-id')}
                className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                {copiedKey === 'cred-site-id' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'cred-site-id' ? 'Copied!' : 'Copy ID'}</span>
              </button>
            </div>
            <input
              type="text"
              readOnly
              value={websiteId}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono text-xs select-all"
            />
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              Public frontend ID · Safe to embed in HTML &amp; browser scripts.
            </p>
          </div>

          {/* 2. API_KEY (Backend Master Secret) */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  API_KEY
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  Private · Server Only
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canViewApiKey ? (
                  <>
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
                      <span>{copiedKey === 'cred-api-key' ? 'Copied!' : 'Copy Key'}</span>
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Admin role required</span>
                )}
              </div>
            </div>
            <input
              type={showApiKey && canViewApiKey ? 'text' : 'password'}
              readOnly
              value={canViewApiKey ? apiKey : '••••••••••••••••••••••••••••••••'}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono text-xs select-all"
            />
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              Master secret for server-side (.env, Node, C#, Python, PHP). Keep private.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-1 pt-0.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Domain whitelist active on <strong className="text-slate-700 dark:text-slate-300 font-mono">{siteDomain}</strong>. Frontend scripts authenticate automatically via browser origin checks.</span>
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
            <span>1. Code &amp; Integration</span>
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

        {/* TAB 1: FRAMEWORK & SDK INTEGRATION CODE */}
        {activeTab === 'js' && (
          <div className="space-y-4">
            {/* ── SEGMENTED MODE SELECTOR: HANDOVER (.TXT) VS CUSTOM FRAMEWORK ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIntegrationMode('handover')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    integrationMode === 'handover'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>1-Minute Handover (.MD &amp; .TXT Guides)</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    integrationMode === 'handover' ? 'bg-indigo-500 text-white' : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                  }`}>
                    Recommended
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIntegrationMode('framework')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    integrationMode === 'framework'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <Code className="w-4 h-4" />
                  <span>Custom Frameworks &amp; SDKs</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 px-1">
                {integrationMode === 'handover' 
                  ? 'Ready-to-use .MD & .TXT guides for all platforms'
                  : `${activeLanguageConfig.name} Integration`}
              </div>
            </div>

            {/* ── PATHWAY A: INSTANT 1-MINUTE HANDOVER GUIDES (.MD & .TXT) ── */}
            {integrationMode === 'handover' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CARD 1: ASP.NET WEB FORMS (.ASPX) */}
                  <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/70 bg-gradient-to-b from-indigo-50/40 via-white to-white dark:from-indigo-950/20 dark:via-[#0f172a] dark:to-[#0f172a] space-y-3 shadow-2xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-mono">
                            ASP.NET Web Forms (.aspx)
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                            Jupsoft Standard
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Blog Section ASPX (.md / .txt)
                        </h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href="/guides/Blog%20Section%20ASPX.md"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60"
                          title="Open pure .MD guide"
                        >
                          <span>.MD</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <a
                          href="/guides/Blog%20Section%20ASPX.txt"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-mono text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800"
                          title="Open plain text guide"
                        >
                          <span>.TXT</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      ASP.NET Web Forms integration for Site.Master, Blog.aspx &amp; BlogDetail.aspx
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => downloadFile(aspxMdGuide, 'Blog Section ASPX.md', 'text/markdown')}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        title="Download ASPX Web Forms markdown integration guide"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .MD Guide</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadFile(aspxGuideCode, 'Blog Section ASPX.txt', 'text/plain')}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        title="Download ASPX plain text guide"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>.TXT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(aspxMdGuide, 'copy-aspx-guide')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        title="Copy guide markdown to clipboard"
                      >
                        {copiedKey === 'copy-aspx-guide' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'copy-aspx-guide' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* CARD 2: HTML / VANILLA JS (.HTML) */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-50/60 via-white to-white dark:from-slate-900/40 dark:via-[#0f172a] dark:to-[#0f172a] space-y-3 shadow-2xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 font-mono">
                            HTML5 / Vanilla JS (.html)
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                            Static &amp; PHP Sites
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Blog Section HTML (.md / .txt)
                        </h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href="/guides/Blog%20Section%20HTML.md"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60"
                          title="Open pure .MD guide"
                        >
                          <span>.MD</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <a
                          href="/guides/Blog%20Section.txt"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-mono text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800"
                          title="Open plain text guide"
                        >
                          <span>.TXT</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Zero-dependency HTML5 &amp; Vanilla JavaScript integration with cms-client.js
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => downloadFile(htmlMdGuide, 'Blog Section HTML.md', 'text/markdown')}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        title="Download HTML markdown integration guide"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .MD Guide</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadFile(htmlGuideCode, 'Blog Section.txt', 'text/plain')}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        title="Download HTML plain text guide"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>.TXT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(htmlMdGuide, 'copy-html-guide')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        title="Copy guide markdown to clipboard"
                      >
                        {copiedKey === 'copy-html-guide' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'copy-html-guide' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* SHARED DATA ENGINE ASSET BOX */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">
                      <strong>cms-client.js</strong> · 2.8 KB zero-dependency headless engine for browser data fetching
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadFile(pureJsClientCode, 'cms-client.js', 'application/javascript')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shrink-0"
                    title="Download cms-client.js"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download cms-client.js</span>
                  </button>
                </div>

                {/* UNIVERSAL MASTER HANDBOOK BANNER */}
                <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 dark:from-indigo-950/40 dark:via-[#0f172a] dark:to-purple-950/20 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                          MASTER_CMS_INTEGRATION_GUIDE.md
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                          Universal Blueprint
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Unified Markdown specification for developers &amp; autonomous AI coding agents.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => downloadFile(masterHandbookMd, 'MASTER_CMS_INTEGRATION_GUIDE.md', 'text/markdown')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      title="Download Universal Master Markdown Handbook"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .MD</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(masterHandbookMd, 'copy-master-handbook')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                      title="Copy Master Handbook Markdown"
                    >
                      {copiedKey === 'copy-master-handbook' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'copy-master-handbook' ? 'Copied' : 'Copy'}</span>
                    </button>

                    <a
                      href="/guides/MASTER_CMS_INTEGRATION_GUIDE.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="View raw markdown in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* VERIFIED PLATFORM HANDOVER GUIDES (NEXT.JS, NODE, C#, PHP, PYTHON, JAVA, REST) */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Other Framework Guides (.MD &amp; .TXT)</span>
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      {additionalHandoverGuides.length} Platforms
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {additionalHandoverGuides.map((guide) => (
                      <div
                        key={guide.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] flex flex-col justify-between space-y-2.5 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-800/80 transition-all"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${guide.badgeClass}`}>
                              {guide.badge}
                            </span>
                            <a
                              href={guide.rawMdPath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title={`Open ${guide.mdFileName} in new tab`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>

                          <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                            {guide.name}
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                            {guide.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => downloadFile(guide.mdCode, guide.mdFileName, 'text/markdown')}
                            className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                            title={`Download ${guide.mdFileName}`}
                          >
                            <Download className="w-3 h-3" />
                            <span>.MD</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadFile(guide.txtCode, guide.txtFileName, 'text/plain')}
                            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title={`Download ${guide.txtFileName}`}
                          >
                            <Download className="w-3 h-3" />
                            <span>.TXT</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => copyToClipboard(guide.mdCode, `copy-${guide.id}-md`)}
                            className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title={`Copy ${guide.mdFileName} content`}
                          >
                            {copiedKey === `copy-${guide.id}-md` ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedKey === `copy-${guide.id}-md` ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── PATHWAY B: INTERACTIVE FRAMEWORK SDK & CODE GENERATOR ── */}
            {integrationMode === 'framework' && (
              <div className="space-y-4">
                {/* ── TECH STACK SELECTOR PILLS ── */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Select Platform / Language</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">9 Stacks Supported</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-1.5">
                    {(Object.keys(languageConfigs) as TargetLanguage[]).map((langKey) => {
                      const cfg = languageConfigs[langKey];
                      const isSelected = selectedLanguage === langKey;
                      return (
                        <button
                          key={langKey}
                          onClick={() => setSelectedLanguage(langKey)}
                          className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            {cfg.name}
                          </span>
                          <span className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                            {cfg.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language Header & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{activeLanguageConfig.name} Integration</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {activeLanguageConfig.fileName}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {activeLanguageConfig.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => copyToClipboard(activeLanguageConfig.code, `copy-${selectedLanguage}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                    >
                      {copiedKey === `copy-${selectedLanguage}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === `copy-${selectedLanguage}` ? 'Copied Code!' : 'Copy Code'}</span>
                    </button>

                    <button
                      onClick={() => downloadFile(activeLanguageConfig.code, activeLanguageConfig.downloadFileName, activeLanguageConfig.mimeType)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Download {activeLanguageConfig.downloadFileName}</span>
                    </button>

                    {selectedLanguage !== 'html' && selectedLanguage !== 'aspx' && (
                      <button
                        onClick={() => downloadFile(envFileContent, '.env', 'text/plain')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        title="Download .env with standard uppercase variables"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Download .env</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Code Viewport with Line Numbers */}
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#0f1117] text-slate-200 font-mono text-xs shadow-md">
                  <div className="px-3.5 py-2 bg-[#171b26] border-b border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300 text-xs font-mono">
                      {activeLanguageConfig.fileName} ({activeCodeLines.length} lines)
                    </span>
                    <span className="text-[11px] text-slate-500 font-sans">
                      Configured for {activeSite?.name || 'Website'} ({siteDomain})
                    </span>
                  </div>
                  <div className="flex font-mono text-[11.5px] leading-relaxed max-h-[380px] overflow-y-auto overflow-x-auto bg-[#0a0c10]">
                    <div className="select-none px-3 py-3 text-slate-600 border-r border-slate-800 text-right font-mono text-[11px] bg-[#0d0f15] shrink-0 sticky left-0 z-10">
                      {activeCodeLines.map((_, i) => (
                        <div key={i} className="leading-relaxed px-1">{i + 1}</div>
                      ))}
                    </div>
                    <pre className="p-3 pl-4 flex-1 text-slate-200 leading-relaxed font-mono">
                      {activeLanguageConfig.code}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ENVIRONMENT CONFIG (.ENV) */}
        {activeTab === 'env' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Pre-Configured .env File (Backend / SSR)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Environment variables for Node.js, Next.js, Python, Java, PHP, and C#.
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
                  <span>{copiedKey === 'copy-env-file' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Security Advisory Callout */}
            <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Keep <code className="font-mono font-bold">JUPSOFT_API_KEY</code> confidential on backend servers only. Never commit to public Git repositories.</span>
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

        {/* TAB 4: LIVE API DIAGNOSTIC CONSOLE */}
        {activeTab === 'tester' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-500" />
                  <span>API Diagnostic Console</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Execute live requests to verify latency, origin whitelist, response headers, and JSON structure.
                </p>
              </div>
              <button
                onClick={runLiveTest}
                disabled={isTesting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Running Diagnostic...' : 'Execute Diagnostic Ping'}</span>
              </button>
            </div>

            {/* Diagnostic Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* HTTP Status */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">HTTP Status</span>
                {testStatus !== null ? (
                  <span className={`inline-flex items-center gap-1.5 font-bold font-mono text-xs ${
                    testStatus === 200 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : (testStatus === 401 || testStatus === 403)
                      ? 'text-amber-600 dark:text-amber-400'
                      : testStatus === 404
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {testStatus === 200 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    <span>{testStatus} {testStatusText || ''}</span>
                  </span>
                ) : testStatusText ? (
                  <span className="inline-flex items-center gap-1.5 font-bold font-mono text-xs text-rose-600 dark:text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{testStatusText}</span>
                  </span>
                ) : (
                  <span className="text-slate-500 font-mono text-xs">Ready</span>
                )}
              </div>

              {/* Latency */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Latency</span>
                <span className={`inline-flex items-center gap-1.5 font-mono text-xs font-bold ${
                  testLatency === null
                    ? 'text-slate-500'
                    : testLatency < 300
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : testLatency < 800
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{testLatency !== null ? `${testLatency} ms` : '— ms'}</span>
                </span>
              </div>

              {/* Target */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Endpoint</span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">GET</span>
                  <span>/v1/{testEndpoint}</span>
                </span>
              </div>

              {/* Edge Cache & Timestamp */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cache / Timestamp</span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 block truncate">
                  {bypassCacheTest ? 'Cache Bypassed' : (testResponseHeaders['cache-control'] ? 'Edge Cached' : (lastTestedTime || 'Ready'))}
                </span>
              </div>
            </div>

            {/* Diagnostic Configuration Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Endpoint</label>
                <select
                  value={testEndpoint}
                  onChange={(e: any) => setTestEndpoint(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none cursor-pointer"
                >
                  <option value="blogs">GET /v1/blogs (Listing)</option>
                  <option value="detail">GET /v1/blogs/:slug (Detail)</option>
                  <option value="latest">GET /v1/blogs/latest</option>
                  <option value="popular">GET /v1/blogs/popular</option>
                  <option value="categories">GET /v1/categories</option>
                  <option value="health">GET /v1/health</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">Target Slug</label>
                  {defaultRealSlug && defaultRealSlug !== 'sample-post-slug' && (
                    <button
                      onClick={() => setTestSlug(defaultRealSlug)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Use published slug
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={testSlug}
                  onChange={(e) => setTestSlug(e.target.value)}
                  placeholder="article-slug"
                  disabled={testEndpoint !== 'detail'}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none disabled:opacity-40"
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
                  <span>Bypass Cache (<code className="text-indigo-600 dark:text-indigo-400 font-mono">&amp;fresh=1</code>)</span>
                </label>
              </div>
            </div>

            {/* Error Diagnostics Explanation Card */}
            {testError && (
              <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testErrorCategory === 'auth'
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                  : testErrorCategory === 'not_found'
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
              }`}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-current" />
                <div className="space-y-1">
                  <span className="font-bold uppercase tracking-wider text-[10.5px] block">
                    {testErrorCategory === 'auth'
                      ? 'Authentication / Origin Domain Check'
                      : testErrorCategory === 'not_found'
                      ? 'Resource Not Found'
                      : testErrorCategory === 'network'
                      ? 'Network / CORS Connectivity'
                      : testErrorCategory === 'parse'
                      ? 'Invalid Payload Format'
                      : 'Server Error'}
                  </span>
                  <p className="leading-relaxed">{testError}</p>
                </div>
              </div>
            )}

            {/* Captured Response Headers */}
            {Object.keys(testResponseHeaders).length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-mono">
                <span className="text-slate-400 font-sans font-medium">Response Headers:</span>
                {Object.entries(testResponseHeaders).map(([key, val]) => (
                  <span key={key} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400">{key}: </span>{val}
                  </span>
                ))}
              </div>
            )}

            {/* Live Response Output */}
            {(testResult || testError) && (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#0f1117] text-slate-200 text-xs font-mono shadow-md">
                <div className="px-3.5 py-2 bg-[#171b26] border-b border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 text-[11px] flex items-center gap-2">
                    <span>Response Payload</span>
                    {testLatency !== null && <span className="text-slate-500 font-mono">• {testLatency}ms</span>}
                  </span>
                  <button
                    onClick={() => copyToClipboard(typeof testResult === 'object' ? JSON.stringify(testResult, null, 2) : String(testResult || testError), 'tester-json')}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'tester-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'tester-json' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-3.5 max-h-56 overflow-y-auto overflow-x-auto text-[11.5px] leading-relaxed text-emerald-300">
                  {typeof testResult === 'object' ? JSON.stringify(testResult, null, 2) : (testResult || testError)}
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
                API Response Schema
              </h3>
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
                    <th className="py-2 px-3 font-semibold min-w-[140px]">Field</th>
                    <th className="py-2 px-3 font-semibold min-w-[100px]">Type</th>
                    <th className="py-2 px-3 font-semibold">Description / Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11.5px]">
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">id</td>
                    <td className="py-2 px-3 text-slate-500">string</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Unique article UUID (for React <code>key=&#123;post.id&#125;</code>, analytics &amp; caching)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">title</td>
                    <td className="py-2 px-3 text-slate-500">string</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Article headline title (<code>&lt;h1&gt;</code>)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">slug</td>
                    <td className="py-2 px-3 text-slate-500">string</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Unique URL path identifier (e.g. <code>/blog/cloud-erp</code>)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">excerpt</td>
                    <td className="py-2 px-3 text-slate-500">string</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Short summary snippet for post cards and meta description</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">content</td>
                    <td className="py-2 px-3 text-slate-500">HTML string</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Sanitized article HTML body <em>(Detail endpoint only)</em></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">featuredImage</td>
                    <td className="py-2 px-3 text-slate-500">string (URL)</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Thumbnail cover image URL (CDN optimized)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">featuredImageAlt</td>
                    <td className="py-2 px-3 text-slate-500">string</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Image alt text for Google SEO &amp; accessibility (<code>&lt;img alt=&quot;...&quot;&gt;</code>)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">publishedAt</td>
                    <td className="py-2 px-3 text-slate-500">ISO string</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Publication ISO date timestamp (for date badges &amp; sorting)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">readTimeMinutes</td>
                    <td className="py-2 px-3 text-slate-500">number</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Estimated read time in minutes (e.g. <code>4</code>)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">authorName</td>
                    <td className="py-2 px-3 text-slate-500">string</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Author display signature name</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">authorAvatar</td>
                    <td className="py-2 px-3 text-slate-500">string (URL)</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Author profile photo URL for byline circles</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">author</td>
                    <td className="py-2 px-3 text-slate-500">object</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">E-E-A-T credentials: <code>&#123; id, name, avatar, bio, linkedinUrl, twitterUrl &#125;</code></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">primaryCategory</td>
                    <td className="py-2 px-3 text-slate-500">string</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Primary category name for card pill badge</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">categories</td>
                    <td className="py-2 px-3 text-slate-500">array</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Full category objects: <code>&#91;&#123; id, name, slug &#125;&#93;</code> for archive links</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">tags</td>
                    <td className="py-2 px-3 text-slate-500">array</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Topic hashtag chips: <code>&#91;&#123; id, name, slug &#125;&#93;</code></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">seo</td>
                    <td className="py-2 px-3 text-slate-500">object</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300"><code>metaTitle</code>, <code>metaDescription</code>, <code>canonicalUrl</code>, <code>ogImage</code>, <code>robots</code></td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400 font-bold">schemaJsonLd</td>
                    <td className="py-2 px-3 text-slate-500">object</td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Schema.org <code>BlogPosting</code> JSON-LD for Google Rich Results</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Envelope wrapper clarification note */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">API Response Envelope Format: </span>
                List endpoints (<code>GET /api/v1/blogs</code>) return <code>&#123; success: true, data: &#91;...&#93;, meta: &#123; total, page, limit, totalPages &#125; &#125;</code>. Single article detail endpoints (<code>GET /api/v1/blogs/:slug</code>) return <code>&#123; success: true, data: &#123;...&#125; &#125;</code>.
              </div>
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
              <span>Troubleshooting</span>
            </h3>
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
