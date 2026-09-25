const { PrismaClient } = require('@prisma/client');
const cheerio = require('cheerio');

const prisma = new PrismaClient();
const WEBSITE_ID = 'site-jupsoft-test';

async function updateRealImages() {
  console.log('📥 Fetching real card image mappings from https://jupsoft.com/blog/ ...');
  const res = await fetch('https://jupsoft.com/blog/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const cardMap = {};
  $('a').each((_, a) => {
    const href = $(a).attr('href') || '';
    if (href.includes('.html')) {
      const slug = href.split('/').pop().replace('.html', '').trim();
      const parent = $(a).closest('.col-sm-4, .col-md-4, .blog-card, .col-sm-6, .col-sm-12, div');
      const img = $(a).find('img').attr('src') || parent.find('img').first().attr('src');
      if (img && !cardMap[slug]) {
        const fullImg = img.startsWith('http') ? img : new URL(img, 'https://jupsoft.com/blog/').href;
        cardMap[slug] = fullImg;
      }
    }
  });

  console.log(`✅ Extracted real image mappings for ${Object.keys(cardMap).length} articles.`);

  const blogs = await prisma.blog.findMany({
    where: { websiteId: WEBSITE_ID },
    include: { translations: true }
  });

  console.log(`🔍 Checking & updating ${blogs.length} blogs in database...`);

  let updatedCount = 0;
  for (const b of blogs) {
    const slug = b.translations[0]?.slug;
    if (!slug) continue;

    const realImg = cardMap[slug];
    if (realImg && realImg !== b.featuredImage) {
      await prisma.blog.update({
        where: { id: b.id },
        data: { featuredImage: realImg }
      });
      console.log(`   🖼️ [UPDATED] ${slug} -> ${realImg}`);
      updatedCount++;
    }
  }

  console.log(`\n🎉 Finished! Updated ${updatedCount} blogs with verified real high-res images.`);
}

updateRealImages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
