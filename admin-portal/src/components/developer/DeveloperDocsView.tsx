'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useBlogStore } from '../../store/useBlogStore';
import { useShallow } from 'zustand/react/shallow';
import {
  BookOpen,
  Code2,
  Terminal,
  Copy,
  Check,
  Globe,
  Layers,
  ArrowRight,
  ExternalLink,
  Zap,
  ShieldCheck,
  FileCode2,
  CheckCircle2,
  LayoutGrid,
  FileText,
  RefreshCw,
  Palette,
  Search,
  Hash,
  Key
} from 'lucide-react';

type FrameworkTab = 'next-app' | 'next-pages' | 'react-vite' | 'vanilla' | 'curl';

export const DeveloperDocsView: React.FC = () => {
  const { activeWebsiteId, websites, currentUser } = useBlogStore(
    useShallow((s) => ({
      activeWebsiteId: s.activeWebsiteId,
      websites: s.websites,
      currentUser: s.currentUser,
    }))
  );

  const [activeFramework, setActiveFramework] = useState<FrameworkTab>('next-app');
  const [activeNextStep, setActiveNextStep] = useState<number>(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeSite = websites.find((w) => w.id === activeWebsiteId) || websites[0];
  const websiteId = activeSite?.id || 'site-pdpmschool';
  const apiKey = activeSite?.apiKey || 'jup_live_sec_your_api_key';
  const apiBaseUrl = 'https://blogary.jupsoft.com';
  const siteDomain = activeSite?.domain || 'pdpmschool.com';
  const siteName = activeSite?.name || 'Selected Website';

  const copyToClipboard = (text: string, keyName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(keyName);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Pre-configured code templates dynamically populated with active tenant credentials
  const envContent = `# Blogary CMS API Environment Configuration
# Target Website: ${siteName} (${siteDomain})
NEXT_PUBLIC_BLOGARY_API_URL=${apiBaseUrl}
BLOGARY_WEBSITE_ID=${websiteId}
BLOGARY_API_KEY=${apiKey}
`;

  const libBlogaryContent = `// lib/blogary.ts
// Enterprise Typed API Client for Blogary Headless CMS

const API_BASE = process.env.NEXT_PUBLIC_BLOGARY_API_URL || '${apiBaseUrl}';
const WEBSITE_ID = process.env.BLOGARY_WEBSITE_ID || '${websiteId}';
const API_KEY = process.env.BLOGARY_API_KEY || '${apiKey}';

export interface BlogPost {
  id: string;
  websiteId: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string; // Sanitized HTML
  featuredImage: string | null;
  featuredImageAlt: string | null;
  authorName: string;
  authorAvatar: string | null;
  publishDate: string;
  readTimeMinutes: number;
  category: { id: string; name: string; slug: string } | null;
  tags: Array<{ id: string; name: string; slug: string }>;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    keywords?: string[];
  };
}

export interface BlogListResponse {
  data: BlogPost[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 1. Fetch Paginated Blog Posts
export async function getBlogs(params?: {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  search?: string;
  lang?: string;
}): Promise<BlogListResponse> {
  const query = new URLSearchParams({
    website: WEBSITE_ID,
    page: String(params?.page || 1),
    limit: String(params?.limit || 12),
    ...(params?.category ? { category: params.category } : {}),
    ...(params?.tag ? { tag: params.tag } : {}),
    ...(params?.search ? { search: params.search } : {}),
    ...(params?.lang ? { lang: params.lang } : {}),
  });

  const res = await fetch(\`\${API_BASE}/v1/blogs?\${query.toString()}\`, {
    headers: {
      'x-api-key': API_KEY,
      'Accept': 'application/json',
    },
    // ISR caching strategy: Revalidate every 60 seconds
    next: { revalidate: 60, tags: ['blogs-feed'] },
  });

  if (!res.ok) {
    throw new Error(\`Failed to fetch blogs: \${res.status} \${res.statusText}\`);
  }

  return res.json();
}

// 2. Fetch Single Blog Post by Slug
export async function getBlogBySlug(slug: string, lang = 'en'): Promise<BlogPost | null> {
  const query = new URLSearchParams({
    website: WEBSITE_ID,
    lang,
  });

  const res = await fetch(\`\${API_BASE}/v1/blogs/\${encodeURIComponent(slug)}?\${query.toString()}\`, {
    headers: {
      'x-api-key': API_KEY,
      'Accept': 'application/json',
    },
    next: { revalidate: 60, tags: [\`blog-\${slug}\`] },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(\`Failed to fetch article: \${res.status} \${res.statusText}\`);
  }

  const json = await res.json();
  return json.data || json;
}

// 3. Fetch Taxonomy Categories
export async function getCategories() {
  const res = await fetch(\`\${API_BASE}/v1/categories?website=\${WEBSITE_ID}\`, {
    headers: { 'x-api-key': API_KEY },
    next: { revalidate: 300 },
  });
  return res.ok ? res.json() : { data: [] };
}
`;

  const appBlogPageContent = `// app/blog/page.tsx
// Production Next.js 14/15/16 App Router Blog Listing Grid
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getBlogs, getCategories } from '@/lib/blogary';

export const revalidate = 60; // Instant On-Demand or 60s background revalidation

export const metadata = {
  title: 'Blog & Articles | ${siteName}',
  description: 'Latest articles, insights and press updates from ${siteName}.',
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; search?: string }>;
}) {
  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const category = resolvedParams.category || '';
  const search = resolvedParams.search || '';

  const [{ data: blogs, meta }, categoriesData] = await Promise.all([
    getBlogs({ page, limit: 9, category, search }),
    getCategories(),
  ]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header Section */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Articles &amp; Insights
        </h1>
        <p className="mt-3 text-base text-slate-600">
          Stay updated with industry perspectives, thought leadership, and operational guides.
        </p>
      </div>

      {/* Category Filter Pills */}
      {categoriesData?.data?.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          <Link
            href="/blog"
            className={\`px-3.5 py-1.5 rounded-full text-xs font-semibold transition \${
              !category ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }\`}
          >
            All Categories
          </Link>
          {categoriesData.data.map((cat: any) => (
            <Link
              key={cat.id}
              href={\`/blog?category=\${cat.slug}\`}
              className={\`px-3.5 py-1.5 rounded-full text-xs font-semibold transition \${
                category === cat.slug ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }\`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Blog Cards Grid */}
      {blogs.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500 text-sm">No articles found matching this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((blog) => (
            <article
              key={blog.id}
              className="flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow group"
            >
              <Link href={\`/blog/\${blog.slug}\`} className="relative aspect-video w-full bg-slate-100 overflow-hidden block">
                {blog.featuredImage ? (
                  <img
                    src={blog.featuredImage}
                    alt={blog.featuredImageAlt || blog.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 font-mono text-xs">
                    No Featured Image
                  </div>
                )}
                {blog.category && (
                  <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-slate-900 text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xs">
                    {blog.category.name}
                  </span>
                )}
              </Link>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <time dateTime={blog.publishDate}>
                      {new Date(blog.publishDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </time>
                    <span>&bull;</span>
                    <span>{blog.readTimeMinutes || 3} min read</span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    <Link href={\`/blog/\${blog.slug}\`}>
                      {blog.title}
                    </Link>
                  </h2>

                  <p className="text-slate-600 text-xs sm:text-sm line-clamp-3 leading-relaxed">
                    {blog.excerpt}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  {blog.authorAvatar ? (
                    <img src={blog.authorAvatar} alt={blog.authorName} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      {blog.authorName.charAt(0)}
                    </div>
                  )}
                  <span className="text-xs font-medium text-slate-700">{blog.authorName}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
`;

  const appBlogSlugContent = `// app/blog/[slug]/page.tsx
// Production Next.js 14/15/16 App Router Article Detail Page with Full SEO & JSON-LD Schema
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogBySlug, getBlogs } from '@/lib/blogary';
import type { Metadata } from 'next';

export const revalidate = 60;

// Dynamic Pre-rendering of published articles
export async function generateStaticParams() {
  try {
    const { data: blogs } = await getBlogs({ limit: 50 });
    return blogs.map((b) => ({ slug: b.slug }));
  } catch {
    return [];
  }
}

// 100% Dynamic SEO Metadata with OpenGraph & Twitter Cards
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) return { title: 'Article Not Found' };

  const pageTitle = blog.seo?.metaTitle || blog.title;
  const pageDesc = blog.seo?.metaDescription || blog.excerpt;
  const pageUrl = \`https://${siteDomain}/blog/\${blog.slug}\`;
  const heroImage = blog.featuredImage || \`https://${siteDomain}/og-default.jpg\`;

  return {
    title: \`\${pageTitle} | ${siteName}\`,
    description: pageDesc,
    alternates: {
      canonical: blog.seo?.canonicalUrl || pageUrl,
    },
    openGraph: {
      title: pageTitle,
      description: pageDesc,
      url: pageUrl,
      type: 'article',
      publishedTime: blog.publishDate,
      authors: [blog.authorName],
      images: [
        {
          url: heroImage,
          width: 1200,
          height: 630,
          alt: blog.featuredImageAlt || blog.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDesc,
      images: [heroImage],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) notFound();

  // JSON-LD Structured Data Schema for Googlebot Rich Snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description: blog.excerpt,
    image: blog.featuredImage ? [blog.featuredImage] : [],
    datePublished: blog.publishDate,
    author: {
      '@type': 'Person',
      name: blog.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: '${siteName}',
      url: 'https://${siteDomain}',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': \`https://${siteDomain}/blog/\${blog.slug}\`,
    },
  };

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Schema Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb Trail */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
        <Link href="/" className="hover:text-slate-900 transition">Home</Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-slate-900 transition">Blog</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium truncate max-w-xs">{blog.title}</span>
      </nav>

      {/* Article Header */}
      <header className="space-y-4 pb-8 border-b border-slate-100">
        {blog.category && (
          <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">
            {blog.category.name}
          </span>
        )}

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          {blog.title}
        </h1>

        <p className="text-lg text-slate-600 leading-relaxed">
          {blog.excerpt}
        </p>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            {blog.authorAvatar ? (
              <img src={blog.authorAvatar} alt={blog.authorName} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                {blog.authorName.charAt(0)}
              </div>
            )}
            <div>
              <div className="font-semibold text-sm text-slate-900">{blog.authorName}</div>
              <div className="text-xs text-slate-500">
                {new Date(blog.publishDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                &bull; {blog.readTimeMinutes || 3} min read
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Featured Image */}
      {blog.featuredImage && (
        <div className="my-8 rounded-2xl overflow-hidden aspect-video bg-slate-100 shadow-md">
          <img
            src={blog.featuredImage}
            alt={blog.featuredImageAlt || blog.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Main Rich Text Content (.blog-content CSS attached) */}
      <div
        className="blog-content prose prose-lg max-w-none text-slate-800 leading-relaxed my-10"
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />

      {/* Tags Taxonomy */}
      {blog.tags && blog.tags.length > 0 && (
        <div className="pt-8 border-t border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Related Tags</div>
          <div className="flex flex-wrap gap-2">
            {blog.tags.map((tag) => (
              <Link
                key={tag.id}
                href={\`/blog?tag=\${tag.slug}\`}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 transition"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Return CTA */}
      <div className="mt-12 pt-6 border-t border-slate-100 flex items-center justify-between">
        <Link
          href="/blog"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5"
        >
          &larr; Back to all articles
        </Link>
      </div>
    </article>
  );
}
`;

  const appRevalidateRouteContent = `// app/api/revalidate/route.ts
// Instant On-Demand Cache Invalidation Webhook Handler
// Blogary CMS triggers this endpoint when an editor publishes or updates an article.
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-revalidate-secret') || req.headers.get('authorization');
    const secret = process.env.REVALIDATE_SECRET_TOKEN || '${apiKey}';

    // Verify authentication secret
    if (authHeader !== secret && authHeader !== \`Bearer \${secret}\`) {
      return NextResponse.json({ message: 'Invalid revalidation secret' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const slug = payload.slug || payload.data?.slug;

    // Purge Blog Listing Feed
    revalidatePath('/blog');
    revalidateTag('blogs-feed');

    // Purge Specific Article Page if slug provided
    if (slug) {
      revalidatePath(\`/blog/\${slug}\`);
      revalidateTag(\`blog-\${slug}\`);
    }

    return NextResponse.json({
      revalidated: true,
      timestamp: Date.now(),
      slug: slug || 'all',
    });
  } catch (err: any) {
    return NextResponse.json({ message: 'Error revalidating', error: err.message }, { status: 500 });
  }
}
`;

  const cssContent = `/* styles/blog-content.css or globals.css */
/* Professional Typography Stylesheet for Blogary HTML Articles */

.blog-content {
  font-family: inherit;
  color: #1e293b;
  line-height: 1.8;
  font-size: 1.0625rem;
}

.blog-content h1,
.blog-content h2,
.blog-content h3,
.blog-content h4 {
  color: #0f172a;
  font-weight: 700;
  line-height: 1.3;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
}

.blog-content h1 { font-size: 2rem; }
.blog-content h2 { font-size: 1.625rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem; }
.blog-content h3 { font-size: 1.25rem; }
.blog-content h4 { font-size: 1.125rem; }

.blog-content p {
  margin-bottom: 1.5rem;
}

.blog-content a {
  color: #4f46e5;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.15s ease;
}

.blog-content a:hover {
  color: #3730a3;
}

.blog-content ul,
.blog-content ol {
  margin-left: 1.5rem;
  margin-bottom: 1.5rem;
}

.blog-content ul { list-style-type: disc; }
.blog-content ol { list-style-type: decimal; }

.blog-content li {
  margin-bottom: 0.5rem;
}

.blog-content blockquote {
  border-left: 4px solid #4f46e5;
  padding-left: 1.25rem;
  margin: 1.75rem 0;
  color: #475569;
  font-style: italic;
  background-color: #f8fafc;
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
  border-radius: 0 0.5rem 0.5rem 0;
}

.blog-content img {
  max-width: 100%;
  height: auto;
  border-radius: 0.75rem;
  margin: 2rem auto;
  display: block;
}

.blog-content pre {
  background-color: #0f172a;
  color: #f8fafc;
  padding: 1.25rem;
  border-radius: 0.75rem;
  overflow-x: auto;
  margin: 1.75rem 0;
  font-family: monospace;
  font-size: 0.875rem;
}

.blog-content code {
  background-color: #f1f5f9;
  color: #0f172a;
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.875em;
}

.blog-content pre code {
  background-color: transparent;
  color: inherit;
  padding: 0;
}

.blog-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 2rem 0;
  font-size: 0.9375rem;
}

.blog-content th,
.blog-content td {
  border: 1px solid #e2e8f0;
  padding: 0.75rem 1rem;
  text-align: left;
}

.blog-content th {
  background-color: #f8fafc;
  font-weight: 600;
  color: #0f172a;
}
`;

  // React SPA snippet
  const reactViteContent = `// src/components/BlogFeed.jsx
import React, { useEffect, useState } from 'react';

const API_BASE = '${apiBaseUrl}';
const WEBSITE_ID = '${websiteId}';
const API_KEY = '${apiKey}';

export function BlogFeed() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(\`\${API_BASE}/v1/blogs?website=\${WEBSITE_ID}&limit=10\`, {
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json',
      },
    })
      .then((res) => res.json())
      .then((json) => {
        setBlogs(json.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load articles', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading published articles...</div>;

  return (
    <div className="blog-grid">
      {blogs.map((blog) => (
        <article key={blog.id} className="blog-card">
          {blog.featuredImage && <img src={blog.featuredImage} alt={blog.title} />}
          <h3>{blog.title}</h3>
          <p>{blog.excerpt}</p>
          <a href={\`/blog/\${blog.slug}\`}>Read Full Article &rarr;</a>
        </article>
      ))}
    </div>
  );
}
`;

  // Vanilla JS / HTML snippet
  const vanillaHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Blog Feed - ${siteName}</title>
  <style>
    body { font-family: sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .card { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; padding: 16px; }
    .card img { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 8px; }
    .card h3 { margin: 12px 0 8px; font-size: 1.15rem; }
    .card p { color: #64748b; font-size: 0.9rem; line-height: 1.5; }
  </style>
</head>
<body>
  <h1>Latest Blog Articles</h1>
  <div id="blog-container" class="grid">Loading articles...</div>

  <script>
    const API_BASE = '${apiBaseUrl}';
    const WEBSITE_ID = '${websiteId}';
    const API_KEY = '${apiKey}';

    async function loadBlogs() {
      try {
        const response = await fetch(\`\${API_BASE}/v1/blogs?website=\${WEBSITE_ID}&limit=6\`, {
          headers: { 'x-api-key': API_KEY, 'Accept': 'application/json' }
        });
        const { data } = await response.json();
        const container = document.getElementById('blog-container');
        
        container.innerHTML = data.map(blog => \`
          <div class="card">
            \${blog.featuredImage ? \`<img src="\${blog.featuredImage}" alt="\${blog.title}">\` : ''}
            <h3>\${blog.title}</h3>
            <p>\${blog.excerpt || ''}</p>
            <a href="/blog.html?slug=\${blog.slug}">Read Article</a>
          </div>
        \`).join('');
      } catch (e) {
        document.getElementById('blog-container').innerText = 'Failed to load blog posts.';
      }
    }
    loadBlogs();
  </script>
</body>
</html>
`;

  const nextSteps = [
    {
      step: 1,
      title: 'Environment Setup',
      desc: 'Define your API Base URL, Website ID, and Secret API Key.',
      file: '.env.local',
      content: envContent,
      keyName: 'env',
    },
    {
      step: 2,
      title: 'API Client SDK Helper',
      desc: 'Type-safe fetchers for listing blogs, article by slug, and taxonomy.',
      file: 'lib/blogary.ts',
      content: libBlogaryContent,
      keyName: 'lib',
    },
    {
      step: 3,
      title: 'Blog Listing Feed',
      desc: 'Responsive cards grid with categories filter, dates, and reading times.',
      file: 'app/blog/page.tsx',
      content: appBlogPageContent,
      keyName: 'listing',
    },
    {
      step: 4,
      title: 'Article Detail & Full SEO',
      desc: 'Server Component with generateMetadata, JSON-LD Schema, and HTML reader.',
      file: 'app/blog/[slug]/page.tsx',
      content: appBlogSlugContent,
      keyName: 'slug',
    },
    {
      step: 5,
      title: 'Instant Cache Invalidation',
      desc: 'Webhook receiver route for On-Demand ISR cache clearing on publish/edit.',
      file: 'app/api/revalidate/route.ts',
      content: appRevalidateRouteContent,
      keyName: 'revalidate',
    },
    {
      step: 6,
      title: 'Typography Stylesheet',
      desc: 'Standardized typography rules for headings, blockquotes, and tables.',
      file: 'styles/blog-content.css',
      content: cssContent,
      keyName: 'css',
    },
  ];

  const currentStepData = nextSteps.find((s) => s.step === activeNextStep) || nextSteps[0];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 select-none pb-12">
      {/* ─── Hero Header ─── */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-mono font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Full-Stack Integration Blueprint &bull; Production Ready</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Developer Integration Guide
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Step-by-step copy-paste code files to integrate Blogary Headless CMS into your website for{' '}
              <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/10">
                {siteName}
              </span>{' '}
              (<span className="font-mono text-indigo-300">{siteDomain}</span>). Upar navbar se website switch karne par saare snippets automatic update ho jate hain.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href={`/settings?tab=developer${websiteId ? '&site=' + websiteId : ''}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Code2 className="w-4 h-4" />
              <span>API Explorer &amp; Live Sandbox</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-all cursor-pointer"
            >
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Active Tenant Quick Credentials Strip ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Website ID</div>
            <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{websiteId}</div>
          </div>
          <button
            onClick={() => copyToClipboard(websiteId, 'stripSite')}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
            title="Copy Website ID"
          >
            {copiedKey === 'stripSite' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">REST API Gateway</div>
            <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{apiBaseUrl}</div>
          </div>
          <button
            onClick={() => copyToClipboard(apiBaseUrl, 'stripBase')}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
            title="Copy API Base URL"
          >
            {copiedKey === 'stripBase' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5 min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Secret API Key</div>
            <div className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
              {apiKey.slice(0, 14)}••••••••••••
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(apiKey, 'stripKey')}
            className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
            title="Copy API Secret Key"
          >
            {copiedKey === 'stripKey' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ─── Framework Selection Header ─── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Choose Your Framework</h2>
            <p className="text-xs text-slate-500">Select the technology stack running on your client frontend.</p>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {[
              { id: 'next-app', label: 'Next.js App Router (Recommended)' },
              { id: 'react-vite', label: 'React / Vite SPA' },
              { id: 'vanilla', label: 'HTML / JS / PHP' },
              { id: 'curl', label: 'cURL / HTTP' },
            ].map((fw) => (
              <button
                key={fw.id}
                onClick={() => setActiveFramework(fw.id as FrameworkTab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeFramework === fw.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {fw.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Tab Content 1: Next.js App Router (Full 6-Step Blueprint) ─── */}
      {activeFramework === 'next-app' && (
        <div className="space-y-6">
          {/* Step Selector Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {nextSteps.map((s) => (
              <button
                key={s.step}
                onClick={() => setActiveNextStep(s.step)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  activeNextStep === s.step
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-xs'
                    : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      activeNextStep === s.step
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Step {s.step}
                  </span>
                  <code className="text-[10px] font-mono text-slate-400 truncate max-w-[80px]">
                    {s.file.split('/').pop()}
                  </code>
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.title}</div>
              </button>
            ))}
          </div>

          {/* Active Step Code Viewer */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Top Toolbar */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    Step {currentStepData.step} of 6:
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {currentStepData.title}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                    {currentStepData.file}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{currentStepData.desc}</p>
              </div>

              <button
                onClick={() => copyToClipboard(currentStepData.content, currentStepData.keyName)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
              >
                {copiedKey === currentStepData.keyName ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy File Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Body */}
            <div className="p-4 bg-slate-950 overflow-x-auto">
              <pre className="text-xs font-mono text-slate-200 whitespace-pre leading-relaxed select-all">
                {currentStepData.content}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab Content 2: React Vite SPA ─── */}
      {activeFramework === 'react-vite' && (
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                React Vite Component Example (src/components/BlogFeed.jsx)
              </div>
              <p className="text-[11px] text-slate-500">Standard useEffect hook for client-side React applications.</p>
            </div>
            <button
              onClick={() => copyToClipboard(reactViteContent, 'reactVite')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
            >
              {copiedKey === 'reactVite' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'reactVite' ? 'Copied' : 'Copy React Component'}</span>
            </button>
          </div>
          <div className="p-4 bg-slate-950 overflow-x-auto">
            <pre className="text-xs font-mono text-slate-200 whitespace-pre leading-relaxed select-all">
              {reactViteContent}
            </pre>
          </div>
        </div>
      )}

      {/* ─── Tab Content 3: HTML & Vanilla JS ─── */}
      {activeFramework === 'vanilla' && (
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Vanilla HTML &amp; JavaScript Integration (index.html)
              </div>
              <p className="text-[11px] text-slate-500">Zero dependencies. Works with WordPress, PHP, or raw HTML static sites.</p>
            </div>
            <button
              onClick={() => copyToClipboard(vanillaHtmlContent, 'vanilla')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
            >
              {copiedKey === 'vanilla' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'vanilla' ? 'Copied' : 'Copy HTML & Script'}</span>
            </button>
          </div>
          <div className="p-4 bg-slate-950 overflow-x-auto">
            <pre className="text-xs font-mono text-slate-200 whitespace-pre leading-relaxed select-all">
              {vanillaHtmlContent}
            </pre>
          </div>
        </div>
      )}

      {/* ─── Tab Content 4: cURL & HTTP ─── */}
      {activeFramework === 'curl' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">1. List Published Articles</span>
              <button
                onClick={() => copyToClipboard(`curl -X GET "${apiBaseUrl}/v1/blogs?website=${websiteId}&limit=10" -H "x-api-key: ${apiKey}"`, 'curlList')}
                className="text-xs text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
              >
                {copiedKey === 'curlList' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Command</span>
              </button>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto">
              curl -X GET &quot;{apiBaseUrl}/v1/blogs?website={websiteId}&amp;limit=10&quot; \<br />
              &nbsp;&nbsp;-H &quot;x-api-key: {apiKey}&quot; \<br />
              &nbsp;&nbsp;-H &quot;Accept: application/json&quot;
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">2. Fetch Article by Slug</span>
              <button
                onClick={() => copyToClipboard(`curl -X GET "${apiBaseUrl}/v1/blogs/sample-article-slug?website=${websiteId}" -H "x-api-key: ${apiKey}"`, 'curlSlug')}
                className="text-xs text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
              >
                {copiedKey === 'curlSlug' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Command</span>
              </button>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto">
              curl -X GET &quot;{apiBaseUrl}/v1/blogs/sample-article-slug?website={websiteId}&quot; \<br />
              &nbsp;&nbsp;-H &quot;x-api-key: {apiKey}&quot;
            </div>
          </div>
        </div>
      )}

      {/* ─── Field Mapping Data Dictionary (Data Contract) ─── */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Blogary API Data Dictionary (Response Fields)
          </h2>
          <p className="text-[11px] text-slate-500">
            Use this contract to map Blogary JSON attributes into your website UI components.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3">Field Key</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Frontend Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">title</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">string</td>
                <td className="py-2.5 px-3">Primary editorial headline of the blog post.</td>
                <td className="py-2.5 px-3 font-mono text-xs text-slate-500">&lt;h1&gt;&#123;blog.title&#125;&lt;/h1&gt;</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">slug</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">string</td>
                <td className="py-2.5 px-3">Unique URL identifier (e.g. &apos;cloud-erp-modern-schools&apos;).</td>
                <td className="py-2.5 px-3 font-mono text-xs text-slate-500">&lt;Link href=&#123;&apos;/blog/&apos; + blog.slug&#125;&gt;</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">excerpt</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">string</td>
                <td className="py-2.5 px-3">Summary / dek displayed on cards and used for meta description.</td>
                <td className="py-2.5 px-3 font-mono text-xs text-slate-500">&lt;p&gt;&#123;blog.excerpt&#125;&lt;/p&gt;</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">content</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">HTML string</td>
                <td className="py-2.5 px-3">Full sanitized rich text body produced by Tiptap editor.</td>
                <td className="py-2.5 px-3 font-mono text-xs text-slate-500">dangerouslySetInnerHTML</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">featuredImage</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">string (URL)</td>
                <td className="py-2.5 px-3">AWS S3 / CloudFront CDN URL for hero banner image.</td>
                <td className="py-2.5 px-3 font-mono text-xs text-slate-500">&lt;img src=&#123;blog.featuredImage&#125; /&gt;</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">authorName</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">string</td>
                <td className="py-2.5 px-3">Display name of writer or editor.</td>
                <td className="py-2.5 px-3 font-mono text-xs text-slate-500">By &#123;blog.authorName&#125;</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">publishDate</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">ISO string</td>
                <td className="py-2.5 px-3">Publication timestamp (supports editorial backdating).</td>
                <td className="py-2.5 px-3 font-mono text-xs text-slate-500">new Date(blog.publishDate)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">readTimeMinutes</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">number</td>
                <td className="py-2.5 px-3">Word-count based estimate of article duration.</td>
                <td className="py-2.5 px-3 font-mono text-xs text-slate-500">&#123;blog.readTimeMinutes&#125; min read</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">category</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">&#123; id, name, slug &#125;</td>
                <td className="py-2.5 px-3">Primary editorial category taxonomy.</td>
                <td className="py-2.5 px-3 font-mono text-xs text-slate-500">Badge pill / Filter filter</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">tags</td>
                <td className="py-2.5 px-3 font-mono text-slate-400">Array&lt;&#123; name, slug &#125;&gt;</td>
                <td className="py-2.5 px-3">Relational topic tags (&apos;breaking&apos;, &apos;cloud&apos;, &apos;ai&apos;).</td>
                <td className="py-2.5 px-3 font-mono text-xs text-slate-500">Tag badges list</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Troubleshooting & FAQ Checklist ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Why am I getting HTTP 404 &apos;Cannot GET /v1/blogs&apos;?</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ensure query parameter <code className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">?website={websiteId}</code> is included in all GET requests. Blogary uses website scoping to isolate tenants.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
            <Palette className="w-4 h-4 text-indigo-500" />
            <span>Why is my HTML article body unstyled?</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Attach the <code className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">.blog-content</code> CSS class to your container. Copy the CSS rules from Step 6 into your project&apos;s global stylesheet.
          </p>
        </div>
      </div>
    </div>
  );
};
