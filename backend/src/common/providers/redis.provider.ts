/**
 * Redis Provider — TRD §13 (Hybrid Delivery Model) + §16 (Performance & Caching)
 *
 * TRD §13: "The public API checks Redis first (key: blog:{website}:{slug}:{lang});
 *           on miss it reads PostgreSQL and populates the cache."
 * TRD §16: "Redis caches blog detail, category lists and homepage blog lists;
 *           invalidated on publish/update. Target API response time: < 300ms"
 */

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisProvider implements OnModuleDestroy {
  private readonly logger = new Logger(RedisProvider.name);
  private readonly client: Redis;

  constructor(private config: ConfigService) {
    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: Number(this.config.get<number>('REDIS_PORT', 6379)),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.client.on('connect', () =>
      this.logger.log('Redis connected (TRD §13 caching active)'),
    );
    this.client.on('error', (err) =>
      this.logger.error(`Redis error: ${err.message}`),
    );
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // ─── Core Get / Set / Del ────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    await this.client.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Delete all keys matching a pattern (uses SCAN — safe for production).
   * TRD §13: "On publish/update, the platform invalidates its Redis key and fires the webhook."
   */
  async delPattern(pattern: string): Promise<void> {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.client.del(...keys);
        this.logger.debug(
          `Invalidated ${keys.length} key(s) matching: ${pattern}`,
        );
      }
    } while (cursor !== '0');
  }
}
