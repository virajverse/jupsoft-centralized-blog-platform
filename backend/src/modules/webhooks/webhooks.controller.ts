import {
  Controller, Get, Post, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { WebhookRetryService } from './webhook-retry.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin / Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/webhooks')
export class WebhooksController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookDispatcher: WebhookDispatcherService,
    private readonly webhookRetry: WebhookRetryService,
  ) {}

  @Get('logs')
  @Roles('Super Admin', 'Website Admin')
  @ApiOperation({ summary: 'Retrieve webhook delivery logs (TRD §13 & §15)' })
  @ApiQuery({ name: 'websiteId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getLogs(
    @Query('websiteId') websiteId?: string,
    @Query('limit') limit?: number,
  ) {
    const where: any = {};
    if (websiteId && websiteId !== 'all') {
      where.websiteId = websiteId;
    }

    const logs = await this.prisma.webhookDeliveryLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit ? Number(limit) : 50,
    });

    return {
      total: logs.length,
      data: logs,
    };
  }

  @Post('revalidate')
  @Roles('Super Admin', 'Website Admin')
  @ApiOperation({ summary: 'Trigger on-demand HMAC cache revalidation webhook' })
  async triggerRevalidate(
    @Body()
    body: {
      websiteId: string;
      slug: string;
      event?: 'blog.published' | 'blog.updated' | 'blog.unpublished' | 'blog.archived';
    },
  ) {
    const event = body.event || 'blog.published';
    await this.webhookDispatcher.dispatchWebhook(body.websiteId, event, body.slug);
    return {
      success: true,
      message: `Revalidate webhook dispatched for website ${body.websiteId}, slug: ${body.slug}`,
      event,
    };
  }

  @Post('retry')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Manually retry failed webhook deliveries' })
  async retryFailed() {
    await this.webhookRetry.retryFailedWebhooks();
    return {
      success: true,
      message: 'Webhook retry worker executed',
    };
  }
}
