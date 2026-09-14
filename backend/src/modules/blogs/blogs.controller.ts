import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BlogsService } from './blogs.service';
import { CreateBlogDto, UpdateBlogDto, TransitionBlogStatusDto } from './dto/create-blog.dto';
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
  ) {
    return this.blogsService.findAll({
      websiteId,
      status,
      search,
      authorId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full blog detail by ID' })
  async findOne(@Param('id') id: string) {
    return this.blogsService.findOne(id);
  }

  @Post()
  @Roles('Super Admin', 'Editor', 'Content Writer')
  @ApiOperation({ summary: 'Create a new blog article draft' })
  @ApiResponse({ status: 201, description: 'Blog draft created' })
  async create(@Body() dto: CreateBlogDto, @CurrentUser() user: AuthenticatedUser) {
    return this.blogsService.create(dto, user);
  }

  @Put(':id')
  @Roles('Super Admin', 'Editor', 'Content Writer')
  @ApiOperation({ summary: 'Update blog content, SEO metadata, or translations (auto-captures 301 on slug changes)' })
  async update(@Param('id') id: string, @Body() dto: UpdateBlogDto, @CurrentUser() user: AuthenticatedUser) {
    return this.blogsService.update(id, dto, user);
  }

  @Post(':id/submit')
  @Roles('Super Admin', 'Editor', 'Content Writer')
  @ApiOperation({ summary: 'Submit draft for editorial review (Draft → Under Review)' })
  async submitForReview(@Param('id') id: string, @Body() body: { notes?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.blogsService.transitionStatus(id, { status: 'Under Review', notes: body.notes }, user);
  }

  @Post(':id/approve')
  @Roles('Super Admin', 'Editor')
  @ApiOperation({ summary: 'Approve article for live publishing (Under Review → Approved)' })
  async approve(@Param('id') id: string, @Body() body: { notes?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.blogsService.transitionStatus(id, { status: 'Approved', notes: body.notes }, user);
  }

  @Post(':id/publish')
  @Roles('Super Admin', 'Publisher')
  @ApiOperation({ summary: 'Publish article live and dispatch on-demand ISR revalidation webhook' })
  async publish(@Param('id') id: string, @Body() body: { notes?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.blogsService.transitionStatus(id, { status: 'Published', notes: body.notes }, user);
  }

  @Post(':id/schedule')
  @Roles('Super Admin', 'Editor', 'Publisher')
  @ApiOperation({ summary: 'Schedule article for release at future timestamp (TRD §7 & §20)' })
  async schedule(
    @Param('id') id: string,
    @Body() body: { scheduledAt: string; notes?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.blogsService.transitionStatus(id, { status: 'Scheduled', notes: body.notes, scheduledAt: body.scheduledAt }, user);
  }

  @Post(':id/archive')
  @Roles('Super Admin', 'Editor', 'Publisher')
  @ApiOperation({ summary: 'Archive article and unpublish from CDN cache' })
  async archive(@Param('id') id: string, @Body() body: { notes?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.blogsService.transitionStatus(id, { status: 'Archived', notes: body.notes }, user);
  }

  @Post(':id/seo-audit')
  @Roles('Super Admin', 'Editor', 'Content Writer', 'SEO Manager')
  @ApiOperation({ summary: 'Run automated SEO audit on article translation and save to seo_audit_logs (TRD §11 & §17)' })
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
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.blogsService.delete(id, user);
  }
}
