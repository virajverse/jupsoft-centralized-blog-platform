import { Module } from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { BlogsController } from './blogs.controller';
import { ScheduledPublisherService } from './scheduled-publisher.service';
import { RedisModule } from '../../common/providers/redis.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [RedisModule, EmailModule],
  providers: [BlogsService, ScheduledPublisherService],
  controllers: [BlogsController],
  exports: [BlogsService, ScheduledPublisherService],
})
export class BlogsModule {}
