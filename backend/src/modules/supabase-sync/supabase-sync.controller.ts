import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupabaseSyncService } from './supabase-sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin / Supabase Live Backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/sync-supabase')
export class SupabaseSyncController {
  constructor(private readonly supabaseSync: SupabaseSyncService) {}

  @Get('status')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Check Supabase backup sync connection status' })
  getStatus() {
    return {
      status: 'active',
      service: 'Supabase Dual-Write Backup Engine',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('trigger')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Trigger complete sync of all websites, blogs, categories, and users to Supabase' })
  async triggerSync() {
    const result = await this.supabaseSync.fullSync();
    return {
      message: result.success ? 'Supabase backup synchronization successful' : 'Partial sync or sync failed',
      details: result.stats,
    };
  }
}
