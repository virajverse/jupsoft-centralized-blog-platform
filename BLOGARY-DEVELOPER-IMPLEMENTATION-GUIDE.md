# Blogary CMS: PopWave Native Integration & Implementation Guide

> **Document Type:** Production Engineering Blueprint & Integration Specification  
> **Target Properties:** Blogary CMS (`centralized-blog-platform`) ⟷ PopWave Portal (`popwave.in`)  
> **Core Architecture Principle:** 100% Native Multi-Tenant Integration (Zero Schema Disruption, Zero Forced Rules, Zero Clutter)  
> **Status:** Finalized & Validated (Backend builds with 0 errors; uses existing native database models and APIs)  
> **Policy:** Strict 0-emoji policy across all code, documentation, and commit messages.  

---

## 1. Executive Summary & Native Multi-Tenant Philosophy

Blogary is a centralized multi-tenant content management system powering multiple live corporate, SaaS, and institutional properties (`digifynext.com`, `Jupsoft.com`, `gdgoenkagurgaon.org`, `pdpschool.com`, `pinegrove.in`, etc.).

### 1.1 Non-Intrusive, Zero-Disruption Mandate
* **Zero Database Schema Pollution:** We do not force single-tenant columns (`reactions`, `isSponsored`, `postType`, `dek`, `keyPoints`, `agencySource`, `dateline`) into the core `Blog` or `BlogTranslation` models.
* **No Broken Builds:** Preserves existing TypeScript contracts and public API outputs so existing consuming websites never experience breaking changes.
* **Native Feature Reuse:** Every feature required by PopWave is already natively supported by Blogary:
  * **Sub-headline / Summary:** Natively powered by `BlogTranslation.excerpt`.
  * **Categorization & Feeds:** Natively powered by Blogary's relational `Category` (`categories`) model (`News`, `Entertainment`, `Tech`, `Sports`, `Lifestyle`, `Food`, `Viral`, `Videos`).
  * **Breaking & Trending Signals:** Natively powered by Blogary's relational `Tag` (`tags`) model (`breaking`, `lead`, `trending`).
  * **Rich Editorial Presentation:** Natively powered by the Tiptap WYSIWYG editor (bullet takeaway boxes, wire attribution, datelines, embedded video players).
  * **Media & CDN:** Natively powered by AWS S3 presigned uploads and CloudFront WebP CDN (`MediaService`).
  * **Instant Cache Invalidation:** Natively powered by HMAC SHA-256 Webhook dispatcher.

---

## 2. High-Level Native Architecture

```mermaid
flowchart TD
    subgraph EditorialStudio["Blogary Editorial Studio (Next.js 16 Admin - Port 3000)"]
        SiteDropdown["Website Selector: Select 'PopWave News'"]
        NativeEditor["Standard BlogEditor (Tiptap Engine)"]
        NativeTaxonomy["Native Categories & Tags (Tech, Sports, Breaking, etc.)"]
        NativeMedia["S3 Presigned Media Library"]
    end

    subgraph BackendGateway["Blogary Core Gateway (NestJS 11 - Port 4010)"]
        CoreBlogsModule["Standard Blogs Module (Existing)"]
        PublicV1API["Public Reader API v1 (/v1/blogs)"]
        WebhookDispatcher["Automated HMAC SHA-256 Webhook Dispatcher"]
    end

    subgraph PersistenceLayer["Database (PostgreSQL 16) & Cache (Redis 7)"]
        DB_Websites["websites (site-popwave)"]
        DB_Taxonomy["categories & tags (PopWave scoped)"]
        DB_Blogs["blogs & blog_translations (Clean Core)"]
        RedisCache["Edge Redis Cache (5s - 60s TTL)"]
    end

    subgraph PopWaveConsumer["PopWave Consumer Web App (popwave.in - Port 3005)"]
        UI_Home["Homepage (Lead Story, Ticker, Category Blocks)"]
        UI_Article["Article Reader (Title, Excerpt, HTML Body, Author)"]
        UI_Categories["Category Feeds (/category/tech, /category/sports)"]
        UI_Videos["Video Hub (/videos via 'Videos' Category)"]
        ISR_Webhook["Webhook Receiver (/api/revalidate)"]
    end

    SiteDropdown --> NativeEditor
    NativeEditor --> NativeTaxonomy
    NativeEditor --> NativeMedia
    NativeEditor -->|Publish Article| CoreBlogsModule

    CoreBlogsModule --> DB_Blogs
    CoreBlogsModule --> DB_Taxonomy
    CoreBlogsModule --> WebhookDispatcher

    PublicV1API --> DB_Blogs
    PublicV1API --> RedisCache

    UI_Home -->|GET /v1/blogs?tag=breaking| PublicV1API
    UI_Home -->|GET /v1/blogs?limit=5 (Lead + Side)| PublicV1API
    UI_Categories -->|GET /v1/blogs?category=:slug| PublicV1API
    UI_Article -->|GET /v1/blogs/:slug| PublicV1API
    UI_Videos -->|GET /v1/blogs?category=videos| PublicV1API

    WebhookDispatcher -.->|POST /api/revalidate on Publish/Edit| ISR_Webhook
```

