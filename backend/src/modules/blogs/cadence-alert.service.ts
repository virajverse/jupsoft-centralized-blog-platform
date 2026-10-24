/**
 * Cadence Alert Service — TRD §7 & Phase 4 Cadence Engine
 * 
 * Scheduled Jobs:
 * 1. Weekly Target Cadence Alert: Every Monday at 10:00 AM IST (04:30 AM UTC: `30 4 * * 1`)
 * 2. Monthly Executive Digest: 1st of every month at 9:00 AM IST (03:30 AM UTC: `30 3 1 * *`)
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisProvider } from '../../common/providers/redis.provider';
import { EmailService } from '../email/email.service';

@Injectable()
export class CadenceAlertService {
  private readonly logger = new Logger(CadenceAlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisProvider,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Weekly Cadence Alert Job
   * Trigger: Every Monday at 10:00 AM IST (04:30 AM UTC)
   */
  @Cron('30 4 * * 1')
  async handleWeeklyCadenceAlert() {
    const lockAcquired = await this.redis.acquireLock('lock:cron:cadence-alert:weekly', 120);
    if (!lockAcquired) {
      this.logger.debug('Weekly cadence alert lock held by another cluster instance. Skipping.');
      return;
    }

    this.logger.log('[CadenceAlert] Running scheduled Weekly Target Cadence Alert job...');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const cycleMonth = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const daysRemaining = Math.max(1, endOfMonth.getDate() - now.getDate());
    const weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7));

    const websites = await this.prisma.website.findMany({
      where: {
        status: 'active',
        targetAlertEnabled: true,
      },
    });

    for (const website of websites) {
      try {
        const targetCount = website.monthlyBlogTarget || 15;

        // Fetch assigned users for this website tenant
        const userAssignments = await this.prisma.userRoleAssignment.findMany({
          where: { websiteId: website.id },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        });

        // Fetch monthly pipeline metrics
        const [publishedBlogs, underReviewCount, draftsCount] = await Promise.all([
          this.prisma.blog.findMany({
            where: {
              websiteId: website.id,
              status: 'Published',
              publishDate: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
            select: {
              id: true,
              authorName: true,
            },
          }),
          this.prisma.blog.count({
            where: {
              websiteId: website.id,
              status: 'Under Review',
            },
          }),
          this.prisma.blog.count({
            where: {
              websiteId: website.id,
              status: 'Draft',
            },
          }),
        ]);

        const publishedCount = publishedBlogs.length;
        const deficit = Math.max(0, targetCount - publishedCount);
        const recommendedWeeklyPace = Math.ceil(deficit / weeksRemaining);

        let pacingStatus: 'BEHIND' | 'CRITICAL' | 'ON_TRACK' = 'ON_TRACK';
        if (deficit > 0) {
          pacingStatus = daysRemaining <= 7 ? 'CRITICAL' : 'BEHIND';
        }

        // Aggregate top contributors for this month
        const authorMap = new Map<string, number>();
        for (const blog of publishedBlogs) {
          const author = blog.authorName || 'Staff Writer';
          authorMap.set(author, (authorMap.get(author) || 0) + 1);
        }
        const contributors = Array.from(authorMap.entries())
          .map(([name, count]) => ({ name, publishedCount: count }))
          .sort((a, b) => b.publishedCount - a.publishedCount)
          .slice(0, 5);

        // Resolve recipients based on website.recipientScope (UI-controlled)
        const scope = website.recipientScope || 'all_stakeholders';
        const recipientEmails = new Set<string>();
        const recipientsList: Array<{ email: string; name: string; userId?: string }> = [];

        const addOwner = () => {
          if (website.ownerEmail && website.ownerEmail.trim()) {
            const clean = website.ownerEmail.trim().toLowerCase();
            if (!recipientEmails.has(clean)) {
              recipientEmails.add(clean);
              recipientsList.push({
                email: website.ownerEmail.trim(),
                name: website.ownerName || 'Website Owner',
              });
            }
          }
        };

        const addNotificationEmails = () => {
          if (Array.isArray(website.notificationEmails)) {
            for (const email of website.notificationEmails) {
              const clean = email.trim().toLowerCase();
              if (clean && !recipientEmails.has(clean)) {
                recipientEmails.add(clean);
                recipientsList.push({ email: clean, name: 'Editorial Stakeholder' });
              }
            }
          }
        };

        const addAdmins = () => {
          for (const assignment of userAssignments) {
            const u = assignment.user;
            if (u && u.email) {
              const clean = u.email.trim().toLowerCase();
              if (!recipientEmails.has(clean)) {
                recipientEmails.add(clean);
                recipientsList.push({ email: u.email, name: u.name, userId: u.id });
              }
            }
          }
        };

        if (scope === 'owner_only') {
          addOwner();
        } else if (scope === 'owner_and_admins') {
          addOwner();
          addAdmins();
        } else if (scope === 'custom_list') {
          addNotificationEmails();
        } else {
          addOwner();
          addNotificationEmails();
          addAdmins();
        }

        const websiteLogoUrl = website.logoUrl && website.logoUrl.trim() !== ''
          ? website.logoUrl
          : undefined;

        // Send alert to all resolved recipients
        for (const r of recipientsList) {
          try {
            await this.emailService.sendTargetCadenceAlert({
              toEmail: r.email,
              toName: r.name,
              websiteName: website.name,
              websiteDomain: website.domain,
              websiteLogoUrl,
              targetCount,
              publishedCount,
              underReviewCount,
              draftsCount,
              cycleMonth,
              daysRemaining,
              pacingStatus,
              recommendedWeeklyPace,
              contributors,
              portalUrl: `https://${website.domain}/workflow`,
            });
          } catch (mErr) {
            this.logger.error(`Failed to send cadence alert email to ${r.email}: ${(mErr as Error).message}`);
          }

          // Create In-App Notification
          try {
            await this.prisma.systemNotification.create({
              data: {
                userId: r.userId || 'usr-superadmin',
                websiteId: website.id,
                title: `Weekly Cadence Alert: ${website.name}`,
                message: `${website.name} has published ${publishedCount}/${targetCount} articles this month (${deficit} needed to hit target). Recommended pace: ${recommendedWeeklyPace} blogs/week.`,
                type: 'TARGET_DEFICIT',
                link: '/workflow',
                isRead: false,
              },
            });
          } catch (nErr) {
            // Non-blocking
          }
        }

        // Update lastTargetAlertSentAt timestamp
        await this.prisma.website.update({
          where: { id: website.id },
          data: { lastTargetAlertSentAt: now },
        });

        this.logger.log(`[CadenceAlert] Weekly Cadence Alert dispatched for ${website.name} (${publishedCount}/${targetCount} blogs, ${recipientsList.length} recipients)`);
      } catch (siteErr) {
        this.logger.error(`Error processing cadence alert for website ${website.name}: ${(siteErr as Error).message}`);
      }
    }
  }

  /**
   * Monthly Executive Digest Job
   * Trigger: 1st of every month at 9:00 AM IST (03:30 AM UTC)
   */
  @Cron('30 3 1 * *')
  async handleMonthlyExecutiveDigest() {
    const lockAcquired = await this.redis.acquireLock('lock:cron:monthly-executive-digest', 120);
    if (!lockAcquired) {
      this.logger.debug('Monthly executive digest lock held by another cluster instance. Skipping.');
      return;
    }

    this.logger.log('[CadenceAlert] Running scheduled Monthly Executive Digest job for previous month...');
    const now = new Date();
    // Prior month range
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const cycleMonth = prevMonthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const websites = await this.prisma.website.findMany({
      where: { status: 'active' },
    });

    for (const website of websites) {
      try {
        const targetCount = website.monthlyBlogTarget || 15;

        // Fetch assigned users for this website tenant
        const userAssignments = await this.prisma.userRoleAssignment.findMany({
          where: { websiteId: website.id },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        });

        // Query published blogs for previous month
        const publishedBlogs = await this.prisma.blog.findMany({
          where: {
            websiteId: website.id,
            status: 'Published',
            publishDate: {
              gte: prevMonthStart,
              lte: prevMonthEnd,
            },
          },
          include: {
            translations: {
              where: { lang: website.defaultLanguage },
              take: 1,
            },
          },
          orderBy: { viewCount: 'desc' },
        });

        const publishedCount = publishedBlogs.length;
        const totalViews = publishedBlogs.reduce((acc, b) => acc + (b.viewCount || 0), 0);

        // Top 5 articles
        const topArticles = publishedBlogs.slice(0, 5).map((b) => ({
          title: b.translations[0]?.title || 'Untitled Post',
          slug: b.translations[0]?.slug || 'article',
          views: b.viewCount || 0,
          publishDate: b.publishDate?.toISOString().split('T')[0],
        }));

        // Top authors
        const authorMap = new Map<string, number>();
        for (const blog of publishedBlogs) {
          const author = blog.authorName || 'Staff Writer';
          authorMap.set(author, (authorMap.get(author) || 0) + 1);
        }
        const topAuthors = Array.from(authorMap.entries())
          .map(([name, blogCount]) => ({ name, blogCount }))
          .sort((a, b) => b.blogCount - a.blogCount)
          .slice(0, 5);

        // Resolve recipients based on website.recipientScope (UI-controlled)
        const scope = website.recipientScope || 'all_stakeholders';
        const recipientEmails = new Set<string>();
        const recipientsList: Array<{ email: string; name: string; userId?: string }> = [];

        const addOwner = () => {
          if (website.ownerEmail && website.ownerEmail.trim()) {
            const clean = website.ownerEmail.trim().toLowerCase();
            if (!recipientEmails.has(clean)) {
              recipientEmails.add(clean);
              recipientsList.push({
                email: website.ownerEmail.trim(),
                name: website.ownerName || 'Website Owner',
              });
            }
          }
        };

        const addNotificationEmails = () => {
          if (Array.isArray(website.notificationEmails)) {
            for (const email of website.notificationEmails) {
              const clean = email.trim().toLowerCase();
              if (clean && !recipientEmails.has(clean)) {
                recipientEmails.add(clean);
                recipientsList.push({ email: clean, name: 'Executive Stakeholder' });
              }
            }
          }
        };

        const addAdmins = () => {
          for (const assignment of userAssignments) {
            const u = assignment.user;
            if (u && u.email) {
              const clean = u.email.trim().toLowerCase();
              if (!recipientEmails.has(clean)) {
                recipientEmails.add(clean);
                recipientsList.push({ email: u.email, name: u.name, userId: u.id });
              }
            }
          }
        };

        if (scope === 'owner_only') {
          addOwner();
        } else if (scope === 'owner_and_admins') {
          addOwner();
          addAdmins();
        } else if (scope === 'custom_list') {
          addNotificationEmails();
        } else {
          addOwner();
          addNotificationEmails();
          addAdmins();
        }

        const websiteLogoUrl = website.logoUrl && website.logoUrl.trim() !== ''
          ? website.logoUrl
          : undefined;

        for (const r of recipientsList) {
          try {
            await this.emailService.sendMonthlyExecutiveDigest({
              toEmail: r.email,
              toName: r.name,
              websiteName: website.name,
              websiteDomain: website.domain,
              websiteLogoUrl,
              cycleMonth,
              targetCount,
              publishedCount,
              totalViews,
              topArticles,
              topAuthors,
              portalUrl: `https://${website.domain}/dashboard`,
            });
          } catch (mErr) {
            this.logger.error(`Failed to send monthly digest email to ${r.email}: ${(mErr as Error).message}`);
          }

          // In-App System Notification
          try {
            const pct = Math.round((publishedCount / targetCount) * 100);
            await this.prisma.systemNotification.create({
              data: {
                userId: r.userId || 'usr-superadmin',
                websiteId: website.id,
                title: `Monthly Executive Digest: ${website.name} (${cycleMonth})`,
                message: `${website.name} published ${publishedCount} of ${targetCount} targeted blogs (${pct}% quota completion) with ${totalViews.toLocaleString()} total views in ${cycleMonth}.`,
                type: 'SYSTEM_ALERT',
                link: '/dashboard',
                isRead: false,
              },
            });
          } catch (nErr) {
            // Non-blocking
          }
        }

        this.logger.log(`[CadenceAlert] Monthly Executive Digest dispatched for ${website.name} (${publishedCount}/${targetCount} blogs, ${recipientsList.length} recipients)`);
      } catch (siteErr) {
        this.logger.error(`Error processing monthly digest for website ${website.name}: ${(siteErr as Error).message}`);
      }
    }
  }
}
