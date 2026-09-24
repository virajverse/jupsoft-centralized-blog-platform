# 🚀 Jupsoft Centralized Multi-Site Blog Management Platform

[![Architecture](https://img.shields.io/badge/Architecture-Decoupled%20Next.js%20%2B%20NestJS-blue.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20Strict-3178C6.svg)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2016%20%7C%20Redis%207-336791.svg)](#)
[![TRD](https://img.shields.io/badge/TRD-Version%201.0-orange.svg)](./blog-platform-trd.pdf)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success.svg)](#)

Enterprise multi-tenant content management hub designed to power all Jupsoft domains and client properties (DigifyNext, Jupsoft Cloud, etc.) from a single high-velocity administrative studio.

> 📖 **Full System Architecture & Fresh Machine Setup Guide:**  
> See [**`CONTEXT.md`**](./CONTEXT.md) for the complete operational blueprint, fresh laptop setup instructions, database models, and TRD compliance breakdown.

---

## 📦 Monorepo Structure

```
jupsoft-centralized-blog-platform/
├── 🌐 admin-portal/        ➔ Next.js 16.3.5 (App Router, Tailwind v4, Zustand, Tiptap Studio)
├── ⚙️  backend/             ➔ NestJS 11 (Modular REST API, JWT RBAC, Prisma, Redis Caching)
├── 🌍 digifynext/          ➔ DigifyNext static website (blog.html, blogdetail.html, CMS client)
├── 📚 docs/                ➔ Full TRD Delivery Documentation & Architecture Diagrams
│   └── 📘 CROSS-SITE-BLOG-MIGRATION-PLAYBOOK.md ➔ Cross-site migration SOP (By Viraj)
├── 🐳 infra/               ➔ Production AWS ECS Task Definitions & Docker Compose scripts
├── 📄 CONTEXT.md           ➔ Complete Developer Onboarding, Architecture & Fresh PC Setup Guide
├── 📄 NEW-WEBSITE-INTEGRATION-GUIDE.md ➔ Multi-framework tenant onboarding guide
├── 📄 blog-platform-trd.pdf➔ Official Jupsoft Technical Requirement Document (TRD v1.0)
├── 📄 deploy-vps.sh        ➔ One-command optimized VPS deployment script (RAM-safe)
├── 📄 package.json         ➔ Monorepo workspace configuration (pnpm)
└── 📄 pnpm-workspace.yaml  ➔ Monorepo package linking
```

---

## ⚡ Quick Start on a Fresh Laptop

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Start PostgreSQL 16 & Redis 7 Docker containers
cd backend
docker compose up -d

# 3. Sync database models
pnpm exec prisma db push

# 4. Start development servers concurrently
cd ..
pnpm run dev
```

- **Admin Studio:** [http://localhost:3000](http://localhost:3000)
- **API Swagger Documentation:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **Database Studio (Visual UI):** `cd backend && pnpm exec prisma studio` → [http://localhost:5555](http://localhost:5555)

---

## 🚀 VPS Deployment (One Command)

```bash
cd /var/www/blogary.jupsoft.com
bash deploy-vps.sh
```

The script auto-handles: RAM-safe build (stops PM2 → compile → restart), swap activation, Prisma client generation, disk cleanup, and PM2 service management.

---

## 📋 Technology Matrix

| Layer | Selected Technology | Purpose |
| :--- | :--- | :--- |
| **Admin Frontend** | Next.js 16.3.5 (App Router, TypeScript) | Jupsoft Studio editorial UI, SSR/ISR, zero-CLS |
| **Styling & UI** | Tailwind CSS v4 + Lucide Icons | Deep-space Jupsoft design system |
| **Rich Editor** | Tiptap WYSIWYG | Structured JSON content, rich formatting, multilang |
| **Backend API** | NestJS 11 (Node.js, TypeScript) | Modular REST API, JWT RBAC, guards, Swagger |
| **ORM & Database** | Prisma ORM + PostgreSQL 16 Alpine | 11+ strictly mapped multi-tenant tables |
| **Caching & Queue**| Redis 7 Alpine (AWS ElastiCache) | Sub-300ms public reads, session tokens, rate limits |
| **Object Storage** | AWS S3 + CloudFront CDN | Automated WebP compression pipeline & CDN delivery |
| **Deployment** | Docker + AWS ECS Fargate / VPS PM2 | Decoupled, containerized autoscaling architecture |

---

## ✨ Key Features

- **Multi-Tenant Architecture** — One CMS powers multiple client websites simultaneously
- **Multilingual Content** — Full EN / HI / FR / AR translation support per article
- **RBAC Permissions** — Role-based access (Super Admin → Content Writer) with per-module ON/OFF toggles persisted in PostgreSQL
- **Publication Date Control** — Backdate or future-date any article; date saved directly to `publish_date` in PostgreSQL
- **Blog Studio** — Tiptap WYSIWYG editor with SEO auditor, meta/OG tags, featured cover image, word count, read time
- **Auto-Save** — Silent background draft saves every 30s; no data loss on browser close
- **Schedule Publishing** — Cron-based auto-publish for future-dated articles
- **Media Library** — AWS S3 upload with WebP compression, alt-text, site-scoped library
- **ISR Revalidation** — Instant live site update on publish via webhook
- **Redirects Manager** — Auto-creates 301 permanent redirects on slug changes
- **Taxonomy** — Multi-site categories and tags with drag-and-drop management
- **Audit Trail** — Full workflow log (Draft → Review → Approved → Published → Archived)
- **Public REST API** — `/v1/blogs` for all tenant consumer sites with Redis caching
- **DigifyNext Integration** — Fully integrated static HTML client with skeleton loaders, lazy loading, language switcher

---

## 🗓️ Changelog

| Version | Date | Changes |
|---------|------|---------|
| **v1.6** | Sep 2026 | Refactor: Renamed all internal `Zoho` references to `Jupsoft` across component names, folder structure, and code comments |
| **v1.5** | Sep 2026 | Feat: Publication date column in blogs list with smart Published/Scheduled/Updated badge |
| **v1.4** | Sep 2026 | Fix: Public API now returns both `publishedAt` and `publishDate` fields; DigifyNext client updated to use both |
| **v1.3** | Sep 2026 | Fix: Publication date picker (type=date) with instant auto-close on selection and live format preview |
| **v1.2** | Sep 2026 | Fix: `publishDate` and `scheduledAt` now correctly pass through `apiClient` whitelist to database |
| **v1.1** | Sep 2026 | Feat: Custom publication date picker in Blog Studio; multi-framework tenant integration guide |
| **v1.0** | Sep 2026 | Feat: RBAC modular permissions in PostgreSQL; SEO playbooks; VPS RAM-safe deploy script |

---

## 🌐 Live URLs

| Service | URL |
|---------|-----|
| **Admin Studio** | [blogary.jupsoft.com](https://blogary.jupsoft.com) |
| **Public API** | [blogary.jupsoft.com/v1/blogs](https://blogary.jupsoft.com/v1/blogs) |
| **DigifyNext Blog** | [digifynext.com/blog](https://digifynext.com/blog) |

---

*Architected & Maintained by Viraj Srivastav (`virajverse`) for Jupsoft Systems Pvt. Ltd.*
