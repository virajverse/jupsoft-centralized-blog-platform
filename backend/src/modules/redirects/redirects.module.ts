import { Module } from '@nestjs/common';
import { RedirectsService } from './redirects.service';
import { RedirectsController } from './redirects.controller';
import { RedisModule } from '../../common/providers/redis.module';

@Module({
  imports: [RedisModule],
  providers: [RedirectsService],
  controllers: [RedirectsController],
  exports: [RedirectsService],
})
export class RedirectsModule {}
