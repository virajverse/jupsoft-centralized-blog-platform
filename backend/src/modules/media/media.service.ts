/**
 * Media Service — TRD §10 (Media Management Module)
 *
 * TRD §10 Pipeline:
 *   1. Upload to S3 (server-issued pre-signed URL)           → generatePresignedUrl()
 *   2. Compress and convert to WebP                           → processAndUpload()
 *   3. Generate thumbnail + responsive sizes                  → processAndUpload()
 *   4. Store metadata in media_library (media_assets table)  → confirmUpload() / processAndUpload()
 *   5. Return CDN URL                                         → all methods
 *   6. Soft-delete with lifecycle cleanup                     → softDelete()
 *
 * TRD §10 S3 Layout: s3://<bucket>/blogs/<website>/<yyyy>/<mm>/<file>
 */

import { Injectable, NotFoundException, Logger, BadRequestException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisProvider } from '../../common/providers/redis.provider';
import { PresignedUrlRequestDto, ConfirmMediaUploadDto } from './dto/media.dto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import { join, dirname } from 'path';
import type { Sharp } from 'sharp';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharpLib = require('sharp') as { default: (input: Buffer) => Sharp } & ((input: Buffer) => Sharp);
const sharpFn = (buf: Buffer): Sharp => (typeof sharpLib === 'function' ? sharpLib(buf) : (sharpLib as any).default(buf));
import { AuthenticatedUser } from '../../common/interfaces/auth-user.interface';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private s3Client: S3Client;
  private bucket: string;
  private cdnDomain: string;
  private isProduction = false;
  private isTest = false;
  private hasAwsCredentials = false;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private redis: RedisProvider,
  ) {
    const region = this.configService.get<string>('AWS_REGION') || 'ap-south-1';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID') || '';
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '';
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';

    this.isProduction = nodeEnv === 'production';
    this.isTest = nodeEnv === 'test';
    this.hasAwsCredentials = Boolean(accessKeyId && secretAccessKey);

    // ── Production refuses mock/local-only storage (no silent fallbacks) ──
    if (this.isProduction && !this.hasAwsCredentials) {
      throw new Error(
        '[FATAL] AWS S3 credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) are not configured. ' +
          'Production will NOT run with local-only/mock media storage — configure real credentials.',
      );
    }

    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') || 'jupsoft-blogs-storage';
    const envCdn = this.configService.get<string>('CLOUDFRONT_DOMAIN');
    const platformBase = this.configService.get<string>('PLATFORM_BASE_URL') || 'https://blogary.jupsoft.com';

    // Auto-fallback: if CLOUDFRONT_DOMAIN points to the inactive cdn.jupsoft.com domain, route through active platform uploads
    if (envCdn && !envCdn.includes('cdn.jupsoft.com')) {
      this.cdnDomain = envCdn.replace(/\/+$/, '');
    } else if (this.isProduction) {
      this.cdnDomain = `${platformBase.replace(/\/+$/, '')}/uploads`;
    } else {
      this.cdnDomain = 'http://localhost:4000/uploads';
    }

    const s3Config: any = { region };
    if (this.hasAwsCredentials) {
      s3Config.credentials = { accessKeyId, secretAccessKey };
    }
    this.s3Client = new S3Client(s3Config);
  }

  // ─── TRD §10: Step 1 — Generate pre-signed S3 PUT URL ──────────────────────

  async generatePresignedUrl(dto: PresignedUrlRequestDto) {
    const website = await this.prisma.website.findUnique({
      where: { id: dto.websiteId },
    });

    if (!website) {
      throw new NotFoundException(`Website "${dto.websiteId}" not found`);
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const cleanFileName = dto.fileName.toLowerCase().replace(/[^a-z0-9.-]/g, '-');

    // TRD §10 S3 Layout: blogs/<website>/<yyyy>/<mm>/<file>
    const tenantSlug = website.s3Prefix ? website.s3Prefix.replace(/^blogs\/|\/$/g, '') : website.id;
    const s3Key = `blogs/${tenantSlug}/${year}/${month}/${cleanFileName}`;
    const cdnUrl = `${this.cdnDomain}/${s3Key}`;

    let presignedUrl: string;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        ContentType: dto.fileType,
      });
      presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
    } catch (err) {
      // No mock URL fallback — a fake upload URL would silently break media storage.
      throw new InternalServerErrorException(
        `Failed to sign S3 upload URL: ${(err as Error).message}. Check AWS credentials and bucket configuration.`,
      );
    }

    return { uploadUrl: presignedUrl, s3Key, cdnUrl, fileName: cleanFileName, fileType: dto.fileType };
  }

  // ─── TRD §10: Steps 2–5 — Server-side upload with WebP conversion ──────────
  // TRD §10: "Compress and convert to WebP, Generate thumbnail + responsive sizes"

  async processAndUpload(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    websiteId: string,
    altText: string,
    user: AuthenticatedUser,
    ipAddress?: string,
  ) {
    // Validate it's an image
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(mimeType)) {
      throw new BadRequestException(`File type "${mimeType}" is not allowed. Only images are accepted.`);
    }

    let website = websiteId ? await this.prisma.website.findUnique({ where: { id: websiteId } }) : null;
    if (!website) {
      website = await this.prisma.website.findFirst();
    }
    if (!website) throw new NotFoundException(`Website "${websiteId || 'default'}" not found`);
    const targetWebsiteId = website.id;

    if (user) {
      const isGlobal =
        user.roles?.includes('Super Admin') ||
        user.roleAssignments?.some((ra) => ra.isGlobal && ra.role === 'Website Admin');
      if (!isGlobal) {
        const userWebsiteIds = (user.roleAssignments || [])
          .filter((ra) => ra.websiteId)
          .map((ra) => ra.websiteId);
        if (!userWebsiteIds.includes(targetWebsiteId)) {
          throw new ForbiddenException(
            `Access denied: cannot upload media to website "${targetWebsiteId}".`,
          );
        }
      }
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const tenantSlug = website.s3Prefix?.replace(/^blogs\/|\/$/g, '') || website.id;
    const baseName = originalName.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]/g, '-');
    const prefix = `blogs/${tenantSlug}/${year}/${month}/${baseName}`;

    // TRD §10: Step 2 — Convert to WebP (full-size)
    const fullBuffer = await sharpFn(fileBuffer)
      .webp({ quality: 85 })
      .toBuffer();

    const fullMeta = await sharpFn(fullBuffer).metadata();

    // TRD §10: Step 3 — Generate thumbnail (150×150) + medium (600px wide)
    const thumbBuffer = await sharpFn(fileBuffer)
      .resize(150, 150, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    const mediumBuffer = await sharpFn(fileBuffer)
      .resize(600, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // Upload all 3 variants — TRD §10: "Return CDN URL"
    const fullKey      = `${prefix}.webp`;
    const thumbKey     = `${prefix}-thumb.webp`;
    const mediumKey    = `${prefix}-medium.webp`;

    const [fullUrl, thumbUrl, mediumUrl] = await Promise.all([
      this.uploadToS3(fullKey, fullBuffer, 'image/webp'),
      this.uploadToS3(thumbKey, thumbBuffer, 'image/webp'),
      this.uploadToS3(mediumKey, mediumBuffer, 'image/webp'),
    ]);

    // TRD §10: Step 4 — Store metadata in media_assets table
    const media = await this.prisma.mediaAsset.create({
      data: {
        websiteId: targetWebsiteId,
        fileName: `${baseName}.webp`,
        fileType: 'image/webp',
        fileSizeBytes: fullBuffer.length,
        s3Key: fullKey,
        cdnUrl: fullUrl,
        altText: altText || baseName.replace(/-/g, ' '),
        uploadedBy: user.name,
      },
    });

    // Audit log
    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: user.roles[0] || 'User',
        websiteId: targetWebsiteId,
        event: 'media.uploaded',
        ipAddress: ipAddress || '',
        details: `Processed & uploaded "${baseName}.webp" (${(fullBuffer.length / 1024).toFixed(0)} KB WebP, thumbnail + medium generated).`,
      },
    });

    this.logger.log(`TRD §10: WebP pipeline complete — full: ${fullKey}, thumb: ${thumbKey}, medium: ${mediumKey}`);
    await this.redis.delPattern('admin:media:*');

    // TRD §10: Step 5 — Return CDN URLs for all sizes
    return {
      id: media.id,
      cdnUrl: fullUrl,
      thumbnailUrl: thumbUrl,
      mediumUrl: mediumUrl,
      s3Key: fullKey,
      fileName: `${baseName}.webp`,
      fileType: 'image/webp',
      fileSizeBytes: fullBuffer.length,
      width: fullMeta.width,
      height: fullMeta.height,
    };
  }

  // ─── Internal: Upload buffer to S3 / Local Disk ─────────────────────────
  private async uploadToS3(s3Key: string, buffer: Buffer, contentType: string): Promise<string> {
    const cleanKey = s3Key.replace(/^\/+/, '');
    const cdnUrl = `${this.cdnDomain}/${cleanKey}`;

    // 1. Always save a copy locally on disk (served via /uploads in dev & as durable fallback)
    try {
      const uploadsDir = join(process.cwd(), 'uploads');
      const targetPath = join(uploadsDir, cleanKey);
      const targetDir = dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(targetPath, buffer);
      this.logger.log(`💾 Saved media asset locally: ${cleanKey}`);
    } catch (fsErr) {
      this.logger.warn(`Could not save local copy for ${cleanKey}: ${(fsErr as Error).message}`);
    }

    // 2. Production MUST have durable S3 storage — no silent skip.
    if (!this.hasAwsCredentials) {
      if (this.isProduction) {
        throw new InternalServerErrorException(
          'AWS S3 credentials are not configured — refusing to accept media uploads without durable storage.',
        );
      }
      this.logger.warn(`S3 upload skipped (AWS credentials not configured — dev only): ${cleanKey}`);
      return cdnUrl;
    }

    // 3. Unit tests run hermetically (no network); integration tests should override NODE_ENV.
    if (this.isTest) {
      return cdnUrl;
    }

    // 4. Real S3 upload — failures surface loudly instead of returning a CDN URL for a file that does not exist.
    try {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
        Body: buffer,
        ContentType: contentType,
      }));
    } catch (err) {
      throw new InternalServerErrorException(
        `S3 upload failed for "${cleanKey}": ${(err as Error).message}`,
      );
    }
    return cdnUrl;
  }

  // ─── TRD §10: Step 6 — Soft-delete ─────────────────────────────────────────

  async confirmUpload(dto: ConfirmMediaUploadDto, user: AuthenticatedUser, ipAddress?: string) {
    // Sanitize s3Key: ensure clean relative path blogs/... even if client sent full URL
    let s3Key = dto.s3Key || '';
    if (s3Key.startsWith('http://') || s3Key.startsWith('https://')) {
      const blogsIdx = s3Key.indexOf('blogs/');
      s3Key = blogsIdx !== -1 ? s3Key.substring(blogsIdx) : s3Key.replace(/^https?:\/\/[^/]+\/(uploads\/)?/, '');
    }
    s3Key = s3Key.replace(/^\/+/, '');

    // Auto-heal cdnUrl if pointing to inactive cdn.jupsoft.com
    let cdnUrl = dto.cdnUrl || '';
    if (cdnUrl.includes('cdn.jupsoft.com')) {
      cdnUrl = `${this.cdnDomain}/${s3Key}`;
    }

    if (user) {
      const isGlobal =
        user.roles?.includes('Super Admin') ||
        user.roleAssignments?.some((ra) => ra.isGlobal && ra.role === 'Website Admin');
      if (!isGlobal) {
        const userWebsiteIds = (user.roleAssignments || [])
          .filter((ra) => ra.websiteId)
          .map((ra) => ra.websiteId);
        if (!userWebsiteIds.includes(dto.websiteId)) {
          throw new ForbiddenException(
            `Access denied: cannot register media for website "${dto.websiteId}".`,
          );
        }
      }
    }

    const media = await this.prisma.mediaAsset.create({
      data: {
        websiteId: dto.websiteId,
        fileName: dto.fileName,
        fileType: dto.fileType,
        fileSizeBytes: dto.fileSizeBytes,
        s3Key: s3Key,
        cdnUrl: cdnUrl,
        altText: dto.altText || '',
        uploadedBy: user.name,
      },
    });

    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: user.roles[0] || 'User',
        websiteId: dto.websiteId,
        event: 'media.uploaded',
        ipAddress: ipAddress || '',
        details: `Uploaded asset "${dto.fileName}" to ${s3Key} (${(dto.fileSizeBytes / 1024).toFixed(0)} KB).`,
      },
    });

    // No fabricated placeholder files — if the asset is genuinely missing, log it loudly.
    try {
      const cleanKey = s3Key.replace(/^\/+/, '');
      const uploadsDir = join(process.cwd(), 'uploads');
      const targetPath = join(uploadsDir, cleanKey);
      if (!fs.existsSync(targetPath)) {
        this.logger.warn(
          `Media file not found on local disk for "${cleanKey}" — expected to exist in S3/CDN. Record registered without a local copy.`,
        );
      }
    } catch (diskErr) {
      this.logger.warn(`Could not verify local asset for ${s3Key}: ${(diskErr as Error).message}`);
    }

    // Invert media cache
    await this.redis.delPattern('admin:media:*');

    return media;
  }

  async findAll(websiteId?: string, page?: number, limit?: number, user?: AuthenticatedUser) {
    const isGlobal =
      !user ||
      user.roles?.includes('Super Admin') ||
      user.roleAssignments?.some((ra) => ra.isGlobal && ra.role === 'Website Admin');

    const userScope = !isGlobal && user ? `user:${user.id}` : 'global';
    const isPaginated = page !== undefined && limit !== undefined && page > 0 && limit > 0;
    const cacheKey = isPaginated
      ? `admin:media:${userScope}:${websiteId || 'all'}:p${page}:l${limit}`
      : `admin:media:${userScope}:${websiteId || 'all'}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const where: Record<string, unknown> = {};
    if (!isGlobal && user) {
      const allowedSites = (user.roleAssignments || [])
        .filter((ra) => ra.websiteId)
        .map((ra) => ra.websiteId as string);
      if (websiteId && websiteId !== 'all') {
        if (!allowedSites.includes(websiteId)) {
          throw new ForbiddenException(`Access denied: cannot view media for website "${websiteId}".`);
        }
        where.websiteId = websiteId;
      } else {
        where.websiteId = { in: allowedSites };
      }
    } else {
      if (websiteId && websiteId !== 'all') {
        where.websiteId = websiteId;
      }
    }
    where.deletedAt = null; // exclude soft-deleted assets

    const total = await this.prisma.mediaAsset.count({ where });

    const queryOptions: any = {
      where,
      orderBy: { createdAt: 'desc' },
    };

    if (isPaginated) {
      queryOptions.skip = (page - 1) * limit;
      queryOptions.take = limit;
    }

    const assets = await this.prisma.mediaAsset.findMany(queryOptions);

    // Auto-heal existing database records: strip domain prefix from s3Key & rewrite inactive cdn.jupsoft.com
    const result = assets.map((asset) => {
      let s3Key = asset.s3Key || '';
      if (s3Key.startsWith('http://') || s3Key.startsWith('https://')) {
        const blogsIdx = s3Key.indexOf('blogs/');
        s3Key = blogsIdx !== -1 ? s3Key.substring(blogsIdx) : s3Key.replace(/^https?:\/\/[^/]+\/(uploads\/)?/, '');
      }
      s3Key = s3Key.replace(/^\/+/, '');

      let cdnUrl = asset.cdnUrl || '';
      if (cdnUrl.includes('cdn.jupsoft.com')) {
        cdnUrl = `${this.cdnDomain}/${s3Key || asset.fileName}`;
      } else if (cdnUrl.startsWith('/uploads/')) {
        cdnUrl = `${this.cdnDomain.replace(/\/uploads$/, '')}${cdnUrl}`;
      }

      return {
        ...asset,
        s3Key,
        cdnUrl,
      };
    });

    const response = isPaginated
      ? {
          data: result,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      : result;

    await this.redis.set(cacheKey, response, 120);
    return response;
  }

  // TRD §10: "Soft-delete with lifecycle cleanup" — marks deletedAt timestamp
  async delete(id: string, user: AuthenticatedUser, ipAddress?: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException(`Media asset "${id}" not found`);

    // Security: verify caller owns this asset's tenant (BUG-006 fix)
    const isGlobalAdmin =
      user.roles.includes('Super Admin') ||
      user.roleAssignments.some((ra) => ra.isGlobal && ra.role === 'Website Admin');
    if (!isGlobalAdmin) {
      const userWebsiteIds = user.roleAssignments
        .filter((ra) => ra.websiteId)
        .map((ra) => ra.websiteId);
      if (!userWebsiteIds.includes(asset.websiteId)) {
        throw new ForbiddenException(
          `Access denied: media asset "${id}" does not belong to your website.`,
        );
      }
    }

    // Soft-delete: set deletedAt timestamp instead of hard-deleting the row
    await this.prisma.mediaAsset.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: user.roles[0] || 'Super Admin',
        websiteId: asset.websiteId,
        event: 'media.deleted',
        ipAddress: ipAddress || '',
        details: `Soft-deleted asset "${asset.fileName}" (${asset.s3Key}).`,
      },
    });

    await this.redis.delPattern('admin:media:*');
    return { success: true, message: 'Media asset deleted' };
  }
}
