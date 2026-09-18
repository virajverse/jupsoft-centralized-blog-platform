import { Module, Global } from '@nestjs/common';
import { SupabaseSyncService } from './supabase-sync.service';
import { SupabaseSyncController } from './supabase-sync.controller';

@Global()
@Module({
  controllers: [SupabaseSyncController],
  providers: [SupabaseSyncService],
  exports: [SupabaseSyncService],
})
export class SupabaseSyncModule {}
