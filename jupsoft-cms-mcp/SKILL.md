---
name: jupsoft-cms-admin
description: >-
  Enterprise Jupsoft Centralized Multi-Site Blog CMS & MCP Super Admin Suite.
  Controls all tenant websites (Jupsoft Cloud, DigifyNext, etc.) via 52 FastMCP tools.
  Provides complete database field schemas, REST API routes, environment variables,
  content workflow lifecycles, and mandatory pre-flight connection health verification.
---

# 🏢 Jupsoft CMS & MCP Super Admin Playbook

> **Operational Directive for AI Agents:**  
> You are operating as a Super Admin of the **Jupsoft Centralized Multi-Site Blog CMS (Blogary)**.  
> You manage multiple tenant websites through a single centralized headless backend.  
> Whenever this MCP server is connected, invoked, or installed, you **MUST** first execute the **Mandatory Pre-Flight Connection Audit** before taking any mutating actions.

---

## 📑 Table of Contents
1. [Mandatory Pre-Flight Connection Audit (Run on Connect)](#1-mandatory-pre-flight-connection-audit)
2. [Environment Variables Matrix](#2-environment-variables-matrix)
3. [Complete Database & Field Schemas](#3-complete-database--field-schemas)
4. [Complete REST API Endpoints Reference](#4-complete-rest-api-endpoints-reference)
5. [Content Lifecycle & Workflow Stages](#5-content-lifecycle--workflow-stages)
6. [Complete 52-Tool FastMCP Reference Catalog](#6-complete-52-tool-fastmcp-reference-catalog)
7. [Standard Operational Procedures (SOPs)](#7-standard-operational-procedures-sops)

---

## 1. Mandatory Pre-Flight Connection Audit

Whenever you start an operation with the Jupsoft CMS MCP tool or when the MCP server is initialized, **always run this 4-step verification sequence**:

```
[1. Health Check] ➔ [2. Profile & JWT] ➔ [3. List Websites] ➔ [4. Connection Scorecard]
```

### Step-by-Step Audit Protocol:

1. **Step 1: Check Backend Health**  
   Call tool: `cms_health_check()`  
   * Expected: `status: 200`, `data.status: "ok"`, `data.service: "Jupsoft Centralized CMS Backend"`.  
   * If failed: Backend is unreachable. Verify `CMS_API_BASE` (default: `https://blogary.jupsoft.com`).

2. **Step 2: Check Super Admin Authentication**  
   Call tool: `cms_get_profile()`  
   * Expected: `data.email: "admin@jupsoft.com"`, `data.isSuperAdmin: true`.  
   * If 401 Unauthorized: Call `cms_login(email, password)` using `CMS_ADMIN_EMAIL` and `CMS_ADMIN_PASSWORD`.

3. **Step 3: Dynamically Audit All Tenant Websites in Database**  
   Call tool: `cms_list_websites()`  
   * **Do NOT assume or limit to any hardcoded website IDs.** The database stores all tenants dynamically.
   * Iterate through all tenants returned in the array (e.g. `site-cloud`, `site-growth`, `site-hey`, or any newly added client site).
   * Verify each tenant has:
     - Dynamic non-empty `id` (e.g. `site-<slug>`)
     - Clean `domain` (hostname only, NO `http://`, NO trailing slashes, NO `/blog`)
     - Valid `apiKey` (`jup_live_sec_...` or `jup_sec_...`)
     - Valid `revalidateWebhookUrl` (must be `https://<domain>/api/revalidate`)
     - Status: `active`

4. **Step 4: Output the Connection Scorecard**  
   Present a clear status summary to the user:
   ```
   ============================================================
   🔍 Jupsoft CMS Connection Scorecard:
   • Backend API: 🟢 HEALTHY (https://blogary.jupsoft.com - Uptime: Xs)
   • Super Admin: 🟢 AUTHENTICATED (admin@jupsoft.com - Token Valid)
   • Tenants Online: 🟢 2/2 Active
     - [site-cloud] Jupsoft Cloud & ERP (cloud.jupsoft.com)
     - [site-growth] DigifyNext Marketing (digifynext.com)
   ============================================================
   ```

---

## 2. Dynamic Database-Driven Multi-Tenancy (Zero Hardcoded IDs)

> **Architectural Law:**  
> Blogary CMS is an **infinite multi-tenant engine**.  
> Website tenants are **NEVER hardcoded or restricted to fixed IDs**.  
> All website IDs are stored dynamically in the PostgreSQL database (`Website` table).  
> Whenever an AI Agent or developer connects, they MUST dynamically fetch all active website IDs using `cms_list_websites()`.  
> Any website created via the UI or `cms_create_website` (e.g. `site-hey`, `site-school`, `site-finance`, `site-company`) is immediately controllable with full CRUD, blog publishing, taxonomy, media, and webhook revalidation.

---

## 3. Environment Variables Matrix

### A. MCP Server & Backend Environment
| Variable | Default Value / Production | Description |
|---|---|---|
| `CMS_API_BASE` | `https://blogary.jupsoft.com` | Base URL of CMS REST backend. Local dev is `http://localhost:4010`. |
| `CMS_ADMIN_EMAIL` | `admin@jupsoft.com` | Super Admin email for auto-authentication. |
| `CMS_ADMIN_PASSWORD` | *(Required secret — never stored in code)* | Super Admin master password. |
| `CMS_WEBHOOK_SECRET` | *(Required secret — same value as backend `WEBHOOK_DEFAULT_SECRET`)* | Shared secret for HMAC SHA-256 webhook signing. No hardcoded fallback exists. |
| `JWT_SECRET` | *(Production Secret)* | Used by NestJS backend to sign bearer access tokens (7d). |
| `JWT_REFRESH_SECRET` | *(Production Secret)* | Used to sign long-lived refresh tokens (30d). |
| `DATABASE_URL` | *(Supabase PostgreSQL Pooler)* | `postgresql://postgres:...@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres` |

### B. Client Website Environment (`.env.local`)
When client websites connect to Blogary CMS, they configure:
```env
NEXT_PUBLIC_CMS_API_URL=https://blogary.jupsoft.com
CMS_API_URL=https://blogary.jupsoft.com
CMS_TENANT_API_KEY=<your-tenant-api-key>
CMS_WEBSITE_ID=site-cloud
CMS_WEBHOOK_SECRET=<same-value-as-backend-WEBHOOK_DEFAULT_SECRET>
```

---

## 3. Complete Database & Field Schemas

### 🏢 1. Website Tenant (`Website`)
Every blog belongs to an isolated website tenant:
```typescript
interface Website {
  id: string;                  // e.g. "site-cloud", "site-growth" (slugified)
  name: string;                // Display name: "Jupsoft Cloud & ERP"
  domain: string;              // Hostname only: "cloud.jupsoft.com" (NEVER includes /path)
  logoUrl?: string;            // Brand logo WebP/SVG URL
  description?: string;        // Brief tenant description
  apiKey: string;              // Secret API key: "jup_live_sec_..." (used by client SDK)
  s3Prefix: string;            // S3 storage partition: "blogs/cloud/"
  status: 'active' | 'inactive'; // Active tenants serve traffic
  defaultLanguage: 'en' | 'hi' | 'fr' | 'ar'; // Default language code
  supportedLanguages: string[]; // Enabled languages: ["en", "hi", "fr", "ar"]
  revalidateWebhookUrl?: string;// "https://cloud.jupsoft.com/api/revalidate"
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
}
```

### ✍️ 2. Blog Post (`Blog`)
The core article entity holding cross-language metadata:
```typescript
interface Blog {
  id: string;                  // UUID: "0fddc517-21b3-405b-8752-1507a502cb14"
  websiteId: string;           // Tenant foreign key: "site-cloud"
  authorId: string;            // Author user UUID
  status: 'Draft' | 'Under Review' | 'Approved' | 'Scheduled' | 'Published' | 'Archived';
  featuredImage?: string;      // CDN URL: "/uploads/blogs/image.webp"
  featuredImageAlt?: string;   // Image accessibility & SEO text
  scheduledAt?: string;        // Required if status is "Scheduled"
  publishedAt?: string;        // Auto-set when moving to "Published"
  categories: Category[];      // Many-to-many taxonomy
  tags: Tag[];                 // Many-to-many tags
  translations: BlogTranslation[]; // Per-language localized content
  seoScore?: number;           // Automated SEO audit score (0 - 100)
  viewCount: number;           // Total views recorded
}
```

### 🌐 3. Blog Translation (`BlogTranslation`)
Per-language localized content, URLs, and SEO meta:
```typescript
interface BlogTranslation {
  id: string;                  // UUID
  blogId: string;              // Parent blog UUID
  language: 'en' | 'hi' | 'fr' | 'ar'; // Language code
  title: string;               // Post headline (50-70 characters)
  slug: string;                // URL slug: "future-of-cloud-erp-2026" (unique per site+lang)
  content: string;             // Rich HTML body content
  excerpt?: string;            // Short 1-2 sentence preview (120-160 chars)
  
  // SEO Fields (Automated Audit standard)
  metaTitle?: string;          // Target: 50-60 characters
  metaDescription?: string;    // Target: 150-160 characters
  focusKeyword?: string;       // Primary keyword to optimize density & headings for
  canonicalUrl?: string;       // Canonical source link
  ogTitle?: string;            // OpenGraph Facebook/LinkedIn card title
  ogDescription?: string;      // OpenGraph summary
  ogImage?: string;            // 1200x630 social share card URL
}
```

### 🏷️ 4. Taxonomy (`Category` & `Tag`)
```typescript
interface Category {
  id: string;                  // UUID
  websiteId: string;           // Tenant ID
  name: string;                // e.g. "Cloud Architecture"
  slug: string;                // e.g. "cloud-architecture"
  description?: string;        // SEO description
  parentId?: string;           // Supports hierarchical sub-categories
}

interface Tag {
  id: string;                  // UUID
  websiteId: string;           // Tenant ID
  name: string;                // e.g. "Kubernetes"
  slug: string;                // e.g. "kubernetes"
}
```

### 🔀 5. 301/302 Redirects (`Redirect`)
```typescript
interface Redirect {
  id: string;                  // UUID
  websiteId: string;           // Tenant ID
  fromSlug: string;            // Old path e.g. "/old-erp-article"
  toSlug: string;              // Destination e.g. "/blog/future-of-erp"
  statusCode: 301 | 302;       // 301 Permanent | 302 Temporary
}
```

---

## 4. Complete REST API Endpoints Reference

All API routes run on `https://blogary.jupsoft.com` (or local `http://localhost:4010`):

### Admin Management Routes (`/admin/...` - Requires Bearer JWT)
* **Auth**:
  - `POST /admin/auth/login` ➔ `{ email, password }` ➔ Returns `{ accessToken, refreshToken, user }`
  - `POST /admin/auth/refresh` ➔ `{ refreshToken }` ➔ Returns `{ accessToken, refreshToken }`
  - `GET /admin/auth/me` ➔ Current admin user profile
* **Websites / Multi-Tenant**:
  - `GET /admin/websites` ➔ List all tenants
  - `POST /admin/websites` ➔ `{ name, domain, defaultLanguage, supportedLanguages }`
  - `PUT /admin/websites/:id` ➔ Update domain, branding, webhook URL
  - `DELETE /admin/websites/:id` ➔ Cascade delete tenant
* **Blogs & Content Workflow**:
  - `GET /admin/blogs` ➔ Query parameters: `?websiteId=&status=&search=&page=&limit=`
  - `POST /admin/blogs` ➔ Create blog draft
  - `GET /admin/blogs/:id` ➔ Full blog details with translations & logs
  - `PUT /admin/blogs/:id` ➔ Update metadata, category IDs, tag IDs
  - `DELETE /admin/blogs/:id` ➔ Delete post
  - `POST /admin/blogs/:id/translations` ➔ Add/update translation for a language
  - `POST /admin/blogs/:id/submit` ➔ Move: Draft ➔ Under Review
  - `POST /admin/blogs/:id/approve` ➔ Move: Under Review ➔ Approved
  - `POST /admin/blogs/:id/publish` ➔ Move: Approved ➔ Published (triggers HMAC webhooks)
  - `POST /admin/blogs/:id/schedule` ➔ Schedule publishing at ISO date
  - `POST /admin/blogs/:id/archive` ➔ Move to Archived (triggers cache purge)
  - `GET /admin/blogs/:id/seo-audit` ➔ Run 8-factor automated SEO audit
* **Taxonomy**:
  - `GET/POST /admin/categories`, `DELETE /admin/categories/:id`
  - `GET/POST /admin/tags`, `DELETE /admin/tags/:id`
* **Webhooks & Invalidation**:
  - `POST /admin/webhooks/test-ping` ➔ `{ websiteId, url }` ➔ Executes live ping with latency test
  - `GET /admin/webhooks/logs` ➔ Inspect webhook delivery logs

### Public SDK Consumer Routes (`/v1/public/...`)
Client frontends query these using `apiKey` or `websiteId`:
* `GET /v1/public/blogs?websiteId=site-cloud&lang=en&page=1&limit=10`
* `GET /v1/public/blogs/:slug?websiteId=site-cloud&lang=en`
* `GET /v1/public/blogs/popular?websiteId=site-cloud`
* `GET /v1/public/blogs/latest?websiteId=site-cloud`
* `GET /v1/public/categories?websiteId=site-cloud`
* `GET /v1/public/tags?websiteId=site-cloud`

---

## 5. Content Lifecycle & Workflow Stages

Content follows strict editorial security governance:

```
[Draft]
   │  (Writer drafts article & translations)
   ▼
[Under Review]
   │  (Senior Editor reviews formatting, grammar, SEO)
   ▼
[Approved]
   │  (Authorized by Publisher or Super Admin)
   ├───► [Scheduled]  (Optional: Waits for scheduledAt timestamp)
   │        │
   ▼        ▼
[Published] ──► (Dispatches HMAC SHA-256 Webhook to revalidate remote caches)
   │
   ▼
[Archived]  ──► (Retires article, dispatches webhook to purge slug)
```

---

## 6. Complete 52-Tool FastMCP Reference Catalog

The MCP server exposes 52 specialized tools for autonomous operation:

### 🏥 System & Diagnostics (3 Tools)
1. `cms_health_check()` — Backend connectivity & uptime test
2. `cms_get_audit_logs(website_id, event, limit)` — Security & user audit trails
3. `cms_change_password(old_password, new_password)` — Rotate admin password

### 🔐 Authentication & Profile (3 Tools)
4. `cms_login(email, password)` — Acquire JWT token
5. `cms_get_profile()` — Inspect permissions & roles
6. `cms_logout()` — Invalidate refresh token in Redis

### 🏢 Tenant Websites (5 Tools)
7. `cms_list_websites()` — List all managed tenants (`site-cloud`, `site-growth`, etc.)
8. `cms_get_website(website_id)` — Tenant details, API key, webhook URL
9. `cms_create_website(name, domain, description, ...)` — Provision new tenant
10. `cms_update_website(website_id, name, domain, ...)` — Update tenant config
11. `cms_delete_website(website_id)` — Permanently remove tenant

### ✍️ Blog Management & Workflow (12 Tools)
12. `cms_list_blogs(website_id, status, search, author_id, page, limit)` — Filter articles
13. `cms_get_blog(blog_id)` — Retrieve post with all localized translations
14. `cms_create_blog(website_id, title, content, excerpt, meta_title, ...)` — Create draft
15. `cms_update_blog(blog_id, title, content, meta_title, ...)` — Edit post
16. `cms_upsert_translation(blog_id, language, title, content, slug, ...)` — Add language (hi/fr/ar)
17. `cms_delete_blog(blog_id)` — Remove blog
18. `cms_submit_blog_for_review(blog_id, notes)` — Draft ➔ Under Review
19. `cms_approve_blog(blog_id, notes)` — Under Review ➔ Approved
20. `cms_publish_blog(blog_id, notes)` — Approved ➔ Published (dispatches webhooks)
21. `cms_schedule_blog(blog_id, scheduled_at, notes)` — Schedule for future release
22. `cms_archive_blog(blog_id)` — Unpublish / Archive
23. `cms_run_seo_audit(blog_id, lang)` — Run automated 8-standard SEO score check

### 🏷️ Taxonomy & Tagging (6 Tools)
24. `cms_list_categories(website_id)` — View categories
25. `cms_create_category(website_id, name, slug, description, parent_id)` — Add category
26. `cms_delete_category(category_id)` — Remove category
27. `cms_list_tags(website_id)` — View tags
28. `cms_create_tag(website_id, name, slug)` — Add tag
29. `cms_delete_tag(tag_id)` — Remove tag

### 👥 Users & Roles (5 Tools)
30. `cms_list_users()` — Roster of writers, editors, SEO managers, superadmins
31. `cms_invite_user(name, email, role, website_id)` — Provision team member
32. `cms_update_user_role(user_id, role, website_id)` — Change permissions
33. `cms_update_user_status(user_id, status)` — Active / Suspended
34. `cms_delete_user(user_id)` — Remove user

### 🖼️ Media & S3 Assets (5 Tools)
35. `cms_list_media(website_id)` — View uploaded WebP/images
36. `cms_upload_media_file(file_path, website_id, alt_text)` — Upload local image to S3
37. `cms_get_presigned_upload_url(...)` — Direct client-to-S3 upload signature
38. `cms_confirm_media_upload(...)` — Finalize S3 asset registration
39. `cms_delete_media(media_id)` — Delete media asset

### 🔀 301 Redirects (3 Tools)
40. `cms_list_redirects(website_id)` — View 301 rules
41. `cms_create_redirect(website_id, from_slug, to_slug)` — Create 301 SEO redirect
42. `cms_delete_redirect(redirect_id)` — Remove redirect

### 📊 Analytics & Performance (3 Tools)
43. `cms_get_analytics_dashboard(website_id, days)` — Aggregate views, top referrers
44. `cms_get_blog_analytics(blog_id, days)` — Per-article daily telemetry
45. `cms_track_view(blog_id, website_id, ...)` — Record synthetic/real traffic view

### ⚡ Webhooks & Invalidation (3 Tools)
46. `cms_get_webhook_logs(website_id, limit)` — Delivery history & HTTP response bodies
47. `cms_trigger_cache_revalidate(website_id, slug, event)` — Dispatch manual HMAC webhook
48. `cms_retry_failed_webhooks()` — Retry exponential backoff queue

### 🌐 Public Content Retrieval (4 Tools)
49. `cms_get_blog_by_slug(slug, website_id, language)` — Public article reader
50. `cms_get_latest_blogs(website_id, language, limit)` — Recent posts feed
51. `cms_get_popular_blogs(website_id, language, limit)` — Trending posts feed
52. `cms_search_blogs(query, website_id, language, limit)` — Full-text article search

---

## 7. Standard Operational Procedures (SOPs)

### SOP 01: Creating and Publishing a High-SEO Blog Post
1. Run pre-flight check (`cms_health_check` + `cms_list_websites`).
2. Identify target tenant `website_id` (e.g. `site-cloud`).
3. Call `cms_create_blog` with:
   - Compelling `title` (50-60 chars)
   - Rich semantic HTML `content` with `<h2>`, `<h3>`, bullet lists, and code blocks
   - Concise `excerpt` (140 chars)
   - Precise `meta_title`, `meta_description`, and `focus_keyword`
4. Call `cms_run_seo_audit(blog_id)` to verify score is above 80.
5. Call `cms_submit_blog_for_review(blog_id)`.
6. Call `cms_approve_blog(blog_id)`.
7. Call `cms_publish_blog(blog_id)` ➔ Remote Next.js cache revalidates in real time!

### SOP 02: Onboarding a New Website Tenant
1. Call `cms_create_website(name, domain)` where `domain` is clean (e.g. `mybrand.com`).
2. Verify created site has auto-generated `apiKey` (`jup_sec_...`) and `revalidateWebhookUrl`.
3. Provide the client with the 1-command installer:
   ```bash
   npx @jupsoft/next-blog --site=<siteId> --key=<apiKey> --url=https://blogary.jupsoft.com
   ```
4. Test webhook connection using `cms_trigger_cache_revalidate(siteId, "test-ping")` and check `cms_get_webhook_logs(siteId)`.
