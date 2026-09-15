/**
 * Webhook Dispatcher Service — TRD §13 (On-Demand Revalidation) + §15 (Security)
 *
 * TRD §15 Security Requirements:
 *   - HMAC-SHA256 signed payloads (x-signature header)
 *   - Timestamp in payload for replay protection (consuming side validates age < 5 min)
 *   - Delivery logged to `webhooks` table (WebhookDeliveryLog)
 *
 * TRD §13: "On publish/update, a webhook triggers on-demand ISR revalidation.
 *           Payload: { event, website, slug, timestamp }. Signed with HMAC-SHA256."
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

export interface WebhookPayload {
  event: 'blog.published' | 'blog.updated' | 'blog.unpublished' | 'blog.archived';
  website: string;
  slug: string;
  timestamp: number; // Unix ms — TRD §15: "replay protection"
}

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async dispatchWebhook(websiteId: string, event: WebhookPayload['event'], slug: string) {
    const website = await this.prisma.website.findUnique({ where: { id: websiteId } });

    if (!website || !website.revalidateWebhookUrl) {
      this.logger.debug(`No revalidate webhook configured for tenant: ${websiteId}`);
      return;
    }

    // TRD §15: HMAC-signed payload — secret MUST come from env, never hardcoded
    const secret = this.configService.get<string>('WEBHOOK_DEFAULT_SECRET');
    if (!secret) {
      this.logger.error(
        '[SECURITY] WEBHOOK_DEFAULT_SECRET is not set. ' +
        'Cannot dispatch HMAC-signed webhook — skipping delivery to prevent unsigned payloads.',
      );
      return;
    }

    const payload: WebhookPayload = {
      event,
      website: website.domain,
      slug,
      timestamp: Date.now(), // TRD §15: "timestamp for replay protection"
    };

    const payloadString = JSON.stringify(payload);

    // TRD §15: "HMAC-SHA256 signature"
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    this.logger.log(
      `⚡ Dispatching ISR Webhook → ${website.revalidateWebhookUrl} (event: ${event}, slug: ${slug})`,
    );

    let statusCode = 0;
    let responseBody = '';
    let delivered = false;

    try {
      const res = await fetch(website.revalidateWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TRD §15: HMAC header — consuming side verifies with same secret
          'x-signature': `sha256=${signature}`,
          'x-timestamp': String(payload.timestamp),
          'User-Agent': 'Jupsoft-CMS-Webhook-Dispatcher/1.0',
        },
        body: payloadString,
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      statusCode = res.status;
      responseBody = await res.text().catch(() => '');
      delivered = res.ok;

      if (res.ok) {
        this.logger.log(`✅ Webhook delivered (${res.status}) to ${website.domain}`);
      } else {
        this.logger.warn(`⚠️ Webhook responded ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      statusCode = 0;
      responseBody = (err as Error).message;
      this.logger.error(
        `❌ Webhook network failure to ${website.revalidateWebhookUrl}: ${(err as Error).message}`,
      );
    }

    // TRD §15 + §17: Log every delivery attempt to `webhooks` table
    try {
      await this.prisma.webhookDeliveryLog.create({
        data: {
          websiteId,
          event,
          slug,
          targetUrl: website.revalidateWebhookUrl,
          statusCode,
          responseBody: responseBody.slice(0, 2000), // cap to 2000 chars
          attempt: 1,
          delivered,
        },
      });
    } catch (logErr) {
      this.logger.error(`Failed to log webhook delivery: ${(logErr as Error).message}`);
    }
  }
}
