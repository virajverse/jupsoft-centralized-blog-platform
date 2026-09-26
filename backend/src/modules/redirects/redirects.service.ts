import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisProvider } from '../../common/providers/redis.provider';
import { CreateRedirectDto } from './dto/redirect.dto';

@Injectable()
export class RedirectsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisProvider,
  ) {}

  async findAll(websiteId?: string) {
    const cacheKey = `admin:redirects:${websiteId || 'all'}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (websiteId && websiteId !== 'all') {
      where.websiteId = websiteId;
    }

    const redirects = await this.prisma.redirect.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        website: { select: { name: true, domain: true } },
      },
    });

    await this.redis.set(cacheKey, redirects, 120);
    return redirects;
  }

  async create(dto: CreateRedirectDto, user: any, ipAddress?: string) {
    const cleanFrom = dto.fromSlug.trim().replace(/^\/+|\/+$/g, '');
    const cleanTo = dto.toSlug.trim().replace(/^\/+|\/+$/g, '');

    if (cleanFrom.toLowerCase() === cleanTo.toLowerCase()) {
      throw new BadRequestException('A redirect cannot point to itself (self-referential loop).');
    }

    const circular = await this.prisma.redirect.findFirst({
      where: {
        websiteId: dto.websiteId,
        fromSlug: cleanTo,
        toSlug: cleanFrom,
      },
    });
    if (circular) {
      throw new BadRequestException(`Circular redirect loop detected: "${cleanTo}" already redirects back to "${cleanFrom}".`);
    }

    const redirect = await this.prisma.redirect.upsert({
      where: {
        websiteId_fromSlug: {
          websiteId: dto.websiteId,
          fromSlug: cleanFrom,
        },
      },
      update: {
        toSlug: cleanTo,
        statusCode: dto.statusCode || 301,
      },
      create: {
        websiteId: dto.websiteId,
        fromSlug: cleanFrom,
        toSlug: cleanTo,
        statusCode: dto.statusCode || 301,
      },
    });

    // Invalidate Redis caches
    await this.redis.del(`redirects:${dto.websiteId}`);
    await this.redis.delPattern(`blog:${dto.websiteId}:${cleanFrom}:*`);
    await this.redis.delPattern('admin:redirects:*');

    // Record in audit log
    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: user.roles[0] || 'User',
        websiteId: dto.websiteId,
        event: 'redirect.created',
        ipAddress: ipAddress || '',
        details: `Created 301 rule: /${cleanFrom} → /${cleanTo}`,
      },
    });

    return redirect;
  }

  async delete(id: string, user: any, ipAddress?: string) {
    const redirect = await this.prisma.redirect.findUnique({ where: { id } });
    if (!redirect) {
      throw new NotFoundException(`Redirect rule with ID "${id}" not found`);
    }

    await this.prisma.redirect.delete({ where: { id } });

    // Invalidate Redis caches
    await this.redis.del(`redirects:${redirect.websiteId}`);
    await this.redis.delPattern(`blog:${redirect.websiteId}:${redirect.fromSlug}:*`);
    await this.redis.delPattern('admin:redirects:*');

    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: user.roles[0] || 'User',
        websiteId: redirect.websiteId,
        event: 'redirect.deleted',
        ipAddress: ipAddress || '',
        details: `Deleted 301 redirect: /${redirect.fromSlug}`,
      },
    });

    return { success: true, message: 'Redirect rule deleted' };
  }
}
