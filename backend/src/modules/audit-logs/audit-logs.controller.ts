import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin / Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Retrieve immutable system activity trail (TRD Section 15)' })
  @ApiQuery({ name: 'websiteId', required: false })
  @ApiQuery({ name: 'event', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('websiteId') websiteId?: string,
    @Query('event') event?: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditLogsService.findAll({
      websiteId,
      event,
      limit: limit ? Number(limit) : 50,
    });
  }
}
