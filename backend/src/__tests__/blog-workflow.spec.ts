/**
 * BLOG WORKFLOW TESTS — Phase 7
 * Tests: Status transitions, RBAC enforcement, tenant isolation, audit trail
 */
import { BlogsService } from '../modules/blogs/blogs.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

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
  seoAuditLog: { create: jest.fn() },
  $transaction: jest.fn(async (fn: any) => fn(mockPrisma)),
  $executeRawUnsafe: jest.fn(),
};

const mockWebhook = { dispatchWebhook: jest.fn().mockResolvedValue(undefined) };
const mockRedis = {
  get: jest.fn(() => null),
  set: jest.fn(),
  del: jest.fn(),
  delPattern: jest.fn(),
  nsKey: jest.fn(async (ns: string, suffix: string) => `${ns}:g0:${suffix}`),
  invalidateNamespace: jest.fn(),
  acquireLock: jest.fn().mockResolvedValue(true),
};
const mockEmail = { sendWorkflowNotification: jest.fn() };
const mockSupabase = {
  syncBlog: jest.fn().mockResolvedValue(undefined),
  deleteBlog: jest.fn().mockResolvedValue(undefined),
};

const makeUser = (roles: string[], websiteId: string = 'site-1', name?: string) => ({
  id: 'author-uuid',
  email: 'writer@test.com',
  name: name || roles[0] || 'Test Writer',
  avatar: '',
  roles,
  roleAssignments: roles.map((r) => ({
    role: r,
    websiteId: r === 'Super Admin' ? null : websiteId,
    isGlobal: r === 'Super Admin',
  })),
});

const makeBlog = (status: string, websiteId = 'site-1') => ({
  id: 'blog-uuid-1',
  websiteId,
  authorId: 'author-uuid',
  authorName: 'Test Writer',
  status,
  translations: [{ lang: 'en', slug: 'test-blog-slug', title: 'Test Blog', content: '<p>Content</p>' }],
  publishDate: status === 'Published' ? new Date() : null,
  publishedBy: status === 'Published' ? 'Test Writer' : null,
  scheduledAt: null,
});

