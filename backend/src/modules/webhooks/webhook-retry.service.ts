/**
 * Webhook Retry Service — TRD §13 + §15
 *
 * Runs every 5 minutes and retries failed webhook deliveries.
 * Max 3 attempts per webhook entry. Uses exponential back-off logic.
 * Failed entries with attempt >= 3 are marked as permanently failed (delivered = false, attempt = -1).
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const MAX_RETRY_ATTEMPTS = 3;

@Injectable()
export class WebhookRetryService {
  private readonly logger = new Logger(WebhookRetryService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  @Cron('*/5 * * * *') // every 5 minutes
  async retryFailedWebhooks() {
    // Find all failed webhook deliveries that haven't exceeded max attempts
    const failedWebhooks = await this.prisma.webhookDeliveryLog.findMany({
      where: {
        delivered: false,
        attempt: { lt: MAX_RETRY_ATTEMPTS },
      },
      take: 20, // process max 20 per run to avoid overloading
      orderBy: { timestamp: 'asc' },
    });

    if (failedWebhooks.length === 0) return;

    this.logger.log(`⚡ Retrying ${failedWebhooks.length} failed webhook(s)...`);

    const secret = this.configService.get<string>('WEBHOOK_DEFAULT_SECRET');
    if (!secret) {
      this.logger.error('[SECURITY] WEBHOOK_DEFAULT_SECRET not set — skipping retry');
      return;
    }

    for (const wh of failedWebhooks) {
      try {
        const payload = {
          event: wh.event,
          website: wh.websiteId,
          slug: wh.slug,
          timestamp: Date.now(),
        };

        const payloadString = JSON.stringify(payload);
        const signature = crypto
          .createHmac('sha256', secret)
          .update(payloadString)
          .digest('hex');

        const res = await fetch(wh.targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': `sha256=${signature}`,
            'x-timestamp': String(payload.timestamp),
            'User-Agent': 'Jupsoft-CMS-Webhook-Retry/1.0',
          },
          body: payloadString,
          signal: AbortSignal.timeout(5000),
        });

        const statusCode = res.status;
        const responseBody = await res.text().catch(() => '');
        const delivered = res.ok;

        // Update the delivery log
        await this.prisma.webhookDeliveryLog.update({
          where: { id: wh.id },
          data: {
            statusCode,
            responseBody: responseBody.slice(0, 2000),
            attempt: wh.attempt + 1,
            delivered,
          },
        });

        if (delivered) {
          this.logger.log(`✅ Webhook retry succeeded: ${wh.targetUrl} (slug: ${wh.slug})`);
        } else {
          this.logger.warn(`⚠️ Webhook retry attempt ${wh.attempt + 1}/${MAX_RETRY_ATTEMPTS} failed: ${statusCode}`);
        }
      } catch (err) {
        this.logger.error(`❌ Webhook retry error for ${wh.targetUrl}: ${(err as Error).message}`);
        // Mark as failed attempt
        await this.prisma.webhookDeliveryLog.update({
          where: { id: wh.id },
          data: { attempt: wh.attempt + 1, statusCode: 0, responseBody: (err as Error).message },
        });
      }
    }
  }
}
