# Jupsoft Centralized Blog Platform — REST API & cURL Reference Guide

> **Architecture Overview**: Complete HTTP REST API specification for integrating Jupsoft CMS into any programming language, framework, mobile app (Flutter/React Native), or automated agent pipeline.

---

## 1. Base URL & Authentication

- **Production Gateway**: `https://blogary.jupsoft.com/v1`
- **Required Header**: `Accept: application/json`
- **Authentication**:
  - **Browser Client**: Authenticated automatically via Origin header whitelist (`Origin: https://yourdomain.com`).
  - **Server-to-Server**: Authenticated via `x-api-key: YOUR_API_KEY`.
- **Tenant Scope Parameter**: `?website=YOUR_WEBSITE_ID` (required on all queries).

---

## 2. API Endpoints Specification

### 1. List Blog Posts (Paginated)
```http
GET /v1/blogs?website={websiteId}&page=1&limit=10&category={category}&tag={tag}&search={q}
```
**cURL Example**:
```bash
curl -X GET "https://blogary.jupsoft.com/v1/blogs?website=YOUR_WEBSITE_ID&page=1&limit=9" \
  -H "Accept: application/json" \
  -H "x-api-key: YOUR_API_KEY"
```

### 2. Single Article by Slug
```http
GET /v1/blogs/{slug}?website={websiteId}
```
**cURL Example**:
```bash
curl -X GET "https://blogary.jupsoft.com/v1/blogs/sample-post-slug?website=YOUR_WEBSITE_ID" \
  -H "Accept: application/json" \
  -H "x-api-key: YOUR_API_KEY"
```

### 3. Edge Cache Bypass (Real-time Preview)
Append `&fresh=1` to query live database records immediately, bypassing Redis edge caching:
```bash
curl -X GET "https://blogary.jupsoft.com/v1/blogs?website=YOUR_WEBSITE_ID&fresh=1" \
  -H "Accept: application/json" \
  -H "x-api-key: YOUR_API_KEY"
```

### 4. Latest Articles
```http
GET /v1/blogs/latest?website={websiteId}&limit=3
```

### 5. Categories Taxonomy Tree
```http
GET /v1/categories?websiteId={websiteId}
```

### 6. Gateway Health Check
```http
GET /v1/health
```

---

## 3. Response Structure & JSON Schema

```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "id": "post-9842f1a",
      "slug": "annual-sports-day-celebration-2026",
      "title": "Annual Sports Day Celebration 2026",
      "excerpt": "Highlights and winning performances from our annual inter-house athletics meet.",
      "content": "<p>Full sanitized article HTML body with paragraphs, images, and tables.</p>",
      "featuredImage": "https://cdn.jupsoft.com/uploads/sports-day.webp",
      "publishedAt": "2026-10-12T10:00:00.000Z",
      "authorName": "Principal Office",
      "primaryCategory": "Campus Events",
      "readTimeMinutes": 3,
      "seo": {
        "metaTitle": "Annual Sports Day Celebration 2026 | School News",
        "metaDescription": "Highlights from our annual athletics meet.",
        "canonicalUrl": "https://yourschool.com/blog/annual-sports-day-celebration-2026"
      },
      "schemaJsonLd": {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": "Annual Sports Day Celebration 2026",
        "image": "https://cdn.jupsoft.com/uploads/sports-day.webp",
        "datePublished": "2026-10-12T10:00:00.000Z"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```