describe('BlogsService - Workflow Transitions', () => {
  let service: BlogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BlogsService(
      mockPrisma as any,
      mockWebhook as any,
      mockRedis as any,
      mockEmail as any,
      mockSupabase as any,
    );
  });

  // ── 7.1: Valid transition: Draft → Under Review ────────────────────────
  it('should allow Content Writer to submit draft for review', async () => {
    const blog = makeBlog('Draft');
    mockPrisma.blog.findUnique.mockResolvedValue(blog);
    mockPrisma.blog.update.mockResolvedValue({ ...blog, status: 'Under Review' });
    mockPrisma.workflowLog.create.mockResolvedValue({});
    mockPrisma.systemAuditLog.create.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'a@b.com', name: 'Author' });
    mockPrisma.website.findUnique.mockResolvedValue({ domain: 'test.com' });

    // findOne call
    mockPrisma.blog.findUnique
      .mockResolvedValueOnce(blog)
      .mockResolvedValueOnce({ ...blog, status: 'Under Review', website: {} });

    const writer = makeUser(['Content Writer']);
    await expect(service.transitionStatus('blog-uuid-1', { status: 'Under Review' }, writer, '127.0.0.1'))
      .resolves.toBeDefined();
  });

  // ── 7.2: Content Writer CANNOT directly publish ─────────────────────────
  it('should forbid Content Writer from directly publishing', async () => {
    const blog = makeBlog('Approved');
    mockPrisma.blog.findUnique.mockResolvedValue(blog);

    const writer = makeUser(['Content Writer']);
    await expect(service.transitionStatus('blog-uuid-1', { status: 'Published' }, writer, '127.0.0.1'))
      .rejects.toThrow(ForbiddenException);
  });

  // ── 7.3: Publisher CAN publish ──────────────────────────────────────────
  it('should allow Publisher to publish an approved blog', async () => {
    const blog = makeBlog('Approved');
    mockPrisma.blog.findUnique
      .mockResolvedValueOnce(blog)
      .mockResolvedValueOnce({ ...blog, status: 'Published', website: {} });
    mockPrisma.blog.update.mockResolvedValue({});
    mockPrisma.workflowLog.create.mockResolvedValue({});
    mockPrisma.systemAuditLog.create.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'a@b.com', name: 'Publisher' });
    mockPrisma.website.findUnique.mockResolvedValue({ domain: 'test.com' });

    const publisher = makeUser(['Publisher']);
    await expect(service.transitionStatus('blog-uuid-1', { status: 'Published' }, publisher, '127.0.0.1'))
      .resolves.toBeDefined();
  });

  // ── 7.4: Non-existent blog → NotFoundException ────────────────────────
  it('should throw NotFoundException when blog does not exist', async () => {
    mockPrisma.blog.findUnique.mockResolvedValue(null);

    const admin = makeUser(['Super Admin']);
    await expect(service.transitionStatus('non-existent', { status: 'Published' }, admin, '127.0.0.1'))
      .rejects.toThrow(NotFoundException);
  });

  // ── 7.5: Workflow log is created on transition ─────────────────────────
  it('should create a workflow log entry on status transition', async () => {
    const blog = makeBlog('Draft');
    mockPrisma.blog.findUnique
      .mockResolvedValueOnce(blog)
      .mockResolvedValueOnce({ ...blog, status: 'Under Review', website: {} });
    mockPrisma.blog.update.mockResolvedValue({});
    mockPrisma.workflowLog.create.mockResolvedValue({});
    mockPrisma.systemAuditLog.create.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'a@b.com', name: 'Editor' });
    mockPrisma.website.findUnique.mockResolvedValue({ domain: 'test.com' });

    const editor = makeUser(['Editor']);
    await service.transitionStatus('blog-uuid-1', { status: 'Under Review', notes: 'Submitted for review' }, editor, '127.0.0.1');

    expect(mockPrisma.workflowLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fromStatus: 'Draft',
          toStatus: 'Under Review',
        })
      })
    );
  });

  // ── 7.6: SEO Manager cannot publish ────────────────────────────────────
  it('should deny SEO Manager from publishing', async () => {
    const blog = makeBlog('Approved');
    mockPrisma.blog.findUnique.mockResolvedValue(blog);

    const seoManager = makeUser(['SEO Manager']);
    await expect(service.transitionStatus('blog-uuid-1', { status: 'Published' }, seoManager, '127.0.0.1'))
      .rejects.toThrow(ForbiddenException);
  });

  // ── 7.7: publishDate is set on first publish ────────────────────────────
  it('should set publishDate when transitioning to Published for first time', async () => {
    const blog = makeBlog('Approved');
    blog.publishDate = null;
    mockPrisma.blog.findUnique
      .mockResolvedValueOnce(blog)
      .mockResolvedValueOnce({ ...blog, status: 'Published', publishDate: new Date(), website: {} });
    mockPrisma.blog.update.mockResolvedValue({});
    mockPrisma.workflowLog.create.mockResolvedValue({});
    mockPrisma.systemAuditLog.create.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'p@b.com', name: 'Publisher' });
    mockPrisma.website.findUnique.mockResolvedValue({ domain: 'test.com' });

    const publisher = makeUser(['Publisher']);
    await service.transitionStatus('blog-uuid-1', { status: 'Published' }, publisher, '127.0.0.1');

    expect(mockPrisma.blog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          publishDate: expect.any(Date),
          publishedBy: 'Publisher',
        })
      })
    );
  });

  // ── 7.8: Webhook dispatched on publish ─────────────────────────────────
  it('should dispatch webhook when blog is published', async () => {
    const blog = makeBlog('Approved');
    blog.publishDate = null;
    mockPrisma.blog.findUnique
      .mockResolvedValueOnce(blog)
      .mockResolvedValueOnce({ ...blog, status: 'Published', website: {} });
    mockPrisma.blog.update.mockResolvedValue({});
    mockPrisma.workflowLog.create.mockResolvedValue({});
    mockPrisma.systemAuditLog.create.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'p@b.com', name: 'Publisher' });
    mockPrisma.website.findUnique.mockResolvedValue({ domain: 'test.com' });

    const publisher = makeUser(['Publisher']);
    await service.transitionStatus('blog-uuid-1', { status: 'Published' }, publisher, '127.0.0.1');

    expect(mockWebhook.dispatchWebhook).toHaveBeenCalledWith(
      'site-1',
      'blog.published',
      'test-blog-slug'
    );
  });

  // ── 7.9: Cache invalidated on publish ──────────────────────────────────
  it('should invalidate cache when blog is published', async () => {
    const blog = makeBlog('Approved');
    mockPrisma.blog.findUnique
      .mockResolvedValueOnce(blog)
      .mockResolvedValueOnce({ ...blog, status: 'Published', website: {} });
    mockPrisma.blog.update.mockResolvedValue({});
    mockPrisma.workflowLog.create.mockResolvedValue({});
    mockPrisma.systemAuditLog.create.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'p@b.com', name: 'Publisher' });
    mockPrisma.website.findUnique.mockResolvedValue({ domain: 'test.com' });

    const publisher = makeUser(['Publisher']);
    await service.transitionStatus('blog-uuid-1', { status: 'Published' }, publisher, '127.0.0.1');

    expect(mockRedis.invalidateNamespace).toHaveBeenCalledWith('blog');
  });
});

