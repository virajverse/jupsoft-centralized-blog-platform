# 📘 Jupsoft Centralized Multi-Site Blog Management Platform — System Context & Operating Blueprint

[![Platform](https://img.shields.io/badge/Platform-Jupsoft%20CMS-blue.svg)](#)
[![Stack](https://img.shields.io/badge/Stack-Next.js%2016%20%7C%20NestJS%20%7C%20Prisma%20%7C%20Redis-emerald.svg)](#)
[![TRD](https://img.shields.io/badge/TRD-Version%201.0%20Compliant-purple.svg)](#)
[![Architecture](https://img.shields.io/badge/Architecture-Decoupled%20Multi--Tenant%20SaaS-orange.svg)](#)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success.svg)](#)

> **Official Technical Documentation & Onboarding Blueprint for Jupsoft Systems Pvt. Ltd.**  
> Centralized content hub serving multiple external tenant domains from a single unified administrative console.  
> Based on **Technical Requirement Document (TRD) Version 1.0**.

---

## 💻 Fresh Machine Setup Guide (New Laptop Onboarding)

When cloning this repository on a fresh company laptop or development workstation, follow this checklist before starting:

### 1. Required Software Prerequisites
Install the following core tools on the host operating system:

| Software | Minimum Version | Purpose | Installation Link / Command |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v20.x LTS` (or `v22.x`) | JavaScript runtime | [nodejs.org](https://nodejs.org/) |
| **pnpm** | `v9.x` or `v10.x` | Monorepo package manager | `npm install -g pnpm` |
| **Docker Desktop** | `v25.x+` (Docker Compose v2) | Local PostgreSQL 16 & Redis 7 containers | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **Git** | `v2.40+` | Version control | [git-scm.com](https://git-scm.com/) |
| **VS Code / Antigravity**| Latest | Code editor & AI agent environment | [code.visualstudio.com](https://code.visualstudio.com/) |

---

### 2. Fast 3-Step Startup (From Zero to Running)

#### Step A: Clone & Install Dependencies
Open terminal inside your projects directory:
```bash
git clone https://github.com/virajverse/jupsoft-centralized-blog-platform.git
cd jupsoft-centralized-blog-platform
pnpm install
```

#### Step B: Start Database & Cache Containers
Ensure Docker Desktop is running, then launch the background infrastructure:
```bash
cd backend
docker compose up -d
```
*Containers launched:*
- `jupsoft_postgres` ➔ PostgreSQL 16 Alpine on `localhost:5432`
- `jupsoft_redis` ➔ Redis 7 Alpine on `localhost:6379`

#### Step C: Sync Database Schema & Seed Initial Tenant Data
```bash
# Push Prisma schema to PostgreSQL
pnpm exec prisma db push

# Seed 3 tenant websites, admin user, categories, tags, and sample articles
pnpm run prisma:seed
```

#### Step D: Launch Both Development Servers
From the repository root:
```bash
# Start backend API (Port 4000) and Next.js Admin Portal (Port 3000) concurrently
pnpm run dev
```

- **Next.js Admin Portal:** [http://localhost:3000](http://localhost:3000)
- **NestJS API & Swagger Docs:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **Database Studio (Visual UI):** `cd backend && pnpm exec prisma studio` (Opens [http://localhost:5555](http://localhost:5555))

---

## 🏛️ System Architecture & Decoupled Model

The platform is designed around a **Decoupled Headless Content Hub** architecture:

```
+-------------------------------------------------------------+
|                  Next.js Admin CMS (Port 3000)              |
|        Authoring Studio, Kanban Workflow, SEO Gauge         |
+-------------------------------------------------------------+
                              |
                              | Internal REST + JWT RBAC
                              v
+-------------------------------------------------------------+
|                     NestJS Backend (Port 4000)              |
|    Auth | Blogs | Media | Workflow | SEO | Analytics | V1   |
+-------------------------------------------------------------+
         |                        |                    |
         v                        v                    v
+------------------+    +------------------+   +-------------------+
|  PostgreSQL 16   |    |     Redis 7      |   |   AWS S3 + CDN    |
| (Source of Truth)|    | (Public Read TTL)|   | (Media & WebP)    |
+------------------+    +------------------+   +-------------------+
                                  |
                                  | Public REST API + Webhooks
                                  v
+-------------------------------------------------------------+
|          External Consumer Websites (Next.js SSR/ISR)       |
|             jupsoft.com | client-schools.com                |
+-------------------------------------------------------------+
```

---

## 🔑 Core Architecture Pillars (TRD Reference)

### 1. Multi-Tenant Website Scoping (TRD §6)
- Websites are first-class tenants (`websites` table) with dedicated API keys (`apiKey`), custom S3 prefixes (`s3Prefix`), and unique domains.
- Every blog, category, tag, and media asset carries a foreign key `websiteId`. Data never leaks across tenant boundaries.

### 2. Role-Based Access Control / RBAC (TRD §5)
- **Super Admin:** Full platform ownership, manage websites, assign roles.
- **Content Writer:** Draft and edit own articles, submit for review.
- **Editor:** Review submitted drafts, approve, request edits.
- **Publisher:** Publish approved drafts, schedule future releases, trigger webhooks.
- **SEO Manager:** Inspect and tune SEO parameters, review SEO audit logs.
- Roles are scoped per website via the `user_role_assignments` table.

### 3. Editorial Lifecycle & Workflow Kanban (TRD §7)
- **Statuses:** `Draft` ➔ `Under Review` ➔ `Approved` ➔ `Scheduled` ➔ `Published` ➔ `Archived`.
- All transitions are guarded by role and recorded in `workflow_logs` with timestamp, user, role, and editorial notes.

### 4. Automatic 301 Permanent Redirect Engine (TRD §7)
- Modifying the slug of any already-published article automatically writes a permanent 301 redirect entry into the `redirects` table (`fromSlug` ➔ `toSlug`), preserving search engine equity and preventing dead links.

### 5. Multi-Language Content Engine (TRD §8)
- Content is strictly separated from translations. The `blogs` table stores language-agnostic metadata, while `blog_translations` holds language-specific fields (`title`, `slug`, `content`, `excerpt`, `seo`).
- Supported out of the box: English (`en`), Hindi (`hi`), French (`fr`), and Arabic (`ar`).

### 6. Automated SEO Scoring Engine (TRD §11)
- Calculates a real-time **0–100 SEO score** evaluating:
  - Meta title length (50–60 characters)
  - Meta description length (140–160 characters)
  - Focus keyword presence in title, slug, and first paragraph
  - Image alt attribute presence
  - Heading hierarchy (strictly one H1, logical H2/H3)
  - Canonical URL and `hreflang` alternate tags

### 7. AWS S3 Media & WebP Compression Pipeline (TRD §10)
- Client pre-signed URL generation (`POST /admin/media/presigned-url`).
- Server-side fallback with automated `sharp` compression to `.webp`, responsive variants (thumbnails, medium), and storage in structured paths:
  `s3://<bucket>/blogs/<website>/<yyyy>/<mm>/<file>.webp`.

### 8. Webhook-Driven On-Demand ISR Revalidation (TRD §13 & §15)
- On publishing, updating, or unpublishing an article, the platform fires an HMAC-SHA256 signed webhook (`x-signature`, `x-timestamp`) to the consuming website's `/api/revalidate` endpoint.
- Protects against replay attacks and eliminates the need to wait for static TTL timeouts.

---

## 🗄️ Database Tables Reference (TRD §17)

| Table Name | Prisma Model | Description |
| :--- | :--- | :--- |
| `websites` | `Website` | First-class tenant websites with API keys and domains |
| `users` | `User` | Platform users, authentication hashes, and avatars |
| `user_role_assignments` | `UserRoleAssignment` | Per-tenant role mappings (RBAC) |
| `blogs` | `Blog` | Language-agnostic blog headers, statuses, and workflow states |
| `blog_translations` | `BlogTranslation` | Language-specific content, titles, slugs, and SEO meta |
| `categories` | `Category` | Hierarchical taxonomy categories per website |
| `tags` | `Tag` | Search and categorization tags per website |
| `blog_categories` | `BlogCategory` | M:N join table between blogs and categories |
| `blog_tags` | `BlogTag` | M:N join table between blogs and tags |
| `media_assets` | `MediaAsset` | Uploaded images, WebP assets, S3 keys, and CDN links |
| `redirects` | `Redirect` | 301 permanent redirect rules for modified slugs |
| `workflow_logs` | `WorkflowLog` | Immutable audit trail of editorial status changes |
| `audit_logs` | `SystemAuditLog` | Security, login, and user action audit logs |
| `seo_audit_logs` | `SeoAuditLog` | Automated 0–100 SEO audit scores and diagnostic checks |
| `analytics` | `AnalyticsEvent` | Asynchronous page views, unique visitor hashes, read time |
| `webhooks` | `WebhookDeliveryLog` | Delivery status and response logs for ISR revalidation webhooks |

---

## 🔐 Environment Variables (`backend/.env`)

```ini
# Server
PORT=4000
NODE_ENV=development
PLATFORM_BASE_URL=http://localhost:4000

# PostgreSQL (Prisma)
DATABASE_URL=postgresql://jupsoft_admin:jupsoft_secret_2026@localhost:5432/jupsoft_cms?schema=public

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secrets
JWT_SECRET=jupsoft_enterprise_jwt_super_secret_key_2026
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=jupsoft_enterprise_refresh_super_secret_key_2026
JWT_REFRESH_EXPIRATION=30d

# AWS S3 & CloudFront
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=mock_aws_access_key
AWS_SECRET_ACCESS_KEY=mock_aws_secret_key
AWS_S3_BUCKET=jupsoft-blogs-storage
CLOUDFRONT_DOMAIN=https://cdn.jupsoft.com

# Webhook Secret
WEBHOOK_DEFAULT_SECRET=wh_sec_jupsoft_default_revalidate_2026
```

---

## 🚀 Quick Verification Commands

```bash
# Verify backend builds cleanly
cd backend && pnpm run build

# Verify Next.js frontend builds cleanly
cd ../admin-portal && pnpm run build

# Run TypeScript typechecks across both projects
pnpm -r exec tsc --noEmit
```

*Architected & Documented for Jupsoft Systems Engineering Team.*
