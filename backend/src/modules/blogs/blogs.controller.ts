import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Ip } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BlogsService } from './blogs.service';
import { CreateBlogDto, UpdateBlogDto } from './dto/create-blog.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/auth-user.interface';

@ApiTags('Admin / Blogs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Get()
  @ApiOperation({ summary: 'List blogs with filters (status, website, search, pagination)' })
  @ApiQuery({ name: 'websiteId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findAll(
    @Query('websiteId') websiteId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('authorId') authorId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.blogsService.findAll(
      {
        websiteId,
        status,
        search,
        authorId,
        page: page ? Math.max(1, Number(page) || 1) : 1,
        // P0 Fix (C8): clamp limit — previously ?limit=1000000 ran unbounded findMany
        limit: Math.max(1, Math.min(Number(limit) || 20, 100)),
      },
      user,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full details of a specific blog for editing' })
  async findOne(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.blogsService.findOne(id, user);
  }

  @Post(':id/duplicate')
  @Roles('Super Admin', 'Website Admin', 'Role Admin', 'Editor', 'Content Writer')
  @ApiOperation({ summary: 'Duplicate an existing blog (creates a draft copy)' })
  async duplicateBlog(
    @Param('id') id: string,
    @Ip() ipAddress: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.blogsService.duplicateBlog(id, user, ipAddress);
  }

  @Post()
  @Roles('Super Admin', 'Website Admin', 'Role Admin', 'Editor', 'Content Writer')
  @ApiOperation({ summary: 'Create a new blog article draft' })
  @ApiResponse({ status: 201, description: 'Blog draft created' })
  async create(@Body() dto: CreateBlogDto, @CurrentUser() user: AuthenticatedUser, @Ip() ip: string) {
    return this.blogsService.create(dto, user, ip);
  }

  @Put(':id')
  @Roles('Super Admin', 'Website Admin', 'Role Admin', 'Editor', 'Content Writer', 'Publisher', 'SEO Manager')
  @ApiOperation({ summary: 'Update blog content, SEO metadata, or translations' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBlogDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.blogsService.update(id, dto, user, ip);
  }

  @Post(':id/submit')
  @Roles('Super Admin', 'Website Admin', 'Role Admin', 'Editor', 'Content Writer')
  @ApiOperation({ summary: 'Submit draft for editorial review (Draft → Under Review)' })
  async submitForReview(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.blogsService.transitionStatus(id, { status: 'Under Review', notes: body.notes }, user, ip);
  }

  @Post(':id/approve')
  @Roles('Super Admin', 'Website Admin', 'Role Admin', 'Editor')
  @ApiOperation({ summary: 'Approve article for live publishing (Under Review → Approved)' })
  async approve(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.blogsService.transitionStatus(id, { status: 'Approved', notes: body.notes }, user, ip);
  }

  @Post(':id/publish')
  @Roles('Super Admin', 'Website Admin', 'Publisher')
  @ApiOperation({ summary: 'Publish article live and dispatch ISR revalidation webhook' })
  async publish(
    @Param('id') id: string,
    @Body() body: { notes?: string; publishDate?: string },
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.blogsService.transitionStatus(id, { status: 'Published', notes: body.notes, publishDate: body.publishDate }, user, ip);
  }

  @Post(':id/schedule')
  @Roles('Super Admin', 'Website Admin', 'Publisher')
  @ApiOperation({ summary: 'Schedule article for release at future timestamp' })
  async schedule(
    @Param('id') id: string,
    @Body() body: { scheduledAt: string; notes?: string },
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.blogsService.transitionStatus(
      id,
      { status: 'Scheduled', notes: body.notes, scheduledAt: body.scheduledAt },
      user,
      ip,
    );
  }

  @Post(':id/archive')
  @Roles('Super Admin', 'Website Admin', 'Editor', 'Publisher')
  @ApiOperation({ summary: 'Archive article and unpublish from CDN cache' })
  async archive(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.blogsService.transitionStatus(id, { status: 'Archived', notes: body.notes }, user, ip);
  }

  @Post(':id/seo-audit')
  @Roles('Super Admin', 'Website Admin', 'Editor', 'Content Writer', 'SEO Manager', 'Publisher')
  @ApiOperation({ summary: 'Run automated SEO audit and save to seo_audit_logs' })
  @ApiQuery({ name: 'lang', required: false, example: 'en' })
  async runSeoAudit(
    @Param('id') id: string,
    @Query('lang') lang?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.blogsService.auditAndLogSeo(id, lang || 'en', user);
  }

  @Delete(':id')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Delete article permanently (Super Admin only)' })
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Ip() ip: string) {
    return this.blogsService.delete(id, user, ip);
  }
}
