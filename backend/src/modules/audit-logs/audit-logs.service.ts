import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: { websiteId?: string; event?: string; limit?: number }) {
    const { websiteId, event, limit = 50 } = params;

    const where: any = {};
    if (websiteId && websiteId !== 'all') {
      where.websiteId = websiteId;
    }
    if (event) {
      where.event = { contains: event, mode: 'insensitive' };
    }

    return this.prisma.systemAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
