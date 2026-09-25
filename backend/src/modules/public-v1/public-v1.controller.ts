import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  Header,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { PublicV1Service } from './public-v1.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ApiKeyThrottlerGuard } from '../../common/guards/api-key-throttler.guard';
import { AnalyticsService } from '../analytics/analytics.service';

@ApiTags('Public Consumer API (v1)')
@Controller('v1')
// Skip the global IP-based throttler; apply per-API-key throttler instead (TRD §15)
@SkipThrottle({ global: true })
@UseGuards(ApiKeyThrottlerGuard)
@Throttle({ 'public-api': { limit: 120, ttl: 60000 } })
export class PublicV1Controller {
  constructor(
    private readonly publicV1Service: PublicV1Service,
    private readonly analyticsService: AnalyticsService,
  ) {}

  private applyCacheHeaders(res: any, req: any, fresh?: string): boolean {
    const isBypass =
      fresh === '1' ||
      fresh === 'true' ||
      req?.headers?.['cache-control']?.includes('no-cache') ||
      req?.headers?.pragma === 'no-cache';

    if (res && typeof res.setHeader === 'function') {
      if (isBypass) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        // Ultra-responsive edge cache (5s CDN cache + 10s stale-while-revalidate)
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=5, stale-while-revalidate=10, must-revalidate');
      }
    }
    return isBypass;
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint for status monitoring' })
  async healthCheck() {
    const isRedisActive = await this.publicV1Service.checkRedis();
    return {
      status: 'ok',
      redis: isRedisActive ? 'connected' : 'offline',
      service: 'Jupsoft Centralized CMS Backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Post('revalidate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'On-demand cache revalidation endpoint (TRD §13 & §15)' })
  async revalidateCache(
    @Req() req: any,
    @Body() body: any,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-hub-signature-256') xHubSignature?: string,
    @Headers('x-event') xEvent?: string,
    @Query('website') queryWebsite?: string,
  ) {
    const payload = body || {};
    const event = payload.event || xEvent || 'test';
    const slug = payload.slug || 'all';
    const websiteDomainOrId = payload.website || queryWebsite || req.headers?.['x-website-id'] || 'all';

    // Invalidate Redis caches for published blogs and search
    await this.publicV1Service.invalidateBlogCache(websiteDomainOrId, slug);

    return {
      success: true,
      revalidated: true,
      event,
      slug,
      website: websiteDomainOrId,
      message: 'Cache revalidation ping acknowledged successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('blogs')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'Authorization', description: 'Bearer <tenant_api_key>', required: true })
  @ApiOperation({ summary: 'List published articles for consuming website (Paginated, ISR-ready)' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'lang', required: false, example: 'en' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'fresh', required: false, example: '1', description: 'Bypass cache for real-time fresh data' })
  async getPublishedBlogs(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('lang') lang?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('fresh') fresh?: string,
  ) {
    const websiteId = req.tenant.id;
    const bypassCache = this.applyCacheHeaders(res, req, fresh);
    return this.publicV1Service.getPublishedBlogs({
      websiteId,
      category,
      tag,
      lang: lang || req.tenant.defaultLanguage || 'en',
      page: page ? Number(page) : 1,
      limit: limit ? (Number(limit) === 9 ? 10 : Number(limit)) : 10,
      bypassCache,
    });
  }

  // ─── TRD §12: GET /blogs/latest?website= (Latest published blogs) ─────────
  @Get('blogs/latest')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Retrieve latest published blogs for consuming website (TRD §12)' })
  @ApiQuery({ name: 'website', required: false, description: 'Website slug or domain' })
  @ApiQuery({ name: 'lang', required: false, example: 'en' })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  @ApiQuery({ name: 'fresh', required: false, example: '1' })
  async getLatestBlogs(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
    @Query('lang') lang?: string,
    @Query('limit') limit?: number,
    @Query('fresh') fresh?: string,
  ) {
    this.applyCacheHeaders(res, req, fresh);
    return this.publicV1Service.getLatestBlogs(
      req.tenant.id,
      lang || req.tenant.defaultLanguage || 'en',
      limit ? Number(limit) : 5,
    );
  }

  // ─── TRD §12: GET /blogs/popular?website= (Most-viewed blogs) ─────────────
  @Get('blogs/popular')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Retrieve most-viewed popular blogs for consuming website (TRD §12)' })
  @ApiQuery({ name: 'website', required: false, description: 'Website slug or domain' })
  @ApiQuery({ name: 'lang', required: false, example: 'en' })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  @ApiQuery({ name: 'fresh', required: false, example: '1' })
  async getPopularBlogs(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
    @Query('lang') lang?: string,
    @Query('limit') limit?: number,
    @Query('fresh') fresh?: string,
  ) {
    this.applyCacheHeaders(res, req, fresh);
    return this.publicV1Service.getPopularBlogs(
      req.tenant.id,
      lang || req.tenant.defaultLanguage || 'en',
      limit ? Number(limit) : 5,
    );
  }

  @Get('blogs/:slug')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'Authorization', description: 'Bearer <tenant_api_key>', required: true })
  @ApiOperation({ summary: 'Retrieve full published post with SEO meta and Schema.org JSON-LD' })
  @ApiQuery({ name: 'lang', required: false, example: 'en' })
  @ApiQuery({ name: 'fresh', required: false, example: '1', description: 'Bypass cache for real-time fresh data' })
  async getBlogBySlug(
    @Param('slug') slug: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
    @Query('lang') lang?: string,
    @Query('fresh') fresh?: string,
  ) {
    const websiteId = req.tenant.id;
    const bypassCache = this.applyCacheHeaders(res, req, fresh);
    const result = await this.publicV1Service.getBlogBySlug(slug, websiteId, lang || 'en', bypassCache, !!lang);

    // ── Auto Server-Side View Tracking (TRD §14) ───────────────────────
    // Fire-and-forget: never blocks the blog response. IP dedup handled inside AnalyticsService.
    if (result && (result as any).data?.id) {
      const blogId = (result as any).data.id;
      const ipAddress =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        '';
      // Unique session per IP+day (no cookies needed, privacy-safe)
      const sessionId = `auto_${blogId}_${ipAddress}`;
      this.analyticsService
        .track({ blogId, websiteId, sessionId, ipAddress, event: 'page_view' })
        .catch(() => {});
    }

    return result;
  }

