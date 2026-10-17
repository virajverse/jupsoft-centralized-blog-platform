# Jupsoft Centralized Blog Platform — Node.js / Express Integration Guide

> **Architecture Overview**: Complete server-side integration guide for Node.js backends using Express, Fastify, or plain HTTP with environment configuration and caching.

---

## 1. Environment Configuration (`.env`)

```env
JUPSOFT_API_URL="https://blogary.jupsoft.com/v1"
JUPSOFT_WEBSITE_ID="YOUR_WEBSITE_ID"
JUPSOFT_API_KEY="YOUR_API_KEY"
```

---

## 2. Reusable Service Client (`services/jupsoftCms.js`)

```javascript
// services/jupsoftCms.js
require('dotenv').config();

const API_URL = process.env.JUPSOFT_API_URL || 'https://blogary.jupsoft.com/v1';
const WEBSITE_ID = process.env.JUPSOFT_WEBSITE_ID;
const API_KEY = process.env.JUPSOFT_API_KEY;

if (!WEBSITE_ID || !API_KEY) {
  console.warn('[JupsoftCMS] Warning: Missing JUPSOFT_WEBSITE_ID or JUPSOFT_API_KEY in environment.');
}

async function fetchCms(endpoint, params = {}) {
  const query = new URLSearchParams({ website: WEBSITE_ID, ...params });
  const url = `${API_URL}${endpoint}?${query.toString()}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'x-api-key': API_KEY,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Jupsoft CMS API Error [HTTP ${res.status}]: ${errorBody}`);
  }

  const json = await res.json();
  return {
    success: true,
    data: json.data || json,
    meta: json.meta || json.pagination || null,
  };
}

module.exports = {
  // Fetch paginated blog posts
  getBlogs: (page = 1, limit = 10, category = null) => {
    const params = { page, limit };
    if (category) params.category = category;
    return fetchCms('/blogs', params);
  },

  // Fetch single article by slug
  getBlogBySlug: (slug) => fetchCms(`/blogs/${encodeURIComponent(slug)}`),

  // Fetch latest articles (e.g. for homepage widget)
  getLatest: (limit = 3) => fetchCms('/blogs/latest', { limit }),

  // Fetch categories tree
  getCategories: () => fetchCms('/categories'),

  // Search articles
  search: (q, limit = 10) => fetchCms('/search', { q, limit }),
};
```

---

## 3. Express Controller & Routes (`routes/blog.js`)

```javascript
// routes/blog.js
const express = require('express');
const router = express.Router();
const JupsoftCMS = require('../services/jupsoftCms');

// 1. Blog Listing Route
router.get('/blog', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const { data: blogs, meta } = await JupsoftCMS.getBlogs(page, 9);
    
    // Render EJS/Pug template or return JSON
    res.render('blog-list', { 
      title: 'Our Blog & News',
      blogs, 
      meta 
    });
  } catch (err) {
    console.error('Failed to fetch blogs:', err);
    res.status(500).render('error', { message: 'Unable to load blog archive.' });
  }
});

// 2. Single Article Detail Route
router.get('/blog/:slug', async (req, res) => {
  try {
    const { data: article } = await JupsoftCMS.getBlogBySlug(req.params.slug);
    if (!article) {
      return res.status(404).render('404', { message: 'Article not found.' });
    }

    res.render('blog-detail', {
      title: article.seo?.metaTitle || article.title,
      metaDescription: article.seo?.metaDescription || article.excerpt,
      article
    });
  } catch (err) {
    console.error('Failed to load article:', err);
    res.status(404).render('404', { message: 'Article not found.' });
  }
});

module.exports = router;
```

---

## 4. EJS View Template Example (`views/blog-detail.ejs`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title><%= title %></title>
  <% if (metaDescription) { %>
    <meta name="description" content="<%= metaDescription %>">
  <% } %>
  <% if (article.schemaJsonLd) { %>
    <script type="application/ld+json"><%- JSON.stringify(article.schemaJsonLd) %></script>
  <% } %>
</head>
<body>
  <article class="container">
    <h1><%= article.title %></h1>
    <p class="meta">By <%= article.authorName %> on <%= new Date(article.publishedAt).toLocaleDateString() %></p>
    <% if (article.featuredImage) { %>
      <img src="<%= article.featuredImage %>" alt="<%= article.title %>" />
    <% } %>
    <!-- Sanitized article HTML body -->
    <div class="content"><%- article.content %></div>
  </article>
</body>
</html>
```
