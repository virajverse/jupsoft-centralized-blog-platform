import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Admin / Taxonomy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class TaxonomyController {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Categories ──────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'List categories for a website' })
  @ApiQuery({ name: 'websiteId', required: false })
  async listCategories(@Query('websiteId') websiteId?: string) {
    const where: any = {};
    if (websiteId && websiteId !== 'all') {
      where.websiteId = websiteId;
    }
    return this.prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });
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

    await this.prisma.category.delete({ where: { id } });

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
  async listTags(@Query('websiteId') websiteId?: string) {
    const where: any = {};
    if (websiteId && websiteId !== 'all') {
      where.websiteId = websiteId;
    }
    return this.prisma.tag.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  @Post('tags')
  @Roles('Super Admin', 'Website Admin', 'Editor')
  @ApiOperation({ summary: 'Create a new tag in website taxonomy' })
  async createTag(
    @Body() body: { websiteId: string; name: string; slug?: string },
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
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

    await this.prisma.tag.delete({ where: { id } });

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
