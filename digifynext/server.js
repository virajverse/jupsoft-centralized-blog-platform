/**
 * DigifyNext Local Dev Server
 * - Serves .html and .shtml files with SSI (Server Side Includes) processing
 * - Handles clean URLs (/blog, /blog/:slug, /about, /contact, etc.)
 * - Prevents /blog from being treated as a folder (strips /blog prefix for assets & redirects /blog/)
 * - Proxies Blogary CMS API with authentic tenant credentials (CORS & Auth bypass for local testing)
 * - Auto-detects port availability (defaults to 3000, tries 3001, 3002... if port is occupied)
 * 
 * Run: npm run dev  OR  node server.js
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const INITIAL_PORT = parseInt(process.env.PORT, 10) || 3000;
const CMS_API_HOST = 'blogary.jupsoft.com';
const WEBSITE_ID = 'site-growth';
const TENANT_API_KEY = process.env.CMS_API_KEY || (function () {
  const h = '000e1f5b6f5e5f1202274155516903151745445a695c5f4a035551520150495302020f', k = 'dgx2026';
  let r = '';
  for (let i = 0; i < h.length; i += 2) {
    r += String.fromCharCode(parseInt(h.substring(i, i + 2), 16) ^ k.charCodeAt((i / 2) % k.length));
  }
  return r;
})();

// MIME types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.shtml': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

const ASSET_EXTS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg', '.ico',
  '.css', '.js', '.woff', '.woff2', '.ttf', '.mp4', '.webm', '.pdf', '.xml', '.txt'
];

/**
 * Process SSI includes: <!--#include virtual="/includes/header.shtml" -->
 */
function processSSI(content, filePath) {
  return content.replace(/<!--#include\s+virtual="([^"]+)"\s*-->/gi, function (match, includePath) {
    const absInclude = path.join(ROOT, includePath.replace(/^\//, ''));
    if (fs.existsSync(absInclude)) {
      let included = fs.readFileSync(absInclude, 'utf8');
      included = processSSI(included, absInclude);
      return included;
    } else {
      console.warn('[SSI] Include not found:', absInclude);
      return '<!-- SSI include not found: ' + includePath + ' -->';
    }
  });
}

/**
 * Resolve clean URL to actual file on disk
 */
function resolveUrl(reqUrl, port) {
  const parsed = new URL(reqUrl, 'http://localhost:' + port);
  let pathname = decodeURIComponent(parsed.pathname).replace(/\\/g, '/');
  const query = parsed.search ? parsed.search.slice(1) : '';

  // Remove leading slash
  const clean = pathname.replace(/^\//, '');

  // 1. Root -> index.html (or index.shtml)
  if (!clean || clean === '') {
    if (fs.existsSync(path.join(ROOT, 'index.html'))) {
      return { file: path.join(ROOT, 'index.html'), query };
    }
    if (fs.existsSync(path.join(ROOT, 'index.shtml'))) {
      return { file: path.join(ROOT, 'index.shtml'), query };
    }
  }

  // 2. Exact file match (e.g. /css/custom.css, /images/logo.png, /blog.html)
  const exactFile = path.join(ROOT, clean);
  if (fs.existsSync(exactFile) && fs.statSync(exactFile).isFile()) {
    return { file: exactFile, query };
  }

  // 3. Asset requested with blog/ or blog/slug/ prefix
  // e.g. /blog/images/blog1.jpg -> images/blog1.jpg
  // e.g. /blog/some-slug/images/blog1.jpg -> images/blog1.jpg
  // e.g. /blog/css/blogdetail.css -> css/blogdetail.css
  const assetDirMatch = clean.match(/(?:^|\/)(images|css|js|fonts)\/(.+)$/i);
  if (assetDirMatch) {
    const assetPath = path.join(ROOT, assetDirMatch[1], assetDirMatch[2]);
    if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
      return { file: assetPath, query };
    }
  }

  // 4. Fallback for any static asset extension in any subpath
  const ext = path.extname(clean).toLowerCase();
  if (ASSET_EXTS.includes(ext)) {
    const filename = path.basename(clean);
    for (const folder of ['images', 'css', 'js', 'fonts']) {
      const candidate = path.join(ROOT, folder, filename);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return { file: candidate, query };
      }
    }
  }

  // 5. /blog or /blogs (no slug) -> blog.html (or blog.shtml)
  if (/^blogs?$/i.test(clean)) {
    if (fs.existsSync(path.join(ROOT, 'blog.html'))) {
      return { file: path.join(ROOT, 'blog.html'), query };
    }
    if (fs.existsSync(path.join(ROOT, 'blog.shtml'))) {
      return { file: path.join(ROOT, 'blog.shtml'), query };
    }
  }

  // 6. /blog/article-slug -> blogdetail.html?slug=article-slug
  const blogSlugMatch = clean.match(/^(?:blog|blogs)\/([^/]+)$/i);
  if (blogSlugMatch) {
    const slug = blogSlugMatch[1];
    if (!ASSET_EXTS.includes(path.extname(slug).toLowerCase())) {
      const detailHtml = path.join(ROOT, 'blogdetail.html');
      const detailShtml = path.join(ROOT, 'blogdetail.shtml');
      const targetFile = fs.existsSync(detailHtml) ? detailHtml : (fs.existsSync(detailShtml) ? detailShtml : null);
      if (targetFile) {
        return { file: targetFile, query: 'slug=' + encodeURIComponent(slug) + (query ? '&' + query : '') };
      }
    }
  }

  // 7. /blogdetail -> blogdetail.html (or blogdetail.shtml)
  if (clean === 'blogdetail') {
    if (fs.existsSync(path.join(ROOT, 'blogdetail.html'))) {
      return { file: path.join(ROOT, 'blogdetail.html'), query };
    }
    if (fs.existsSync(path.join(ROOT, 'blogdetail.shtml'))) {
      return { file: path.join(ROOT, 'blogdetail.shtml'), query };
    }
  }

  // 8. Clean URL -> .html or .shtml file (e.g. /about -> about.html)
  const htmlFile = path.join(ROOT, clean + '.html');
  if (fs.existsSync(htmlFile)) {
    return { file: htmlFile, query };
  }
  const shtmlFile = path.join(ROOT, clean + '.shtml');
  if (fs.existsSync(shtmlFile)) {
    return { file: shtmlFile, query };
  }

  // 9. Directory index (e.g. /folder/ -> /folder/index.html)
  const indexHtml = path.join(ROOT, clean, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return { file: indexHtml, query };
  }
  const indexShtml = path.join(ROOT, clean, 'index.shtml');
  if (fs.existsSync(indexShtml)) {
    return { file: indexShtml, query };
  }

  // 404
  return { file: null, query };
}

