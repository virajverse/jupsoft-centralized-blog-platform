---
name: jupsoft-cms-admin
description: >-
  Master AI Agent Playbook for the Jupsoft CMS Admin Panel MCP Server.
  Enables any AI agent to act as Super Admin of the Jupsoft Centralized Multi-Site Blog Platform.
  52 tools: Create, edit, approve, schedule & publish blogs across 3 tenant websites (Jupsoft Cloud,
  DigifyNext Marketing, School ERP Platform); manage taxonomy (categories, tags), users, media, 301 redirects,
  analytics, webhooks, cache revalidation, audit logs, and SEO audits. Auto-authenticated — no manual login required.
---

# 🎯 Jupsoft CMS Admin — Super Agent Playbook (52 Tools)

This skill empowers any AI agent (**Antigravity IDE, Claude, GPT-4o, Gemini**) with **complete Super Admin control** over the Jupsoft Centralized Multi-Site Blog CMS running at `http://localhost:4000`.

---

## 🏢 Known Tenant Websites

| Website ID    | Name                        | Production / Local Domain | For                      |
|---------------|-----------------------------|---------------------------|--------------------------|
| `site-cloud`  | Jupsoft Cloud & ERP         | `localhost:5001`          | Cloud/ERP product blogs  |
| `site-growth` | DigifyNext Marketing        | `localhost:5002`          | Digital marketing blogs  |
| `site-edtech` | School ERP Platform         | `localhost:5003`          | EdTech / education blogs |

---

## 🧠 Quick-Start Decision Flow

```
                 ┌─────────────────────────────────────────────────────┐
                 │                Admin Task Requested                 │
                 └──────────────────────────┬──────────────────────────┘
                                            │
         ┌──────────────────┬───────────────┴──────────────┬──────────────────┐
         ▼                  ▼                              ▼                  ▼
  [Blog Operation]   [User / Access]               [Media & Webhooks]  [Analytics & SEO]
         │                  │                              │                  │
  1. cms_list_blogs  1. cms_list_users             1. cms_upload_media 1. cms_run_seo_audit
  2. cms_create_blog 2. cms_invite_user            2. cms_get_webhook  2. cms_get_analytics
  3. Workflow:       3. cms_update_user_role          logs             3. cms_get_audit_logs
     submit ->       4. cms_update_user_status     3. cms_trigger_
     approve ->                                       cache_revalidate
     publish/schedule
```

---

## 🔄 Blog Workflow — 6 Stages

```
Draft ──> Under Review ──> Approved ──> Published
                             │             │
                             ▼             ▼
                         Scheduled      Archived
                             │
                             └──> Published (auto at scheduled_at)
```

| From State     | Action Tool                           | To State       | Notes |
|----------------|---------------------------------------|----------------|-------|
| Draft          | `cms_submit_blog_for_review(blog_id)` | Under Review   | Editor review required |
| Under Review   | `cms_approve_blog(blog_id)`           | Approved       | Super Admin can approve |
| Approved       | `cms_publish_blog(blog_id)`           | Published      | Live on website immediately + fires webhook |
| Approved       | `cms_schedule_blog(blog_id, time)`    | Scheduled      | Auto-releases at timestamp |
| Published      | `cms_archive_blog(blog_id)`           | Archived       | De-listed from consumer API & search |
| Any            | `cms_update_blog(...)`                | (unchanged)    | Updates content, SEO, or images |
| Any            | `cms_upsert_translation(...)`         | (unchanged)    | Adds or updates multi-language translation (HI, AR, FR) |

---

## 🧭 Intent-to-Tool Matrix

