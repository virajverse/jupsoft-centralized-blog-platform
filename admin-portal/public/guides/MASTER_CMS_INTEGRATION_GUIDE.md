# Jupsoft Centralized Blog Platform — Master Integration Handbook

> **Universal Integration Blueprint**: This handbook is structured to be read and immediately implemented by both **human engineers** (frontend, backend, fullstack) and **autonomous AI coding assistants** (Claude, ChatGPT, Cursor, Antigravity).

---

## 1. System Architecture & Gateway Specification

- **Gateway URL**: `https://blogary.jupsoft.com/v1`
- **Supported Formats**: JSON (`Accept: application/json`)
- **Default TTL Edge Cache**: 60 seconds (Redis + Cloudflare)
- **Edge Cache Bypass**: Append `&fresh=1` for instant database reflection

### Authentication Model:
1. **Public Browser Clients (Zero Key Leakage)**:
   - Validated automatically against registered tenant domain (`Origin` & `Referer` headers).
   - Embedded script: `/js/cms-client.js`.
   - Secret API key is **NEVER** exposed in public HTML.
2. **Server-Side Backends & Build Time (SSR / ISR / Cron)**:
   - Header: `x-api-key: YOUR_API_KEY`.
   - Header: `x-website-id: YOUR_WEBSITE_ID`.

---

## 2. Multi-Stack Handover Guides Index

| Language / Stack | Guide File (.md) | Plain Text (.txt) | Best Suited For |
| :--- | :--- | :--- | :--- |
| **ASP.NET (.aspx)** | [Blog Section ASPX.md](/guides/Blog%20Section%20ASPX.md) | [Blog Section ASPX.txt](/guides/Blog%20Section%20ASPX.txt) | Jupsoft School/College Web Forms |
| **HTML5 / Vanilla JS** | [Blog Section HTML.md](/guides/Blog%20Section%20HTML.md) | [Blog Section.txt](/guides/Blog%20Section.txt) | Static websites, SHTML, custom CMS |
| **Next.js 14+ / React** | [Blog Section NextJS.md](/guides/Blog%20Section%20NextJS.md) | [Blog Section NextJS.txt](/guides/Blog%20Section%20NextJS.txt) | Modern Jamstack, Vercel, ISR |
| **Node.js / Express** | [Blog Section Node.md](/guides/Blog%20Section%20Node.md) | [Blog Section Node.txt](/guides/Blog%20Section%20Node.txt) | Express, Fastify, NestJS backends |
| **C# / .NET 8** | [Blog Section CSharp.md](/guides/Blog%20Section%20CSharp.md) | [Blog Section CSharp.txt](/guides/Blog%20Section%20CSharp.txt) | ASP.NET Core MVC & Web API |
| **PHP / Laravel** | [Blog Section PHP.md](/guides/Blog%20Section%20PHP.md) | [Blog Section PHP.txt](/guides/Blog%20Section%20PHP.txt) | Core PHP, Laravel, WordPress |
| **Python / FastAPI** | [Blog Section Python.md](/guides/Blog%20Section%20Python.md) | [Blog Section Python.txt](/guides/Blog%20Section%20Python.txt) | FastAPI, Django, Flask |
| **Java / Spring Boot** | [Blog Section Java.md](/guides/Blog%20Section%20Java.md) | [Blog Section Java.txt](/guides/Blog%20Section%20Java.txt) | Enterprise Java, Spring Boot 3.x |
| **REST API / cURL** | [Blog Section REST API.md](/guides/Blog%20Section%20REST%20API.md) | [Blog Section REST API.txt](/guides/Blog%20Section%20REST%20API.txt) | Any language, Flutter, Mobile apps |

---

## 3. Standard Article Object Data Schema

Every article returned by the CMS adheres to this strict schema:

```typescript
interface BlogPost {
  id: string;               // Unique database primary key (e.g. "post-8a9f2e")
  slug: string;             // URL identifier (e.g. "sports-day-celebration-2026")
  title: string;            // Main headline string
  excerpt: string;          // 1-2 sentence article summary
  content: string;          // Full HTML article body (sanitized by server API)
  featuredImage?: string;   // High-resolution CDN cover image URL
  publishedAt: string;      // ISO 8601 publication timestamp
  authorName?: string;      // Author signature or "Editorial Team"
  primaryCategory?: string; // Main taxonomy classification
  readTimeMinutes?: number; // Estimated reading duration
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
  };
  schemaJsonLd?: object;    // Pre-computed Schema.org BlogPosting JSON-LD
}
```

---

## 4. Autonomous AI Agent Implementation Instructions

If you are an AI coding assistant (Claude, ChatGPT, Cursor, Antigravity) instructed to integrate Jupsoft CMS into an existing project, follow these exact algorithmic steps:

1. **Detect Project Stack**:
   - Check `package.json` for Next.js / Express / React.
   - Check `*.csproj` or `Site.Master` for .NET / ASPX.
   - Check `composer.json` or `*.php` for PHP.
   - Check `requirements.txt` or `pyproject.toml` for Python.
   - Check `pom.xml` or `build.gradle` for Java.
2. **Environment Configuration**:
   - Set `JUPSOFT_WEBSITE_ID` and `JUPSOFT_API_URL="https://blogary.jupsoft.com/v1"`.
   - Set `JUPSOFT_API_KEY` for server-side code only.
3. **Add Article Fetching**:
   - Create a reusable service layer (`getBlogs(page, limit)` and `getBlogBySlug(slug)`).
   - Set timeout to 5000ms.
4. **Implement Listing View**:
   - Render responsive cards with `featuredImage`, `title`, `excerpt`, `publishedAt`, and link to `/blog/{slug}`.
5. **Implement Detail View**:
   - Fetch article by slug.
   - Inject `title`, `content` (as raw HTML), and `publishedAt`.
   - Inject `<title>`, `<meta name="description">`, and `schemaJsonLd`.
6. **Configure URL Rewriting**:
   - For IIS: Add rewrite rule in `web.config`.
   - For Apache: Add rewrite rule in `.htaccess`.
