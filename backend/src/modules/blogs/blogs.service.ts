import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookDispatcherService } from '../webhooks/webhook-dispatcher.service';
import { CreateBlogDto, UpdateBlogDto, TransitionBlogStatusDto } from './dto/create-blog.dto';
import { AuthenticatedUser } from '../../common/interfaces/auth-user.interface';
import { RedisProvider } from '../../common/providers/redis.provider';
import { sanitizeContent } from '../../common/pipes/html-sanitize.pipe'; // TRD §15: XSS protection
import { EmailService } from '../email/email.service'; // AWS SES workflow notifications
import { SupabaseSyncService } from '../supabase-sync/supabase-sync.service';

@Injectable()
export class BlogsService {
  constructor(
    private prisma: PrismaService,
    private webhookDispatcher: WebhookDispatcherService,
    private redis: RedisProvider,
    private emailService: EmailService,
    private supabaseSync: SupabaseSyncService,
  ) {}

  async findAll(params: {
    websiteId?: string;
    status?: string;
    search?: string;
    authorId?: string;
    page?: number;
    limit?: number;
  }) {
    const { websiteId, status, search, authorId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (websiteId && websiteId !== 'all') {
      where.websiteId = websiteId;
    }
    if (status && status !== 'All') {
      where.status = status;
    }
    if (authorId) {
      where.authorId = authorId;
    }
    if (search) {
      where.translations = {
        some: {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ],
        },
      };
    }

    const cacheKey = `admin:blogs:${websiteId || 'all'}:${status || 'all'}:${page}:${limit}:${search || ''}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const [total, blogs] = await Promise.all([
      this.prisma.blog.count({ where }),
      this.prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          website: { select: { id: true, name: true, domain: true } },
          translations: {
            select: {
              id: true,
              lang: true,
              title: true,
              slug: true,
              excerpt: true,
              metaTitle: true,
              metaDescription: true,
              metaKeywords: true,
              canonicalUrl: true,
              focusKeyword: true,
              robots: true,
              ogTitle: true,
              ogDescription: true,
              ogImage: true,
              twitterTitle: true,
              twitterDescription: true,
              twitterImage: true,
            },
          },
          workflowLogs: { orderBy: { timestamp: 'desc' }, take: 5 },
        },
      }),
    ]);

    // Format response matching frontend Blog interface
    const formatted = blogs.map((b) => ({
      id: b.id,
      websiteId: b.websiteId,
      authorId: b.authorId,
      authorName: b.authorName,
      authorAvatar: b.authorAvatar,
      featuredImage: b.featuredImage,
      featuredImageAlt: b.featuredImageAlt,
      status: b.status,
      publishDate: b.publishDate?.toISOString(),
      scheduledAt: b.scheduledAt?.toISOString(),
      publishedBy: b.publishedBy,
      viewCount: b.viewCount,
      readTimeMinutes: b.readTimeMinutes,
      categoryIds: b.categoryIds,
      tagIds: b.tagIds,
      translations: b.translations.reduce((acc, t) => {
        acc[t.lang] = {
          title: t.title,
          slug: t.slug,
          excerpt: t.excerpt,
          content: '', // Omitted in list view for 0-delay performance; loaded in detail view
          seo: {
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
        };
        return acc;
      }, {} as any),
      workflowLogs: b.workflowLogs.map((l) => ({
        id: l.id,
        blogId: l.blogId,
        fromStatus: l.fromStatus,
        toStatus: l.toStatus,
        changedBy: l.changedBy,
        role: l.role,
        notes: l.notes,
        timestamp: l.timestamp.toISOString(),
      })),
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));

    const result = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: formatted,
    };

    // Cache list result for 60s
    await this.redis.set(cacheKey, result, 60);

    return result;
  }

  async findOne(id: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      include: {
        website: true,
        translations: true,
        workflowLogs: { orderBy: { timestamp: 'desc' } },
      },
    });

    if (!blog) {
      throw new NotFoundException(`Blog with ID "${id}" not found`);
    }

    return {
      id: blog.id,
      websiteId: blog.websiteId,
      authorId: blog.authorId,
      authorName: blog.authorName,
      authorAvatar: blog.authorAvatar,
      featuredImage: blog.featuredImage,
      featuredImageAlt: blog.featuredImageAlt,
      status: blog.status,
      publishDate: blog.publishDate?.toISOString(),
      scheduledAt: blog.scheduledAt?.toISOString(),
      publishedBy: blog.publishedBy,
      viewCount: blog.viewCount,
      readTimeMinutes: blog.readTimeMinutes,
      categoryIds: blog.categoryIds,
      tagIds: blog.tagIds,
      translations: blog.translations.reduce((acc, t) => {
        acc[t.lang] = {
          title: t.title,
          slug: t.slug,
          excerpt: t.excerpt,
          content: t.content,
          seo: {
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
        };
        return acc;
      }, {} as any),
      workflowLogs: blog.workflowLogs.map((l) => ({
        id: l.id,
        blogId: l.blogId,
        fromStatus: l.fromStatus,
        toStatus: l.toStatus,
        changedBy: l.changedBy,
        role: l.role,
        notes: l.notes,
        timestamp: l.timestamp.toISOString(),
      })),
      createdAt: blog.createdAt.toISOString(),
      updatedAt: blog.updatedAt.toISOString(),
    };
  }

  async create(dto: CreateBlogDto, user: AuthenticatedUser, ipAddress: string) {
    const initialStatus = dto.status || 'Draft';
    const isPublishing = initialStatus === 'Published';
    const blog = await this.prisma.$transaction(async (tx) => {
      const createdBlog = await tx.blog.create({
        data: {
          websiteId: dto.websiteId,
          authorId: user.id,
          authorName: user.name,
          authorAvatar: user.avatar || '',
          featuredImage: dto.featuredImage?.trim() || '/uploads/blogs/default-blog-cover.webp',
          featuredImageAlt: dto.featuredImageAlt || '',
          status: initialStatus,
          publishDate: isPublishing ? new Date() : undefined,
          publishedBy: isPublishing ? user.name : undefined,
          readTimeMinutes: dto.readTimeMinutes || 3,
          categoryIds: dto.categoryIds || [],
          tagIds: dto.tagIds || [],
          translations: {
            create: dto.translations.map((t) => ({
              lang: t.lang,
              title: t.title,
              slug: t.slug,
              excerpt: t.excerpt || '',
              content: sanitizeContent(t.content || ''), // TRD §15: XSS sanitize rich-text
              metaTitle: t.metaTitle || t.title,
              metaDescription: t.metaDescription || t.excerpt || '',
              metaKeywords: t.metaKeywords || '',
              canonicalUrl: t.canonicalUrl || '',
              focusKeyword: t.focusKeyword || '',
              robots: t.robots || 'index, follow',
              ogTitle: t.ogTitle || t.title,
              ogDescription: t.ogDescription || t.excerpt || '',
              ogImage: t.ogImage || dto.featuredImage || '',
              twitterTitle: t.twitterTitle || t.title,
              twitterDescription: t.twitterDescription || t.excerpt || '',
              twitterImage: t.twitterImage || dto.featuredImage || '',
            })),
          },
        },
      });

      // Sync join tables from categoryIds / tagIds arrays (Fix 7: keep M:N tables in sync)
      if (dto.categoryIds && dto.categoryIds.length > 0) {
        await tx.blogCategory.createMany({
          data: dto.categoryIds.map((cid) => ({ blogId: createdBlog.id, categoryId: cid })),
          skipDuplicates: true,
        });
      }
      if (dto.tagIds && dto.tagIds.length > 0) {
        await tx.blogTag.createMany({
          data: dto.tagIds.map((tid) => ({ blogId: createdBlog.id, tagId: tid })),
          skipDuplicates: true,
        });
      }

      // Record workflow log if status is non-draft
      if (initialStatus !== 'Draft') {
        await tx.workflowLog.create({
          data: {
            blogId: createdBlog.id,
            fromStatus: 'Draft',
            toStatus: initialStatus,
            changedBy: user.name,
            role: user.roles[0] || 'User',
            notes: `Initial publication as ${initialStatus}.`,
          },
        });
      }

      // Record initial creation in audit log
      await tx.systemAuditLog.create({
        data: {
          userName: user.name,
          role: user.roles[0] || 'Content Writer',
          websiteId: dto.websiteId,
          event: isPublishing ? 'blog.published' : 'blog.created',
          ipAddress: ipAddress || '',
          details: `Created article "${dto.translations[0]?.title || createdBlog.id}" (${initialStatus}).`,
        },
      });

      return createdBlog;
    });

    if (isPublishing) {
      await this.invalidateCache(blog.websiteId, dto.translations);
      const primarySlug = dto.translations.find((t) => t.lang === 'en')?.slug || dto.translations[0]?.slug;
      if (primarySlug) {
        await this.webhookDispatcher.dispatchWebhook(blog.websiteId, 'blog.published', primarySlug);
      }
    }

    // Mirror to Supabase Cloud Backup (non-blocking)
    this.supabaseSync.syncBlog(blog.id).catch(() => {});

    // Invalidate admin list caches so new draft appears immediately
    await this.redis.delPattern('admin:blogs:*');

    return this.findOne(blog.id);
  }

  async update(id: string, dto: UpdateBlogDto, user: AuthenticatedUser, ipAddress: string) {
    const existing = await this.prisma.blog.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!existing) {
      throw new NotFoundException(`Blog with ID "${id}" not found`);
    }

    // Execute atomic update transaction across blog, redirects, taxonomies, and translations
    await this.prisma.$transaction(async (tx) => {
      // TRD Section 7: If blog is published, check if any translation's slug was modified
      if (existing.status === 'Published' && dto.translations) {
        for (const updatedTrans of dto.translations) {
          const oldTrans = existing.translations.find((t) => t.lang === updatedTrans.lang);
          if (oldTrans && oldTrans.slug && updatedTrans.slug && oldTrans.slug !== updatedTrans.slug) {
            // Automatic 301 Permanent Redirect Guard!
            await tx.redirect.upsert({
              where: {
                websiteId_fromSlug: {
                  websiteId: existing.websiteId,
                  fromSlug: oldTrans.slug,
                },
              },
              update: { toSlug: updatedTrans.slug },
              create: {
                websiteId: existing.websiteId,
                fromSlug: oldTrans.slug,
                toSlug: updatedTrans.slug,
                statusCode: 301,
              },
            });

            // Log redirect rule in audit log
            await tx.systemAuditLog.create({
              data: {
                userName: user.name,
                role: user.roles[0] || 'Editor',
                websiteId: existing.websiteId,
                event: 'redirect.created',
                ipAddress: ipAddress || '',
                details: `Auto 301 redirect: /${oldTrans.slug} → /${updatedTrans.slug}`,
              },
            });
          }
        }
      }

      // Update main blog record
      const blogUpdateData: any = {
        featuredImage: dto.featuredImage,
        featuredImageAlt: dto.featuredImageAlt,
        readTimeMinutes: dto.readTimeMinutes,
        categoryIds: dto.categoryIds,
        tagIds: dto.tagIds,
      };
      if (dto.websiteId) {
        blogUpdateData.websiteId = dto.websiteId;
      }
      if (dto.status) {
        blogUpdateData.status = dto.status;
        if (dto.status === 'Published' && !existing.publishDate) {
          blogUpdateData.publishDate = new Date();
          blogUpdateData.publishedBy = user.name;
        }
      }
      await tx.blog.update({
        where: { id },
        data: blogUpdateData,
      });

      if (dto.status && dto.status !== existing.status) {
        await tx.workflowLog.create({
          data: {
            blogId: id,
            fromStatus: existing.status,
            toStatus: dto.status,
            changedBy: user.name,
            role: user.roles[0] || 'User',
            notes: `Status changed to ${dto.status}.`,
          },
        });
      }

      // Sync join tables (Fix 7)
      if (dto.categoryIds !== undefined) {
        await tx.blogCategory.deleteMany({ where: { blogId: id } });
        if (dto.categoryIds.length > 0) {
          await tx.blogCategory.createMany({
            data: dto.categoryIds.map((cid) => ({ blogId: id, categoryId: cid })),
            skipDuplicates: true,
          });
        }
      }
      if (dto.tagIds !== undefined) {
        await tx.blogTag.deleteMany({ where: { blogId: id } });
        if (dto.tagIds.length > 0) {
          await tx.blogTag.createMany({
            data: dto.tagIds.map((tid) => ({ blogId: id, tagId: tid })),
            skipDuplicates: true,
          });
        }
      }

      // Update or insert translations
      if (dto.translations && dto.translations.length > 0) {
        for (const t of dto.translations) {
          await tx.blogTranslation.upsert({
            where: {
              blogId_lang: { blogId: id, lang: t.lang },
            },
            update: {
              title: t.title,
              slug: t.slug,
              excerpt: t.excerpt,
              content: t.content ? sanitizeContent(t.content) : t.content, // TRD §15: XSS
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
              blogId: id,
              lang: t.lang,
              title: t.title,
              slug: t.slug,
              excerpt: t.excerpt || '',
              content: sanitizeContent(t.content || ''), // TRD §15: XSS
              metaTitle: t.metaTitle || t.title,
              metaDescription: t.metaDescription || '',
              metaKeywords: t.metaKeywords || '',
              canonicalUrl: t.canonicalUrl || '',
              focusKeyword: t.focusKeyword || '',
              robots: t.robots || 'index, follow',
              ogTitle: t.ogTitle || t.title,
              ogDescription: t.ogDescription || '',
              ogImage: t.ogImage || '',
              twitterTitle: t.twitterTitle || t.title,
              twitterDescription: t.twitterDescription || '',
              twitterImage: t.twitterImage || '',
            },
          });
        }
      }
    });

    // TRD §13: Invalidate Redis cache on update so consuming sites get fresh content
    const updated = await this.findOne(id);
    await this.invalidateCache(existing.websiteId, existing.translations);
    if (dto.translations && dto.translations.length > 0) {
      await this.invalidateCache(existing.websiteId, dto.translations);
    }

    // TRD §13: On-Demand Webhook ISR Revalidation Trigger on update
    if (existing.status === 'Published' || dto.status === 'Published') {
      const primarySlug =
        dto.translations?.find((t) => t.lang === 'en')?.slug ||
        existing.translations?.find((t) => t.lang === 'en')?.slug ||
        existing.translations?.[0]?.slug;
      if (primarySlug) {
        await this.webhookDispatcher.dispatchWebhook(existing.websiteId, 'blog.updated', primarySlug);
      }
    }

    // Mirror to Supabase Cloud Backup (non-blocking)
    this.supabaseSync.syncBlog(id).catch(() => {});

    return updated;
  }

  // ─── Helper: invalidate all Redis cache keys for this blog (TRD §13)
  private async invalidateCache(websiteId: string, translations: Array<{ slug: string }>): Promise<void> {
    for (const tr of translations) {
      await this.redis.delPattern(`blog:${websiteId}:${tr.slug}:*`);
    }
    await this.redis.delPattern(`blogs:${websiteId}:*`);
    await this.redis.delPattern(`search:${websiteId}:*`);
    await this.redis.delPattern('admin:blogs:*');
  }

  async transitionStatus(id: string, dto: TransitionBlogStatusDto, user: AuthenticatedUser, ipAddress: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!blog) {
      throw new NotFoundException(`Blog with ID "${id}" not found`);
    }

    const previousStatus = blog.status;
    const newStatus = dto.status;

    // RBAC validation: Content Writer cannot directly publish
    if (newStatus === 'Published' && user.roles.includes('Content Writer') && !user.roles.includes('Super Admin') && !user.roles.includes('Publisher')) {
      throw new ForbiddenException('Content Writers cannot directly publish articles. Please submit for review.');
    }

    const isPublishing = newStatus === 'Published';
    const isArchiving = newStatus === 'Archived';
    const isScheduling = newStatus === 'Scheduled';

    // Atomic status transition across blog, workflow history, and audit log
    await this.prisma.$transaction(async (tx) => {
      await tx.blog.update({
        where: { id },
        data: {
          status: newStatus,
          publishDate: isPublishing && !blog.publishDate ? new Date() : blog.publishDate,
          publishedBy: isPublishing ? user.name : blog.publishedBy,
          scheduledAt: isScheduling && dto.scheduledAt ? new Date(dto.scheduledAt) : (isPublishing ? null : blog.scheduledAt),
        },
      });

      // Record in workflow log
      await tx.workflowLog.create({
        data: {
          blogId: id,
          fromStatus: previousStatus,
          toStatus: newStatus,
          changedBy: user.name,
          role: user.roles[0] || 'User',
          notes: dto.notes || `Moved to ${newStatus}`,
        },
      });

      // Record in system audit log
      await tx.systemAuditLog.create({
        data: {
          userName: user.name,
          role: user.roles[0] || 'User',
          websiteId: blog.websiteId,
          event: `blog.${newStatus.toLowerCase().replace(/\s+/g, '_')}`,
          ipAddress: ipAddress || '',
          details: `Transitioned blog "${blog.translations[0]?.title || blog.id}" from ${previousStatus} to ${newStatus}.`,
        },
      });
    });

    // TRD §13: On-Demand Webhook ISR Revalidation Trigger!
    const primarySlug = blog.translations.find((t) => t.lang === 'en')?.slug || blog.translations[0]?.slug;
    const isUnpublishing = previousStatus === 'Published' && newStatus !== 'Published' && !isArchiving;
    if (primarySlug && (isPublishing || isArchiving || isUnpublishing)) {
      const event = isPublishing ? 'blog.published' : isArchiving ? 'blog.archived' : 'blog.unpublished';
      await this.webhookDispatcher.dispatchWebhook(
        blog.websiteId,
        event,
        primarySlug,
      );
    }

    // TRD §13: Invalidate Redis cache so next public API hit reads fresh data
    await this.invalidateCache(blog.websiteId, blog.translations);

    // ── AWS SES Email Notification (non-blocking — never throws) ──────────
    // Fetch author email for notifications
    try {
      const author = await this.prisma.user.findUnique({ where: { id: blog.authorId } });
      const website = await this.prisma.website.findUnique({ where: { id: blog.websiteId } });
      const blogTitle = blog.translations.find((t) => t.lang === 'en')?.title
        || blog.translations[0]?.title
        || blog.id;

      if (author && website) {
        await this.emailService.sendWorkflowNotification({
          toEmail: author.email,
          toName: author.name,
          event: newStatus,
          blogTitle,
          blogId: blog.id,
          websiteDomain: website.domain,
          actorName: user.name,
          notes: dto.notes,
        });
      }
    } catch (emailErr) {
      // Email failure must NEVER block the workflow transition
      const { Logger } = await import('@nestjs/common');
      new Logger('BlogsService').error(
        `Email notification failed for blog ${id}: ${(emailErr as Error).message}`,
      );
    }

    // Mirror to Supabase Cloud Backup (non-blocking)
    this.supabaseSync.syncBlog(id).catch(() => {});

    return this.findOne(id);
  }

  async delete(id: string, user: AuthenticatedUser, ipAddress: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!blog) {
      throw new NotFoundException(`Blog with ID "${id}" not found`);
    }

    await this.prisma.blog.delete({ where: { id } });

    // Mirror to Supabase Cloud Backup (non-blocking)
    this.supabaseSync.deleteBlog(id).catch(() => {});

    // TRD §13: Invalidate all cache keys for this blog and lists
    await this.invalidateCache(blog.websiteId, blog.translations);
    await this.redis.delPattern(`blogs:${blog.websiteId}:*`);

    // Dispatch revalidation webhook if article was published
    if (blog.status === 'Published') {
      const primarySlug = blog.translations.find((t) => t.lang === 'en')?.slug || blog.translations[0]?.slug;
      if (primarySlug) {
        await this.webhookDispatcher.dispatchWebhook(blog.websiteId, 'blog.archived', primarySlug);
      }
    }

    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: user.roles[0] || 'Super Admin',
        websiteId: blog.websiteId,
        event: 'blog.deleted',
        ipAddress: ipAddress || '',
        details: `Deleted article with ID: ${id}.`,
      },
    });

    return { success: true, message: 'Article deleted successfully' };
  }

  // â”€â”€â”€ TRD Â§11 & Â§17: Automated SEO Audit and Database Logging â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async auditAndLogSeo(blogId: string, lang = 'en', user?: AuthenticatedUser) {
    const blog = await this.findOne(blogId);
    const translation = blog.translations[lang] || blog.translations['en'];
    if (!translation) {
      throw new NotFoundException(`No translation for lang "${lang}" on blog ${blogId}`);
    }

    const checks: Array<{
      id: string;
      label: string;
      status: 'pass' | 'warning' | 'fail';
      message: string;
      scoreImpact: number;
    }> = [];
    let score = 100;

    const title = translation.title || '';
    const desc = translation.seo?.metaDescription || translation.excerpt || '';
    const focusKeyword = (translation.seo?.focusKeyword || '').toLowerCase().trim();
    const slug = translation.slug || '';
    const content = translation.content || '';

    // 1. Meta Title length (50-60 chars) - TRD Â§11
    if (title.length >= 50 && title.length <= 60) {
      checks.push({ id: 'title-length', label: 'Meta title length', status: 'pass', message: `Optimal length (${title.length} chars)`, scoreImpact: 0 });
    } else if (title.length > 0 && title.length < 50) {
      score -= 10;
      checks.push({ id: 'title-length', label: 'Meta title length', status: 'warning', message: `Title is short (${title.length} chars, recommended 50-60)`, scoreImpact: -10 });
    } else {
      score -= 15;
      checks.push({ id: 'title-length', label: 'Meta title length', status: 'fail', message: `Title length out of range (${title.length} chars)`, scoreImpact: -15 });
    }

    // 2. Meta Description length (140-160 chars) - TRD Â§11
    if (desc.length >= 140 && desc.length <= 160) {
      checks.push({ id: 'desc-length', label: 'Meta description length', status: 'pass', message: `Optimal length (${desc.length} chars)`, scoreImpact: 0 });
    } else if (desc.length >= 100 && desc.length < 140) {
      score -= 10;
      checks.push({ id: 'desc-length', label: 'Meta description length', status: 'warning', message: `Description acceptable but short (${desc.length} chars)`, scoreImpact: -10 });
    } else {
      score -= 20;
      checks.push({ id: 'desc-length', label: 'Meta description length', status: 'fail', message: `Description out of range (${desc.length} chars, recommended 140-160)`, scoreImpact: -20 });
    }

    // 3. Focus keyword in title, slug, and body - TRD Â§11
    if (focusKeyword) {
      const inTitle = title.toLowerCase().includes(focusKeyword);
      const inSlug = slug.toLowerCase().includes(focusKeyword.replace(/\s+/g, '-'));
      const inContent = content.toLowerCase().includes(focusKeyword);

      if (inTitle && inSlug && inContent) {
        checks.push({ id: 'focus-keyword', label: 'Focus keyword distribution', status: 'pass', message: `Keyword "${focusKeyword}" in title, slug, and content`, scoreImpact: 0 });
      } else {
        score -= 15;
        checks.push({ id: 'focus-keyword', label: 'Focus keyword distribution', status: 'warning', message: `Keyword missing in title (${inTitle}), slug (${inSlug}), or content (${inContent})`, scoreImpact: -15 });
      }
    } else {
      score -= 15;
      checks.push({ id: 'focus-keyword', label: 'Focus keyword distribution', status: 'fail', message: 'No focus keyword defined', scoreImpact: -15 });
    }

    // 4. Canonical URL - TRD Â§11
    if (translation.seo?.canonicalUrl) {
      checks.push({ id: 'canonical', label: 'Canonical URL', status: 'pass', message: 'Canonical tag properly configured', scoreImpact: 0 });
    } else {
      score -= 10;
      checks.push({ id: 'canonical', label: 'Canonical URL', status: 'warning', message: 'Canonical URL not configured', scoreImpact: -10 });
    }

    // 5. Featured image & alt text - TRD Â§11
    if (blog.featuredImage && blog.featuredImageAlt) {
      checks.push({ id: 'image-alt', label: 'Image alt tags', status: 'pass', message: 'Cover image with alt text is present', scoreImpact: 0 });
    } else {
      score -= 15;
      checks.push({ id: 'image-alt', label: 'Image alt tags', status: 'warning', message: 'Missing cover image or alt text description', scoreImpact: -15 });
    }

    // 6. Focus keyword in first paragraph - TRD §11
    const firstParaMatch = content.match(/<p>(.*?)<\/p>/i)?.[1]?.replace(/<[^>]*>/g, '').toLowerCase() || '';
    const first350Words = content.replace(/<[^>]*>/g, ' ').toLowerCase().substring(0, 350);
    if (!focusKeyword) {
      // already captured in check 3
    } else if (firstParaMatch.includes(focusKeyword) || first350Words.includes(focusKeyword)) {
      checks.push({ id: 'focus-kw-intro', label: 'Focus Keyword in Intro', status: 'pass', message: `Keyword appears in opening paragraph`, scoreImpact: 0 });
    } else {
      score -= 10;
      checks.push({ id: 'focus-kw-intro', label: 'Focus Keyword in Intro', status: 'warning', message: `Include "${focusKeyword}" within first 100 words`, scoreImpact: -10 });
    }

    // 7. Heading structure (H1/H2) - TRD §11
    const h1Count = (content.match(/<h1[^>]*>/gi) || []).length;
    const h2Count = (content.match(/<h2[^>]*>/gi) || []).length;
    if ((h1Count === 0 || h1Count === 1) && h2Count >= 1) {
      checks.push({ id: 'heading-structure', label: 'Heading Structure', status: 'pass', message: `Good hierarchy: ${h2Count} H2 section(s) found`, scoreImpact: 0 });
    } else if (h2Count === 0) {
      score -= 5;
      checks.push({ id: 'heading-structure', label: 'Heading Structure', status: 'warning', message: 'No H2 subheadings. Break content into structured sections', scoreImpact: -5 });
    } else {
      score -= 5;
      checks.push({ id: 'heading-structure', label: 'Heading Structure', status: 'warning', message: `Multiple H1 tags (${h1Count}) detected. Use exactly one H1 per page`, scoreImpact: -5 });
    }

    // 8. Robots directive validation - TRD §11
    const robotsVal = (translation.seo?.robots || '').toLowerCase();
    if (robotsVal.includes('index') && robotsVal.includes('follow')) {
      checks.push({ id: 'robots', label: 'Robots Directive', status: 'pass', message: `Robots: "${translation.seo?.robots}" allows indexing`, scoreImpact: 0 });
    } else if (robotsVal.includes('noindex')) {
      score -= 10;
      checks.push({ id: 'robots', label: 'Robots Directive', status: 'warning', message: `Robots: "${translation.seo?.robots}" — noindex blocks search engines`, scoreImpact: -10 });
    } else {
      score -= 5;
      checks.push({ id: 'robots', label: 'Robots Directive', status: 'warning', message: 'Robots directive not set or unrecognized', scoreImpact: -5 });
    }

    const finalScore = Math.max(0, Math.min(100, score));

    // Save audit log to database (TRD Â§17: seo_audit_logs)
    const auditLog = await this.prisma.seoAuditLog.create({
      data: {
        blogId,
        websiteId: blog.websiteId,
        lang,
        score: finalScore,
        checks: JSON.stringify(checks),
        checkedBy: user?.name || 'System Auditor',
      },
    });

    return {
      id: auditLog.id,
      blogId,
      score: finalScore,
      status: finalScore >= 80 ? 'good' : finalScore >= 50 ? 'average' : 'poor',
      checks,
      timestamp: auditLog.timestamp,
    };
  }
}

