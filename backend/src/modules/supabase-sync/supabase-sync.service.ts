import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SupabaseSyncService {
  private readonly logger = new Logger('SupabaseSyncService');
  private readonly supabaseUrl: string;
  private readonly serviceRoleKey: string;
  private readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    let rawUrl = this.configService.get<string>('SUPABASE_URL') || '';
    rawUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    this.supabaseUrl = rawUrl;
    this.serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '';

    const dbUrl = this.configService.get<string>('DATABASE_URL') || '';
    const isPrimaryDbSupabase = dbUrl.includes('supabase.co') || dbUrl.includes('supabase.com') || dbUrl.includes('pooler.supabase');

    if (isPrimaryDbSupabase) {
      // Primary DB is already direct Supabase PostgreSQL via Prisma pooler.
      // Disable REST HTTP self-sync to avoid redundant writes, race conditions, and pool exhaustion.
      this.isEnabled = false;
      this.logger.log('⚡ Supabase Live REST Sync inactive: Primary PostgreSQL is already Supabase.');
    } else {
      this.isEnabled = Boolean(this.supabaseUrl && this.serviceRoleKey);
      if (this.isEnabled) {
        this.logger.log(`⚡ Supabase Live Backup Sync active: ${this.supabaseUrl}`);
      } else {
        this.logger.warn('⚠️ Supabase Live Backup Sync disabled: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
      }
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    };
  }

  private async request(endpoint: string, method = 'GET', body?: any): Promise<any> {
    if (!this.isEnabled) return null;
    const url = `${this.supabaseUrl}/rest/v1/${endpoint}`;
    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Supabase API ${method} ${endpoint} failed (${response.status}): ${errorText}`);
        return null;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return true;
    } catch (err: any) {
      this.logger.warn(`Supabase network error for ${method} ${endpoint}: ${err.message}`);
      return null;
    }
  }

  // ─── Blog Synchronization ──────────────────────────────────────────────────
  async syncBlog(blogId: string): Promise<void> {
    if (!this.isEnabled) return;
    try {
      const blog = await this.prisma.blog.findUnique({
        where: { id: blogId },
        include: {
          translations: true,
          blogCategories: true,
          blogTags: true,
        },
      });

      if (!blog) return;

      // 1. Upsert parent blog row
      await this.request('blogs', 'POST', {
        id: blog.id,
        websiteId: blog.websiteId,
        authorId: blog.authorId,
        authorName: blog.authorName,
        authorAvatar: blog.authorAvatar,
        status: blog.status,
        featuredImage: blog.featuredImage,
        featuredImageAlt: blog.featuredImageAlt,
        readTimeMinutes: blog.readTimeMinutes,
        categoryIds: blog.categoryIds,
        tagIds: blog.tagIds,
        publishDate: blog.publishDate ? blog.publishDate.toISOString() : null,
        publishedBy: blog.publishedBy,
        scheduledAt: blog.scheduledAt ? blog.scheduledAt.toISOString() : null,
        viewCount: blog.viewCount,
        createdAt: blog.createdAt.toISOString(),
        updatedAt: blog.updatedAt.toISOString(),
      });

      // 2. Upsert translations
      for (const t of blog.translations) {
        await this.request('blog_translations', 'POST', {
          id: t.id,
          blogId: t.blogId,
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
        });
      }

      // 3. Upsert category relations (clear old to avoid duplicates)
      await this.request(`blog_categories?blogId=eq.${blog.id}`, 'DELETE');
      for (const bc of blog.blogCategories) {
        await this.request('blog_categories', 'POST', {
          blogId: bc.blogId,
          categoryId: bc.categoryId,
        });
      }

      // 4. Upsert tag relations (clear old to avoid duplicates)
      await this.request(`blog_tags?blogId=eq.${blog.id}`, 'DELETE');
      for (const bt of blog.blogTags) {
        await this.request('blog_tags', 'POST', {
          blogId: bt.blogId,
          tagId: bt.tagId,
        });
      }

      this.logger.log(`✅ [Supabase Backup] Synced blog "${blog.id}" with ${blog.translations.length} translations`);
    } catch (err: any) {
      this.logger.warn(`Failed to sync blog ${blogId} to Supabase: ${err.message}`);
    }
  }

  async deleteBlog(blogId: string): Promise<void> {
    if (!this.isEnabled) return;
    try {
      await this.request(`blogs?id=eq.${blogId}`, 'DELETE');
      this.logger.log(`🗑️ [Supabase Backup] Deleted blog "${blogId}" from Supabase`);
    } catch (err: any) {
      this.logger.warn(`Failed to delete blog ${blogId} from Supabase: ${err.message}`);
    }
  }

  // ─── Categories & Tags Synchronization ──────────────────────────────────────
  async syncCategory(categoryId: string): Promise<void> {
    if (!this.isEnabled) return;
    try {
      const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!cat) return;
      await this.request('categories', 'POST', {
        id: cat.id,
        websiteId: cat.websiteId,
        name: cat.name,
        slug: cat.slug,
        parentId: cat.parentId,
        description: cat.description,
        count: cat.count,
      });
      this.logger.log(`✅ [Supabase Backup] Synced category "${cat.name}"`);
    } catch (err: any) {
      this.logger.warn(`Failed to sync category ${categoryId}: ${err.message}`);
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    if (!this.isEnabled) return;
    try {
      await this.request(`categories?id=eq.${categoryId}`, 'DELETE');
      this.logger.log(`🗑️ [Supabase Backup] Deleted category "${categoryId}"`);
    } catch (err: any) {
      this.logger.warn(`Failed to delete category ${categoryId}: ${err.message}`);
    }
  }

  async syncTag(tagId: string): Promise<void> {
    if (!this.isEnabled) return;
    try {
      const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
      if (!tag) return;
      await this.request('tags', 'POST', {
        id: tag.id,
        websiteId: tag.websiteId,
        name: tag.name,
        slug: tag.slug,
        count: tag.count,
      });
      this.logger.log(`✅ [Supabase Backup] Synced tag "${tag.name}"`);
    } catch (err: any) {
      this.logger.warn(`Failed to sync tag ${tagId}: ${err.message}`);
    }
  }

  async deleteTag(tagId: string): Promise<void> {
    if (!this.isEnabled) return;
    try {
      await this.request(`tags?id=eq.${tagId}`, 'DELETE');
      this.logger.log(`🗑️ [Supabase Backup] Deleted tag "${tagId}"`);
    } catch (err: any) {
      this.logger.warn(`Failed to delete tag ${tagId}: ${err.message}`);
    }
  }

  // ─── Users Synchronization ────────────────────────────────────────────────
  async syncUser(userId: string): Promise<void> {
    if (!this.isEnabled) return;
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) return;
      await this.request('users', 'POST', {
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
        avatar: user.avatar,
        status: user.status,
        lastLoginIp: user.lastLoginIp,
        loginAttempts: user.loginAttempts,
        lockoutUntil: user.lockoutUntil ? user.lockoutUntil.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      });
      this.logger.log(`✅ [Supabase Backup] Synced user "${user.email}"`);
    } catch (err: any) {
      this.logger.warn(`Failed to sync user ${userId}: ${err.message}`);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    if (!this.isEnabled) return;
    try {
      await this.request(`users?id=eq.${userId}`, 'DELETE');
      this.logger.log(`🗑️ [Supabase Backup] Deleted user "${userId}"`);
    } catch (err: any) {
      this.logger.warn(`Failed to delete user ${userId}: ${err.message}`);
    }
  }

  // ─── Full Initial / Periodic Synchronization ──────────────────────────────
  async fullSync(): Promise<{ success: boolean; stats: Record<string, number> }> {
    if (!this.isEnabled) {
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
      // 1. Sync Websites
      const websites = await this.prisma.website.findMany();
      for (const w of websites) {
        await this.request('websites', 'POST', {
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
          createdAt: w.createdAt.toISOString(),
          updatedAt: w.updatedAt.toISOString(),
        });
        stats.websites++;
      }

      // 2. Sync Categories
      const categories = await this.prisma.category.findMany();
      for (const c of categories) {
        await this.syncCategory(c.id);
        stats.categories++;
      }

      // 3. Sync Tags
      const tags = await this.prisma.tag.findMany();
      for (const t of tags) {
        await this.syncTag(t.id);
        stats.tags++;
      }

      // 4. Sync Users
      const users = await this.prisma.user.findMany();
      for (const u of users) {
        await this.syncUser(u.id);
        stats.users++;
      }

      // 5. Sync Blogs
      const blogs = await this.prisma.blog.findMany();
      for (const b of blogs) {
        await this.syncBlog(b.id);
        stats.blogs++;
      }

      this.logger.log(`🎉 [Supabase Backup] Full sync complete! Stats: ${JSON.stringify(stats)}`);
      return { success: true, stats };
    } catch (err: any) {
      this.logger.error(`Full sync failed: ${err.message}`);
      return { success: false, stats };
    }
  }
}
