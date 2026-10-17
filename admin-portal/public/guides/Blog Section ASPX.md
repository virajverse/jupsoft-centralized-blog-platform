# Jupsoft Centralized Blog Platform — ASP.NET Web Forms (.aspx) Integration Guide

> **Architecture Overview**: This guide provides complete end-to-end instructions to integrate Jupsoft CMS blog articles into an ASP.NET (.NET Framework / .NET Core Web Forms) website.
> It includes listing cards, single article view, automatic SEO meta injection, and IIS URL rewriting.

---

## 1. Quick Credentials Reference

| Variable | Recommended Placement | Purpose |
| :--- | :--- | :--- |
| `WEBSITE_ID` | Client script (`window.JUPSOFT_CONFIG`) | Public identifier for your website tenant |
| `API_KEY` | Local development testing only | Testing before production domain whitelist |
| `API_BASE_URL` | Handled automatically by `cms-client.js` | Gateway URL: `https://blogary.jupsoft.com/v1` |
| `PRODUCTION_DOMAIN` | Registered domain (e.g., `yourschool.com`) | Whitelisted origin (zero secret key needed) |

---

## 2. Common Master Page Integration (`Site.Master`)

Add the following snippet right before the closing `</body>` tag in your master page (`Site.Master` or common footer template):

```html
<!-- ======================================================== -->
<!-- Jupsoft CMS Headless Client SDK Engine                  -->
<!-- ======================================================== -->
<!-- For Localhost Testing (remove apiKey on production domain): -->
<script>
  window.JUPSOFT_CONFIG = {
    websiteId: 'YOUR_WEBSITE_ID',
    // apiKey: 'YOUR_API_KEY' // Only needed for localhost testing
  };
</script>
<script src="/js/cms-client.js"></script>
```

> **Security Note**: On your live production website (e.g. `yourschool.com`), `window.JUPSOFT_CONFIG.apiKey` is **not required**. The API gateway automatically validates requests originating from your whitelisted domain with zero secret key exposure.

---

## 3. Blog Listing Page (`Blog.aspx`)

Inside your `<asp:Content ID="BodyContent" ContentPlaceHolderID="MainContent" runat="server">` or standard `<body>`:

```html
<section class="container" style="padding: 3rem 1rem;">
  <h2 style="font-size: 2rem; font-weight: 700; margin-bottom: 1.5rem;">Latest News & Articles</h2>
  
  <!-- Container where dynamic blog cards will be injected -->
  <div id="blogGrid" class="row" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
    <!-- Loading skeleton -->
    <p id="blogLoadingMessage" style="color: #64748b;">Loading articles from CMS...</p>
  </div>
</section>

<script>
document.addEventListener('DOMContentLoaded', async function () {
  if (typeof JupsoftCMS === 'undefined') {
    console.error('JupsoftCMS SDK not loaded. Verify /js/cms-client.js path.');
    return;
  }

  try {
    var res = await JupsoftCMS.getBlogs({ limit: 12 });
    var grid = document.getElementById('blogGrid');
    var loader = document.getElementById('blogLoadingMessage');
    if (loader) loader.remove();

    if (res && res.success && res.data && res.data.length > 0) {
      grid.innerHTML = '';
      res.data.forEach(function (blog) {
        var card = document.createElement('div');
        card.className = 'blog-card';
        card.style.cssText = 'border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column;';

        var imgUrl = blog.featuredImage || '/images/default-blog.jpg';
        var detailUrl = 'BlogDetail.aspx?slug=' + encodeURIComponent(blog.slug);
        var pubDate = blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        var category = blog.primaryCategory || 'Article';

        card.innerHTML = `
          <div style="height: 200px; overflow: hidden; background: #f1f5f9;">
            <a href="${detailUrl}">
              <img src="${imgUrl}" alt="${blog.title}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s;" loading="lazy" />
            </a>
          </div>
          <div style="padding: 1.25rem; display: flex; flex-direction: column; flex-grow: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <span style="font-size: 0.75rem; font-weight: 700; color: #4f46e5; text-transform: uppercase;">${category}</span>
              <span style="font-size: 0.75rem; color: #94a3b8;">${pubDate}</span>
            </div>
            <h3 style="font-size: 1.125rem; font-weight: 700; line-height: 1.4; margin-bottom: 0.5rem;">
              <a href="${detailUrl}" style="color: #0f172a; text-decoration: none;">${blog.title}</a>
            </h3>
            <p style="font-size: 0.875rem; color: #64748b; line-height: 1.5; flex-grow: 1; margin-bottom: 1rem;">
              ${blog.excerpt || ''}
            </p>
            <a href="${detailUrl}" style="color: #4f46e5; font-size: 0.875rem; font-weight: 600; text-decoration: none;">
              Read Full Article &rarr;
            </a>
          </div>
        `;
        grid.appendChild(card);
      });
    } else {
      grid.innerHTML = '<p style="color: #94a3b8; text-align: center; grid-column: 1 / -1;">No articles published yet.</p>';
    }
  } catch (err) {
    console.error('Failed to load blogs:', err);
  }
});
</script>
```

