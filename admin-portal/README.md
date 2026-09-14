# Jupsoft Multi-Site Centralized Blog CMS Admin Portal

Enterprise centralized authoring, SEO orchestration, and multi-tenant delivery platform for corporate domains (`jupsoft.com`, `digifynext.com`, `schoolerp.in`).

Engineered strictly in compliance with the **Jupsoft Blog Platform Technical Requirements Document (TRD v1.0)** across all 21 architectural domains.

Built with **Next.js 16 (App Router, Turbopack)**, **TypeScript**, **Tailwind CSS v4**, **Tiptap Pro Rich-Text Editor**, and **Zustand** state persistence.

---

## ⚡ Package Management: pnpm

This repository strictly uses **`pnpm`** (v10/v11+) for disk-efficiency, content-addressable storage, and strict dependency isolation.

```bash
# Install dependencies
pnpm install

# Start local development server (Turbopack)
pnpm dev

# Create optimized production build
pnpm build

# Start production server
pnpm start

# Run ESLint validation
pnpm lint
```

---

## 📐 Architecture & TRD Compliance Matrix

| TRD Section | Capability | Implementation in Frontend | Backend Handshake Contract |
|---|---|---|---|
| **Sec 5** | Multi-Tenant Scoping | Scoped isolation + Global Network Mode (`All Websites`) with tenant onboarding modal & toggle | `GET /admin/websites`, `POST /admin/websites` |
| **Sec 6** | Rich-Text Authoring | Tiptap WYSIWYG editor with Heading/Code/Table/Callout/Image picker | JSON/HTML payload (`BlogTranslation.content`) |
| **Sec 7** | Workflow & RBAC | 4-stage Kanban (`Draft → Under Review → Approved → Published`) + Notes & Audit history | `POST /admin/blogs/:id/submit`, `/approve`, `/publish` |
| **Sec 7** | 301 Permanent Redirects | Automatic 301 capture on slug change + Dedicated Redirects Manager (`/redirects`) | `GET /admin/redirects`, `POST /admin/redirects` |
| **Sec 8** | SEO Engine | Real-time 0–100 SEO scoring, SERP preview, Focus keyword check, Robots directive selector | `BlogSEO` contract schema |
| **Sec 9** | Social Studio & Schema | Open Graph & Twitter cards live preview + Auto-generated JSON-LD `BlogPosting` structured data | Standardized Schema.org JSON-LD |
| **Sec 10** | Media & CDN Pipeline | In-browser WebP canvas conversion, S3 prefix scoping (`blogs/{slug}/`), alt text enforce | S3 Presigned URL + CloudFront CDN |
| **Sec 11** | Public Consumer API | Developer API Portal (`/developers`) with live interactive endpoint tester & cURL generator | `GET /v1/blogs`, `GET /v1/blogs/:slug`, `GET /v1/categories`, `GET /v1/search` |
| **Sec 12** | Multi-Language Localization | Tabbed locale switching (`EN`, `HI`, `FR`, `AR`) + 1-click AI auto-translate simulation | `Record<LanguageCode, BlogTranslation>` |
| **Sec 13** | On-Demand ISR Revalidation | Webhook revalidation trigger simulator with HMAC SHA-256 signature verification | `POST /api/revalidate` with `x-signature` |
| **Sec 14** | Analytics & Author Leaderboard | Performance KPIs, Author productivity rankings (`7d`, `30d`, `90d`, `All Time`), cross-site scorecard | `GET /admin/analytics/authors`, `GET /admin/analytics/summary` |
| **Sec 15** | Security & Audit Trail | Immutable audit trail viewer (`/settings?tab=audit`) capturing every admin action with IP & timestamp | `GET /admin/audit-logs` |

---

## 🗺️ Application Route Map

Every view maintains deep URL state synchronization (`useQueryState`) to ensure shareable URLs, persistent filter bookmarks, and zero layout overlap:

- **`/dashboard`**: Operational KPIs, tenant comparison scorecard, recent posts, and quick-action developer hubs (`?site=`).
- **`/blogs`**: Filterable article table with status chips, category/language filters, search query, and pagination (`?site=&status=&cat=&q=`).
- **`/blogs/new`**: Create new article draft pre-bound to current tenant scope (`?site=`).
- **`/blogs/[id]`**: Full-featured editor with SEO scoring, Social Studio (OG/Twitter), Robots directive, JSON-LD generator, and 301 slug guard (`?site=&lang=`).
- **`/workflow`**: Interactive Kanban board with role-based action buttons, transition note modal, and revision history log (`?site=&tenant=&log=&transition=&target=`).
- **`/media`**: Asset library with drag-and-drop file upload, automatic client-side WebP compression, S3 prefix isolation, and alt text editor (`?site=&q=&sort=&view=`).
- **`/taxonomy`**: Hierarchical category tree builder with slug auto-generation and tag manager (`?site=&tab=categories|tags`).
- **`/redirects`**: 301 Permanent Redirects table with hit count metrics and manual rule creator (`?site=`).
- **`/developers`**: Developer API Portal with interactive endpoint tester, live JSON response viewer, cURL generator, and Next.js 15 App Router ISR snippets (`?site=`).
- **`/users`**: Team directory with tenant-scoped role assignments, invitation modal, and visual RBAC entitlement matrix (`?site=&tab=users|matrix`).
- **`/settings`**: Multi-tenant registry, "+ Onboard New Website" modal, tenant status toggle (Active/Inactive), API key manager, webhook revalidation tester, and immutable audit logs (`?site=&tenant=&tab=all|general|webhook|audit`).
- **`/analytics`**: Readership KPIs, Author productivity leaderboard, language coverage progress bars, and timeframe filters (`?site=&tenant=&range=7d|30d|90d|all`).

---

## 🔌 Zero-Friction Backend Handshake (NestJS Ready)

The frontend data contracts and store methods in `src/store/useBlogStore.ts` and `src/types/index.ts` strictly mirror the PostgreSQL table schemas defined in TRD Section 17.

To connect this frontend to a live NestJS API:
1. Replace store state mutations with standard `fetch` or `axios` calls pointing to `process.env.NEXT_PUBLIC_API_URL`.
2. All DTO interfaces (`Blog`, `Website`, `Category`, `Tag`, `MediaItem`, `RedirectItem`, `UserAccount`, `SystemAuditLog`) already match backend entity specifications.
3. Pass `Authorization: Bearer <token>` in API interceptors.