| User Request                                | Primary Tool                      | Key Parameters                                   |
|---------------------------------------------|-----------------------------------|--------------------------------------------------|
| "Write a blog about X"                      | `cms_create_blog`                 | website_id, title, content, excerpt              |
| "Add Hindi translation to blog"             | `cms_upsert_translation`          | blog_id, language="hi", title, content           |
| "Upload an image from my drive"             | `cms_upload_media_file`           | file_path, website_id, alt_text                  |
| "Publish the blog I just created"           | `cms_submit` -> `cms_approve` -> `cms_publish` | blog_id (workflow chain)       |
| "Schedule blog for next Monday"             | `cms_schedule_blog`               | blog_id, scheduled_at="2026-09-28T10:00:00Z"    |
| "Update website domain to production"       | `cms_update_website`              | website_id, domain="cloud.jupsoft.com"           |
| "Did the webhook deliver to the test site?" | `cms_get_webhook_logs`            | website_id, limit=10                             |
| "Purge/revalidate consumer site cache"      | `cms_trigger_cache_revalidate`    | website_id, slug, event="blog.published"         |
| "List all published blogs"                  | `cms_list_blogs`                  | status="Published"                               |
| "Check SEO score of blog X"                 | `cms_run_seo_audit`               | blog_id                                          |
| "Search articles by keyword"                | `cms_search_blogs`                | query, website_id="site-cloud", language="en"    |
| "Invite a new Content Writer"               | `cms_invite_user`                 | name, email, role="Content Writer", website_id   |
| "Show analytics for site-cloud"             | `cms_get_analytics_dashboard`     | website_id="site-cloud", days=30                 |
| "Create category 'AI Tools'"                | `cms_create_category`             | website_id, name="AI Tools"                      |
| "Delete tag 'legacy'"                       | `cms_delete_tag`                  | tag_id                                           |
| "Add 301 redirect for old URL"              | `cms_create_redirect`             | website_id, from_slug, to_slug                   |
| "Check how article renders publicly"        | `cms_get_blog_by_slug`            | slug, website_id, language="en"                  |
| "View system activity audit trail"          | `cms_get_audit_logs`              | website_id, event="blog.published", limit=20     |
| "Retry failed webhook deliveries"           | `cms_retry_failed_webhooks`        | (none)                                           |
| "Change admin account password"             | `cms_change_password`             | old_password, new_password                       |

---

## ⚡ Complete Blog Creation & Translation Pipeline

```python
# 1. Create English Draft
draft = cms_create_blog(
    website_id="site-cloud",
    title="Top 5 Cloud ERP Benefits for SMEs",
    content="<h2>Introduction</h2><p>Cloud ERP transforms enterprise operations...</p>",
    excerpt="Discover how Cloud ERP can streamline your business operations.",
    focus_keyword="Cloud ERP",
)
blog_id = draft["data"]["id"]

# 2. Add Hindi Translation
cms_upsert_translation(
    blog_id=blog_id,
    language="hi",
    title="छोटे और मध्यम उद्योगों के लिए क्लाउड ईआरपी के शीर्ष 5 लाभ",
    content="<h2>परिचय</h2><p>क्लाउड ईआरपी संचालन को सुव्यवस्थित करता है...</p>",
    focus_keyword="क्लाउड ईआरपी",
)

# 3. SEO Audit
audit = cms_run_seo_audit(blog_id=blog_id)

# 4. Editorial Workflow
cms_submit_blog_for_review(blog_id=blog_id, notes="Ready for review")
cms_approve_blog(blog_id=blog_id, notes="Approved by Super Admin")
cms_publish_blog(blog_id=blog_id, notes="Published live")

# 5. Verify Webhook Delivery
wh_logs = cms_get_webhook_logs(website_id="site-cloud", limit=5)
```

---

## 🔧 Complete Tool Reference — All 51 Tools

### 1. System (1 Tool)
- `cms_health_check()` — Check backend health & uptime status (`/v1/health`)

### 2. Auth & Account Security (3 Tools)
- `cms_login(email, password)` — Login as Super Admin (auto-done on startup, acquires JWT)
- `cms_get_profile()` — Get current admin profile, permissions, and tenant roles
- `cms_change_password(old_password, new_password)` — Change the authenticated admin's password

### 3. Tenant Websites (5 Tools)
- `cms_list_websites()` — List all tenant websites (`site-cloud`, `site-growth`, `site-edtech`)
- `cms_get_website(website_id)` — Get single website tenant details & webhook secret
- `cms_create_website(website_id, name, domain, description?, logo_url?)` — Onboard a new tenant website (explicit `website_id` required)
- `cms_update_website(website_id, domain?, name?, logo_url?, ...)` — Update website domain or branding config
- `cms_delete_website(website_id)` — Permanently remove a tenant website

