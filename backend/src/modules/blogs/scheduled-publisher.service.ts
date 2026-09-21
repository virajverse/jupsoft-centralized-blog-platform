/**
 * Scheduled Publisher Service — TRD §7 (Blog Management Workflow) + §20 (Development Phases)
 *
 * Runs a background cron every minute:
 *   1. Queries database for blogs with status 'Scheduled' and scheduledAt <= NOW()
 *   2. Transitions status: 'Scheduled' -> 'Published'
 *   3. Writes workflow_log: from 'Scheduled' to 'Published', changedBy: 'System Scheduler'
 *   4. Invalidates Redis caches for the affected website and slug
 *   5. Dispatches on-demand ISR revalidation webhook to consumer site
 *   6. Logs audit record
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisProvider } from '../../common/providers/redis.provider';
import { WebhookDispatcherService } from '../webhooks/webhook-dispatcher.service';

@Injectable()
export class ScheduledPublisherService {
  private readonly logger = new Logger(ScheduledPublisherService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisProvider,
    private webhookDispatcher: WebhookDispatcherService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledPublishing() {
    // Cluster Coordination: Ensure only one instance processes scheduled publishing per minute
    const lockAcquired = await this.redis.acquireLock('lock:cron:scheduled-publisher', 50);
    if (!lockAcquired) {
      return;
    }

    const now = new Date();

    const dueBlogs = await this.prisma.blog.findMany({
      where: {
        status: 'Scheduled',
        scheduledAt: { lte: now },
      },
      include: {
        website: true,
        translations: true,
      },
    });

    if (dueBlogs.length === 0) return;

    this.logger.log(`Found ${dueBlogs.length} scheduled article(s) due for publishing.`);

    for (const blog of dueBlogs) {
      try {
        await this.prisma.blog.update({
          where: { id: blog.id },
          data: {
            status: 'Published',
            publishDate: now,
          },
        });

        // Record workflow log
        await this.prisma.workflowLog.create({
          data: {
            blogId: blog.id,
            fromStatus: 'Scheduled',
            toStatus: 'Published',
            changedBy: 'System Scheduler',
            role: 'Publisher',
            notes: `Auto-published by scheduled cron worker at ${now.toISOString()}`,
          },
        });

        // Record system audit log
        await this.prisma.systemAuditLog.create({
          data: {
            userName: 'System Scheduler',
            role: 'Publisher',
            websiteId: blog.websiteId,
            event: 'blog.published',
            ipAddress: 'system-cron',
            details: `Auto-published scheduled blog "${blog.id}" for domain ${blog.website.domain}.`,
          },
        });

        // Invalidate Redis caches
        await this.redis.delPattern(`blog:${blog.websiteId}:*`);
        await this.redis.delPattern(`blogs:${blog.websiteId}:*`);
        await this.redis.delPattern(`search:${blog.websiteId}:*`);
        await this.redis.delPattern('admin:blogs:*');

        // Dispatch ISR revalidation webhook for each translation slug
        for (const t of blog.translations) {
          await this.webhookDispatcher.dispatchWebhook(blog.websiteId, 'blog.published', t.slug);
        }

        this.logger.log(`✅ Auto-published scheduled article: ${blog.id} (${blog.website.domain})`);
      } catch (err) {
        this.logger.error(`Failed to auto-publish scheduled article ${blog.id}: ${(err as Error).message}`);
      }
    }
  }
}
