#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('\x1b[36m%s\x1b[0m', '=============================================================');
console.log('\x1b[36m%s\x1b[0m', '🚀 [Blogary CMS] Universal Blog Engine Scaffolder & Auditor');
console.log('\x1b[36m%s\x1b[0m', '=============================================================');

const args = process.argv.slice(2);
const isHelp = args.includes('--help') || args.includes('-h');
const isCheckOnly = args.includes('check') || args.includes('--check');
const isForce = args.includes('--force') || args.includes('--bypass-compat');

if (isHelp) {
  console.log(`
\x1b[36m🚀 Blogary CMS (powered by Jupsoft) - Universal Blog Engine\x1b[0m

\x1b[33mUsage:\x1b[0m
  npx @jupsoft/next-blog [options]
  npx @jupsoft/next-blog check

\x1b[33mCommands:\x1b[0m
  check               Run pre-flight compatibility audit only (no files created)

\x1b[33mOptions:\x1b[0m
  --site=<siteId>     Your Website/Tenant ID (e.g. site-cloud, site-portal)
  --key=<apiKey>      Your Tenant Private API Key
  --url=<apiUrl>      CMS API Base URL (default: https://blogary.jupsoft.com)
  --secret=<secret>   Webhook signature verification secret
  --force             Bypass compatibility audit and force install
  --netlify           Auto-generate Netlify configuration (netlify.toml & _redirects)
  -h, --help          Show this manual

\x1b[33mSupported Stacks:\x1b[0m
  • Next.js 14/15/16 App Router (Recommended for full SSR / ISR / SEO)
  • Next.js Pages Router
  • Express.js / Node.js
  • Static HTML / Vite / Astro
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
const apiUrl = (params.url || process.env.NEXT_PUBLIC_CMS_API_URL || 'https://blogary.jupsoft.com').replace(/\/$/, '');
const webhookSec = params.secret || process.env.CMS_WEBHOOK_SECRET || 'wh_sec_jupsoft_default_revalidate_2026';

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: PRE-FLIGHT TECHNICAL COMPATIBILITY AUDIT GATE (TRD ENFORCEMENT)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\x1b[33m%s\x1b[0m', '🛡️  Running Pre-Flight Technical Compatibility Audit...\n');

const audit = {
  passed: [],
  warnings: [],
  errors: []
};

// 1. Check Node.js version (Requires Node >= 18.17.0)
const nodeVerMatch = process.version.match(/^v(\d+)\.(\d+)/);
if (nodeVerMatch) {
  const major = parseInt(nodeVerMatch[1], 10);
  const minor = parseInt(nodeVerMatch[2], 10);
  if (major < 18 || (major === 18 && minor < 17)) {
    audit.errors.push({
      title: `Node.js runtime version is ${process.version} (Minimum required: >= v18.17.0)`,
      fix: `Upgrade Node.js to v20 LTS: Run 'nvm use 20' or download from https://nodejs.org`
    });
  } else {
    audit.passed.push(`Node.js runtime compatible (${process.version})`);
  }
}

// 2. Check package.json presence
const pkgPath = path.join(cwd, 'package.json');
let pkg = null;
let deps = {};
if (fs.existsSync(pkgPath)) {
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    audit.passed.push(`Valid package.json found (${pkg.name || 'unnamed-project'})`);
  } catch (e) {
    audit.errors.push({
      title: `package.json is corrupted or invalid JSON`,
      fix: `Check and fix syntax errors in ${pkgPath}`
    });
  }
} else {
  // If no package.json, check if it's a static site
  const files = fs.readdirSync(cwd);
  const hasHtml = files.some(f => f.endsWith('.html'));
  if (!hasHtml) {
    audit.errors.push({
      title: `No package.json or HTML files found in current directory (${cwd})`,
      fix: `Run this command from your website root folder, or run 'npm init -y' first.`
    });
  } else {
    audit.passed.push(`Static website structure detected (HTML files found)`);
  }
}

// 3. Framework & Dependency Compatibility Checks
let isNextJs = false;
let isExpress = false;
const hasPagesDir = fs.existsSync(path.join(cwd, 'pages')) && fs.statSync(path.join(cwd, 'pages')).isDirectory();
const hasSrcApp = fs.existsSync(path.join(cwd, 'src', 'app')) && fs.statSync(path.join(cwd, 'src', 'app')).isDirectory();
const hasRootApp = fs.existsSync(path.join(cwd, 'app')) && fs.statSync(path.join(cwd, 'app')).isDirectory();

