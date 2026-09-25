/**
 * SEO AUDIT TESTS — Phase 8
 * Tests: SEO scoring engine, boundary values, invalid inputs
 */
import { BlogsService } from '../modules/blogs/blogs.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  blog: { findUnique: jest.fn() },
  blogCategory: {},
  blogTag: {},
  blogTranslation: {},
  workflowLog: {},
  systemAuditLog: { create: jest.fn() },
  seoAuditLog: { create: jest.fn() },
  $transaction: jest.fn(async (fn: any) => fn(mockPrisma)),
  $executeRawUnsafe: jest.fn(),
};
const mockRedis = { get: jest.fn(() => null), set: jest.fn(), delPattern: jest.fn() };
const mockWebhook = { dispatchWebhook: jest.fn() };
const mockEmail = { sendWorkflowNotification: jest.fn() };
const mockSupabase = { syncBlog: jest.fn() };

const makeSeoTranslation = (overrides: any = {}) => ({
  lang: 'en',
  title: 'A Perfect SEO Title That Is Fifty Three Chars Long Now', // 53 chars
  slug: 'perfect-seo-title',
  excerpt: 'A'.repeat(150), // 150 chars — optimal
  content: '<h2>Section</h2><p>Content with perfect-seo-title and keyword here.</p>',
  seo: {
    metaTitle: 'A Perfect SEO Title That Is Fifty Three Chars Long Now',
    metaDescription: 'A'.repeat(150),
    focusKeyword: 'perfect-seo-title',
    canonicalUrl: 'https://test.com/blog/perfect-seo-title',
    robots: 'index, follow',
    ...overrides.seo,
  },
  ...overrides,
});

const makeBlogForSeo = (translationOverrides: any = {}, blogOverrides: any = {}) => ({
  id: 'blog-seo-1',
  websiteId: 'site-1',
  featuredImage: 'https://cdn.test.com/img.webp',
  featuredImageAlt: 'Alt text for image',
  translations: {
    en: makeSeoTranslation(translationOverrides),
  },
  ...blogOverrides,
});

