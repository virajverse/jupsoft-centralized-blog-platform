# Consumer Website Integration Guide (TRD §12 & §13)
## Headless Next.js 16 (App Router) Integration for Jupsoft, DigifyNext & School ERP

This guide provides copy-paste ready code for frontend engineering teams integrating consumer websites (`jupsoft.com`, `digifynext.com`, `schoolerp.in`) with the Centralized Jupsoft CMS Backend.

---

## 🏗️ Architecture Overview

Consuming websites use the **Hybrid Delivery Model (TRD §13)**:
1. **Server-Side Fetching (SSR / ISR):** Pages fetch content server-side via the `/v1` REST API, cached in Redis and Next.js Data Cache (`revalidate = 3600`).
2. **On-Demand Revalidation Webhook:** When an article is published or updated in the CMS, a signed webhook invalidates the cached page instantly.
3. **SEO Guarantees:** Search engine crawlers receive 100% pre-rendered HTML with full OpenGraph, Twitter Cards, canonical links, hreflang tags, and Schema.org JSON-LD structured data.

---

## 📁 1. Environment Configuration

In your consumer website's `.env.local`:

```env
# Centralized CMS Backend URL
NEXT_PUBLIC_CMS_API_URL=https://api.jupsoft.com
# Your tenant-specific API key (obtain from CMS Admin Portal -> Settings)
CMS_TENANT_API_KEY=key_cloud_prod_8f9a2b1c3d4e5f6a7b8c9d0e
# Webhook shared secret for HMAC-SHA256 revalidation (same value as backend WEBHOOK_DEFAULT_SECRET — no default)
CMS_WEBHOOK_SECRET=<your-webhook-secret>
```

---

## 🚀 2. API Client Helper (`lib/cms.ts`)

```typescript
// lib/cms.ts
const CMS_URL = process.env.NEXT_PUBLIC_CMS_API_URL || 'http://localhost:4000';
const API_KEY = process.env.CMS_TENANT_API_KEY || '';

export async function fetchPublishedBlogs(params?: {
  category?: string;
  tag?: string;
  lang?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.tag) query.set('tag', params.tag);
  if (params?.lang) query.set('lang', params.lang);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await fetch(`${CMS_URL}/v1/blogs?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
    next: { tags: ['blogs-list'], revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`Failed to fetch blogs: ${res.statusText}`);
  return res.json();
}

export async function fetchBlogBySlug(slug: string, lang = 'en') {
  const res = await fetch(`${CMS_URL}/v1/blogs/${slug}?lang=${lang}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
    next: { tags: [`blog:${slug}`], revalidate: 3600 },
  });

  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}
```

---

## 📄 3. Blog Detail Page (`app/blog/[slug]/page.tsx`)

```tsx
// app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { fetchBlogBySlug } from '@/lib/cms';

export const revalidate = 3600; // ISR fallback TTL (1 hour)

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { lang = 'en' } = await searchParams;
  const blog = await fetchBlogBySlug(slug, lang);

  if (!blog) return { title: 'Article Not Found' };

  return {
    title: blog.seo.metaTitle,
    description: blog.seo.metaDescription,
    alternates: {
      canonical: blog.seo.canonicalUrl,
      languages: blog.seo.hreflang?.reduce((acc: any, curr: any) => {
        acc[curr.lang] = curr.href;
        return acc;
      }, {}),
    },
    openGraph: {
      title: blog.seo.ogTitle || blog.title,
      description: blog.seo.ogDescription || blog.excerpt,
      images: [blog.seo.ogImage || blog.featuredImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.seo.twitterTitle || blog.title,
      description: blog.seo.twitterDescription || blog.excerpt,
      images: [blog.seo.twitterImage || blog.featuredImage],
    },
  };
}

export default async function BlogDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lang = 'en' } = await searchParams;
  const blog = await fetchBlogBySlug(slug, lang);

  if (!blog) notFound();

  return (
    <article className="max-w-4xl mx-auto px-4 py-12">
      {/* Schema.org JSON-LD Structured Data */}
      {blog.schemaJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(blog.schemaJsonLd) }}
        />
      )}

      {blog.featuredImage && (
        <img
          src={blog.featuredImage}
          alt={blog.title}
          className="w-full h-96 object-cover rounded-2xl mb-8 shadow-lg"
        />
      )}

      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
          {blog.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>By {blog.authorName}</span>
          <span>•</span>
          <span>{blog.readTimeMinutes} min read</span>
          <span>•</span>
          <time dateTime={blog.publishedAt}>
            {new Date(blog.publishedAt).toLocaleDateString()}
          </time>
        </div>
      </header>

      {/* Render Sanitized Rich-Text Content */}
      <div
        className="prose prose-lg max-w-none text-slate-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />
    </article>
  );
}
```

---

## ⚡ 4. Webhook ISR Revalidation Route (`app/api/revalidate/route.ts`)

```typescript
// app/api/revalidate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import * as crypto from 'crypto';

export async function POST(req: NextRequest) {
  const secret = process.env.CMS_WEBHOOK_SECRET; // required — no hardcoded fallback
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'CMS_WEBHOOK_SECRET not configured' }, { status: 500 });
  }
  const signatureHeader = req.headers.get('x-signature') || '';
  const timestampHeader = req.headers.get('x-timestamp') || '';

  const rawBody = await req.text();

  // 1. Replay Protection: reject requests older than 5 minutes
  if (timestampHeader) {
    const ageMs = Date.now() - Number(timestampHeader);
    if (ageMs > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Webhook timestamp expired' }, { status: 400 });
    }
  }

  // 2. HMAC-SHA256 Signature Verification
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')}`;

  if (signatureHeader !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const { event, slug } = payload;

  // 3. Trigger On-Demand Next.js Cache Revalidation
  if (slug) {
    revalidateTag(`blog:${slug}`);
    revalidateTag('blogs-list');
  }

  return NextResponse.json({
    revalidated: true,
    event,
    slug,
    timestamp: new Date().toISOString(),
  });
}
```

---

## 📈 5. Non-Blocking Analytics Tracking (`components/BlogTracker.tsx`)

```tsx
// components/BlogTracker.tsx
'use client';
import { useEffect } from 'react';

export function BlogTracker({ blogId, websiteId }: { blogId: string; websiteId: string }) {
  useEffect(() => {
    let sessionId = sessionStorage.getItem('jupsoft_cms_sess');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substring(2) + Date.now();
      sessionStorage.setItem('jupsoft_cms_sess', sessionId);
    }

    // Fire-and-forget lightweight tracking to CMS backend
    fetch(`${process.env.NEXT_PUBLIC_CMS_API_URL}/v1/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blogId,
        websiteId,
        sessionId,
        referrer: document.referrer || '',
        event: 'page_view',
      }),
      keepalive: true,
    }).catch(() => {});
  }, [blogId, websiteId]);

  return null;
}
```
