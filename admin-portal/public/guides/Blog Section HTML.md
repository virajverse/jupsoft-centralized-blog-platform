# Jupsoft Centralized Blog Platform — HTML & Vanilla JavaScript Integration Guide

> **Architecture Overview**: This guide provides zero-dependency instructions to integrate Jupsoft CMS blog articles into any static HTML, SHTML, PHP, or custom web template using pure HTML5 and vanilla JavaScript.

---

## 1. Quick Credentials Reference

| Variable | Placement | Description |
| :--- | :--- | :--- |
| `WEBSITE_ID` | `cms-client.js` or `window.JUPSOFT_CONFIG` | Public tenant ID for your website |
| `API_KEY` | Development only | Localhost testing key (omit on production domain) |
| `API_BASE_URL` | Handled automatically by SDK | `https://blogary.jupsoft.com/v1` |
| `PRODUCTION_DOMAIN` | Registered domain | Whitelisted origin domain (zero plaintext secret key exposure) |

---

## 2. Global Script Setup (Add before `</body>` on all pages)

```html
<!-- Localhost Testing: -->
<script>
  window.JUPSOFT_CONFIG = {
    websiteId: 'YOUR_WEBSITE_ID',
    // apiKey: 'YOUR_API_KEY' // Only needed for localhost
  };
</script>
<!-- Headless Client SDK Engine (~2.8 KB, Zero CSS dependencies) -->
<script src="/js/cms-client.js"></script>
```

---

## 3. Home Page Articles Section (`index.html`)

```html
<section class="blog-section" id="blogSection" style="padding: 4rem 1.5rem; max-width: 1200px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 2.5rem;">
    <h2 style="font-size: 2rem; font-weight: 700; color: #0f172a;">Latest News & Articles</h2>
    <p style="color: #64748b; font-size: 1rem; margin-top: 0.5rem;">Stay updated with our latest announcements and educational insights.</p>
  </div>

  <!-- Dynamic Blog Grid Container -->
  <div id="blogGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
    <p style="color: #94a3b8; text-align: center; grid-column: 1 / -1;">Loading articles...</p>
  </div>

  <div style="text-align: center; margin-top: 2.5rem;">
    <a href="blog.html" style="display: inline-block; padding: 0.75rem 1.5rem; background: #0f172a; color: #fff; font-weight: 600; text-decoration: none; border-radius: 8px;">
      View All Articles &rarr;
    </a>
  </div>
</section>
```

---

## 4. Dedicated Blog Archive Page (`blog.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog Archive</title>
</head>
<body>
  <main style="max-width: 1200px; margin: 0 auto; padding: 4rem 1.5rem;">
    <h1 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 2rem;">Blog & News Archive</h1>
    <div id="blogGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;"></div>
  </main>

  <script src="/js/cms-client.js"></script>
  <script src="/js/main.js"></script>
</body>
</html>
```

---

## 5. Blog Detail Page (`blog-detail.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loading Post...</title>
</head>
<body>
  <article style="max-width: 820px; margin: 3rem auto; padding: 0 1.5rem;">
    <header style="margin-bottom: 2rem;">
      <span id="articleCategory" style="font-size: 0.875rem; font-weight: 700; color: #4f46e5; text-transform: uppercase;"></span>
      <h1 id="articleTitle" style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 0.5rem 0 1rem; line-height: 1.3;">Loading article...</h1>
      <div id="articleMeta" style="font-size: 0.875rem; color: #64748b;"></div>
    </header>

    <div id="articleImageWrapper" style="margin-bottom: 2rem; border-radius: 12px; overflow: hidden; display: none;">
      <img id="articleImage" src="" alt="" style="width: 100%; max-height: 480px; object-fit: cover;" />
    </div>

    <!-- Article Content Body -->
    <div id="articleBody" style="font-size: 1.125rem; line-height: 1.8; color: #334155;"></div>

    <hr style="margin: 3rem 0; border: 0; border-top: 1px solid #e2e8f0;" />
    <a href="blog.html" style="color: #4f46e5; font-weight: 600; text-decoration: none;">&larr; Back to all articles</a>
  </article>

  <script src="/js/cms-client.js"></script>
  <script src="/js/main.js"></script>
