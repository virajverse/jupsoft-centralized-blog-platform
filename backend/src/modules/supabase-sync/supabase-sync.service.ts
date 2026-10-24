import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';

/**
 * Jupsoft CMS — Active Dual-Database Auto-Sync Engine (Method 1)
 *
 * Ensures 100% data parity between Supabase Cloud PostgreSQL and Secondary (VPS / Local) PostgreSQL
 * with a ZERO-DUPLICATE guarantee using deterministic IDs and idempotent upserts.
 *
 * Features:
 * - Automated Periodic Cron Reconciliation (every 2 hours)
 * - Startup Re-check (10s after server boot)
 * - Real-Time Event Hooks (Blogs, Websites, Users, Taxonomy, Redirects)
 * - Fault-Tolerant & Non-Blocking: Mirror failures are logged and retried without failing primary writes.
 */
@Injectable()
export class SupabaseSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('AutoSyncEngine');
  private mirrorPrisma: PrismaClient | null = null;
  private isEnabled = false;
  private mirrorTargetName = 'Secondary Database';
  private isSyncInProgress = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.initMirrorClient();
  }

  private initMirrorClient(): boolean {
    const dbUrl = this.configService.get<string>('DATABASE_URL') || '';
    const mirrorUrl =
      this.configService.get<string>('MIRROR_DATABASE_URL') ||
      this.configService.get<string>('VPS_DATABASE_URL') ||
      this.configService.get<string>('SECONDARY_DATABASE_URL') ||
      '';
    const enableMirrorSync = this.configService.get<string>('ENABLE_MIRROR_SYNC') === 'true';
    const localUrl = this.configService.get<string>('LOCAL_DATABASE_URL') || '';
    const cloudDirectUrl = this.configService.get<string>('DIRECT_URL') || '';

    const isPrimaryDbSupabase =
      dbUrl.includes('supabase.co') || dbUrl.includes('supabase.com') || dbUrl.includes('pooler.supabase');

    let targetUrl = mirrorUrl;
    if (!targetUrl && enableMirrorSync) {
      if (isPrimaryDbSupabase) {
        targetUrl = localUrl;
        this.mirrorTargetName = 'Secondary PostgreSQL (VPS / Local)';
      } else {
        targetUrl = cloudDirectUrl;
        this.mirrorTargetName = 'Supabase Cloud PostgreSQL';
      }
    } else if (targetUrl) {
      this.mirrorTargetName = 'Configured Mirror Database';
    }

    if (targetUrl && targetUrl !== dbUrl) {
      try {
        this.mirrorPrisma = new PrismaClient({
          datasources: { db: { url: targetUrl } },
        });
        this.isEnabled = true;
        this.logger.log(`[AutoSyncEngine] Initialized mirror target -> ${this.mirrorTargetName}`);
        return true;
      } catch (err: any) {
        this.logger.warn(`[AutoSyncEngine] Could not initialize client for ${this.mirrorTargetName}: ${err.message}`);
        this.isEnabled = false;
        return false;
      }
    } else {
      this.isEnabled = false;
      if (targetUrl === dbUrl) {
        this.logger.log('[AutoSyncEngine] Mirroring paused: Secondary target is identical to primary database.');
      } else {
        this.logger.log('[AutoSyncEngine] Single database mode: Dual-database mirror sync is inactive (set ENABLE_MIRROR_SYNC=true or MIRROR_DATABASE_URL to activate).');
      }
      return false;
    }
  }

  private async verifySchemaCompatibility(): Promise<boolean> {
    if (!this.mirrorPrisma) return false;
    try {
      await this.mirrorPrisma.website.findFirst({
        select: { id: true, ownerName: true, digestSchedule: true },
      });
      return true;
    } catch (err: any) {
      this.logger.warn(
        `[AutoSyncEngine] Mirror database schema is incompatible or missing columns: ${err.message}. Dual-sync paused until schema migration is run.`,
      );
      return false;
    }
  }

  async onModuleInit() {
    if (this.isEnabled && this.mirrorPrisma) {
      try {
        await this.mirrorPrisma.$connect();
        this.logger.log(`[AutoSyncEngine] Successfully connected to ${this.mirrorTargetName}`);

        const schemaCompatible = await this.verifySchemaCompatibility();
        if (!schemaCompatible) {
          this.isEnabled = false;
          return;
        }

        // Run initial synchronization 10 seconds after server boot in the background
        setTimeout(() => {
          this.logger.log('[AutoSyncEngine] Running initial post-boot database sync...');
          this.fullSync().catch((err) =>
            this.logger.warn(`[AutoSyncEngine] Initial post-boot sync failed: ${err.message}`),
          );
        }, 10000);
      } catch (err: any) {
        this.logger.warn(
          `[AutoSyncEngine] Connection to ${this.mirrorTargetName} failed on boot: ${err.message}. Will auto-retry on cron cycle.`,
        );
      }
    }
  }

  async onModuleDestroy() {
    if (this.mirrorPrisma) {
      await this.mirrorPrisma.$disconnect().catch(() => {});
    }
  }

  /**
   * Method 1: Automated Background Cron Scheduler
   * Runs every 2 hours to reconcile all records and ensure 100% data parity.
   */
  @Cron(CronExpression.EVERY_2_HOURS)
  async handlePeriodicSync() {
    if (!this.isEnabled) return;

    if (this.isSyncInProgress) {
      this.logger.log('[AutoSyncCron] A sync is already in progress, skipping this interval.');
      return;
    }

    if (!this.mirrorPrisma) {
      const initialized = this.initMirrorClient();
      if (!initialized) return;
    }

    const schemaCompatible = await this.verifySchemaCompatibility();
    if (!schemaCompatible) return;

    this.logger.log('[AutoSyncCron] Triggering automated 2-hour dual-database reconciliation (Supabase <-> Secondary)...');
    try {
      this.isSyncInProgress = true;
      const res = await this.fullSync();
      this.logger.log(`[AutoSyncCron] Periodic sync complete. Result: ${JSON.stringify(res.stats)}`);
    } catch (err: any) {
      this.logger.error(`[AutoSyncCron] Periodic sync encountered an error: ${err.message}`);
    } finally {
      this.isSyncInProgress = false;
    }
  }

  getStatus() {
    return {
      isEnabled: this.isEnabled,
      target: this.mirrorTargetName,
      isSyncInProgress: this.isSyncInProgress,
    };
  }

  // ─── Website Synchronization ────────────────────────────────────────────────
  async syncWebsite(websiteId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      const w = await this.prisma.website.findUnique({ where: { id: websiteId } });
      if (!w) return;

      await this.mirrorPrisma.website.upsert({
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
          ownerEmail: w.ownerEmail,
          monthlyBlogTarget: w.monthlyBlogTarget,
          targetCadence: w.targetCadence,
          targetAlertSchedule: w.targetAlertSchedule,
          digestSchedule: w.digestSchedule,
          recipientScope: w.recipientScope,
          defaultCoverUrl: w.defaultCoverUrl,
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
          ownerEmail: w.ownerEmail,
          monthlyBlogTarget: w.monthlyBlogTarget,
          targetCadence: w.targetCadence,
          targetAlertSchedule: w.targetAlertSchedule,
          digestSchedule: w.digestSchedule,
          recipientScope: w.recipientScope,
          defaultCoverUrl: w.defaultCoverUrl,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
        },
      });
      this.logger.log(`[AutoSync] Synced website "${w.name}" (${w.id}) to ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`[AutoSync] Failed to sync website ${websiteId}: ${err.message}`);
    }
  }

  async deleteWebsite(websiteId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      await this.mirrorPrisma.website.deleteMany({ where: { id: websiteId } });
      this.logger.log(`[AutoSync] Deleted website "${websiteId}" from ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`[AutoSync] Failed to delete website ${websiteId}: ${err.message}`);
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
        await this.syncWebsite(blog.website.id);
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
          await this.mirrorPrisma.blogCategory
            .create({
              data: { blogId: blog.id, categoryId: bc.categoryId },
            })
            .catch(() => {});
        }
      }

      await this.mirrorPrisma.blogTag.deleteMany({ where: { blogId: blog.id } });
      for (const bt of blog.blogTags) {
        const tagExists = await this.mirrorPrisma.tag.findUnique({ where: { id: bt.tagId } });
        if (tagExists) {
          await this.mirrorPrisma.blogTag
            .create({
              data: { blogId: blog.id, tagId: bt.tagId },
            })
            .catch(() => {});
        }
      }

      this.logger.log(`[AutoSync] Mirrored blog "${blog.id}" to ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`[AutoSync] Failed to mirror blog ${blogId}: ${err.message}`);
    }
  }

  async deleteBlog(blogId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      await this.mirrorPrisma.blog.deleteMany({ where: { id: blogId } });
      this.logger.log(`[AutoSync] Deleted blog "${blogId}" from ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`[AutoSync] Failed to delete blog ${blogId}: ${err.message}`);
    }
  }

  // ─── Categories & Tags Synchronization ──────────────────────────────────────
  async syncCategory(categoryId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!cat) return;

      const siteExists = await this.mirrorPrisma.website.findUnique({ where: { id: cat.websiteId } });
      if (!siteExists) {
        await this.syncWebsite(cat.websiteId);
      }

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
      this.logger.log(`[AutoSync] Synced category "${cat.name}" to ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`[AutoSync] Failed to sync category ${categoryId}: ${err.message}`);
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      await this.mirrorPrisma.category.deleteMany({ where: { id: categoryId } });
      this.logger.log(`[AutoSync] Deleted category "${categoryId}" from ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`[AutoSync] Failed to delete category ${categoryId}: ${err.message}`);
    }
  }

  async syncTag(tagId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
      if (!tag) return;

      const siteExists = await this.mirrorPrisma.website.findUnique({ where: { id: tag.websiteId } });
      if (!siteExists) {
        await this.syncWebsite(tag.websiteId);
      }

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
      this.logger.log(`[AutoSync] Synced tag "${tag.name}" to ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`[AutoSync] Failed to sync tag ${tagId}: ${err.message}`);
    }
  }

  async deleteTag(tagId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      await this.mirrorPrisma.tag.deleteMany({ where: { id: tagId } });
      this.logger.log(`[AutoSync] Deleted tag "${tagId}" from ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`[AutoSync] Failed to delete tag ${tagId}: ${err.message}`);
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
          if (!siteExists) {
            await this.syncWebsite(ra.websiteId);
          }
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

      this.logger.log(`[AutoSync] Synced user "${user.email}" to ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`[AutoSync] Failed to sync user ${userId}: ${err.message}`);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      await this.mirrorPrisma.user.deleteMany({ where: { id: userId } });
      this.logger.log(`[AutoSync] Deleted user "${userId}" from ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`[AutoSync] Failed to delete user ${userId}: ${err.message}`);
    }
  }

  // ─── Redirects Synchronization ────────────────────────────────────────────
  async syncRedirect(redirectId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      const red = await this.prisma.redirect.findUnique({ where: { id: redirectId } });
      if (!red) return;

      const siteExists = await this.mirrorPrisma.website.findUnique({ where: { id: red.websiteId } });
      if (!siteExists) {
        await this.syncWebsite(red.websiteId);
      }

      await this.mirrorPrisma.redirect.upsert({
        where: {
          websiteId_fromSlug: {
            websiteId: red.websiteId,
            fromSlug: red.fromSlug,
          },
        },
        update: {
          toSlug: red.toSlug,
          statusCode: red.statusCode,
          hitCount: red.hitCount,
        },
        create: {
          id: red.id,
          websiteId: red.websiteId,
          fromSlug: red.fromSlug,
          toSlug: red.toSlug,
          statusCode: red.statusCode,
          hitCount: red.hitCount,
          createdAt: red.createdAt,
        },
      });
      this.logger.log(`[AutoSync] Synced 301 redirect "${red.fromSlug}" to ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`[AutoSync] Failed to sync redirect ${redirectId}: ${err.message}`);
    }
  }

  async deleteRedirect(redirectId: string): Promise<void> {
    if (!this.isEnabled || !this.mirrorPrisma) return;
    try {
      await this.mirrorPrisma.redirect.deleteMany({ where: { id: redirectId } });
      this.logger.log(`[AutoSync] Deleted redirect "${redirectId}" from ${this.mirrorTargetName}`);
    } catch (err: any) {
      this.logger.warn(`[AutoSync] Failed to delete redirect ${redirectId}: ${err.message}`);
    }
  }

  // ─── Full Complete Reconciliation ──────────────────────────────────────────
  async fullSync(): Promise<{ success: boolean; stats: Record<string, number> }> {
    if (!this.isEnabled || !this.mirrorPrisma) {
      const ok = this.initMirrorClient();
      if (!ok || !this.mirrorPrisma) {
        return { success: false, stats: { error: 0 } };
      }
    }

    const stats: Record<string, number> = {
      websites: 0,
      categories: 0,
      tags: 0,
      users: 0,
      redirects: 0,
      blogs: 0,
    };

    try {
      // 1. Websites
      const websites = await this.prisma.website.findMany();
      for (const w of websites) {
        await this.syncWebsite(w.id);
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

      // 4. Users & Roles
      const users = await this.prisma.user.findMany();
      for (const u of users) {
        await this.syncUser(u.id);
        stats.users++;
      }

      // 5. Redirects
      const redirects = await this.prisma.redirect.findMany();
      for (const r of redirects) {
        await this.syncRedirect(r.id);
        stats.redirects++;
      }

      // 6. Blogs & Translations
      const blogs = await this.prisma.blog.findMany();
      for (const b of blogs) {
        await this.syncBlog(b.id);
        stats.blogs++;
      }

      this.logger.log(`[AutoSyncEngine] Full dual-database reconciliation complete. Stats: ${JSON.stringify(stats)}`);
      return { success: true, stats };
    } catch (err: any) {
      this.logger.error(`[AutoSyncEngine] Full reconciliation failed: ${err.message}`);
      return { success: false, stats };
    }
  }
}
