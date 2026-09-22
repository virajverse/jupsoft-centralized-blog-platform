/**
 * Analytics Controller — TRD §14 (Analytics & Reporting)
 *
 * Public endpoint:
 *   POST /v1/track       — lightweight fire-and-forget tracking (TRD §14)
 *
 * Admin endpoints:
 *   GET /admin/analytics             — dashboard summary (TRD §14)
 *   GET /admin/analytics/blog/:id   — per-blog detail
 */

import {
  Controller, Post, Get, Body, Param, Query,
  UseGuards, Req, HttpCode, HttpStatus, UsePipes, ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ApiKeyThrottlerGuard } from '../../common/guards/api-key-throttler.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/auth-user.interface';
import { Request } from 'express';
import * as crypto from 'crypto';

import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

class TrackDto {
  @IsString()
  @IsNotEmpty()
  blogId: string;

  @IsString()
  @IsNotEmpty()
  websiteId: string;

  // P0 Fix (C7): sessionId is now optional — legacy SDK builds post
  // { websiteId, slug, blogId } only. The controller generates a fallback
  // so old deployed clients stop receiving 400s (their views were silently
  // dropped by .catch()).
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsString()
  @IsOptional()
  referrer?: string;

  @IsNumber()
  @IsOptional()
  readPercent?: number;

  @IsString()
  @IsOptional()
  event?: 'page_view' | 'read_complete';

  @IsString()
  @IsOptional()
  country?: string;
}

// ─── Public Track Endpoint ────────────────────────────────────────────────────

@ApiTags('Public / Analytics')
// P0 Fix (C3): NO MORE @SkipThrottle() — that allowed unlimited anonymous
// INSERTs into the analytics table (biggest DoS vector in the system).
// Instead: per-API-key throttling (mirrors /v1/* public routes) + ApiKeyGuard
// so only tenants with a valid key can write events.
@Controller('v1/track')
@UseGuards(ApiKeyThrottlerGuard, ApiKeyGuard)
@Throttle({ 'public-api': { limit: 120, ttl: 60000 } })
export class PublicAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT) // 204 — TRD §14: fast, no body response
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }))
  @ApiOperation({ summary: 'Track blog view event — fire-and-forget (TRD §14)' })
  async track(@Body() dto: TrackDto, @Req() req: Request) {
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || '';

    // P0 Fix (C7): fallback sessionId for legacy clients that don't send one
    const sessionId = dto.sessionId?.trim() || `anon-${crypto.randomUUID()}`;

    // TRD §14: Non-blocking — don't await, return 204 immediately.
    // Events are buffered in-memory and flushed in batches (see AnalyticsService).
    this.analyticsService.track({ ...dto, sessionId, ipAddress }).catch(() => {});
    return;
  }
}

// ─── Admin Analytics Dashboard ────────────────────────────────────────────────

@ApiTags('Admin / Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Analytics dashboard — views, unique visitors, referrers by website (TRD §14)' })
  @ApiQuery({ name: 'websiteId', required: true })
  @ApiQuery({ name: 'days', required: false, description: 'Lookback window in days (default: 30)' })
  async getDashboard(
    @Query('websiteId') websiteId: string,
    @Query('days') days?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (user) {
      const isGlobal =
        user.roles?.includes('Super Admin') ||
        user.roleAssignments?.some((ra) => ra.isGlobal && ra.role === 'Website Admin');
      if (!isGlobal) {
        const allowed = (user.roleAssignments || []).filter((ra) => ra.websiteId).map((ra) => ra.websiteId);
        if (!allowed.includes(websiteId)) {
          throw new ForbiddenException(`Access denied: you do not have permission for website "${websiteId}".`);
        }
      }
    }
    return this.analyticsService.getDashboard(websiteId, days ? parseInt(days, 10) : 30);
  }

  @Get('blog/:id')
  @ApiOperation({ summary: 'Per-blog analytics detail (TRD §14)' })
  @ApiQuery({ name: 'days', required: false })
  async getBlogAnalytics(
    @Param('id') blogId: string,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getBlogAnalytics(blogId, days ? parseInt(days, 10) : 30);
  }
}
