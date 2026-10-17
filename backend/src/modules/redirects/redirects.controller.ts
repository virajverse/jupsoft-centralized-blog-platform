import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Ip } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RedirectsService } from './redirects.service';
import { CreateRedirectDto } from './dto/redirect.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Admin / 301 Redirects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/redirects')
export class RedirectsController {
  constructor(private readonly redirectsService: RedirectsService) {}

  @Get()
  @ApiOperation({ summary: 'List 301 permanent redirect rules filtered by tenant' })
  @ApiQuery({ name: 'websiteId', required: false })
  async findAll(@Query('websiteId') websiteId?: string) {
    return this.redirectsService.findAll(websiteId);
  }

  @Post()
  @Roles('Super Admin', 'Website Admin', 'SEO Manager', 'Publisher')
  @ApiOperation({ summary: 'Create manual 301 permanent redirect rule' })
  async create(@Body() dto: CreateRedirectDto, @CurrentUser() user: any, @Ip() ip: string) {
    return this.redirectsService.create(dto, user, ip);
  }

  @Delete(':id')
  @Roles('Super Admin', 'Website Admin', 'SEO Manager', 'Publisher')
  @ApiOperation({ summary: 'Delete 301 redirect rule' })
  async delete(@Param('id') id: string, @CurrentUser() user: any, @Ip() ip: string) {
    return this.redirectsService.delete(id, user, ip);
  }
}
