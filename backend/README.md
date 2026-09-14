# Jupsoft Multi-Site Centralized Blog CMS Backend Service

Production-grade NestJS RESTful API engine strictly conforming to **TRD Sections 12, 13, 15, 16, 17, and 18**.

Built with **NestJS (v11)**, **PostgreSQL (Prisma ORM)**, **Redis Caching**, **JWT Authentication**, and **AWS S3 Presigned Uploads**.

---

## 🚀 Quick Start (Local Development)

### 1. Start PostgreSQL & Redis with Docker Compose

```bash
cd backend
docker compose up -d
```
This spins up:
- **PostgreSQL 16** on `localhost:5432` (Database: `jupsoft_cms`, User: `jupsoft_admin`, Password: `jupsoft_secret_2026`)
- **Redis 7** on `localhost:6379`

### 2. Generate Prisma Client & Run Seed Data

```bash
# Generate Prisma Client
pnpm prisma:generate

# Run initial migrations
pnpm prisma:migrate

# Seed database with initial websites, admin user, and published articles
pnpm prisma:seed
```

### 3. Start NestJS Backend Service

```bash
# Start in development watch mode
pnpm start:dev

# Build for production
pnpm build

# Start production server
pnpm start:prod
```

The backend server listens on **`http://localhost:4000`**.

---

## 📚 API Documentation (Swagger OpenAPI)

Interactive Swagger UI documentation is available at:
👉 **`http://localhost:4000/api/docs`**

---

## 🔐 Core Endpoints Overview

### Public Consumer API (`/v1/*`)
Requires header `Authorization: Bearer <tenant_api_key>`:
- `GET /v1/blogs` — Paginated published posts filtered by `category`, `tag`, `lang`, `page`, `limit`
- `GET /v1/blogs/:slug` — Single published post with canonical SEO metadata and Schema.org `BlogPosting` JSON-LD
- `GET /v1/categories` — Taxonomy category tree
- `GET /v1/tags` — Tags list
- `GET /v1/search?q=...` — Full-text keyword search

### Administrative API (`/admin/*`)
Requires header `Authorization: Bearer <jwt_access_token>`:
- `POST /admin/auth/login` — Authenticate and receive JWT access + refresh tokens
- `POST /admin/auth/refresh` — Rotate refresh token
- `GET /admin/auth/me` — Current user profile with tenant role assignments
- `GET /admin/websites` — List all configured tenant websites
- `POST /admin/websites` — Onboard new tenant (auto-generates API key & S3 prefix)
- `GET /admin/blogs` — List articles with status, tenant, and search filters
- `POST /admin/blogs` — Create draft article
- `PUT /admin/blogs/:id` — Update article (auto-captures 301 redirect if slug changes on published post)
- `POST /admin/blogs/:id/submit` — Submit draft for editorial review (`Draft → Under Review`)
- `POST /admin/blogs/:id/approve` — Approve draft (`Under Review → Approved`)
- `POST /admin/blogs/:id/publish` — Publish article & trigger on-demand ISR revalidation webhook
- `POST /admin/blogs/:id/archive` — Archive article and purge from cache
- `POST /admin/media/presigned-url` — Issue AWS S3 presigned PUT URL for WebP upload
- `GET /admin/redirects` — List 301 permanent redirect rules
- `POST /admin/redirects` — Add manual 301 rule
- `GET /admin/users` — List team members and tenant role assignments
- `POST /admin/users/invite` — Invite organization user with assigned role
- `GET /admin/audit-logs` — Immutable administrative activity audit trail

---

## ⚡ Webhook Revalidation Architecture (TRD Section 13)

When an article status moves to `Published` or `Archived`, the backend computes an **HMAC SHA-256** hash of the JSON payload using `WEBHOOK_DEFAULT_SECRET`:

```http
POST https://<consuming-site.com>/api/revalidate
x-signature: <hex_encoded_hmac_sha256>
Content-Type: application/json

{
  "event": "blog.published",
  "website": "jupsoft.com",
  "slug": "ai-powered-shift-modern-cloud-erp",
  "timestamp": 1789320000000
}
```

The consuming Next.js 15 site verifies `x-signature` and calls `revalidateTag('blog:' + body.slug)` for sub-second cache purge without restarting or rebuilding the frontend!
