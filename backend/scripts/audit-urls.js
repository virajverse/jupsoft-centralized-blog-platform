const { PrismaClient } = require('@prisma/client');
const cheerio = require('cheerio');

const prisma = new PrismaClient();
const WEBSITE_ID = 'site-jupsoft-test';

async function auditUrls() {
  console.log('===============================================================');
  console.log('🔗 AUDITING RAW URLS & COMPETITOR LINKS ACROSS 56 BLOGS');
  console.log('===============================================================');

  const blogs = await prisma.blogTranslation.findMany({
    where: { blog: { websiteId: WEBSITE_ID } }
  });

  const unlinkedUrlsMap = [];

  for (const b of blogs) {
    const html = b.content || '';
    const $ = cheerio.load(html);

    // Remove code, script, style tags
    $('script, style').remove();

    // Check all text nodes outside <a> and <img>
    const unlinkedUrls = [];

    $('p, li, td, th, div, span').each((_, el) => {
      // Direct text of element, excluding children <a>
      const clone = $(el).clone();
      clone.find('a, img, iframe').remove();
      const text = clone.text();

      // Match URLs: http:// or https:// or www.
      const urlRegex = /(https?:\/\/[^\s<>"'\)]+|www\.[^\s<>"'\)]+)/gi;
      let match;
      while ((match = urlRegex.exec(text)) !== null) {
        let matchedUrl = match[1];
        // Clean trailing punctuation
        matchedUrl = matchedUrl.replace(/[.,;:]+$/, '');
        if (!unlinkedUrls.includes(matchedUrl) && !matchedUrl.includes('schema.org') && !matchedUrl.includes('w3.org')) {
          unlinkedUrls.push(matchedUrl);
        }
      }
    });

    if (unlinkedUrls.length > 0) {
      unlinkedUrlsMap.push({
        slug: b.slug,
        title: b.title,
        unlinkedUrls
      });
    }
  }

  console.log(`Found ${unlinkedUrlsMap.length} blogs containing plain-text unclickable URLs:\n`);
  for (const item of unlinkedUrlsMap) {
    console.log(`[SLUG] ${item.slug}`);
    console.log(`       Unlinked URLs (${item.unlinkedUrls.length}):`);
    item.unlinkedUrls.forEach(u => console.log(`         👉 ${u}`));
  }
}

auditUrls()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
