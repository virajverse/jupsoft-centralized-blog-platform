const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function main() {
  const res = await fetch('https://jupsoft.com/blog/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  const articles = [];
  const seenSlugs = new Set();

  $('a').each((_, a) => {
    const href = $(a).attr('href') || '';
    if (
      href.endsWith('.html') &&
      !href.includes('about') &&
      !href.includes('contact') &&
      !href.includes('privacy') &&
      !href.includes('terms') &&
      !href.includes('index')
    ) {
      const slug = href.replace('.html', '').replace(/^.*\//, '');
      if (seenSlugs.has(slug)) return;

      const title = $(a).text().trim().replace(/\s+/g, ' ');
      const card = $(a).closest('.col-sm-4, .col-md-4, .blog-item, .post, .item, .col-xs-12, div');
      const dateText = card.find('.date, time, small, p, span').filter((_, el) => {
        const t = $(el).text().trim();
        return /\b(201\d|202\d)\b/.test(t);
      }).first().text().trim();

      let img = card.find('img').attr('src');
      if (img && !img.startsWith('http')) {
        img = 'https://jupsoft.com/blog/' + img.replace(/^\//, '');
      }

      if (title.length > 5 && slug.length > 3) {
        seenSlugs.add(slug);
        articles.push({
          index: articles.length + 1,
          slug,
          title,
          url: href.startsWith('http') ? href : `https://jupsoft.com/blog/${href}`,
          dateText,
          img: img || ''
        });
      }
    }
  });

  console.log(`Saved ${articles.length} articles to jupsoft-all-blogs.json`);
  fs.writeFileSync(
    path.join(__dirname, 'jupsoft-all-blogs.json'),
    JSON.stringify(articles, null, 2),
    'utf-8'
  );
}

main().catch(console.error);
