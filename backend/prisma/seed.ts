import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Jupsoft Blog Platform Database...');

  // 1. Seed Websites
  const websites = [
    {
      id: 'web-1',
      name: 'Jupsoft Systems',
      domain: 'jupsoft.com',
      logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=120&q=80',
      description: 'Enterprise ERP, Cloud Infrastructure & EdTech solutions.',
      apiKey: 'jup_live_sec_9934afbc82a104',
      s3Prefix: 'blogs/jupsoft/',
      status: 'active',
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'hi', 'fr', 'ar'],
      revalidateWebhookUrl: 'https://jupsoft.com/api/revalidate',
    },
    {
      id: 'web-2',
      name: 'DigifyNext',
      domain: 'digifynext.com',
      logoUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=120&q=80',
      description: 'Next-generation Digital Marketing, SEO, and Performance Analytics.',
      apiKey: 'digi_live_sec_8821ecde71a209',
      s3Prefix: 'blogs/digifynext/',
      status: 'active',
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'hi'],
      revalidateWebhookUrl: 'https://digifynext.com/api/revalidate',
    },
    {
      id: 'web-3',
      name: 'School ERP',
      domain: 'schoolerp.in',
      logoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=120&q=80',
      description: 'Dedicated K-12 and University Automation & Student Information System.',
      apiKey: 'erp_live_sec_7710bba190c301',
      s3Prefix: 'blogs/schoolerp/',
      status: 'active',
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'hi'],
      revalidateWebhookUrl: 'https://schoolerp.in/api/revalidate',
    },
  ];

  for (const site of websites) {
    await prisma.website.upsert({
      where: { id: site.id },
      update: site,
      create: site,
    });
  }
  console.log(`✅ Seeded ${websites.length} websites.`);

  // 2. Seed Admin User
  const passwordHash = await bcrypt.hash('Admin@12345', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@jupsoft.com' },
    update: {},
    create: {
      id: 'usr-admin-1',
      email: 'admin@jupsoft.com',
      passwordHash,
      name: 'Sarah Jenkins',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
      status: 'active',
      lastLoginIp: '192.168.1.42',
    },
  });

  // Assign Super Admin role across all sites
  await prisma.userRoleAssignment.upsert({
    where: {
      userId_websiteId: {
        userId: adminUser.id,
        websiteId: 'web-1',
      },
    },
    update: { role: 'Super Admin' },
    create: {
      userId: adminUser.id,
      websiteId: 'web-1',
      role: 'Super Admin',
    },
  });

  console.log('✅ Seeded admin user: admin@jupsoft.com (Password: Admin@12345)');

  // 3. Seed Starter Blog Article
  const starterBlog = await prisma.blog.upsert({
    where: { id: 'blog-seed-1' },
    update: {},
    create: {
      id: 'blog-seed-1',
      websiteId: 'web-1',
      authorId: adminUser.id,
      authorName: adminUser.name,
      authorAvatar: adminUser.avatar,
      featuredImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
      featuredImageAlt: 'AI Cloud Transformation in Enterprise ERP',
      status: 'Published',
      publishDate: new Date(),
      readTimeMinutes: 4,
      categoryIds: ['cat-tech'],
      tagIds: ['tag-cloud'],
      translations: {
        create: [
          {
            lang: 'en',
            title: 'The AI-Powered Shift: Modern Cloud ERP Architecture in 2026',
            slug: 'ai-powered-shift-modern-cloud-erp',
            excerpt: 'How centralized cloud infrastructure and LLM agents are redefining educational institution workflows and administrative throughput.',
            content: '<h2>The Paradigm Shift in Enterprise ERP</h2><p>Enterprise cloud architecture in 2026 requires continuous data streaming, unified micro-frontends, and intelligent automation agents.</p><p>By integrating Next.js 15 App Router and automated on-demand revalidation, institutions eliminate cache staleness while guaranteeing sub-second page loads.</p>',
            metaTitle: 'The AI-Powered Shift: Modern Cloud ERP Architecture in 2026',
            metaDescription: 'Explore how centralized cloud infrastructure and LLM agents are redefining enterprise ERP workflows in 2026.',
            metaKeywords: 'ERP, Cloud Architecture, Next.js, Webhooks, AI in Enterprise',
            canonicalUrl: 'https://jupsoft.com/blog/ai-powered-shift-modern-cloud-erp',
            focusKeyword: 'Cloud ERP Architecture',
            robots: 'index, follow',
            ogTitle: 'The AI-Powered Shift: Modern Cloud ERP Architecture in 2026',
            ogDescription: 'Explore modern cloud ERP architecture and AI-driven automation.',
            ogImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
            twitterTitle: 'The AI-Powered Shift: Modern Cloud ERP Architecture in 2026',
            twitterDescription: 'Explore modern cloud ERP architecture and AI-driven automation.',
            twitterImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
          },
        ],
      },
    },
  });

  console.log(`✅ Seeded starter published article: "${starterBlog.id}"`);
  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