  @Get('categories')
  @UseGuards(ApiKeyGuard)
  @Header('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=20, must-revalidate')
  @ApiHeader({ name: 'Authorization', description: 'Bearer <tenant_api_key>', required: true })
  @ApiOperation({ summary: 'Retrieve taxonomy category tree for consuming website' })
  async getCategories(@Req() req: any, @Query('websiteId') queryWebsiteId?: string) {
    if (queryWebsiteId && queryWebsiteId !== req.tenant.id) {
      throw new ForbiddenException(
        `Access denied: cannot access categories for another website.`,
      );
    }
    return this.publicV1Service.getCategories(req.tenant.id);
  }

  @Get('tags')
  @UseGuards(ApiKeyGuard)
  @Header('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=20, must-revalidate')
  @ApiHeader({ name: 'Authorization', description: 'Bearer <tenant_api_key>', required: true })
  @ApiOperation({ summary: 'Retrieve tags list for consuming website' })
  async getTags(@Req() req: any, @Query('websiteId') queryWebsiteId?: string) {
    if (queryWebsiteId && queryWebsiteId !== req.tenant.id) {
      throw new ForbiddenException(
        `Access denied: cannot access tags for another website.`,
      );
    }
    return this.publicV1Service.getTags(req.tenant.id);
  }

  @Get('search')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'Authorization', description: 'Bearer <tenant_api_key>', required: true })
  @ApiOperation({ summary: 'Full-text search published articles by keyword' })
  @ApiQuery({ name: 'q', required: true, example: 'enterprise' })
  @ApiQuery({ name: 'lang', required: false, example: 'en' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async search(
    @Query('q') q: string,
    @Req() req: any,
    @Query('lang') lang?: string,
    @Query('limit') limit?: number,
  ) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 50));
    return this.publicV1Service.search(q || '', req.tenant.id, lang || 'en', safeLimit);
  }

  @Get('website')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Retrieve tenant website configuration & metadata directly from database' })
  async getWebsiteInfo(@Req() req: any) {
    const tenant = req.tenant;
    return {
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        status: tenant.status,
        s3Prefix: tenant.s3Prefix,
        revalidateWebhookUrl: tenant.revalidateWebhookUrl,
        defaultLanguage: tenant.defaultLanguage || 'en',
      },
    };
  }

  @Get('redirects')
  @UseGuards(ApiKeyGuard)
  @Header('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=20, must-revalidate')
  @ApiOperation({ summary: 'Retrieve active 301 permanent redirect rules for consuming website (Edge Middleware ready)' })
  async getRedirects(@Req() req: any) {
    return this.publicV1Service.getRedirects(req.tenant.id);
  }
}

