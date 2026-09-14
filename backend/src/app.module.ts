/**
 * AppModule — TRD §15 (Security): ThrottlerModule global rate limiting (60 req/min)
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(), // TRD §7: Scheduled blog publishing cron worker

    // TRD §15: Rate Limiting — 60 requests per 60 seconds globally
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,  // 60 seconds window
        limit: 60,   // 60 requests per window (TRD §15: "Rate limiting: 60 req/min")
      },
    ]),

    PrismaModule,
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
  ],
  providers: [
    Reflector,
    // TRD §15: Apply rate limit guard globally to all routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
