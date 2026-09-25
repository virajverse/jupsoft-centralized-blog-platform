const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const blogsData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'jupsoft-all-blogs.json'), 'utf-8')
  );

  // Fetch all existing blogs on site-jupsoft-test
  const existingBlogs = await prisma.blog.findMany({
    where: { websiteId: 'site-jupsoft-test' },
    include: { translations: true }
  });

  const existingSlugMap = new Map();
  for (const b of existingBlogs) {
    for (const t of b.translations) {
      existingSlugMap.set(t.slug, {
        id: b.id,
        publishDate: b.publishDate,
        status: b.status,
      });
    }
  }

  let migratedCount = 0;
  let pendingCount = 0;

  const rows = blogsData.map((item, idx) => {
    const existing = existingSlugMap.get(item.slug);
    const isDone = !!existing;
    if (isDone) migratedCount++;
    else pendingCount++;

    const statusBadge = isDone ? '✅ **Migrated**' : '⏳ Pending';
    const targetUrl = isDone
      ? `https://test1.jupsoft.in/blog/${item.slug}`
      : `_https://test1.jupsoft.in/blog/${item.slug}_`;

    return `| ${idx + 1} | [${item.title.replace(/\|/g, '\\|')}](${item.url}) | \`${item.slug}\` | ${item.dateText || 'N/A'} | ${statusBadge} | ${targetUrl} |`;
  });

  const percent = ((migratedCount / blogsData.length) * 100).toFixed(1);

  const markdown = `# 📋 Jupsoft Blog Migration Tracker Sheet

> **Target Site:** \`site-jupsoft-test\` (\`test1.jupsoft.in\`)  
> **Source Platform:** [Jupsoft Official Blog](https://jupsoft.com/blog/)  
> **CMS Backend:** [Blogary Admin CMS](https://blogary.jupsoft.com)  
> **Last Synchronized:** ${new Date().toISOString().split('T')[0]}  
> **Slug Matching Policy:** 100% Strict Identity Matching (Exact real slug \`jupsoft.com/blog/[slug].html\` $\\rightarrow$ \`test1.jupsoft.in/blog/[slug]\`)

---

## 📊 Migration Progress Overview

| Metric | Count | Details |
| :--- | :--- | :--- |
| **Total Articles Discovered** | **${blogsData.length}** | Scraped from \`https://jupsoft.com/blog/\` |
| **Successfully Migrated** | **${migratedCount}** | Published with backdate, clean UTF-8, and exact slug |
| **Pending Migration** | **${pendingCount}** | Queued for systematic batch migration |
| **Migration Completion** | **${percent}%** | Target tenant \`site-jupsoft-test\` |

---

## 🎯 Batch 1: Currently Completed Blogs (2 of 2)

| # | Article Title | Target & Source Slug | Published Date | Live Status |
| :-: | :--- | :--- | :-: | :---: |
| **1** | School ERP Software : Jupsoft vs Others | \`school-erp-software-jupsoft-vs-others\` | June 06, 2025 | ✅ **Live on test1.jupsoft.in** |
| **2** | Top 9 School ERP Software Providers in India: Improving Academic Efficiency | \`top-9-school-erp-software-providers-in-india-improving-academic-efficiency\` | May 19, 2025 | ✅ **Live on test1.jupsoft.in** |

---

## 📑 Complete 56-Article Master Migration Sheet

| # | Source Article Title | Exact Matching Slug | Original Date | Status | Target URL (\`test1.jupsoft.in\`) |
| :-: | :--- | :--- | :--- | :-: | :--- |
${rows.join('\n')}

---

## 🛡️ Migration Quality Standard Checklist

1. **Exact Slug Preservation:**
   - Har ek blog ka slug bina kisi modification ke source website se 1:1 match hona mandatory hai.
2. **Zero Mojikake Encoding:**
   - Native Node.js UTF-8 streaming se scrape kiya gaya hai (no \`â€™\` or \`â€”\` corruption).
3. **Authentic Backdating:**
   - Original publication date ko PostgreSQL \`publishDate\` column me retain kiya gaya hai.
4. **Blog Preservation Guarantee:**
   - Agar kisi user ya author ka account delete ya suspend hota hai to blog delete nahi hoga (\`ON DELETE SET NULL\`).
`;

  const outputPath = path.resolve(__dirname, '../../docs/JUPSOFT-BLOG-MIGRATION-TRACKER.md');
  fs.writeFileSync(outputPath, markdown, 'utf-8');
  console.log(`✅ Generated tracker sheet at: ${outputPath}`);
  console.log(`   Migrated: ${migratedCount} | Pending: ${pendingCount} | Total: ${blogsData.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
