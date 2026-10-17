import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/auth-user.interface';

@ApiTags('Admin / System Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller(['admin/notifications', 'notifications'])
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user notifications and unread count' })
  @ApiQuery({ name: 'websiteId', required: false })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query('websiteId') websiteId?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const role = user.roles?.[0] || 'User';
    const isUnread = unreadOnly === 'true' || unreadOnly === '1';
    return this.notificationsService.getUserNotifications(user.id, role, websiteId, isUnread);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const role = user.roles?.[0] || 'User';
    return this.notificationsService.markAsRead(id, user.id, role);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all unread notifications as read' })
  @ApiQuery({ name: 'websiteId', required: false })
  async markAllAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Query('websiteId') websiteId?: string,
  ) {
    const role = user.roles?.[0] || 'User';
    return this.notificationsService.markAllAsRead(user.id, role, websiteId);
  }
}
