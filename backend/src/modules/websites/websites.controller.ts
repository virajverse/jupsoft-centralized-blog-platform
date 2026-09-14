import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WebsitesService } from './websites.service';
import { CreateWebsiteDto, UpdateWebsiteDto } from './dto/create-website.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin / Websites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/websites')
export class WebsitesController {
  constructor(private readonly websitesService: WebsitesService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve all website tenants with article counts' })
  async findAll() {
    return this.websitesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve single website tenant details' })
  async findOne(@Param('id') id: string) {
    return this.websitesService.findOne(id);
  }

  @Post()
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Onboard a new website tenant (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Website tenant onboarded' })
  async create(@Body() dto: CreateWebsiteDto) {
    return this.websitesService.create(dto);
  }

  @Put(':id')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Update website domain, webhook URL, or active status' })
  async update(@Param('id') id: string, @Body() dto: UpdateWebsiteDto) {
    return this.websitesService.update(id, dto);
  }
}
