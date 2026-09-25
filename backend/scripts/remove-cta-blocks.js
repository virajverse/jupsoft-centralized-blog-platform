const { PrismaClient } = require('@prisma/client');
const cheerio = require('cheerio');

const prisma = new PrismaClient();
const WEBSITE_ID = 'site-jupsoft-test';

async function removeAllCtaBlocks() {
  console.log('===============================================================');
  console.log('🗑️ REMOVING INJECTED CTA BLOCKS FROM ALL BLOGS (Option A)');
  console.log('===============================================================');

  const translations = await prisma.blogTranslation.findMany({
    where: {
      blog: { websiteId: WEBSITE_ID }
    },
    include: { blog: true }
  });

  console.log(`Found ${translations.length} articles to check on ${WEBSITE_ID}...`);

  let removedCount = 0;

  for (const tr of translations) {
    let content = tr.content || '';

    if (content.includes('Transform Your Institution with Jupsoft') || content.includes('Book a Free Demo')) {
      const $ = cheerio.load(content);

      // Remove any div or container with the CTA text
      $('div').each((_, el) => {
        const text = $(el).text();
        if (text.includes('Transform Your Institution with Jupsoft') || text.includes('Book a Free Demo')) {
          $(el).remove();
        }
      });

      // Also clean any stray anchor tag
      $('a').each((_, a) => {
        if ($(a).text().includes('Book a Free Demo')) {
          $(a).remove();
        }
      });

      const cleanedHtml = $('body').html() || content;

      await prisma.blogTranslation.update({
        where: { id: tr.id },
        data: { content: cleanedHtml }
      });

      console.log(`   ✅ Removed CTA from: ${tr.slug}`);
      removedCount++;
    }
  }

  console.log(`\n🎉 Completed! Successfully removed injected CTA from ${removedCount} blogs.`);

  // Verify
  const remaining = await prisma.blogTranslation.count({
    where: {
      blog: { websiteId: WEBSITE_ID },
      content: { contains: 'Transform Your Institution with Jupsoft' }
    }
  });

  console.log(`Remaining CTA blocks in DB: ${remaining} (Target: 0)`);
}

removeAllCtaBlocks()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
