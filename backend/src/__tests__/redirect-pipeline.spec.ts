/**
 * 301 PERMANENT REDIRECT PIPELINE TESTS (TRD §7, §11, §13)
 * Tests:
 * 1. Automatic 301 redirect creation on slug modification in BlogsService.update
 * 2. Slugs sanitation (trim, strip slashes, normalize)
 * 3. Cache invalidation on redirect creation
 * 4. Draft slug modification does NOT create redirect
 * 5. Public API v1 301 redirect lookup, multi-format matching, and redirect chain resolution (A -> B -> C)
 * 6. 404 behavior when slug has no match or target blog is not published
 * 7. RedirectsService manual CRUD and caching
 */

import { BlogsService } from '../modules/blogs/blogs.service';
import { PublicV1Service } from '../modules/public-v1/public-v1.service';
import { RedirectsService } from '../modules/redirects/redirects.service';
import { NotFoundException } from '@nestjs/common';

describe('Pipeline: 301 Permanent Redirects & Slug Lifecycle (TRD §7)', () => {
  // ─── Shared Mocks ──────────────────────────────────────────────────────────
  const mockPrisma = {
    blog: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    blogTranslation: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    redirect: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    systemAuditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (fn: any) => fn(mockPrisma)),
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delPattern: jest.fn(),
    ping: jest.fn().mockResolvedValue(true),
  };

  const mockWebhook = {
    dispatchWebhook: jest.fn().mockResolvedValue(undefined),
  };

  const mockEmail = {
    sendWorkflowNotification: jest.fn(),
  };

  const mockSupabase = {
    syncBlog: jest.fn().mockResolvedValue(undefined),
    deleteBlog: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'CLOUDFRONT_DOMAIN') return 'https://cdn.test.com';
      if (key === 'NODE_ENV') return 'test';
      if (key === 'PLATFORM_BASE_URL') return 'https://blogary.jupsoft.com';
      return null;
    }),
  };

  let blogsService: BlogsService;
  let publicV1Service: PublicV1Service;
  let redirectsService: RedirectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    blogsService = new BlogsService(
      mockPrisma as any,
      mockWebhook as any,
      mockRedis as any,
      mockEmail as any,
      mockSupabase as any,
    );
    publicV1Service = new PublicV1Service(
      mockPrisma as any,
      mockRedis as any,
      mockConfig as any,
    );
    redirectsService = new RedirectsService(
      mockPrisma as any,
      mockRedis as any,
    );
  });

  const testUser = {
    id: 'user-admin-1',
    email: 'admin@jupsoft.com',
    name: 'Super Admin',
    roles: ['Super Admin'],
    roleAssignments: [{ role: 'Super Admin', isGlobal: true, websiteId: null }],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE 1: Auto 301 Creation in BlogsService.update
  // ═══════════════════════════════════════════════════════════════════════════
  describe('BlogsService.update - Auto 301 Redirect Generation', () => {
    it('should automatically create a 301 redirect when a published blog slug is modified', async () => {
      const existingPublishedBlog = {
        id: 'blog-101',
        websiteId: 'site-growth',
        status: 'Published',
        translations: [
          { lang: 'en', slug: 'original-slug', title: 'Original Title', content: '<p>Content</p>' },
        ],
      };

      mockPrisma.blog.findUnique.mockResolvedValue(existingPublishedBlog);

      const updateDto = {
        translations: [
          { lang: 'en', slug: 'updated-seo-slug', title: 'Original Title', content: '<p>Content</p>' },
        ],
      };

      await blogsService.update('blog-101', updateDto as any, testUser as any, '127.0.0.1');

      // Verify tx.redirect.upsert was called with clean slugs
      expect(mockPrisma.redirect.upsert).toHaveBeenCalledWith({
        where: {
          websiteId_fromSlug: {
            websiteId: 'site-growth',
            fromSlug: 'original-slug',
          },
        },
        update: { toSlug: 'updated-seo-slug', statusCode: 301 },
        create: {
          websiteId: 'site-growth',
          fromSlug: 'original-slug',
          toSlug: 'updated-seo-slug',
          statusCode: 301,
        },
      });

      // Verify audit log entry
      expect(mockPrisma.systemAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event: 'redirect.created',
          websiteId: 'site-growth',
          details: 'Auto 301 redirect: /original-slug → /updated-seo-slug',
        }),
      });

      // Verify Redis cache for redirects and old blog was purged
      expect(mockRedis.del).toHaveBeenCalledWith('redirects:site-growth');
      expect(mockRedis.delPattern).toHaveBeenCalledWith('admin:redirects:*');
      expect(mockRedis.delPattern).toHaveBeenCalledWith('blog:site-growth:original-slug:*');
    });

    it('should strip leading and trailing slashes when generating 301 redirects', async () => {
      const existingPublishedBlog = {
        id: 'blog-102',
        websiteId: 'site-cloud',
        status: 'Published',
        translations: [
          { lang: 'en', slug: '/leading-slash-slug/', title: 'Cloud ERP Post', content: '<p>Cloud</p>' },
        ],
      };

      mockPrisma.blog.findUnique.mockResolvedValue(existingPublishedBlog);

      const updateDto = {
        translations: [
          { lang: 'en', slug: '///clean-destination-slug///', title: 'Cloud ERP Post', content: '<p>Cloud</p>' },
        ],
      };

      await blogsService.update('blog-102', updateDto as any, testUser as any, '127.0.0.1');

      expect(mockPrisma.redirect.upsert).toHaveBeenCalledWith({
        where: {
          websiteId_fromSlug: {
            websiteId: 'site-cloud',
            fromSlug: 'leading-slash-slug',
          },
        },
        update: { toSlug: 'clean-destination-slug', statusCode: 301 },
        create: {
          websiteId: 'site-cloud',
          fromSlug: 'leading-slash-slug',
          toSlug: 'clean-destination-slug',
          statusCode: 301,
        },
      });
    });

    it('should NOT create a 301 redirect if the blog is still in Draft or Under Review', async () => {
      const draftBlog = {
        id: 'blog-103',
        websiteId: 'site-growth',
        status: 'Draft',
        translations: [
          { lang: 'en', slug: 'draft-original-slug', title: 'Draft Post', content: '<p>Draft</p>' },
        ],
      };

      mockPrisma.blog.findUnique.mockResolvedValue(draftBlog);

      const updateDto = {
        translations: [
          { lang: 'en', slug: 'draft-modified-slug', title: 'Draft Post', content: '<p>Draft</p>' },
        ],
      };

      await blogsService.update('blog-103', updateDto as any, testUser as any, '127.0.0.1');

      expect(mockPrisma.redirect.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.systemAuditLog.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ event: 'redirect.created' }),
      );
    });

    it('should NOT create a redirect if slug has not changed', async () => {
      const publishedBlog = {
        id: 'blog-104',
        websiteId: 'site-growth',
        status: 'Published',
        translations: [
          { lang: 'en', slug: 'same-slug', title: 'Same Post', content: '<p>Same</p>' },
        ],
      };

      mockPrisma.blog.findUnique.mockResolvedValue(publishedBlog);

      const updateDto = {
        translations: [
          { lang: 'en', slug: 'same-slug', title: 'Updated Title Only', content: '<p>Updated Content</p>' },
        ],
      };

      await blogsService.update('blog-104', updateDto as any, testUser as any, '127.0.0.1');

      expect(mockPrisma.redirect.upsert).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE 2: Public API v1 301 Redirection & Chain Resolution
  // ═══════════════════════════════════════════════════════════════════════════
  describe('PublicV1Service.getBlogBySlug - 301 Redirect Resolution Engine', () => {
    it('should return published blog directly if slug matches', async () => {
      const directBlog = {
        id: 'blog-200',
        websiteId: 'site-growth',
        status: 'Published',
        publishDate: new Date('2026-09-01'),
        authorName: 'Aarav Sharma',
        featuredImage: 'blogs/test.webp',
        categoryIds: [],
        tagIds: [],
        website: { domain: 'digifynext.com', name: 'DigifyNext' },
        translations: [{ lang: 'en', slug: 'live-slug', title: 'Live Article', content: '<p>Live</p>', excerpt: 'Excerpt' }],
      };

      mockPrisma.blogTranslation.findFirst.mockResolvedValueOnce({
        lang: 'en',
        slug: 'live-slug',
        title: 'Live Article',
        content: '<p>Live</p>',
        excerpt: 'Excerpt',
        blog: directBlog,
      });

      const result = await publicV1Service.getBlogBySlug('live-slug', 'site-growth', 'en') as any;

      expect(result.success).toBe(true);
      expect(result.redirect).toBeUndefined();
      expect(result.data.slug).toBe('live-slug');
      expect(result.data.title).toBe('Live Article');
    });

    it('should detect 301 redirect and return target blog with redirect metadata', async () => {
      // 1. Direct match fails
      mockPrisma.blogTranslation.findFirst.mockResolvedValueOnce(null); // en match
      mockPrisma.blogTranslation.findFirst.mockResolvedValueOnce(null); // any lang match

      // 2. Redirect rule found
      mockPrisma.redirect.findFirst.mockResolvedValueOnce({
        fromSlug: 'old-slug',
        toSlug: 'new-canonical-slug',
        statusCode: 301,
        websiteId: 'site-growth',
      });

      // 3. No further hops
      mockPrisma.redirect.findFirst.mockResolvedValueOnce(null);

      // 4. Target blog found
      const targetBlog = {
        id: 'blog-201',
        websiteId: 'site-growth',
        status: 'Published',
        publishDate: new Date('2026-09-01'),
        authorName: 'Aarav Sharma',
        featuredImage: 'blogs/target.webp',
        categoryIds: [],
        tagIds: [],
        website: { domain: 'digifynext.com', name: 'DigifyNext' },
        translations: [
          { lang: 'en', slug: 'new-canonical-slug', title: 'Target Article Title', content: '<p>Body</p>', excerpt: 'Deck' },
        ],
      };

      mockPrisma.blogTranslation.findFirst.mockResolvedValueOnce({
        lang: 'en',
        slug: 'new-canonical-slug',
        title: 'Target Article Title',
        content: '<p>Body</p>',
        excerpt: 'Deck',
        blog: targetBlog,
      });

      const result = await publicV1Service.getBlogBySlug('old-slug', 'site-growth', 'en') as any;

      expect(result.success).toBe(true);
      expect(result.redirect).toBeDefined();
      expect(result.redirect.statusCode).toBe(301);
      expect(result.redirect.fromSlug).toBe('old-slug');
      expect(result.redirect.toSlug).toBe('new-canonical-slug');
      expect(result.data.slug).toBe('new-canonical-slug');
      expect(result.data.title).toBe('Target Article Title');
    });

    it('should resolve multi-hop redirect chains (A → B → C) to final canonical slug', async () => {
      mockPrisma.blogTranslation.findFirst.mockResolvedValueOnce(null);
      mockPrisma.blogTranslation.findFirst.mockResolvedValueOnce(null);

      // Hop 1: slug-a -> slug-b
      mockPrisma.redirect.findFirst.mockResolvedValueOnce({
        fromSlug: 'slug-a',
        toSlug: 'slug-b',
        statusCode: 301,
      });

      // Hop 2: slug-b -> slug-c
      mockPrisma.redirect.findFirst.mockResolvedValueOnce({
        fromSlug: 'slug-b',
        toSlug: 'slug-c',
        statusCode: 301,
      });

      // Hop 3: slug-c has no further hops
      mockPrisma.redirect.findFirst.mockResolvedValueOnce(null);

      const targetBlog = {
        id: 'blog-202',
        websiteId: 'site-growth',
        status: 'Published',
        publishDate: new Date('2026-09-01'),
        authorName: 'Aarav Sharma',
        featuredImage: '',
        categoryIds: [],
        tagIds: [],
        website: { domain: 'digifynext.com', name: 'DigifyNext' },
        translations: [
          { lang: 'en', slug: 'slug-c', title: 'Final Article Destination', content: '<p>Final</p>' },
        ],
      };

      mockPrisma.blogTranslation.findFirst.mockResolvedValueOnce({
        lang: 'en',
        slug: 'slug-c',
        title: 'Final Article Destination',
        content: '<p>Final</p>',
        blog: targetBlog,
      });

      const result = await publicV1Service.getBlogBySlug('slug-a', 'site-growth', 'en') as any;

      expect(result.success).toBe(true);
      expect(result.redirect.fromSlug).toBe('slug-a');
      expect(result.redirect.toSlug).toBe('slug-c'); // Directly resolves to C!
      expect(result.data.slug).toBe('slug-c');
    });

    it('should throw NotFoundException if neither article nor redirect exists', async () => {
      mockPrisma.blogTranslation.findFirst.mockResolvedValue(null);
      mockPrisma.redirect.findFirst.mockResolvedValue(null);

      await expect(
        publicV1Service.getBlogBySlug('completely-nonexistent-slug', 'site-growth', 'en'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if redirect exists but target blog is unpublished or deleted', async () => {
      mockPrisma.blogTranslation.findFirst.mockResolvedValueOnce(null);
      mockPrisma.blogTranslation.findFirst.mockResolvedValueOnce(null);

      // Redirect exists
      mockPrisma.redirect.findFirst.mockResolvedValueOnce({
        fromSlug: 'orphaned-slug',
        toSlug: 'deleted-target-slug',
        statusCode: 301,
      });
      mockPrisma.redirect.findFirst.mockResolvedValueOnce(null);

      // Target translation not found (e.g. deleted or reverted to draft)
      mockPrisma.blogTranslation.findFirst.mockResolvedValueOnce(null);

      await expect(
        publicV1Service.getBlogBySlug('orphaned-slug', 'site-growth', 'en'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PIPELINE 3: RedirectsService Manual CRUD
  // ═══════════════════════════════════════════════════════════════════════════
  describe('RedirectsService - Manual Rules CRUD & Cache Management', () => {
    it('should create manual 301 redirect and invalidate Redis', async () => {
      mockPrisma.redirect.upsert.mockResolvedValue({
        id: 'red-999',
        websiteId: 'site-growth',
        fromSlug: 'legacy-page',
        toSlug: 'modern-page',
        statusCode: 301,
      });

      const result = await redirectsService.create(
        {
          websiteId: 'site-growth',
          fromSlug: '/legacy-page/',
          toSlug: '/modern-page/',
          statusCode: 301,
        },
        testUser,
        '127.0.0.1',
      );

      expect(mockPrisma.redirect.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            websiteId_fromSlug: {
              websiteId: 'site-growth',
              fromSlug: 'legacy-page',
            },
          },
        }),
      );

      expect(mockRedis.del).toHaveBeenCalledWith('redirects:site-growth');
      expect(mockRedis.delPattern).toHaveBeenCalledWith('blog:site-growth:legacy-page:*');
      expect(result.fromSlug).toBe('legacy-page');
    });

    it('should delete redirect rule and log in system audit', async () => {
      mockPrisma.redirect.findUnique.mockResolvedValue({
        id: 'red-999',
        websiteId: 'site-growth',
        fromSlug: 'legacy-page',
      });
      mockPrisma.redirect.delete.mockResolvedValue({});

      const result = await redirectsService.delete('red-999', testUser, '127.0.0.1');

      expect(mockPrisma.redirect.delete).toHaveBeenCalledWith({ where: { id: 'red-999' } });
      expect(mockPrisma.systemAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event: 'redirect.deleted',
          details: 'Deleted 301 redirect: /legacy-page',
        }),
      });
      expect(mockRedis.del).toHaveBeenCalledWith('redirects:site-growth');
      expect(result.success).toBe(true);
    });
  });
});
