import { Module, Global } from '@nestjs/common';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { WebhookRetryService } from './webhook-retry.service';
import { WebhooksController } from './webhooks.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [WebhooksController],
  providers: [WebhookDispatcherService, WebhookRetryService],
  exports: [WebhookDispatcherService],
})
export class WebhooksModule {}

