import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookDispatcherService } from '../webhooks/webhook-dispatcher.service';
import { CreateBlogDto, UpdateBlogDto, TransitionBlogStatusDto } from './dto/create-blog.dto';
import { AuthenticatedUser } from '../../common/interfaces/auth-user.interface';
import { RedisProvider } from '../../common/providers/redis.provider';
import { sanitizeContent } from '../../common/pipes/html-sanitize.pipe'; // TRD §15: XSS protection

@Injectable()
export class BlogsService {
  constructor(
    private prisma: PrismaService,
    private webhookDispatcher: WebhookDispatcherService,
    private redis: RedisProvider,
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

    const [total, blogs] = await Promise.all([
      this.prisma.blog.count({ where }),
      this.prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          website: { select: { id: true, name: true, domain: true } },
          translations: true,
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

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: formatted,
    };
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

  async create(dto: CreateBlogDto, user: AuthenticatedUser) {
    const blog = await this.prisma.blog.create({
      data: {
        websiteId: dto.websiteId,
        authorId: user.id,
        authorName: user.name,
        authorAvatar: user.avatar || '',
        featuredImage: dto.featuredImage || '',
        featuredImageAlt: dto.featuredImageAlt || '',
        status: 'Draft',
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

    // Record initial creation in audit log
    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: user.roles[0] || 'Content Writer',
        websiteId: dto.websiteId,
        event: 'blog.created',
        ipAddress: '127.0.0.1',
        details: `Created draft article "${dto.translations[0]?.title || blog.id}".`,
      },
    });

    return this.findOne(blog.id);
  }

  async update(id: string, dto: UpdateBlogDto, user: AuthenticatedUser) {
    const existing = await this.prisma.blog.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!existing) {
      throw new NotFoundException(`Blog with ID "${id}" not found`);
    }

    // TRD Section 7: If blog is published, check if any translation's slug was modified
    if (existing.status === 'Published' && dto.translations) {
      for (const updatedTrans of dto.translations) {
        const oldTrans = existing.translations.find((t) => t.lang === updatedTrans.lang);
        if (oldTrans && oldTrans.slug && updatedTrans.slug && oldTrans.slug !== updatedTrans.slug) {
          // Automatic 301 Permanent Redirect Guard!
          await this.prisma.redirect.upsert({
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
          await this.prisma.systemAuditLog.create({
            data: {
              userName: user.name,
              role: user.roles[0] || 'Editor',
              websiteId: existing.websiteId,
              event: 'redirect.created',
              ipAddress: '127.0.0.1',
              details: `Auto 301 redirect: /${oldTrans.slug} → /${updatedTrans.slug}`,
            },
          });
        }
      }
    }

    // Update main blog record
    await this.prisma.blog.update({
      where: { id },
      data: {
        featuredImage: dto.featuredImage,
        featuredImageAlt: dto.featuredImageAlt,
        readTimeMinutes: dto.readTimeMinutes,
        categoryIds: dto.categoryIds,
        tagIds: dto.tagIds,
      },
    });

    // Update or insert translations
    if (dto.translations && dto.translations.length > 0) {
      for (const t of dto.translations) {
        await this.prisma.blogTranslation.upsert({
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

    // TRD §13: Invalidate Redis cache on update so consuming sites get fresh content
    const updated = await this.findOne(id);
    await this.invalidateCache(existing.websiteId, existing.translations);
    return updated;
  }

  // ─── Helper: invalidate all Redis cache keys for this blog (TRD §13)
  private async invalidateCache(websiteId: string, translations: Array<{ slug: string }>): Promise<void> {
    for (const tr of translations) {
      await this.redis.delPattern(`blog:${websiteId}:${tr.slug}:*`);
    }
    await this.redis.delPattern(`blogs:${websiteId}:*`);
    await this.redis.delPattern(`search:${websiteId}:*`);
  }

  async transitionStatus(id: string, dto: TransitionBlogStatusDto, user: AuthenticatedUser) {
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

    // Update blog status
    const updated = await this.prisma.blog.update({
      where: { id },
      data: {
        status: newStatus,
        publishDate: isPublishing && !blog.publishDate ? new Date() : blog.publishDate,
        publishedBy: isPublishing ? user.name : blog.publishedBy,
        scheduledAt: isScheduling && dto.scheduledAt ? new Date(dto.scheduledAt) : (isPublishing ? null : blog.scheduledAt),
      },
    });

    // Record in workflow log
    await this.prisma.workflowLog.create({
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
    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: user.roles[0] || 'User',
        websiteId: blog.websiteId,
        event: `blog.${newStatus.toLowerCase().replace(/\s+/g, '_')}`,
        ipAddress: '127.0.0.1',
        details: `Transitioned blog "${blog.translations[0]?.title || blog.id}" from ${previousStatus} to ${newStatus}.`,
      },
    });

    // TRD §13: On-Demand Webhook ISR Revalidation Trigger!
    const primarySlug = blog.translations.find((t) => t.lang === 'en')?.slug || blog.translations[0]?.slug;
    if (primarySlug && (isPublishing || isArchiving)) {
      await this.webhookDispatcher.dispatchWebhook(
        blog.websiteId,
        isPublishing ? 'blog.published' : 'blog.archived',
        primarySlug,
      );
    }

    // TRD §13: Invalidate Redis cache so next public API hit reads fresh data
    await this.invalidateCache(blog.websiteId, blog.translations);

    return this.findOne(id);
  }

  async delete(id: string, user: AuthenticatedUser) {
    const blog = await this.prisma.blog.findUnique({ where: { id } });
    if (!blog) {
      throw new NotFoundException(`Blog with ID "${id}" not found`);
    }

    await this.prisma.blog.delete({ where: { id } });

    // TRD §13: Invalidate cache when blog is deleted
    await this.invalidateCache(blog.websiteId, []);
    await this.redis.delPattern(`blogs:${blog.websiteId}:*`);

    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: user.roles[0] || 'Super Admin',
        websiteId: blog.websiteId,
        event: 'blog.deleted',
        ipAddress: '127.0.0.1',
        details: `Deleted article with ID: ${id}.`,
      },
    });

    return { success: true, message: 'Article deleted successfully' };
  }

  // ─── TRD §11 & §17: Automated SEO Audit and Database Logging ───────────────
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

    // 1. Meta Title length (50-60 chars) - TRD §11
    if (title.length >= 50 && title.length <= 60) {
      checks.push({ id: 'title-length', label: 'Meta title length', status: 'pass', message: `Optimal length (${title.length} chars)`, scoreImpact: 0 });
    } else if (title.length > 0 && title.length < 50) {
      score -= 10;
      checks.push({ id: 'title-length', label: 'Meta title length', status: 'warning', message: `Title is short (${title.length} chars, recommended 50-60)`, scoreImpact: -10 });
    } else {
      score -= 15;
      checks.push({ id: 'title-length', label: 'Meta title length', status: 'fail', message: `Title length out of range (${title.length} chars)`, scoreImpact: -15 });
    }

    // 2. Meta Description length (140-160 chars) - TRD §11
    if (desc.length >= 140 && desc.length <= 160) {
      checks.push({ id: 'desc-length', label: 'Meta description length', status: 'pass', message: `Optimal length (${desc.length} chars)`, scoreImpact: 0 });
    } else if (desc.length >= 100 && desc.length < 140) {
      score -= 10;
      checks.push({ id: 'desc-length', label: 'Meta description length', status: 'warning', message: `Description acceptable but short (${desc.length} chars)`, scoreImpact: -10 });
    } else {
      score -= 20;
      checks.push({ id: 'desc-length', label: 'Meta description length', status: 'fail', message: `Description out of range (${desc.length} chars, recommended 140-160)`, scoreImpact: -20 });
    }

    // 3. Focus keyword in title, slug, and body - TRD §11
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

    // 4. Canonical URL - TRD §11
    if (translation.seo?.canonicalUrl) {
      checks.push({ id: 'canonical', label: 'Canonical URL', status: 'pass', message: 'Canonical tag properly configured', scoreImpact: 0 });
    } else {
      score -= 10;
      checks.push({ id: 'canonical', label: 'Canonical URL', status: 'warning', message: 'Canonical URL not configured', scoreImpact: -10 });
    }

    // 5. Featured image & alt text - TRD §11
    if (blog.featuredImage && blog.featuredImageAlt) {
      checks.push({ id: 'image-alt', label: 'Image alt tags', status: 'pass', message: 'Cover image with alt text is present', scoreImpact: 0 });
    } else {
      score -= 15;
      checks.push({ id: 'image-alt', label: 'Image alt tags', status: 'warning', message: 'Missing cover image or alt text description', scoreImpact: -15 });
    }

    const finalScore = Math.max(0, Math.min(100, score));

    // Save audit log to database (TRD §17: seo_audit_logs)
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
