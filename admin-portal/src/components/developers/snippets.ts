import type { Website } from '../../types/index';

export function getIntegrationSnippets(apiBaseUrl: string, activeSite: Website) {
  const cleanDomain = (activeSite.domain || 'localhost:5001').split(':')[0];

  const envConfigSnippet = `# .env.local (Next.js 16 Consumer Configuration)
NEXT_PUBLIC_CMS_API_URL=${apiBaseUrl}
CMS_TENANT_API_KEY=${activeSite.apiKey}
CMS_WEBSITE_ID=${activeSite.id}
CMS_WEBHOOK_SECRET=wh_sec_jupsoft_default_revalidate_2026
NEXT_PUBLIC_SITE_DOMAIN=https://${activeSite.domain}`;

  const nextConfigSnippet = `// next.config.ts (Next.js 16 Image Optimization for WebP Assets)
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '${cleanDomain}',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;`;

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

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
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
    this.apiUrl = (config?.apiUrl || process.env.NEXT_PUBLIC_CMS_API_URL || '` + apiBaseUrl + `').replace(/\\/$/, '');
    this.apiKey = config?.apiKey || process.env.CMS_TENANT_API_KEY || '` + activeSite.apiKey + `';
    this.websiteId = config?.websiteId || process.env.CMS_WEBSITE_ID || '` + activeSite.id + `';
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

  async getCategories(): Promise<{ success: boolean; data: Category[] }> {
    return this.request<{ success: boolean; data: Category[] }>('/v1/categories', {
      tags: ['categories'],
    });
  }

  async getTags(): Promise<{ success: boolean; data: Tag[] }> {
    return this.request<{ success: boolean; data: Tag[] }>('/v1/tags', {
      tags: ['tags'],
    });
  }

  async search(query: string, lang?: string, limit = 10): Promise<{ success: boolean; data: BlogPost[] }> {
    return this.request<{ success: boolean; data: BlogPost[] }>(
      \`/v1/search?q=\${encodeURIComponent(query)}&lang=\${lang || this.defaultLang}&limit=\${limit}\`,
      { tags: ['blogs'] }
    );
  }

  async getWebsiteInfo(): Promise<any> {
    return this.request<any>('/v1/website');
  }

  recordView(slug: string, blogId?: string): void {
    fetch(\`\${this.apiUrl}/v1/track\`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${this.apiKey}\` 
      },
      body: JSON.stringify({
        websiteId: this.websiteId,
        slug,
        blogId,
      }),
    }).catch(() => {});
  }

  async verifyWebhookSignature(payloadText: string, signature: string | null, secret: string): Promise<boolean> {
    if (!signature || !secret) return false;
    const cleanSig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
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
    return computedHex === cleanSig;
  }
}

export const jupsoft = new JupsoftClient();`;

  // 4. Next.js 16 App Router Blog Listing Grid with Auto-Locale & Sleek Micro-Dropdown
  const nextjsListingSnippet = `// app/blog/page.tsx (Next.js 16 Blog Listing with Auto-Locale & Sleek Micro-Dropdown)
import Link from 'next/link';
import { headers } from 'next/headers';
import { jupsoft } from '@/lib/jupsoft-sdk';

export const revalidate = 3600; // Background ISR revalidation every 1 hour

interface BlogListPageProps {
  searchParams?: Promise<{
    page?: string;
    category?: string;
    tag?: string;
    q?: string;
    lang?: string;
  }>;
}

export async function generateMetadata() {
  return {
    title: 'Blog & Articles | Insights & News',
    description: 'Explore the latest articles, technology guides, and architectural updates.',
  };
}

export default async function BlogListPage({ searchParams }: BlogListPageProps) {
  const sp = (await searchParams) || {};
  const currentPage = Number(sp.page) || 1;
  const selectedCategory = sp.category || '';
  const searchQuery = sp.q || '';

  // 🌐 1. Auto-detect visitor system/browser language from Accept-Language
  const headerStore = await headers();
  const acceptLang = (headerStore.get('accept-language') || '').toLowerCase();
  
  let currentLang = sp.lang;
  if (!currentLang) {
    if (acceptLang.includes('hi')) currentLang = 'hi';
    else if (acceptLang.includes('fr')) currentLang = 'fr';
    else if (acceptLang.includes('ar')) currentLang = 'ar';
    else currentLang = 'en'; // Default fallback is English
  }

  // Parallel fetch for blogs in resolved locale & category tree
  const [blogsRes, categoriesRes] = await Promise.all([
    jupsoft.getBlogs({
      page: currentPage,
      limit: 9,
      category: selectedCategory || undefined,
      q: searchQuery || undefined,
      lang: currentLang,
    }),
    jupsoft.getCategories().catch(() => ({ success: true, data: [] })),
  ]);

  const blogs = blogsRes.data || [];
  const total = blogsRes.meta?.total || blogs.length;
  const totalPages = Math.ceil(total / 9) || 1;
  const categories = categoriesRes.data || [];

  return (
    <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      {/* Header Title */}
      <div className="text-center max-w-3xl mx-auto mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Latest News &amp; Insights
        </h1>
        <p className="text-lg text-slate-600">
          Stay informed with architectural insights, technology guides, and enterprise updates.
        </p>
      </div>

      {/* Filter Bar: Categories on Left + Sleek Micro Language Dropdown on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-4 border-b border-slate-100">
        {/* Category Filter Pills */}
        <div className="flex items-center flex-wrap gap-2">
          <Link
            href={\`/blog?lang=\${currentLang}\`}
            className={\`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors \${
              !selectedCategory
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }\`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={\`/blog?category=\${encodeURIComponent(cat.slug || cat.id)}&lang=\${currentLang}\`}
              className={\`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors \${
                selectedCategory === (cat.slug || cat.id)
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }\`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* 🌐 Sleek Micro Language Dropdown */}
        <div className="relative group inline-block self-end sm:self-auto">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer border border-slate-200/80">
            <span className="text-sm leading-none">🌐</span>
            <span className="uppercase tracking-wider">{currentLang}</span>
            <span className="text-[10px] text-slate-400">▾</span>
          </button>
          <div className="hidden group-hover:block absolute right-0 top-full mt-1.5 w-36 py-1.5 bg-white rounded-xl shadow-lg border border-slate-200 z-50 animate-in fade-in duration-150">
            {[
              { code: 'en', native: 'English' },
              { code: 'hi', native: 'हिंदी' },
              { code: 'fr', native: 'Français' },
              { code: 'ar', native: 'العربية' },
            ].map((l) => (
              <Link
                key={l.code}
                href={\`/blog?lang=\${l.code}\${selectedCategory ? \`&category=\${selectedCategory}\` : ''}\`}
                className={\`flex items-center justify-between px-3.5 py-1.5 text-xs transition-colors \${
                  currentLang === l.code
                    ? 'font-bold text-blue-600 bg-blue-50'
                    : 'text-slate-700 hover:bg-slate-50'
                }\`}
              >
                <span>{l.native}</span>
                <span className="text-[10px] uppercase font-mono text-slate-400">{l.code}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      {blogs.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-lg">No articles found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              {post.featuredImage && (
                <Link href={\`/blog/\${post.slug}?lang=\${currentLang}\`} className="block relative aspect-video overflow-hidden bg-slate-100">
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </Link>
              )}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Recent'}</span>
                  <span>&middot;</span>
                  <span>{post.readTimeMinutes || 5} min read</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
                  <Link href={\`/blog/\${post.slug}?lang=\${currentLang}\`}>{post.title}</Link>
                </h2>
                <p className="text-sm text-slate-600 mb-4 line-clamp-3 flex-1">
                  {post.excerpt}
                </p>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-slate-900">{post.authorName}</span>
                  <Link
                    href={\`/blog/\${post.slug}?lang=\${currentLang}\`}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Read article &rarr;
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          {currentPage > 1 && (
            <Link
              href={\`/blog?page=\${currentPage - 1}&lang=\${currentLang}\${selectedCategory ? \`&category=\${selectedCategory}\` : ''}\`}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50"
            >
              &larr; Previous
            </Link>
          )}
          <span className="text-sm text-slate-500 px-3">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={\`/blog?page=\${currentPage + 1}&lang=\${currentLang}\${selectedCategory ? \`&category=\${selectedCategory}\` : ''}\`}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50"
            >
              Next &rarr;
            </Link>
          )}
        </div>
      )}
    </main>
  );
}`;

  // 5. Next.js 16 Consumer Dynamic Route with Hreflang Tags & Sleek Micro-Dropdown
  const nextjsConsumerSnippet = `// app/blog/[slug]/page.tsx (Next.js 16 Article Detail with Auto-Locale, Hreflang SEO & Micro-Dropdown)
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { jupsoft } from '@/lib/jupsoft-sdk';

export const revalidate = 3600; // Background ISR revalidation every 1 hour

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;

  // Auto-detect visitor system language if not explicitly set
  const headerStore = await headers();
  const acceptLang = (headerStore.get('accept-language') || '').toLowerCase();
  const lang = sp?.lang || (acceptLang.includes('hi') ? 'hi' : acceptLang.includes('fr') ? 'fr' : acceptLang.includes('ar') ? 'ar' : 'en');

  const blog = await jupsoft.getBlogBySlug(slug, lang);
  if (!blog) return { title: 'Article Not Found' };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'https://${activeSite.domain}';

  return {
    title: blog.seo?.metaTitle || blog.title,
    description: blog.seo?.metaDescription || blog.excerpt,
    alternates: {
      canonical: \`\${baseUrl}/blog/\${slug}\${lang !== 'en' ? \`?lang=\${lang}\` : ''}\`,
      // 🔍 Google Search Console Hreflang Multi-Language Indexing Tags
      languages: {
        'en': \`\${baseUrl}/blog/\${slug}?lang=en\`,
        'hi': \`\${baseUrl}/blog/\${slug}?lang=hi\`,
        'fr': \`\${baseUrl}/blog/\${slug}?lang=fr\`,
        'ar': \`\${baseUrl}/blog/\${slug}?lang=ar\`,
        'x-default': \`\${baseUrl}/blog/\${slug}\`,
      },
    },
    openGraph: {
      title: blog.seo?.ogTitle || blog.title,
      description: blog.seo?.ogDescription || blog.excerpt,
      images: blog.featuredImage ? [blog.featuredImage] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.seo?.twitterTitle || blog.title,
      description: blog.seo?.twitterDescription || blog.excerpt,
      images: blog.seo?.twitterImage ? [blog.seo.twitterImage] : (blog.featuredImage ? [blog.featuredImage] : []),
    },
  };
}

export default async function BlogPostPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  // Auto-detect visitor language
  const headerStore = await headers();
  const acceptLang = (headerStore.get('accept-language') || '').toLowerCase();
  const currentLang = sp?.lang || (acceptLang.includes('hi') ? 'hi' : acceptLang.includes('fr') ? 'fr' : acceptLang.includes('ar') ? 'ar' : 'en');

  const blog = await jupsoft.getBlogBySlug(slug, currentLang);

  if (!blog) notFound();

  // Non-blocking view tracking
  jupsoft.recordView(slug, blog.id);

  return (
    <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      {/* Top Bar: Breadcrumbs (Left) + Sleek Micro Language Dropdown (Right) */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <Link href={\`/blog?lang=\${currentLang}\`} className="hover:text-slate-900">Blog</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium truncate max-w-xs">{blog.title}</span>
        </nav>

        {/* 🌐 Sleek Micro Language Dropdown */}
        <div className="relative group inline-block">
          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer border border-slate-200/80">
            <span className="text-sm leading-none">🌐</span>
            <span className="uppercase tracking-wider">{currentLang}</span>
            <span className="text-[10px] text-slate-400">▾</span>
          </button>
          <div className="hidden group-hover:block absolute right-0 top-full mt-1.5 w-36 py-1.5 bg-white rounded-xl shadow-lg border border-slate-200 z-50 animate-in fade-in duration-150">
            {[
              { code: 'en', native: 'English' },
              { code: 'hi', native: 'हिंदी' },
              { code: 'fr', native: 'Français' },
              { code: 'ar', native: 'العربية' },
            ].map((l) => (
              <Link
                key={l.code}
                href={\`/blog/\${slug}?lang=\${l.code}\`}
                className={\`flex items-center justify-between px-3.5 py-1.5 text-xs transition-colors \${
                  currentLang === l.code
                    ? 'font-bold text-blue-600 bg-blue-50'
                    : 'text-slate-700 hover:bg-slate-50'
                }\`}
              >
                <span>{l.native}</span>
                <span className="text-[10px] uppercase font-mono text-slate-400">{l.code}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

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
          <span>{blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : 'Recent'}</span>
          <span>&middot;</span>
          <span>{blog.readTimeMinutes} min read</span>
        </div>
      </header>

      {blog.featuredImage && (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-8 shadow-sm">
          <img
            src={blog.featuredImage}
            alt={blog.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div
        className="prose prose-slate lg:prose-lg max-w-none mb-12"
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />

      <div className="pt-8 border-t border-slate-200 flex items-center justify-between">
        <Link
          href={\`/blog?lang=\${currentLang}\`}
          className="text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          &larr; Back to all articles
        </Link>
      </div>
    </main>
  );
}`;

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

  const sitemapSnippet = `// app/sitemap.ts (Next.js 16 Dynamic Sitemap Generator)
import { MetadataRoute } from 'next';
import { jupsoft } from '@/lib/jupsoft-sdk';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'https://${activeSite.domain}';
  const blogsRes = await jupsoft.getBlogs({ limit: 500 }).catch(() => ({ data: [] }));
  const blogs = blogsRes.data || [];

  const blogEntries: MetadataRoute.Sitemap = blogs.map((blog) => ({
    url: \`\${baseUrl}/blog/\${blog.slug}\`,
    lastModified: blog.publishedAt ? new Date(blog.publishedAt) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: \`\${baseUrl}/blog\`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...blogEntries,
  ];
}`;

  const cliScaffoldPowerShell = `# 🚀 1-Click PowerShell Setup for Next.js 16 (Run from your Next.js project root)
Write-Host "📦 Scaffolding Jupsoft CMS Integration for ${activeSite.name}..." -ForegroundColor Cyan

# 1. Create Directories
New-Item -ItemType Directory -Force -Path "lib", "app/blog", "app/blog/[slug]", "app/api/revalidate" | Out-Null

# 2. Generate .env.local
@'
NEXT_PUBLIC_CMS_API_URL=${apiBaseUrl}
CMS_TENANT_API_KEY=${activeSite.apiKey}
CMS_WEBSITE_ID=${activeSite.id}
CMS_WEBHOOK_SECRET=wh_sec_jupsoft_default_revalidate_2026
NEXT_PUBLIC_SITE_DOMAIN=https://${activeSite.domain}
'@ | Set-Content -Path ".env.local" -Encoding utf8

Write-Host "✅ Created .env.local with tenant ${activeSite.id}" -ForegroundColor Green
Write-Host "👉 Next: Copy lib/jupsoft-sdk.ts, app/blog/page.tsx, and app/api/revalidate/route.ts from API Portal cards below!" -ForegroundColor Yellow`;

  const cliScaffoldBash = `#!/bin/bash
# 🚀 1-Click Bash Setup for Next.js 16 (Run from your Next.js project root)
echo "📦 Scaffolding Jupsoft CMS Integration for ${activeSite.name}..."

# 1. Create Directories
mkdir -p lib app/blog/'[slug]' app/api/revalidate

# 2. Generate .env.local
cat << 'EOF' > .env.local
NEXT_PUBLIC_CMS_API_URL=${apiBaseUrl}
CMS_TENANT_API_KEY=${activeSite.apiKey}
CMS_WEBSITE_ID=${activeSite.id}
CMS_WEBHOOK_SECRET=wh_sec_jupsoft_default_revalidate_2026
NEXT_PUBLIC_SITE_DOMAIN=https://${activeSite.domain}
EOF

echo "✅ Created .env.local with tenant ${activeSite.id}"
echo "👉 Next: Copy lib/jupsoft-sdk.ts, app/blog/page.tsx, and app/api/revalidate/route.ts from API Portal cards below!"`;

  const npmCliSnippet = `# ⚡ Run inside your project root (Next.js, Express, or HTML):
npx github:virajverse/jupsoft-next-blog --site=${activeSite.id} --key=${activeSite.apiKey} --url=${apiBaseUrl} --secret=wh_sec_jupsoft_default_revalidate_2026

# Or install via package.json:
# npm install github:virajverse/jupsoft-next-blog`;

  const universalWidgetSnippet = `<!-- 🌐 Universal Blog Feed Widget (Plain HTML, PHP, WordPress, Laravel, Shopify) -->
<!-- 1. Container where you want the blog feed & reader to render: -->
<div id="jupsoft-blog-feed"
     data-site="${activeSite.id}"
     data-api="${apiBaseUrl}"
     data-limit="9"
     data-lang="auto">
</div>

<!-- 2. Universal script tag (hosted by your CMS backend or CDN): -->
<script src="${apiBaseUrl}/widget/blog.js" async></script>
<!-- Or via high-speed global CDN: -->
<!-- <script src="https://cdn.jsdelivr.net/gh/virajverse/jupsoft-next-blog@main/dist/widget.js" async></script> -->`;

  return {
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
  };
}

