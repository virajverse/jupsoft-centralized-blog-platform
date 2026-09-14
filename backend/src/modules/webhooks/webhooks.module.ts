import { Module, Global } from '@nestjs/common';
import { WebhookDispatcherService } from './webhook-dispatcher.service';

@Global()
@Module({
  providers: [WebhookDispatcherService],
  exports: [WebhookDispatcherService],
})
export class WebhooksModule {}