---

## 3. Mapping: PopWave Requirements to Blogary Native Capabilities

| PopWave UI Requirement | How It Maps Natively to Blogary | Required Schema Changes |
|---|---|---|
| **Sub-headline (Dek)** | `BlogTranslation.excerpt` (The standard 1-line article summary). | **None (Native)** |
| **Headline & Content** | `BlogTranslation.title` & `BlogTranslation.content` (Full rich text / HTML). | **None (Native)** |
| **Featured Lead Hero** | Latest published article on PopWave (`GET /v1/blogs?limit=1`) or tagged `lead`. | **None (Native)** |
| **Hero Side Stories** | Next 4 published articles (`GET /v1/blogs?limit=5`). | **None (Native)** |
| **Breaking News Ticker** | Articles tagged with `breaking` (`GET /v1/blogs?tag=breaking&limit=5`). | **None (Native)** |
| **Category Feeds** | PopWave categories: `News`, `Tech`, `Sports`, `Entertainment`, `Food`, `Lifestyle`, `Viral`. | **None (Native)** |
| **Video Stories** | Category `Videos` or tag `video` with embedded video player in content. | **None (Native)** |
| **Key Takeaways Box** | Formatted directly inside Tiptap as a stylized callout or bullet list. | **None (Native)** |
| **Wire Attribution & Dateline** | Authored directly in story lead (`NEW DELHI (PTI) — ...`) or author profile. | **None (Native)** |
| **Author Name & Avatar** | `Blog.authorName` and `Blog.authorAvatar` (Existing author system). | **None (Native)** |
| **Featured Images** | `Blog.featuredImage` & `Blog.featuredImageAlt` via AWS S3 / CloudFront. | **None (Native)** |
| **Cache Invalidation** | HMAC SHA-256 webhook to PopWave's `/api/revalidate`. | **None (Native)** |

---

## 4. Step 1: PopWave Tenant & Taxonomy Seeding (One-Time SQL)

To onboard PopWave into Blogary's multi-tenant ecosystem, we execute a single SQL seed to insert the website and its core editorial taxonomy.

```sql
-- 1. Register PopWave in websites table
INSERT INTO "websites" (
  "id", 
  "name", 
  "domain", 
  "apiKey", 
  "webhookSecret", 
  "webhookUrl", 
  "createdAt", 
  "updatedAt"
) VALUES (
  'site-popwave', 
  'PopWave News', 
  'popwave.in', 
  'pw_live_sec_78d91f42a0b1c2e3', 
  'pw_whsec_9941a8e72c5b3d01', 
  'https://popwave.in/api/revalidate', 
  NOW(), 
  NOW()
) ON CONFLICT ("id") DO UPDATE SET
  "domain" = EXCLUDED."domain",
  "apiKey" = EXCLUDED."apiKey",
  "webhookUrl" = EXCLUDED."webhookUrl";

-- 2. Register PopWave Editorial Categories
INSERT INTO "categories" ("id", "websiteId", "name", "slug") VALUES
  ('cat-pw-news', 'site-popwave', 'News', 'news'),
  ('cat-pw-entertainment', 'site-popwave', 'Entertainment', 'entertainment'),
  ('cat-pw-tech', 'site-popwave', 'Tech', 'tech'),
  ('cat-pw-sports', 'site-popwave', 'Sports', 'sports'),
  ('cat-pw-lifestyle', 'site-popwave', 'Lifestyle', 'lifestyle'),
  ('cat-pw-food', 'site-popwave', 'Food', 'food'),
  ('cat-pw-viral', 'site-popwave', 'Viral', 'viral'),
  ('cat-pw-videos', 'site-popwave', 'Videos', 'videos')
ON CONFLICT ("websiteId", "slug") DO NOTHING;

-- 3. Register PopWave Editorial Tags
INSERT INTO "tags" ("id", "websiteId", "name", "slug") VALUES
  ('tag-pw-breaking', 'site-popwave', 'Breaking News', 'breaking'),
  ('tag-pw-trending', 'site-popwave', 'Trending', 'trending'),
  ('tag-pw-lead', 'site-popwave', 'Lead Story', 'lead')
ON CONFLICT ("websiteId", "slug") DO NOTHING;
```