describe('BlogsService - SEO Audit Engine', () => {
  let service: BlogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BlogsService(mockPrisma as any, mockWebhook as any, mockRedis as any, mockEmail as any, mockSupabase as any);
  });

  // ── 8.1: Full score for perfectly optimized blog ───────────────────────
  it('should give high score for fully optimized blog', async () => {
    const blog = makeBlogForSeo();
    mockPrisma.blog.findUnique.mockResolvedValue({ ...blog, website: {}, translations: [], workflowLogs: [] });
    // Patch findOne to return formatted object
    jest.spyOn(service, 'findOne').mockResolvedValue(blog as any);
    mockPrisma.seoAuditLog.create.mockResolvedValue({});

    const result = await service.auditAndLogSeo('blog-seo-1', 'en');
    expect(result.score).toBeGreaterThanOrEqual(70); // Well-optimized content
    expect(result.checks.find((c: any) => c.id === 'title-length')?.status).toBe('pass');
    expect(result.checks.find((c: any) => c.id === 'desc-length')?.status).toBe('pass');
    expect(result.checks.find((c: any) => c.id === 'canonical')?.status).toBe('pass');
  });

  // ── 8.2: Meta title too short (under 50 chars) ─────────────────────────
  it('should penalize short meta title (< 50 chars)', async () => {
    const blog = makeBlogForSeo({ title: 'Short Title', seo: { metaTitle: 'Short Title' } });
    jest.spyOn(service, 'findOne').mockResolvedValue(blog as any);
    mockPrisma.seoAuditLog.create.mockResolvedValue({});

    const result = await service.auditAndLogSeo('blog-seo-1', 'en');
    const titleCheck = result.checks.find((c: any) => c.id === 'title-length');
    expect(titleCheck?.status).toBe('warning');
    expect(result.score).toBeLessThan(100);
  });

  // ── 8.3: Meta title too long (over 60 chars) ──────────────────────────
  it('should penalize meta title > 60 chars', async () => {
    const longTitle = 'A'.repeat(65); // 65 chars
    const blog = makeBlogForSeo({ title: longTitle, seo: { metaTitle: longTitle } });
    jest.spyOn(service, 'findOne').mockResolvedValue(blog as any);
    mockPrisma.seoAuditLog.create.mockResolvedValue({});

    const result = await service.auditAndLogSeo('blog-seo-1', 'en');
    const titleCheck = result.checks.find((c: any) => c.id === 'title-length');
    expect(titleCheck?.status).toBe('fail');
  });

  // ── 8.4: Missing meta description ─────────────────────────────────────
  it('should fail when meta description is missing', async () => {
    const blog = makeBlogForSeo({}, {
      translations: { en: { ...makeSeoTranslation(), excerpt: '', seo: { ...makeSeoTranslation().seo, metaDescription: '' } } }
    });
    jest.spyOn(service, 'findOne').mockResolvedValue(blog as any);
    mockPrisma.seoAuditLog.create.mockResolvedValue({});

    const result = await service.auditAndLogSeo('blog-seo-1', 'en');
    const descCheck = result.checks.find((c: any) => c.id === 'desc-length');
    expect(descCheck?.status).toBe('fail');
    expect(result.score).toBeLessThan(90);
  });

  // ── 8.5: Missing canonical URL ─────────────────────────────────────────
  it('should penalize missing canonical URL', async () => {
    const blog = makeBlogForSeo({ seo: { ...makeSeoTranslation().seo, canonicalUrl: '' } });
    jest.spyOn(service, 'findOne').mockResolvedValue(blog as any);
    mockPrisma.seoAuditLog.create.mockResolvedValue({});

    const result = await service.auditAndLogSeo('blog-seo-1', 'en');
    const canonicalCheck = result.checks.find((c: any) => c.id === 'canonical');
    expect(canonicalCheck?.status).toBe('warning');
  });

  // ── 8.6: Missing focus keyword ─────────────────────────────────────────
  it('should fail when focus keyword is not set', async () => {
    const blog = makeBlogForSeo({ seo: { ...makeSeoTranslation().seo, focusKeyword: '' } });
    jest.spyOn(service, 'findOne').mockResolvedValue(blog as any);
    mockPrisma.seoAuditLog.create.mockResolvedValue({});

    const result = await service.auditAndLogSeo('blog-seo-1', 'en');
    const keywordCheck = result.checks.find((c: any) => c.id === 'focus-keyword');
    expect(keywordCheck?.status).toBe('fail');
  });

  // ── 8.7: Missing alt text on featured image ────────────────────────────
  it('should penalize missing image alt text', async () => {
    const blog = makeBlogForSeo({}, { featuredImageAlt: '' });
    jest.spyOn(service, 'findOne').mockResolvedValue(blog as any);
    mockPrisma.seoAuditLog.create.mockResolvedValue({});

    const result = await service.auditAndLogSeo('blog-seo-1', 'en');
    const altCheck = result.checks.find((c: any) => c.id === 'image-alt');
    expect(altCheck?.status).toBe('warning');
  });

  // ── 8.8: noindex robots directive penalized ────────────────────────────
  it('should penalize noindex robots directive', async () => {
    const blog = makeBlogForSeo({ seo: { ...makeSeoTranslation().seo, robots: 'noindex, nofollow' } });
    jest.spyOn(service, 'findOne').mockResolvedValue(blog as any);
    mockPrisma.seoAuditLog.create.mockResolvedValue({});

    const result = await service.auditAndLogSeo('blog-seo-1', 'en');
    const robotsCheck = result.checks.find((c: any) => c.id === 'robots');
    expect(robotsCheck?.status).toBe('warning');
    expect(robotsCheck?.message).toContain('noindex');
  });

  // ── 8.9: Missing H2 headings ──────────────────────────────────────────
  it('should warn when content has no H2 headings', async () => {
    const blog = makeBlogForSeo({
      content: '<p>Just a paragraph with no headings at all in the content.</p>'
    });
    jest.spyOn(service, 'findOne').mockResolvedValue(blog as any);
    mockPrisma.seoAuditLog.create.mockResolvedValue({});

    const result = await service.auditAndLogSeo('blog-seo-1', 'en');
    const headingCheck = result.checks.find((c: any) => c.id === 'heading-structure');
    expect(headingCheck?.status).toBe('warning');
  });

  // ── 8.10: Translation not found for requested lang ────────────────────
  it('should throw NotFoundException when language translation missing', async () => {
    const blog = { id: 'blog-seo-1', translations: {} }; // No translations
    jest.spyOn(service, 'findOne').mockResolvedValue(blog as any);

    await expect(service.auditAndLogSeo('blog-seo-1', 'fr'))
      .rejects.toThrow(NotFoundException);
  });

  // ── 8.11: Boundary test: exactly 50 chars (lower boundary) ────────────
  it('should pass title check at exactly 50 chars (lower boundary)', async () => {
    const title50 = 'A'.repeat(50);
    const blog = makeBlogForSeo({ title: title50, seo: { ...makeSeoTranslation().seo, metaTitle: title50 } });
    jest.spyOn(service, 'findOne').mockResolvedValue(blog as any);
    mockPrisma.seoAuditLog.create.mockResolvedValue({});

    const result = await service.auditAndLogSeo('blog-seo-1', 'en');
    const titleCheck = result.checks.find((c: any) => c.id === 'title-length');
    expect(titleCheck?.status).toBe('pass');
  });

  // ── 8.12: Boundary test: exactly 60 chars (upper boundary) ────────────
  it('should pass title check at exactly 60 chars (upper boundary)', async () => {
    const title60 = 'A'.repeat(60);
    const blog = makeBlogForSeo({ title: title60, seo: { ...makeSeoTranslation().seo, metaTitle: title60 } });
    jest.spyOn(service, 'findOne').mockResolvedValue(blog as any);
    mockPrisma.seoAuditLog.create.mockResolvedValue({});

    const result = await service.auditAndLogSeo('blog-seo-1', 'en');
    const titleCheck = result.checks.find((c: any) => c.id === 'title-length');
    expect(titleCheck?.status).toBe('pass');
  });

  // ── 8.13: SEO audit log saved to database ──────────────────────────────
  it('should persist SEO audit result to seo_audit_logs table', async () => {
    const blog = makeBlogForSeo();
    jest.spyOn(service, 'findOne').mockResolvedValue(blog as any);
    mockPrisma.seoAuditLog.create.mockResolvedValue({});

    await service.auditAndLogSeo('blog-seo-1', 'en');
    expect(mockPrisma.seoAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blogId: 'blog-seo-1',
          websiteId: 'site-1',
          lang: 'en',
          score: expect.any(Number),
        })
      })
    );
  });
});
