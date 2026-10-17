/**
 * Phase 3: Real-Time Publish Trigger Hook & Recipient Resolution Hierarchy Tests
 *
 * Verifies:
 * 1. Owner email priority resolution hierarchy (ownerEmail -> notificationEmails -> Website Admins)
 * 2. In-app SystemNotification record creation for stakeholders
 * 3. Asynchronous non-blocking dispatch via EmailService
 * 4. Fault-tolerance: Email delivery failures never block HTTP status transitions
 */
import { BlogsService } from '../modules/blogs/blogs.service';

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
  blogTranslation: { upsert: jest.fn(), findFirst: jest.fn() },
  workflowLog: { create: jest.fn() },
  systemAuditLog: { create: jest.fn() },
  systemNotification: { create: jest.fn() },
  redirect: { upsert: jest.fn() },
  user: { findUnique: jest.fn() },
  website: { findUnique: jest.fn() },
  seoAuditLog: { create: jest.fn() },
  $transaction: jest.fn(async (fn: any) => fn(mockPrisma)),
  $executeRawUnsafe: jest.fn(),
};

const mockWebhook = { dispatchWebhook: jest.fn().mockResolvedValue(undefined) };
const mockRedis = { get: jest.fn(() => null), set: jest.fn(), del: jest.fn(), delPattern: jest.fn() };
const mockEmail = {
  sendWorkflowNotification: jest.fn().mockResolvedValue(true),
  sendWebsiteOwnerPublishNotification: jest.fn().mockResolvedValue(true),
};
const mockSupabase = {
  syncBlog: jest.fn().mockResolvedValue(undefined),
  deleteBlog: jest.fn().mockResolvedValue(undefined),
};

describe('Phase 3: Real-Time Publish Trigger Hook & Recipient Hierarchy', () => {
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

  const baseBlog = {
    id: 'blog-123',
    websiteId: 'site-abc',
    authorId: 'author-456',
    authorName: 'Viraj Srivastav',
    status: 'Published',
    publishDate: new Date('2026-10-14T10:00:00Z'),
    readTimeMinutes: 5,
    featuredImage: 'https://jupsoft.com/img/erp.png',
    translations: [
      {
        lang: 'en',
        slug: 'modern-school-erp-2026',
        title: 'Modern School ERP 2026',
        excerpt: 'Transforming education with AI automation.',
        content: '<p>Content</p>',
      },
    ],
    blogCategories: [
      {
        category: { id: 'cat-1', name: 'EdTech' },
      },
    ],
    author: {
      id: 'author-456',
      name: 'Viraj Srivastav',
      roleAssignments: [{ websiteId: 'site-abc', role: 'Lead Content Strategist', isGlobal: false }],
    },
  };

  it('Priority 1: Dispatches to website.ownerEmail when configured', async () => {
    mockPrisma.blog.findUnique.mockResolvedValue({
      ...baseBlog,
      website: {
        id: 'site-abc',
        name: 'Jupsoft Cloud',
        domain: 'jupsoft.com',
        logoUrl: 'https://jupsoft.com/logo.png',
        ownerName: 'Director Rajiv',
        ownerEmail: 'director@jupsoft.com',
        notificationEmails: [],
        userRoleAssignments: [
          {
            role: 'Website Admin',
            user: { id: 'admin-user-1', email: 'admin@jupsoft.com', name: 'Site Admin' },
          },
        ],
      },
    });

    const result = await service.dispatchPublishNotifications('blog-123', 'Publisher User');

    expect(result).toBe(true);
    expect(mockEmail.sendWebsiteOwnerPublishNotification).toHaveBeenCalledTimes(1);
    expect(mockEmail.sendWebsiteOwnerPublishNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: 'director@jupsoft.com',
        toName: 'Director Rajiv',
        websiteName: 'Jupsoft Cloud',
        websiteDomain: 'jupsoft.com',
        blogTitle: 'Modern School ERP 2026',
        blogSlug: 'modern-school-erp-2026',
        readTimeMinutes: 5,
        categoryName: 'EdTech',
      }),
    );

    // In-app notification created for Website Admin
    expect(mockPrisma.systemNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'admin-user-1',
          websiteId: 'site-abc',
          type: 'BLOG_PUBLISHED',
          title: 'Article Live: "Modern School ERP 2026"',
        }),
      }),
    );
  });

  it('Priority 2: Dispatches to ownerEmail AND secondary notificationEmails', async () => {
    mockPrisma.blog.findUnique.mockResolvedValue({
      ...baseBlog,
      website: {
        id: 'site-abc',
        name: 'DigifyNext',
        domain: 'digifynext.com',
        ownerName: 'VP Marketing',
        ownerEmail: 'vp@digifynext.com',
        notificationEmails: ['marketing-lead@digifynext.com', 'growth@digifynext.com'],
        userRoleAssignments: [],
      },
    });

    const result = await service.dispatchPublishNotifications('blog-123');

    expect(result).toBe(true);
    // 1 owner + 2 secondary notification emails = 3 emails dispatched
    expect(mockEmail.sendWebsiteOwnerPublishNotification).toHaveBeenCalledTimes(3);

    const dispatchedEmails = mockEmail.sendWebsiteOwnerPublishNotification.mock.calls.map(
      (call: any[]) => call[0].toEmail,
    );
    expect(dispatchedEmails).toContain('vp@digifynext.com');
    expect(dispatchedEmails).toContain('marketing-lead@digifynext.com');
    expect(dispatchedEmails).toContain('growth@digifynext.com');
  });

  it('Priority 3: Fallback to Website Admins when no ownerEmail or notificationEmails exist', async () => {
    mockPrisma.blog.findUnique.mockResolvedValue({
      ...baseBlog,
      website: {
        id: 'site-abc',
        name: 'Test Tenant',
        domain: 'tenant.com',
        ownerName: '',
        ownerEmail: '',
        notificationEmails: [],
        userRoleAssignments: [
          {
            role: 'Website Admin',
            user: { id: 'admin-1', email: 'fallback-admin@tenant.com', name: 'Tenant Admin' },
          },
        ],
      },
    });

    const result = await service.dispatchPublishNotifications('blog-123');

    expect(result).toBe(true);
    expect(mockEmail.sendWebsiteOwnerPublishNotification).toHaveBeenCalledTimes(1);
    expect(mockEmail.sendWebsiteOwnerPublishNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: 'fallback-admin@tenant.com',
        toName: 'Tenant Admin',
      }),
    );
  });

  it('Non-blocking: Never throws even if EmailService or Prisma fails', async () => {
    mockPrisma.blog.findUnique.mockResolvedValue({
      ...baseBlog,
      website: {
        id: 'site-abc',
        name: 'DigifyNext',
        domain: 'digifynext.com',
        ownerEmail: 'owner@fail.com',
      },
    });
    mockEmail.sendWebsiteOwnerPublishNotification.mockRejectedValue(new Error('SES Timeout 504'));
    mockPrisma.systemNotification.create.mockRejectedValue(new Error('DB connection pool full'));

    // Must return safely without throwing
    const result = await service.dispatchPublishNotifications('blog-123');
    expect(result).toBe(true);
  });
});
