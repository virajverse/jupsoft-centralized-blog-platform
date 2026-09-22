/**
 * TENANT ISOLATION (IDOR/BOLA) TESTS — Phase 6
 * Tests: Cross-tenant data access, API key scoping, query parameter manipulation
 *
 * CRITICAL SECURITY TESTS — verifies website isolation is enforced at service level
 */
import { BlogsService } from '../modules/blogs/blogs.service';
import { MediaService } from '../modules/media/media.service';
import { ForbiddenException } from '@nestjs/common';

// ─── 1. BlogsService Tenant Isolation ──────────────────────────────────────

const mockPrisma = {
  blog: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  blogCategory: { createMany: jest.fn(), deleteMany: jest.fn() },
  blogTag: { createMany: jest.fn(), deleteMany: jest.fn() },
  blogTranslation: { upsert: jest.fn() },
  workflowLog: { create: jest.fn() },
  systemAuditLog: { create: jest.fn() },
  redirect: { upsert: jest.fn() },
  user: { findUnique: jest.fn() },
  website: { findUnique: jest.fn() },
  mediaAsset: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  $transaction: jest.fn(async (fn: any) => fn(mockPrisma)),
  $executeRawUnsafe: jest.fn(),
};

const mockRedis = {
  get: jest.fn(() => null),
  set: jest.fn(),
  del: jest.fn(),
  delPattern: jest.fn(),
  nsKey: jest.fn(async (ns: string, suffix: string) => `${ns}:g0:${suffix}`),
  invalidateNamespace: jest.fn(),
  acquireLock: jest.fn().mockResolvedValue(true),
};
const mockWebhook = { dispatchWebhook: jest.fn().mockResolvedValue(undefined) };
const mockEmail = { sendWorkflowNotification: jest.fn() };
const mockSupabase = {
  syncBlog: jest.fn().mockResolvedValue(undefined),
  deleteBlog: jest.fn().mockResolvedValue(undefined),
};

const tenantAUser = {
  id: 'user-a',
  email: 'a@tenant-a.com',
  name: 'Tenant A User',
  avatar: '',
  roles: ['Editor'],
  roleAssignments: [{ role: 'Editor', websiteId: 'site-tenant-a', isGlobal: false }],
};
const tenantBUser = {
  id: 'user-b',
  email: 'b@tenant-b.com',
  name: 'Tenant B User',
  avatar: '',
  roles: ['Editor'],
  roleAssignments: [{ role: 'Editor', websiteId: 'site-tenant-b', isGlobal: false }],
};

