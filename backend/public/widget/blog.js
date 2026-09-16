/**
 * Jupsoft Centralized CMS — Universal Blog Embed Widget
 * Embed a full-featured, responsive, multi-language blog onto ANY website with 1 line of HTML:
 * 
 * <div id="jupsoft-blog-feed" data-site="YOUR_WEBSITE_ID" data-api="http://localhost:4000"></div>
 * <script src="http://localhost:4000/widget/blog.js" async></script>
 */

(function () {
  'use strict';

  const containers = document.querySelectorAll('#jupsoft-blog-feed, [data-jupsoft-blog]');
  if (!containers.length) return;

  const LANG_NAMES = {
    en: 'English',
    hi: 'हिन्दी',
    fr: 'Français',
    ar: 'العربية',
  };

  function detectBrowserLang() {
    const navLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    if (navLang.startsWith('hi')) return 'hi';
    if (navLang.startsWith('fr')) return 'fr';
    if (navLang.startsWith('ar')) return 'ar';
    return 'en';
  }

  function injectStyles() {
    if (document.getElementById('jupsoft-blog-widget-styles')) return;
    const style = document.createElement('style');
    style.id = 'jupsoft-blog-widget-styles';
    style.textContent = `
      .jupsoft-widget {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #f1f5f9;
        box-sizing: border-box;
        margin: 1.5rem 0;
      }
      .jupsoft-widget *, .jupsoft-widget *::before, .jupsoft-widget *::after {
        box-sizing: border-box;
      }
      .jupsoft-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
        gap: 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 1rem;
      }
      .jupsoft-title-group h2 {
        font-size: 1.6rem;
        font-weight: 800;
        margin: 0 0 0.25rem 0;
        color: #ffffff;
      }
      .jupsoft-title-group p {
        margin: 0;
        font-size: 0.875rem;
        color: #94a3b8;
      }
      .jupsoft-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .jupsoft-search {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #ffffff;
        border-radius: 0.5rem;
        padding: 0.4rem 0.75rem;
        font-size: 0.8rem;
        outline: none;
        transition: border-color 0.2s;
      }
      .jupsoft-search:focus {
        border-color: #38bdf8;
      }
      .jupsoft-lang-menu {
        position: relative;
        display: inline-block;
      }
      .jupsoft-lang-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.4rem 0.75rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 0.5rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: #ffffff;
        cursor: pointer;
      }
      .jupsoft-lang-dropdown {
        display: none;
        position: absolute;
        right: 0;
        top: 100%;
        margin-top: 0.4rem;
        background: #1e293b;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 0.5rem;
        padding: 0.25rem;
        min-width: 120px;
        z-index: 99999;
      }
      .jupsoft-lang-dropdown.show { display: block; }
      .jupsoft-lang-opt {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 0.4rem 0.6rem;
        background: none;
        border: none;
        color: #cbd5e1;
        font-size: 0.75rem;
        cursor: pointer;
        border-radius: 0.25rem;
      }
      .jupsoft-lang-opt:hover, .jupsoft-lang-opt.active {
        background: rgba(56, 189, 248, 0.2);
        color: #38bdf8;
      }
      .jupsoft-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
      }
      .jupsoft-card {
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 0.75rem;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        text-decoration: none;
        color: inherit;
        transition: transform 0.2s ease, border-color 0.2s ease;
        cursor: pointer;
      }
      .jupsoft-card:hover {
        transform: translateY(-3px);
        border-color: #38bdf8;
      }
      .jupsoft-card-img-wrap {
        height: 180px;
        background: #0f172a;
        overflow: hidden;
      }
      .jupsoft-card-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .jupsoft-card-body {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      .jupsoft-card-title {
        font-size: 1.1rem;
        font-weight: 700;
        margin: 0 0 0.5rem 0;
        line-height: 1.4;
      }
      .jupsoft-card-excerpt {
        font-size: 0.85rem;
        color: #94a3b8;
        line-height: 1.5;
        margin-bottom: 1rem;
        flex: 1;
      }
      .jupsoft-card-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: #64748b;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding-top: 0.75rem;
      }
      .jupsoft-article-view {
        background: rgba(30, 41, 59, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 1rem;
        padding: 2rem;
      }
      .jupsoft-back-btn {
        background: none;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #38bdf8;
        padding: 0.4rem 0.8rem;
        border-radius: 0.4rem;
        cursor: pointer;
        font-size: 0.8rem;
        margin-bottom: 1.5rem;
      }
      .jupsoft-back-btn:hover {
        background: rgba(56, 189, 248, 0.1);
      }
      .jupsoft-article-title {
        font-size: 2rem;
        font-weight: 800;
        margin-bottom: 1rem;
        line-height: 1.3;
      }
      .jupsoft-article-img {
        width: 100%;
        max-height: 400px;
        object-fit: cover;
        border-radius: 0.75rem;
        margin-bottom: 1.5rem;
      }
      .jupsoft-article-content {
        line-height: 1.8;
        color: #cbd5e1;
        font-size: 1rem;
      }
      .jupsoft-spinner {
        display: inline-block;
        width: 28px;
        height: 28px;
        border: 3px solid rgba(255,255,255,0.1);
        border-radius: 50%;
        border-top-color: #38bdf8;
        animation: jupsoft-spin 0.8s linear infinite;
        margin-bottom: 0.75rem;
      }
      @keyframes jupsoft-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }

  function initContainer(container) {
    const siteId = container.getAttribute('data-site') || 'site-gaming';
    const apiUrl = (container.getAttribute('data-api') || 'http://localhost:4000').replace(/\/$/, '');
    const limit = parseInt(container.getAttribute('data-limit') || '9', 10);
    const detailUrlPattern = container.getAttribute('data-detail-url'); // if null, uses in-place reader!

    let currentLang = container.getAttribute('data-lang') || 'auto';
    if (currentLang === 'auto') currentLang = detectBrowserLang();

    let loadedBlogs = [];
    let searchQuery = '';

    container.classList.add('jupsoft-widget');

    function renderLoading() {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #94a3b8;">
          <div class="jupsoft-spinner"></div>
          <div>Loading articles from Jupsoft Centralized CMS...</div>
        </div>
      `;
    }

    async function loadBlogs() {
      renderLoading();
      try {
        const url = `${apiUrl}/v1/blogs?website=${encodeURIComponent(siteId)}&lang=${encodeURIComponent(currentLang)}&limit=${limit}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        loadedBlogs = json.data || [];
        renderList();
      } catch (err) {
        container.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 0.5rem;">
            <p><strong>Failed to load articles from CMS</strong></p>
            <p style="font-size: 0.75rem; color: #94a3b8;">Endpoint: ${apiUrl} (${err.message})</p>
          </div>
        `;
      }
    }

    async function viewArticle(slug) {
      renderLoading();
      try {
        const url = `${apiUrl}/v1/blogs/${encodeURIComponent(slug)}?website=${encodeURIComponent(siteId)}&lang=${encodeURIComponent(currentLang)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const post = json.data;

        container.innerHTML = `
          <div class="jupsoft-article-view">
            <button class="jupsoft-back-btn" id="jupsoftBackBtn">← Back to Articles</button>
            <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.5rem;">
              ${post.readTimeMinutes || 4} min read · ${post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Recent'}
            </div>
            <h1 class="jupsoft-article-title">${post.title}</h1>
            <div style="font-size: 0.8rem; color: #38bdf8; margin-bottom: 1.5rem;">
              By ${post.authorName || 'Staff Writer'}
            </div>
            ${post.featuredImage ? `<img class="jupsoft-article-img" src="${post.featuredImage}" alt="${post.title}" />` : ''}
            <div class="jupsoft-article-content">
              ${post.content}
            </div>
          </div>
        `;

        document.getElementById('jupsoftBackBtn')?.addEventListener('click', () => {
          renderList();
        });
      } catch (err) {
        container.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: #ef4444;">
            <p>Error loading article: ${err.message}</p>
            <button class="jupsoft-back-btn" onclick="location.reload()">Reload</button>
          </div>
        `;
      }
    }

    function renderList() {
      const filtered = loadedBlogs.filter(b => {
        return !searchQuery || b.title.toLowerCase().includes(searchQuery) || (b.excerpt && b.excerpt.toLowerCase().includes(searchQuery));
      });

      const cardsHtml = filtered.map(blog => `
        <div class="jupsoft-card" data-slug="${blog.slug}">
          <div class="jupsoft-card-img-wrap">
            <img class="jupsoft-card-img" src="${blog.featuredImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80'}" alt="${blog.title}" loading="lazy" />
          </div>
          <div class="jupsoft-card-body">
            <h3 class="jupsoft-card-title">${blog.title}</h3>
            <p class="jupsoft-card-excerpt">${blog.excerpt || ''}</p>
            <div class="jupsoft-card-meta">
              <span>${blog.authorName || 'Staff Writer'}</span>
              <span>${blog.readTimeMinutes || 3} min read</span>
            </div>
          </div>
        </div>
      `).join('');

      container.innerHTML = `
        <div class="jupsoft-header">
          <div class="jupsoft-title-group">
            <h2>Blog & Articles</h2>
            <p>Direct feed powered by Jupsoft Centralized CMS</p>
          </div>
          <div class="jupsoft-controls">
            <input type="text" class="jupsoft-search" placeholder="Search..." value="${searchQuery}" id="jupsoftSearchInput" />
            <div class="jupsoft-lang-menu">
              <button class="jupsoft-lang-btn" type="button" id="jupsoftLangBtn">
                <span>🌐</span>
                <span style="text-transform: uppercase;">${currentLang}</span>
                <span>▾</span>
              </button>
              <div class="jupsoft-lang-dropdown" id="jupsoftLangDropdown">
                ${['en', 'hi', 'fr', 'ar'].map(l => `
                  <button class="jupsoft-lang-opt ${l === currentLang ? 'active' : ''}" type="button" data-lang="${l}">
                    <span>${LANG_NAMES[l]}</span>
                    <span>${l.toUpperCase()}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
        <div class="jupsoft-grid">
          ${cardsHtml || '<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 2rem;">No matching articles found.</div>'}
        </div>
      `;

      // Wire search input
      const searchInput = container.querySelector('#jupsoftSearchInput');
      searchInput?.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderList();
      });

      // Wire dropdown
      const langBtn = container.querySelector('#jupsoftLangBtn');
      const langDropdown = container.querySelector('#jupsoftLangDropdown');
      langBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        langDropdown?.classList.toggle('show');
      });
      document.addEventListener('click', () => langDropdown?.classList.remove('show'));

      container.querySelectorAll('.jupsoft-lang-opt').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const l = btn.getAttribute('data-lang');
          if (l && l !== currentLang) {
            currentLang = l;
            loadBlogs();
          }
        });
      });

      // Wire card clicks
      container.querySelectorAll('.jupsoft-card').forEach(card => {
        card.addEventListener('click', () => {
          const slug = card.getAttribute('data-slug');
          if (detailUrlPattern) {
            window.location.href = detailUrlPattern.replace('{slug}', slug);
          } else {
            viewArticle(slug);
          }
        });
      });
    }

    loadBlogs();
  }

  injectStyles();
  containers.forEach(initContainer);
})();