if (deps['next'] || fs.existsSync(path.join(cwd, 'next.config.js')) || fs.existsSync(path.join(cwd, 'next.config.ts')) || fs.existsSync(path.join(cwd, 'next.config.mjs')) || fs.existsSync(path.join(cwd, 'next.config.cjs'))) {
  isNextJs = true;

  // Next.js version gate
  if (deps['next']) {
    const rawVer = deps['next'];
    const cleanVer = rawVer.replace(/[\^~>=<]/g, '').trim();
    const major = parseInt(cleanVer.split('.')[0], 10);
    if (!isNaN(major) && major < 14) {
      audit.errors.push({
        title: `Unsupported Next.js version: ${rawVer} (Requires Next.js >= 14.0.0 for App Router & ISR)`,
        fix: `Upgrade Next.js: run 'npm install next@latest react@latest react-dom@latest'`
      });
    } else {
      audit.passed.push(`Next.js version compatible (${rawVer})`);
    }
  }

  // React version gate
  if (deps['react']) {
    const rawReact = deps['react'];
    const cleanReact = rawReact.replace(/[\^~>=<]/g, '').trim();
    const major = parseInt(cleanReact.split('.')[0], 10);
    if (!isNaN(major) && major < 18) {
      audit.errors.push({
        title: `Unsupported React version: ${rawReact} (Requires React >= 18.0.0)`,
        fix: `Upgrade React: run 'npm install react@latest react-dom@latest'`
      });
    } else {
      audit.passed.push(`React version compatible (${rawReact})`);
    }
  }

  // App Router structure check
  if (!hasSrcApp && !hasRootApp) {
    if (hasPagesDir) {
      audit.warnings.push({
        title: `Pages Router detected without App Router directory`,
        fix: `We will create app/blog for App Router integration, or use universal HTML widget.`
      });
    } else {
      audit.passed.push(`Fresh Next.js project: Ready to scaffold app/ directory`);
    }
  } else {
    audit.passed.push(`Next.js App Router detected (${hasSrcApp ? 'src/app' : 'app'})`);
  }

  // Remote image config check
  const nextConfigNames = ['next.config.js', 'next.config.ts', 'next.config.mjs', 'next.config.cjs'];
  let foundConfig = false;
  let hasImageConfig = false;
  for (const cfg of nextConfigNames) {
    const p = path.join(cwd, cfg);
    if (fs.existsSync(p)) {
      foundConfig = true;
      const content = fs.readFileSync(p, 'utf8');
      if (content.includes('blogary.jupsoft.com') || content.includes('remotePatterns') || content.includes('images')) {
        hasImageConfig = true;
      }
      break;
    }
  }

  if (foundConfig && !hasImageConfig) {
    audit.warnings.push({
      title: `Remote image domain 'blogary.jupsoft.com' not configured in next.config`,
      fix: `Add 'blogary.jupsoft.com' to images.remotePatterns in next.config to prevent Next.js Image component runtime warnings.`
    });
  }
} else if (deps['express'] || fs.existsSync(path.join(cwd, 'server.js'))) {
  isExpress = true;
  audit.passed.push(`Express.js / Node.js server detected`);
} else {
  audit.passed.push(`Universal Web stack detected (Static HTML / Vite / Astro)`);
}

// 4. Target Collision Check
const appDir = hasSrcApp ? path.join(cwd, 'src', 'app') : path.join(cwd, 'app');
const existingBlogPage = isNextJs
  ? (fs.existsSync(path.join(appDir, 'blog', 'page.tsx')) || fs.existsSync(path.join(appDir, 'blog', 'page.jsx')) || fs.existsSync(path.join(appDir, 'blog', 'page.js')))
  : fs.existsSync(path.join(cwd, 'blog.html'));