---

## 5. Step 2: Editorial Workflow in Admin Studio (Zero Code Changes)

Editors and writers manage PopWave content using Blogary's existing production features:

1. **Select Website:**
   * In the top-header website switcher, select **"PopWave News"** (`site-popwave`).
2. **Create New Article:**
   * Click **"+ New Article"** (`/blogs/new`).
   * **Title:** Enter article headline.
   * **Excerpt:** Enter the sub-headline / deck summary (serves as `dek` on PopWave).
   * **Content:** Author in Tiptap WYSIWYG editor. Add bullet highlights, embed images, or paste video links.
   * **Featured Image:** Upload or choose from S3 Media Library.
   * **Categories:** Check appropriate section (e.g. `Tech`, `Entertainment`, `Sports`, `Videos`).
   * **Tags:** Add `breaking` to show in the breaking news ticker, or `lead` for the main hero slot.
3. **Publish Article:**
   * Transition status to **Published**.
   * Blogary automatically triggers the HMAC webhook to `https://popwave.in/api/revalidate`, refreshing PopWave's cache within milliseconds.

---

## 6. Step 3: Consumer Integration on PopWave (`popwave.in`)

PopWave's Next.js App Router codebase (`D:\Company work\News Writter Agentic AI`) connects to Blogary's existing Public API v1.

### 6.1 Environment Configuration (`.env.local`)
```env
NEXT_PUBLIC_BLOGARY_API_URL=https://blogary.jupsoft.com
BLOGARY_API_KEY=pw_live_sec_78d91f42a0b1c2e3
CMS_WEBHOOK_SECRET=pw_whsec_9941a8e72c5b3d01
```

### 6.2 Data Fetching Layer (`lib/blogary-api.ts`)
```typescript
const BASE_URL = process.env.NEXT_PUBLIC_BLOGARY_API_URL || 'https://blogary.jupsoft.com';
const API_KEY = process.env.BLOGARY_API_KEY || '';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  };
}

/**
 * Fetch articles for homepage feeds
 */
export async function getArticles(params: {
  category?: string;
  tag?: string;
  limit?: number;
  page?: number;
} = {}) {
  const { category, tag, limit = 10, page = 1 } = params;
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(category ? { category } : {}),
    ...(tag ? { tag } : {}),
  });

  const res = await fetch(`${BASE_URL}/v1/blogs?${qs.toString()}`, {
    headers: getHeaders(),
    next: { tags: [category ? `cat-${category}` : 'articles'], revalidate: 60 },
  });

  if (!res.ok) return { data: [], total: 0 };
  const json = await res.json();
  
  // Normalize Blogary payload to PopWave Article interface
  const articles = (json.data || []).map((b: any) => ({
    id: b.id,
    slug: b.slug,
    title: b.title,
    dek: b.excerpt || '',
    category: b.categories?.[0]?.name || 'News',
    author: {
      name: b.authorName || 'PopWave Desk',
      avatar: b.authorAvatar || '',
    },
    publishedAt: b.publishDate || b.createdAt,
    readTime: `${b.readTimeMinutes || 3} min read`,
    image: b.featuredImage || '/assets/img/monsoon.jpg',
    imageAlt: b.featuredImageAlt || b.title,
  }));

  return { data: articles, total: json.total || articles.length };
}

/**
 * Fetch active breaking news headlines for top marquee
 */
export async function getBreakingNews() {
  const { data } = await getArticles({ tag: 'breaking', limit: 5 });
  return data;
}

/**
 * Fetch top lead story for homepage hero
 */
export async function getLeadStory() {
  const { data } = await getArticles({ limit: 1 });
  return data[0] || null;
}

/**
 * Fetch single article details by slug
 */
export async function getArticleBySlug(slug: string, language = 'en') {
  const res = await fetch(`${BASE_URL}/v1/blogs/${slug}?lang=${language}`, {
    headers: getHeaders(),
    next: { tags: [`article-${slug}`], revalidate: 60 },
  });

  if (!res.ok) return null;
  const json = await res.json();
  const b = json.data;
  if (!b) return null;

  return {
    id: b.id,
    slug: b.slug,
    title: b.title,
    dek: b.excerpt || '',
    category: b.categories?.[0]?.name || 'News',
    author: {
      name: b.authorName || 'PopWave Desk',
      avatar: b.authorAvatar || '',
    },
    publishedAt: b.publishDate || b.createdAt,
    readTime: `${b.readTimeMinutes || 3} min read`,
    image: b.featuredImage || '',
    imageAlt: b.featuredImageAlt || b.title,
    content: b.content || '',
    categories: b.categories || [],
    tags: b.tags || [],
    seo: b.seo,
  };
}

/**
 * Fetch video stories
 */
export async function getVideoStories(limit = 6) {
  const { data } = await getArticles({ category: 'videos', limit });
  return data;
}
```

