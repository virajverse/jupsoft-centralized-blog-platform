/**
 * Redis Module — TRD §13 (Hybrid Delivery) + §16 (Performance & Caching)
 * Imported explicitly by PublicV1Module and BlogsModule.
 */
import { Global, Module } from '@nestjs/common';
import { RedisProvider } from './redis.provider';

@Global()
@Module({
  providers: [RedisProvider],
  exports: [RedisProvider],
})
export class RedisModule {}