describe('Tenant Isolation — Blog findOne (IDOR Test)', () => {
  let service: BlogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BlogsService(mockPrisma as any, mockWebhook as any, mockRedis as any, mockEmail as any, mockSupabase as any);
  });

  // ── BUG-001 (IDOR Fix): GET /admin/blogs/:id filters by caller's websiteId ──
  it('[SECURITY] findOne() prevents cross-tenant blog access for scoped users', async () => {
    // Blog belongs to Tenant A
    const tenantABlog = {
      id: 'blog-tenant-a',
      websiteId: 'site-tenant-a',
      status: 'Published',
      website: { id: 'site-tenant-a', name: 'Tenant A' },
      translations: [{ lang: 'en', slug: 'tenant-a-post', title: 'Tenant A Secret Post' }],
      workflowLogs: [],
      authorId: 'user-a',
      authorName: 'Author A',
      authorAvatar: '',
      featuredImage: '',
      featuredImageAlt: '',
      publishDate: null,
      scheduledAt: null,
      publishedBy: null,
      viewCount: 0,
      readTimeMinutes: 3,
      categoryIds: [],
      tagIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockPrisma.blog.findUnique.mockResolvedValue(tenantABlog);

    // Tenant B user CANNOT retrieve Tenant A's blog
    await expect(service.findOne('blog-tenant-a', tenantBUser as any))
      .rejects.toThrow(ForbiddenException);

    // Tenant A user CAN retrieve Tenant A's blog
    const result = await service.findOne('blog-tenant-a', tenantAUser as any);
    expect(result.websiteId).toBe('site-tenant-a');
  });

  // ── BUG-003 (IDOR Fix): delete() enforces tenant ownership ─────────────
  it('[SECURITY] delete() blocks cross-tenant blog deletion for scoped users', async () => {
    const tenantABlog = {
      id: 'blog-tenant-a',
      websiteId: 'site-tenant-a', // belongs to Tenant A
      status: 'Draft',
      translations: [],
    };
    mockPrisma.blog.findUnique.mockResolvedValue(tenantABlog);
    mockPrisma.blog.delete = jest.fn().mockResolvedValue({});
    mockPrisma.systemAuditLog.create.mockResolvedValue({});

    // Tenant B user cannot delete Tenant A's blog
    await expect(service.delete('blog-tenant-a', tenantBUser as any, '127.0.0.1'))
      .rejects.toThrow(ForbiddenException);

    // Tenant A admin CAN delete Tenant A's blog
    const tenantAAdmin = {
      ...tenantAUser,
      roles: ['Super Admin'],
      roleAssignments: [{ role: 'Super Admin', websiteId: null, isGlobal: true }],
    };
    const result = await service.delete('blog-tenant-a', tenantAAdmin as any, '127.0.0.1');
    expect(result.success).toBe(true);
  });

  // ── BUG-002 (IDOR Fix): update() enforces tenant ownership ────────────────
  it('[SECURITY] update() blocks cross-tenant blog modification', async () => {
    const tenantABlog = {
      id: 'blog-tenant-a',
      websiteId: 'site-tenant-a',
      status: 'Draft',
      translations: [{ lang: 'en', slug: 'original', title: 'Original' }],
    };
    mockPrisma.blog.findUnique.mockResolvedValue(tenantABlog);

    // Tenant B editor cannot update Tenant A's blog
    await expect(service.update('blog-tenant-a', {
      translations: [{ lang: 'en', title: 'Hijacked Title', slug: 'hijacked-slug' }]
    } as any, tenantBUser as any, '127.0.0.1')).rejects.toThrow(ForbiddenException);
  });

  // ── findAll() with explicit websiteId filter ───────────────────────
  it('findAll() correctly filters by websiteId when provided', async () => {
    mockPrisma.blog.count.mockResolvedValue(1);
    mockPrisma.blog.findMany.mockResolvedValue([]);

    await service.findAll({ websiteId: 'site-tenant-a', page: 1, limit: 10 });

    expect(mockPrisma.blog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ websiteId: 'site-tenant-a' })
      })
    );
  });

  // ── findAll() WITHOUT websiteId filter returns all tenants' blogs ─────
  it('[SECURITY] findAll() without websiteId returns data from ALL tenants', async () => {
    mockPrisma.blog.count.mockResolvedValue(100);
    mockPrisma.blog.findMany.mockResolvedValue([]);

    await service.findAll({ page: 1, limit: 10 });

    // When websiteId is omitted and no caller provided, no tenant filter is applied (global view)
    const calledWith = mockPrisma.blog.findMany.mock.calls[0][0];
    expect(calledWith.where).not.toHaveProperty('websiteId');
  });

  // ── Scoped user findAll() blocks accessing another tenant's blogs ─────
  it('[SECURITY] findAll() blocks scoped user from querying another website', async () => {
    // tenantAUser only has access to site-tenant-a
    await expect(
      service.findAll({ websiteId: 'site-tenant-b', page: 1, limit: 10 }, tenantAUser as any),
    ).rejects.toThrow(ForbiddenException);
  });

  // ── Scoped user findAll() with websiteId='all' or omitted restricts to their website ─────
  it('[SECURITY] findAll() restricts scoped user to their assigned website(s)', async () => {
    mockPrisma.blog.count.mockResolvedValue(5);
    mockPrisma.blog.findMany.mockResolvedValue([]);

    await service.findAll({ websiteId: 'all', page: 1, limit: 10 }, tenantAUser as any);

    const calledWith = mockPrisma.blog.findMany.mock.calls[0][0];
    expect(calledWith.where.websiteId).toEqual({ in: ['site-tenant-a'] });
  });

  // ── Scoped user create() blocks creating blogs for another website ─────
  it('[SECURITY] create() blocks scoped user from creating blogs for another website', async () => {
    const dto = {
      websiteId: 'site-tenant-b', // tenantAUser only has site-tenant-a
      status: 'Draft' as const,
      translations: [{ lang: 'en', title: 'Malicious Post', slug: 'malicious-post', content: 'hello' }],
    };

    await expect(
      service.create(dto as any, tenantAUser as any, '127.0.0.1'),
    ).rejects.toThrow(ForbiddenException);
  });
});