describe('BlogsService - CRUD', () => {
  let service: BlogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BlogsService(
      mockPrisma as any,
      mockWebhook as any,
      mockRedis as any,
      mockEmail as any,
      mockSupabase as any,
    );
  });

  // ── 7.10: Create blog with audit trail ─────────────────────────────────
  it('should create a blog and record audit log', async () => {
    const createdBlog = makeBlog('Draft');
    mockPrisma.blog.create = jest.fn().mockResolvedValue(createdBlog);
    mockPrisma.blogCategory.createMany.mockResolvedValue({});
    mockPrisma.blogTag.createMany.mockResolvedValue({});
    mockPrisma.workflowLog.create.mockResolvedValue({});
    mockPrisma.systemAuditLog.create.mockResolvedValue({});
    mockPrisma.blog.findUnique.mockResolvedValue({ ...createdBlog, website: {}, translations: [] });

    const user = makeUser(['Content Writer']);
    const dto = {
      websiteId: 'site-1',
      translations: [{ lang: 'en', title: 'Test Blog', slug: 'test-blog-slug' }],
      categoryIds: [],
      tagIds: [],
    };

    await service.create(dto as any, user, '127.0.0.1');
    expect(mockPrisma.systemAuditLog.create).toHaveBeenCalled();
  });

  // ── 7.11: Delete blog — only Super Admin ────────────────────────────────
  it('should delete a blog and fire revalidation if published', async () => {
    const blog = makeBlog('Published');
    mockPrisma.blog.findUnique.mockResolvedValue(blog);
    mockPrisma.blog.delete = jest.fn().mockResolvedValue({});
    mockPrisma.systemAuditLog.create.mockResolvedValue({});

    const admin = makeUser(['Super Admin']);
    const result = await service.delete('blog-uuid-1', admin, '127.0.0.1');

    expect(result.success).toBe(true);
    expect(mockWebhook.dispatchWebhook).toHaveBeenCalled();
  });

  // ── 7.12: Update blog - 301 redirect created when published slug changes
  it('should create a 301 redirect when published blog slug changes', async () => {
    const existing = {
      ...makeBlog('Published'),
      translations: [{ lang: 'en', slug: 'old-slug', title: 'Old Title', content: '' }],
    };
    mockPrisma.blog.findUnique
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce({ ...existing, status: 'Published', website: {} });
    mockPrisma.blog.update.mockResolvedValue({});
    mockPrisma.blogCategory.deleteMany.mockResolvedValue({});
    mockPrisma.blogTag.deleteMany.mockResolvedValue({});
    mockPrisma.blogCategory.createMany.mockResolvedValue({});
    mockPrisma.blogTag.createMany.mockResolvedValue({});
    mockPrisma.blogTranslation.upsert.mockResolvedValue({});
    mockPrisma.workflowLog.create.mockResolvedValue({});
    mockPrisma.systemAuditLog.create.mockResolvedValue({});
    mockPrisma.redirect.upsert.mockResolvedValue({});

    const editor = makeUser(['Editor']);
    const dto = {
      translations: [{ lang: 'en', title: 'New Title', slug: 'new-slug', content: '<p>Content</p>' }],
    };

    await service.update('blog-uuid-1', dto as any, editor, '127.0.0.1');

    expect(mockPrisma.redirect.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          fromSlug: 'old-slug',
          toSlug: 'new-slug',
          statusCode: 301,
        })
      })
    );
  });
});
