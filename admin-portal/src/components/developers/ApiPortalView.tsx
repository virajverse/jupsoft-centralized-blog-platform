'use client';

import React, { useState } from 'react';
import { useBlogStore } from '../../store/useBlogStore';
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
  RefreshCw
} from 'lucide-react';

export const ApiPortalView: React.FC = () => {
  const { websites, activeWebsiteId, blogs, categories } = useBlogStore();

  const activeSite = websites.find((w) => w.id === activeWebsiteId) || websites[0];
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const [activeTab, setActiveTab] = useState<'tester' | 'snippets' | 'specs'>('tester');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/v1/blogs');
  const [selectedLang, setSelectedLang] = useState<string>('en');
  const [slugParam, setSlugParam] = useState<string>('');
  const [searchQueryParam, setSearchQueryParam] = useState<string>('enterprise');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [testResponse, setTestResponse] = useState<{
    status: number;
    latencyMs: number;
    headers: Record<string, string>;
    body: unknown;
  } | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // API execution with live HTTP probe and local Zustand cache fallback
  const handleExecuteApi = async () => {
    setIsLoadingTest(true);
    const startTime = performance.now();

    let resolvedPath = selectedEndpoint;
    if (selectedEndpoint === '/v1/blogs/{slug}') {
      resolvedPath = `/v1/blogs/${slugParam || 'sample-post'}`;
    } else if (selectedEndpoint === '/v1/search') {
      resolvedPath = `/v1/search?q=${encodeURIComponent(searchQueryParam)}&lang=${selectedLang}`;
    } else if (selectedEndpoint === '/v1/blogs') {
      resolvedPath = `/v1/blogs?lang=${selectedLang}`;
    }

    // Try real HTTP request first
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${apiBaseUrl}${resolvedPath}`, {
        headers: {
          'Authorization': `Bearer ${activeSite.apiKey}`,
          'X-Tenant-ID': activeSite.id,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

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
      setIsLoadingTest(false);
      return;
    } catch {
      // Graceful fallback to client-side Zustand simulation when backend server is offline
    }

    setTimeout(() => {
      const siteBlogs = blogs.filter((b) => b.websiteId === activeSite.id && b.status === 'Published');
      let responseBody: Record<string, unknown> | null = null;
      let statusCode = 200;

      if (selectedEndpoint === '/v1/blogs') {
        responseBody = {
          success: true,
          meta: {
            website: activeSite.domain,
            total: siteBlogs.length,
            page: 1,
            limit: 10,
          },
          data: siteBlogs.map((b) => {
            const tr = b.translations[selectedLang as keyof typeof b.translations] || b.translations.en;
            return {
              id: b.id,
              slug: tr?.slug || b.id,
              title: tr?.title || 'Untitled',
              excerpt: tr?.excerpt || '',
              featuredImage: b.featuredImage,
              authorName: b.authorName,
              publishedAt: b.publishDate,
              readTimeMinutes: b.readTimeMinutes,
              seo: tr?.seo,
              categoryIds: b.categoryIds,
              tagIds: b.tagIds,
            };
          }),
        };
      } else if (selectedEndpoint === '/v1/blogs/{slug}') {
        const found = siteBlogs.find((b) => {
          const tr = b.translations[selectedLang as keyof typeof b.translations] || b.translations.en;
          return tr?.slug === slugParam || b.id === slugParam;
        }) || siteBlogs[0];

        if (!found) {
          statusCode = 404;
          responseBody = { success: false, error: 'ArticleNotFound', message: `No published article for slug "${slugParam}"` };
        } else {
          const tr = found.translations[selectedLang as keyof typeof found.translations] || found.translations.en;
          responseBody = {
            success: true,
            data: {
              id: found.id,
              slug: tr?.slug,
              title: tr?.title,
              content: tr?.content,
              excerpt: tr?.excerpt,
              featuredImage: found.featuredImage,
              authorName: found.authorName,
              publishedAt: found.publishDate,
              readTimeMinutes: found.readTimeMinutes,
              seo: tr?.seo,
              canonicalUrl: tr?.seo.canonicalUrl || `https://${activeSite.domain}/blog/${tr?.slug}`,
              schemaJsonLd: {
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                "headline": tr?.title,
                "image": found.featuredImage ? [found.featuredImage] : [],
                "datePublished": found.publishDate,
                "author": { "@type": "Person", "name": found.authorName }
              }
            }
          };
        }
      } else if (selectedEndpoint === '/v1/categories') {
        const siteCats = categories[activeSite.id] || [];
        responseBody = {
          success: true,
          meta: { website: activeSite.domain, count: siteCats.length },
          data: siteCats.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description || '',
          })),
        };
      } else if (selectedEndpoint === '/v1/search') {
        const matches = siteBlogs.filter((b) => {
          const title = (b.translations[selectedLang as keyof typeof b.translations]?.title || b.translations.en?.title || '').toLowerCase();
          return title.includes(searchQueryParam.toLowerCase());
        });
        responseBody = {
          success: true,
          query: searchQueryParam,
          meta: { matches: matches.length },
          data: matches.map((b) => ({
            id: b.id,
            title: b.translations.en?.title,
            slug: b.translations.en?.slug,
            featuredImage: b.featuredImage,
          })),
        };
      }

      setTestResponse({
        status: statusCode,
        latencyMs: Math.floor(Math.random() * 15) + 12,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Tenant-ID': activeSite.id,
          'X-RateLimit-Limit': '1000',
          'X-RateLimit-Remaining': '994',
          'X-Cache': 'HIT (Edge CDN Simulator)',
        },
        body: responseBody,
      });
      setIsLoadingTest(false);
    }, 280);
  };

  const curlCommand = `curl -X GET "${apiBaseUrl}${selectedEndpoint.replace('{slug}', slugParam || 'enterprise-ai-shift')}?website_id=${activeSite.id}&lang=${selectedLang}" \\
  -H "Authorization: Bearer ${activeSite.apiKey}" \\
  -H "Accept: application/json"`;

  // Production Next.js 16 Environment Variables
  const envConfigSnippet = `# .env.local (Next.js 16 Consumer Configuration)
NEXT_PUBLIC_CMS_API_URL=${apiBaseUrl}
CMS_TENANT_API_KEY=${activeSite.apiKey}
CMS_WEBSITE_ID=${activeSite.id}
CMS_WEBHOOK_SECRET=wh_sec_jupsoft_default_revalidate_2026`;

  // Production Next.js 16 TypeScript SDK Client
  const nextjsSdkSnippet = `// lib/jupsoft-sdk.ts (Next.js 16 Type-Safe Client SDK)
export interface JupsoftConfig {
  apiUrl?: string;
  apiKey: string;
  websiteId: string;
  defaultLang?: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  featuredImage?: string;
  authorName: string;
  publishedAt?: string;
  readTimeMinutes: number;
  categoryIds: string[];
  tagIds: string[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    canonicalUrl?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
  };
  canonicalUrl?: string;
  schemaJsonLd?: Record<string, unknown>;
}

export interface BlogListResponse {
  success: boolean;
  meta: { website: string; total: number; page: number; limit: number };
  data: BlogPost[];
}

export class JupsoftClient {
  private apiUrl: string;
  private apiKey: string;
  private websiteId: string;
  private defaultLang: string;

  constructor(config?: Partial<JupsoftConfig>) {
    this.apiUrl = (config?.apiUrl || process.env.NEXT_PUBLIC_CMS_API_URL || '${apiBaseUrl}').replace(/\\/$/, '');
    this.apiKey = config?.apiKey || process.env.CMS_TENANT_API_KEY || '${activeSite.apiKey}';
    this.websiteId = config?.websiteId || process.env.CMS_WEBSITE_ID || '${activeSite.id}';
    this.defaultLang = config?.defaultLang || 'en';
  }

  private async request<T>(path: string, options: { tags?: string[]; revalidate?: number } = {}): Promise<T> {
    const url = new URL(\`\${this.apiUrl}\${path}\`);
    if (!url.searchParams.has('website_id') && this.websiteId) {
      url.searchParams.set('website_id', this.websiteId);
    }

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Accept': 'application/json',
      },
      next: {
        tags: options.tags || ['blogs'],
        revalidate: options.revalidate ?? 3600,
      },
    });

    if (!res.ok) {
      throw new Error(\`Jupsoft CMS Error: \${res.status} \${res.statusText} on \${path}\`);
    }

    return res.json() as Promise<T>;
  }

  async getBlogs(params?: { page?: number; limit?: number; category?: string; tag?: string; lang?: string; q?: string }): Promise<BlogListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.category) query.set('category', params.category);
    if (params?.tag) query.set('tag', params.tag);
    if (params?.lang || this.defaultLang) query.set('lang', params?.lang || this.defaultLang);
    if (params?.q) query.set('q', params.q);

    return this.request<BlogListResponse>(\`/v1/blogs?\${query.toString()}\`, {
      tags: ['blogs', 'blogs-list'],
    });
  }

  async getBlogBySlug(slug: string, lang?: string): Promise<BlogPost | null> {
    try {
      const res = await this.request<{ success: boolean; data: BlogPost }>(
        \`/v1/blogs/\${encodeURIComponent(slug)}?lang=\${lang || this.defaultLang}\`,
        { tags: [\`blog:\${slug}\`, 'blogs'] }
      );
      return res.data;
    } catch {
      return null;
    }
  }

  async getLatest(limit = 5, lang?: string): Promise<BlogPost[]> {
    const res = await this.request<{ success: boolean; data: BlogPost[] }>(
      \`/v1/blogs/latest?limit=\${limit}&lang=\${lang || this.defaultLang}\`,
      { tags: ['blogs', 'blogs-latest'] }
    );
    return res.data || [];
  }

  async getPopular(limit = 5, lang?: string): Promise<BlogPost[]> {
    const res = await this.request<{ success: boolean; data: BlogPost[] }>(
      \`/v1/blogs/popular?limit=\${limit}&lang=\${lang || this.defaultLang}\`,
      { tags: ['blogs', 'blogs-popular'] }
    );
    return res.data || [];
  }

  recordView(slug: string): void {
    fetch(\`\${this.apiUrl}/v1/blogs/\${encodeURIComponent(slug)}/view\`, {
      method: 'POST',
      headers: { 'Authorization': \`Bearer \${this.apiKey}\` },
    }).catch(() => {});
  }

  async verifyWebhookSignature(payloadText: string, signature: string | null, secret: string): Promise<boolean> {
    if (!signature || !secret) return false;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadText));
    const computedHex = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return computedHex === signature;
  }
}

export const jupsoft = new JupsoftClient();`;

  // Production Next.js 16 App Router Dynamic Route (with async params Promise)
  const nextjsConsumerSnippet = `// app/blog/[slug]/page.tsx (Next.js 16 App Router with async params & ISR)
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { jupsoft } from '@/lib/jupsoft-sdk';

export const revalidate = 3600; // Background ISR revalidation every 1 hour

// In Next.js 16, params and searchParams are Promises!
interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const blog = await jupsoft.getBlogBySlug(slug, sp?.lang);
  if (!blog) return { title: 'Article Not Found' };

  return {
    title: blog.seo?.metaTitle || blog.title,
    description: blog.seo?.metaDescription || blog.excerpt,
    alternates: {
      canonical: blog.canonicalUrl || blog.seo?.canonicalUrl,
    },
    openGraph: {
      title: blog.seo?.ogTitle || blog.title,
      description: blog.seo?.ogDescription || blog.excerpt,
      images: blog.featuredImage ? [blog.featuredImage] : [],
    },
  };
}

export default async function BlogPostPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const blog = await jupsoft.getBlogBySlug(slug, sp?.lang);

  if (!blog) notFound();

  // Non-blocking view tracking
  jupsoft.recordView(slug);

  return (
    <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      {/* Schema.org JSON-LD structured data for Google rich search results */}
      {blog.schemaJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(blog.schemaJsonLd) }}
        />
      )}

      <header className="mb-8">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-4">
          {blog.title}
        </h1>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="font-medium text-slate-900">{blog.authorName}</span>
          <span>&middot;</span>
          <span>{blog.readTimeMinutes} min read</span>
        </div>
      </header>

      {blog.featuredImage && (
        <img
          src={blog.featuredImage}
          alt={blog.title}
          className="w-full h-80 sm:h-96 object-cover rounded-2xl mb-8 shadow-sm"
        />
      )}

      <div
        className="prose prose-slate lg:prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />
    </main>
  );
}`;

  // Next.js 16 On-Demand Revalidation Route Handler
  const webhookHandlerSnippet = `// app/api/revalidate/route.ts (Next.js 16 On-Demand ISR Cache Purge)
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { jupsoft } from '@/lib/jupsoft-sdk';

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const signature = req.headers.get('x-signature');
  const secret = process.env.CMS_WEBHOOK_SECRET || '';

  // 1. Verify HMAC SHA-256 signature using the SDK
  const isValid = await jupsoft.verifyWebhookSignature(bodyText, signature, secret);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
  }

  const payload = JSON.parse(bodyText);

  // 2. Invalidate specific article cache and list tags
  if (payload.event === 'blog.published' || payload.event === 'blog.archived') {
    if (payload.slug) {
      revalidateTag(\`blog:\${payload.slug}\`);
    }
    revalidateTag('blogs');
    revalidateTag('blogs-list');
  }

  return NextResponse.json({ revalidated: true, now: Date.now() });
}`;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Developer API Portal &amp; SDK
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
              Next.js 16 Ready
            </span>
          </div>
        </div>

        {/* Tenant Scope Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
          <Globe className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-slate-500 dark:text-slate-400">Target Tenant:</span>
          <span className="font-semibold text-slate-900 dark:text-white">{activeSite.name}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white dark:bg-[#0f172a] p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-800 shadow-2xs">
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

      {/* TAB 1: INTERACTIVE TESTER */}
      {activeTab === 'tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Request Builder Panel (5 Cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-slate-500" />
                Request Configuration
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800/60">
                GET
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Select Endpoint
                </label>
                <select
                  value={selectedEndpoint}
                  onChange={(e) => setSelectedEndpoint(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                >
                  <option value="/v1/blogs">GET /v1/blogs (List Published Posts)</option>
                  <option value="/v1/blogs/{slug}">GET /v1/blogs/&#123;slug&#125; (Full Post + Schema)</option>
                  <option value="/v1/categories">GET /v1/categories (Taxonomy Tree)</option>
                  <option value="/v1/search">GET /v1/search (Full-Text Search)</option>
                </select>
              </div>

              {selectedEndpoint === '/v1/blogs/{slug}' && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Article Slug
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. enterprise-ai-shift"
                    value={slugParam}
                    onChange={(e) => setSlugParam(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                  />
                </div>
              )}

              {selectedEndpoint === '/v1/search' && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Search Query (?q=)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. enterprise"
                    value={searchQueryParam}
                    onChange={(e) => setSearchQueryParam(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Language Locale
                  </label>
                  <select
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="en">English (EN)</option>
                    <option value="hi">Hindi (HI)</option>
                    <option value="fr">French (FR)</option>
                    <option value="ar">Arabic (AR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Authorization Header
                  </label>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-[11px] font-mono text-slate-500 truncate">
                    Bearer {activeSite.apiKey.slice(0, 12)}...
                  </div>
                </div>
              </div>

              {/* cURL Display */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold">cURL Command</label>
                  <button
                    onClick={() => copyToClipboard(curlCommand, 'curl')}
                    className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode === 'curl' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode === 'curl' ? 'Copied' : 'Copy cURL'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto whitespace-pre leading-relaxed border border-slate-800">
                  {curlCommand}
                </pre>
              </div>

              <button
                disabled={isLoadingTest}
                onClick={handleExecuteApi}
                className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isLoadingTest ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Request...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Send Test Request</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Response Console (7 Cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Live Response Console
                  </h3>
                </div>

                {testResponse && (
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800/60">
                      HTTP {testResponse.status} OK
                    </span>
                    <span className="text-slate-400">
                      {testResponse.latencyMs}ms
                    </span>
                  </div>
                )}
              </div>

              {testResponse ? (
                <div className="mt-3 space-y-3">
                  {/* Response Headers */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] font-mono space-y-0.5 text-slate-500 dark:text-slate-400">
                    <div>Content-Type: {testResponse.headers['Content-Type']}</div>
                    <div>X-Tenant-ID: {testResponse.headers['X-Tenant-ID']}</div>
                    <div>X-RateLimit-Remaining: {testResponse.headers['X-RateLimit-Remaining']} / 1000</div>
                    <div>X-Cache: {testResponse.headers['X-Cache']}</div>
                  </div>

                  {/* JSON Body */}
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
                  <div>Ready for request</div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>REST API v1</span>
              <span>Edge Cached</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NEXT.JS 16 SNIPPETS */}
      {activeTab === 'snippets' && (
        <div className="space-y-6">
          {/* Card 1: Environment Variables */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-500" />
                  1. Environment Configuration (`.env.local`)
                </h3>
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

          {/* Card 2: Turnkey Next.js 16 SDK Client */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-blue-500" />
                  2. Next.js 16 Type-Safe Client SDK (`lib/jupsoft-sdk.ts`)
                </h3>
              </div>

              <button
                onClick={() => copyToClipboard(nextjsSdkSnippet, 'next-sdk')}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                {copiedCode === 'next-sdk' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === 'next-sdk' ? 'Copied' : 'Copy SDK'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[460px] leading-relaxed border border-slate-800">
              {nextjsSdkSnippet}
            </pre>
          </div>

          {/* Card 3: Next.js 16 Consumer Dynamic Route */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-emerald-500" />
                  3. Next.js 16 App Router Dynamic Article (`app/blog/[slug]/page.tsx`)
                </h3>
              </div>

              <button
                onClick={() => copyToClipboard(nextjsConsumerSnippet, 'next-page')}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                {copiedCode === 'next-page' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === 'next-page' ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[460px] leading-relaxed border border-slate-800">
              {nextjsConsumerSnippet}
            </pre>
          </div>

          {/* Card 4: Webhook Revalidation Route Handler */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-500" />
                  4. On-Demand ISR Cache Purge Webhook (`app/api/revalidate/route.ts`)
                </h3>
              </div>

              <button
                onClick={() => copyToClipboard(webhookHandlerSnippet, 'webhook-route')}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                {copiedCode === 'webhook-route' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === 'webhook-route' ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[460px] leading-relaxed border border-slate-800">
              {webhookHandlerSnippet}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: SPECS & HEADERS */}
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
    </div>
  );
};
