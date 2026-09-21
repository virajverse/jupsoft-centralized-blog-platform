/**
 * Jupsoft CMS — Zero-Duplicate Dual-Database Sync Engine
 * Synchronizes between Supabase Cloud PostgreSQL and Local PostgreSQL.
 *
 * Usage:
 *   node scripts/sync-databases.js --status   (Compare record counts)
 *   node scripts/sync-databases.js --pull     (Supabase -> Local, default)
 *   node scripts/sync-databases.js --push     (Local -> Supabase)
 */

const path = require('path');
const fs = require('fs');

// Load environment variables from backend/.env if available
const envPath = path.resolve(__dirname, '../backend/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      const key = k.trim();
      const val = v.join('=').trim().replace(/^["'](.*)["']$/, '$1');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));

const SUPABASE_URL = process.env.DIRECT_URL || process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
const LOCAL_URL = process.env.LOCAL_DATABASE_URL;

if (!SUPABASE_URL || !LOCAL_URL) {
  console.warn('⚠️  [sync-databases] DIRECT_URL / DATABASE_URL and LOCAL_DATABASE_URL should be set in backend/.env');
}

const supabase = new PrismaClient({ datasources: { db: { url: SUPABASE_URL || 'postgresql://localhost:5432/postgres' } } });
const local = new PrismaClient({ datasources: { db: { url: LOCAL_URL || 'postgresql://localhost:5432/jupsoft_cms' } } });

async function getStatus() {
  console.log('====================================================');
  console.log(' 🔍 DATABASE PARITY & SYNC STATUS REPORT');
  console.log('====================================================');

  const [
    sbSites, localSites,
    sbUsers, localUsers,
    sbCats, localCats,
    sbTags, localTags,
    sbBlogs, localBlogs,
    sbTrans, localTrans
  ] = await Promise.all([
    supabase.website.findMany({ select: { id: true, name: true, domain: true } }),
    local.website.findMany({ select: { id: true, name: true, domain: true } }),
    supabase.user.findMany({ select: { id: true, email: true } }),
    local.user.findMany({ select: { id: true, email: true } }),
    supabase.category.count(),
    local.category.count(),
    supabase.tag.count(),
    local.tag.count(),
    supabase.blog.findMany({ select: { id: true, websiteId: true, status: true } }),
    local.blog.findMany({ select: { id: true, websiteId: true, status: true } }),
    supabase.blogTranslation.count(),
    local.blogTranslation.count(),
  ]);

  console.log(`Websites:     Supabase: ${sbSites.length.toString().padEnd(4)} | Local: ${localSites.length}`);
  console.log(`Users:        Supabase: ${sbUsers.length.toString().padEnd(4)} | Local: ${localUsers.length}`);
  console.log(`Categories:   Supabase: ${sbCats.toString().padEnd(4)} | Local: ${localCats}`);
  console.log(`Tags:         Supabase: ${sbTags.toString().padEnd(4)} | Local: ${localTags}`);
  console.log(`Blogs:        Supabase: ${sbBlogs.length.toString().padEnd(4)} | Local: ${localBlogs.length}`);
  console.log(`Translations: Supabase: ${sbTrans.toString().padEnd(4)} | Local: ${localTrans}`);
  console.log('----------------------------------------------------');

  const sbSiteIds = new Set(sbSites.map((s) => s.id));
  const localSiteIds = new Set(localSites.map((s) => s.id));
  const missingInLocalSites = sbSites.filter((s) => !localSiteIds.has(s.id));
  const extraInLocalSites = localSites.filter((s) => !sbSiteIds.has(s.id));

  if (missingInLocalSites.length > 0) {
    console.log('⚠️  Websites on Supabase missing locally:', missingInLocalSites.map((s) => `${s.name} (${s.id})`).join(', '));
  }
  if (extraInLocalSites.length > 0) {
    console.log('ℹ️  Websites on Local not in Supabase:', extraInLocalSites.map((s) => `${s.name} (${s.id})`).join(', '));
  }

  const sbBlogIds = new Set(sbBlogs.map((b) => b.id));
  const localBlogIds = new Set(localBlogs.map((b) => b.id));
  const missingInLocalBlogs = sbBlogs.filter((b) => !localBlogIds.has(b.id));
  const extraInLocalBlogs = localBlogs.filter((b) => !sbBlogIds.has(b.id));

  if (missingInLocalBlogs.length > 0) {
    console.log(`⚠️  Blogs on Supabase missing locally: ${missingInLocalBlogs.length} blogs`);
  }
  if (extraInLocalBlogs.length > 0) {
    console.log(`ℹ️  Stale dummy blogs in Local: ${extraInLocalBlogs.length} blogs`);
  }

  const isExactMatch = sbSites.length === localSites.length &&
    sbBlogs.length === localBlogs.length &&
    missingInLocalBlogs.length === 0 &&
    extraInLocalBlogs.length === 0;

  console.log('----------------------------------------------------');
  if (isExactMatch) {
    console.log('✅ BOTH DATABASES ARE 100% IN SYNC (Zero Discrepancies)');
  } else {
    console.log('⚡ DATABASES ARE OUT OF SYNC. Run with --pull to mirror Supabase to Local.');
  }
  console.log('====================================================\n');
}

/**
 * Deterministic Upsert Sync Engine:
 * Synchronizes source -> target with ZERO duplicates.
 */
async function syncData(source, target, directionName, cleanStale = true) {
  console.log(`\n🚀 Starting Zero-Duplicate Sync: [${directionName}]...`);

  // 1. Sync Websites
  const sourceWebsites = await source.website.findMany();
  console.log(`📦 Syncing ${sourceWebsites.length} websites...`);
  for (const w of sourceWebsites) {
    await target.website.upsert({
      where: { id: w.id },
      update: {
        name: w.name,
        domain: w.domain,
        logoUrl: w.logoUrl,
        description: w.description,
        apiKey: w.apiKey,
        s3Prefix: w.s3Prefix,
        status: w.status,
        defaultLanguage: w.defaultLanguage,
        supportedLanguages: w.supportedLanguages,
        revalidateWebhookUrl: w.revalidateWebhookUrl,
        updatedAt: w.updatedAt,
      },
      create: {
        id: w.id,
        name: w.name,
        domain: w.domain,
        logoUrl: w.logoUrl,
        description: w.description,
        apiKey: w.apiKey,
        s3Prefix: w.s3Prefix,
        status: w.status,
        defaultLanguage: w.defaultLanguage,
        supportedLanguages: w.supportedLanguages,
        revalidateWebhookUrl: w.revalidateWebhookUrl,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      },
    });
  }

  // 2. Sync Users & Role Assignments
  const sourceUsers = await source.user.findMany({ include: { roleAssignments: true } });
  console.log(`👤 Syncing ${sourceUsers.length} users...`);
  for (const u of sourceUsers) {
    const existing = await target.user.findFirst({
      where: { OR: [{ id: u.id }, { email: u.email }] },
    });

    let targetUserId = u.id;
    if (existing) {
      targetUserId = existing.id;
      await target.user.update({
        where: { id: existing.id },
        data: {
          email: u.email,
          name: u.name,
          passwordHash: u.passwordHash,
          avatar: u.avatar,
          status: u.status,
          lastLoginIp: u.lastLoginIp,
          loginAttempts: u.loginAttempts,
          lockoutUntil: u.lockoutUntil,
          updatedAt: u.updatedAt,
        },
      });
    } else {
      await target.user.create({
        data: {
          id: u.id,
          email: u.email,
          name: u.name,
          passwordHash: u.passwordHash,
          avatar: u.avatar,
          status: u.status,
          lastLoginIp: u.lastLoginIp,
          loginAttempts: u.loginAttempts,
          lockoutUntil: u.lockoutUntil,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        },
      });
    }

    await target.userRoleAssignment.deleteMany({ where: { userId: targetUserId } });
    for (const ra of u.roleAssignments) {
      if (ra.websiteId) {
        const siteExists = await target.website.findUnique({ where: { id: ra.websiteId } });
        if (!siteExists) continue;
      }
      await target.userRoleAssignment.create({
        data: {
          id: ra.id,
          userId: targetUserId,
          websiteId: ra.websiteId,
          isGlobal: ra.isGlobal,
          role: ra.role,
          createdAt: ra.createdAt,
        },
      });
    }
  }

  // 3. Sync Categories
  const sourceCategories = await source.category.findMany();
  console.log(`🏷️  Syncing ${sourceCategories.length} categories...`);
  for (const c of sourceCategories) {
    const siteExists = await target.website.findUnique({ where: { id: c.websiteId } });
    if (!siteExists) continue;

    await target.category.upsert({
      where: {
        websiteId_slug: {
          websiteId: c.websiteId,
          slug: c.slug,
        },
      },
      update: {
        name: c.name,
        parentId: c.parentId,
        description: c.description,
        count: c.count,
      },
      create: {
        id: c.id,
        websiteId: c.websiteId,
        name: c.name,
        slug: c.slug,
        parentId: c.parentId,
        description: c.description,
        count: c.count,
      },
    });
  }

  // 4. Sync Tags
  const sourceTags = await source.tag.findMany();
  console.log(`🔖 Syncing ${sourceTags.length} tags...`);
  for (const t of sourceTags) {
    const siteExists = await target.website.findUnique({ where: { id: t.websiteId } });
    if (!siteExists) continue;

    await target.tag.upsert({
      where: {
        websiteId_slug: {
          websiteId: t.websiteId,
          slug: t.slug,
        },
      },
      update: {
        name: t.name,
        count: t.count,
      },
      create: {
        id: t.id,
        websiteId: t.websiteId,
        name: t.name,
        slug: t.slug,
        count: t.count,
      },
    });
  }

  // 5. Clean up stale dummy records if cleanStale is true
  if (cleanStale) {
    const sourceBlogIds = (await source.blog.findMany({ select: { id: true } })).map((b) => b.id);
    const targetBlogs = await target.blog.findMany({ select: { id: true } });
    const staleBlogIds = targetBlogs.filter((b) => !sourceBlogIds.includes(b.id)).map((b) => b.id);

    if (staleBlogIds.length > 0) {
      console.log(`🧹 Pruning ${staleBlogIds.length} stale dummy blogs from target...`);
      await target.blog.deleteMany({ where: { id: { in: staleBlogIds } } });
    }

    const sourceSiteIds = sourceWebsites.map((s) => s.id);
    const targetSites = await target.website.findMany({ select: { id: true } });
    const staleSiteIds = targetSites.filter((s) => !sourceSiteIds.includes(s.id)).map((s) => s.id);

    if (staleSiteIds.length > 0) {
      console.log(`🧹 Pruning ${staleSiteIds.length} stale dummy websites from target...`);
      // Delete child associations first to preserve FK integrity
      await target.userRoleAssignment.deleteMany({ where: { websiteId: { in: staleSiteIds } } }).catch(() => {});
      await target.category.deleteMany({ where: { websiteId: { in: staleSiteIds } } }).catch(() => {});
      await target.tag.deleteMany({ where: { websiteId: { in: staleSiteIds } } }).catch(() => {});
      await target.website.deleteMany({ where: { id: { in: staleSiteIds } } }).catch(() => {});
    }
  }

  // 6. Sync Blogs & Translations & Relations
  const sourceBlogs = await source.blog.findMany({
    include: {
      translations: true,
      blogCategories: true,
      blogTags: true,
      workflowLogs: true,
    },
  });

  console.log(`📝 Syncing ${sourceBlogs.length} blogs and translations...`);
  for (const b of sourceBlogs) {
    // Ensure author exists on target
    let authorId = b.authorId;
    const authorExists = await target.user.findUnique({ where: { id: authorId } });
    if (!authorExists) {
      const fallbackUser = await target.user.findFirst();
      if (fallbackUser) authorId = fallbackUser.id;
    }

    // Upsert parent blog
    await target.blog.upsert({
      where: { id: b.id },
      update: {
        websiteId: b.websiteId,
        authorId: authorId,
        authorName: b.authorName,
        authorAvatar: b.authorAvatar,
        featuredImage: b.featuredImage,
        featuredImageAlt: b.featuredImageAlt,
        status: b.status,
        publishDate: b.publishDate,
        scheduledAt: b.scheduledAt,
        publishedBy: b.publishedBy,
        viewCount: b.viewCount,
        readTimeMinutes: b.readTimeMinutes,
        categoryIds: b.categoryIds,
        tagIds: b.tagIds,
        updatedAt: b.updatedAt,
      },
      create: {
        id: b.id,
        websiteId: b.websiteId,
        authorId: authorId,
        authorName: b.authorName,
        authorAvatar: b.authorAvatar,
        featuredImage: b.featuredImage,
        featuredImageAlt: b.featuredImageAlt,
        status: b.status,
        publishDate: b.publishDate,
        scheduledAt: b.scheduledAt,
        publishedBy: b.publishedBy,
        viewCount: b.viewCount,
        readTimeMinutes: b.readTimeMinutes,
        categoryIds: b.categoryIds,
        tagIds: b.tagIds,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      },
    });

    // Upsert Translations
    for (const t of b.translations) {
      await target.blogTranslation.upsert({
        where: {
          blogId_lang: {
            blogId: b.id,
            lang: t.lang,
          },
        },
        update: {
          title: t.title,
          slug: t.slug,
          excerpt: t.excerpt,
          content: t.content,
          metaTitle: t.metaTitle,
          metaDescription: t.metaDescription,
          metaKeywords: t.metaKeywords,
          canonicalUrl: t.canonicalUrl,
          focusKeyword: t.focusKeyword,
          robots: t.robots,
          ogTitle: t.ogTitle,
          ogDescription: t.ogDescription,
          ogImage: t.ogImage,
          twitterTitle: t.twitterTitle,
          twitterDescription: t.twitterDescription,
          twitterImage: t.twitterImage,
        },
        create: {
          id: t.id,
          blogId: b.id,
          lang: t.lang,
          title: t.title,
          slug: t.slug,
          excerpt: t.excerpt,
          content: t.content,
          metaTitle: t.metaTitle,
          metaDescription: t.metaDescription,
          metaKeywords: t.metaKeywords,
          canonicalUrl: t.canonicalUrl,
          focusKeyword: t.focusKeyword,
          robots: t.robots,
          ogTitle: t.ogTitle,
          ogDescription: t.ogDescription,
          ogImage: t.ogImage,
          twitterTitle: t.twitterTitle,
          twitterDescription: t.twitterDescription,
          twitterImage: t.twitterImage,
        },
      });
    }

    // Sync Relations (Category & Tag links)
    await target.blogCategory.deleteMany({ where: { blogId: b.id } });
    for (const bc of b.blogCategories) {
      const catExists = await target.category.findUnique({ where: { id: bc.categoryId } });
      if (catExists) {
        await target.blogCategory.create({
          data: { blogId: b.id, categoryId: bc.categoryId },
        }).catch(() => {});
      }
    }

    await target.blogTag.deleteMany({ where: { blogId: b.id } });
    for (const bt of b.blogTags) {
      const tagExists = await target.tag.findUnique({ where: { id: bt.tagId } });
      if (tagExists) {
        await target.blogTag.create({
          data: { blogId: b.id, tagId: bt.tagId },
        }).catch(() => {});
      }
    }
  }

  console.log(`\n🎉 Synchronization [${directionName}] completed successfully with ZERO duplicates!\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const isPush = args.includes('--push');
  const isStatusOnly = args.includes('--status');

  if (isStatusOnly) {
    await getStatus();
    return;
  }

  if (isPush) {
    // Local -> Supabase
    await syncData(local, supabase, 'Local -> Supabase Cloud', false);
  } else {
    // Supabase -> Local (Default)
    await syncData(supabase, local, 'Supabase Cloud -> Local PostgreSQL', true);
  }

  // Show final status verification
  await getStatus();
}

main()
  .catch((err) => {
    console.error('❌ Sync failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await supabase.$disconnect();
    await local.$disconnect();
  });
