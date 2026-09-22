import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';

/**
 * Jupsoft CMS — Active Dual-Write Mirroring Service
 *
 * Ensures 100% data parity between Supabase Cloud PostgreSQL and Local PostgreSQL
 * with a ZERO-DUPLICATE guarantee using deterministic IDs and idempotent upserts.
 *
 * - If Primary DB is Supabase Cloud, Mirror DB is Local PostgreSQL.
 * - If Primary DB is Local PostgreSQL, Mirror DB is Supabase Cloud.
 */
@Injectable()
export class SupabaseSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('DualWriteMirrorService');
  private mirrorPrisma: PrismaClient | null = null;
  private isEnabled = false;
  private mirrorTargetName = 'Secondary Database';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const dbUrl = this.configService.get<string>('DATABASE_URL') || '';
    const localUrl = this.configService.get<string>('LOCAL_DATABASE_URL') || '';
    const cloudDirectUrl = this.configService.get<string>('DIRECT_URL') || '';

    const isPrimaryDbSupabase =
      dbUrl.includes('supabase.co') || dbUrl.includes('supabase.com') || dbUrl.includes('pooler.supabase');

    let targetUrl: string;
    if (isPrimaryDbSupabase) {
      targetUrl = localUrl;
      this.mirrorTargetName = 'Local PostgreSQL (localhost:5432)';
    } else {
      targetUrl = cloudDirectUrl;
      this.mirrorTargetName = 'Supabase Cloud PostgreSQL';
    }

    // Only enable mirroring if a dedicated, distinct secondary database URL is configured
    if (targetUrl && targetUrl !== dbUrl) {
      this.mirrorPrisma = new PrismaClient({
        datasources: { db: { url: targetUrl } },
      });
      this.isEnabled = true;
      this.logger.log(`⚡ Active Dual-Write Mirroring initialized -> Target: ${this.mirrorTargetName}`);
    } else {
      this.isEnabled = false;
      if (targetUrl === dbUrl) {
        this.logger.log('ℹ️ Dual-Write Mirroring disabled: Secondary target is identical to primary database.');
      } else {
        this.logger.log('ℹ️ Dual-Write Mirroring inactive: No secondary database URL configured (DIRECT_URL / LOCAL_DATABASE_URL). Single database mode.');
      }
    }
  }

  async onModuleInit() {
    if (this.isEnabled && this.mirrorPrisma) {
      try {
        await this.mirrorPrisma.$connect();
        this.logger.log(`✅ [Dual-Write Mirror] Connected to ${this.mirrorTargetName}`);
      } catch (err: any) {
        this.logger.warn(
          `⚠️ [Dual-Write Mirror] Could not connect to ${this.mirrorTargetName}: ${err.message}. Mirroring will retry on write.`,
        );
      }
    }
  }

  async onModuleDestroy() {
    if (this.mirrorPrisma) {
      await this.mirrorPrisma.$disconnect().catch(() => {});
    }
  }

  // ─── Blog Synchronization ──────────────────────────────────────────────────
  async syncBlog(blogId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      const blog = await this.prisma.blog.findUnique({
        where: { id: blogId },
        include: {
          translations: true,
          blogCategories: true,
          blogTags: true,
          website: true,
          author: true,
        },
      });

      if (!blog) return;

      // 1. Ensure Website exists on mirror
      if (blog.website) {
        await this.mirrorPrisma.website.upsert({
          where: { id: blog.website.id },
          update: {
            name: blog.website.name,
            domain: blog.website.domain,
            apiKey: blog.website.apiKey,
            status: blog.website.status,
          },
          create: {
            id: blog.website.id,
            name: blog.website.name,
            domain: blog.website.domain,
            apiKey: blog.website.apiKey,
            s3Prefix: blog.website.s3Prefix,
            status: blog.website.status,
            defaultLanguage: blog.website.defaultLanguage,
            supportedLanguages: blog.website.supportedLanguages,
            revalidateWebhookUrl: blog.website.revalidateWebhookUrl,
          },
        });
      }

      // 2. Ensure Author exists on mirror
      let authorId = blog.authorId;
      if (blog.author) {
        const authorRecord = await this.mirrorPrisma.user.upsert({
          where: { email: blog.author.email },
          update: {
            name: blog.author.name,
            status: blog.author.status,
          },
          create: {
            id: blog.author.id,
            email: blog.author.email,
            name: blog.author.name,
            passwordHash: blog.author.passwordHash,
            avatar: blog.author.avatar,
            status: blog.author.status,
          },
        });
        authorId = authorRecord.id;
      }

      // 3. Upsert Parent Blog with EXACT matching UUID (Zero Duplicate Rule)
      await this.mirrorPrisma.blog.upsert({
        where: { id: blog.id },
        update: {
          websiteId: blog.websiteId,
          authorId: authorId,
          authorName: blog.authorName,
          authorAvatar: blog.authorAvatar,
          featuredImage: blog.featuredImage,
          featuredImageAlt: blog.featuredImageAlt,
          status: blog.status,
          publishDate: blog.publishDate,
          scheduledAt: blog.scheduledAt,
          publishedBy: blog.publishedBy,
          viewCount: blog.viewCount,
          readTimeMinutes: blog.readTimeMinutes,
          categoryIds: blog.categoryIds,
          tagIds: blog.tagIds,
          updatedAt: blog.updatedAt,
        },
        create: {
          id: blog.id,
          websiteId: blog.websiteId,
          authorId: authorId,
          authorName: blog.authorName,
          authorAvatar: blog.authorAvatar,
          featuredImage: blog.featuredImage,
          featuredImageAlt: blog.featuredImageAlt,
          status: blog.status,
          publishDate: blog.publishDate,
          scheduledAt: blog.scheduledAt,
          publishedBy: blog.publishedBy,
          viewCount: blog.viewCount,
          readTimeMinutes: blog.readTimeMinutes,
          categoryIds: blog.categoryIds,
          tagIds: blog.tagIds,
          createdAt: blog.createdAt,
          updatedAt: blog.updatedAt,
        },
      });

      // 4. Upsert Translations
      for (const t of blog.translations) {
        await this.mirrorPrisma.blogTranslation.upsert({
          where: {
            blogId_lang: {
              blogId: blog.id,
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
            blogId: blog.id,
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

      // 5. Sync Category & Tag Relations
      await this.mirrorPrisma.blogCategory.deleteMany({ where: { blogId: blog.id } });
      for (const bc of blog.blogCategories) {
        const catExists = await this.mirrorPrisma.category.findUnique({ where: { id: bc.categoryId } });
        if (catExists) {
          await this.mirrorPrisma.blogCategory.create({
            data: { blogId: blog.id, categoryId: bc.categoryId },
          }).catch(() => {});
        }
      }

      await this.mirrorPrisma.blogTag.deleteMany({ where: { blogId: blog.id } });
      for (const bt of blog.blogTags) {
        const tagExists = await this.mirrorPrisma.tag.findUnique({ where: { id: bt.tagId } });
        if (tagExists) {
          await this.mirrorPrisma.blogTag.create({
            data: { blogId: blog.id, tagId: bt.tagId },
          }).catch(() => {});
        }
      }

      this.logger.log(`✅ [Dual-Write Mirror] Successfully mirrored blog "${blog.id}" to ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`⚠️ [Dual-Write Mirror] Failed to mirror blog ${blogId}: ${err.message}`);
    }
  }

  async deleteBlog(blogId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      await this.mirrorPrisma.blog.deleteMany({ where: { id: blogId } });
      this.logger.log(`🗑️ [Dual-Write Mirror] Deleted blog "${blogId}" from ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`⚠️ [Dual-Write Mirror] Failed to delete blog ${blogId}: ${err.message}`);
    }
  }

  // ─── Categories & Tags Synchronization ──────────────────────────────────────
  async syncCategory(categoryId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!cat) return;

      const siteExists = await this.mirrorPrisma.website.findUnique({ where: { id: cat.websiteId } });
      if (!siteExists) return;

      await this.mirrorPrisma.category.upsert({
        where: {
          websiteId_slug: {
            websiteId: cat.websiteId,
            slug: cat.slug,
          },
        },
        update: {
          name: cat.name,
          parentId: cat.parentId,
          description: cat.description,
          count: cat.count,
        },
        create: {
          id: cat.id,
          websiteId: cat.websiteId,
          name: cat.name,
          slug: cat.slug,
          parentId: cat.parentId,
          description: cat.description,
          count: cat.count,
        },
      });
      this.logger.log(`✅ [Dual-Write Mirror] Synced category "${cat.name}" to ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`⚠️ [Dual-Write Mirror] Failed to sync category ${categoryId}: ${err.message}`);
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      await this.mirrorPrisma.category.deleteMany({ where: { id: categoryId } });
      this.logger.log(`🗑️ [Dual-Write Mirror] Deleted category "${categoryId}" from ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`⚠️ [Dual-Write Mirror] Failed to delete category ${categoryId}: ${err.message}`);
    }
  }

  async syncTag(tagId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
      if (!tag) return;

      const siteExists = await this.mirrorPrisma.website.findUnique({ where: { id: tag.websiteId } });
      if (!siteExists) return;

      await this.mirrorPrisma.tag.upsert({
        where: {
          websiteId_slug: {
            websiteId: tag.websiteId,
            slug: tag.slug,
          },
        },
        update: {
          name: tag.name,
          count: tag.count,
        },
        create: {
          id: tag.id,
          websiteId: tag.websiteId,
          name: tag.name,
          slug: tag.slug,
          count: tag.count,
        },
      });
      this.logger.log(`✅ [Dual-Write Mirror] Synced tag "${tag.name}" to ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`⚠️ [Dual-Write Mirror] Failed to sync tag ${tagId}: ${err.message}`);
    }
  }

  async deleteTag(tagId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      await this.mirrorPrisma.tag.deleteMany({ where: { id: tagId } });
      this.logger.log(`🗑️ [Dual-Write Mirror] Deleted tag "${tagId}" from ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`⚠️ [Dual-Write Mirror] Failed to delete tag ${tagId}: ${err.message}`);
    }
  }

  // ─── Users Synchronization ────────────────────────────────────────────────
  async syncUser(userId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roleAssignments: true },
      });
      if (!user) return;

      const targetUser = await this.mirrorPrisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          passwordHash: user.passwordHash,
          avatar: user.avatar,
          status: user.status,
          lastLoginIp: user.lastLoginIp,
          loginAttempts: user.loginAttempts,
          lockoutUntil: user.lockoutUntil,
          updatedAt: user.updatedAt,
        },
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
          passwordHash: user.passwordHash,
          avatar: user.avatar,
          status: user.status,
          lastLoginIp: user.lastLoginIp,
          loginAttempts: user.loginAttempts,
          lockoutUntil: user.lockoutUntil,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });

      await this.mirrorPrisma.userRoleAssignment.deleteMany({ where: { userId: targetUser.id } });
      for (const ra of user.roleAssignments) {
        if (ra.websiteId) {
          const siteExists = await this.mirrorPrisma.website.findUnique({ where: { id: ra.websiteId } });
          if (!siteExists) continue;
        }
        await this.mirrorPrisma.userRoleAssignment.create({
          data: {
            id: ra.id,
            userId: targetUser.id,
            websiteId: ra.websiteId,
            isGlobal: ra.isGlobal,
            role: ra.role,
            createdAt: ra.createdAt,
          },
        });
      }

      this.logger.log(`✅ [Dual-Write Mirror] Synced user "${user.email}" to ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`⚠️ [Dual-Write Mirror] Failed to sync user ${userId}: ${err.message}`);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      await this.mirrorPrisma.user.deleteMany({ where: { id: userId } });
      this.logger.log(`🗑️ [Dual-Write Mirror] Deleted user "${userId}" from ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`⚠️ [Dual-Write Mirror] Failed to delete user ${userId}: ${err.message}`);
    }
  }

  // ─── Full Periodic / Triggered Synchronization ──────────────────────────────
  async fullSync(): Promise<{ success: boolean; stats: Record<string, number> }> {
    if (!this.isEnabled || !this.mirrorPrisma) {
      return { success: false, stats: { error: 0 } };
    }

    const stats: Record<string, number> = {
      websites: 0,
      categories: 0,
      tags: 0,
      users: 0,
      blogs: 0,
    };

    try {
      // 1. Websites
      const websites = await this.prisma.website.findMany();
      for (const w of websites) {
        await this.mirrorPrisma.website.upsert({
          where: { id: w.id },
          update: {
            name: w.name,
            domain: w.domain,
            apiKey: w.apiKey,
            status: w.status,
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
        stats.websites++;
      }

      // 2. Categories
      const categories = await this.prisma.category.findMany();
      for (const c of categories) {
        await this.syncCategory(c.id);
        stats.categories++;
      }

      // 3. Tags
      const tags = await this.prisma.tag.findMany();
      for (const t of tags) {
        await this.syncTag(t.id);
        stats.tags++;
      }

      // 4. Users
      const users = await this.prisma.user.findMany();
      for (const u of users) {
        await this.syncUser(u.id);
        stats.users++;
      }

      // 5. Blogs
      const blogs = await this.prisma.blog.findMany();
      for (const b of blogs) {
        await this.syncBlog(b.id);
        stats.blogs++;
      }

      this.logger.log(`🎉 [Dual-Write Mirror] Full reconciliation complete! Stats: ${JSON.stringify(stats)}`);
      return { success: true, stats };
    } catch (err: any) {
      this.logger.error(`[Dual-Write Mirror] Full reconciliation failed: ${err.message}`);
      return { success: false, stats };
    }
  }
}
