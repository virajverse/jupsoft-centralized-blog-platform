import { Module } from '@nestjs/common';
import { PublicV1Service } from './public-v1.service';
import { PublicV1Controller } from './public-v1.controller';
import { RedisModule } from '../../common/providers/redis.module';
import { ApiKeyThrottlerGuard } from '../../common/guards/api-key-throttler.guard';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [RedisModule, AnalyticsModule],
  providers: [PublicV1Service, ApiKeyThrottlerGuard],
  controllers: [PublicV1Controller],
  exports: [PublicV1Service],
})
export class PublicV1Module {}

