import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { PublicV1Service } from './public-v1.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ApiKeyThrottlerGuard } from '../../common/guards/api-key-throttler.guard';

@ApiTags('Public Consumer API (v1)')
@Controller('v1')
// Skip the global IP-based throttler; apply per-API-key throttler instead (TRD §15)
@SkipThrottle({ global: true })
@UseGuards(ApiKeyThrottlerGuard)
@Throttle({ 'public-api': { limit: 120, ttl: 60000 } })
export class PublicV1Controller {
  constructor(private readonly publicV1Service: PublicV1Service) {}

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

  @Get('blogs')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'Authorization', description: 'Bearer <tenant_api_key>', required: true })
  @ApiOperation({ summary: 'List published articles for consuming website (Paginated, ISR-ready)' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'lang', required: false, example: 'en' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getPublishedBlogs(
    @Req() req: any,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('lang') lang?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const websiteId = req.tenant.id;
    return this.publicV1Service.getPublishedBlogs({
      websiteId,
      category,
      tag,
      lang: lang || req.tenant.defaultLanguage || 'en',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  // ─── TRD §12: GET /blogs/latest?website= (Latest published blogs) ─────────
  @Get('blogs/latest')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Retrieve latest published blogs for consuming website (TRD §12)' })
  @ApiQuery({ name: 'website', required: false, description: 'Website slug or domain' })
  @ApiQuery({ name: 'lang', required: false, example: 'en' })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  async getLatestBlogs(
    @Req() req: any,
    @Query('lang') lang?: string,
    @Query('limit') limit?: number,
  ) {
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
  async getPopularBlogs(
    @Req() req: any,
    @Query('lang') lang?: string,
    @Query('limit') limit?: number,
  ) {
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
  async getBlogBySlug(
    @Param('slug') slug: string,
    @Req() req: any,
    @Query('lang') lang?: string,
  ) {
    const websiteId = req.tenant.id;
    return this.publicV1Service.getBlogBySlug(slug, websiteId, lang || 'en');
  }

  @Get('categories')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'Authorization', description: 'Bearer <tenant_api_key>', required: true })
  @ApiOperation({ summary: 'Retrieve taxonomy category tree for consuming website' })
  async getCategories(@Req() req: any, @Query('websiteId') queryWebsiteId?: string) {
    const targetSiteId = queryWebsiteId || req.tenant?.id;
    return this.publicV1Service.getCategories(targetSiteId);
  }

  @Get('tags')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'Authorization', description: 'Bearer <tenant_api_key>', required: true })
  @ApiOperation({ summary: 'Retrieve tags list for consuming website' })
  async getTags(@Req() req: any, @Query('websiteId') queryWebsiteId?: string) {
    const targetSiteId = queryWebsiteId || req.tenant?.id;
    return this.publicV1Service.getTags(targetSiteId);
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
    return this.publicV1Service.search(q || '', req.tenant.id, lang || 'en', limit ? Number(limit) : 10);
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
  @ApiOperation({ summary: 'Retrieve active 301 permanent redirect rules for consuming website (Edge Middleware ready)' })
  async getRedirects(@Req() req: any) {
    return this.publicV1Service.getRedirects(req.tenant.id);
  }
}

