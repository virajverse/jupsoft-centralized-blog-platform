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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { Request } from 'express';

import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

class TrackDto {
  @IsString()
  @IsNotEmpty()
  blogId: string;

  @IsString()
  @IsNotEmpty()
  websiteId: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

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
@SkipThrottle() // TRD §14: tracking must never be blocked by rate limiting
@Controller('v1/track')
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

    // TRD §14: Non-blocking — don't await, return 204 immediately
    this.analyticsService.track({ ...dto, ipAddress }).catch(() => {});
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
  ) {
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
