import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED) {
    console.warn('⚠️ Seeding skipped: NODE_ENV is production and database is already initialized.');
    return;
  }
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

  // 2. Seed 3 High-Performance Multi-Tenant Websites (TRD §1 & §6 Production Domains)
  const websites = [
    {
      id: 'site-cloud',
      name: 'Jupsoft Cloud & ERP',
      domain: 'cloud.jupsoft.com',
      logoUrl: '/uploads/logos/jupsoft-cloud-logo.webp',
      description: 'Enterprise Cloud ERP, Distributed Systems & AI Infrastructure.',
      apiKey: 'jup_live_sec_cloud_9934afbc82a104',
      s3Prefix: 'blogs/cloud/',
      status: 'active',
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'hi', 'fr', 'ar'],
      revalidateWebhookUrl: 'https://cloud.jupsoft.com/api/revalidate',
    },
    {
      id: 'site-growth',
      name: 'DigifyNext Marketing',
      domain: 'digifynext.com',
      logoUrl: '/uploads/logos/digifynext-growth-logo.webp',
      description: 'Performance SEO, Conversion Funnels & Growth Marketing Analytics.',
      apiKey: 'digi_live_sec_growth_8821ecde71a209',
      s3Prefix: 'blogs/growth/',
      status: 'active',
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'hi'],
      revalidateWebhookUrl: 'https://digifynext.com/api/revalidate',
    },
    {
      id: 'site-edtech',
      name: 'School ERP Platform',
      domain: 'schoolerp.in',
      logoUrl: '/uploads/logos/school-erp-logo.webp',
      description: 'K-12 School Management, Exam Portals & Student Information Systems.',
      apiKey: 'erp_live_sec_edtech_7710bba190c301',
      s3Prefix: 'blogs/edtech/',
      status: 'active',
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'hi', 'ar'],
      revalidateWebhookUrl: 'https://schoolerp.in/api/revalidate',
    },
  ];

  for (const site of websites) {
    await prisma.website.create({ data: site });
  }
  console.log('✅ Seeded ' + websites.length + ' production websites.');

  // 3. Seed Enterprise Organization Users with Distinct, Unique Passwords
  const users = [
    {
      id: 'usr-superadmin',
      name: 'Aarav Sharma (Super Admin)',
      email: 'superadmin@jupsoft.com',
      password: 'Jupsoft#SuperAdmin2026!$',
      avatar: '/uploads/avatars/avatar-1.webp',
      status: 'active',
      lastLoginIp: '192.168.1.1',
      roles: [
        { websiteId: null, isGlobal: true, role: 'Super Admin' },
        { websiteId: 'site-cloud', isGlobal: false, role: 'Super Admin' },
        { websiteId: 'site-growth', isGlobal: false, role: 'Super Admin' },
        { websiteId: 'site-edtech', isGlobal: false, role: 'Super Admin' },
      ],
    },
    {
      id: 'usr-admin-alias',
      name: 'Aarav Sharma (Admin Alias)',
      email: 'admin@jupsoft.com',
      password: 'Jupsoft#SuperAdmin2026!$',
      avatar: '/uploads/avatars/avatar-1.webp',
      status: 'active',
      lastLoginIp: '192.168.1.1',
      roles: [
        { websiteId: null, isGlobal: true, role: 'Super Admin' },
        { websiteId: 'site-cloud', isGlobal: false, role: 'Super Admin' },
        { websiteId: 'site-growth', isGlobal: false, role: 'Super Admin' },
        { websiteId: 'site-edtech', isGlobal: false, role: 'Super Admin' },
      ],
    },
    {
      id: 'usr-siteadmin-cloud',
      name: 'Rohit Verma (Cloud Admin)',
      email: 'admin@cloud.jupsoft.com',
      password: 'CloudAdmin#Jupsoft2026@',
      avatar: '/uploads/avatars/avatar-2.webp',
      status: 'active',
      lastLoginIp: '192.168.1.15',
      roles: [
        { websiteId: 'site-cloud', isGlobal: false, role: 'Website Admin' },
      ],
    },
    {
      id: 'usr-siteadmin-growth',
      name: 'Neha Kapoor (Growth Admin)',
      email: 'admin@digifynext.com',
      password: 'GrowthAdmin#Digify2026%',
      avatar: '/uploads/avatars/avatar-3.webp',
      status: 'active',
      lastLoginIp: '10.0.1.22',
      roles: [
        { websiteId: 'site-growth', isGlobal: false, role: 'Website Admin' },
      ],
    },
    {
      id: 'usr-siteadmin-edtech',
      name: 'Rajesh Nair (School ERP Admin)',
      email: 'admin@schoolerp.in',
      password: 'SchoolAdmin#EdTech2026^',
      avatar: '/uploads/avatars/avatar-4.webp',
      status: 'active',
      lastLoginIp: '10.0.2.33',
      roles: [
        { websiteId: 'site-edtech', isGlobal: false, role: 'Website Admin' },
      ],
    },
    {
      id: 'usr-roleadmin-editor',
      name: 'Sameer Joshi (Lead Editor)',
      email: 'lead.editor@jupsoft.com',
      password: 'LeadEditor#Jupsoft2026!',
      avatar: '/uploads/avatars/avatar-4.webp',
      status: 'active',
      lastLoginIp: '192.168.1.42',
      roles: [
        { websiteId: 'site-cloud', isGlobal: false, role: 'Role Admin' },
      ],
    },
    {
      id: 'usr-editor',
      name: 'Priya Sen (Editor)',
      email: 'editor@jupsoft.com',
      password: 'Editor#Jupsoft2026!',
      avatar: '/uploads/avatars/avatar-5.webp',
      status: 'active',
      lastLoginIp: '192.168.1.55',
      roles: [
        { websiteId: 'site-cloud', isGlobal: false, role: 'Editor' },
      ],
    },
    {
      id: 'usr-writer',
      name: 'Ananya Roy (Content Writer)',
      email: 'writer@jupsoft.com',
      password: 'Writer#Jupsoft2026!',
      avatar: '/uploads/avatars/avatar-6.webp',
      status: 'active',
      lastLoginIp: '192.168.1.88',
      roles: [
        { websiteId: 'site-cloud', isGlobal: false, role: 'Content Writer' },
      ],
    },
    {
      id: 'usr-seo',
      name: 'Vikram Mehta (SEO Manager)',
      email: 'seo@jupsoft.com',
      password: 'SeoManager#Jupsoft2026!',
      avatar: '/uploads/avatars/avatar-7.webp',
      status: 'active',
      lastLoginIp: '192.168.1.99',
      roles: [
        { websiteId: 'site-cloud', isGlobal: false, role: 'SEO Manager' },
        { websiteId: 'site-growth', isGlobal: false, role: 'SEO Manager' },
      ],
    },
    {
      id: 'usr-publisher',
      name: 'Karan Malhotra (Publisher)',
      email: 'publisher@jupsoft.com',
      password: 'Publisher#Jupsoft2026!',
      avatar: '/uploads/avatars/avatar-8.webp',
      status: 'active',
      lastLoginIp: '192.168.1.101',
      roles: [
        { websiteId: 'site-cloud', isGlobal: false, role: 'Publisher' },
      ],
    },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const createdUser = await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        passwordHash,
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
          isGlobal: r.isGlobal,
          role: r.role,
        },
      });
    }
  }
  console.log('✅ Seeded ' + users.length + ' enterprise users with distinct passwords across Super Admin, Website Admin, Role Admin, and Contributor tiers.');

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
      featuredImage: '/uploads/blogs/site-cloud/2026/09/cloud-erp-architecture.webp',
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
          ogImage: '/uploads/blogs/site-cloud/2026/09/cloud-erp-architecture.webp',
        },
      ],
    },
    {
      id: 'art-cloud-2',
      websiteId: 'site-cloud',
      authorId: authorEditor!.id,
      authorName: authorEditor!.name,
      authorAvatar: authorEditor!.avatar,
      featuredImage: '/uploads/blogs/site-growth/2026/09/technical-seo-playbook.webp',
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
      featuredImage: '/uploads/blogs/site-growth/2026/09/b2b-saas-funnel.webp',
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
      featuredImage: '/uploads/blogs/site-cloud/2026/09/kubernetes-microservices.webp',
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
      featuredImage: '/uploads/blogs/site-edtech/2026/09/examination-gradebook-portal.webp',
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
      featuredImage: '/uploads/blogs/site-growth/2026/09/b2b-saas-funnel.webp',
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
      featuredImage: '/uploads/blogs/site-cloud/2026/09/kubernetes-microservices.webp',
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
      featuredImage: '/uploads/blogs/site-edtech/2026/09/examination-gradebook-portal.webp',
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

  
  // 5b. Seed 100% WebP Media Library Assets Connected Across Whole Platform
  const mediaLibraryAssets = [
    {
      id: 'med-cloud-logo',
      websiteId: 'site-cloud',
      fileName: 'jupsoft-cloud-logo.webp',
      fileType: 'image/webp',
      fileSizeBytes: 5662,
      s3Key: 'logos/jupsoft-cloud-logo.webp',
      cdnUrl: '/uploads/logos/jupsoft-cloud-logo.webp',
      altText: 'Jupsoft Cloud Enterprise Logo',
      uploadedBy: 'Aarav Sharma (Super Admin)',
    },
    {
      id: 'med-cloud-erp-arch',
      websiteId: 'site-cloud',
      fileName: 'cloud-erp-architecture.webp',
      fileType: 'image/webp',
      fileSizeBytes: 33932,
      s3Key: 'blogs/site-cloud/2026/09/cloud-erp-architecture.webp',
      cdnUrl: '/uploads/blogs/site-cloud/2026/09/cloud-erp-architecture.webp',
      altText: 'Modern Cloud ERP Architecture in 2026',
      uploadedBy: 'Aarav Sharma (Super Admin)',
    },
    {
      id: 'med-cloud-k8s',
      websiteId: 'site-cloud',
      fileName: 'kubernetes-microservices.webp',
      fileType: 'image/webp',
      fileSizeBytes: 35292,
      s3Key: 'blogs/site-cloud/2026/09/kubernetes-microservices.webp',
      cdnUrl: '/uploads/blogs/site-cloud/2026/09/kubernetes-microservices.webp',
      altText: 'Kubernetes & Multi-Tenant Microservices',
      uploadedBy: 'Aarav Sharma (Super Admin)',
    },
    {
      id: 'med-cloud-ai-agents',
      websiteId: 'site-cloud',
      fileName: 'enterprise-ai-agents.webp',
      fileType: 'image/webp',
      fileSizeBytes: 32068,
      s3Key: 'blogs/site-cloud/2026/09/enterprise-ai-agents.webp',
      cdnUrl: '/uploads/blogs/site-cloud/2026/09/enterprise-ai-agents.webp',
      altText: 'Autonomous AI Agents in Enterprise ERP',
      uploadedBy: 'Aarav Sharma (Super Admin)',
    },
    {
      id: 'med-avatar-aarav',
      websiteId: 'site-cloud',
      fileName: 'avatar-1.webp',
      fileType: 'image/webp',
      fileSizeBytes: 13364,
      s3Key: 'avatars/avatar-1.webp',
      cdnUrl: '/uploads/avatars/avatar-1.webp',
      altText: 'Aarav Sharma Avatar',
      uploadedBy: 'Aarav Sharma (Super Admin)',
    },
    {
      id: 'med-avatar-priya',
      websiteId: 'site-cloud',
      fileName: 'avatar-2.webp',
      fileType: 'image/webp',
      fileSizeBytes: 13506,
      s3Key: 'avatars/avatar-2.webp',
      cdnUrl: '/uploads/avatars/avatar-2.webp',
      altText: 'Priya Verma Avatar',
      uploadedBy: 'Priya Verma (Website Admin)',
    },
    {
      id: 'med-avatar-kabir',
      websiteId: 'site-cloud',
      fileName: 'avatar-7.webp',
      fileType: 'image/webp',
      fileSizeBytes: 13886,
      s3Key: 'avatars/avatar-7.webp',
      cdnUrl: '/uploads/avatars/avatar-7.webp',
      altText: 'Kabir Joshi Avatar',
      uploadedBy: 'Kabir Joshi (Editor)',
    },
    {
      id: 'med-growth-logo',
      websiteId: 'site-growth',
      fileName: 'digifynext-growth-logo.webp',
      fileType: 'image/webp',
      fileSizeBytes: 5982,
      s3Key: 'logos/digifynext-growth-logo.webp',
      cdnUrl: '/uploads/logos/digifynext-growth-logo.webp',
      altText: 'DigifyNext Growth Marketing Logo',
      uploadedBy: 'Aarav Sharma (Super Admin)',
    },
    {
      id: 'med-growth-tech-seo',
      websiteId: 'site-growth',
      fileName: 'technical-seo-playbook.webp',
      fileType: 'image/webp',
      fileSizeBytes: 35988,
      s3Key: 'blogs/site-growth/2026/09/technical-seo-playbook.webp',
      cdnUrl: '/uploads/blogs/site-growth/2026/09/technical-seo-playbook.webp',
      altText: 'Enterprise Technical SEO Playbook 2026',
      uploadedBy: 'Vikram Mehta (SEO Manager)',
    },
    {
      id: 'med-growth-b2b-funnel',
      websiteId: 'site-growth',
      fileName: 'b2b-saas-funnel.webp',
      fileType: 'image/webp',
      fileSizeBytes: 33970,
      s3Key: 'blogs/site-growth/2026/09/b2b-saas-funnel.webp',
      cdnUrl: '/uploads/blogs/site-growth/2026/09/b2b-saas-funnel.webp',
      altText: 'B2B SaaS Funnel Optimization Framework',
      uploadedBy: 'Vikram Mehta (SEO Manager)',
    },
    {
      id: 'med-growth-ai-search',
      websiteId: 'site-growth',
      fileName: 'ai-search-optimization.webp',
      fileType: 'image/webp',
      fileSizeBytes: 34684,
      s3Key: 'blogs/site-growth/2026/09/ai-search-optimization.webp',
      cdnUrl: '/uploads/blogs/site-growth/2026/09/ai-search-optimization.webp',
      altText: 'AI Search & Perplexity Indexation Guide',
      uploadedBy: 'Vikram Mehta (SEO Manager)',
    },
    {
      id: 'med-growth-cro',
      websiteId: 'site-growth',
      fileName: 'cro-conversion-audit.webp',
      fileType: 'image/webp',
      fileSizeBytes: 38672,
      s3Key: 'blogs/site-growth/2026/09/cro-conversion-audit.webp',
      cdnUrl: '/uploads/blogs/site-growth/2026/09/cro-conversion-audit.webp',
      altText: 'Data-Backed CRO & Landing Page Audit',
      uploadedBy: 'Vikram Mehta (SEO Manager)',
    },
    {
      id: 'med-growth-ppc',
      websiteId: 'site-growth',
      fileName: 'ppc-google-ads-roi.webp',
      fileType: 'image/webp',
      fileSizeBytes: 34662,
      s3Key: 'blogs/site-growth/2026/09/ppc-google-ads-roi.webp',
      cdnUrl: '/uploads/blogs/site-growth/2026/09/ppc-google-ads-roi.webp',
      altText: 'High-Intent B2B PPC & Google Ads Playbook',
      uploadedBy: 'Vikram Mehta (SEO Manager)',
    },
    {
      id: 'med-avatar-vikram',
      websiteId: 'site-growth',
      fileName: 'avatar-3.webp',
      fileType: 'image/webp',
      fileSizeBytes: 14106,
      s3Key: 'avatars/avatar-3.webp',
      cdnUrl: '/uploads/avatars/avatar-3.webp',
      altText: 'Vikram Mehta Avatar',
      uploadedBy: 'Vikram Mehta (SEO Manager)',
    },
    {
      id: 'med-avatar-neha',
      websiteId: 'site-growth',
      fileName: 'avatar-4.webp',
      fileType: 'image/webp',
      fileSizeBytes: 13770,
      s3Key: 'avatars/avatar-4.webp',
      cdnUrl: '/uploads/avatars/avatar-4.webp',
      altText: 'Neha Kapoor Avatar',
      uploadedBy: 'Neha Kapoor (Content Writer)',
    },
    {
      id: 'med-edtech-logo',
      websiteId: 'site-edtech',
      fileName: 'school-erp-logo.webp',
      fileType: 'image/webp',
      fileSizeBytes: 5378,
      s3Key: 'logos/school-erp-logo.webp',
      cdnUrl: '/uploads/logos/school-erp-logo.webp',
      altText: 'School ERP Digital Campus Logo',
      uploadedBy: 'Aarav Sharma (Super Admin)',
    },
    {
      id: 'med-edtech-campus',
      websiteId: 'site-edtech',
      fileName: 'smart-campus-automation.webp',
      fileType: 'image/webp',
      fileSizeBytes: 33248,
      s3Key: 'blogs/site-edtech/2026/09/smart-campus-automation.webp',
      cdnUrl: '/uploads/blogs/site-edtech/2026/09/smart-campus-automation.webp',
      altText: 'Transforming K-12 Campus with Cloud ERP',
      uploadedBy: 'Ananya Roy (Role Admin)',
    },
    {
      id: 'med-edtech-exams',
      websiteId: 'site-edtech',
      fileName: 'examination-gradebook-portal.webp',
      fileType: 'image/webp',
      fileSizeBytes: 34702,
      s3Key: 'blogs/site-edtech/2026/09/examination-gradebook-portal.webp',
      cdnUrl: '/uploads/blogs/site-edtech/2026/09/examination-gradebook-portal.webp',
      altText: 'Modernizing Digital Examination Portals',
      uploadedBy: 'Ananya Roy (Role Admin)',
    },
    {
      id: 'med-edtech-analytics',
      websiteId: 'site-edtech',
      fileName: 'student-analytics-retention.webp',
      fileType: 'image/webp',
      fileSizeBytes: 33486,
      s3Key: 'blogs/site-edtech/2026/09/student-analytics-retention.webp',
      cdnUrl: '/uploads/blogs/site-edtech/2026/09/student-analytics-retention.webp',
      altText: 'Predictive Student Performance & Retention',
      uploadedBy: 'Ananya Roy (Role Admin)',
    },
    {
      id: 'med-avatar-ananya',
      websiteId: 'site-edtech',
      fileName: 'avatar-5.webp',
      fileType: 'image/webp',
      fileSizeBytes: 15158,
      s3Key: 'avatars/avatar-5.webp',
      cdnUrl: '/uploads/avatars/avatar-5.webp',
      altText: 'Ananya Roy Avatar',
      uploadedBy: 'Ananya Roy (Role Admin)',
    },
    {
      id: 'med-avatar-rohan',
      websiteId: 'site-edtech',
      fileName: 'avatar-6.webp',
      fileType: 'image/webp',
      fileSizeBytes: 14988,
      s3Key: 'avatars/avatar-6.webp',
      cdnUrl: '/uploads/avatars/avatar-6.webp',
      altText: 'Rohan Singh Avatar',
      uploadedBy: 'Rohan Singh (Publisher)',
    },
    {
      id: 'med-avatar-riya',
      websiteId: 'site-edtech',
      fileName: 'avatar-8.webp',
      fileType: 'image/webp',
      fileSizeBytes: 14966,
      s3Key: 'avatars/avatar-8.webp',
      cdnUrl: '/uploads/avatars/avatar-8.webp',
      altText: 'Riya Sen Avatar',
      uploadedBy: 'Riya Sen (Contributor)',
    },
    {
      id: 'med-avatar-default',
      websiteId: 'site-cloud',
      fileName: 'avatar-default.webp',
      fileType: 'image/webp',
      fileSizeBytes: 11928,
      s3Key: 'avatars/avatar-default.webp',
      cdnUrl: '/uploads/avatars/avatar-default.webp',
      altText: 'Default User Avatar',
      uploadedBy: 'System',
    },
  ];

  for (const m of mediaLibraryAssets) {
    await prisma.mediaAsset.create({ data: m });
  }
  console.log('✅ Seeded ' + mediaLibraryAssets.length + ' WebP media assets into media library.');

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
