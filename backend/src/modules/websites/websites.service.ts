import { Injectable, ConflictException, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisProvider } from '../../common/providers/redis.provider';
import { CreateWebsiteDto, UpdateWebsiteDto } from './dto/create-website.dto';
import { clearTenantCache } from '../../common/guards/api-key.guard';
import * as crypto from 'crypto';

@Injectable()
export class WebsitesService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private redis: RedisProvider,
  ) {}

  async onModuleInit() {
    // Pre-warm websites cache on boot so first request/login is instant (< 0.1ms)
    this.findAll().catch(() => {});
  }

  private canUserViewApiKey(user: any, websiteId?: string): boolean {
    if (!user) return false;

    // Super Admin can view all API keys
    const isSuperAdmin =
      user.roles?.includes('Super Admin') ||
      user.roleAssignments?.some((ra: any) => ra.role === 'Super Admin');
    if (isSuperAdmin) return true;

    // Website Admin can view API keys for their assigned site(s) or global
    const isWebsiteAdmin =
      user.roleAssignments?.some((ra: any) =>
        (ra.isGlobal || ra.websiteId === 'all' || (websiteId && ra.websiteId === websiteId)) &&
        ra.role === 'Website Admin',
      ) ||
      (user.roles?.includes('Website Admin') &&
        (!websiteId || !user.roleAssignments || user.roleAssignments.length === 0));

    return Boolean(isWebsiteAdmin);
  }

  async findAll(user?: any) {
    const cacheKey = 'admin:websites:all';
    let websites = await this.redis.get<any[]>(cacheKey);
    if (!websites) {
      websites = await this.prisma.website.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          _count: {
            select: { blogs: true, categories: true, tags: true },
          },
        },
      });
      await this.redis.set(cacheKey, websites, 300);
    }

    // Always deep clone before masking so cache in Redis is untouched
    const result = JSON.parse(JSON.stringify(websites));
    return result.map((w: any) => {
      if (!this.canUserViewApiKey(user, w.id)) {
        w.apiKey = '••••••••••••••••';
      }
      return w;
    });
  }

  async findOne(id: string, user?: any) {
    const website = await this.prisma.website.findUnique({
      where: { id },
      include: {
        _count: {
          select: { blogs: true, categories: true, tags: true },
        },
      },
    });

    if (!website) {
      throw new NotFoundException(`Website tenant with ID "${id}" not found`);
    }

    const result = JSON.parse(JSON.stringify(website));
    if (user && !this.canUserViewApiKey(user, result.id)) {
      result.apiKey = '••••••••••••••••';
    }

    return result;
  }

  async create(dto: CreateWebsiteDto, user?: any, ipAddress?: string) {
    const cleanDomain = dto.domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
      .split('/')[0]
      .trim();

    const existing = await this.prisma.website.findFirst({
      where: {
        OR: [{ id: dto.id }, { domain: cleanDomain }],
      },
    });

    if (existing) {
      throw new ConflictException(`A website with domain "${cleanDomain}" already exists`);
    }

    let webhookUrl = dto.revalidateWebhookUrl?.trim();
    if (webhookUrl) {
      const isJson = webhookUrl.startsWith('[');
      const isUrlList = webhookUrl.split(/[\n,;]+/).every((u) => {
        const t = u.trim();
        return !t || t.startsWith('http://') || t.startsWith('https://');
      });
      if (!isJson && !isUrlList) {
        throw new BadRequestException('revalidateWebhookUrl must be a valid URL (or comma-separated list of URLs) starting with http:// or https://');
      }
      if (webhookUrl.includes('/blog/api/revalidate')) {
        webhookUrl = webhookUrl.replace(/\/blog\/api\/revalidate/g, '/api/revalidate');
      }
    } else {
      webhookUrl = `https://${cleanDomain}/api/revalidate`;
    }

    const s3Base = 'https://blogary.s3.ap-south-1.amazonaws.com';

    const website = await this.prisma.website.create({
      data: {
        id: dto.id || `web-${Date.now()}`,
        name: dto.name,
        domain: cleanDomain,
        logoUrl: dto.logoUrl?.trim() || `${s3Base}/logos/default-website-logo.webp`,
        description: dto.description || '',
        apiKey: dto.apiKey?.trim() || `jup_sec_${crypto.randomUUID().replace(/-/g, '')}`,
        s3Prefix: dto.s3Prefix?.trim() || `blogs/${cleanDomain.replace(/[^a-zA-Z0-9]/g, '_')}/`,
        status: dto.status || 'active',
        defaultLanguage: dto.defaultLanguage || 'en',
        supportedLanguages: dto.supportedLanguages || ['en', 'hi', 'fr', 'ar'],
        revalidateWebhookUrl: webhookUrl,
      },
    });

    // Auto-seed starter WebP assets into media library for this new website
    try {
      await this.prisma.mediaAsset.createMany({
        data: [
          {
            websiteId: website.id,
            fileName: 'default-website-logo.webp',
            fileType: 'image/webp',
            fileSizeBytes: 6200,
            s3Key: `logos/${website.id}/default-website-logo.webp`,
            cdnUrl: `${s3Base}/logos/default-website-logo.webp`,
            altText: `${website.name} Default Logo`,
            uploadedBy: user?.name || 'System Admin',
          },
          {
            websiteId: website.id,
            fileName: 'default-blog-cover.webp',
            fileType: 'image/webp',
            fileSizeBytes: 34000,
            s3Key: `blogs/${website.id}/default-blog-cover.webp`,
            cdnUrl: `${s3Base}/blogs/default-blog-cover.webp`,
            altText: `${website.name} Featured Article Banner`,
            uploadedBy: user?.name || 'System Admin',
          },
        ],
        skipDuplicates: true,
      });
    } catch (mErr) {
      // Non-blocking
    }

    // Record in audit log
    await this.prisma.systemAuditLog.create({
      data: {
        userName: user?.name || 'Super Admin',
        role: user?.roles?.[0] || 'Super Admin',
        websiteId: website.id,
        event: 'website.created',
        ipAddress: ipAddress || '',
        details: `Onboarded new website tenant "${website.name}" (${website.domain}).`,
      },
    });

    await this.redis.del('admin:websites:all');
    clearTenantCache();
    return website;
  }

  async update(id: string, dto: UpdateWebsiteDto) {
    await this.findOne(id);

    if (dto.revalidateWebhookUrl) {
      const raw = dto.revalidateWebhookUrl.trim();
      const isJson = raw.startsWith('[');
      const isUrlList = raw.split(/[\n,;]+/).every((u) => {
        const t = u.trim();
        return !t || t.startsWith('http://') || t.startsWith('https://');
      });
      if (!isJson && !isUrlList) {
        throw new BadRequestException('revalidateWebhookUrl must be a valid URL (or comma-separated list of URLs) starting with http:// or https://');
      }
    }

    const updated = await this.prisma.website.update({
      where: { id },
      data: dto,
    });

    await this.redis.del('admin:websites:all');
    clearTenantCache();
    return updated;
  }

  async delete(id: string, user?: any, ipAddress?: string) {
    const website = await this.findOne(id);

    await this.prisma.website.delete({
      where: { id },
    });

    // Record in audit log
    await this.prisma.systemAuditLog.create({
      data: {
        userName: user?.name || 'Super Admin',
        role: user?.roles?.[0] || 'Super Admin',
        websiteId: id,
        event: 'website.deleted',
        ipAddress: ipAddress || '',
        details: `Deleted website tenant "${website.name}" (${website.domain}) and cascaded associated data.`,
      },
    });

    await this.redis.del('admin:websites:all');
    clearTenantCache();
    return { success: true, message: `Website tenant "${website.name}" removed.` };
  }
}
