/**
 * Analytics Service — TRD §14 (Analytics & Reporting)
 *
 * TRD §14 Requirements:
 *   - "Track page views per blog, per website"
 *   - "Unique visitor count using sessionId deduplication"
 *   - "Read-completion events (readPercent)"
 *   - "Referrer tracking"
 *   - "Response time: <50ms (fire-and-forget, non-blocking)"
 *   - "Aggregate: viewCount, uniqueVisitors, avgReadPercent, topReferrers"
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisProvider } from '../../common/providers/redis.provider';
import * as crypto from 'crypto';

export interface TrackEventDto {
  blogId: string;
  websiteId: string;
  sessionId: string;   // TRD §14: unique visitor dedup
  referrer?: string;
  readPercent?: number; // 0–100
  event?: 'page_view' | 'read_complete';
  ipAddress?: string;  // TRD §14: will be hashed for privacy
  country?: string;
}

@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisProvider,
  ) {}

  /**
   * TRD §14: "fire-and-forget — never slows page delivery"
   * Called from controller. Does NOT block response — async processing.
   */
  async track(dto: TrackEventDto): Promise<void> {
    // Hash IP for privacy (TRD §14: "privacy-safe analytics")
    const ipHash = dto.ipAddress
      ? crypto.createHash('sha256').update(dto.ipAddress).digest('hex').slice(0, 16)
      : '';

    try {
      await this.prisma.analyticsEvent.create({
        data: {
          blogId: dto.blogId,
          websiteId: dto.websiteId,
          sessionId: dto.sessionId,
          ipHash,
          country: dto.country || '',
          referrer: dto.referrer || '',
          readPercent: dto.readPercent ?? 0,
          event: dto.event || 'page_view',
        },
      });

      // TRD §14 + PERF-002: Increment view counter on blog record via atomic Redis buffer
      if (dto.event === 'page_view' || !dto.event) {
        await this.redis.bufferViewIncrement(dto.blogId).catch(() => {});
      }
    } catch (err) {
      // Non-blocking: log but never throw
      this.logger.error(`Analytics track failed: ${(err as Error).message}`);
    }
  }

  /**
   * TRD §14: Dashboard analytics — GET /admin/analytics
   * Returns per-blog stats for a website.
   */
  async getDashboard(websiteId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Aggregate analytics per blog
    const events = await this.prisma.analyticsEvent.groupBy({
      by: ['blogId', 'event'],
      where: { websiteId, timestamp: { gte: since } },
      _count: { id: true },
      _avg: { readPercent: true },
    });

    // Unique visitors per blog (computed natively in PostgreSQL engine with zero heap memory overhead)
    const uniqueRaw = await this.prisma.$queryRaw<Array<{ blogId: string; uniqueVisitors: number }>>`
      SELECT "blogId", COUNT(DISTINCT "sessionId")::int AS "uniqueVisitors"
      FROM "analytics"
      WHERE "websiteId" = ${websiteId} AND "timestamp" >= ${since}
      GROUP BY "blogId"
    `;

    // Top referrers
    const referrers = await this.prisma.analyticsEvent.groupBy({
      by: ['referrer'],
      where: { websiteId, timestamp: { gte: since }, referrer: { not: '' } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Blog view totals from blogs table
    const blogs = await this.prisma.blog.findMany({
      where: { websiteId },
      select: {
        id: true,
        viewCount: true,
        translations: {
          where: { lang: 'en' },
          select: { title: true, slug: true },
        },
      },
      orderBy: { viewCount: 'desc' },
      take: 20,
    });

    // Build unique visitors map (O(1) dictionary lookup)
    const uniquePerBlog: Record<string, number> = {};
    for (const row of uniqueRaw) {
      uniquePerBlog[row.blogId] = Number(row.uniqueVisitors) || 0;
    }

    const blogStats = blogs.map((b) => {
      const pageViewEvent = events.find((e) => e.blogId === b.id && e.event === 'page_view');
      const readEvent = events.find((e) => e.blogId === b.id && e.event === 'read_complete');

      return {
        blogId: b.id,
        title: b.translations[0]?.title || b.id,
        slug: b.translations[0]?.slug || '',
        totalViews: b.viewCount,
        trackedViews: pageViewEvent?._count?.id ?? 0,
        readCompletes: readEvent?._count?.id ?? 0,
        uniqueVisitors: uniquePerBlog[b.id] ?? 0,
        avgReadPercent: Math.round(pageViewEvent?._avg?.readPercent ?? 0),
      };
    });

    return {
      success: true,
      period: { days, since: since.toISOString() },
      summary: {
        totalPageViews: blogStats.reduce((s, b) => s + b.trackedViews, 0),
        totalUniqueVisitors: Object.values(uniquePerBlog).reduce((s, count) => s + count, 0),
      },
      topReferrers: referrers.map((r) => ({ referrer: r.referrer, count: r._count.id })),
      blogs: blogStats,
    };
  }

  /**
   * TRD §14: Per-blog analytics detail
   */
  async getBlogAnalytics(blogId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalEvents, uniqueResult, dailyViews] = await Promise.all([
      this.prisma.analyticsEvent.count({ where: { blogId, timestamp: { gte: since } } }),
      this.prisma.$queryRaw<Array<{ uniqueCount: number }>>`
        SELECT COUNT(DISTINCT "sessionId")::int AS "uniqueCount"
        FROM "analytics"
        WHERE "blogId" = ${blogId} AND "timestamp" >= ${since}
      `,
      this.prisma.analyticsEvent.groupBy({
        by: ['timestamp'],
        where: { blogId, timestamp: { gte: since }, event: 'page_view' },
        _count: { id: true },
      }),
    ]);

    const uniqueVisitors = Number(uniqueResult[0]?.uniqueCount) || 0;

    return {
      success: true,
      blogId,
      period: { days, since: since.toISOString() },
      totalEvents,
      uniqueVisitors,
      dailyViews: dailyViews.length,
    };
  }

  // ─── PERF-002: Batch View Count Persistence ────────────────────────────

  /**
   * PERF-002: Periodic batch persistence of buffered blog view counts.
   * Runs every minute. Uses distributed lock to ensure only one cluster replica flushes to PostgreSQL.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async flushViewCountBuffer(): Promise<void> {
    const lockAcquired = await this.redis.acquireLock('lock:cron:flush-view-counts', 50);
    if (!lockAcquired) {
      return;
    }

    try {
      await this.persistBufferedViews();
    } catch (err: any) {
      this.logger.error(`[AnalyticsService] Error in scheduled view count flush: ${err.message}`);
    }
  }

  /**
   * Graceful shutdown hook: flushes any remaining buffered views to database
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.persistBufferedViews();
    } catch (err: any) {
      this.logger.warn(`[AnalyticsService] Shutdown view flush warning: ${err.message}`);
    }
  }

  /**
   * Atomically drains the Redis/memory view count buffer and executes batched updates to PostgreSQL.
   * Eliminates single-row lock contention: 10,000 viral views become 1 atomic batch update!
   */
  async persistBufferedViews(): Promise<void> {
    const counts = await this.redis.drainViewCountBuffer();
    const entries = Object.entries(counts);
    if (entries.length === 0) return;

    this.logger.log(`[AnalyticsService] Persisting buffered view counts for ${entries.length} blog(s)...`);

    try {
      // Execute batched SQL updates in chunks of 100
      for (let i = 0; i < entries.length; i += 100) {
        const batch = entries.slice(i, i + 100);
        await this.prisma.$transaction(
          batch.map(([blogId, count]) =>
            this.prisma.$executeRawUnsafe(
              'UPDATE blogs SET view_count = view_count + $1 WHERE id = $2',
              count,
              blogId,
            ),
          ),
        );
      }
      this.logger.log(`[AnalyticsService] Successfully persisted view counts for ${entries.length} blog(s).`);
    } catch (err: any) {
      this.logger.error(
        `[AnalyticsService] Failed to persist view counts to database (${err.message}). Restoring to buffer to prevent data loss.`,
      );
      // Re-buffer the counts so they are preserved for the next flush cycle
      await Promise.allSettled(
        entries.map(([blogId, count]) => this.redis.bufferViewIncrement(blogId, count)),
      );
      throw err;
    }
  }
}

