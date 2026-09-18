import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWebsiteDto, UpdateWebsiteDto } from './dto/create-website.dto';
import * as crypto from 'crypto';

@Injectable()
export class WebsitesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.website.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { blogs: true, categories: true, tags: true },
        },
      },
    });
  }

  async findOne(id: string) {
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

    return website;
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
      if (!webhookUrl.startsWith('https://') && !webhookUrl.startsWith('http://')) {
        throw new BadRequestException('revalidateWebhookUrl must be a valid URL starting with http:// or https://');
      }
      if (webhookUrl.includes('/blog/api/revalidate')) {
        webhookUrl = webhookUrl.replace('/blog/api/revalidate', '/api/revalidate');
      }
    } else {
      webhookUrl = `https://${cleanDomain}/api/revalidate`;
    }

    const website = await this.prisma.website.create({
      data: {
        id: dto.id || `web-${Date.now()}`,
        name: dto.name,
        domain: cleanDomain,
        logoUrl: dto.logoUrl?.trim() || '/uploads/logos/default-website-logo.webp',
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
            cdnUrl: '/uploads/logos/default-website-logo.webp',
            altText: `${website.name} Default Logo`,
            uploadedBy: user?.name || 'System Admin',
          },
          {
            websiteId: website.id,
            fileName: 'default-blog-cover.webp',
            fileType: 'image/webp',
            fileSizeBytes: 34000,
            s3Key: `blogs/${website.id}/default-blog-cover.webp`,
            cdnUrl: '/uploads/blogs/default-blog-cover.webp',
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

    return website;
  }

  async update(id: string, dto: UpdateWebsiteDto) {
    await this.findOne(id);

    if (dto.revalidateWebhookUrl && !dto.revalidateWebhookUrl.startsWith('https://') && !dto.revalidateWebhookUrl.startsWith('http://')) {
      throw new BadRequestException('revalidateWebhookUrl must be a valid URL starting with http:// or https://');
    }

    return this.prisma.website.update({
      where: { id },
      data: dto,
    });
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

    return { success: true, message: `Website tenant "${website.name}" removed.` };
  }
}
