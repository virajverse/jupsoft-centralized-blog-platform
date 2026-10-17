# Jupsoft Centralized Blog Platform — Next.js 14/15 App Router Integration Guide

> **Architecture Overview**: Complete TypeScript and React Server Component implementation for Next.js App Router with Incremental Static Regeneration (ISR), dynamic metadata for SEO, and on-demand cache revalidation.

---

## 1. Environment Setup (`.env.local`)

Add these variables to your Next.js project root:

```env
# Public Client Variables
JUPSOFT_WEBSITE_ID="YOUR_WEBSITE_ID"
JUPSOFT_API_URL="https://blogary.jupsoft.com/v1"

# Server Secret Key (Never prefix with NEXT_PUBLIC_)
JUPSOFT_API_KEY="YOUR_API_KEY"
```

---

## 2. Type Definitions & API Client (`lib/jupsoft-cms.ts`)

```typescript
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  publishedAt: string;
  authorName?: string;
  primaryCategory?: string;
  readTimeMinutes?: number;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
  };
  schemaJsonLd?: Record<string, any>;
}

export interface BlogListResponse {
  success: boolean;
  data: BlogPost[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const API_URL = process.env.JUPSOFT_API_URL || 'https://blogary.jupsoft.com/v1';
const WEBSITE_ID = process.env.JUPSOFT_WEBSITE_ID!;
const API_KEY = process.env.JUPSOFT_API_KEY!;

/**
 * Fetch paginated blogs with ISR caching
 */
export async function getBlogs(page = 1, limit = 9): Promise<BlogPost[]> {
  try {
    const res = await fetch(`${API_URL}/blogs?website=${encodeURIComponent(WEBSITE_ID)}&page=${page}&limit=${limit}`, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': API_KEY,
      },
      next: { revalidate: 60, tags: ['blogs'] }, // Cache for 60 seconds
    });

    if (!res.ok) {
      console.error(`Failed to fetch blogs: HTTP ${res.status}`);
      return [];
    }

    const json = await res.json();
    return json.data || json || [];
  } catch (err) {
    console.error('Error fetching blogs:', err);
    return [];
  }
}

/**
 * Fetch single blog post by slug
 */
export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${API_URL}/blogs/${encodeURIComponent(slug)}?website=${encodeURIComponent(WEBSITE_ID)}`, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': API_KEY,
      },
      next: { revalidate: 60, tags: [`blog-${slug}`] },
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.error(`Error fetching post ${slug}:`, err);
    return null;
  }
}
```

---

## 3. Blog Listing Page (`app/blog/page.tsx`)

```tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getBlogs } from '@/lib/jupsoft-cms';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog & Insights | Company News',
  description: 'Explore the latest articles, guides, and announcements.',
};

export default async function BlogArchivePage() {
  const blogs = await getBlogs(1, 12);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Our Blog & News</h1>
        <p className="mt-3 text-lg text-slate-600">Discover articles, updates, and best practices.</p>
      </div>

      {blogs.length === 0 ? (
        <p className="text-center text-slate-500 py-12">No articles published yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((post) => (
            <article 
              key={post.id} 
              className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              {post.featuredImage && (
                <div className="relative h-52 w-full bg-slate-100">
                  <Image 
                    src={post.featuredImage} 
                    alt={post.title} 
                    fill 
                    className="object-cover" 
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              )}
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                  <span className="text-indigo-600 uppercase tracking-wider">{post.primaryCategory || 'Article'}</span>
                  <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-3 hover:text-indigo-600 transition-colors">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p className="text-slate-600 text-sm line-clamp-3 mb-4 flex-1">
                  {post.excerpt}
                </p>
                <Link 
                  href={`/blog/${post.slug}`} 
                  className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Read full article &rarr;
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
```

---

## 4. Single Article Page with Dynamic SEO (`app/blog/[slug]/page.tsx`)

```tsx
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogBySlug } from '@/lib/jupsoft-cms';
import type { Metadata } from 'next';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getBlogBySlug(params.slug);
  if (!post) return { title: 'Post Not Found' };

  return {
    title: post.seo?.metaTitle || `${post.title} | Blog`,
    description: post.seo?.metaDescription || post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.featuredImage ? [{ url: post.featuredImage }] : [],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getBlogBySlug(params.slug);
  if (!post) notFound();

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      {post.schemaJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(post.schemaJsonLd) }}
        />
      )}

      <div className="mb-8">
        <Link href="/blog" className="text-sm font-semibold text-indigo-600 hover:underline">
          &larr; Back to all articles
        </Link>
        <span className="block mt-4 text-xs font-bold uppercase tracking-wider text-indigo-600">
          {post.primaryCategory || 'Article'}
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 mb-4 leading-tight">
          {post.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>By {post.authorName || 'Editorial Team'}</span>
          <span>•</span>
          <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
          {post.readTimeMinutes && (
            <>
              <span>•</span>
              <span>{post.readTimeMinutes} min read</span>
            </>
          )}
        </div>
      </div>

      {post.featuredImage && (
        <div className="relative h-96 w-full rounded-2xl overflow-hidden mb-10 shadow-sm">
          <Image 
            src={post.featuredImage} 
            alt={post.title} 
            fill 
            priority
            className="object-cover" 
          />
        </div>
      )}

      {/* HTML Content Body (sanitized by CMS API) */}
      <div 
        className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-a:text-indigo-600"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
```

---

## 5. Instant Cache Revalidation Webhook (`app/api/revalidate/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret');
  if (secret !== process.env.JUPSOFT_API_KEY) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  const { slug } = await req.json().catch(() => ({ slug: null }));

  if (slug) {
    revalidateTag(`blog-${slug}`);
  }
  revalidateTag('blogs');

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
```