### 6.3 On-Demand Cache Invalidation Route (`app/api/revalidate/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-signature');
  const secret = process.env.CMS_WEBHOOK_SECRET;
  const rawBody = await req.text();

  if (secret && signature) {
    const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (hmac !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  try {
    const payload = JSON.parse(rawBody);

    // Invalidate article cache
    if (payload.slug) {
      revalidateTag(`article-${payload.slug}`);
    }

    // Invalidate breaking ticker & category feeds
    revalidateTag('articles');
    revalidatePath('/');

    return NextResponse.json({ revalidated: true, timestamp: Date.now() });
  } catch (err) {
    return NextResponse.json({ error: 'Malformed payload' }, { status: 400 });
  }
}
```

---

## 7. FastMCP AI News Writer Integration (`jupsoft-cms-mcp`)

The Agentic AI News Writer writes directly to PopWave without requiring any new tools or custom models. It utilizes the existing `cms_create_blog` tool:

```json
{
  "websiteId": "site-popwave",
  "authorName": "AI Wire Desk",
  "translations": [
    {
      "lang": "en",
      "title": "ISRO Successfully Launches Advanced Navigation Satellite",
      "slug": "isro-launches-advanced-navigation-satellite",
      "excerpt": "Next-gen satellite will enhance civilian navigation and military communications across South Asia.",
      "content": "<p><strong>SRIHARIKOTA</strong> — The Indian Space Research Organisation (ISRO) successfully launched...</p>"
    }
  ],
  "categoryIds": ["cat-pw-tech", "cat-pw-news"],
  "tagIds": ["tag-pw-breaking"],
  "status": "Published"
}
```

Because `cms_create_blog` maps natively to Blogary's core `Blog` and `BlogTranslation` models, automated wire drafting works out of the box with 0 new tools.

---

## 8. Verification & Live Health Checklist

| Verification Step | Command / Action | Expected Result |
|---|---|---|
| **Backend Clean Build** | `cd backend && npm run build` | 0 TypeScript errors (`nest build` succeeds). |
| **Admin Portal Clean Build** | `cd admin-portal && npm run build` | 0 TypeScript errors (`next build` succeeds). |
| **PopWave Seed Verification** | `psql -c "SELECT id, name, domain FROM websites WHERE id = 'site-popwave';"` | Returns `site-popwave` | `PopWave News` | `popwave.in`. |
| **Public API Articles Feed** | `curl -H "x-api-key: pw_live_sec_78d91f42a0b1c2e3" https://blogary.jupsoft.com/v1/blogs` | Returns HTTP 200 with published PopWave articles. |
| **Public API Category Feed** | `curl -H "x-api-key: pw_live_sec_78d91f42a0b1c2e3" https://blogary.jupsoft.com/v1/blogs?category=tech` | Returns HTTP 200 with tech articles. |
| **Breaking News Feed** | `curl -H "x-api-key: pw_live_sec_78d91f42a0b1c2e3" https://blogary.jupsoft.com/v1/blogs?tag=breaking` | Returns HTTP 200 with breaking news stories. |
| **Live PopWave UI** | Open `https://popwave.in` in browser | Pre-rendered static pages render with 0 errors. |

---

*This guide serves as the permanent engineering specification for the native PopWave ⟷ Blogary CMS integration.*
