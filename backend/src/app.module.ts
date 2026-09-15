/**
 * AppModule — Production-Hardened Configuration
 * TRD §15: Rate limiting, security interceptors, global guards
 * TRD §18: CloudWatch structured logging
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { WebsitesModule } from './modules/websites/websites.module';
import { BlogsModule } from './modules/blogs/blogs.module';
import { PublicV1Module } from './modules/public-v1/public-v1.module';
import { MediaModule } from './modules/media/media.module';
import { RedirectsModule } from './modules/redirects/redirects.module';
import { UsersModule } from './modules/users/users.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { LoggerModule } from './common/logger/logger.module';
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),

    // TRD §15: Dual-tier rate limiting
    // Tier 1: 'global'     → 60 req/min per IP  (admin routes)
    // Tier 2: 'public-api' → 120 req/min per API key (public /v1 routes via ApiKeyThrottlerGuard)
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,
        limit: 60,
      },
      {
        name: 'public-api',
        ttl: 60000,
        limit: 120,
      },
    ]),

    PrismaModule,
    LoggerModule,   // TRD §18: Global CloudWatch metrics service
    EmailModule,    // AWS SES workflow notifications (global so any module can inject)
    WebhooksModule,
    AuthModule,
    WebsitesModule,
    BlogsModule,
    PublicV1Module,
    MediaModule,
    RedirectsModule,
    UsersModule,
    AuditLogsModule,
    AnalyticsModule,
    TaxonomyModule,
  ],
  providers: [
    Reflector,
    // TRD §15: Global rate limit guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // TRD §17: Global API request logger → api_logs table
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
