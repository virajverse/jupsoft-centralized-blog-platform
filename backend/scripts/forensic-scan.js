const { PrismaClient } = require('@prisma/client');
const cheerio = require('cheerio');

const prisma = new PrismaClient();
const WEBSITE_ID = 'site-jupsoft-test';

async function forensicScan() {
  console.log('===============================================================');
  console.log('🔬 DEEP FORENSIC SCAN: All 56 Blogs on site-jupsoft-test');
  console.log('===============================================================');

  const blogs = await prisma.blog.findMany({
    where: { websiteId: WEBSITE_ID },
    include: { translations: true }
  });

  console.log(`Found ${blogs.length} blogs in database.\n`);

  const report = [];

  for (let i = 0; i < blogs.length; i++) {
    const b = blogs[i];
    const tr = b.translations[0];
    if (!tr) {
      report.push({ index: i + 1, id: b.id, slug: 'MISSING_TRANSLATION', issues: ['NO_TRANSLATION'] });
      continue;
    }

    const issues = [];
    const html = tr.content || '';
    const $ = cheerio.load(html);

    // 1. Check headings
    const h1Count = $('h1').length;
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;
    const h4Count = $('h4').length;
    if (h1Count > 0) {
      issues.push(`H1_INSIDE_CONTENT (${h1Count} found - should be H2 for SEO)`);
    }
    if (h2Count === 0 && h3Count === 0 && h4Count === 0) {
      issues.push('NO_SUBHEADINGS (Lacks H2/H3 structure)');
    }

    // 2. Check bullet points
    const ulCount = $('ul').length;
    const olCount = $('ol').length;
    const liCount = $('li').length;
    
    // Check if bullets are fake (e.g. • or &bull; or - or * in <p>)
    let fakeBullets = 0;
    $('p').each((_, p) => {
      const txt = $(p).text().trim();
      if (/^[•\-\*]\s+|^\d+\.\s+|^&bull;\s+/i.test(txt)) {
        fakeBullets++;
      }
    });
    if (fakeBullets > 0) {
      issues.push(`RAW_BULLETS_IN_P (${fakeBullets} bullet points styled as <p> instead of <ul><li>)`);
    }

    // 3. Check Images inside content
    let relativeImgCount = 0;
    let missingAltCount = 0;
    $('img').each((_, img) => {
      const src = $(img).attr('src') || '';
      if (!src.startsWith('http') && !src.startsWith('data:')) {
        relativeImgCount++;
      }
      if (!$(img).attr('alt') || $(img).attr('alt').trim() === '') {
        missingAltCount++;
      }
    });
    if (relativeImgCount > 0) {
      issues.push(`RELATIVE_IMAGES (${relativeImgCount} relative img src)`);
    }
    if (missingAltCount > 0) {
      issues.push(`MISSING_IMG_ALT (${missingAltCount} images without alt)`);
    }

    // 4. Check Featured Image
    if (!b.featuredImage || b.featuredImage === '') {
      issues.push('MISSING_FEATURED_IMAGE');
    }

    // 5. Check Encoding / Mojikake / Glued words
    if (/[âÃ][\x80-\xBF]/.test(html)) {
      issues.push('MOJIKAKE_ENCODING_FOUND');
    }
    if (/([a-zA-Z0-9])<a/g.test(html) || /<\/a>([a-zA-Z0-9])/g.test(html)) {
      issues.push('GLUED_WORDS_AROUND_LINKS');
    }

    // 6. Check Residual scrap junk (nav, share, breadcrumb, sidebar)
    if ($('nav, .share, .breadcrumb, .social-share, .social, form, footer, header').length > 0) {
      issues.push('RESIDUAL_JUNK_ELEMENTS');
    }

    // 7. Check CTA
    if (!html.includes('Transform Your Institution with Jupsoft') && !html.includes('Book a Free Demo')) {
      issues.push('MISSING_BRANDED_CTA');
    }

    // 8. Word count / Length
    const textOnly = html.replace(/<[^>]*>/g, ' ').trim();
    const wordCount = textOnly.split(/\s+/).filter(Boolean).length;
    if (wordCount < 150) {
      issues.push(`THIN_CONTENT (Only ${wordCount} words)`);
    }

    report.push({
      index: i + 1,
      id: b.id,
      slug: tr.slug,
      title: tr.title,
      wordCount,
      headings: { h1: h1Count, h2: h2Count, h3: h3Count, h4: h4Count },
      lists: { ul: ulCount, ol: olCount, li: liCount, fakeBullets },
      featuredImage: b.featuredImage,
      issues
    });
  }

  // Summary statistics
  const flawed = report.filter(r => r.issues.length > 0);
  console.log(`📊 SCAN SUMMARY:`);
  console.log(`   Total Blogs Scanned: ${report.length}`);
  console.log(`   Clean Blogs: ${report.length - flawed.length}`);
  console.log(`   Blogs with Identified Issues: ${flawed.length}\n`);

  console.log('--- DETAILED DEFECT BREAKDOWN ---');
  for (const item of flawed) {
    console.log(`[#${item.index}] ${item.slug}`);
    console.log(`    Title: "${item.title.slice(0, 50)}..."`);
    console.log(`    Words: ${item.wordCount} | H1:${item.headings.h1} H2:${item.headings.h2} H3:${item.headings.h3} | UL:${item.lists.ul} OL:${item.lists.ol} LI:${item.lists.li}`);
    console.log(`    Issues: ⚠️  ${item.issues.join(' | ')}`);
  }
}

forensicScan()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