</body>
</html>
```

---

## 6. Integration Controller Script (`js/main.js`)

```javascript
document.addEventListener('DOMContentLoaded', async function () {
  if (typeof JupsoftCMS === 'undefined') return;

  var grid = document.getElementById('blogGrid');
  var articleBody = document.getElementById('articleBody');

  // 1. Render Listing Grid (Home & blog.html)
  if (grid) {
    try {
      var res = await JupsoftCMS.getBlogs({ limit: 12 });
      if (res && res.success && res.data && res.data.length > 0) {
        grid.innerHTML = '';
        res.data.forEach(function (blog) {
          var card = document.createElement('div');
          card.style.cssText = 'border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff; display: flex; flex-direction: column;';

          var img = blog.featuredImage || '/images/default-blog.jpg';
          var link = 'blog-detail.html?slug=' + encodeURIComponent(blog.slug);
          var date = blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : '';

          card.innerHTML = `
            <a href="${link}" style="height: 200px; display: block; overflow: hidden;">
              <img src="${img}" alt="${blog.title}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" />
            </a>
            <div style="padding: 1.25rem; flex-grow: 1; display: flex; flex-direction: column;">
              <span style="font-size: 0.75rem; font-weight: 700; color: #4f46e5; text-transform: uppercase;">${blog.primaryCategory || 'Article'}</span>
              <h3 style="font-size: 1.125rem; font-weight: 700; margin: 0.5rem 0;"><a href="${link}" style="color: #0f172a; text-decoration: none;">${blog.title}</a></h3>
              <p style="font-size: 0.875rem; color: #64748b; flex-grow: 1; margin-bottom: 1rem;">${blog.excerpt || ''}</p>
              <div style="font-size: 0.75rem; color: #94a3b8; display: flex; justify-content: space-between;">
                <span>${date}</span>
                <a href="${link}" style="color: #4f46e5; font-weight: 600; text-decoration: none;">Read &rarr;</a>
              </div>
            </div>
          `;
          grid.appendChild(card);
        });
      } else {
        grid.innerHTML = '<p style="text-align: center; color: #94a3b8; grid-column: 1 / -1;">No articles published yet.</p>';
      }
    } catch (e) {
      console.error('Error fetching blogs:', e);
    }
  }

  // 2. Render Article Detail (blog-detail.html)
  if (articleBody) {
    var urlParams = new URLSearchParams(window.location.search);
    var slug = urlParams.get('slug');

    if (!slug) {
      document.getElementById('articleTitle').innerText = 'Article not specified.';
      return;
    }

    try {
      var res = await JupsoftCMS.getBlogBySlug(slug);
      if (res && res.success && res.data) {
        var post = res.data;
        JupsoftCMS.applySeo(post); // Injects <title>, meta description & schema.org JSON-LD

        document.getElementById('articleTitle').innerText = post.title;
        articleBody.innerHTML = post.content;

        if (post.primaryCategory) {
          document.getElementById('articleCategory').innerText = post.primaryCategory;
        }

        var pubDate = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '';
        document.getElementById('articleMeta').innerText = (post.authorName ? 'By ' + post.authorName + ' • ' : '') + pubDate;

        if (post.featuredImage) {
          var img = document.getElementById('articleImage');
          img.src = post.featuredImage;
          img.alt = post.title;
          document.getElementById('articleImageWrapper').style.display = 'block';
        }
      } else {
        document.getElementById('articleTitle').innerText = 'Article Not Found (404)';
      }
    } catch (e) {
      console.error('Error loading article:', e);
    }
  }
});
```

---

## 7. Apache Clean URL Rewrite (`.htaccess`)

```apache
RewriteEngine On
RewriteBase /

# 1. Clean Detail Route: /blog/slug -> blog-detail.html?slug=slug
RewriteRule ^blog/([a-zA-Z0-9\-_]+)/?$ blog-detail.html?slug=$1 [L,QSA]

# 2. Clean Archive Route: /blog -> blog.html
RewriteRule ^blog/?$ blog.html [L,QSA]
```
