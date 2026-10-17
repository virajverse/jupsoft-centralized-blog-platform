# Jupsoft CMS Admin MCP — Super Admin Control Suite

> **52 tools** to fully operate the Jupsoft Centralized Multi-Site Blog Platform as **Super Admin**.

## Features
- ✅ Auto-authenticated (Super Admin JWT token management)
- ✅ Blog CRUD + full 6-stage workflow (Draft → Review → Approved → Published / Scheduled / Archived)
- ✅ Multi-language translations (upsert Hindi, Arabic, Spanish translations)
- ✅ SEO audit engine with score (0-100) & actionable recommendations
- ✅ 3 tenant websites (site-cloud, site-growth, site-edtech) management
- ✅ User management & RBAC (invite, role change, suspend, delete)
- ✅ Category & tag hierarchical taxonomy management
- ✅ Media library (direct WebP upload, S3 presigned URLs, soft-delete)
- ✅ 301 permanent redirect rule management
- ✅ Analytics dashboard (website-level + per-blog + reader tracking)
- ✅ Webhooks & hybrid ISR cache revalidation (HMAC-SHA256, replay protection, retry queue)
- ✅ Immutable system audit logs & public consumer search/reading APIs

## Setup

```bat
jupsoft-cms-mcp\install.bat
```

Then import `mcp_config.json` in Antigravity IDE → Settings → MCP Servers.

## Backend & AI Agent Playbook

The CMS backend runs on `https://blogary.jupsoft.com` (Production) or `http://localhost:4010` (Local Development).

For complete database field schemas, REST API references, and mandatory pre-flight health audit protocols, read [SKILL.md](./SKILL.md).


## Tool Categories

| Category                        | Tools  | Description |
|---------------------------------|--------|-------------|
| System                          | 1      | Backend health probe and uptime check |
| Auth                            | 4      | Super Admin login, profile, password change, logout |
| Websites / Multi-Tenant         | 5      | List, get, create, update, and delete tenant websites |
| Blogs & Editorial Workflow      | 12     | CRUD, multi-language translations, 6-stage workflow, SEO audit |
| Taxonomy (Categories & Tags)    | 6      | Hierarchical category tree and tags management |
| Users & RBAC                    | 5      | Team member invitation, role assignment, status, removal |
| Media Library                   | 5      | List, direct upload with WebP conversion, S3 presigned URLs, confirm, delete |
| 301 Permanent Redirects         | 3      | SEO redirect rule management |
| Analytics & Tracking            | 3      | Aggregated dashboards, per-blog stats, pageview event tracking |
| Webhooks & Cache Revalidation   | 3      | HMAC delivery logs, on-demand ISR revalidation, retry worker |
| Audit Logs & Public APIs        | 5      | Immutable security audit trail, consumer slug lookup, latest, popular, full-text search |
| **Total**                       | **52** | Complete Super Admin AI Agent Playbook |
