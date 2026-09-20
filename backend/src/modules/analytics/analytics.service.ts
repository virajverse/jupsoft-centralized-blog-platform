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

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

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

      // TRD §14: Increment view counter on blog record atomically without changing updatedAt
      if (dto.event === 'page_view' || !dto.event) {
        await this.prisma
          .$executeRawUnsafe('UPDATE blogs SET view_count = view_count + 1 WHERE id = $1', dto.blogId)
          .catch(() => {});
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

    // Unique visitors per blog (distinct sessionIds)
    const uniqueRaw = await this.prisma.analyticsEvent.groupBy({
      by: ['blogId', 'sessionId'],
      where: { websiteId, timestamp: { gte: since } },
    });

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

    // Build unique visitors map
    const uniquePerBlog: Record<string, Set<string>> = {};
    for (const row of uniqueRaw) {
      if (!uniquePerBlog[row.blogId]) uniquePerBlog[row.blogId] = new Set();
      uniquePerBlog[row.blogId].add(row.sessionId);
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
        uniqueVisitors: uniquePerBlog[b.id]?.size ?? 0,
        avgReadPercent: Math.round(pageViewEvent?._avg?.readPercent ?? 0),
      };
    });

    return {
      success: true,
      period: { days, since: since.toISOString() },
      summary: {
        totalPageViews: blogStats.reduce((s, b) => s + b.trackedViews, 0),
        totalUniqueVisitors: Object.values(uniquePerBlog).reduce((s, set) => s + set.size, 0),
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

    const [totalEvents, uniqueSessions, dailyViews] = await Promise.all([
      this.prisma.analyticsEvent.count({ where: { blogId, timestamp: { gte: since } } }),
      this.prisma.analyticsEvent.groupBy({
        by: ['sessionId'],
        where: { blogId, timestamp: { gte: since } },
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ['timestamp'],
        where: { blogId, timestamp: { gte: since }, event: 'page_view' },
        _count: { id: true },
      }),
    ]);

    return {
      success: true,
      blogId,
      period: { days, since: since.toISOString() },
      totalEvents,
      uniqueVisitors: uniqueSessions.length,
      dailyViews: dailyViews.length,
    };
  }
}
