/**
 * Public V1 Service — TRD §12 (REST API) + §13 (Hybrid Delivery) + §16 (Caching)
 *
 * TRD §13 Cache Keys (exact as specified):
 *   blog:{website}:{slug}:{lang}         → single blog detail   TTL: 3600s
 *   blogs:{website}:{page}:{lang}        → paginated list        TTL: 300s
 *   cats:{website}                       → category tree         TTL: 3600s
 *   tags:{website}                       → tags list             TTL: 3600s
 *   search:{website}:{q}:{lang}          → search results        TTL: 60s
 *
 * TRD §13: "The public API checks Redis first; on miss it reads PostgreSQL and populates the cache.
 *           This absorbs traffic spikes and keeps response times under ~300ms."
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisProvider } from '../../common/providers/redis.provider';

@Injectable()
export class PublicV1Service {
  private mediaBaseUrl: string;

  constructor(
    private prisma: PrismaService,
    private redis: RedisProvider,
    private configService: ConfigService,
  ) {
    const envCdn = this.configService.get<string>('CLOUDFRONT_DOMAIN');
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    const platformBase = this.configService.get<string>('PLATFORM_BASE_URL') || 'https://blogary.jupsoft.com';

    if (envCdn && !envCdn.includes('cdn.jupsoft.com')) {
      this.mediaBaseUrl = envCdn.replace(/\/+$/, '');
    } else if (nodeEnv === 'production') {
      this.mediaBaseUrl = `${platformBase.replace(/\/+$/, '')}/uploads`;
    } else {
      this.mediaBaseUrl = 'http://localhost:4000/uploads';
    }
  }

  async checkRedis(): Promise<boolean> {
    return this.redis.ping();
  }

  private normalizeMediaUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    if (url.includes('cdn.jupsoft.com')) {
      const blogsIdx = url.indexOf('blogs/');
      const rel = blogsIdx !== -1 ? url.substring(blogsIdx) : url.replace(/^https?:\/\/[^/]+\/(uploads\/)?/, '');
      return `${this.mediaBaseUrl}/${rel}`;
    }
    if (url.startsWith('/uploads/')) {
      const baseWithoutUploads = this.mediaBaseUrl.replace(/\/uploads$/, '');
      return `${baseWithoutUploads}${url}`;
    }
    if (url.startsWith('blogs/')) {
      return `${this.mediaBaseUrl}/${url}`;
    }
    return url;
  }

  // ─── TRD §13: key format blogs:{website}:{page}:{lang}[:{category}][:{tag}]
  async getPublishedBlogs(params: {
    websiteId: string;
    category?: string;
    tag?: string;
    lang?: string;
    page?: number;
    limit?: number;
  }) {
    const { websiteId, category, tag, lang = 'en', page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    // TRD §13: Check Redis first
    const cacheKey = `blogs:${websiteId}:${page}:${lang}${category ? `:cat-${category}` : ''}${tag ? `:tag-${tag}` : ''}`;
    const cached = await this.redis.get<unknown>(cacheKey);
    if (cached) return cached;

    const where: any = {
      websiteId,
      status: 'Published',
    };

    // Wire category filter — search in categoryIds array OR via blogCategories join table
    if (category) {
      where.OR = [
        { categoryIds: { has: category } },
        { blogCategories: { some: { category: { OR: [{ id: category }, { slug: category }] } } } },
      ];
    }

    // Wire tag filter — search in tagIds array OR via blogTags join table
    if (tag) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { tagIds: { has: tag } },
            { blogTags: { some: { tag: { OR: [{ id: tag }, { slug: tag }] } } } },
          ],
        },
      ];
    }

    const [total, blogs] = await Promise.all([
      this.prisma.blog.count({ where }),
      this.prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishDate: 'desc' },
        include: {
          translations: true,
          website: { select: { domain: true, name: true } },
        },
      }),
    ]);

    const data = blogs.map((b) => {
      const tr =
        b.translations.find((t) => t.lang === lang) ||
        b.translations.find((t) => t.lang === 'en') ||
        b.translations[0];
      return {
        id: b.id,
        slug: tr?.slug || b.id,
        title: tr?.title || 'Untitled',
        excerpt: tr?.excerpt || '',
        featuredImage: this.normalizeMediaUrl(b.featuredImage),
        authorName: b.authorName,
        publishedAt: b.publishDate?.toISOString(),
        readTimeMinutes: b.readTimeMinutes,
        seo: {
          metaTitle: tr?.metaTitle || tr?.title,
          metaDescription: tr?.metaDescription || tr?.excerpt,
          canonicalUrl: tr?.canonicalUrl || `https://${b.website.domain}/blog/${tr?.slug}`,
        },
        categoryIds: b.categoryIds,
        tagIds: b.tagIds,
      };
    });

    const result = {
      success: true,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data,
    };

    // TRD §16: Populate cache — TTL 300s for lists
    await this.redis.set(cacheKey, result, 300);
    return result;
  }

  private formatBlogDetail(translation: any, redirect?: { statusCode: number; fromSlug: string; toSlug: string }) {
    const b = translation.blog;

    // Increment viewCount atomically without mutating updatedAt — TRD §14 (Analytics: view_count)
    if (b?.id) {
      this.prisma
        .$executeRawUnsafe('UPDATE blogs SET view_count = view_count + 1 WHERE id = $1', b.id)
        .catch(() => {});
    }

    return {
      success: true,
      ...(redirect ? { redirect } : {}),
      data: {
        id: b.id,
        slug: translation.slug,
        title: translation.title,
        content: translation.content,
        excerpt: translation.excerpt,
        featuredImage: this.normalizeMediaUrl(b.featuredImage),
        authorName: b.authorName,
        publishedAt: b.publishDate instanceof Date ? b.publishDate.toISOString() : b.publishDate,
        readTimeMinutes: b.readTimeMinutes,
        // TRD §11 SEO fields
        seo: {
          metaTitle: translation.metaTitle || translation.title,
          metaDescription: translation.metaDescription || translation.excerpt,
          metaKeywords: translation.metaKeywords,
          canonicalUrl:
            translation.canonicalUrl ||
            `https://${b.website?.domain || ''}/blog/${translation.slug}`,
          focusKeyword: translation.focusKeyword,
          robots: translation.robots,
          ogTitle: translation.ogTitle || translation.title,
          ogDescription: translation.ogDescription || translation.excerpt,
          ogImage: this.normalizeMediaUrl(translation.ogImage || b.featuredImage),
          twitterTitle: translation.twitterTitle || translation.title,
          twitterDescription: translation.twitterDescription || translation.excerpt,
          twitterImage: this.normalizeMediaUrl(translation.twitterImage || b.featuredImage),
          // TRD §11: "The API also exposes canonical and hreflang data so consuming sites can emit correct <head> tags"
          hreflang: (b.translations || []).map((t: any) => ({
            lang: t.lang,
            href: `https://${b.website?.domain || ''}/blog/${t.slug}?lang=${t.lang}`,
          })),
        },
        // TRD §11: Schema.org JSON-LD for consuming sites
        schemaJsonLd: {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: translation.title,
          image: b.featuredImage ? [this.normalizeMediaUrl(b.featuredImage)] : [],
          datePublished: b.publishDate instanceof Date ? b.publishDate.toISOString() : b.publishDate,
          dateModified: b.updatedAt instanceof Date ? b.updatedAt.toISOString() : new Date().toISOString(),
          author: { '@type': 'Person', name: b.authorName },
          description: translation.excerpt,
        },
      },
    };
  }

  // ─── TRD §13: key format blog:{website}:{slug}:{lang}
  async getBlogBySlug(slug: string, websiteId: string, lang = 'en') {
    // TRD §13: "checks Redis first (key: blog:{website}:{slug}:{lang})"
    const cacheKey = `blog:${websiteId}:${slug}:${lang}`;
    const cached = await this.redis.get<unknown>(cacheKey);
    if (cached) return cached;

    // 1. Direct match by slug, lang, and website (latest updated first)
    let translation = await this.prisma.blogTranslation.findFirst({
      where: {
        slug,
        lang,
        blog: { websiteId, status: 'Published' },
      },
      orderBy: {
        blog: { updatedAt: 'desc' },
      },
      include: {
        blog: {
          include: {
            website: true,
            translations: { select: { lang: true, slug: true, title: true } },
          },
        },
      },
    });

    // 2. Fallback: Check if slug exists in ANY language for this website
    if (!translation) {
      const matchAny = await this.prisma.blogTranslation.findFirst({
        where: {
          slug,
          blog: { websiteId, status: 'Published' },
        },
        orderBy: {
          blog: { updatedAt: 'desc' },
        },
        include: {
          blog: {
            include: {
              website: true,
              translations: true,
            },
          },
        },
      });

      if (matchAny) {
        const resolved =
          matchAny.blog.translations.find((t) => t.lang === lang) ||
          matchAny.blog.translations.find((t) => t.lang === 'en') ||
          matchAny;

        translation = {
          ...resolved,
          blog: matchAny.blog,
        };
      }
    }

    // 3. 301 Redirect Check: Check if slug was modified and redirected
    if (!translation) {
      const redirect = await this.prisma.redirect.findFirst({
        where: { websiteId, fromSlug: slug },
      });

      if (redirect) {
        // Fetch target article by new slug
        const targetTranslation = await this.prisma.blogTranslation.findFirst({
          where: {
            slug: redirect.toSlug,
            blog: { websiteId, status: 'Published' },
          },
          include: {
            blog: {
              include: {
                website: true,
                translations: true,
              },
            },
          },
        });

        if (targetTranslation) {
          const resolved =
            targetTranslation.blog.translations.find((t) => t.lang === lang) ||
            targetTranslation.blog.translations.find((t) => t.lang === 'en') ||
            targetTranslation;

          const redirectResult = this.formatBlogDetail(
            { ...resolved, blog: targetTranslation.blog },
            { statusCode: redirect.statusCode || 301, fromSlug: slug, toSlug: redirect.toSlug },
          );
          await this.redis.set(cacheKey, redirectResult, 300);
          return redirectResult;
        }
      }

      throw new NotFoundException(`No published article found for slug "${slug}"`);
    }

    const result = this.formatBlogDetail(translation);
    // TRD §16: Populate cache — TTL 3600s for individual blog detail
    await this.redis.set(cacheKey, result, 3600);
    return result;
  }

  // ─── TRD §13: key format cats:{website}
  async getCategories(websiteId?: string) {
    const cacheKey = `cats:${websiteId || 'all'}`;
    const cached = await this.redis.get<unknown>(cacheKey);
    if (cached) return cached;

    const where = websiteId && websiteId !== 'all' ? { websiteId } : {};
    const categories = await this.prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const result = { success: true, data: categories };
    await this.redis.set(cacheKey, result, 3600);
    return result;
  }

  // ─── TRD §13: key format tags:{website}
  async getTags(websiteId?: string) {
    const cacheKey = `tags:${websiteId || 'all'}`;
    const cached = await this.redis.get<unknown>(cacheKey);
    if (cached) return cached;

    const where = websiteId && websiteId !== 'all' ? { websiteId } : {};
    const tags = await this.prisma.tag.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const result = { success: true, data: tags };
    await this.redis.set(cacheKey, result, 3600);
    return result;
  }

  // ─── TRD §4 + §12: PostgreSQL Full-Text Search — key format search:{website}:{q}:{lang}
  // Uses tsvector generated column + GIN index (add_fts_search_vector.sql migration required)
  // Falls back to ilike if FTS column is not yet available (zero-downtime migration window)
  async search(query: string, websiteId: string, lang = 'en', limit = 10) {
    if (!query?.trim()) {
      return { success: true, query, meta: { count: 0 }, data: [] };
    }

    const cacheKey = `search:${websiteId}:${encodeURIComponent(query)}:${lang}`;
    const cached = await this.redis.get<unknown>(cacheKey);
    if (cached) return cached;

    let matches: any[] = [];

    try {
      // ── Primary: PostgreSQL FTS via tsvector + plainto_tsquery ──────────
      // plainto_tsquery safely handles arbitrary user input (no injection risk)
      // ts_rank_cd weights: {D=0.1, C=0.2, B=0.4, A=1.0} (title=A, excerpt=B, content=C)
      matches = await this.prisma.$queryRaw<any[]>`
        SELECT
          bt.id,
          bt.blog_id       AS "blogId",
          bt.title,
          bt.slug,
          bt.excerpt,
          bt.lang,
          b.featured_image AS "featuredImage",
          b.publish_date   AS "publishDate",
          b.author_name    AS "authorName",
          b.read_time_minutes AS "readTimeMinutes",
          b.view_count     AS "viewCount",
          ts_rank_cd(bt.search_vector, plainto_tsquery('english', ${query})) AS rank
        FROM blog_translations bt
        JOIN blogs b ON bt.blog_id = b.id
        WHERE bt.lang           = ${lang}
          AND b.website_id      = ${websiteId}
          AND b.status          = 'Published'
          AND bt.search_vector @@ plainto_tsquery('english', ${query})
        ORDER BY rank DESC
        LIMIT ${limit}
      `;
    } catch (ftsError: any) {
      // FTS column not yet migrated — graceful fallback to ilike
      if (
        ftsError.message?.includes('search_vector') ||
        ftsError.message?.includes('column') ||
        ftsError.code === '42703'
      ) {
        this.prisma['logger']?.warn?.(
          `FTS column not available, falling back to ilike search. Run: pnpm run fts:migrate`,
        );
        const fallback = await this.prisma.blogTranslation.findMany({
          where: {
            lang,
            blog: { websiteId, status: 'Published' },
            OR: [
              { title:   { contains: query, mode: 'insensitive' } },
              { excerpt: { contains: query, mode: 'insensitive' } },
              { content: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: limit,
          include: { blog: true },
        });
        matches = fallback.map((m) => ({
          blogId: m.blogId,
          title:  m.title,
          slug:   m.slug,
          excerpt: m.excerpt,
          featuredImage: m.blog.featuredImage,
          publishDate:   m.blog.publishDate?.toISOString(),
          rank: 0,
        }));
      } else {
        throw ftsError;
      }
    }

    const result = {
      success: true,
      query,
      meta: { count: matches.length, engine: 'postgresql-fts' },
      data: matches.map((m) => ({
        id:           m.blogId,
        title:        m.title,
        slug:         m.slug,
        excerpt:      m.excerpt,
        featuredImage: this.normalizeMediaUrl(m.featuredImage),
        publishDate:  m.publishDate instanceof Date
          ? m.publishDate.toISOString()
          : m.publishDate,
        rank: parseFloat(m.rank ?? '0'),
      })),
    };

    await this.redis.set(cacheKey, result, 60);
    return result;
  }


  // ─── TRD §12: GET /blogs/latest?website= (Latest published articles)
  async getLatestBlogs(websiteId: string, lang = 'en', limit = 5) {
    const cacheKey = `blogs:${websiteId}:latest:${lang}:${limit}`;
    const cached = await this.redis.get<unknown>(cacheKey);
    if (cached) return cached;

    const blogs = await this.prisma.blog.findMany({
      where: { websiteId, status: 'Published' },
      take: limit,
      orderBy: { publishDate: 'desc' },
      include: {
        translations: true,
        website: { select: { domain: true, name: true } },
      },
    });

    const data = blogs.map((b) => {
      const tr =
        b.translations.find((t) => t.lang === lang) ||
        b.translations.find((t) => t.lang === 'en') ||
        b.translations[0];
      return {
        id: b.id,
        slug: tr?.slug || b.id,
        title: tr?.title || 'Untitled',
        excerpt: tr?.excerpt || '',
        featuredImage: this.normalizeMediaUrl(b.featuredImage),
        authorName: b.authorName,
        publishDate: b.publishDate?.toISOString(),
        readTimeMinutes: b.readTimeMinutes,
        viewCount: b.viewCount,
      };
    });

    const result = { success: true, count: data.length, data };
    await this.redis.set(cacheKey, result, 300); // 5 min TTL
    return result;
  }

  // ─── TRD §12: GET /blogs/popular?website= (Most-viewed published articles)
  async getPopularBlogs(websiteId: string, lang = 'en', limit = 5) {
    const cacheKey = `blogs:${websiteId}:popular:${lang}:${limit}`;
    const cached = await this.redis.get<unknown>(cacheKey);
    if (cached) return cached;

    const blogs = await this.prisma.blog.findMany({
      where: { websiteId, status: 'Published' },
      take: limit,
      orderBy: { viewCount: 'desc' },
      include: {
        translations: true,
        website: { select: { domain: true, name: true } },
      },
    });

    const data = blogs.map((b) => {
      const tr =
        b.translations.find((t) => t.lang === lang) ||
        b.translations.find((t) => t.lang === 'en') ||
        b.translations[0];
      return {
        id: b.id,
        slug: tr?.slug || b.id,
        title: tr?.title || 'Untitled',
        excerpt: tr?.excerpt || '',
        featuredImage: this.normalizeMediaUrl(b.featuredImage),
        authorName: b.authorName,
        publishDate: b.publishDate?.toISOString(),
        readTimeMinutes: b.readTimeMinutes,
        viewCount: b.viewCount,
      };
    });

    const result = { success: true, count: data.length, data };
    await this.redis.set(cacheKey, result, 300); // 5 min TTL
    return result;
  }

  // ─── TRD §10: GET /v1/redirects (301 Permanent Redirects for Edge Middleware)
  async getRedirects(websiteId: string) {
    const cacheKey = `redirects:${websiteId}`;
    const cached = await this.redis.get<unknown>(cacheKey);
    if (cached) return cached;

    const redirects = await this.prisma.redirect.findMany({
      where: { websiteId },
      select: {
        fromSlug: true,
        toSlug: true,
        statusCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = { success: true, count: redirects.length, data: redirects };
    await this.redis.set(cacheKey, result, 3600); // 1 hour TTL
    return result;
  }

  // ─── Cache Invalidation (called by blogs.service on publish/update/delete)
  // TRD §13: "On publish/update, a webhook triggers on-demand revalidation"
  // Redis keys are also invalidated so next hit reads fresh data from Postgres.
  async invalidateBlogCache(websiteId: string, slug: string): Promise<void> {
    // Invalidate all lang variants of this specific blog
    await this.redis.delPattern(`blog:${websiteId}:${slug}:*`);
    // Invalidate all paginated list caches for this website
    await this.redis.delPattern(`blogs:${websiteId}:*`);
    // Invalidate search cache for this website
    await this.redis.delPattern(`search:${websiteId}:*`);
  }

  async invalidateTaxonomyCache(websiteId: string): Promise<void> {
    await this.redis.del(`cats:${websiteId}`);
    await this.redis.del(`tags:${websiteId}`);
  }

  async invalidateRedirectsCache(websiteId: string): Promise<void> {
    await this.redis.del(`redirects:${websiteId}`);
  }
}
