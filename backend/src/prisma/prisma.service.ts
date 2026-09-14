import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Connected to PostgreSQL via Prisma');
    } catch (err) {
      this.logger.warn('⚠️ Warning: PostgreSQL not reachable yet. Start with docker compose up -d or verify DATABASE_URL');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
