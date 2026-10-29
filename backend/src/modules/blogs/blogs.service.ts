import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(BlogsService.name);

  constructor(
    private prisma: PrismaService,
    private webhookDispatcher: WebhookDispatcherService,
    private redis: RedisProvider,
    private emailService: EmailService,
    private supabaseSync: SupabaseSyncService,
  ) {}

  async findAll(
    params: {
      websiteId?: string;
      status?: string;
      search?: string;
      authorId?: string;
      page?: number;
      limit?: number;
    },
    caller?: AuthenticatedUser,
  ) {
    const { websiteId, status, search, authorId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (caller && !this.isGlobalAdmin(caller)) {
      const allowedSites = (caller.roleAssignments || [])
        .filter((ra) => ra.websiteId)
        .map((ra) => ra.websiteId as string);

      if (websiteId && websiteId !== 'all') {
        if (!allowedSites.includes(websiteId)) {
          throw new ForbiddenException(
            `Access denied: you do not have permission to view blogs for website "${websiteId}".`,
          );
        }
        where.websiteId = websiteId;
      } else {
        where.websiteId = { in: allowedSites };
      }
    } else {
      if (websiteId && websiteId !== 'all') {
        where.websiteId = websiteId;
      }
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

    const userScope = caller && !this.isGlobalAdmin(caller) ? `user:${caller.id}` : 'global';
    const cacheKey = `admin:blogs:${userScope}:${websiteId || 'all'}:${status || 'all'}:${page}:${limit}:${search || ''}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const [total, blogs] = await Promise.all([
      this.prisma.blog.count({ where }),
      this.prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { publishDate: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' },
        ],
        include: {
          website: { select: { id: true, name: true, domain: true } },
          author: { select: { id: true, name: true, avatar: true } },
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
              schemaType: true,
              customSchema: true,
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
    const formatted = blogs.map((b: any) => {
      const isSachin = (b.authorName || '').toLowerCase().includes('sachin');
      let resolvedAvatar = b.authorAvatar || '';
      if (resolvedAvatar.includes('usr-superadmin') && !isSachin) {
        resolvedAvatar = '';
      }
      const isPlaceholder = !resolvedAvatar || resolvedAvatar.includes('avatar-1.webp') || resolvedAvatar.includes('avatar-default.webp');
      if (isPlaceholder) {
        if (b.author?.avatar && !b.author.avatar.includes('avatar-1.webp') && !b.author.avatar.includes('avatar-default.webp')) {
          const isAuthorSachin = b.author.id === 'usr-superadmin' || (b.author.name || '').toLowerCase().includes('sachin');
          if (!isAuthorSachin || isSachin) {
            resolvedAvatar = b.author.avatar;
          } else {
            resolvedAvatar = '';
          }
        } else {
          resolvedAvatar = '';
        }
      }
      return {
        id: b.id,
        websiteId: b.websiteId,
        authorId: b.authorId,
        authorName: b.authorName,
        authorAvatar: resolvedAvatar,
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
      wordCount: (b.readTimeMinutes && b.readTimeMinutes > 0 ? b.readTimeMinutes : 3) * 220,
      translations: b.translations.reduce((acc, t) => {
        acc[t.lang] = {
          title: t.title,
          slug: t.slug,
          excerpt: t.excerpt,
          content: '', // Omitted in list view for 0-delay performance; loaded in detail view
          wordCount: (b.readTimeMinutes && b.readTimeMinutes > 0 ? b.readTimeMinutes : 3) * 220,
          seo: {
            metaTitle: t.metaTitle,
            metaDescription: t.metaDescription,
            metaKeywords: t.metaKeywords,
            canonicalUrl: t.canonicalUrl,
            focusKeyword: t.focusKeyword,
            robots: t.robots,
            schemaType: t.schemaType || 'BlogPosting',
            customSchema: t.customSchema || '',
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
    };
  });

    const result = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: formatted,
    };

    // Cache list result for 300s (5 minutes) - invalidated on create/update/status/delete
    await this.redis.set(cacheKey, result, 300);

    return result;
  }

  /**
   * Helper: returns true if user is globally privileged (can access any tenant).
   */
  private isGlobalAdmin(user: AuthenticatedUser): boolean {
    if (user.roles.includes('Super Admin')) return true;
    return user.roleAssignments.some((ra) => ra.isGlobal);
  }

  /**
   * Helper: asserts the blog belongs to the caller's website.
   * Super Admins and global Website Admins bypass the check.
   * Throws ForbiddenException if tenant mismatch.
   */
  private assertBlogOwnership(blog: { id: string; websiteId: string }, user: AuthenticatedUser): void {
    if (this.isGlobalAdmin(user)) return;
    const userWebsiteIds = user.roleAssignments
      .filter((ra) => ra.websiteId)
      .map((ra) => ra.websiteId);
    if (!userWebsiteIds.includes(blog.websiteId)) {
      throw new ForbiddenException(
        `Access denied: blog "${blog.id}" does not belong to your website.`,
      );
    }
  }

  async findOne(id: string, caller?: AuthenticatedUser) {
    const cacheKey = `admin:blogs:detail:${id}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) {
      if (caller) {
        this.assertBlogOwnership({ id: cached.id, websiteId: cached.websiteId }, caller);
      }
      return cached;
    }

    const blog = await this.prisma.blog.findUnique({
      where: { id },
      include: {
        website: true,
        author: { select: { id: true, name: true, avatar: true } },
        translations: true,
        workflowLogs: { orderBy: { timestamp: 'desc' } },
      },
    });

    if (!blog) {
      throw new NotFoundException(`Blog with ID "${id}" not found`);
    }

    if (caller) {
      this.assertBlogOwnership({ id, websiteId: blog.websiteId }, caller);
    }

    const isSachin = (blog.authorName || '').toLowerCase().includes('sachin');
    let resolvedAvatar = blog.authorAvatar || '';
    if (resolvedAvatar.includes('usr-superadmin') && !isSachin) {
      resolvedAvatar = '';
    }
    const isPlaceholder = !resolvedAvatar || resolvedAvatar.includes('avatar-1.webp') || resolvedAvatar.includes('avatar-default.webp');
    if (isPlaceholder) {
      if ((blog as any).author?.avatar && !(blog as any).author.avatar.includes('avatar-1.webp') && !(blog as any).author.avatar.includes('avatar-default.webp')) {
        const isAuthorSachin = (blog as any).author.id === 'usr-superadmin' || ((blog as any).author.name || '').toLowerCase().includes('sachin');
        if (!isAuthorSachin || isSachin) {
          resolvedAvatar = (blog as any).author.avatar;
        } else {
          resolvedAvatar = '';
        }
      } else {
        resolvedAvatar = '';
      }
    }

    const result = {
      id: blog.id,
      websiteId: blog.websiteId,
      authorId: blog.authorId,
      authorName: blog.authorName,
      authorAvatar: resolvedAvatar,
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
      translations: (blog.translations || []).reduce((acc, t) => {
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
            schemaType: t.schemaType || 'BlogPosting',
            customSchema: t.customSchema || '',
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
      workflowLogs: (blog.workflowLogs || []).map((l) => ({
        id: l.id,
        blogId: l.blogId,
        fromStatus: l.fromStatus,
        toStatus: l.toStatus,
        changedBy: l.changedBy,
        role: l.role,
        notes: l.notes,
        timestamp: l.timestamp instanceof Date ? l.timestamp.toISOString() : (l.timestamp || ''),
      })),
      createdAt: blog.createdAt instanceof Date ? blog.createdAt.toISOString() : (blog.createdAt ? String(blog.createdAt) : new Date().toISOString()),
      updatedAt: blog.updatedAt instanceof Date ? blog.updatedAt.toISOString() : (blog.updatedAt ? String(blog.updatedAt) : new Date().toISOString()),
    };

    await this.redis.set(cacheKey, result, 120);
    return result;
  }

  async create(dto: CreateBlogDto, user: AuthenticatedUser, ipAddress: string) {
    if (user && !this.isGlobalAdmin(user)) {
      const allowedSites = (user.roleAssignments || [])
        .filter((ra) => ra.websiteId)
        .map((ra) => ra.websiteId as string);
      if (!allowedSites.includes(dto.websiteId)) {
        throw new ForbiddenException(
          `Access denied: you do not have permission to create blogs for website "${dto.websiteId}".`,
        );
      }
    }

    const initialStatus = dto.status || 'Draft';
    const isPublishing = initialStatus === 'Published';

    // RBAC validation: only Super Admin, Website Admin, or Publisher can directly publish
    if (isPublishing) {
      const canPublish =
        user.roles.includes('Super Admin') ||
        user.roles.includes('Website Admin') ||
        user.roles.includes('Publisher');
      if (!canPublish) {
        throw new ForbiddenException('Only Publishers and Website Admins can directly publish articles.');
      }
    }

    // Slug uniqueness guard: prevent URL collision within the same website tenant
    if (dto.translations && dto.translations.length > 0) {
      for (const t of dto.translations) {
        const cleanSlug = (t.slug || '').trim().replace(/^\/+|\/+$/g, '');
        if (!cleanSlug) continue;
        const existingSlug = await this.prisma.blogTranslation.findFirst({
          where: {
            slug: cleanSlug,
            lang: t.lang,
            blog: { websiteId: dto.websiteId },
          },
        });
        if (existingSlug) {
          throw new ConflictException(
            `A blog with the slug "${cleanSlug}" already exists for language "${t.lang}" on this website.`,
          );
        }
      }
    }

    const blog = await this.prisma.$transaction(async (tx) => {
      const effectiveAuthorName = dto.authorName?.trim() || user.name.replace(/\s*\([^)]*Admin[^)]*\)/gi, '').trim();
      const isSachin = effectiveAuthorName.toLowerCase().includes('sachin');
      let resolvedAuthorAvatar = dto.authorAvatar?.trim() || '';
      if (resolvedAuthorAvatar.includes('usr-superadmin') && !isSachin) {
        resolvedAuthorAvatar = '';
      }
      const isPlaceholderAvatar = !resolvedAuthorAvatar || resolvedAuthorAvatar.includes('avatar-1.webp') || resolvedAuthorAvatar.includes('avatar-default.webp');
      if (isPlaceholderAvatar) {
        if (dto.authorId && dto.authorId !== user.id && dto.authorId !== 'usr-custom') {
          const authorUser = await tx.user.findUnique({ where: { id: dto.authorId }, select: { avatar: true, name: true } });
          if (authorUser?.avatar && !authorUser.avatar.includes('avatar-1.webp') && !authorUser.avatar.includes('avatar-default.webp')) {
            const isUserSachin = (authorUser.name || '').toLowerCase().includes('sachin');
            if (!authorUser.avatar.includes('usr-superadmin') || isUserSachin) {
              resolvedAuthorAvatar = authorUser.avatar;
            } else {
              resolvedAuthorAvatar = '';
            }
          } else {
            resolvedAuthorAvatar = '';
          }
        } else if (isSachin && dto.authorId === user.id && user.avatar && !user.avatar.includes('avatar-1.webp') && !user.avatar.includes('avatar-default.webp')) {
          resolvedAuthorAvatar = user.avatar;
        } else {
          resolvedAuthorAvatar = '';
        }
      }

      let validatedAuthorId: string | null = null;
      if (dto.authorId && dto.authorId !== 'usr-custom' && (typeof dto.authorId === 'string' && dto.authorId.trim() !== '')) {
        const authorUser = await tx.user.findUnique({ where: { id: dto.authorId.trim() }, select: { id: true } });
        if (authorUser) {
          validatedAuthorId = authorUser.id;
        }
      }
      if (!validatedAuthorId && (!dto.authorId || dto.authorId !== 'usr-custom')) {
        const callerUser = await tx.user.findUnique({ where: { id: user.id }, select: { id: true } });
        if (callerUser) {
          validatedAuthorId = callerUser.id;
        }
      }

      const createdBlog = await tx.blog.create({
        data: {
          websiteId: dto.websiteId,
          authorId: validatedAuthorId,
          authorName: dto.authorName?.trim() || user.name.replace(/\s*\([^)]*Admin[^)]*\)/gi, '').trim(),
          authorAvatar: resolvedAuthorAvatar || '',
          featuredImage: dto.featuredImage?.trim() || 'https://blogary.s3.ap-south-1.amazonaws.com/blogs/default-blog-cover.webp',
          featuredImageAlt: dto.featuredImageAlt || '',
          status: initialStatus,
          publishDate: dto.publishDate
            ? new Date(dto.publishDate)
            : (isPublishing ? new Date() : undefined),
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
              schemaType: t.schemaType || 'BlogPosting',
              customSchema: t.customSchema || '',
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

      // Sync join tables from categoryIds / tagIds arrays (Concurrent validation & batching)
      const hasCategories = dto.categoryIds && dto.categoryIds.length > 0;
      const hasTags = dto.tagIds && dto.tagIds.length > 0;
      if (hasCategories || hasTags) {
        const [validCategories, validTags] = await Promise.all([
          hasCategories
            ? tx.category.findMany({
                where: { id: { in: dto.categoryIds } },
                select: { id: true },
              })
            : Promise.resolve([]),
          hasTags
            ? tx.tag.findMany({
                where: { id: { in: dto.tagIds } },
                select: { id: true },
              })
            : Promise.resolve([]),
        ]);

        const validCatIds = validCategories.map((c) => c.id);
        const validTagIds = validTags.map((t) => t.id);

        const joinOps: Promise<any>[] = [];
        if (validCatIds.length > 0) {
          joinOps.push(
            tx.blogCategory.createMany({
              data: validCatIds.map((cid) => ({ blogId: createdBlog.id, categoryId: cid })),
              skipDuplicates: true,
            }),
          );
        }
        if (validTagIds.length > 0) {
          joinOps.push(
            tx.blogTag.createMany({
              data: validTagIds.map((tid) => ({ blogId: createdBlog.id, tagId: tid })),
              skipDuplicates: true,
            }),
          );
        }
        if (joinOps.length > 0) {
          await Promise.all(joinOps);
        }
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
        this.webhookDispatcher.dispatchWebhook(blog.websiteId, 'blog.published', primarySlug).catch((err) => {
          this.logger.warn(`Webhook dispatch error for ${primarySlug}: ${err.message}`);
        });
      }

      // Phase 3: Real-Time Publish Notification Hook (Non-blocking async dispatch)
      this.dispatchPublishNotifications(blog.id, user.name).catch((err) => {
        this.logger.error(`[PublishHook] Failed to dispatch publish notifications for new blog ${blog.id}: ${err.message}`);
      });
    }

    // Mirror to Supabase Cloud Backup (non-blocking — failure is logged but never throws)
    this.supabaseSync.syncBlog(blog.id).catch((err: Error) => {
      this.logger.error(`[Mirror] syncBlog failed for new blog ${blog.id}: ${err.message}`);
    });

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

    // Security: verify the caller owns this blog's tenant (BUG-002 fix)
    this.assertBlogOwnership({ id, websiteId: existing.websiteId }, user);

    const targetWebsiteId = dto.websiteId || existing.websiteId;

    // RBAC validation: only Super Admin, Website Admin, or Publisher can directly publish
    if (dto.status && dto.status !== existing.status) {
      const canPublish =
        user.roles.includes('Super Admin') ||
        user.roles.includes('Website Admin') ||
        user.roles.includes('Publisher');
      if (dto.status === 'Published' && !canPublish) {
        throw new ForbiddenException('Only Publishers and Website Admins can directly publish articles.');
      }
      const canApprove =
        user.roles.includes('Super Admin') ||
        user.roles.includes('Website Admin') ||
        user.roles.includes('Role Admin') ||
        user.roles.includes('Editor');
      if (dto.status === 'Approved' && !canApprove) {
        throw new ForbiddenException('Only Editors and Website Admins can approve articles.');
      }
    }

    // Slug uniqueness check: prevent collisions within same website tenant
    if (dto.translations && dto.translations.length > 0) {
      for (const updatedTrans of dto.translations) {
        const cleanSlug = (updatedTrans.slug || '').trim().replace(/^\/+|\/+$/g, '');
        if (!cleanSlug) continue;
        const collision = await this.prisma.blogTranslation.findFirst({
          where: {
            slug: cleanSlug,
            lang: updatedTrans.lang,
            blogId: { not: id },
            blog: { websiteId: targetWebsiteId },
          },
        });
        if (collision) {
          throw new ConflictException(
            `A blog with the slug "${cleanSlug}" already exists for language "${updatedTrans.lang}" on this website.`,
          );
        }
      }
    }

    // Execute atomic update transaction across blog, redirects, taxonomies, and translations
    await this.prisma.$transaction(async (tx) => {
      // TRD Section 7: If blog is published, check if any translation's slug was modified
      if (existing.status === 'Published' && dto.translations) {
        for (const updatedTrans of dto.translations) {
          const oldTrans = existing.translations.find((t) => t.lang === updatedTrans.lang);
          if (oldTrans && oldTrans.slug && updatedTrans.slug && oldTrans.slug !== updatedTrans.slug) {
            const cleanFrom = oldTrans.slug.trim().replace(/^\/+|\/+$/g, '');
            const cleanTo = updatedTrans.slug.trim().replace(/^\/+|\/+$/g, '');

            if (cleanFrom && cleanTo && cleanFrom !== cleanTo) {
              // Automatic 301 Permanent Redirect Guard!
              await tx.redirect.upsert({
                where: {
                  websiteId_fromSlug: {
                    websiteId: existing.websiteId,
                    fromSlug: cleanFrom,
                  },
                },
                update: { toSlug: cleanTo, statusCode: 301 },
                create: {
                  websiteId: existing.websiteId,
                  fromSlug: cleanFrom,
                  toSlug: cleanTo,
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
                  details: `Auto 301 redirect: /${cleanFrom} → /${cleanTo}`,
                },
              });
            }
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
      if (dto.authorId !== undefined) {
        if (!dto.authorId || dto.authorId === 'usr-custom' || (typeof dto.authorId === 'string' && dto.authorId.trim() === '')) {
          blogUpdateData.authorId = null;
        } else {
          const authorUser = await tx.user.findUnique({
            where: { id: dto.authorId.trim() },
            select: { id: true },
          });
          blogUpdateData.authorId = authorUser ? authorUser.id : null;
        }
      }
      if (dto.authorName !== undefined) {
        blogUpdateData.authorName = dto.authorName.trim();
      }
      if (dto.authorAvatar !== undefined) {
        const effectiveAuthorName = (dto.authorName !== undefined ? dto.authorName : (existing.authorName || '')).trim();
        const isSachin = effectiveAuthorName.toLowerCase().includes('sachin');
        let resolvedAvatar = dto.authorAvatar?.trim() || '';
        if (resolvedAvatar.includes('usr-superadmin') && !isSachin) {
          resolvedAvatar = '';
        }
        const isPlaceholder = !resolvedAvatar || resolvedAvatar.includes('avatar-1.webp') || resolvedAvatar.includes('avatar-default.webp');
        if (isPlaceholder) {
          const targetAuthorId = dto.authorId || existing.authorId;
          if (targetAuthorId && targetAuthorId !== 'usr-custom') {
            const authorUser = await tx.user.findUnique({ where: { id: targetAuthorId }, select: { avatar: true, name: true } });
            if (authorUser?.avatar && !authorUser.avatar.includes('avatar-1.webp') && !authorUser.avatar.includes('avatar-default.webp')) {
              const isUserSachin = (authorUser.name || '').toLowerCase().includes('sachin');
              if (!authorUser.avatar.includes('usr-superadmin') || isUserSachin) {
                resolvedAvatar = authorUser.avatar;
              } else {
                resolvedAvatar = '';
              }
            } else {
              resolvedAvatar = '';
            }
          } else {
            resolvedAvatar = '';
          }
        }
        blogUpdateData.authorAvatar = resolvedAvatar;
      }
      if (dto.websiteId && dto.websiteId !== existing.websiteId) {
        const targetSite = await tx.website.findUnique({ where: { id: dto.websiteId } });
        if (!targetSite) {
          this.logger.warn(`Ignoring invalid websiteId "${dto.websiteId}" for blog "${id}" - site does not exist.`);
        } else {
          blogUpdateData.websiteId = dto.websiteId;
        }
      }
      if (dto.publishDate) {
        blogUpdateData.publishDate = new Date(dto.publishDate);
      }
      if (dto.scheduledAt !== undefined) {
        blogUpdateData.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
      }
      if (dto.status) {
        blogUpdateData.status = dto.status;
        if (dto.status === 'Published' && !existing.publishDate && !dto.publishDate) {
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

      // Sync join tables (Fix 7: with FK validation & concurrent batch execution)
      const updateCats = dto.categoryIds !== undefined;
      const updateTags = dto.tagIds !== undefined;
      if (updateCats || updateTags) {
        const deleteOps: Promise<any>[] = [];
        if (updateCats) deleteOps.push(tx.blogCategory.deleteMany({ where: { blogId: id } }));
        if (updateTags) deleteOps.push(tx.blogTag.deleteMany({ where: { blogId: id } }));
        if (deleteOps.length > 0) {
          await Promise.all(deleteOps);
        }

        const [validCategories, validTags] = await Promise.all([
          updateCats && dto.categoryIds!.length > 0
            ? tx.category.findMany({
                where: { id: { in: dto.categoryIds } },
                select: { id: true },
              })
            : Promise.resolve([]),
          updateTags && dto.tagIds!.length > 0
            ? tx.tag.findMany({
                where: { id: { in: dto.tagIds } },
                select: { id: true },
              })
            : Promise.resolve([]),
        ]);

        const validCatIds = validCategories.map((c) => c.id);
        const validTagIds = validTags.map((t) => t.id);

        const insertOps: Promise<any>[] = [];
        if (validCatIds.length > 0) {
          insertOps.push(
            tx.blogCategory.createMany({
              data: validCatIds.map((cid) => ({ blogId: id, categoryId: cid })),
              skipDuplicates: true,
            }),
          );
        }
        if (validTagIds.length > 0) {
          insertOps.push(
            tx.blogTag.createMany({
              data: validTagIds.map((tid) => ({ blogId: id, tagId: tid })),
              skipDuplicates: true,
            }),
          );
        }
        if (insertOps.length > 0) {
          await Promise.all(insertOps);
        }
      }

      // Update or insert translations
      if (dto.translations && dto.translations.length > 0) {
        for (const t of dto.translations) {
          const oldTrans = existing.translations.find((ot) => ot.lang === t.lang);
          // Only preserve old content if translation content was omitted (undefined)
          let effectiveContent = t.content !== undefined ? sanitizeContent(t.content) : (oldTrans?.content || '');

          await tx.blogTranslation.upsert({
            where: {
              blogId_lang: { blogId: id, lang: t.lang },
            },
            update: {
              title: t.title,
              slug: t.slug,
              excerpt: t.excerpt,
              content: effectiveContent, // TRD §15: XSS + Wipeout protected
              metaTitle: t.metaTitle,
              metaDescription: t.metaDescription,
              metaKeywords: t.metaKeywords,
              canonicalUrl: t.canonicalUrl,
              focusKeyword: t.focusKeyword,
              robots: t.robots,
              schemaType: t.schemaType !== undefined ? t.schemaType : undefined,
              customSchema: t.customSchema !== undefined ? t.customSchema : undefined,
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
              schemaType: t.schemaType || 'BlogPosting',
              customSchema: t.customSchema || '',
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
        this.webhookDispatcher.dispatchWebhook(existing.websiteId, 'blog.updated', primarySlug).catch((err) => {
          this.logger.warn(`Webhook dispatch error for ${primarySlug}: ${err.message}`);
        });
      }
    }

    // Mirror to Supabase Cloud Backup (non-blocking — failure is logged but never throws)
    this.supabaseSync.syncBlog(id).catch((err: Error) => {
      this.logger.error(`[Mirror] syncBlog failed for updated blog ${id}: ${err.message}`);
    });

    // Phase 3: Real-Time Publish Notification Hook (if status transitioned to Published)
    if (existing.status !== 'Published' && dto.status === 'Published') {
      this.dispatchPublishNotifications(id, user.name).catch((err) => {
        this.logger.error(`[PublishHook] Failed to dispatch publish notifications for updated blog ${id}: ${err.message}`);
      });
    }

    return updated;
  }

  // ─── Helper: invalidate all Redis cache keys for this blog (TRD §13)
  private async invalidateCache(websiteId: string, translations: Array<{ slug: string }>): Promise<void> {
    const ops: Promise<any>[] = [];
    for (const tr of translations) {
      ops.push(this.redis.delPattern(`blog:${websiteId}:${tr.slug}:*`));
    }
    ops.push(this.redis.delPattern(`blogs:${websiteId}:*`));
    ops.push(this.redis.delPattern(`search:${websiteId}:*`));
    ops.push(this.redis.delPattern('admin:blogs:*'));
    ops.push(this.redis.del(`redirects:${websiteId}`));
    ops.push(this.redis.delPattern('admin:redirects:*'));
    await Promise.allSettled(ops);
  }

  async transitionStatus(id: string, dto: TransitionBlogStatusDto, user: AuthenticatedUser, ipAddress: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      include: { translations: true },
    });

    if (!blog) {
      throw new NotFoundException(`Blog with ID "${id}" not found`);
    }

    // Security: verify the caller owns this blog's tenant (BUG-003-svc fix)
    this.assertBlogOwnership({ id, websiteId: blog.websiteId }, user);

    const previousStatus = blog.status;
    const newStatus = dto.status;

    // RBAC validation: only Super Admin, Website Admin, or Publisher can directly publish
    const canPublish =
      user.roles.includes('Super Admin') ||
      user.roles.includes('Website Admin') ||
      user.roles.includes('Publisher');
    if (newStatus === 'Published' && !canPublish) {
      throw new ForbiddenException('Only Publishers and Website Admins can directly publish articles.');
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
      this.webhookDispatcher.dispatchWebhook(
        blog.websiteId,
        event,
        primarySlug,
      ).catch((err) => {
        this.logger.warn(`Webhook dispatch error for ${primarySlug}: ${err.message}`);
      });
    }

    // TRD §13: Invalidate Redis cache so next public API hit reads fresh data
    await this.invalidateCache(blog.websiteId, blog.translations);

    // ── AWS SES Email Notification (Asynchronous / Non-blocking — never blocks HTTP response) ──
    (async () => {
      try {
        const [author, website] = await Promise.all([
          this.prisma.user.findUnique({
            where: { id: blog.authorId },
            select: { email: true, name: true },
          }),
          this.prisma.website.findUnique({
            where: { id: blog.websiteId },
            select: { domain: true },
          }),
        ]);
        const blogTitle =
          blog.translations.find((t) => t.lang === 'en')?.title ||
          blog.translations[0]?.title ||
          blog.id;

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
        this.logger.error(
          `[Async Notification] Email notification failed for blog ${id}: ${(emailErr as Error).message}`,
        );
      }
    })();

    // Phase 3: Real-Time Publish Notification Hook (if status transitioned to Published)
    if (isPublishing) {
      this.dispatchPublishNotifications(blog.id, user.name).catch((err) => {
        this.logger.error(`[PublishHook] Failed to dispatch publish notifications for transitioned blog ${blog.id}: ${err.message}`);
      });
    }

    // Invalidate admin blogs cache so new status appears instantly
    await this.redis.delPattern('admin:blogs:*');

    // Mirror to Supabase Cloud Backup (non-blocking — failure is logged but never throws)
    this.supabaseSync.syncBlog(id).catch((err: Error) => {
      this.logger.error(`[Mirror] syncBlog failed for transitioned blog ${id}: ${err.message}`);
    });

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

    // Security: verify the caller owns this blog's tenant (BUG-003 fix)
    this.assertBlogOwnership({ id, websiteId: blog.websiteId }, user);

    await this.prisma.blog.delete({ where: { id } });

    // Mirror to Supabase Cloud Backup (non-blocking)
    this.supabaseSync.deleteBlog(id).catch(() => {});

    // TRD §13: Invalidate all cache keys for this blog and lists (non-blocking)
    this.invalidateCache(blog.websiteId, blog.translations).catch((err: Error) => {
      this.logger.warn(`Cache invalidation error on delete for ${id}: ${err.message}`);
    });

    // Dispatch revalidation webhook if article was published (non-blocking)
    if (blog.status === 'Published') {
      const primarySlug = blog.translations.find((t) => t.lang === 'en')?.slug || blog.translations[0]?.slug;
      if (primarySlug) {
        this.webhookDispatcher.dispatchWebhook(blog.websiteId, 'blog.archived', primarySlug).catch((err) => {
          this.logger.warn(`Webhook dispatch error for ${primarySlug}: ${err.message}`);
        });
      }
    }

    // Audit logging (non-blocking)
    this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: user.roles[0] || 'Super Admin',
        websiteId: blog.websiteId,
        event: 'blog.deleted',
        ipAddress: ipAddress || '',
        details: `Deleted article with ID: ${id}.`,
      },
    }).catch((err: Error) => {
      this.logger.warn(`Audit log creation error for ${id}: ${err.message}`);
    });

    return { success: true, message: 'Article deleted successfully' };
  }

  async bulkDelete(ids: string[], user: AuthenticatedUser, ipAddress: string) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: true, count: 0, message: 'No articles specified for deletion' };
    }

    const blogs = await this.prisma.blog.findMany({
      where: { id: { in: ids } },
      include: { translations: { select: { slug: true, lang: true } } },
    });

    if (blogs.length === 0) {
      return { success: true, count: 0, message: 'No matching articles found' };
    }

    // Security: verify the caller owns every blog's tenant
    for (const blog of blogs) {
      this.assertBlogOwnership({ id: blog.id, websiteId: blog.websiteId }, user);
    }

    const validIds = blogs.map((b) => b.id);
    const websiteIds = Array.from(new Set(blogs.map((b) => b.websiteId)));

    // Fast batch deletion in database
    if (this.prisma.seoAuditLog?.deleteMany) {
      await this.prisma.seoAuditLog.deleteMany({ where: { blogId: { in: validIds } } }).catch(() => {});
    }
    await this.prisma.blog.deleteMany({ where: { id: { in: validIds } } });

    // Mirror to Supabase Cloud Backup (non-blocking)
    for (const id of validIds) {
      this.supabaseSync.deleteBlog(id).catch(() => {});
    }

    // Dispatch revalidation webhooks for published articles (non-blocking)
    for (const blog of blogs) {
      if (blog.status === 'Published') {
        const primarySlug = blog.translations.find((t) => t.lang === 'en')?.slug || blog.translations[0]?.slug;
        if (primarySlug) {
          this.webhookDispatcher.dispatchWebhook(blog.websiteId, 'blog.archived', primarySlug).catch((err) => {
            this.logger.warn(`Webhook dispatch error for ${primarySlug}: ${err.message}`);
          });
        }
      }
    }

    // High-speed parallel cache invalidation for all affected tenants & slugs (non-blocking)
    (async () => {
      try {
        const cacheOps: Promise<any>[] = [];
        for (const wId of websiteIds) {
          cacheOps.push(this.redis.delPattern(`blogs:${wId}:*`));
          cacheOps.push(this.redis.delPattern(`search:${wId}:*`));
          cacheOps.push(this.redis.del(`redirects:${wId}`));
        }
        cacheOps.push(this.redis.delPattern('admin:blogs:*'));
        cacheOps.push(this.redis.delPattern('admin:redirects:*'));

        for (const blog of blogs) {
          for (const tr of blog.translations) {
            cacheOps.push(this.redis.delPattern(`blog:${blog.websiteId}:${tr.slug}:*`));
          }
        }
        await Promise.allSettled(cacheOps);
      } catch (err) {
        this.logger.warn(`[BulkDelete] Cache invalidation warning: ${(err as Error).message}`);
      }
    })();

    // Batch Audit Log creation (non-blocking)
    (async () => {
      try {
        const auditEntries = blogs.map((b) => ({
          userName: user.name,
          role: user.roles[0] || 'Super Admin',
          websiteId: b.websiteId,
          event: 'blog.deleted',
          ipAddress: ipAddress || '',
          details: `Bulk deleted article with ID: ${b.id}.`,
        }));
        if (this.prisma.systemAuditLog?.createMany) {
          await this.prisma.systemAuditLog.createMany({ data: auditEntries });
        }
      } catch (err) {
        this.logger.warn(`[BulkDelete] Audit log creation failed: ${(err as Error).message}`);
      }
    })();

    return {
      success: true,
      count: validIds.length,
      message: `Successfully deleted ${validIds.length} article(s)`,
    };
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
    if (robotsVal.includes('noindex')) {
      score -= 10;
      checks.push({ id: 'robots', label: 'Robots Directive', status: 'warning', message: `Robots: "${translation.seo?.robots}" — noindex blocks search engines`, scoreImpact: -10 });
    } else if (robotsVal.includes('index')) {
      checks.push({ id: 'robots', label: 'Robots Directive', status: 'pass', message: `Robots: "${translation.seo?.robots}" allows indexing`, scoreImpact: 0 });
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Phase 3: Real-Time Publish Trigger Hook & Recipient Resolution Hierarchy
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Dispatches real-time notifications when a blog is Published:
   * 1. Resolves recipient hierarchy:
   *    - Priority 1: Configured website owner (website.ownerEmail)
   *    - Priority 2: Secondary notification emails (website.notificationEmails)
   *    - Priority 3: Fallback to Website Admins & Super Admins assigned to this website
   * 2. Creates in-app SystemNotification records for relevant admin users and owner.
   * 3. Non-blocking asynchronous AWS SES Email dispatch via EmailService.
   */
  public async dispatchPublishNotifications(blogId: string, actorName?: string): Promise<boolean> {
    try {
      const blog = await this.prisma.blog.findUnique({
        where: { id: blogId },
        include: {
          website: {
            include: {
              userRoleAssignments: {
                where: {
                  OR: [
                    { role: 'Website Admin' },
                    { isGlobal: true, role: 'Super Admin' },
                  ],
                },
                include: {
                  user: {
                    select: { id: true, email: true, name: true },
                  },
                },
              },
            },
          },
          translations: true,
          author: {
            include: {
              roleAssignments: true,
            },
          },
          blogCategories: {
            include: {
              category: true,
            },
          },
        },
      });

      if (!blog || !blog.website) {
        this.logger.warn(`[PublishNotification] Blog ${blogId} or website not found, skipping.`);
        return false;
      }

      const website = blog.website;
      const cleanDomain = (website.domain || website.name || 'localhost').replace(/^https?:\/\//, '').replace(/\/+$/, '');
      const websiteName = website.name || cleanDomain || 'Website';
      const portalUrl = (process.env.APP_URL || 'https://blogary.jupsoft.com').replace(/\/+$/, '');

      // Resolve primary translation
      const primaryTranslation =
        blog.translations?.find((t) => t.lang === 'en') ||
        blog.translations?.[0];

      const blogTitle = primaryTranslation?.title || 'New Blog Article';
      const blogSlug = primaryTranslation?.slug || blog.id;
      const liveUrl = `https://${cleanDomain}/blog/${blogSlug}`;
      const categoryName = blog.blogCategories?.[0]?.category?.name || 'General';
      const authorRole =
        blog.author?.roleAssignments?.find((r) => r.websiteId === website.id || r.isGlobal)?.role ||
        'Content Writer';

      // ── 1. Recipient Hierarchy Resolution ──
      interface ResolvedRecipient {
        email: string;
        name: string;
        userId?: string;
      }

      const recipients: ResolvedRecipient[] = [];

      // Priority 1: Configured Real Owner Email
      if (website.ownerEmail && website.ownerEmail.includes('@')) {
        const cleanEmail = website.ownerEmail.trim().toLowerCase();
        const matchedUser = website.userRoleAssignments?.find(
          (ra) => ra.user?.email?.toLowerCase() === cleanEmail,
        )?.user;

        recipients.push({
          email: cleanEmail,
          name: website.ownerName?.trim() || websiteName,
          userId: matchedUser?.id,
        });
      }

      // Priority 2: Secondary notification emails
      if (Array.isArray(website.notificationEmails) && website.notificationEmails.length > 0) {
        for (const rawEmail of website.notificationEmails) {
          const clean = rawEmail?.trim()?.toLowerCase();
          if (clean && clean.includes('@') && !recipients.some((r) => r.email === clean)) {
            const matchedUser = website.userRoleAssignments?.find(
              (ra) => ra.user?.email?.toLowerCase() === clean,
            )?.user;

            recipients.push({
              email: clean,
              name: `${websiteName} Stakeholder`,
              userId: matchedUser?.id,
            });
          }
        }
      }

      // Priority 3: Assigned Website Admins / Super Admins (Fallback if no owner email configured)
      if (recipients.length === 0 && website.userRoleAssignments && website.userRoleAssignments.length > 0) {
        for (const assignment of website.userRoleAssignments) {
          const u = assignment.user;
          if (u?.email && u.email.includes('@') && !recipients.some((r) => r.email === u.email.toLowerCase())) {
            recipients.push({
              email: u.email.toLowerCase(),
              name: u.name,
              userId: u.id,
            });
          }
        }
      }

      if (recipients.length === 0) {
        this.logger.warn(
          `[PublishNotification] No owner, notification emails, or admins found for website "${websiteName}" (${website.id}). Skipping email dispatch.`,
        );
      }

      // ── 2. Create in-app SystemNotification records (non-blocking) ──
      const inAppUserIds = new Set<string>();
      if (website.userRoleAssignments) {
        for (const ra of website.userRoleAssignments) {
          if (ra.user?.id) {
            inAppUserIds.add(ra.user.id);
          }
        }
      }
      for (const r of recipients) {
        if (r.userId) {
          inAppUserIds.add(r.userId);
        }
      }

      for (const uid of inAppUserIds) {
        try {
          if (this.prisma.systemNotification?.create) {
            await this.prisma.systemNotification.create({
              data: {
                userId: uid,
                websiteId: website.id,
                title: `Article Live: "${blogTitle}"`,
                message: `"${blogTitle}" has been successfully published to ${websiteName} by ${actorName || 'Editor'}.`,
                type: 'BLOG_PUBLISHED',
                link: liveUrl,
              },
            });
          }
        } catch (inAppErr) {
          this.logger.warn(
            `[PublishNotification] In-app notification creation skipped for user ${uid}: ${(inAppErr as Error).message}`,
          );
        }
      }

      const S3_ASSET_BASE = 'https://blogary.s3.ap-south-1.amazonaws.com';
      const resolvedLogoUrl = website.logoUrl && website.logoUrl.trim() !== ''
        ? website.logoUrl
        : undefined;

      let resolvedFeaturedImage = blog.featuredImage;
      if (resolvedFeaturedImage && !resolvedFeaturedImage.startsWith('http://') && !resolvedFeaturedImage.startsWith('https://')) {
        resolvedFeaturedImage = `${S3_ASSET_BASE}/${resolvedFeaturedImage.replace(/^\/+/, '')}`;
      }

      // ── 3. Non-blocking Async AWS SES Email Dispatch to All Resolved Recipients ──
      for (const recipient of recipients) {
        try {
          if (this.emailService?.sendWebsiteOwnerPublishNotification) {
            await this.emailService.sendWebsiteOwnerPublishNotification({
              toEmail: recipient.email,
              toName: recipient.name,
              websiteName: websiteName,
              websiteDomain: cleanDomain,
              websiteLogoUrl: resolvedLogoUrl,
              blogTitle,
              blogSlug,
              blogId: blog.id,
              featuredImage: resolvedFeaturedImage || undefined,
              authorName: blog.authorName,
              authorRole,
              publishDate: blog.publishDate || new Date(),
              readTimeMinutes: blog.readTimeMinutes || 3,
              categoryName,
              excerpt: primaryTranslation?.excerpt || undefined,
              liveUrl,
              portalUrl,
            });
          }
        } catch (mailErr) {
          this.logger.error(
            `[PublishNotification] Email delivery failed for ${recipient.email}: ${(mailErr as Error).message}`,
          );
        }
      }

      return true;
    } catch (err) {
      this.logger.error(
        `[PublishNotification] Error in dispatchPublishNotifications for blog ${blogId}: ${(err as Error).message}`,
      );
      return false;
    }
  }
}