if (existingBlogPage && !isForce) {
  audit.errors.push({
    title: `Existing blog route already present (${isNextJs ? (hasSrcApp ? 'src/app/blog/page' : 'app/blog/page') : 'blog.html'})`,
    fix: `Backup your existing blog files, or re-run with '--force' to overwrite: npx @jupsoft/next-blog --force`
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER AUDIT REPORT
// ─────────────────────────────────────────────────────────────────────────────
audit.passed.forEach(item => {
  console.log(`\x1b[32m  ✔ ${item}\x1b[0m`);
});

if (audit.warnings.length > 0) {
  console.log('\n\x1b[33m%s\x1b[0m', '⚠️  Advisories / Recommendations:');
  audit.warnings.forEach(w => {
    console.log(`\x1b[33m  • ${w.title}\x1b[0m`);
    console.log(`\x1b[90m    👉 Fix: ${w.fix}\x1b[0m`);
  });
}

if (audit.errors.length > 0) {
  console.log('\n\x1b[31m%s\x1b[0m', '❌ Blocking Incompatibilities Found:');
  audit.errors.forEach((err, idx) => {
    console.log(`\x1b[31m  ${idx + 1}. ${err.title}\x1b[0m`);
    console.log(`\x1b[33m     👉 Required Fix: ${err.fix}\x1b[0m\n`);
  });
}

// If user requested audit check only:
if (isCheckOnly) {
  console.log('\n=============================================================');
  if (audit.errors.length === 0) {
    console.log('\x1b[32m%s\x1b[0m', '✅ AUDIT RESULT: FULLY COMPATIBLE (Score: 100/100)');
    console.log('\x1b[36m%s\x1b[0m', 'You can safely proceed with: npx @jupsoft/next-blog --site=<siteId> --key=<apiKey>');
  } else {
    console.log('\x1b[31m%s\x1b[0m', `❌ AUDIT RESULT: INCOMPATIBLE (${audit.errors.length} blocking issues)`);
    console.log('\x1b[33m%s\x1b[0m', 'Please resolve the required fixes above before installing.');
  }
  console.log('=============================================================\n');
  process.exit(audit.errors.length === 0 ? 0 : 1);
}

// If blocking errors exist and user did NOT use --force, STOP IMMEDIATELY!
if (audit.errors.length > 0 && !isForce) {
  console.log('\n=============================================================');
  console.log('\x1b[31m%s\x1b[0m', '❌ INSTALLATION ABORTED');
  console.log('\x1b[37m%s\x1b[0m', 'Your website is not yet compatible with Blogary CMS.');
  console.log('\x1b[37m%s\x1b[0m', 'No files were created or modified to protect your codebase.');
  console.log('\x1b[33m%s\x1b[0m', '\nPlease resolve the required fixes shown above, then re-run install.');
  console.log('\x1b[90m%s\x1b[0m', '(To bypass compatibility checks at your own risk, run with: --force)');
  console.log('=============================================================\n');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: PROCEED WITH SAFE INSTALLATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n\x1b[32m%s\x1b[0m', '🚀 All Compatibility Gates Passed! Proceeding with installation...\n');

// STACK A: NEXT.JS
if (isNextJs) {
  console.log('⚡ Scaffolding Next.js 14/15/16 blog routes...');

  const dirsToCreate = [
    path.join(appDir, 'blog'),
    path.join(appDir, 'blog', '[slug]'),
    path.join(appDir, 'api', 'revalidate')
  ];

  dirsToCreate.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const blogListPath = path.join(appDir, 'blog', 'page.tsx');
  if (!fs.existsSync(blogListPath) || isForce) {
    fs.writeFileSync(blogListPath, `import { JupsoftBlogList } from '@jupsoft/next-blog';\n\nexport const revalidate = 3600;\nexport const metadata = {\n  title: 'Blog & Articles | Insights',\n  description: 'Explore the latest articles, technology guides, and updates.',\n};\n\nexport default JupsoftBlogList;\n`, 'utf8');
    console.log('\x1b[32m%s\x1b[0m', `  ✅ Created ${path.relative(cwd, blogListPath)}`);
  }

  const blogDetailPath = path.join(appDir, 'blog', '[slug]', 'page.tsx');
  if (!fs.existsSync(blogDetailPath) || isForce) {
    fs.writeFileSync(blogDetailPath, `import { JupsoftBlogDetail, generateBlogMeta } from '@jupsoft/next-blog';\n\nexport const revalidate = 3600;\nexport const generateMetadata = generateBlogMeta;\n\nexport default JupsoftBlogDetail;\n`, 'utf8');
    console.log('\x1b[32m%s\x1b[0m', `  ✅ Created ${path.relative(cwd, blogDetailPath)}`);
  }

  const webhookPath = path.join(appDir, 'api', 'revalidate', 'route.ts');
  if (!fs.existsSync(webhookPath) || isForce) {
    fs.writeFileSync(webhookPath, `export { POST } from '@jupsoft/next-blog/webhook';\n`, 'utf8');
    console.log('\x1b[32m%s\x1b[0m', `  ✅ Created ${path.relative(cwd, webhookPath)}`);
  }
}

// STACK B: STATIC HTML / EXPRESS / ANY OTHER STACK
if (!isNextJs) {
  console.log('⚡ Scaffolding Universal Blog pages...');

  const targetBlogDir = hasPagesDir ? path.join(cwd, 'pages') : cwd;
  const blogHtmlPath = path.join(targetBlogDir, 'blog.html');

  if (!fs.existsSync(blogHtmlPath) || isForce) {
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
    <div id="jupsoft-blog-feed" data-site="${websiteId || 'site-cloud'}" data-api="${apiUrl}" data-theme="dark"></div>
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

  // Auto-generate Netlify configuration if requested
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
  `CMS_WEBHOOK_SECRET=${webhookSec || 'wh_sec_jupsoft_default_revalidate_2026'}`
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
console.log('\x1b[32m%s\x1b[0m', '🎉 Blogary Blog Integration Complete!');
console.log('\x1b[36m%s\x1b[0m', `👉 Your blog is ready at: /blog`);
console.log('\x1b[36m%s\x1b[0m', `👉 Connected to CMS Tenant: ${websiteId || 'site-cloud'}`);
console.log('\x1b[35m%s\x1b[0m', '=============================================================\n');
