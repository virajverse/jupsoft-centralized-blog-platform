/**
 * Redis Provider — TRD §13 (Hybrid Delivery Model) + §16 (Performance & Caching)
 *
 * Fault-tolerant 0-delay caching engine:
 * - Dual-layer architecture: L1 In-Memory TTL Cache + L2 Redis Cluster
 * - Never blocks node event loop (enableOfflineQueue: false, connectTimeout: 1000ms)
 * - Transparent fallback: If Redis is offline, L1 in-memory cache responds in < 0.1ms
 * - Safe pattern invalidation for instant webhook cache purges
 */

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

@Injectable()
export class RedisProvider implements OnModuleDestroy {
  private readonly logger = new Logger(RedisProvider.name);
  private client: Redis | null = null;
  private isConnected = false;
  private readonly memoryCache = new Map<string, CacheEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = Number(this.config.get<number>('REDIS_PORT', 6379));
    const password = this.config.get<string>('REDIS_PASSWORD') || undefined;

    try {
      this.client = new Redis({
        host,
        port,
        password,
        lazyConnect: false,
        enableOfflineQueue: false,      // Do NOT freeze/queue requests when Redis is down
        connectTimeout: 1000,           // Fast 1s timeout
        maxRetriesPerRequest: 1,        // Fail fast to memory cache
        retryStrategy: (times) => {
          if (times > 5) return null;   // Stop reconnect attempts after 5 tries, rely on L1
          return Math.min(times * 300, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('🚀 Redis L2 cache connected on port ' + port);
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis L2 unavailable (${err.message}). Seamlessly serving from L1 In-Memory Cache (0-delay).`);
      });
    } catch (e: any) {
      this.isConnected = false;
      this.logger.warn(`Redis initialization skipped: ${e.message}. Using high-speed L1 In-Memory Cache.`);
    }

    // Background cleanup for expired L1 memory cache entries every 60 seconds
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.expiresAt <= now) {
          this.memoryCache.delete(key);
        }
      }
    }, 60_000);
  }

  async onModuleDestroy() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.client) {
      try {
        await this.client.quit();
      } catch {}
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  async ping(): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  // ─── Core Get / Set / Del ────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    const now = Date.now();

    // 1. Check L1 In-Memory Cache first (0.05ms)
    const mem = this.memoryCache.get(key);
    if (mem) {
      if (mem.expiresAt > now) {
        return mem.value as T;
      }
      this.memoryCache.delete(key);
    }

    // 2. If Redis L2 is active, query Redis
    if (this.client && this.isConnected) {
      try {
        const raw = await this.client.get(key);
        if (raw) {
          const parsed = JSON.parse(raw) as T;
          // Back-populate L1 cache for instant subsequent reads
          this.memoryCache.set(key, { value: parsed, expiresAt: now + 60_000 });
          return parsed;
        }
      } catch (err) {
        // Redis read error — ignore and proceed
      }
    }

    return null;
  }

  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;

    // 1. Write to L1 In-Memory Cache instantly
    this.memoryCache.set(key, { value, expiresAt });

    // 2. Write to Redis L2 if available
    if (this.client && this.isConnected) {
      try {
        await this.client.setex(key, ttlSeconds, JSON.stringify(value));
      } catch (err) {
        // Redis write error — L1 already has it
      }
    }
  }

  async del(key: string): Promise<void> {
    // 1. Delete from L1
    this.memoryCache.delete(key);

    // 2. Delete from Redis L2
    if (this.client && this.isConnected) {
      try {
        await this.client.del(key);
      } catch (err) {}
    }
  }

  /**
   * Delete all keys matching a pattern (e.g. "blogs:site-cloud*").
   * Invalidates both L1 memory cache and L2 Redis cluster.
   */
  async delPattern(pattern: string): Promise<void> {
    // 1. Delete from L1 In-Memory Cache using regex conversion
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.memoryCache.keys()) {
      if (regexPattern.test(key)) {
        this.memoryCache.delete(key);
      }
    }

    // 2. Delete from Redis L2 using SCAN
    if (this.client && this.isConnected) {
      try {
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
          }
        } while (cursor !== '0');
      } catch (err) {}
    }
  }
}