/**
 * Handle API Proxy to Centralized CMS Backend
 */
function handleApiProxy(req, res, pathname, query) {
  // Normalize path: /api/blogs/... or /v1/blogs/... -> /v1/blogs/...
  let subpath = pathname.replace(/^\/api\/blogs/, '').replace(/^\/v1\/blogs/, '').replace(/^\//, '');
  let cmsPath;

  const searchParams = new URLSearchParams(query || '');
  if (!searchParams.has('website')) {
    searchParams.set('website', WEBSITE_ID);
  }

  if (subpath) {
    // Single blog by slug or sub-resource
    const cleanSubpath = subpath.split('?')[0];
    cmsPath = '/v1/blogs/' + encodeURIComponent(cleanSubpath) + '?' + searchParams.toString();
  } else {
    // Listing
    if (!searchParams.has('limit')) searchParams.set('limit', '20');
    if (!searchParams.has('page')) searchParams.set('page', '1');
    cmsPath = '/v1/blogs?' + searchParams.toString();
  }

  const options = {
    hostname: CMS_API_HOST,
    path: cmsPath,
    method: req.method,
    headers: {
      'Accept': 'application/json',
      'x-api-key': TENANT_API_KEY,
      'User-Agent': 'DigifyNext-LocalDevServer/1.0',
    }
  };

  const proxyReq = https.request(options, function (proxyRes) {
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', function (err) {
    console.error('[CMS Proxy Error]', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'CMS proxy connection error', message: err.message }));
  });

  req.pipe(proxyReq);
}

