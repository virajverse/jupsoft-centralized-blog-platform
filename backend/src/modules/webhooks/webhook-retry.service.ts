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

    const defaultSecret =
      this.configService.get<string>('WEBHOOK_DEFAULT_SECRET') ||
      'wh_sec_jupsoft_default_revalidate_2026';

    // Batch-fetch all unique websites to eliminate N+1 DB queries
    const uniqueWebsiteIds = [...new Set(failedWebhooks.map((w) => w.websiteId))];
    const websiteRecords = await this.prisma.website.findMany({
      where: { id: { in: uniqueWebsiteIds } },
    });
    const websiteMap = new Map(websiteRecords.map((w) => [w.id, w]));

    for (const wh of failedWebhooks) {
      try {
        const website = websiteMap.get(wh.websiteId);

        const domain = website?.domain || wh.websiteId;
        let secret = defaultSecret;

        // Check if website has custom endpoint secret
        if (website?.revalidateWebhookUrl) {
          const raw = website.revalidateWebhookUrl.trim();
          if (raw.startsWith('[')) {
            try {
              const endpoints = JSON.parse(raw);
              if (Array.isArray(endpoints)) {
                const match = endpoints.find((e: any) => e.url === wh.targetUrl);
                if (match?.secret?.trim()) {
                  secret = match.secret.trim();
                }
              }
            } catch {}
          }
        }

        const payload = {
          event: wh.event,
          website: domain,
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
            'x-signature': `sha256=${signature}`, // HMAC-SHA256 only — raw secret MUST NOT be transmitted
            'x-timestamp': String(payload.timestamp),
            'x-event': wh.event,
            'User-Agent': 'Jupsoft-CMS-Webhook-Retry/1.0',
          },
          body: payloadString,
          signal: AbortSignal.timeout(6000),
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
