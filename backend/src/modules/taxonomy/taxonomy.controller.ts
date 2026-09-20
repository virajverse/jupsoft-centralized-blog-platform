import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Ip, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisProvider } from '../../common/providers/redis.provider';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { SupabaseSyncService } from '../supabase-sync/supabase-sync.service';

@ApiTags('Admin / Taxonomy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class TaxonomyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseSync: SupabaseSyncService,
    private readonly redis: RedisProvider,
  ) {}

  private isGlobalAdmin(user: any): boolean {
    if (!user) return false;
    if (user.roles?.includes('Super Admin')) return true;
    return user.roleAssignments?.some((ra: any) => ra.isGlobal && ra.role === 'Website Admin');
  }

  private assertWebsiteAccess(websiteId: string, user: any): void {
    if (!user || this.isGlobalAdmin(user)) return;
    const allowedSites = (user.roleAssignments || [])
      .filter((ra: any) => ra.websiteId)
      .map((ra: any) => ra.websiteId);
    if (!allowedSites.includes(websiteId)) {
      throw new ForbiddenException(`Access denied: you do not have permission for website "${websiteId}".`);
    }
  }

  // ─── Categories ──────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'List categories for a website' })
  @ApiQuery({ name: 'websiteId', required: false })
  async listCategories(@Query('websiteId') websiteId?: string, @CurrentUser() user?: any) {
    const userScope = user && !this.isGlobalAdmin(user) ? `user:${user.id}` : 'global';
    const cacheKey = `admin:categories:${userScope}:${websiteId || 'all'}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (user && !this.isGlobalAdmin(user)) {
      const allowedSites = (user.roleAssignments || []).filter((ra: any) => ra.websiteId).map((ra: any) => ra.websiteId);
      if (websiteId && websiteId !== 'all') {
        this.assertWebsiteAccess(websiteId, user);
        where.websiteId = websiteId;
      } else {
        where.websiteId = { in: allowedSites };
      }
    } else {
      if (websiteId && websiteId !== 'all') {
        where.websiteId = websiteId;
      }
    }

    const categories = await this.prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    await this.redis.set(cacheKey, categories, 300);
    return categories;
  }

  @Post('categories')
  @Roles('Super Admin', 'Website Admin', 'Editor')
  @ApiOperation({ summary: 'Create a new category in website taxonomy' })
  async createCategory(
    @Body()
    body: {
      websiteId: string;
      name: string;
      slug?: string;
      description?: string;
      parentId?: string;
    },
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    this.assertWebsiteAccess(body.websiteId, user);
    const slug =
      body.slug ||
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const category = await this.prisma.category.create({
      data: {
        websiteId: body.websiteId,
        name: body.name,
        slug,
        description: body.description || '',
        parentId: body.parentId || null,
      },
    });

    await this.prisma.systemAuditLog.create({
      data: {
        userName: user?.name || 'Super Admin',
        role: user?.roles?.[0] || 'Super Admin',
        websiteId: body.websiteId,
        event: 'category.created',
        ipAddress: ip || '',
        details: `Created category "${category.name}" (${category.id})`,
      },
    });

    // Mirror to Supabase Cloud Backup (non-blocking)
    this.supabaseSync.syncCategory(category.id).catch(() => {});
    await this.redis.delPattern('admin:categories:*');

    return category;
  }

  @Delete('categories/:id')
  @Roles('Super Admin', 'Website Admin')
  @ApiOperation({ summary: 'Delete a category' })
  async deleteCategory(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      return { success: false, message: 'Category not found' };
    }
    this.assertWebsiteAccess(category.websiteId, user);

    await this.prisma.category.delete({ where: { id } });

    // Mirror to Supabase Cloud Backup (non-blocking)
    this.supabaseSync.deleteCategory(id).catch(() => {});
    await this.redis.delPattern('admin:categories:*');

    await this.prisma.systemAuditLog.create({
      data: {
        userName: user?.name || 'Super Admin',
        role: user?.roles?.[0] || 'Super Admin',
        websiteId: category.websiteId,
        event: 'category.deleted',
        ipAddress: ip || '',
        details: `Deleted category "${category.name}" (${category.id})`,
      },
    });

    return { success: true, message: 'Category deleted successfully' };
  }

  // ─── Tags ────────────────────────────────────────────────────

  @Get('tags')
  @ApiOperation({ summary: 'List tags for a website' })
  @ApiQuery({ name: 'websiteId', required: false })
  async listTags(@Query('websiteId') websiteId?: string, @CurrentUser() user?: any) {
    const userScope = user && !this.isGlobalAdmin(user) ? `user:${user.id}` : 'global';
    const cacheKey = `admin:tags:${userScope}:${websiteId || 'all'}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const where: any = {};
    if (user && !this.isGlobalAdmin(user)) {
      const allowedSites = (user.roleAssignments || []).filter((ra: any) => ra.websiteId).map((ra: any) => ra.websiteId);
      if (websiteId && websiteId !== 'all') {
        this.assertWebsiteAccess(websiteId, user);
        where.websiteId = websiteId;
      } else {
        where.websiteId = { in: allowedSites };
      }
    } else {
      if (websiteId && websiteId !== 'all') {
        where.websiteId = websiteId;
      }
    }

    const tags = await this.prisma.tag.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    await this.redis.set(cacheKey, tags, 300);
    return tags;
  }

  @Post('tags')
  @Roles('Super Admin', 'Website Admin', 'Editor')
  @ApiOperation({ summary: 'Create a new tag in website taxonomy' })
  async createTag(
    @Body() body: { websiteId: string; name: string; slug?: string },
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    this.assertWebsiteAccess(body.websiteId, user);
    const slug =
      body.slug ||
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const tag = await this.prisma.tag.create({
      data: {
        websiteId: body.websiteId,
        name: body.name,
        slug,
      },
    });

    await this.prisma.systemAuditLog.create({
      data: {
        userName: user?.name || 'Super Admin',
        role: user?.roles?.[0] || 'Super Admin',
        websiteId: body.websiteId,
        event: 'tag.created',
        ipAddress: ip || '',
        details: `Created tag "${tag.name}" (${tag.id})`,
      },
    });

    // Mirror to Supabase Cloud Backup (non-blocking)
    this.supabaseSync.syncTag(tag.id).catch(() => {});
    await this.redis.delPattern('admin:tags:*');

    return tag;
  }

  @Delete('tags/:id')
  @Roles('Super Admin', 'Website Admin')
  @ApiOperation({ summary: 'Delete a tag' })
  async deleteTag(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      return { success: false, message: 'Tag not found' };
    }
    this.assertWebsiteAccess(tag.websiteId, user);

    await this.prisma.tag.delete({ where: { id } });

    // Mirror to Supabase Cloud Backup (non-blocking)
    this.supabaseSync.deleteTag(id).catch(() => {});
    await this.redis.delPattern('admin:tags:*');

    await this.prisma.systemAuditLog.create({
      data: {
        userName: user?.name || 'Super Admin',
        role: user?.roles?.[0] || 'Super Admin',
        websiteId: tag.websiteId,
        event: 'tag.deleted',
        ipAddress: ip || '',
        details: `Deleted tag "${tag.name}" (${tag.id})`,
      },
    });

    return { success: true, message: 'Tag deleted successfully' };
  }
}
