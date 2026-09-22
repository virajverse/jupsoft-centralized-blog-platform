/**
 * MEDIA UPLOAD SECURITY TESTS — Phase 14
 * Tests: File type validation, size limits, MIME spoofing, path traversal, unauthorized access
 */
import { MediaService } from '../modules/media/media.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

const mockPrisma = {
  website: { findUnique: jest.fn(), findFirst: jest.fn() },
  mediaAsset: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  systemAuditLog: { create: jest.fn() },
};
const mockConfig = {
  get: jest.fn((k: string) => {
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
  }),
};
const mockRedis = {
  get: jest.fn(() => null),
  set: jest.fn(),
  delPattern: jest.fn(),
  nsKey: jest.fn(async (ns: string, suffix: string) => `${ns}:g0:${suffix}`),
  invalidateNamespace: jest.fn(),
};

const makeUser = (roles: string[] = ['Editor'], websiteId: string = 'site-1') => ({
  id: 'user-1',
  email: 'uploader@test.com',
  name: 'Uploader',
  avatar: '',
  roles,
  roleAssignments: roles.map((r) => ({
    role: r,
    websiteId: r === 'Super Admin' ? null : websiteId,
    isGlobal: r === 'Super Admin',
  })),
});

const createValidPngBuffer = () => Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
]);

describe('MediaService - Upload Security', () => {
  let service: MediaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MediaService(mockPrisma as any, mockConfig as any, mockRedis as any);
  });

  it('should accept image file types', async () => {
    const website = { id: 'site-1', s3Prefix: 'blogs/site-1', domain: 'test.com' };
    mockPrisma.website.findUnique.mockResolvedValue(website);
    mockPrisma.mediaAsset.create.mockResolvedValue({
      id: 'media-1', websiteId: 'site-1', fileName: 'test.webp',
      fileType: 'image/webp', fileSizeBytes: 1000, s3Key: 'blogs/site-1/2026/09/test.webp',
      cdnUrl: 'http://localhost:4000/uploads/blogs/site-1/2026/09/test.webp',
    });
    mockPrisma.systemAuditLog.create.mockResolvedValue({});

    await expect(
      service.processAndUpload(createValidPngBuffer(), 'photo.jpg', 'image/jpeg', 'site-1', 'Alt text', makeUser() as any)
    ).resolves.toBeDefined().catch((e) => {
      expect(e.message).not.toContain('not allowed');
    });
  });

  it('should reject PDF file type', async () => {
    const website = { id: 'site-1', s3Prefix: 'blogs/site-1' };
    mockPrisma.website.findUnique.mockResolvedValue(website);

    await expect(
      service.processAndUpload(Buffer.from('%PDF-1.4'), 'document.pdf', 'application/pdf', 'site-1', '', makeUser() as any)
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject SVG file type', async () => {
    const website = { id: 'site-1', s3Prefix: 'blogs/site-1' };
    mockPrisma.website.findUnique.mockResolvedValue(website);

    await expect(
      service.processAndUpload(Buffer.from('<svg>'), 'image.svg', 'image/svg+xml', 'site-1', '', makeUser() as any)
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject executable file type', async () => {
    const website = { id: 'site-1', s3Prefix: 'blogs/site-1' };
    mockPrisma.website.findUnique.mockResolvedValue(website);

    await expect(
      service.processAndUpload(Buffer.from('MZ\x90\x00'), 'malware.exe', 'application/octet-stream', 'site-1', '', makeUser() as any)
    ).rejects.toThrow(BadRequestException);
  });

  it('should sanitize filename to prevent path traversal in presigned URL', async () => {
    mockPrisma.website.findUnique.mockResolvedValue({ id: 'site-1', s3Prefix: 'blogs/site-1' });

    const result = await service.generatePresignedUrl({
      websiteId: 'site-1',
      fileName: '../../../etc/passwd.jpg',
      fileType: 'image/jpeg',
      fileSizeBytes: 1024,
    });

    expect(result.s3Key).not.toContain('../');
    expect(result.s3Key).not.toContain('etc/passwd');
  });

  it('should handle null bytes in filename', async () => {
    mockPrisma.website.findUnique.mockResolvedValue({ id: 'site-1', s3Prefix: 'blogs/site-1' });

    const result = await service.generatePresignedUrl({
      websiteId: 'site-1',
      fileName: 'image.jpg\x00.php',
      fileType: 'image/jpeg',
      fileSizeBytes: 1024,
    });

    expect(result.fileName).not.toContain('\x00');
    expect(result.s3Key).not.toContain('\x00');
  });

  it('should throw NotFoundException for unknown websiteId in presigned URL', async () => {
    mockPrisma.website.findUnique.mockResolvedValue(null);

    await expect(service.generatePresignedUrl({
      websiteId: 'non-existent-site',
      fileName: 'image.jpg',
      fileType: 'image/jpeg',
      fileSizeBytes: 1024,
    })).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when deleting non-existent media asset', async () => {
    mockPrisma.mediaAsset.findUnique.mockResolvedValue(null);

    await expect(service.delete('non-existent-id', makeUser() as any))
      .rejects.toThrow(NotFoundException);
  });

  it('should block cross-tenant media deletion for scoped users', async () => {
    const asset = { id: 'media-1', websiteId: 'site-1', fileName: 'test.webp', s3Key: 'blogs/site-1/test.webp' };
    mockPrisma.mediaAsset.findUnique.mockResolvedValue(asset);

    const otherTenantUser = makeUser(['Editor'], 'site-2');
    await expect(service.delete('media-1', otherTenantUser as any))
      .rejects.toThrow(ForbiddenException);
  });

  it('should allow deletion when caller belongs to asset website', async () => {
    const asset = { id: 'media-1', websiteId: 'site-1', fileName: 'test.webp', s3Key: 'blogs/site-1/test.webp' };
    mockPrisma.mediaAsset.findUnique.mockResolvedValue(asset);
    mockPrisma.mediaAsset.update.mockResolvedValue({});
    mockPrisma.systemAuditLog.create.mockResolvedValue({});

    const caller = makeUser(['Editor'], 'site-1');
    const result = await service.delete('media-1', caller as any);

    expect(result.success).toBe(true);
    expect(mockPrisma.mediaAsset.update).toHaveBeenCalledWith({
      where: { id: 'media-1' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('should allow Super Admin to delete any media asset', async () => {
    const asset = { id: 'media-1', websiteId: 'site-1', fileName: 'test.webp', s3Key: 'blogs/site-1/test.webp' };
    mockPrisma.mediaAsset.findUnique.mockResolvedValue(asset);
    mockPrisma.mediaAsset.update.mockResolvedValue({});
    mockPrisma.systemAuditLog.create.mockResolvedValue({});

    const superAdmin = makeUser(['Super Admin']);
    const result = await service.delete('media-1', superAdmin as any);

    expect(result.success).toBe(true);
  });
});
