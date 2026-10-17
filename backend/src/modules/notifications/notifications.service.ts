import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateSystemNotificationDto {
  userId?: string;
  websiteId: string;
  title: string;
  message: string;
  type?: 'TARGET_DEFICIT' | 'BLOG_PUBLISHED' | 'PIPELINE_STUCK' | 'SYSTEM_ALERT';
  link?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieve notifications for a user/role, optionally scoped to a website tenant.
   */
  async getUserNotifications(userId: string, role: string, websiteId?: string, unreadOnly?: boolean) {
    const isSuperAdmin = role === 'Super Admin';

    const whereClause: any = {};

    if (unreadOnly) {
      whereClause.isRead = false;
    }

    if (websiteId && websiteId !== 'all') {
      whereClause.websiteId = websiteId;
    }

    if (!isSuperAdmin) {
      // Non-super-admins see notifications targeted to their user ID or their assigned website
      whereClause.OR = [
        { userId },
        ...(websiteId && websiteId !== 'all' ? [{ websiteId }] : []),
      ];
    }

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.systemNotification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          website: {
            select: { id: true, name: true, domain: true, logoUrl: true },
          },
        },
      }),
      this.prisma.systemNotification.count({
        where: {
          ...whereClause,
          isRead: false,
        },
      }),
    ]);

    return {
      notifications,
      unreadCount,
    };
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(id: string, userId: string, role: string) {
    const isSuperAdmin = role === 'Super Admin';

    const notification = await this.prisma.systemNotification.findUnique({
      where: { id },
    });

    if (!notification) {
      return { success: false, message: 'Notification not found' };
    }

    if (!isSuperAdmin && notification.userId && notification.userId !== userId) {
      // Allow marking as read if it's general for the tenant
    }

    await this.prisma.systemNotification.update({
      where: { id },
      data: { isRead: true },
    });

    return { success: true };
  }

  /**
   * Mark all unread notifications as read.
   */
  async markAllAsRead(userId: string, role: string, websiteId?: string) {
    const isSuperAdmin = role === 'Super Admin';

    const whereClause: any = { isRead: false };

    if (websiteId && websiteId !== 'all') {
      whereClause.websiteId = websiteId;
    }

    if (!isSuperAdmin) {
      whereClause.OR = [
        { userId },
        ...(websiteId && websiteId !== 'all' ? [{ websiteId }] : []),
      ];
    }

    const res = await this.prisma.systemNotification.updateMany({
      where: whereClause,
      data: { isRead: true },
    });

    return { success: true, count: res.count };
  }

  /**
   * Create an in-app system notification record.
   */
  async createNotification(dto: CreateSystemNotificationDto) {
    try {
      const notification = await this.prisma.systemNotification.create({
        data: {
          userId: dto.userId || 'usr-superadmin',
          websiteId: dto.websiteId,
          title: dto.title,
          message: dto.message,
          type: dto.type || 'TARGET_DEFICIT',
          link: dto.link || '/blogs/new',
          isRead: false,
        },
      });
      return notification;
    } catch (err) {
      this.logger.error(`Failed to create system notification: ${(err as Error).message}`);
      return null;
    }
  }
}
