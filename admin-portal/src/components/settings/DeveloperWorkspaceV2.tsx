'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
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
  Database,
  Palette,
  Layout,
  CheckSquare,
  Sparkles,
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
  const [activeMainTab, setActiveMainTab] = useState<'endpoints' | 'frontend-css'>('endpoints');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('list-blogs');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [codeSnippetTab, setCodeSnippetTab] = useState<'curl' | 'fetch' | 'axios'>('curl');
  const [cssFormatTab, setCssFormatTab] = useState<'pure-css' | 'tailwind'>('pure-css');

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
  const apiBaseUrl = 'https://blogary.jupsoft.com';

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
              { id: 'cat-1', name: 'Engineering & Tech', slug: 'engineering-tech' }
            ],
            primaryCategory: 'Engineering & Tech',
            tags: [
              { id: 'tag-1', name: 'Architecture', slug: 'architecture' }
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
            { id: 'cat-1', name: 'Engineering & Tech', slug: 'engineering-tech' }
          ],
          tags: [
            { id: 'tag-1', name: 'Architecture', slug: 'architecture' }
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
          { id: 'cat-1', name: 'Technology & Engineering', slug: 'technology-engineering', count: 14 },
          { id: 'cat-2', name: 'Insights & Strategy', slug: 'insights-strategy', count: 9 },
          { id: 'cat-3', name: 'Product Updates', slug: 'product-updates', count: 6 },
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
          { id: 'tag-1', name: 'Featured', slug: 'featured', count: 12 },
          { id: 'tag-2', name: 'Architecture', slug: 'architecture', count: 8 },
          { id: 'tag-3', name: 'Guides', slug: 'guides', count: 5 },
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
    const cleanBase = apiBaseUrl.endsWith('/v1')
      ? apiBaseUrl.replace(/\/v1$/, '')
      : apiBaseUrl.replace(/\/+$/, '');
    let cleanPath = selectedEndpoint.path.replace(':slug', activeSlug);
    if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
    
    // Safety deduplication: ensure /v1 isn't duplicated
    const pathWithoutV1 = cleanPath.startsWith('/v1/') ? cleanPath.replace(/^\/v1/, '') : cleanPath;
    const fullUrl = `${cleanBase}/v1${pathWithoutV1}`;

    if (selectedEndpoint.id === 'health-check') return fullUrl;

    let url = `${fullUrl}?website=${encodeURIComponent(websiteId)}`;
    if (selectedEndpoint.id === 'search-blogs') {
      url += '&q=school';
    }
    return url;
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

  // Universal CSS Stylesheet for `.blog-content`
  const pureCssContent = `/* ==========================================================================
   Jupsoft Blog CMS — Universal Frontend Typography & Rich Content Stylesheet
   Attach this CSS class to your article container: <div class="blog-content">
   ========================================================================== */

.blog-content {
  font-family: inherit;
  color: #1e293b;
  line-height: 1.8;
  font-size: 1.125rem; /* 18px */
  word-break: break-word;
}

/* Headings */
.blog-content h2 {
  font-size: 1.875rem; /* 30px */
  font-weight: 700;
  line-height: 1.3;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  color: #0f172a;
}

.blog-content h3 {
  font-size: 1.5rem; /* 24px */
  font-weight: 600;
  line-height: 1.35;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  color: #1e293b;
}

.blog-content h4 {
  font-size: 1.25rem; /* 20px */
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  color: #334155;
}

/* Paragraphs & Text Elements */
.blog-content p {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #334155;
}

.blog-content strong {
  font-weight: 700;
  color: #0f172a;
}

.blog-content em {
  font-style: italic;
}

.blog-content u {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.blog-content mark {
  background-color: #fef08a; /* amber-200 */
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

/* Links */
.blog-content a {
  color: #2563eb; /* brand blue */
  text-decoration: underline;
  text-underline-offset: 3px;
  font-weight: 500;
  transition: color 0.15s ease;
}

.blog-content a:hover {
  color: #1d4ed8;
}

/* Lists */
.blog-content ul {
  list-style-type: disc;
  padding-left: 1.75rem;
  margin-bottom: 1.5rem;
}

.blog-content ol {
  list-style-type: decimal;
  padding-left: 1.75rem;
  margin-bottom: 1.5rem;
}

.blog-content li {
  margin-bottom: 0.5rem;
  line-height: 1.75;
}

.blog-content li > p {
  margin-bottom: 0.25rem;
}

/* Blockquotes */
.blog-content blockquote {
  border-left: 4px solid #3b82f6;
  background-color: #f8fafc;
  padding: 1rem 1.25rem;
  margin: 1.75rem 0;
  border-radius: 0 0.5rem 0.5rem 0;
  font-style: italic;
  color: #475569;
}

.blog-content blockquote p:last-child {
  margin-bottom: 0;
}

/* Responsive Images & Figures */
.blog-content img {
  max-width: 100%;
  height: auto;
  border-radius: 0.75rem;
  margin: 2rem auto;
  display: block;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.blog-content figure {
  margin: 2rem 0;
  text-align: center;
}

.blog-content figcaption {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.5rem;
  font-style: italic;
}

/* Responsive Tables */
.blog-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 2rem 0;
  font-size: 0.95rem;
  text-align: left;
}

.blog-content th {
  background-color: #f1f5f9;
  color: #0f172a;
  font-weight: 600;
  padding: 0.75rem 1rem;
  border: 1px solid #cbd5e1;
}

.blog-content td {
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  color: #334155;
}

.blog-content tr:nth-child(even) td {
  background-color: #f8fafc;
}

/* Code Blocks */
.blog-content pre {
  background-color: #0f172a;
  color: #f8fafc;
  padding: 1.25rem;
  border-radius: 0.75rem;
  overflow-x: auto;
  font-family: monospace;
  font-size: 0.875rem;
  margin: 1.75rem 0;
}

.blog-content code {
  font-family: monospace;
  font-size: 0.875em;
  background-color: #f1f5f9;
  color: #0f172a;
  padding: 0.15rem 0.35rem;
  border-radius: 0.25rem;
}

.blog-content pre code {
  background-color: transparent;
  color: inherit;
  padding: 0;
}

/* Horizontal Rule */
.blog-content hr {
  border: 0;
  border-top: 1px solid #e2e8f0;
  margin: 2.5rem 0;
}`;

  const tailwindSnippet = `<!-- For websites using Tailwind CSS with @tailwindcss/typography plugin: -->
<article class="prose prose-slate lg:prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800 prose-img:rounded-xl prose-img:shadow-md prose-blockquote:border-l-blue-500 prose-blockquote:bg-slate-50 prose-blockquote:py-1">
  <div dangerouslySetInnerHTML={{ __html: blog.content }} />
</article>`;

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
            Developer API &amp; Integration Hub
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            REST API credentials, route specifications, and frontend UI/UX integration guidelines for consuming websites.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/docs${activeSite?.id ? '?site=' + activeSite.id : ''}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Integration Guide &amp; Blueprints &rarr;</span>
          </Link>
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

      {/* ─── Mode Selector Segment (Endpoints vs Frontend UI & CSS Guide) ─── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveMainTab('endpoints')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeMainTab === 'endpoints'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>REST Endpoints &amp; Payloads</span>
        </button>

        <button
          onClick={() => setActiveMainTab('frontend-css')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeMainTab === 'frontend-css'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Frontend UI/UX &amp; CSS Styling Guide</span>
        </button>
      </div>

      {/* ─── VIEW 1: REST Endpoints & Payloads ─── */}
      {activeMainTab === 'endpoints' && (
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
      )}

      {/* ─── VIEW 2: Frontend UI/UX & CSS Styling Guide ─── */}
      {activeMainTab === 'frontend-css' && (
        <div className="space-y-6">
          {/* Header Overview Banner */}
          <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-500" />
              Frontend Typography &amp; UI/UX Styling Standard
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              When consuming <code className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">blog.content</code>, the CMS returns clean, semantic HTML (headings, paragraphs, blockquotes, tables, and images). Without proper container CSS, default browser styles will make tables break on mobile, images overflow containers, and headings lack proper margins.
            </p>
          </div>

          {/* Section A: Drop-in Stylesheet for .blog-content */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/60 dark:bg-slate-950/40">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Ready-to-Use CSS Stylesheet
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Wrap your article body in <code className="font-mono text-indigo-600">&lt;div class=&quot;blog-content&quot;&gt;</code> and paste this stylesheet into your project.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-xs font-semibold">
                  <button
                    onClick={() => setCssFormatTab('pure-css')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      cssFormatTab === 'pure-css'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Pure CSS
                  </button>
                  <button
                    onClick={() => setCssFormatTab('tailwind')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      cssFormatTab === 'tailwind'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Tailwind Typography
                  </button>
                </div>

                <button
                  onClick={() => {
                    const code = cssFormatTab === 'pure-css' ? pureCssContent : tailwindSnippet;
                    copyToClipboard(code, 'cssCode');
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition"
                >
                  {copiedKey === 'cssCode' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy CSS</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono max-h-[380px] overflow-y-auto">
              <pre className="text-emerald-400 leading-relaxed select-all">
                {cssFormatTab === 'pure-css' && pureCssContent}
                {cssFormatTab === 'tailwind' && tailwindSnippet}
              </pre>
            </div>
          </div>

          {/* Section B: HTML Elements Output Checklist */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-500" />
              HTML Elements Generated by CMS Editor
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ensure your frontend CSS handles all of the following semantic tags generated by the Jupsoft Tiptap rich-text canvas:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2 px-3">HTML Tag</th>
                    <th className="py-2 px-3">Feature in CMS</th>
                    <th className="py-2 px-3">Frontend Styling Requirement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">&lt;h2&gt;, &lt;h3&gt;, &lt;h4&gt;</td>
                    <td className="py-2.5 px-3">Section Headers</td>
                    <td className="py-2.5 px-3">Distinct font sizes (30px/24px/20px), bold weights, and generous top margins for reading rhythm.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">&lt;p&gt;</td>
                    <td className="py-2.5 px-3">Body Paragraphs</td>
                    <td className="py-2.5 px-3">18px / 1.125rem font-size with 1.75 to 1.8 line-height and bottom margin 1.5rem.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">&lt;blockquote&gt;</td>
                    <td className="py-2.5 px-3">Callout Quotes</td>
                    <td className="py-2.5 px-3">Accent left-border (4px), soft background tint, italic font, and inner padding.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">&lt;table&gt;, &lt;th&gt;, &lt;td&gt;</td>
                    <td className="py-2.5 px-3">Data Comparison Tables</td>
                    <td className="py-2.5 px-3">Full width, shaded table header, alternating zebra row colors, and responsive horizontal scroll wrapper.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">&lt;img&gt;, &lt;figcaption&gt;</td>
                    <td className="py-2.5 px-3">WebP Images &amp; Captions</td>
                    <td className="py-2.5 px-3"><code>max-width: 100%</code>, rounded corners, subtle drop shadow, and centered caption text.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">&lt;pre&gt;&lt;code&gt;</td>
                    <td className="py-2.5 px-3">Code Snippets</td>
                    <td className="py-2.5 px-3">Dark background (#0f172a), monospace font, rounded padding, and horizontal scroll.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">&lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;</td>
                    <td className="py-2.5 px-3">Bullet &amp; Numbered Lists</td>
                    <td className="py-2.5 px-3">Indented left padding (1.75rem), standard disc/decimal markers, and vertical line spacing.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">&lt;mark&gt;</td>
                    <td className="py-2.5 px-3">Text Highlighting</td>
                    <td className="py-2.5 px-3">Soft yellow highlight background (#fef08a) with 2px horizontal padding.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">&lt;a&gt;</td>
                    <td className="py-2.5 px-3">Hyperlinks</td>
                    <td className="py-2.5 px-3">Brand accent color, underline offset 3px, and hover color transition.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section C: Consuming Website UI/UX Components Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Listing Page Checklist */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Layout className="w-4 h-4 text-emerald-500" />
                Blog Listing Page UI Checklist (/blog)
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Article Cards:</strong> Featured image with 16:9 aspect-ratio, fallback placeholder image, and hover zoom effect.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Metadata Byline:</strong> Author avatar thumbnail, author name, published date, and reading time badge (e.g. &quot;12 min read&quot;).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Typography Truncation:</strong> Line-clamp titles to 2 lines and excerpts to 3 lines to keep the grid balanced.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Category Filter Bar:</strong> Horizontal scrolling pill buttons mapped to <code>GET /v1/categories</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Live Search:</strong> Instant search input with debouncing connected to <code>GET /v1/search?q=...</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Pagination Controls:</strong> Clean Next/Previous and page numbers utilizing <code>meta.totalPages</code>.</span>
                </li>
              </ul>
            </div>

            {/* Article Detail Page Checklist */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                Article Detail Page UI Checklist (/blog/:slug)
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Breadcrumb Navigation:</strong> Home &gt; Blog &gt; Category &gt; Article Title for UX and SEO crawling.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Article Hero Header:</strong> High-impact H1 title, author profile byline, publish date, read time, and share buttons.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Featured Cover Image:</strong> High-resolution WebP hero banner with <code>priority</code> or eager loading.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Rich Content Canvas:</strong> <code>.blog-content</code> container applying typography stylesheet to <code>blog.content</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Author Bio Box:</strong> Dedicated card at article bottom displaying author avatar, bio, and social handles.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Related Articles Grid:</strong> 3-column card grid at the bottom populated via <code>GET /v1/blogs/latest</code>.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Section D: SEO Head & Structured Data Integration */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              SEO Head &amp; Schema.org JSON-LD Integration
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The API returns complete pre-computed SEO metadata. In Next.js (App Router), inject it directly into your <code>generateMetadata()</code>:
            </p>

            <div className="p-4 bg-slate-950 rounded-xl overflow-x-auto text-xs font-mono text-indigo-300">
              <pre className="select-all">
{`// app/blog/[slug]/page.tsx (Next.js App Router Example)
export async function generateMetadata({ params }) {
  const { data } = await getBlogBySlug(params.slug);
  if (!data) return {};

  return {
    title: data.seo.metaTitle || data.title,
    description: data.seo.metaDescription || data.excerpt,
    alternates: {
      canonical: data.seo.canonicalUrl,
    },
    openGraph: {
      title: data.seo.ogTitle || data.title,
      description: data.seo.ogDescription || data.excerpt,
      images: [{ url: data.seo.ogImage || data.featuredImage }],
    },
    robots: data.seo.robots || 'index, follow',
  };
}

export default async function BlogDetailPage({ params }) {
  const { data } = await getBlogBySlug(params.slug);

  return (
    <article className="max-w-4xl mx-auto px-4 py-12">
      {/* Schema.org Structured Data */}
      {data.schemaJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data.schemaJsonLd) }}
        />
      )}

      <h1 className="text-4xl font-bold mb-6">{data.title}</h1>
      <img src={data.featuredImage} alt={data.featuredImageAlt} className="rounded-2xl mb-8 w-full" />

      {/* Styled Rich Content */}
      <div className="blog-content" dangerouslySetInnerHTML={{ __html: data.content }} />
    </article>
  );
}`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
