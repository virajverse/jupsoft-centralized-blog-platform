import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisProvider } from '../../common/providers/redis.provider';

@Injectable()
export class AuditLogsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisProvider,
  ) {}

  async findAll(params: { websiteId?: string; event?: string; limit?: number }, user?: any) {
    const { websiteId, event, limit = 50 } = params;

    const cacheKey = `admin:audit:${websiteId || 'all'}:${limit}:${event || 'all'}`;
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

    const logs = await this.prisma.systemAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    await this.redis.set(cacheKey, logs, 30);
    return logs;
  }
}
