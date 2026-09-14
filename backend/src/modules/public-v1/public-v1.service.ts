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
import { PrismaService } from '../../prisma/prisma.service';
import { RedisProvider } from '../../common/providers/redis.provider';

@Injectable()
export class PublicV1Service {
  constructor(
    private prisma: PrismaService,
    private redis: RedisProvider,
  ) {}

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

    const where: Record<string, unknown> = {
      websiteId,
      status: 'Published',
    };

    const [total, blogs] = await Promise.all([
      this.prisma.blog.count({ where }),
      this.prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishDate: 'desc' },
        include: {
          translations: { where: { lang } },
          website: { select: { domain: true, name: true } },
        },
      }),
    ]);

    const data = blogs.map((b) => {
      const tr = b.translations[0];
      return {
        id: b.id,
        slug: tr?.slug || b.id,
        title: tr?.title || 'Untitled',
        excerpt: tr?.excerpt || '',
        featuredImage: b.featuredImage,
        authorName: b.authorName,
        publishedAt: b.publishDate?.toISOString(),
        readTimeMinutes: b.readTimeMinutes,
        seo: {
          metaTitle: tr?.metaTitle,
          metaDescription: tr?.metaDescription,
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

  // ─── TRD §13: key format blog:{website}:{slug}:{lang}
  async getBlogBySlug(slug: string, websiteId: string, lang = 'en') {
    // TRD §13: "checks Redis first (key: blog:{website}:{slug}:{lang})"
    const cacheKey = `blog:${websiteId}:${slug}:${lang}`;
    const cached = await this.redis.get<unknown>(cacheKey);
    if (cached) return cached;

    const translation = await this.prisma.blogTranslation.findFirst({
      where: {
        slug,
        lang,
        blog: { websiteId, status: 'Published' },
      },
      include: {
        blog: {
          include: {
            website: true,
            translations: { select: { lang: true, slug: true } },
          },
        },
      },
    });

    if (!translation) {
      throw new NotFoundException(`No published article found for slug "${slug}"`);
    }

    const b = translation.blog;

    // Increment viewCount asynchronously — TRD §14 (Analytics: view_count)
    this.prisma.blog
      .update({ where: { id: b.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {});

    const result = {
      success: true,
      data: {
        id: b.id,
        slug: translation.slug,
        title: translation.title,
        content: translation.content,
        excerpt: translation.excerpt,
        featuredImage: b.featuredImage,
        authorName: b.authorName,
        publishedAt: b.publishDate?.toISOString(),
        readTimeMinutes: b.readTimeMinutes,
        // TRD §11 SEO fields
        seo: {
          metaTitle: translation.metaTitle || translation.title,
          metaDescription: translation.metaDescription || translation.excerpt,
          metaKeywords: translation.metaKeywords,
          canonicalUrl:
            translation.canonicalUrl ||
            `https://${b.website.domain}/blog/${translation.slug}`,
          focusKeyword: translation.focusKeyword,
          robots: translation.robots,
          ogTitle: translation.ogTitle || translation.title,
          ogDescription: translation.ogDescription || translation.excerpt,
          ogImage: translation.ogImage || b.featuredImage,
          twitterTitle: translation.twitterTitle || translation.title,
          twitterDescription: translation.twitterDescription || translation.excerpt,
          twitterImage: translation.twitterImage || b.featuredImage,
          // TRD §11: "The API also exposes canonical and hreflang data so consuming sites can emit correct <head> tags"
          hreflang: b.translations.map((t) => ({
            lang: t.lang,
            href: `https://${b.website.domain}/blog/${t.slug}?lang=${t.lang}`,
          })),
        },
        // TRD §11: Schema.org JSON-LD for consuming sites
        schemaJsonLd: {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: translation.title,
          image: b.featuredImage ? [b.featuredImage] : [],
          datePublished: b.publishDate?.toISOString(),
          dateModified: b.updatedAt.toISOString(),
          author: { '@type': 'Person', name: b.authorName },
          description: translation.excerpt,
        },
      },
    };

    // TRD §16: Populate cache — TTL 3600s for individual blog detail
    await this.redis.set(cacheKey, result, 3600);
    return result;
  }

  // ─── TRD §13: key format cats:{website}
  async getCategories(websiteId: string) {
    const cacheKey = `cats:${websiteId}`;
    const cached = await this.redis.get<unknown>(cacheKey);
    if (cached) return cached;

    const categories = await this.prisma.category.findMany({
      where: { websiteId },
      orderBy: { name: 'asc' },
    });

    const result = { success: true, data: categories };
    await this.redis.set(cacheKey, result, 3600);
    return result;
  }

  // ─── TRD §13: key format tags:{website}
  async getTags(websiteId: string) {
    const cacheKey = `tags:${websiteId}`;
    const cached = await this.redis.get<unknown>(cacheKey);
    if (cached) return cached;

    const tags = await this.prisma.tag.findMany({
      where: { websiteId },
      orderBy: { name: 'asc' },
    });

    const result = { success: true, data: tags };
    await this.redis.set(cacheKey, result, 3600);
    return result;
  }

  // ─── TRD §12: Full-text search — key format search:{website}:{q}:{lang}
  async search(query: string, websiteId: string, lang = 'en', limit = 10) {
    const cacheKey = `search:${websiteId}:${encodeURIComponent(query)}:${lang}`;
    const cached = await this.redis.get<unknown>(cacheKey);
    if (cached) return cached;

    const matches = await this.prisma.blogTranslation.findMany({
      where: {
        lang,
        blog: { websiteId, status: 'Published' },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { excerpt: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      include: { blog: true },
    });

    const result = {
      success: true,
      query,
      meta: { count: matches.length },
      data: matches.map((m) => ({
        id: m.blogId,
        title: m.title,
        slug: m.slug,
        excerpt: m.excerpt,
        featuredImage: m.blog.featuredImage,
        publishDate: m.blog.publishDate?.toISOString(),
      })),
    };

    // Short TTL for search — 60s
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
        translations: { where: { lang } },
        website: { select: { domain: true, name: true } },
      },
    });

    const data = blogs.map((b) => {
      const tr = b.translations[0];
      return {
        id: b.id,
        slug: tr?.slug || b.id,
        title: tr?.title || 'Untitled',
        excerpt: tr?.excerpt || '',
        featuredImage: b.featuredImage,
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
        translations: { where: { lang } },
        website: { select: { domain: true, name: true } },
      },
    });

    const data = blogs.map((b) => {
      const tr = b.translations[0];
      return {
        id: b.id,
        slug: tr?.slug || b.id,
        title: tr?.title || 'Untitled',
        excerpt: tr?.excerpt || '',
        featuredImage: b.featuredImage,
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
}
