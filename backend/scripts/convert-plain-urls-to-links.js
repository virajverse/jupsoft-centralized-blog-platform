const { PrismaClient } = require('@prisma/client');
const cheerio = require('cheerio');

const prisma = new PrismaClient();
const WEBSITE_ID = 'site-jupsoft-test';

async function convertPlainUrlsToLinks() {
  console.log('===============================================================');
  console.log('🔗 CONVERTING ALL RAW PLAIN-TEXT URLS TO CLICKABLE ANCHORS');
  console.log('===============================================================');

  const translations = await prisma.blogTranslation.findMany({
    where: { blog: { websiteId: WEBSITE_ID } }
  });

  let totalUpdated = 0;

  for (const tr of translations) {
    let content = tr.content || '';
    let hasChanges = false;

    // Regex to match URLs that are NOT inside href="..." or src="..."
    // Matches https://... or http://... in text
    // Replace "<strong>Website:</strong> https://..." with clickable link
    const updatedContent = content.replace(/(<strong>Website\s*:\s*<\/strong>\s*)(https?:\/\/[^\s<>"']+)/gi, (match, prefix, url) => {
      hasChanges = true;
      const cleanUrl = url.replace(/[.,;:]+$/, '');
      return `${prefix}<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline font-medium">${cleanUrl}</a>`;
    });

    // Also general URL autolinker for any other raw URLs in <p> tags
    const $ = cheerio.load(updatedContent);
    $('p, li, td').each((_, el) => {
      // If element has no child <a> tags, check if it contains a raw URL
      if ($(el).find('a').length === 0) {
        const text = $(el).html();
        if (text && /(https?:\/\/[^\s<>"']+)/i.test(text) && !text.includes('src=')) {
          const linkedText = text.replace(/(https?:\/\/[^\s<>"']+)/gi, (url) => {
            const cleanUrl = url.replace(/[.,;:]+$/, '');
            if (cleanUrl.includes('schema.org') || cleanUrl.includes('w3.org')) return url;
            hasChanges = true;
            return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline font-medium">${cleanUrl}</a>`;
          });
          $(el).html(linkedText);
        }
      }
    });

    const finalHtml = $('body').html() || updatedContent;

    if (hasChanges || finalHtml !== content) {
      await prisma.blogTranslation.update({
        where: { id: tr.id },
        data: { content: finalHtml }
      });
      console.log(`   ✅ Converted plain URLs into clickable links for: ${tr.slug}`);
      totalUpdated++;
    }
  }

  console.log(`\n🎉 Completed! Updated ${totalUpdated} blog(s) with clickable links.`);
}

convertPlainUrlsToLinks()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