### 4. Blogs & Editorial Workflow (12 Tools)
- `cms_list_blogs(website_id?, status?, search?, author_id?, page?, limit?)` — Filter and paginate blogs
- `cms_get_blog(blog_id)` — Get single blog with all translations, categories, tags, and audit logs
- `cms_create_blog(website_id, title, content, excerpt?, focus_keyword?, ...)` — Create draft article with primary translation
- `cms_update_blog(blog_id, ...)` — Update article metadata, SEO, or primary translation
- `cms_upsert_translation(blog_id, language, title, content, ...)` — Add/edit multi-language translation (`en`, `hi`, `ar`, `fr`)
- `cms_delete_blog(blog_id)` — Permanently delete blog article
- `cms_submit_blog_for_review(blog_id, notes?)` — Move Draft -> Under Review
- `cms_approve_blog(blog_id, notes?)` — Move Under Review -> Approved
- `cms_publish_blog(blog_id, notes?)` — Publish article immediately (triggers webhook & cache invalidation)
- `cms_schedule_blog(blog_id, scheduled_at, notes?)` — Schedule article for future date/time
- `cms_archive_blog(blog_id)` — Unpublish article (Published -> Archived, removed from consumer APIs)
- `cms_run_seo_audit(blog_id, lang?)` — 8-check automated SEO audit (0-100 score + improvement feedback)

### 5. Taxonomy Management (6 Tools)
- `cms_list_categories(website_id?)` — List categories for a website
- `cms_create_category(website_id, name, slug?, description?, parent_id?)` — Create a new category
- `cms_delete_category(category_id)` — Permanently delete a category
- `cms_list_tags(website_id?)` — List tags for a website
- `cms_create_tag(website_id, name, slug?)` — Create a new tag
- `cms_delete_tag(tag_id)` — Permanently delete a tag

### 6. Users & Team RBAC (5 Tools)
- `cms_list_users()` — List all users and their tenant role assignments
- `cms_invite_user(name, email, role, website_id)` — Invite team member (`Super Admin`, `Editor`, `Content Writer`)
- `cms_update_user_role(user_id, role, website_id)` — Modify user's role on a tenant
- `cms_update_user_status(user_id, status)` — Toggle active / suspended user status
- `cms_delete_user(user_id)` — Permanently delete user account

### 7. Media Asset Library (5 Tools)
- `cms_list_media(website_id?)` — List media assets for a tenant
- `cms_upload_media_file(file_path, website_id, alt_text?)` — Direct upload from disk (auto WebP conversion & thumbnails)
- `cms_get_presigned_upload_url(file_name, file_type, file_size_bytes, website_id, ...)` — Generate AWS S3 PUT presigned URL
- `cms_confirm_media_upload(...)` — Register client-uploaded S3 asset into DB
- `cms_delete_media(media_id)` — Soft-delete media asset

### 8. 301 SEO Redirects (3 Tools)
- `cms_list_redirects(website_id?)` — List all active 301 permanent redirects
- `cms_create_redirect(website_id, from_slug, to_slug)` — Create a 301 redirect rule
- `cms_delete_redirect(redirect_id)` — Remove a redirect rule

### 9. Analytics & Telemetry (3 Tools)
- `cms_get_analytics_dashboard(website_id, days?)` — Site traffic, unique visitors & top referrers
- `cms_get_blog_analytics(blog_id, days?)` — Per-blog views, read completion % & referral traffic
- `cms_track_view(blog_id, website_id, ...)` — Record read/view analytics event (fire-and-forget HTTP 204)

### 10. Webhooks & Cache Revalidation (3 Tools)
- `cms_get_webhook_logs(website_id?, limit?)` — Inspect HMAC SHA-256 webhook delivery attempts & response codes
- `cms_trigger_cache_revalidate(website_id, slug, event?)` — Dispatch manual revalidation ping to consumer sites
- `cms_retry_failed_webhooks()` — Trigger worker to retry all failed webhook deliveries

### 11. Audit Logs & Public Consumer APIs (5 Tools)
- `cms_get_audit_logs(website_id?, event?, limit?)` — System activity audit trail (TRD §13)
- `cms_get_blog_by_slug(slug, website_id?, language?)` — Public consumer view with rich text, author & JSON-LD (TRD §12)
- `cms_get_latest_blogs(website_id?, language?, limit?)` — Latest published blogs for consumer homepage (TRD §12)
- `cms_get_popular_blogs(website_id?, language?, limit?)` — Top popular blogs sorted by total view count (TRD §12)
- `cms_search_blogs(query, website_id?, language?, limit?)` — Full-text keyword search across published blogs (TRD §12)

---

## 📦 Setup & Installation

```bat
REM Run once to install dependencies
jupsoft-cms-mcp\install.bat

REM Run regression test suite (50 automated tests / 51 tools)
d:\Company work\.venv\Scripts\python.exe test_all_tools.py
```

