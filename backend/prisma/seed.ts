import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Jupsoft Centralized Blog Platform Database with Real Enterprise Data...');

  // 1. Clean existing blogs, translations, categories, tags, redirects, role assignments for fresh SaaS baseline
  await prisma.workflowLog.deleteMany({});
  await prisma.blogTranslation.deleteMany({});
  await prisma.blogCategory.deleteMany({});
  await prisma.blogTag.deleteMany({});
  await prisma.blog.deleteMany({});
  await prisma.redirect.deleteMany({});
  await prisma.mediaAsset.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.userRoleAssignment.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.website.deleteMany({});

  // 2. Seed 3 High-Performance Multi-Tenant Websites
  const websites = [
    {
      id: 'site-cloud',
      name: 'Jupsoft Cloud & ERP',
      domain: 'localhost:5001',
      logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=120&q=80',
      description: 'Enterprise Cloud ERP, Distributed Systems & AI Infrastructure.',
      apiKey: 'jup_live_sec_cloud_9934afbc82a104',
      s3Prefix: 'blogs/cloud/',
      status: 'active',
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'hi', 'fr', 'ar'],
      revalidateWebhookUrl: 'http://localhost:5001/api/revalidate',
    },
    {
      id: 'site-growth',
      name: 'DigifyNext Marketing',
      domain: 'localhost:5002',
      logoUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=120&q=80',
      description: 'Performance SEO, Conversion Funnels & Growth Marketing Analytics.',
      apiKey: 'digi_live_sec_growth_8821ecde71a209',
      s3Prefix: 'blogs/growth/',
      status: 'active',
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'hi'],
      revalidateWebhookUrl: 'http://localhost:5002/api/revalidate',
    },
    {
      id: 'site-edtech',
      name: 'School ERP Platform',
      domain: 'localhost:5003',
      logoUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=120&q=80',
      description: 'K-12 School Management, Exam Portals & Student Information Systems.',
      apiKey: 'erp_live_sec_edtech_7710bba190c301',
      s3Prefix: 'blogs/edtech/',
      status: 'active',
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'hi', 'ar'],
      revalidateWebhookUrl: 'http://localhost:5003/api/revalidate',
    },
  ];

  for (const site of websites) {
    await prisma.website.create({ data: site });
  }
  console.log('✅ Seeded ' + websites.length + ' high-performance websites.');

  // 3. Seed Enterprise Organization Users across all Tiers (Password: Admin@12345)
  const defaultPasswordHash = await bcrypt.hash('Admin@12345', 10);

  const users = [
    {
      id: 'usr-superadmin',
      name: 'Aarav Sharma (Super Admin)',
      email: 'admin@jupsoft.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&auto=format&fit=crop&q=80',
      status: 'active',
      lastLoginIp: '192.168.1.1',
      roles: [
        { websiteId: 'site-cloud', role: 'Super Admin' },
        { websiteId: 'site-growth', role: 'Super Admin' },
        { websiteId: 'site-edtech', role: 'Super Admin' },
      ],
    },
    {
      id: 'usr-siteadmin-cloud',
      name: 'Rohit Verma (Cloud Admin)',
      email: 'admin@cloud.jupsoft.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&auto=format&fit=crop&q=80',
      status: 'active',
      lastLoginIp: '192.168.1.15',
      roles: [
        { websiteId: 'site-cloud', role: 'Website Admin' },
      ],
    },
    {
      id: 'usr-siteadmin-growth',
      name: 'Neha Kapoor (Growth Admin)',
      email: 'admin@growth.digifynext.com',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&auto=format&fit=crop&q=80',
      status: 'active',
      lastLoginIp: '10.0.1.22',
      roles: [
        { websiteId: 'site-growth', role: 'Website Admin' },
      ],
    },
    {
      id: 'usr-roleadmin-editor',
      name: 'Sameer Joshi (Lead Editor)',
      email: 'lead.editor@jupsoft.com',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&auto=format&fit=crop&q=80',
      status: 'active',
      lastLoginIp: '192.168.1.42',
      roles: [
        { websiteId: 'site-cloud', role: 'Role Admin' },
      ],
    },
    {
      id: 'usr-editor',
      name: 'Priya Sen (Editor)',
      email: 'editor@jupsoft.com',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=96&auto=format&fit=crop&q=80',
      status: 'active',
      lastLoginIp: '192.168.1.55',
      roles: [
        { websiteId: 'site-cloud', role: 'Editor' },
      ],
    },
    {
      id: 'usr-writer',
      name: 'Ananya Roy (Content Writer)',
      email: 'writer@jupsoft.com',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=96&auto=format&fit=crop&q=80',
      status: 'active',
      lastLoginIp: '192.168.1.88',
      roles: [
        { websiteId: 'site-cloud', role: 'Content Writer' },
      ],
    },
    {
      id: 'usr-seo',
      name: 'Vikram Mehta (SEO Manager)',
      email: 'seo@jupsoft.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&auto=format&fit=crop&q=80',
      status: 'active',
      lastLoginIp: '192.168.1.99',
      roles: [
        { websiteId: 'site-cloud', role: 'SEO Manager' },
        { websiteId: 'site-growth', role: 'SEO Manager' },
      ],
    },
    {
      id: 'usr-publisher',
      name: 'Karan Malhotra (Publisher)',
      email: 'publisher@jupsoft.com',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=96&auto=format&fit=crop&q=80',
      status: 'active',
      lastLoginIp: '192.168.1.101',
      roles: [
        { websiteId: 'site-cloud', role: 'Publisher' },
      ],
    },
  ];

  for (const u of users) {
    const createdUser = await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        passwordHash: defaultPasswordHash,
        name: u.name,
        avatar: u.avatar,
        status: u.status,
        lastLoginIp: u.lastLoginIp,
      },
    });

    for (const r of u.roles) {
      await prisma.userRoleAssignment.create({
        data: {
          userId: createdUser.id,
          websiteId: r.websiteId,
          role: r.role,
        },
      });
    }
  }
  console.log('✅ Seeded ' + users.length + ' enterprise users across Super Admin, Website Admin, Role Admin, and Contributor tiers.');

  // 4. Seed Taxonomy: Categories & Tags for all 3 Sites
  const categories = [
    // Site 1: Jupsoft Cloud
    { id: 'cat-cloud-infra', websiteId: 'site-cloud', name: 'Cloud Infrastructure', slug: 'cloud-infrastructure', description: 'AWS, Hybrid & Kubernetes deployments' },
    { id: 'cat-cloud-erp', websiteId: 'site-cloud', name: 'ERP Automation', slug: 'erp-automation', description: 'Automated finance and operations' },
    { id: 'cat-cloud-ai', websiteId: 'site-cloud', name: 'Enterprise AI', slug: 'enterprise-ai', description: 'Generative AI and workflow agents' },

    // Site 2: DigifyNext Growth
    { id: 'cat-growth-seo', websiteId: 'site-growth', name: 'Technical SEO', slug: 'technical-seo', description: 'Core Web Vitals and SERP indexation' },
    { id: 'cat-growth-content', websiteId: 'site-growth', name: 'Content Marketing', slug: 'content-marketing', description: 'B2B audience acquisition' },
    { id: 'cat-growth-cro', websiteId: 'site-growth', name: 'Conversion Optimization', slug: 'conversion-optimization', description: 'Funnel analytics and A/B testing' },

    // Site 3: School ERP EdTech
    { id: 'cat-edtech-k12', websiteId: 'site-edtech', name: 'K-12 Automation', slug: 'k-12-automation', description: 'Digital campus administration' },
    { id: 'cat-edtech-exams', websiteId: 'site-edtech', name: 'Examination Portals', slug: 'examination-portals', description: 'Online evaluation and gradebooks' },
    { id: 'cat-edtech-analytics', websiteId: 'site-edtech', name: 'Student Analytics', slug: 'student-analytics', description: 'Attendance, performance and learning curves' },
  ];

  for (const c of categories) {
    await prisma.category.create({ data: c });
  }
  console.log('✅ Seeded ' + categories.length + ' taxonomy categories across 3 sites.');

  const tags = [
    { id: 'tag-cloud-k8s', websiteId: 'site-cloud', name: 'Kubernetes', slug: 'kubernetes' },
    { id: 'tag-cloud-ai', websiteId: 'site-cloud', name: 'AI Agents', slug: 'ai-agents' },
    { id: 'tag-growth-serp', websiteId: 'site-growth', name: 'SERP Ranking', slug: 'serp-ranking' },
    { id: 'tag-growth-b2b', websiteId: 'site-growth', name: 'B2B Funnel', slug: 'b2b-funnel' },
    { id: 'tag-edtech-sis', websiteId: 'site-edtech', name: 'Student Records', slug: 'student-records' },
    { id: 'tag-edtech-smart', websiteId: 'site-edtech', name: 'Smart Campus', slug: 'smart-campus' },
  ];

  for (const t of tags) {
    await prisma.tag.create({ data: t });
  }
  console.log('✅ Seeded ' + tags.length + ' taxonomy tags.');

  // 5. Seed Realistic Multi-Tenant Blog Articles across Workflow Stages
  const authorSuper = await prisma.user.findUnique({ where: { email: 'admin@jupsoft.com' } });
  const authorWriter = await prisma.user.findUnique({ where: { email: 'writer@jupsoft.com' } });
  const authorEditor = await prisma.user.findUnique({ where: { email: 'editor@jupsoft.com' } });

  const articlesData = [
    // ────────────── SITE 1: Jupsoft Cloud Articles ──────────────
    {
      id: 'art-cloud-1',
      websiteId: 'site-cloud',
      authorId: authorSuper!.id,
      authorName: authorSuper!.name,
      authorAvatar: authorSuper!.avatar,
      featuredImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
      featuredImageAlt: 'Modern Cloud ERP Architecture in 2026',
      status: 'Published',
      publishDate: new Date('2026-03-01T10:00:00Z'),
      viewCount: 4280,
      readTimeMinutes: 5,
      categoryIds: ['cat-cloud-erp', 'cat-cloud-infra'],
      tagIds: ['tag-cloud-k8s'],
      translations: [
        {
          lang: 'en',
          title: 'The AI-Powered Shift: Modern Cloud ERP Architecture in 2026',
          slug: 'ai-powered-shift-modern-cloud-erp-2026',
          excerpt: 'How centralized cloud infrastructure and LLM agents are redefining enterprise ERP workflows.',
          content: '<h2>Enterprise Cloud ERP Evolution</h2><p>Modern enterprises in 2026 demand zero-downtime micro-frontends and instant real-time data streaming across international subsidiaries.</p><p>By leveraging Next.js on-demand ISR revalidation and PostgreSQL JSON-LD schemas, teams eliminate stale cache while sustaining sub-second latency.</p>',
          metaTitle: 'Modern Cloud ERP Architecture in 2026 | Jupsoft Cloud',
          metaDescription: 'Discover how cloud infrastructure and AI automation agents power modern enterprise ERP systems.',
          metaKeywords: 'Cloud ERP, Next.js, Microservices, Enterprise Architecture',
          canonicalUrl: 'https://cloud.jupsoft.com/blog/ai-powered-shift-modern-cloud-erp-2026',
          focusKeyword: 'Cloud ERP Architecture',
          robots: 'index, follow',
          ogTitle: 'The AI-Powered Shift: Modern Cloud ERP Architecture in 2026',
          ogDescription: 'Explore the modern cloud architecture powering next-generation enterprise ERP.',
          ogImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
        },
      ],
    },
    {
      id: 'art-cloud-2',
      websiteId: 'site-cloud',
      authorId: authorEditor!.id,
      authorName: authorEditor!.name,
      authorAvatar: authorEditor!.avatar,
      featuredImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
      featuredImageAlt: 'Scaling Microservices on Kubernetes',
      status: 'Approved',
      publishDate: null,
      viewCount: 0,
      readTimeMinutes: 6,
      categoryIds: ['cat-cloud-infra'],
      tagIds: ['tag-cloud-k8s'],
      translations: [
        {
          lang: 'en',
          title: 'Architecting Resilient Multi-Region Microservices with Kubernetes',
          slug: 'resilient-multi-region-microservices-kubernetes',
          excerpt: 'Production patterns for active-active multi-region databases and automated failover.',
          content: '<h2>Zero Downtime Deployment Patterns</h2><p>Multi-region Kubernetes clusters safeguard enterprise operations against cloud availability zone failures.</p>',
          metaTitle: 'Architecting Resilient Microservices with Kubernetes',
          metaDescription: 'Best practices for multi-region microservices and active-active database clustering.',
          canonicalUrl: 'https://cloud.jupsoft.com/blog/resilient-multi-region-microservices-kubernetes',
          focusKeyword: 'Kubernetes Microservices',
          robots: 'index, follow',
        },
      ],
    },
    {
      id: 'art-cloud-3',
      websiteId: 'site-cloud',
      authorId: authorWriter!.id,
      authorName: authorWriter!.name,
      authorAvatar: authorWriter!.avatar,
      featuredImage: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=1200&q=80',
      featuredImageAlt: 'Autonomous AI Agents in Core Banking',
      status: 'Under Review',
      publishDate: null,
      viewCount: 0,
      readTimeMinutes: 4,
      categoryIds: ['cat-cloud-ai'],
      tagIds: ['tag-cloud-ai'],
      translations: [
        {
          lang: 'en',
          title: 'Deploying Autonomous AI Agents in Core Banking Workflows',
          slug: 'autonomous-ai-agents-core-banking-workflows',
          excerpt: 'How autonomous LLM reasoning loops automate reconciliation and ledger audits with cryptographic proofs.',
          content: '<h2>Autonomous Financial Auditing</h2><p>Financial institutions are replacing batch reconciliation with live AI verification pipelines.</p>',
          metaTitle: 'Deploying Autonomous AI Agents in Banking',
          metaDescription: 'Explore autonomous AI agents in banking ledger workflows.',
          canonicalUrl: 'https://cloud.jupsoft.com/blog/autonomous-ai-agents-core-banking-workflows',
          focusKeyword: 'Autonomous Banking AI',
          robots: 'noindex, nofollow',
        },
      ],
    },
    {
      id: 'art-cloud-4',
      websiteId: 'site-cloud',
      authorId: authorWriter!.id,
      authorName: authorWriter!.name,
      authorAvatar: authorWriter!.avatar,
      featuredImage: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
      featuredImageAlt: 'Zero Downtime Migration to Micro Frontends',
      status: 'Draft',
      publishDate: null,
      viewCount: 0,
      readTimeMinutes: 3,
      categoryIds: ['cat-cloud-infra'],
      tagIds: ['tag-cloud-k8s'],
      translations: [
        {
          lang: 'en',
          title: 'Zero-Downtime Migration to Next.js Micro-Frontends',
          slug: 'zero-downtime-migration-nextjs-micro-frontends',
          excerpt: 'A practical migration blueprint from monolithic CMS portals to distributed Next.js edge micro-frontends.',
          content: '<h2>Deconstructing Monolithic Frontends</h2><p>Draft guide explaining edge routing, cookie delegation, and token rotation.</p>',
          metaTitle: 'Zero-Downtime Micro-Frontends Migration',
          metaDescription: 'Draft technical guide on migrating to Next.js micro-frontends.',
          canonicalUrl: 'https://cloud.jupsoft.com/blog/zero-downtime-migration-nextjs-micro-frontends',
          focusKeyword: 'Next.js Micro-Frontends',
          robots: 'noindex, nofollow',
        },
      ],
    },

    // ────────────── SITE 2: DigifyNext Marketing Articles ──────────────
    {
      id: 'art-growth-1',
      websiteId: 'site-growth',
      authorId: authorSuper!.id,
      authorName: authorSuper!.name,
      authorAvatar: authorSuper!.avatar,
      featuredImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
      featuredImageAlt: 'Technical SEO Playbook 2026',
      status: 'Published',
      publishDate: new Date('2026-03-05T14:30:00Z'),
      viewCount: 8910,
      readTimeMinutes: 7,
      categoryIds: ['cat-growth-seo'],
      tagIds: ['tag-growth-serp'],
      translations: [
        {
          lang: 'en',
          title: 'The Enterprise Technical SEO Playbook for 2026',
          slug: 'enterprise-technical-seo-playbook-2026',
          excerpt: 'Core Web Vitals INP optimization, automated schema markup, and hreflang best practices for headless Next.js blogs.',
          content: '<h2>Winning Search Real Estate in 2026</h2><p>With Google prioritizing fast Core Web Vitals and structured JSON-LD schemas, technical excellence directly drives conversion.</p>',
          metaTitle: 'Enterprise Technical SEO Playbook 2026 | DigifyNext',
          metaDescription: 'Master modern technical SEO with Next.js ISR, JSON-LD schemas, and Core Web Vitals optimization.',
          canonicalUrl: 'https://growth.digifynext.com/blog/enterprise-technical-seo-playbook-2026',
          focusKeyword: 'Technical SEO Playbook',
          robots: 'index, follow',
        },
      ],
    },
    {
      id: 'art-growth-2',
      websiteId: 'site-growth',
      authorId: authorSuper!.id,
      authorName: authorSuper!.name,
      authorAvatar: authorSuper!.avatar,
      featuredImage: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
      featuredImageAlt: 'B2B Funnel Optimization Framework',
      status: 'Under Review',
      publishDate: null,
      viewCount: 0,
      readTimeMinutes: 5,
      categoryIds: ['cat-growth-cro', 'cat-growth-content'],
      tagIds: ['tag-growth-b2b'],
      translations: [
        {
          lang: 'en',
          title: 'B2B SaaS Funnel Optimization: From Cold Impression to Demo',
          slug: 'b2b-saas-funnel-optimization-demo',
          excerpt: 'Data-backed conversion rate strategies to multiply enterprise trial bookings.',
          content: '<h2>High-Converting B2B Lead Funnels</h2><p>Reviewing audience journey maps and automated retargeting sequences.</p>',
          metaTitle: 'B2B SaaS Funnel Optimization Framework',
          metaDescription: 'Learn data-backed conversion rate optimization strategies.',
          canonicalUrl: 'https://growth.digifynext.com/blog/b2b-saas-funnel-optimization-demo',
          focusKeyword: 'B2B Funnel Optimization',
          robots: 'noindex, nofollow',
        },
      ],
    },

    // ────────────── SITE 3: School ERP EdTech Articles ──────────────
    {
      id: 'art-edtech-1',
      websiteId: 'site-edtech',
      authorId: authorSuper!.id,
      authorName: authorSuper!.name,
      authorAvatar: authorSuper!.avatar,
      featuredImage: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80',
      featuredImageAlt: 'Transforming K-12 Campus Administration',
      status: 'Published',
      publishDate: new Date('2026-03-08T09:15:00Z'),
      viewCount: 3120,
      readTimeMinutes: 4,
      categoryIds: ['cat-edtech-k12'],
      tagIds: ['tag-edtech-smart'],
      translations: [
        {
          lang: 'en',
          title: 'Transforming K-12 Campus Administration with Cloud ERP',
          slug: 'transforming-k12-campus-administration-cloud-erp',
          excerpt: 'How smart campus automation streamlines student fee collection, attendance, and parent communications.',
          content: '<h2>The Connected Digital School</h2><p>Modern educational institutions are digitizing attendance, report cards, and fee gateways onto a unified portal.</p>',
          metaTitle: 'Transforming K-12 Administration with Cloud ERP',
          metaDescription: 'Discover how school automation systems eliminate administrative friction.',
          canonicalUrl: 'https://edtech.schoolerp.in/blog/transforming-k12-campus-administration-cloud-erp',
          focusKeyword: 'School ERP Automation',
          robots: 'index, follow',
        },
      ],
    },
    {
      id: 'art-edtech-2',
      websiteId: 'site-edtech',
      authorId: authorSuper!.id,
      authorName: authorSuper!.name,
      authorAvatar: authorSuper!.avatar,
      featuredImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80',
      featuredImageAlt: 'Automated Examination and Gradebook Portals',
      status: 'Under Review',
      publishDate: null,
      viewCount: 0,
      readTimeMinutes: 5,
      categoryIds: ['cat-edtech-exams', 'cat-edtech-analytics'],
      tagIds: ['tag-edtech-sis'],
      translations: [
        {
          lang: 'en',
          title: 'Modernizing Examination Portals with Automated Grade Analytics',
          slug: 'modernizing-examination-portals-automated-grade-analytics',
          excerpt: 'Secure exam scheduling, digital answer sheet evaluation, and automated student report card generation.',
          content: '<h2>Zero-Error Digital Exam Workflows</h2><p>Streamlining university and school board assessments with tamper-proof records.</p>',
          metaTitle: 'Modernizing Examination Portals with Analytics',
          metaDescription: 'Automated grade analytics and secure exam portals for K-12 and universities.',
          canonicalUrl: 'https://edtech.schoolerp.in/blog/modernizing-examination-portals-automated-grade-analytics',
          focusKeyword: 'Examination Portals',
          robots: 'noindex, nofollow',
        },
      ],
    },
  ];

  for (const art of articlesData) {
    const { translations, ...blogFields } = art;
    await prisma.blog.create({
      data: {
        ...blogFields,
        translations: {
          create: translations,
        },
      },
    });
  }
  console.log('✅ Seeded ' + articlesData.length + ' articles across Draft, Under Review, Approved, and Published lifecycle stages.');

  // 6. Seed Initial 301 Permanent Redirects
  const redirects = [
    {
      id: 'red-1',
      websiteId: 'site-cloud',
      fromSlug: 'legacy-school-erp-system-2025',
      toSlug: 'ai-powered-shift-modern-cloud-erp-2026',
      statusCode: 301,
      hitCount: 1840,
    },
    {
      id: 'red-2',
      websiteId: 'site-growth',
      fromSlug: 'old-seo-guide-2024',
      toSlug: 'enterprise-technical-seo-playbook-2026',
      statusCode: 301,
      hitCount: 920,
    },
  ];

  for (const r of redirects) {
    await prisma.redirect.create({ data: r });
  }
  console.log('✅ Seeded ' + redirects.length + ' initial 301 permanent redirect rules.');

  // 7. Seed System Audit Logs
  await prisma.systemAuditLog.create({
    data: {
      userName: 'Aarav Sharma (Super Admin)',
      role: 'Super Admin',
      websiteId: 'site-cloud',
      event: 'platform.initialized',
      ipAddress: '127.0.0.1',
      details: 'Initialized 3 isolated multi-tenant websites with hierarchical RBAC delegates.',
    },
  });

  console.log('🎉 Database seeding completed successfully! All 3 SaaS test websites are live and ready.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
