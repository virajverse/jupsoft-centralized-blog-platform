#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('\x1b[36m%s\x1b[0m', '=============================================================');
console.log('\x1b[36m%s\x1b[0m', '🚀 [Jupsoft Centralized CMS] 1-Click Universal Blog Scaffolder');
console.log('\x1b[36m%s\x1b[0m', '=============================================================');

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
\x1b[36m🚀 Jupsoft Centralized CMS - Multi-Framework 1-Click Blog Engine\x1b[0m

\x1b[33mUsage:\x1b[0m
  npx @jupsoft/next-blog [options]

\x1b[33mOptions:\x1b[0m
  --site=<siteId>     Your Website/Tenant ID (e.g. site-gaming, site-portal)
  --key=<apiKey>      Your Tenant Private API Key
  --url=<apiUrl>      CMS API Base URL (default: http://localhost:4000)
  --secret=<secret>   Webhook signature verification secret
  --netlify           Auto-generate Netlify configuration (netlify.toml & _redirects)
  -h, --help          Show this manual

\x1b[33mSupported Stacks (Auto-Detected):\x1b[0m
  • Next.js 14/15/16 (App Router & Pages Router)
  • Express.js / Node.js
  • Static HTML / Vite / Webpack / Astro
`);
  process.exit(0);
}

const params = {};
args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [k, v] = arg.slice(2).split('=');
    params[k] = v === undefined ? true : v;
  }
});

const cwd = process.cwd();
const apiKey = params.key || process.env.CMS_TENANT_API_KEY || '';
const websiteId = params.site || process.env.CMS_WEBSITE_ID || '';
const apiUrl = (params.url || process.env.NEXT_PUBLIC_CMS_API_URL || 'http://localhost:4000').replace(/\/$/, '');
const webhookSec = params.secret || process.env.CMS_WEBHOOK_SECRET || '';

// Detect project type
let isNextJs = false;
let isExpress = false;
let hasPagesDir = fs.existsSync(path.join(cwd, 'pages')) && fs.statSync(path.join(cwd, 'pages')).isDirectory();

const pkgPath = path.join(cwd, 'package.json');
if (fs.existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (deps['next'] || fs.existsSync(path.join(cwd, 'next.config.js')) || fs.existsSync(path.join(cwd, 'next.config.ts')) || fs.existsSync(path.join(cwd, 'next.config.mjs'))) {
      isNextJs = true;
    }
    if (deps['express'] || fs.existsSync(path.join(cwd, 'server.js'))) {
      isExpress = true;
    }
  } catch (e) {}
}

console.log(`🔍 Detected Project Type: \x1b[32m${isNextJs ? 'Next.js App' : (isExpress ? 'Express / Node.js' : 'Static HTML Website')}\x1b[0m`);

// ─────────────────────────────────────────────────────────────────────────────
// STACK A: NEXT.JS APP ROUTER
// ─────────────────────────────────────────────────────────────────────────────
if (isNextJs) {
  console.log('⚡ Scaffolding Next.js 14/15/16 blog routes...');
  
  const dirsToCreate = [
    path.join(cwd, 'app', 'blog'),
    path.join(cwd, 'app', 'blog', '[slug]'),
    path.join(cwd, 'app', 'api', 'revalidate')
  ];

  dirsToCreate.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const blogListPath = path.join(cwd, 'app', 'blog', 'page.tsx');
  if (!fs.existsSync(blogListPath)) {
    fs.writeFileSync(blogListPath, `import { JupsoftBlogList } from '@jupsoft/next-blog';\n\nexport const revalidate = 3600;\nexport const metadata = {\n  title: 'Blog & Articles | Insights',\n  description: 'Explore the latest articles, technology guides, and updates.',\n};\n\nexport default JupsoftBlogList;\n`, 'utf8');
    console.log('\x1b[32m%s\x1b[0m', '  ✅ Created app/blog/page.tsx');
  }

  const blogDetailPath = path.join(cwd, 'app', 'blog', '[slug]', 'page.tsx');
  if (!fs.existsSync(blogDetailPath)) {
    fs.writeFileSync(blogDetailPath, `import { JupsoftBlogDetail, generateBlogMeta } from '@jupsoft/next-blog';\n\nexport const revalidate = 3600;\nexport const generateMetadata = generateBlogMeta;\n\nexport default JupsoftBlogDetail;\n`, 'utf8');
    console.log('\x1b[32m%s\x1b[0m', '  ✅ Created app/blog/[slug]/page.tsx');
  }

  const webhookPath = path.join(cwd, 'app', 'api', 'revalidate', 'route.ts');
  if (!fs.existsSync(webhookPath)) {
    fs.writeFileSync(webhookPath, `export { POST } from '@jupsoft/next-blog/webhook';\n`, 'utf8');
    console.log('\x1b[32m%s\x1b[0m', '  ✅ Created app/api/revalidate/route.ts');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STACK B: STATIC HTML / EXPRESS / ANY OTHER STACK
// ─────────────────────────────────────────────────────────────────────────────
if (!isNextJs) {
  console.log('⚡ Scaffolding Universal Blog pages...');

  const targetBlogDir = hasPagesDir ? path.join(cwd, 'pages') : cwd;
  const blogHtmlPath = path.join(targetBlogDir, 'blog.html');

  if (!fs.existsSync(blogHtmlPath)) {
    const universalBlogContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Blog & Transmissions — Jupsoft CMS</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <div id="jupsoft-blog-feed" data-site="${websiteId || 'site-gaming'}" data-api="${apiUrl}" data-theme="dark"></div>
  </div>
  <script src="${apiUrl}/widget/blog.js" async></script>
</body>
</html>`;
    fs.writeFileSync(blogHtmlPath, universalBlogContent, 'utf8');
    console.log('\x1b[32m%s\x1b[0m', `  ✅ Created ${path.relative(cwd, blogHtmlPath)} with Universal Blog Widget`);
  }

  // If Express server.js exists, wire routes if not already wired
  const serverPath = path.join(cwd, 'server.js');
  if (fs.existsSync(serverPath)) {
    let serverCode = fs.readFileSync(serverPath, 'utf8');
    if (!serverCode.includes('/blog')) {
      const routeSnippet = `\n// Jupsoft Centralized CMS Blog Routes\napp.get('/blog', (req, res) => res.sendFile(path.join(__dirname, '${hasPagesDir ? 'pages' : ''}', 'blog.html')));\napp.post('/api/revalidate', express.json(), (req, res) => res.json({ revalidated: true, timestamp: new Date().toISOString() }));\n`;
      if (/(app\.listen|\/\/ Handle 404)/.test(serverCode)) {
        serverCode = serverCode.replace(/(app\.listen|\/\/ Handle 404)/, `${routeSnippet}\n$1`);
      } else {
        serverCode += `\n${routeSnippet}\n`;
      }
      fs.writeFileSync(serverPath, serverCode, 'utf8');
      console.log('\x1b[32m%s\x1b[0m', '  ✅ Automatically wired /blog and /api/revalidate into server.js');
    }
  }

  // Auto-generate Netlify configuration if requested or Netlify files exist
  if (params.netlify || fs.existsSync(path.join(cwd, 'netlify.toml')) || fs.existsSync(path.join(cwd, '_redirects'))) {
    const redirectsPath = path.join(cwd, '_redirects');
    if (!fs.existsSync(redirectsPath)) {
      const redirectsContent = `/blog        /${hasPagesDir ? 'pages/' : ''}blog.html   200\n/blog/*      /${hasPagesDir ? 'pages/' : ''}blog.html   200\n`;
      fs.writeFileSync(redirectsPath, redirectsContent, 'utf8');
      console.log('\x1b[32m%s\x1b[0m', '  ✅ Generated _redirects for Netlify');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG: SAFELY INJECT OR UPDATE .env.local
// ─────────────────────────────────────────────────────────────────────────────
const envPath = path.join(cwd, '.env.local');
const envEntries = [
  `PORT=${process.env.PORT || '5004'}`,
  `NEXT_PUBLIC_CMS_API_URL=${apiUrl}`,
  `CMS_API_URL=${apiUrl}`,
  `CMS_TENANT_API_KEY=${apiKey || 'YOUR_TENANT_API_KEY_HERE'}`,
  `CMS_WEBSITE_ID=${websiteId || 'YOUR_WEBSITE_ID_HERE'}`,
  `CMS_WEBHOOK_SECRET=${webhookSec || 'YOUR_WEBHOOK_SECRET_HERE'}`
];

let existingEnv = '';
if (fs.existsSync(envPath)) existingEnv = fs.readFileSync(envPath, 'utf8');

const toAppend = [];
envEntries.forEach(entry => {
  const key = entry.split('=')[0];
  if (!existingEnv.includes(key)) toAppend.push(entry);
});

if (toAppend.length > 0) {
  const newContent = existingEnv + (existingEnv && !existingEnv.endsWith('\n') ? '\n' : '') + toAppend.join('\n') + '\n';
  fs.writeFileSync(envPath, newContent, 'utf8');
  console.log('\x1b[32m%s\x1b[0m', `  🔐 Configured environment credentials in .env.local`);
} else {
  console.log('\x1b[33m%s\x1b[0m', '  ℹ️ .env.local already configured.');
}

console.log('\x1b[35m%s\x1b[0m', '\n=============================================================');
console.log('\x1b[32m%s\x1b[0m', '🎉 Jupsoft SaaS Blog Integration Complete!');
console.log('\x1b[36m%s\x1b[0m', `👉 Your blog is ready at: /blog`);
console.log('\x1b[36m%s\x1b[0m', `👉 Connected to CMS Tenant: ${websiteId || 'site-gaming'}`);
console.log('\x1b[35m%s\x1b[0m', '=============================================================\n');
