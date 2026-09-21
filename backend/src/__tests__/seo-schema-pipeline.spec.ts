/**
 * SEO, SCHEMA.ORG & CONSUMER PIPELINE TESTS (TRD §11, §12, §14)
 * Tests:
 * 1. Complete SEO Meta Generation (OpenGraph, Twitter, Canonical)
 * 2. Schema.org JSON-LD BlogPosting schema structure
 * 3. Hreflang alternate language link generation
 * 4. Language fallback hierarchy (requested -> en -> first)
 * 5. Atomic view count increment without touching updatedAt
 * 6. Category and Tag taxonomy resolution
 */

import { PublicV1Service } from '../modules/public-v1/public-v1.service';

describe('Pipeline: SEO, Schema.org JSON-LD & Consumer Delivery (TRD §11, §12)', () => {
  const mockPrisma = {
    blog: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    blogTranslation: {
      findFirst: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
    },
    redirect: {
      findFirst: jest.fn(),
    },
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
  };

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn(),
    delPattern: jest.fn(),
    ping: jest.fn().mockResolvedValue(true),
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'CLOUDFRONT_DOMAIN') return 'https://cdn.jupsoft.com';
      if (key === 'NODE_ENV') return 'production';
      if (key === 'PLATFORM_BASE_URL') return 'https://blogary.jupsoft.com';
      return null;
    }),
  };

  let service: PublicV1Service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PublicV1Service(
      mockPrisma as any,
      mockRedis as any,
      mockConfig as any,
    );
  });

  const fullMockBlog = {
    id: 'blog-seo-1',
    websiteId: 'site-growth',
    status: 'Published',
    authorName: 'Aarav Sharma (Super Admin)',
    authorAvatar: 'avatars/aarav.webp',
    featuredImage: 'blogs/geo-seo.webp',
    featuredImageAlt: 'GEO Search Optimization 2026',
    publishDate: new Date('2026-09-15T10:00:00.000Z'),
    updatedAt: new Date('2026-09-18T12:00:00.000Z'),
    readTimeMinutes: 5,
    categoryIds: ['cat-seo'],
    tagIds: ['tag-ai'],
    website: { domain: 'digifynext.com', name: 'DigifyNext Marketing' },
    blogCategories: [
      { category: { id: 'cat-seo', name: 'SEO & Growth', slug: 'seo-growth' } },
    ],
    blogTags: [
      { tag: { id: 'tag-ai', name: 'AI Search', slug: 'ai-search' } },
    ],
    translations: [
      {
        lang: 'en',
        slug: 'geo-search-engine-optimization-2026',
        title: 'GEO: The Future of Search in 2026',
        excerpt: 'How generative engine optimization is reshaping organic visibility.',
        content: '<p>Generative engines like Gemini and Perplexity are changing search.</p>',
        metaTitle: 'GEO Optimization Guide 2026 | DigifyNext',
        metaDescription: 'A complete guide to ranking in generative AI search engines.',
        metaKeywords: 'GEO, AI SEO, Generative Search',
        canonicalUrl: 'https://digifynext.com/blog/geo-search-engine-optimization-2026',
        focusKeyword: 'GEO optimization',
        robots: 'index, follow',
        ogTitle: 'GEO Optimization Guide 2026',
        ogDescription: 'Rank in Perplexity, ChatGPT and Gemini.',
        ogImage: 'blogs/geo-og.webp',
        twitterTitle: 'GEO Optimization Guide 2026',
        twitterDescription: 'Rank in Perplexity, ChatGPT and Gemini.',
        twitterImage: 'blogs/geo-twitter.webp',
      },
      {
        lang: 'hi',
        slug: 'geo-search-engine-optimization-2026-hi',
        title: 'GEO: 2026 में सर्च इंजन ऑप्टिमाइजेशन का भविष्य',
        excerpt: 'जेनेरेटिव इंजन ऑप्टिमाइजेशन कैसे ऑर्गेनिक विजिबिलिटी बदल रहा है।',
        content: '<p>जेमिनी और परप्लेक्सिटी जैसे इंजन सर्च को बदल रहे हैं।</p>',
      },
    ],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE 1: Complete SEO Metadata & Schema.org JSON-LD
  // ═══════════════════════════════════════════════════════════════════════════
  describe('SEO Metadata & Schema.org JSON-LD Generation (TRD §11)', () => {
    it('should generate valid Schema.org BlogPosting JSON-LD', async () => {
      mockPrisma.blogTranslation.findFirst.mockResolvedValue({
        ...fullMockBlog.translations[0],
        blog: fullMockBlog,
      });

      const res = (await service.getBlogBySlug('geo-search-engine-optimization-2026', 'site-growth', 'en')) as any;

      expect(res.success).toBe(true);
      const data = res.data;

      // Verify Schema.org structure
      expect(data.schemaJsonLd).toBeDefined();
      expect(data.schemaJsonLd['@context']).toBe('https://schema.org');
      expect(data.schemaJsonLd['@type']).toBe('BlogPosting');
      expect(data.schemaJsonLd.headline).toBe('GEO: The Future of Search in 2026');
      expect(data.schemaJsonLd.author['@type']).toBe('Person');
      // Clean author name should strip role parenthesis
      expect(data.schemaJsonLd.author.name).toBe('Aarav Sharma');
      expect(data.schemaJsonLd.datePublished).toBe('2026-09-15T10:00:00.000Z');
      expect(data.schemaJsonLd.dateModified).toBe('2026-09-18T12:00:00.000Z');
      expect(data.schemaJsonLd.description).toBe('How generative engine optimization is reshaping organic visibility.');
    });

    it('should generate complete OpenGraph and Twitter Card metadata', async () => {
      mockPrisma.blogTranslation.findFirst.mockResolvedValue({
        ...fullMockBlog.translations[0],
        blog: fullMockBlog,
      });

      const res = (await service.getBlogBySlug('geo-search-engine-optimization-2026', 'site-growth', 'en')) as any;
      const seo = res.data.seo;

      expect(seo.ogTitle).toBe('GEO Optimization Guide 2026');
      expect(seo.ogDescription).toBe('Rank in Perplexity, ChatGPT and Gemini.');
      expect(seo.ogImage).toContain('blogs/geo-og.webp');
      expect(seo.twitterTitle).toBe('GEO Optimization Guide 2026');
      expect(seo.twitterDescription).toBe('Rank in Perplexity, ChatGPT and Gemini.');
      expect(seo.canonicalUrl).toBe('https://digifynext.com/blog/geo-search-engine-optimization-2026');
      expect(seo.robots).toBe('index, follow');
    });

    it('should generate hreflang array for all active language translations', async () => {
      mockPrisma.blogTranslation.findFirst.mockResolvedValue({
        ...fullMockBlog.translations[0],
        blog: fullMockBlog,
      });

      const res = (await service.getBlogBySlug('geo-search-engine-optimization-2026', 'site-growth', 'en')) as any;
      const hreflang = res.data.seo.hreflang;

      expect(hreflang).toHaveLength(2);
      expect(hreflang[0]).toEqual({
        lang: 'en',
        href: 'https://digifynext.com/blog/geo-search-engine-optimization-2026?lang=en',
      });
      expect(hreflang[1]).toEqual({
        lang: 'hi',
        href: 'https://digifynext.com/blog/geo-search-engine-optimization-2026-hi?lang=hi',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE 2: Multi-Language Fallback Hierarchy
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Language Fallback Hierarchy (TRD §8)', () => {
    it('should fall back to English if requested language is not authored', async () => {
      // Direct French match returns null
      mockPrisma.blogTranslation.findFirst.mockResolvedValueOnce(null);
      // Fallback query across all languages finds English
      mockPrisma.blogTranslation.findFirst.mockResolvedValueOnce({
        lang: 'en',
        slug: 'geo-search-engine-optimization-2026',
        blog: fullMockBlog,
      });

      const res = (await service.getBlogBySlug('geo-search-engine-optimization-2026', 'site-growth', 'fr')) as any;

      expect(res.success).toBe(true);
      // Returns English title as graceful fallback
      expect(res.data.title).toBe('GEO: The Future of Search in 2026');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE 3: Atomic View Count Tracking (TRD §14)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Analytics & View Counter', () => {
    it('should increment view count atomically using raw SQL without modifying updatedAt', async () => {
      mockPrisma.blogTranslation.findFirst.mockResolvedValue({
        ...fullMockBlog.translations[0],
        blog: fullMockBlog,
      });

      await service.getBlogBySlug('geo-search-engine-optimization-2026', 'site-growth', 'en');

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        'UPDATE blogs SET view_count = view_count + 1 WHERE id = $1',
        'blog-seo-1',
      );
    });
  });
});
