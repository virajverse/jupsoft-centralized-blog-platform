import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRedirectDto } from './dto/redirect.dto';

@Injectable()
export class RedirectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(websiteId?: string) {
    const where: any = {};
    if (websiteId && websiteId !== 'all') {
      where.websiteId = websiteId;
    }

    return this.prisma.redirect.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        website: { select: { name: true, domain: true } },
      },
    });
  }

  async create(dto: CreateRedirectDto, user: any) {
    const cleanFrom = dto.fromSlug.trim().replace(/^\/+|\/+$/g, '');
    const cleanTo = dto.toSlug.trim().replace(/^\/+|\/+$/g, '');

    const existing = await this.prisma.redirect.findUnique({
      where: {
        websiteId_fromSlug: {
          websiteId: dto.websiteId,
          fromSlug: cleanFrom,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`A redirect rule already exists for /${cleanFrom}`);
    }

    const redirect = await this.prisma.redirect.create({
      data: {
        websiteId: dto.websiteId,
        fromSlug: cleanFrom,
        toSlug: cleanTo,
        statusCode: dto.statusCode || 301,
      },
    });

    // Record in audit log
    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: user.roles[0] || 'User',
        websiteId: dto.websiteId,
        event: 'redirect.created',
        ipAddress: '127.0.0.1',
        details: `Created 301 rule: /${cleanFrom} → /${cleanTo}`,
      },
    });

    return redirect;
  }

  async delete(id: string, user: any) {
    const redirect = await this.prisma.redirect.findUnique({ where: { id } });
    if (!redirect) {
      throw new NotFoundException(`Redirect rule with ID "${id}" not found`);
    }

    await this.prisma.redirect.delete({ where: { id } });

    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: user.roles[0] || 'User',
        websiteId: redirect.websiteId,
        event: 'redirect.deleted',
        ipAddress: '127.0.0.1',
        details: `Deleted 301 redirect: /${redirect.fromSlug}`,
      },
    });

    return { success: true, message: 'Redirect rule deleted' };
  }
}
