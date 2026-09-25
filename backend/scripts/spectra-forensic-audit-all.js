const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const WEBSITE_ID = 'site-jupsoft-test';
const SPECTRA_API = 'http://127.0.0.1:8002';
const REPORT_PATH = path.resolve(__dirname, '../../docs/SPECTRA_56_BLOGS_AUDIT_REPORT.md');

async function runSpectraAudit() {
  console.log('===============================================================');
  console.log('🕵️ SPECTRA BROWSER: Live Chrome Forensic Audit (56 Blogs)');
  console.log('   Target: https://test1.jupsoft.in/blog/[slug]');
  console.log('===============================================================');

  // Verify Spectra connection
  const extStatus = await fetch(`${SPECTRA_API}/extension_status`).then(r => r.json());
  if (!extStatus.extension_connected) {
    console.error('❌ Spectra extension is NOT connected!');
    process.exit(1);
  }
  console.log('🟢 Spectra Chrome Extension connected and active.\n');

  const blogs = await prisma.blogTranslation.findMany({
    where: { blog: { websiteId: WEBSITE_ID } },
    select: { slug: true, title: true, content: true },
    orderBy: { blog: { publishDate: 'desc' } }
  });

  console.log(`Auditing all ${blogs.length} blogs in live Chrome...\n`);

  const reportItems = [];

  for (let i = 0; i < blogs.length; i++) {
    const b = blogs[i];
    const url = `https://test1.jupsoft.in/blog/${b.slug}`;
    process.stdout.write(`[${i + 1}/${blogs.length}] Auditing: ${b.slug.slice(0, 45)} ... `);

    try {
      // 1. Navigate via Spectra Extension
      await fetch(`${SPECTRA_API}/browser_navigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: 'default', url })
      });

      // 2. Wait for idle
      await fetch(`${SPECTRA_API}/browser_wait_idle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: 'default', timeout_ms: 5000 })
      });

      // 3. Inspect page
      const inspect = await fetch(`${SPECTRA_API}/page_inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: 'default' })
      }).then(r => r.json());

      const elements = inspect.interactive_elements || [];
      const images = elements.filter(e => e.role === 'img');

      // Check header / footer
      const hasLogo = images.some(img => img.attributes?.src?.includes('logo'));
      const hasFooter = elements.some(e => e.name && (e.name.includes('Privacy Policy') || e.name.includes('Terms & Conditions')));

      // Check for unlinked URLs in DB content
      const rawUrlsInContent = b.content.match(/(?<!href=["'])(https?:\/\/[^\s<>"']+)/gi) || [];
      const unlinkedUrls = rawUrlsInContent.filter(u => 
        !u.endsWith('.jpg') && !u.endsWith('.png') && !u.endsWith('.webp') &&
        !u.includes('schema.org') && !u.includes('w3.org') && !u.includes('youtube.com') && !u.includes('youtube-nocookie.com')
      );

      // Check for raw unstyled bullets in content
      const fakeBulletsCount = (b.content.match(/<p>\s*[•\-\*]\s+/g) || []).length;

      const defects = [];
      if (!hasLogo) defects.push('HEADER_LOGO_MISSING');
      if (!hasFooter) defects.push('FOOTER_MISSING');
      if (unlinkedUrls.length > 0) defects.push(`UNLINKED_URLS (${unlinkedUrls.length})`);
      if (fakeBulletsCount > 0) defects.push(`UNSTYLED_BULLETS (${fakeBulletsCount})`);

      reportItems.push({
        index: i + 1,
        slug: b.slug,
        title: b.title,
        interactiveCount: elements.length,
        imagesCount: images.length,
        hasHeader: hasLogo,
        hasFooter,
        unlinkedUrls,
        defects,
        status: defects.length === 0 ? 'PASS' : 'WARN'
      });

      if (defects.length === 0) {
        console.log(`✅ PASS (Items: ${elements.length}, Imgs: ${images.length})`);
      } else {
        console.log(`⚠️ WARN: ${defects.join(', ')}`);
      }

    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
      reportItems.push({
        index: i + 1,
        slug: b.slug,
        title: b.title,
        defects: ['SPECTRA_ERROR: ' + err.message],
        status: 'FAIL'
      });
    }
  }

  // Generate markdown report
  const passCount = reportItems.filter(r => r.status === 'PASS').length;
  const warnCount = reportItems.filter(r => r.status === 'WARN').length;
  const failCount = reportItems.filter(r => r.status === 'FAIL').length;

  let md = `# 🕵️ Spectra Browser Forensic Live Audit Report (56 Blogs)\n\n`;
  md += `> **Audit Tool:** Spectra Browser MCP (Port 8002 Extension Native)\n`;
  md += `> **Target Domain:** \`https://test1.jupsoft.in/blog\`\n`;
  md += `> **Timestamp:** ${new Date().toISOString()}\n`;
  md += `> **Audit Scope:** All 56 Live Production Blogs\n\n`;
  md += `### 📊 Scorecard Overview\n\n`;
  md += `| Total Blogs Audited | 100% Clean (PASS) | Warnings (WARN) | Errors (FAIL) | Overall Compliance |\n`;
  md += `| :---: | :---: | :---: | :---: | :---: |\n`;
  md += `| **${blogs.length}** | **${passCount}** | **${warnCount}** | **${failCount}** | **${Math.round((passCount / blogs.length) * 100)}%** |\n\n`;
  md += `### 📑 Detailed Article Inspection Breakdown\n\n`;
  md += `| # | Slug | Status | Header | Footer | Images in DOM | Defects |\n`;
  md += `| :-: | :--- | :---: | :---: | :---: | :---: | :--- |\n`;

  for (const item of reportItems) {
    const badge = item.status === 'PASS' ? '✅ PASS' : (item.status === 'WARN' ? '⚠️ WARN' : '❌ FAIL');
    md += `| ${item.index} | [\`${item.slug}\`](https://test1.jupsoft.in/blog/${item.slug}) | ${badge} | ${item.hasHeader ? '✅' : '❌'} | ${item.hasFooter ? '✅' : '❌'} | ${item.imagesCount} | ${item.defects.length > 0 ? item.defects.join('; ') : 'None (Clean)'} |\n`;
  }

  fs.writeFileSync(REPORT_PATH, md, 'utf-8');
  console.log(`\n📄 Report written to: ${REPORT_PATH}`);
  console.log(`===============================================================`);
  console.log(`🎉 AUDIT FINISHED: ${passCount}/${blogs.length} Passed!`);
  console.log(`===============================================================`);
}

runSpectraAudit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
