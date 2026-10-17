import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisProvider } from '../../common/providers/redis.provider';

@Injectable()
export class AuditLogsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisProvider,
  ) {}

  async findAll(params: { websiteId?: string; event?: string; page?: number; limit?: number }, user?: any) {
    const { websiteId, event, page, limit = 50 } = params;
    const isPaginated = page !== undefined && page > 0;

    const cacheKey = isPaginated
      ? `admin:audit:${websiteId || 'all'}:p${page}:l${limit}:${event || 'all'}`
      : `admin:audit:${websiteId || 'all'}:${limit}:${event || 'all'}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    const isSuperAdmin = user?.roles?.includes('Super Admin');

    if (!isSuperAdmin && user?.roleAssignments && user.roleAssignments.length > 0) {
      const allowedWebsites = user.roleAssignments.map((ra: any) => ra.websiteId);
      if (websiteId && websiteId !== 'all') {
        where.websiteId = allowedWebsites.includes(websiteId) ? websiteId : '__forbidden__';
      } else {
        where.websiteId = { in: allowedWebsites };
      }
    } else if (websiteId && websiteId !== 'all') {
      where.websiteId = websiteId;
    }

    if (event) {
      where.event = { contains: event, mode: 'insensitive' };
    }

    const total = await this.prisma.systemAuditLog.count({ where });

    const queryOptions: any = {
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    };

    if (isPaginated) {
      queryOptions.skip = (page - 1) * limit;
    }

    const logs = await this.prisma.systemAuditLog.findMany(queryOptions);

    const response = isPaginated
      ? {
          data: logs,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      : logs;

    await this.redis.set(cacheKey, response, 30);
    return response;
  }
}
