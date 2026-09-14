/**
 * Analytics Module — TRD §14 (Analytics & Reporting)
 *
 * TRD §14:
 *   - "View events are recorded via a lightweight tracking endpoint"
 *   - "POST /v1/track — accepts {blogId, websiteId, sessionId, referrer}"
 *   - "aggregated asynchronously so they never slow page delivery"
 *   - "GET /admin/analytics — returns viewCount, uniqueVisitors, readCompletion per blog"
 */
import { Module } from '@nestjs/common';
import { PublicAnalyticsController, AdminAnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  providers: [AnalyticsService],
  controllers: [PublicAnalyticsController, AdminAnalyticsController],
})
export class AnalyticsModule {}
