'use client';

import React, { useState, useMemo } from 'react';
import { Website, Blog } from '../../types';
import { 
  KeyRound, 
  Globe, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Terminal, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight, 
  Search, 
  Code2, 
  Hash, 
  ShieldCheck, 
  FileText, 
  Layers, 
  Database 
} from 'lucide-react';

export interface DeveloperWorkspaceV2Props {
  activeSite: Website;
  websites?: Website[];
  onSelectSite?: (siteId: string) => void;
  isSuperAdmin?: boolean;
  canViewApiKey?: boolean;
  blogs?: Blog[];
}

interface ApiParam {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
}

interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  title: string;
  description: string;
  category: 'Articles' | 'Taxonomy' | 'Search & SEO' | 'System';
  params: ApiParam[];
  sampleResponse: Record<string, any>;
  hasSlugParam?: boolean;
}

export const DeveloperWorkspaceV2: React.FC<DeveloperWorkspaceV2Props> = ({
  activeSite,
  websites = [],
  onSelectSite,
  canViewApiKey = true,
  blogs = [],
}) => {
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('list-blogs');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [codeSnippetTab, setCodeSnippetTab] = useState<'curl' | 'fetch' | 'axios'>('curl');

  // Interactive Live Request State
  const [testSlug, setTestSlug] = useState<string>('');
  const [isSendingRequest, setIsSendingRequest] = useState<boolean>(false);
  const [liveTestResponse, setLiveTestResponse] = useState<{
    status: number;
    latencyMs: number;
    data: any;
    error?: string;
  } | null>(null);

  const websiteId = activeSite?.id || 'site-jupsoft-test';
  const siteDomain = activeSite?.domain || 'jupsoft.com';
  const apiKey = (canViewApiKey && activeSite?.apiKey) ? activeSite.apiKey : 'jup_live_sec_your_api_key';
  const apiBaseUrl = 'https://blogary.jupsoft.com/v1';

  // Published blogs for realistic slug testing
  const publishedBlogs = useMemo(() => {
    return blogs.filter((b) => b.websiteId === activeSite.id && b.status === 'Published');
  }, [blogs, activeSite.id]);

  const defaultTestSlug = useMemo(() => {
    if (publishedBlogs.length > 0) {
      const first = publishedBlogs[0];
      const lang = activeSite.defaultLanguage || 'en';
      return first.translations[lang]?.slug || Object.values(first.translations)[0]?.slug || 'sample-article-slug';
    }
    return 'sample-article-slug';
  }, [publishedBlogs, activeSite.defaultLanguage]);

  const activeSlug = testSlug || defaultTestSlug;

  const copyToClipboard = (text: string, keyName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(keyName);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Enterprise API Endpoints Specification
  const endpoints: ApiEndpoint[] = useMemo(() => [
    {
      id: 'list-blogs',
      method: 'GET',
      path: '/v1/blogs',
      title: 'List Published Articles',
      description: 'Retrieve paginated, published articles for the tenant website. Ready for ISR and edge caching.',
      category: 'Articles',
      params: [
        { name: 'website', type: 'string', required: true, default: websiteId, description: 'Target website identifier (tenant scope).' },
        { name: 'lang', type: 'string', required: false, default: activeSite.defaultLanguage || 'en', description: 'Language code (e.g. en, hi, fr, ar).' },
        { name: 'page', type: 'number', required: false, default: '1', description: 'Page number for pagination.' },
        { name: 'limit', type: 'number', required: false, default: '10', description: 'Maximum articles per page (max: 50).' },
        { name: 'category', type: 'string', required: false, description: 'Filter articles by category slug.' },
        { name: 'tag', type: 'string', required: false, description: 'Filter articles by tag slug.' },
        { name: 'search', type: 'string', required: false, description: 'Search articles by keywords in title, excerpt, or content.' },
        { name: 'fresh', type: 'string', required: false, default: '0', description: 'Set to "1" or "true" to bypass Redis/CDN cache for real-time fresh data.' },
      ],
      sampleResponse: {
        success: true,
        meta: {
          total: publishedBlogs.length || 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
        data: [
          {
            id: 'b2f3cf62-10e7-4980-a367-72717b1e5ea1',
            slug: defaultTestSlug,
            title: publishedBlogs[0]?.translations?.['en']?.title || 'Comprehensive Enterprise Architecture Guide',
            excerpt: publishedBlogs[0]?.translations?.['en']?.excerpt || 'A deep dive into cloud scalability and multi-tenant architectures.',
            featuredImage: publishedBlogs[0]?.featuredImage || 'https://blogary.s3.ap-south-1.amazonaws.com/blogs/sample.webp',
            featuredImageAlt: 'Article Banner',
            authorName: publishedBlogs[0]?.authorName || 'Editorial Team',
            authorAvatar: publishedBlogs[0]?.authorAvatar || 'https://lh3.googleusercontent.com/avatar.webp',
            authorBio: '',
            authorLinkedin: '',
            authorTwitter: '',
            publishedAt: new Date().toISOString(),
            readTimeMinutes: publishedBlogs[0]?.readTimeMinutes || 8,
            categories: [
              { id: 'cat-1', name: 'Cloud & ERP', slug: 'cloud-erp' }
            ],
            primaryCategory: 'Cloud & ERP',
            tags: [
              { id: 'tag-1', name: 'Enterprise', slug: 'enterprise' }
            ],
            categoryIds: ['cat-1'],
            tagIds: ['tag-1'],
            seo: {
              metaTitle: publishedBlogs[0]?.translations?.['en']?.seo?.metaTitle || 'Enterprise Architecture Guide',
              metaDescription: publishedBlogs[0]?.translations?.['en']?.seo?.metaDescription || 'Cloud scalability and multi-tenant systems.',
              canonicalUrl: `https://${siteDomain}/blog/${defaultTestSlug}`,
            },
          },
        ],
      },
    },
    {
      id: 'get-blog-by-slug',
      method: 'GET',
      path: '/v1/blogs/:slug',
      title: 'Get Article by Slug',
      description: 'Retrieve full article details including sanitized HTML body content, SEO tags, and Schema.org JSON-LD structured data.',
      category: 'Articles',
      hasSlugParam: true,
      params: [
        { name: 'slug', type: 'string (path)', required: true, default: activeSlug, description: 'Unique article slug in target language.' },
        { name: 'website', type: 'string', required: true, default: websiteId, description: 'Target website identifier.' },
        { name: 'lang', type: 'string', required: false, default: activeSite.defaultLanguage || 'en', description: 'Language code.' },
        { name: 'fresh', type: 'string', required: false, default: '0', description: 'Set to "1" to bypass cache.' },
      ],
      sampleResponse: {
        success: true,
        data: {
          id: 'b2f3cf62-10e7-4980-a367-72717b1e5ea1',
          slug: activeSlug,
          title: publishedBlogs[0]?.translations?.['en']?.title || 'Comprehensive Enterprise Architecture Guide',
          excerpt: publishedBlogs[0]?.translations?.['en']?.excerpt || 'A deep dive into cloud scalability and multi-tenant architectures.',
          content: '<h2>Introduction</h2><p>Modern distributed content delivery requires isolated tenancy and high-performance edge caching...</p>',
          featuredImage: publishedBlogs[0]?.featuredImage || 'https://blogary.s3.ap-south-1.amazonaws.com/blogs/sample.webp',
          featuredImageAlt: 'Article Banner',
          publishedAt: new Date().toISOString(),
          readTimeMinutes: 8,
          viewCount: 420,
          author: {
            id: 'usr-1',
            name: publishedBlogs[0]?.authorName || 'Editorial Team',
            avatar: publishedBlogs[0]?.authorAvatar || 'https://lh3.googleusercontent.com/avatar.webp',
            bio: 'Principal Systems Architect',
          },
          categories: [
            { id: 'cat-1', name: 'Cloud & ERP', slug: 'cloud-erp' }
          ],
          tags: [
            { id: 'tag-1', name: 'Enterprise', slug: 'enterprise' }
          ],
          seo: {
            metaTitle: 'Comprehensive Enterprise Architecture Guide',
            metaDescription: 'Cloud scalability and multi-tenant systems.',
            metaKeywords: 'cloud, erp, architecture',
            canonicalUrl: `https://${siteDomain}/blog/${activeSlug}`,
            focusKeyword: 'architecture',
            robots: 'index, follow',
            ogTitle: 'Comprehensive Enterprise Architecture Guide',
            ogDescription: 'Cloud scalability and multi-tenant systems.',
            ogImage: 'https://blogary.s3.ap-south-1.amazonaws.com/blogs/sample.webp',
          },
          schemaJsonLd: {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: 'Comprehensive Enterprise Architecture Guide',
            datePublished: new Date().toISOString(),
            mainEntityOfPage: `https://${siteDomain}/blog/${activeSlug}`,
          },
        },
      },
    },
    {
      id: 'list-categories',
      method: 'GET',
      path: '/v1/categories',
      title: 'List Categories',
      description: 'Retrieve taxonomy category hierarchy and live article counters for navigation menus and filter bars.',
      category: 'Taxonomy',
      params: [
        { name: 'website', type: 'string', required: true, default: websiteId, description: 'Target website identifier.' },
      ],
      sampleResponse: {
        success: true,
        data: [
          { id: 'cat-1', name: 'Admissions & Campus', slug: 'admissions-campus', count: 14 },
          { id: 'cat-2', name: 'Academics & Curriculum', slug: 'academics-curriculum', count: 9 },
          { id: 'cat-3', name: 'Student Life & Events', slug: 'student-life-events', count: 6 },
        ],
      },
    },
    {
      id: 'list-tags',
      method: 'GET',
      path: '/v1/tags',
      title: 'List Tags',
      description: 'Retrieve tag cloud taxonomy and live article associations for footer links and discovery tags.',
      category: 'Taxonomy',
      params: [
        { name: 'website', type: 'string', required: true, default: websiteId, description: 'Target website identifier.' },
      ],
      sampleResponse: {
        success: true,
        data: [
          { id: 'tag-1', name: 'Admissions 2026', slug: 'admissions-2026', count: 12 },
          { id: 'tag-2', name: 'Higher Education', slug: 'higher-education', count: 8 },
          { id: 'tag-3', name: 'Parenting Guide', slug: 'parenting-guide', count: 5 },
        ],
      },
    },
    {
      id: 'latest-blogs',
      method: 'GET',
      path: '/v1/blogs/latest',
      title: 'Get Latest Articles',
      description: 'Quick-access endpoint for homepage carousels and sidebar widgets displaying the most recently published articles.',
      category: 'Articles',
      params: [
        { name: 'website', type: 'string', required: true, default: websiteId, description: 'Target website identifier.' },
        { name: 'limit', type: 'number', required: false, default: '5', description: 'Number of latest articles to return (max: 20).' },
        { name: 'lang', type: 'string', required: false, default: activeSite.defaultLanguage || 'en', description: 'Language code.' },
        { name: 'fresh', type: 'string', required: false, default: '0', description: 'Set to "1" to bypass cache.' },
      ],
      sampleResponse: {
        success: true,
        data: [
          {
            id: 'b2f3cf62-10e7-4980-a367-72717b1e5ea1',
            slug: defaultTestSlug,
            title: 'Top Educational Innovations in 2026',
            excerpt: 'How leading institutions are streamlining administrative operations.',
            featuredImage: 'https://blogary.s3.ap-south-1.amazonaws.com/blogs/sample.webp',
            publishedAt: new Date().toISOString(),
            readTimeMinutes: 5,
          },
        ],
      },
    },
    {
      id: 'popular-blogs',
      method: 'GET',
      path: '/v1/blogs/popular',
      title: 'Get Popular Articles',
      description: 'Retrieve highest-performing articles ranked by verified read views for "Trending Articles" sections.',
      category: 'Articles',
      params: [
        { name: 'website', type: 'string', required: true, default: websiteId, description: 'Target website identifier.' },
        { name: 'limit', type: 'number', required: false, default: '5', description: 'Number of popular articles to return (max: 20).' },
        { name: 'lang', type: 'string', required: false, default: activeSite.defaultLanguage || 'en', description: 'Language code.' },
      ],
      sampleResponse: {
        success: true,
        data: [
          {
            id: 'b2f3cf62-10e7-4980-a367-72717b1e5ea1',
            slug: defaultTestSlug,
            title: 'Parent Guide: Choosing the Right Curriculum',
            viewCount: 1240,
            featuredImage: 'https://blogary.s3.ap-south-1.amazonaws.com/blogs/sample.webp',
            publishedAt: new Date().toISOString(),
          },
        ],
      },
    },
    {
      id: 'search-blogs',
      method: 'GET',
      path: '/v1/search',
      title: 'Full-Text Search',
      description: 'Full-text keyword search across titles, slugs, and body content with relevance ranking.',
      category: 'Search & SEO',
      params: [
        { name: 'q', type: 'string', required: true, description: 'Search term or keyword (e.g. "curriculum").' },
        { name: 'website', type: 'string', required: true, default: websiteId, description: 'Target website identifier.' },
        { name: 'lang', type: 'string', required: false, default: activeSite.defaultLanguage || 'en', description: 'Language code.' },
        { name: 'limit', type: 'number', required: false, default: '10', description: 'Number of results to return.' },
      ],
      sampleResponse: {
        success: true,
        data: [
          {
            id: 'b2f3cf62-10e7-4980-a367-72717b1e5ea1',
            slug: defaultTestSlug,
            title: 'Parent Guide: Choosing the Right Curriculum',
            excerpt: 'Understanding key differences in modern pedagogy and academic frameworks.',
            matchScore: 0.94,
          },
        ],
      },
    },
    {
      id: 'list-redirects',
      method: 'GET',
      path: '/v1/redirects',
      title: 'List 301 Permanent Redirects',
      description: 'Retrieve active 301 SEO redirects for edge routing, Next.js middleware, Apache .htaccess, or Nginx map integration.',
      category: 'Search & SEO',
      params: [
        { name: 'website', type: 'string', required: true, default: websiteId, description: 'Target website identifier.' },
      ],
      sampleResponse: {
        success: true,
        data: [
          {
            id: 'red-1',
            fromSlug: 'old-article-url',
            toSlug: 'new-updated-article-url',
            statusCode: 301,
            hitCount: 84,
          },
        ],
      },
    },
    {
      id: 'get-website-info',
      method: 'GET',
      path: '/v1/website',
      title: 'Tenant Website Configuration',
      description: 'Retrieve site branding metadata, logo URLs, supported languages, and S3 upload prefix.',
      category: 'System',
      params: [
        { name: 'website', type: 'string', required: true, default: websiteId, description: 'Target website identifier.' },
      ],
      sampleResponse: {
        success: true,
        data: {
          id: websiteId,
          name: activeSite.name,
          domain: activeSite.domain,
          logoUrl: activeSite.logoUrl,
          status: activeSite.status,
          s3Prefix: activeSite.s3Prefix,
          revalidateWebhookUrl: activeSite.revalidateWebhookUrl,
          defaultLanguage: activeSite.defaultLanguage || 'en',
        },
      },
    },
    {
      id: 'health-check',
      method: 'GET',
      path: '/v1/health',
      title: 'API Gateway Health Check',
      description: 'Verify connectivity to PostgreSQL, Redis L2 cache, and the Jupsoft CMS Gateway cluster.',
      category: 'System',
      params: [],
      sampleResponse: {
        status: 'ok',
        database: 'connected',
        redis: 'connected',
        service: 'Jupsoft Centralized CMS Backend',
        timestamp: new Date().toISOString(),
        uptime: 216000,
      },
    },
  ], [activeSite, websiteId, siteDomain, defaultTestSlug, activeSlug, publishedBlogs]);

  const selectedEndpoint = useMemo(() => {
    return endpoints.find((e) => e.id === selectedEndpointId) || endpoints[0];
  }, [endpoints, selectedEndpointId]);

  // Generate dynamic request snippets
  const snippetUrl = useMemo(() => {
    const base = `${apiBaseUrl}${selectedEndpoint.path.replace(':slug', activeSlug)}`;
    if (selectedEndpoint.id === 'health-check') return base;
    return `${base}?website=${encodeURIComponent(websiteId)}`;
  }, [apiBaseUrl, selectedEndpoint, activeSlug, websiteId]);

  const curlSnippet = useMemo(() => {
    return `curl -X ${selectedEndpoint.method} "${snippetUrl}" \\
  -H "x-api-key: ${apiKey}" \\
  -H "Accept: application/json"`;
  }, [selectedEndpoint.method, snippetUrl, apiKey]);

  const fetchSnippet = useMemo(() => {
    return `const response = await fetch("${snippetUrl}", {
  method: "${selectedEndpoint.method}",
  headers: {
    "x-api-key": "${apiKey}",
    "Accept": "application/json"
  }
});
const result = await response.json();
console.log(result);`;
  }, [snippetUrl, selectedEndpoint.method, apiKey]);

  const axiosSnippet = useMemo(() => {
    return `import axios from 'axios';

const { data } = await axios.${selectedEndpoint.method.toLowerCase()}("${snippetUrl}", {
  headers: {
    "x-api-key": "${apiKey}",
    "Accept": "application/json"
  }
});
console.log(data);`;
  }, [snippetUrl, selectedEndpoint.method, apiKey]);

  // Execute live client request
  const handleTestLiveRequest = async () => {
    setIsSendingRequest(true);
    setLiveTestResponse(null);
    const start = performance.now();

    try {
      const res = await fetch(snippetUrl, {
        method: selectedEndpoint.method,
        headers: {
          'x-api-key': apiKey,
          'Accept': 'application/json',
        },
      });
      const latencyMs = Math.round(performance.now() - start);
      const json = await res.json().catch(() => ({ message: 'Raw non-JSON response returned' }));

      setLiveTestResponse({
        status: res.status,
        latencyMs,
        data: json,
      });
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      setLiveTestResponse({
        status: 0,
        latencyMs,
        data: null,
        error: err.message || 'Network connection failed',
      });
    } finally {
      setIsSendingRequest(false);
    }
  };

  // Group endpoints for navigation
  const groupedEndpoints = useMemo(() => {
    const map: Record<string, ApiEndpoint[]> = {
      Articles: [],
      Taxonomy: [],
      'Search & SEO': [],
      System: [],
    };
    endpoints.forEach((e) => {
      if (!map[e.category]) map[e.category] = [];
      map[e.category].push(e);
    });
    return map;
  }, [endpoints]);

  return (
    <div className="space-y-6">
      {/* ─── Top Header & Website Selector ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-500" />
            Developer API &amp; Endpoints
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            REST API credentials, route specifications, and live JSON return payloads for consuming websites.
          </p>
        </div>

        {websites.length > 1 && onSelectSite && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tenant Scope:</span>
            <select
              value={activeSite.id}
              onChange={(e) => onSelectSite(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
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

      {/* ─── Credentials Bar (3 Cards) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: Base URL */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              API Base URL
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
              HTTPS Live
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
            <code className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate select-all">
              {apiBaseUrl}
            </code>
            <button
              onClick={() => copyToClipboard(apiBaseUrl, 'baseUrl')}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1 rounded transition"
              title="Copy Base URL"
            >
              {copiedKey === 'baseUrl' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Card 2: Website ID */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-indigo-500" />
              Website ID (Tenant)
            </span>
            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
              {siteDomain}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
            <code className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate select-all">
              {websiteId}
            </code>
            <button
              onClick={() => copyToClipboard(websiteId, 'websiteId')}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1 rounded transition"
              title="Copy Website ID"
            >
              {copiedKey === 'websiteId' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Card 3: API Key */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
              API Key (Header: x-api-key)
            </span>
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              {showApiKey ? (
                <>
                  <EyeOff className="w-3 h-3" />
                  <span>Hide</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  <span>Reveal</span>
                </>
              )}
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
            <code className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate select-all">
              {showApiKey ? apiKey : (apiKey.slice(0, 8) + '••••••••••••••••••••••••••••••••')}
            </code>
            <button
              onClick={() => copyToClipboard(apiKey, 'apiKey')}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1 rounded transition"
              title="Copy API Key"
            >
              {copiedKey === 'apiKey' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Standard Auth Notice Banner ─── */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 text-xs">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-slate-600 dark:text-slate-300">
          <p>
            <strong>Standard Authentication:</strong> Include{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px]">
              x-api-key: {apiKey.slice(0, 12)}...
            </code>{' '}
            or{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px]">
              Authorization: Bearer YOUR_API_KEY
            </code>{' '}
            in your HTTP request headers.
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Pass <code className="font-mono text-slate-700 dark:text-slate-300">?website={websiteId}</code> as a query parameter for cross-tenant routing or server-side integration.
          </p>
        </div>
      </div>

      {/* ─── Main 2-Column Split: Endpoints List + Inspector ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Endpoints Menu (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
            API Endpoints Catalog
          </div>

          <div className="space-y-4">
            {Object.entries(groupedEndpoints).map(([category, items]) => (
              <div key={category} className="space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1">
                  {category}
                </div>
                {items.map((endpoint) => {
                  const isSelected = endpoint.id === selectedEndpointId;
                  return (
                    <button
                      key={endpoint.id}
                      onClick={() => {
                        setSelectedEndpointId(endpoint.id);
                        setLiveTestResponse(null);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200 font-semibold shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                            endpoint.method === 'GET'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60'
                          }`}
                        >
                          {endpoint.method}
                        </span>
                        <span className="truncate font-mono text-[11px]">
                          {endpoint.path}
                        </span>
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 transition ${
                          isSelected ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5' : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Selected Endpoint Inspector (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Endpoint Header Card */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md border uppercase ${
                    selectedEndpoint.method === 'GET'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60'
                  }`}
                >
                  {selectedEndpoint.method}
                </span>
                <code className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                  {selectedEndpoint.path}
                </code>
              </div>

              <button
                onClick={handleTestLiveRequest}
                disabled={isSendingRequest}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold shadow-xs cursor-pointer transition shrink-0"
              >
                {isSendingRequest ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Request...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Send Live Request</span>
                  </>
                )}
              </button>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {selectedEndpoint.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {selectedEndpoint.description}
              </p>
            </div>

            {/* Custom Slug Input for single blog route */}
            {selectedEndpoint.hasSlugParam && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                <label className="text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                  Target Slug:
                </label>
                <input
                  type="text"
                  value={activeSlug}
                  onChange={(e) => setTestSlug(e.target.value)}
                  placeholder="e.g. sample-article-slug"
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                {publishedBlogs.length > 0 && (
                  <span className="text-[11px] text-slate-400">
                    ({publishedBlogs.length} published articles available)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Parameters Table */}
          {selectedEndpoint.params.length > 0 && (
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                Parameters &amp; Filters
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                      <th className="py-2 px-3">Parameter</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Default</th>
                      <th className="py-2 px-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {selectedEndpoint.params.map((p) => (
                      <tr key={p.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {p.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                          {p.type}
                        </td>
                        <td className="py-2.5 px-3">
                          {p.required ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
                              Required
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              Optional
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                          {p.default || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          {p.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Request Code Snippet Tabs */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
              <div className="flex items-center gap-1">
                {(['curl', 'fetch', 'axios'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setCodeSnippetTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition uppercase font-mono ${
                      codeSnippetTab === tab
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab === 'curl' ? 'cURL' : tab === 'fetch' ? 'Fetch (JS)' : 'Axios'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  const code = codeSnippetTab === 'curl' ? curlSnippet : codeSnippetTab === 'fetch' ? fetchSnippet : axiosSnippet;
                  copyToClipboard(code, 'snippet');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition"
              >
                {copiedKey === 'snippet' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Snippet</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono">
              <pre className="text-emerald-400 leading-relaxed select-all">
                {codeSnippetTab === 'curl' && curlSnippet}
                {codeSnippetTab === 'fetch' && fetchSnippet}
                {codeSnippetTab === 'axios' && axiosSnippet}
              </pre>
            </div>
          </div>

          {/* Live Response Panel (When live test executed) */}
          {liveTestResponse && (
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <div className="p-3 border-b border-indigo-100 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Live Execution Result:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                      liveTestResponse.status === 200
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    HTTP {liveTestResponse.status || 'ERR'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ({liveTestResponse.latencyMs}ms)
                  </span>
                </div>

                <button
                  onClick={() => copyToClipboard(JSON.stringify(liveTestResponse.data, null, 2), 'liveJson')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition"
                >
                  {copiedKey === 'liveJson' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Result JSON</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono max-h-[360px] overflow-y-auto">
                {liveTestResponse.error ? (
                  <div className="text-rose-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{liveTestResponse.error}</span>
                  </div>
                ) : (
                  <pre className="text-indigo-300 leading-relaxed select-all">
                    {JSON.stringify(liveTestResponse.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Real JSON Response Schema Preview (200 OK) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Expected JSON Return Schema (200 OK)
                </span>
              </div>

              <button
                onClick={() => copyToClipboard(JSON.stringify(selectedEndpoint.sampleResponse, null, 2), 'sampleJson')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition"
              >
                {copiedKey === 'sampleJson' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono max-h-[420px] overflow-y-auto">
              <pre className="text-slate-300 leading-relaxed select-all">
                {JSON.stringify(selectedEndpoint.sampleResponse, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