// ─── 2. Media Tenant Isolation ──────────────────────────────────────────────

describe('Tenant Isolation — Media Service', () => {
  let service: MediaService;
  const mockConfigService = { get: jest.fn((k: string) => {
    const map: Record<string, string> = {
      AWS_REGION: 'ap-south-1',
      AWS_ACCESS_KEY_ID: 'mock_key',
      AWS_SECRET_ACCESS_KEY: 'mock_secret',
      AWS_S3_BUCKET: 'test-bucket',
      CLOUDFRONT_DOMAIN: 'https://cdn.jupsoft.com',
      NODE_ENV: 'test',
      PLATFORM_BASE_URL: 'http://localhost:4000',
    };
    return map[k];
  })};

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MediaService(mockPrisma as any, mockConfigService as any, mockRedis as any);
  });

  // ── BUG-006 (IDOR Fix): media delete() verifies tenant ownership ──────────────────────
  it('[SECURITY] media delete() blocks cross-tenant deletion for scoped users', async () => {
    // Asset belongs to Tenant A
    const tenantAAsset = {
      id: 'media-asset-tenant-a',
      websiteId: 'site-tenant-a',
      fileName: 'secret-image.webp',
      s3Key: 'blogs/tenant-a/2026/09/secret.webp',
    };
    mockPrisma.mediaAsset.findUnique.mockResolvedValue(tenantAAsset);
    mockPrisma.mediaAsset.update.mockResolvedValue({});
    mockPrisma.systemAuditLog.create.mockResolvedValue({});

    // Tenant B user cannot delete Tenant A's media
    await expect(service.delete('media-asset-tenant-a', tenantBUser as any, '127.0.0.1'))
      .rejects.toThrow(ForbiddenException);

    // Global Super Admin CAN delete
    const globalAdmin = {
      id: 'admin-1',
      name: 'Super Admin',
      roles: ['Super Admin'],
      roleAssignments: [{ role: 'Super Admin', websiteId: null, isGlobal: true }],
    };
    const result = await service.delete('media-asset-tenant-a', globalAdmin as any, '127.0.0.1');
    expect(result.success).toBe(true);
  });

  // ── Media findAll() with websiteId filter ──────────────────────────
  it('media findAll() correctly filters by websiteId', async () => {
    mockPrisma.mediaAsset.count.mockResolvedValue(5);
    mockPrisma.mediaAsset.findMany.mockResolvedValue([]);

    await service.findAll('site-tenant-a', 1, 10);

    expect(mockPrisma.mediaAsset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ websiteId: 'site-tenant-a' })
      })
    );
  });
});

// ─── 3. Public API Controller Tenant Isolation ──────────────────────────────

describe('Tenant Isolation — Public API ?websiteId parameter manipulation', () => {
  it('[SECURITY] getCategories throws ForbiddenException when queryWebsiteId does not match authenticated tenant', async () => {
    const { PublicV1Controller } = await import('../modules/public-v1/public-v1.controller');
    const mockPublicService = {
      getCategories: jest.fn().mockResolvedValue({ success: true, data: [] }),
      getTags: jest.fn().mockResolvedValue({ success: true, data: [] }),
    };
    const controller = new PublicV1Controller(mockPublicService as any);

    const req = { tenant: { id: 'site-tenant-a', name: 'Site A' } };

    // Same tenant passes
    await expect(controller.getCategories(req, 'site-tenant-a')).resolves.toBeDefined();

    // Mismatched tenant is blocked
    await expect(controller.getCategories(req, 'site-tenant-b')).rejects.toThrow(ForbiddenException);
  });

  it('[SECURITY] getTags throws ForbiddenException when queryWebsiteId does not match authenticated tenant', async () => {
    const { PublicV1Controller } = await import('../modules/public-v1/public-v1.controller');
    const mockPublicService = {
      getCategories: jest.fn().mockResolvedValue({ success: true, data: [] }),
      getTags: jest.fn().mockResolvedValue({ success: true, data: [] }),
    };
    const controller = new PublicV1Controller(mockPublicService as any);

    const req = { tenant: { id: 'site-tenant-a', name: 'Site A' } };

    // Same tenant passes
    await expect(controller.getTags(req, 'site-tenant-a')).resolves.toBeDefined();

    // Mismatched tenant is blocked
    await expect(controller.getTags(req, 'site-tenant-b')).rejects.toThrow(ForbiddenException);
  });
});
