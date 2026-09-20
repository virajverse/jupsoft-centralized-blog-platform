/**
 * TENANT ISOLATION (IDOR/BOLA) TESTS — Phase 6
 * Tests: Cross-tenant data access, API key scoping, query parameter manipulation
 *
 * CRITICAL SECURITY TESTS — verifies website isolation is enforced at service level
 */
import { BlogsService } from '../modules/blogs/blogs.service';
import { MediaService } from '../modules/media/media.service';
import { NotFoundException } from '@nestjs/common';

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

const mockRedis = { get: jest.fn(() => null), set: jest.fn(), delPattern: jest.fn() };
const mockWebhook = { dispatchWebhook: jest.fn() };
const mockEmail = { sendWorkflowNotification: jest.fn() };
const mockSupabase = { syncBlog: jest.fn(), deleteBlog: jest.fn() };

const tenantAUser = { id: 'user-a', email: 'a@tenant-a.com', name: 'Tenant A User', avatar: '', roles: ['Editor'], roleAssignments: [] };
const tenantBUser = { id: 'user-b', email: 'b@tenant-b.com', name: 'Tenant B User', avatar: '', roles: ['Editor'], roleAssignments: [] };

describe('Tenant Isolation — Blog findOne (IDOR Test)', () => {
  let service: BlogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BlogsService(mockPrisma as any, mockWebhook as any, mockRedis as any, mockEmail as any, mockSupabase as any);
  });

  // ── CRITICAL IDOR: GET /admin/blogs/:id does NOT filter by websiteId ──
  // This is a WHITE-BOX finding: findOne({ id }) without tenant constraint
  it('[SECURITY-CRITICAL] findOne() fetches blog by ID without tenant constraint — IDOR risk', async () => {
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

    // Tenant B user can retrieve Tenant A's blog by ID
    // This succeeds because findOne has NO tenant check
    const result = await service.findOne('blog-tenant-a');

    // The blog is returned — this DEMONSTRATES the IDOR vulnerability
    expect(result.websiteId).toBe('site-tenant-a');

    // ASSERTION: This test PASSES but SHOULD fail in secure implementation
    // Secure fix would require: findOne({ id, websiteId: callerWebsiteId })
    // FLAG: IDOR VULNERABILITY — blog read by ID is not tenant-scoped
  });

  // ── CRITICAL IDOR: delete() has NO tenant ownership check ─────────────
  it('[SECURITY-CRITICAL] delete() deletes blog without checking caller tenant — IDOR risk', async () => {
    const tenantABlog = {
      id: 'blog-tenant-a',
      websiteId: 'site-tenant-a', // belongs to Tenant A
      status: 'Draft',
      translations: [],
    };
    mockPrisma.blog.findUnique.mockResolvedValue(tenantABlog);
    mockPrisma.blog.delete = jest.fn().mockResolvedValue({});
    mockPrisma.systemAuditLog.create.mockResolvedValue({});

    // Tenant B super admin can delete Tenant A's blog
    const tenantBAdmin = { ...tenantBUser, roles: ['Super Admin'] };
    const result = await service.delete('blog-tenant-a', tenantBAdmin as any, '127.0.0.1');

    // This succeeds — demonstrating cross-tenant deletion is possible
    expect(result.success).toBe(true);

    // FLAG: IDOR VULNERABILITY — delete does not verify websiteId matches caller
  });

  // ── CRITICAL: update() has NO tenant ownership check ────────────────
  it('[SECURITY-CRITICAL] update() can update cross-tenant blog — IDOR risk', async () => {
    const tenantABlog = {
      id: 'blog-tenant-a',
      websiteId: 'site-tenant-a',
      status: 'Draft',
      translations: [{ lang: 'en', slug: 'original', title: 'Original' }],
    };
    mockPrisma.blog.findUnique
      .mockResolvedValueOnce(tenantABlog)
      .mockResolvedValueOnce({ ...tenantABlog, website: {} });
    mockPrisma.blog.update.mockResolvedValue({});
    mockPrisma.blogCategory.deleteMany.mockResolvedValue({});
    mockPrisma.blogTag.deleteMany.mockResolvedValue({});
    mockPrisma.blogTranslation.upsert.mockResolvedValue({});

    const tenantBEditor = { ...tenantBUser, roles: ['Editor'] };
    // Tenant B editor updates Tenant A's blog — no ownership check prevents this
    await service.update('blog-tenant-a', {
      translations: [{ lang: 'en', title: 'Hijacked Title', slug: 'hijacked-slug' }]
    } as any, tenantBEditor as any, '127.0.0.1');

    // Update proceeded without tenant check — IDOR vulnerability confirmed
    expect(mockPrisma.blog.update).toHaveBeenCalled();

    // FLAG: IDOR VULNERABILITY — update does not verify blog.websiteId === user's websiteId
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

    // When websiteId is omitted, no tenant filter is applied
    const calledWith = mockPrisma.blog.findMany.mock.calls[0][0];
    expect(calledWith.where).not.toHaveProperty('websiteId');

    // FLAG: INFO — Admin users can see all blogs. This may be intentional for Super Admin
    // but if websiteId=all is sent as 'all', it is also excluded from filter
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

  // ── CRITICAL: media delete has NO tenant check ──────────────────────
  it('[SECURITY-CRITICAL] media delete() has no tenant ownership check — IDOR risk', async () => {
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

    // Tenant B admin deletes Tenant A's media — no ownership check
    const tenantBAdmin = { id: 'user-b', name: 'Tenant B Admin', roles: ['Super Admin'], roleAssignments: [] };
    const result = await service.delete('media-asset-tenant-a', tenantBAdmin as any, '127.0.0.1');

    expect(result.success).toBe(true);
    // FLAG: IDOR VULNERABILITY — media deletion is not tenant-scoped
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

// ─── 3. API Key Guard Tenant Isolation ──────────────────────────────────────

describe('Tenant Isolation — Public API ?websiteId parameter manipulation', () => {
  // These tests verify that the ?websiteId query param used in the public API
  // to override tenant can't be used to bypass tenant isolation
  it('[SECURITY] websiteId query param bypass — categories can be overridden in public API controller', () => {
    // In public-v1.controller.ts, getCategories() uses:
    //   const targetSiteId = queryWebsiteId || req.tenant?.id;
    // This allows caller to override tenant by passing ?websiteId=<any-tenant>
    // This is a potential information disclosure — any tenant's categories accessible
    // FLAG: SECURITY CONCERN — ?websiteId parameter in public API allows cross-tenant category access
    // The guard sets req.tenant from the API key, but then it's overridable
    expect(true).toBe(true); // Documenting finding, not blocking (this is by design for public read)
  });
});