---

## 4. Blog Detail Page (`BlogDetail.aspx`)

```html
<article class="container" style="max-width: 860px; margin: 3rem auto; padding: 0 1rem;">
  <!-- Article Header -->
  <header style="margin-bottom: 2rem;">
    <span id="articleCategory" style="font-size: 0.875rem; font-weight: 700; color: #4f46e5; text-transform: uppercase;"></span>
    <h1 id="articleTitle" style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 0.5rem 0 1rem; line-height: 1.3;">Loading article...</h1>
    <div id="articleMeta" style="font-size: 0.875rem; color: #64748b; display: flex; gap: 1rem;"></div>
  </header>

  <!-- Featured Image -->
  <div id="articleImageWrapper" style="margin-bottom: 2rem; border-radius: 16px; overflow: hidden; display: none;">
    <img id="articleImage" src="" alt="" style="width: 100%; max-height: 480px; object-fit: cover;" />
  </div>

  <!-- Sanitized Article Content Body -->
  <div id="articleBody" class="blog-article-content" style="font-size: 1.125rem; line-height: 1.8; color: #334155;"></div>

  <hr style="margin: 3rem 0; border: 0; border-top: 1px solid #e2e8f0;" />
  <a href="Blog.aspx" style="color: #4f46e5; font-weight: 600; text-decoration: none;">&larr; Back to all articles</a>
</article>

<script>
document.addEventListener('DOMContentLoaded', async function () {
  if (typeof JupsoftCMS === 'undefined') return;

  var urlParams = new URLSearchParams(window.location.search);
  var slug = urlParams.get('slug');

  if (!slug) {
    document.getElementById('articleTitle').innerText = 'Article Not Found (Missing identifier)';
    return;
  }

  try {
    var res = await JupsoftCMS.getBlogBySlug(slug);
    if (res && res.success && res.data) {
      var article = res.data;

      // 1. Auto-inject SEO tags (title, meta description, canonical, schema.org)
      JupsoftCMS.applySeo(article);

      // 2. Populate article elements
      document.getElementById('articleTitle').innerText = article.title;
      document.getElementById('articleBody').innerHTML = article.content;

      if (article.primaryCategory) {
        document.getElementById('articleCategory').innerText = article.primaryCategory;
      }

      var pubDate = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      var author = article.authorName || 'Editorial Team';
      var readTime = article.readTimeMinutes ? article.readTimeMinutes + ' min read' : '';
      document.getElementById('articleMeta').innerHTML = '<span>By ' + author + '</span> • <span>' + pubDate + '</span>' + (readTime ? ' • <span>' + readTime + '</span>' : '');

      if (article.featuredImage) {
        var imgWrapper = document.getElementById('articleImageWrapper');
        var img = document.getElementById('articleImage');
        img.src = article.featuredImage;
        img.alt = article.title;
        imgWrapper.style.display = 'block';
      }
    } else {
      document.getElementById('articleTitle').innerText = 'Article Not Found (404)';
    }
  } catch (err) {
    console.error('Failed to load article:', err);
    document.getElementById('articleTitle').innerText = 'Failed to load article.';
  }
});
</script>
```

---

## 5. IIS Clean URL Rewrites (`web.config`)

To route clean URLs like `/blog/my-first-post` directly to `BlogDetail.aspx?slug=my-first-post` without showing `.aspx` in the address bar:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Clean Blog Detail URL" stopProcessing="true">
          <match url="^blog/([a-zA-Z0-9\-_]+)/?$" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="BlogDetail.aspx?slug={R:1}" appendQueryString="true" />
        </rule>
        <rule name="Clean Blog Archive URL" stopProcessing="true">
          <match url="^blog/?$" />
          <action type="Rewrite" url="Blog.aspx" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

---

## 6. API Data Keys Cheat Sheet

| Key | Type | Description |
| :--- | :--- | :--- |
| `blog.title` | `string` | Main article heading |
| `blog.slug` | `string` | Unique URL-safe identifier |
| `blog.featuredImage` | `string` | Cover image URL (hosted on CDN/Supabase) |
| `blog.excerpt` | `string` | Short summary (1-2 sentences) |
| `blog.content` | `string` | Full sanitized HTML article body |
| `blog.publishedAt` | `ISO string` | Publication timestamp |
| `blog.authorName` | `string` | Author display name |
| `blog.primaryCategory` | `string` | Primary category badge |
| `blog.readTimeMinutes` | `number` | Calculated reading duration |
| `blog.seo` | `object` | Canonical URL, metaTitle, metaDescription |
| `blog.schemaJsonLd` | `object` | Schema.org `BlogPosting` structured data |
