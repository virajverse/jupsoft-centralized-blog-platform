#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('\x1b[36m%s\x1b[0m', '=============================================================');
console.log('\x1b[36m%s\x1b[0m', '🚀 [Blogary CMS] Universal Blog Engine — Doctor & Auto-Fixer');
console.log('\x1b[36m%s\x1b[0m', '=============================================================');

const args = process.argv.slice(2);
const isHelp = args.includes('--help') || args.includes('-h');
const isDoctor = args.includes('doctor') || args.includes('check') || args.includes('--check');
const isFix = args.includes('fix') || args.includes('--fix') || args.includes('repair');
const isForce = args.includes('--force') || args.includes('--bypass-compat') || isFix;

if (isHelp) {
  console.log(`
\x1b[36m🚀 Blogary CMS (powered by Jupsoft) - Self-Healing CLI\x1b[0m

\x1b[33mUsage:\x1b[0m
  npx @jupsoft/next-blog [command] [options]

\x1b[33mCommands:\x1b[0m
  fix                 Automatically diagnose and repair broken routes, dummy pages, and envs
  doctor              Run comprehensive pre-flight health audit & live API connection test
  (default)           Scaffold and wire blog routes with self-healing verification

\x1b[33mOptions:\x1b[0m
  --site=<siteId>     Your Website/Tenant ID (e.g. site-cloud, site-hgello)
  --key=<apiKey>      Your Tenant Private API Key
  --url=<apiUrl>      CMS API Base URL (default: https://blogary.jupsoft.com)
  --secret=<secret>   Webhook signature verification secret
  --force             Bypass checks and overwrite files
  --netlify           Auto-generate Netlify configuration (netlify.toml & _redirects)
  -h, --help          Show this manual
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

// Load existing .env.local if present
const envPath = path.join(cwd, '.env.local');
let parsedEnv = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        parsedEnv[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
    }
  });
}

const websiteId = params.site || process.env.CMS_WEBSITE_ID || parsedEnv.CMS_WEBSITE_ID || '';
const apiKey = params.key || process.env.CMS_TENANT_API_KEY || parsedEnv.CMS_TENANT_API_KEY || '';
const apiUrl = (params.url || process.env.CMS_API_URL || process.env.NEXT_PUBLIC_CMS_API_URL || parsedEnv.CMS_API_URL || parsedEnv.NEXT_PUBLIC_CMS_API_URL || 'https://blogary.jupsoft.com').replace(/\/$/, '');
// No hardcoded default secret — require it explicitly (env, .env.local, or --secret).
const webhookSec = params.secret || process.env.CMS_WEBHOOK_SECRET || parsedEnv.CMS_WEBHOOK_SECRET || '';
if (!webhookSec) {
  console.warn(
    '\x1b[33m%s\x1b[0m',
    '⚠️  CMS_WEBHOOK_SECRET not provided — revalidation webhooks will be rejected (401/500). Set it via --secret or CMS_WEBHOOK_SECRET (same value as the CMS backend WEBHOOK_DEFAULT_SECRET).',
  );
}

console.log('\x1b[33m%s\x1b[0m', `🔍 Inspecting project at: ${cwd}\n`);

// ─────────────────────────────────────────────────────────────────────────────
// COMPATIBILITY & STRUCTURE CHECKS
// ─────────────────────────────────────────────────────────────────────────────
const audit = { passed: [], warnings: [], errors: [], fixesNeeded: [] };

// 1. package.json & dependencies
const pkgPath = path.join(cwd, 'package.json');
let pkg = null;
let deps = {};
if (fs.existsSync(pkgPath)) {
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    audit.passed.push(`package.json found (${pkg.name || 'unnamed'})`);
  } catch {
    audit.errors.push({ title: 'package.json is invalid JSON', fix: 'Fix syntax errors in package.json' });
  }
} else {
  audit.errors.push({ title: 'No package.json found', fix: 'Run npm init -y or run inside project directory' });
}

const hasSrcApp = fs.existsSync(path.join(cwd, 'src', 'app')) && fs.statSync(path.join(cwd, 'src', 'app')).isDirectory();
const hasRootApp = fs.existsSync(path.join(cwd, 'app')) && fs.statSync(path.join(cwd, 'app')).isDirectory();
const appDir = hasSrcApp ? path.join(cwd, 'src', 'app') : path.join(cwd, 'app');
const isNextJs = !!(deps['next'] || fs.existsSync(path.join(cwd, 'next.config.js')) || fs.existsSync(path.join(cwd, 'next.config.ts')) || fs.existsSync(path.join(cwd, 'next.config.mjs')));

if (isNextJs) {
  audit.passed.push(`Next.js App Router project detected (${hasSrcApp ? 'src/app' : 'app'})`);
} else {
  audit.warnings.push({ title: 'Not a Next.js project', fix: 'Universal HTML widget will be used for static sites.' });
}

// 2. Check Routes Integrity
const blogListPath = path.join(appDir, 'blog', 'page.tsx');
const blogDetailPath = path.join(appDir, 'blog', '[slug]', 'page.tsx');
const webhookRoutePath = path.join(appDir, 'api', 'revalidate', 'route.ts');

if (isNextJs) {
  // Check Blog List route
  if (!fs.existsSync(blogListPath)) {
    audit.fixesNeeded.push({
      target: blogListPath,
      action: 'create_blog_list',
      description: 'Missing blog listing page (app/blog/page.tsx)'
    });
  } else {
    const content = fs.readFileSync(blogListPath, 'utf8');
    if (!content.includes('JupsoftBlogList') && !content.includes('@jupsoft/next-blog')) {
      audit.warnings.push({
        title: 'Dummy / Static blog page detected (app/blog/page.tsx is not connected to CMS)',
        fix: 'Run with "fix" command to connect JupsoftBlogList automatically'
      });
      audit.fixesNeeded.push({
        target: blogListPath,
        action: 'repair_blog_list',
        description: 'Replace static placeholder in app/blog/page.tsx with JupsoftBlogList'
      });
    } else {
      audit.passed.push('app/blog/page.tsx is properly connected to JupsoftBlogList');
    }
  }

  // Check Blog Detail route
  if (!fs.existsSync(blogDetailPath)) {
    audit.fixesNeeded.push({
      target: blogDetailPath,
      action: 'create_blog_detail',
      description: 'Missing blog article detail page (app/blog/[slug]/page.tsx)'
    });
  } else {
    const content = fs.readFileSync(blogDetailPath, 'utf8');
    if (!content.includes('JupsoftBlogDetail') && !content.includes('@jupsoft/next-blog')) {
      audit.fixesNeeded.push({
        target: blogDetailPath,
        action: 'repair_blog_detail',
        description: 'Connect app/blog/[slug]/page.tsx to JupsoftBlogDetail'
      });
    } else {
      audit.passed.push('app/blog/[slug]/page.tsx is properly connected to JupsoftBlogDetail');
    }
  }

  // Check Webhook route
  if (!fs.existsSync(webhookRoutePath)) {
    audit.fixesNeeded.push({
      target: webhookRoutePath,
      action: 'create_webhook',
      description: 'Missing webhook revalidation route (app/api/revalidate/route.ts)'
    });
  } else {
    const content = fs.readFileSync(webhookRoutePath, 'utf8');
    if (!content.includes('@jupsoft/next-blog/webhook') && !content.includes('verifyWebhookSignature')) {
      audit.fixesNeeded.push({
        target: webhookRoutePath,
        action: 'repair_webhook',
        description: 'Wire app/api/revalidate/route.ts to @jupsoft/next-blog/webhook'
      });
    } else {
      audit.passed.push('app/api/revalidate/route.ts is properly wired for ISR revalidation');
    }
  }
}

// 3. Check Environment Variables
if (!websiteId) {
  audit.warnings.push({
    title: 'CMS_WEBSITE_ID is not configured in .env.local',
    fix: 'Pass --site=<your-website-id> or set CMS_WEBSITE_ID in .env.local'
  });
} else {
  audit.passed.push(`CMS_WEBSITE_ID configured (${websiteId})`);
}

if (!apiKey) {
  audit.warnings.push({
    title: 'CMS_TENANT_API_KEY is not configured in .env.local',
    fix: 'Pass --key=<your-api-key> or set CMS_TENANT_API_KEY in .env.local'
  });
} else {
  audit.passed.push(`CMS_TENANT_API_KEY configured (masked: ${apiKey.slice(0, 8)}...)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER AUDIT SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
audit.passed.forEach(item => console.log(`\x1b[32m  ✔ ${item}\x1b[0m`));
audit.warnings.forEach(w => {
  console.log(`\x1b[33m  ⚠️  ${w.title}\x1b[0m`);
  console.log(`\x1b[90m     Fix: ${w.fix}\x1b[0m`);
});
audit.errors.forEach(e => {
  console.log(`\x1b[31m  ❌ ${e.title}\x1b[0m`);
  console.log(`\x1b[90m     Fix: ${e.fix}\x1b[0m`);
});

// ─────────────────────────────────────────────────────────────────────────────
// LIVE API CONNECTIVITY PRE-FLIGHT TEST
// ─────────────────────────────────────────────────────────────────────────────
async function testLiveConnection() {
  if (!websiteId) {
    console.log('\n\x1b[33m%s\x1b[0m', '⏭️  Skipping live API test: CMS_WEBSITE_ID is not set.');
    return;
  }

  console.log('\n\x1b[36m%s\x1b[0m', '🌐 Running Live Pre-Flight CMS API Connection Test...');
  const testUrl = `${apiUrl}/v1/blogs?websiteId=${encodeURIComponent(websiteId)}&limit=3`;

  try {
    const headers = { 'Accept': 'application/json' };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['x-api-key'] = apiKey;
    }

    const res = await fetch(testUrl, { headers, signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      const count = data.meta?.total ?? (data.data ? data.data.length : 0);
      console.log(`\x1b[32m  ✔ Connected to Blogary CMS (${apiUrl})\x1b[0m`);
      console.log(`\x1b[32m  ✔ Tenant Authenticated: ${websiteId} (Found ${count} published blog articles)\x1b[0m`);
      if (data.data && data.data.length > 0) {
        console.log(`\x1b[36m    👉 Latest blog: "${data.data[0].title}" (slug: /blog/${data.data[0].slug})\x1b[0m`);
      }
    } else if (res.status === 401) {
      console.log(`\x1b[31m  ❌ CMS API returned 401 Unauthorized for website "${websiteId}". Check your CMS_TENANT_API_KEY.\x1b[0m`);
    } else {
      console.log(`\x1b[33m  ⚠️  CMS API returned HTTP ${res.status}: ${res.statusText}\x1b[0m`);
    }
  } catch (err) {
    console.log(`\x1b[33m  ⚠️  CMS API Ping failed (${err.message}). Check internet connection or API URL (${apiUrl}).\x1b[0m`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-FIX EXECUTION
// ─────────────────────────────────────────────────────────────────────────────
async function runFixes() {
  console.log('\n\x1b[35m%s\x1b[0m', '═════════════════════════════════════════════════════════════');
  console.log('\x1b[32m%s\x1b[0m', '🔧 Executing Auto-Fix & Route Scaffolding...');
  console.log('\x1b[35m%s\x1b[0m', '═════════════════════════════════════════════════════════════\n');

  if (isNextJs) {
    // 1. Ensure directories
    const dirs = [
      path.join(appDir, 'blog'),
      path.join(appDir, 'blog', '[slug]'),
      path.join(appDir, 'api', 'revalidate')
    ];
    dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

    // 2. Fix Blog List
    const blogListCode = `import { JupsoftBlogList } from '@jupsoft/next-blog';

export const revalidate = 3600;

export const metadata = {
  title: 'Blog & Articles | Insights',
  description: 'Explore the latest articles, guides, and enterprise updates.',
};

type BlogListPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function BlogPage(props: BlogListPageProps) {
  return (
    <main className="min-h-screen">
      <JupsoftBlogList {...props} />
    </main>
  );
}
`;
    fs.writeFileSync(blogListPath, blogListCode, 'utf8');
    console.log(`\x1b[32m  ✔ [Fixed] ${path.relative(cwd, blogListPath)} connected to JupsoftBlogList\x1b[0m`);

    // 3. Fix Blog Detail
    const blogDetailCode = `import { JupsoftBlogDetail, generateBlogMeta } from '@jupsoft/next-blog';

type BlogDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 3600;

export async function generateMetadata(props: BlogDetailPageProps) {
  return generateBlogMeta(props);
}

export default function BlogDetailPage(props: BlogDetailPageProps) {
  return <JupsoftBlogDetail {...props} />;
}
`;
    fs.writeFileSync(blogDetailPath, blogDetailCode, 'utf8');
    console.log(`\x1b[32m  ✔ [Fixed] ${path.relative(cwd, blogDetailPath)} connected to JupsoftBlogDetail\x1b[0m`);

    // 4. Fix Webhook
    const webhookCode = `export { POST } from '@jupsoft/next-blog/webhook';\n`;
    fs.writeFileSync(webhookRoutePath, webhookCode, 'utf8');
    console.log(`\x1b[32m  ✔ [Fixed] ${path.relative(cwd, webhookRoutePath)} wired to Multi-Gate revalidation webhook\x1b[0m`);
  }

  // 5. Fix .env.local
  const envEntries = [
    `PORT=${parsedEnv.PORT || process.env.PORT || '5004'}`,
    `NEXT_PUBLIC_CMS_API_URL=${apiUrl}`,
    `CMS_API_URL=${apiUrl}`,
    `CMS_TENANT_API_KEY=${apiKey || 'YOUR_TENANT_API_KEY_HERE'}`,
    `CMS_WEBSITE_ID=${websiteId || 'YOUR_WEBSITE_ID_HERE'}`
  ];
  // Only write the webhook secret when one was explicitly provided — never persist an empty/default value.
  if (webhookSec) envEntries.push(`CMS_WEBHOOK_SECRET=${webhookSec}`);

  let existingEnv = '';
  if (fs.existsSync(envPath)) existingEnv = fs.readFileSync(envPath, 'utf8');

  // Update or append each entry cleanly
  let lines = existingEnv ? existingEnv.split('\n') : [];
  envEntries.forEach(entry => {
    const key = entry.split('=')[0];
    const idx = lines.findIndex(l => l.trim().startsWith(`${key}=`));
    if (idx !== -1) {
      if (entry.includes('YOUR_') && lines[idx].trim().length > key.length + 1) {
        // Keep existing valid value
      } else {
        lines[idx] = entry;
      }
    } else {
      lines.push(entry);
    }
  });

  fs.writeFileSync(envPath, lines.join('\n').trim() + '\n', 'utf8');
  console.log(`\x1b[32m  ✔ [Fixed] .env.local verified and updated\x1b[0m`);

  // Netlify configuration if requested or Netlify files detected
  if (params.netlify || fs.existsSync(path.join(cwd, 'netlify.toml')) || fs.existsSync(path.join(cwd, '_redirects'))) {
    console.log('\n\x1b[36m%s\x1b[0m', '📋 Netlify Deployment Checklist:');
    console.log('\x1b[37m%s\x1b[0m', '   Add these 4 variables in Netlify Dashboard ➔ Site configuration ➔ Environment variables:');
    console.log(`   • CMS_API_URL = ${apiUrl}`);
    console.log(`   • CMS_WEBSITE_ID = ${websiteId || 'your-website-id'}`);
    console.log(`   • CMS_TENANT_API_KEY = ${apiKey || 'your-api-key'}`);
    console.log(`   • CMS_WEBHOOK_SECRET = ${webhookSec}`);
  }

  console.log('\n\x1b[32m%s\x1b[0m', '🎉 All fixes applied successfully!');
  console.log('\x1b[36m%s\x1b[0m', '👉 Next step: Run "npm run build" to test production build.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION FLOW
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  await testLiveConnection();

  if (isDoctor) {
    console.log('\n=============================================================');
    if (audit.fixesNeeded.length === 0 && audit.errors.length === 0) {
      console.log('\x1b[32m%s\x1b[0m', '✅ AUDIT RESULT: HEALTHY & FULLY OPERATIONAL');
    } else {
      console.log('\x1b[33m%s\x1b[0m', `⚠️  AUDIT RESULT: ${audit.fixesNeeded.length} repairs recommended`);
      console.log('\x1b[36m%s\x1b[0m', '👉 Run "npx @jupsoft/next-blog fix" to auto-repair everything.');
    }
    console.log('=============================================================\n');
    process.exit(0);
  }

  if (isFix || isForce || audit.fixesNeeded.length > 0) {
    await runFixes();
  } else {
    console.log('\n\x1b[32m%s\x1b[0m', '✅ Project is already in good shape! No fixes required.');
    console.log('\x1b[36m%s\x1b[0m', '👉 To force re-scaffold or repair routes, run: npx @jupsoft/next-blog fix\n');
  }
}

main().catch(err => {
  console.error('\x1b[31mFatal error:\x1b[0m', err);
  process.exit(1);
});
