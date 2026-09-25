const cheerio = require('cheerio');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BLOGS_TO_MIGRATE = [
  {
    title: 'School ERP Software : Jupsoft vs Others',
    url: 'https://jupsoft.com/blog/school-erp-software-jupsoft-vs-others.html',
    slug: 'school-erp-software-jupsoft-vs-others',
    originalDate: '2025-06-06T10:00:00.000Z',
    featuredImage: 'https://jupsoft.com/blog/images/school-erp-software-jupsoft-vs-others.jpg',
    categoryName: 'School ERP',
    focusKeyword: 'School ERP Software',
  },
  {
    title: 'Top 9 School ERP Software Providers in India: Improving Academic Efficiency',
    url: 'https://jupsoft.com/blog/top-9-school-erp-software-providers-in-india-improving-academic-efficiency.html',
    slug: 'top-9-school-erp-software-providers-in-india-improving-academic-efficiency',
    originalDate: '2025-05-19T10:00:00.000Z',
    featuredImage: 'https://jupsoft.com/blog/images/top-9-school-erp-software-provider-in-india.png',
    categoryName: 'EdTech & Management',
    focusKeyword: 'School ERP Software Providers in India',
  }
];

function cleanScrapedHtml($, rootEl, sourceUrl) {
  // Remove navigation, breadcrumbs, social share, scripts, ads
  rootEl.find('script, style, nav, .share, .breadcrumb, .social-share, .tag-cloud, form, .comment-area, footer, header').remove();

  // Make all images absolute
  rootEl.find('img').each((_, img) => {
    const src = $(img).attr('src');
    if (src && !src.startsWith('http')) {
      $(img).attr('src', new URL(src, sourceUrl).href);
    }
    $(img).addClass('rounded-xl shadow-md my-4 max-w-full h-auto');
  });

  // Make all links absolute
  rootEl.find('a').each((_, a) => {
    const href = $(a).attr('href');
    if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
      $(a).attr('href', new URL(href, sourceUrl).href);
    }
    $(a).addClass('text-red-600 hover:text-red-700 underline font-medium');
  });

  // Remove empty paragraphs
  rootEl.find('p').each((_, p) => {
    if ($(p).text().trim() === '' && $(p).find('img').length === 0) {
      $(p).remove();
    }
  });

  return rootEl.html();
}

async function scrapeAndPost(blogMeta) {
  console.log(`\n======================================================`);
  console.log(`📥 Scraping: ${blogMeta.title}`);
  console.log(`🔗 URL: ${blogMeta.url}`);
  console.log(`🏷️ Exact Slug: ${blogMeta.slug}`);

  const res = await fetch(blogMeta.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  // Look for main article body
  let body = $('.col-md-9, .col-sm-12, .blog-detail, .blog-single, .content-para, article, .post-content').first();
  if (!body.length) {
    body = $('body');
  }

  const rawTitle = $('h1').first().text().trim() || blogMeta.title;
  const cleanedTitle = rawTitle.replace(/\s+/g, ' ');

  let contentHtml = cleanScrapedHtml($, body, blogMeta.url);

  // Excerpt
  const firstP = body.find('p').filter((_, p) => $(p).text().trim().length > 30).first().text().trim();
  const excerpt = (firstP || cleanedTitle).slice(0, 180) + '...';

  // Find or create category on site-jupsoft-test
  let category = await prisma.category.findFirst({
    where: {
      websiteId: 'site-jupsoft-test',
      name: blogMeta.categoryName,
    }
  });
  if (!category) {
    category = await prisma.category.create({
      data: {
        websiteId: 'site-jupsoft-test',
        name: blogMeta.categoryName,
        slug: blogMeta.categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: `${blogMeta.categoryName} category articles`,
      }
    });
  }

  // Check if blog already exists on site-jupsoft-test with this slug
  const existingTranslation = await prisma.blogTranslation.findFirst({
    where: {
      slug: blogMeta.slug,
      blog: {
        websiteId: 'site-jupsoft-test',
      }
    },
    include: { blog: true }
  });

  if (existingTranslation) {
    console.log(`⚠️ Blog with slug "${blogMeta.slug}" already exists (ID: ${existingTranslation.blogId}). Updating...`);
    await prisma.blog.update({
      where: { id: existingTranslation.blogId },
      data: {
        status: 'Published',
        publishDate: new Date(blogMeta.originalDate),
        featuredImage: blogMeta.featuredImage,
        featuredImageAlt: cleanedTitle,
        categoryIds: [category.id],
        translations: {
          update: {
            where: { id: existingTranslation.id },
            data: {
              title: cleanedTitle,
              slug: blogMeta.slug,
              excerpt,
              content: contentHtml,
              metaTitle: `${cleanedTitle.slice(0, 55)} | Jupsoft`,
              metaDescription: excerpt,
              focusKeyword: blogMeta.focusKeyword,
            }
          }
        }
      }
    });
    console.log(`✅ Updated existing blog ID: ${existingTranslation.blogId}`);
    return existingTranslation.blogId;
  }

  // Create new blog in database
  const newBlog = await prisma.blog.create({
    data: {
      websiteId: 'site-jupsoft-test',
      authorId: 'usr-superadmin',
      authorName: 'Sachin Sharma (Super Admin)',
      authorAvatar: '/uploads/avatars/avatar-1.webp',
      featuredImage: blogMeta.featuredImage,
      featuredImageAlt: cleanedTitle,
      status: 'Published',
      publishDate: new Date(blogMeta.originalDate),
      publishedBy: 'usr-superadmin',
      viewCount: Math.floor(Math.random() * 200) + 120,
      readTimeMinutes: 5,
      categoryIds: [category.id],
      tagIds: [],
      translations: {
        create: [
          {
            lang: 'en',
            title: cleanedTitle,
            slug: blogMeta.slug,
            excerpt,
            content: contentHtml,
            metaTitle: `${cleanedTitle.slice(0, 55)} | Jupsoft`,
            metaDescription: excerpt,
            focusKeyword: blogMeta.focusKeyword,
          }
        ]
      }
    },
    include: { translations: true }
  });

  console.log(`🎉 SUCCESS! Created blog on site-jupsoft-test:`);
  console.log(`   ID: ${newBlog.id}`);
  console.log(`   Slug: ${newBlog.translations[0]?.slug}`);
  console.log(`   Title: ${newBlog.translations[0]?.title}`);
  console.log(`   Publish Date: ${newBlog.publishDate}`);
  return newBlog.id;
}

async function main() {
  for (const item of BLOGS_TO_MIGRATE) {
    await scrapeAndPost(item);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
