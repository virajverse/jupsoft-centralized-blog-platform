import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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

  async create(dto: CreateWebsiteDto) {
    const existing = await this.prisma.website.findFirst({
      where: {
        OR: [{ id: dto.id }, { domain: dto.domain }],
      },
    });

    if (existing) {
      throw new ConflictException('A website with this ID or domain already exists');
    }

    // Auto-generate secure API key and S3 folder prefix
    const randomHex = crypto.randomBytes(6).toString('hex');
    const cleanSlug = dto.id.replace(/^site-/, '');
    const apiKey = `jup_live_sec_${cleanSlug}_${randomHex}`;
    const s3Prefix = `blogs/${cleanSlug}/`;

    const website = await this.prisma.website.create({
      data: {
        id: dto.id,
        name: dto.name,
        domain: dto.domain.toLowerCase(),
        logoUrl: dto.logoUrl || '',
        description: dto.description || '',
        apiKey,
        s3Prefix,
        status: 'active',
        defaultLanguage: dto.defaultLanguage || 'en',
        supportedLanguages: dto.supportedLanguages || ['en', 'hi', 'fr', 'ar'],
        revalidateWebhookUrl: dto.revalidateWebhookUrl || `https://${dto.domain}/api/revalidate`,
      },
    });

    // Record in audit log
    await this.prisma.systemAuditLog.create({
      data: {
        userName: 'Super Admin',
        role: 'Super Admin',
        websiteId: website.id,
        event: 'website.created',
        ipAddress: '127.0.0.1',
        details: `Onboarded new website tenant "${website.name}" (${website.domain}).`,
      },
    });

    return website;
  }

  async update(id: string, dto: UpdateWebsiteDto) {
    await this.findOne(id);

    return this.prisma.website.update({
      where: { id },
      data: dto,
    });
  }
}