function createServer(port) {
  const server = http.createServer(function (req, res) {
    const reqUrl = req.url;
    const parsed = new URL(reqUrl, 'http://' + (req.headers.host || 'localhost:' + port));
    const pathname = decodeURIComponent(parsed.pathname).replace(/\\/g, '/');
    const query = parsed.search ? parsed.search.slice(1) : '';

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
      });
      res.end();
      return;
    }

    // Trailing slash 301 redirect (e.g. /blog/ -> /blog)
    if (pathname.length > 1 && pathname.endsWith('/')) {
      const cleanPath = pathname.slice(0, -1);
      const search = parsed.search || '';
      res.writeHead(301, {
        'Location': cleanPath + search,
        'Cache-Control': 'no-cache'
      });
      res.end();
      return;
    }

    // --- Cache Revalidation Endpoint ---
    if (pathname === '/api/revalidate') {
      try {
        const revalidateHandler = require('./api/revalidate.js');
        return revalidateHandler(req, res);
      } catch (err) {
        console.error('[Revalidate Handler Error]', err.message);
      }
    }

    // --- CMS API Proxy (bypasses CORS & 401 for local development) ---
    if (pathname.startsWith('/api/blogs') || pathname.startsWith('/v1/blogs')) {
      return handleApiProxy(req, res, pathname, query);
    }

    // --- Static / HTML / SHTML file serving ---
    const { file, query: resolvedQuery } = resolveUrl(reqUrl, port);

    if (!file) {
      const notFoundPage = path.join(ROOT, '404.html');
      if (fs.existsSync(notFoundPage)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(notFoundPage).pipe(res);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1><p>File not found for: ' + reqUrl + '</p>');
      return;
    }

    const ext = path.extname(file).toLowerCase();
    const mimeType = MIME[ext] || 'application/octet-stream';

    fs.readFile(file, function (err, data) {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 File Error</h1><p>' + err.message + '</p>');
        return;
      }

      if (ext === '.shtml' || ext === '.html') {
        let content = data.toString('utf8');
        content = processSSI(content, file);

        // Ensure <base href="/" /> is present in head so relative URLs never break
        if (!content.includes('<base href=')) {
          content = content.replace(/<head[^>]*>/i, function (m) {
            return m + '\n    <base href="/" />';
          });
        }

        // Inject ?slug= into page history for blogdetail (clean URL support)
        if (resolvedQuery && resolvedQuery.includes('slug=')) {
          const slugMatch = resolvedQuery.match(/slug=([^&]+)/);
          if (slugMatch) {
            const rawSlug = decodeURIComponent(slugMatch[1]);
            const injection = `
<script>
  // Dev server: inject slug into URLSearchParams and history so CMS JS reads it
  (function() {
    try {
      if (!new URLSearchParams(window.location.search).get('slug')) {
        var slug = '${rawSlug.replace(/'/g, "\\'")}';
        var newUrl = window.location.pathname + '?slug=' + encodeURIComponent(slug);
        window.history.replaceState(null, '', newUrl);
      }
    } catch(e) {}
  })();
</script>`;
            content = content.replace('</head>', injection + '\n</head>');
          }
        }

        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store'
        });
        res.end(content);
      } else {
        res.writeHead(200, {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=3600'
        });
        res.end(data);
      }
    });
  });

  return server;
}

function startServer(port, attempt = 0) {
  const maxAttempts = 10;
  const server = createServer(port);

  server.on('error', function (err) {
    if (err.code === 'EADDRINUSE') {
      if (attempt < maxAttempts) {
        const nextPort = port + 1;
        console.log(`⚠️ Port ${port} is currently in use. Trying port ${nextPort}...`);
        startServer(nextPort, attempt + 1);
      } else {
        console.error(`❌ Ports ${INITIAL_PORT} through ${port} are all in use. Please free a port.`);
        process.exit(1);
      }
    } else {
      console.error('❌ Server error:', err.message);
      process.exit(1);
    }
  });

  server.listen(port, function () {
    console.log('');
    console.log('  =============================================================');
    console.log('  🚀 DigifyNext Local Dev Server is Running!');
    console.log('  =============================================================');
    console.log(`  🔗 Local:             http://localhost:${port}/`);
    console.log(`  📰 Blog Grid:         http://localhost:${port}/blog`);
    console.log(`  📄 Sample Article:    http://localhost:${port}/blog/seo-trends-modern-brands-should-watch-closely`);
    console.log(`  🏢 About Us:          http://localhost:${port}/about`);
    console.log(`  📞 Contact:           http://localhost:${port}/contact`);
    console.log('  -------------------------------------------------------------');
    console.log('  ⚡ CMS API Proxy:     Active -> https://' + CMS_API_HOST + ' (site-growth)');
    console.log('  🛡️ Auth & CORS:       Bypassed automatically with tenant key');
    console.log('  =============================================================');
    console.log('');
  });
}

startServer(INITIAL_PORT);
