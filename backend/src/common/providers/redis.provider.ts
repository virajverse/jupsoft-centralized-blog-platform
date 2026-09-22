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
  private readonly maxMemoryEntries = 5000;
  private readonly memoryViewBuffer = new Map<string, number>();
  private readonly maxMemoryViewEntries = 50000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private setMemoryCache(key: string, entry: CacheEntry): void {
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      // Evict oldest entry (FIFO) when cap reached
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }
    this.memoryCache.set(key, entry);
  }

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
          // P0 Fix (C4): NEVER return null — that permanently ends the
          // connection (L2 dead until process restart → all traffic falls
          // through to Postgres). Back off forever with a 5s ceiling instead,
          // so Redis self-heals after blips/restarts.
          return Math.min(times * 500, 5000);
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
          this.setMemoryCache(key, { value: parsed, expiresAt: now + 60_000 });
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

    // 1. Write to L1 In-Memory Cache with bounded size check
    this.setMemoryCache(key, { value, expiresAt });

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

    // 2. Delete from Redis L2 using SCAN with a safety iteration cap
    if (this.client && this.isConnected) {
      try {
        let cursor = '0';
        let iterations = 0;
        const MAX_SCAN_ITERATIONS = 200; // Safety cap: prevent infinite loop on huge keyspaces
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
          iterations++;
          if (iterations >= MAX_SCAN_ITERATIONS) {
            this.logger.warn(`[RedisProvider] delPattern("${pattern}") hit SCAN iteration cap (${MAX_SCAN_ITERATIONS}). Some keys may not be cleared.`);
            break;
          }
        } while (cursor !== '0');
      } catch (err) {}
    }
  }

  // ─── P1: O(1) Namespace-Generation Cache Keys ─────────────────────────────
  //
  // Instead of SCAN-based delPattern invalidation (O(keyspace) on every
  // publish — the #1 Redis bottleneck under traffic), keys embed the current
  // namespace generation:  `blog:g12:site-1:my-slug:en`
  // Invalidating = INCR the generation counter (O(1)). Old-generation keys
  // become unreachable instantly and expire naturally via their TTL.

  /** Per-process fallback generation (used when Redis L2 is offline). */
  private readonly memoryGenerations = new Map<string, number>();

  private generationKey(namespace: string): string {
    return `gen:${namespace}`;
  }

  /** Current generation for a namespace (Redis-backed so all PM2 workers agree). */
  async getGeneration(namespace: string): Promise<number> {
    if (this.client && this.isConnected) {
      try {
        const raw = await this.client.get(this.generationKey(namespace));
        if (raw !== null) {
          const gen = parseInt(raw, 10);
          if (!Number.isNaN(gen)) return gen;
        }
      } catch (err) {
        // fall through to process-local generation
      }
    }
    return this.memoryGenerations.get(namespace) || 0;
  }

  /**
   * Build a generation-prefixed cache key for a namespace.
   * Reads are O(1) GET; no SCAN ever needed for invalidation.
   */
  async nsKey(namespace: string, suffix: string): Promise<string> {
    const gen = await this.getGeneration(namespace);
    return `${namespace}:g${gen}:${suffix}`;
  }

  /**
   * O(1) invalidation of an entire namespace (e.g. all `blog:` list/detail
   * entries). Atomic INCR on Redis so every cluster worker sees it instantly;
   * falls back to a process-local bump when Redis is offline.
   */
  async invalidateNamespace(namespace: string): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        const next = await this.client.incr(this.generationKey(namespace));
        this.memoryGenerations.set(namespace, next);
        return;
      } catch (err) {
        // fall through to process-local bump
      }
    }
    const next = (this.memoryGenerations.get(namespace) || 0) + 1;
    this.memoryGenerations.set(namespace, next);
  }

  /**
   * Distributed Atomic Mutex Lock — Prevents duplicate job runs across cluster replicas.
   * Uses Redis `SET key val EX ttl NX`. Falls back to in-memory lock if Redis is offline.
   */
  async acquireLock(key: string, ttlSeconds = 50): Promise<boolean> {
    const now = Date.now();
    const lockVal = `lock_${now}_${Math.random().toString(36).slice(2, 8)}`;

    // 1. If Redis L2 is active, use atomic SET ... NX EX
    if (this.client && this.isConnected) {
      try {
        const res = await this.client.set(key, lockVal, 'EX', ttlSeconds, 'NX');
        return res === 'OK';
      } catch (err) {
        // Redis error — fall through to L1 memory lock
      }
    }

    // 2. Fallback: L1 In-Memory Lock (Single-process / Dev fallback)
    const existing = this.memoryCache.get(key);
    if (existing && existing.expiresAt > now) {
      return false;
    }
    this.setMemoryCache(key, { value: lockVal, expiresAt: now + ttlSeconds * 1000 });
    return true;
  }

  async releaseLock(key: string): Promise<void> {
    await this.del(key);
  }

  // ─── PERF-002: Atomic View Count Buffering ──────────────────────────────

  /**
   * PERF-002: Buffer view count increments in Redis Hash `blogs:view_buffer`
   * Eliminates single-row database lock contention on viral/high-traffic articles.
   * Transparently falls back to bounded in-memory buffer if Redis L2 is offline.
   */
  async bufferViewIncrement(blogId: string, count = 1): Promise<void> {
    if (!blogId || count <= 0) return;

    if (this.client && this.isConnected) {
      try {
        await this.client.hincrby('blogs:view_buffer', blogId, count);
        return;
      } catch (err: any) {
        this.logger.warn(`[RedisProvider] bufferViewIncrement Redis error (${err.message}). Buffering in L1 memory.`);
      }
    }

    // L1 In-Memory Buffer fallback
    const current = this.memoryViewBuffer.get(blogId) || 0;
    if (this.memoryViewBuffer.size >= this.maxMemoryViewEntries && !this.memoryViewBuffer.has(blogId)) {
      this.logger.warn(
        `[RedisProvider] L1 memoryViewBuffer size limit reached (${this.maxMemoryViewEntries} entries). Increment dropped.`,
      );
      return;
    }
    this.memoryViewBuffer.set(blogId, current + count);
  }

  /**
   * PERF-002: Atomically drain and clear all buffered view increments from Redis L2 and L1 memory.
   * Uses atomic Lua script in Redis so no increments are lost during flush.
   */
  async drainViewCountBuffer(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    // 1. Drain Redis L2 buffer if active
    if (this.client && this.isConnected) {
      try {
        const luaScript = `
          local data = redis.call('HGETALL', KEYS[1])
          if #data > 0 then
            redis.call('DEL', KEYS[1])
          end
          return data
        `;
        const raw = (await this.client.eval(luaScript, 1, 'blogs:view_buffer')) as string[];
        if (Array.isArray(raw)) {
          for (let i = 0; i < raw.length; i += 2) {
            const blogId = raw[i];
            const increment = parseInt(raw[i + 1], 10);
            if (blogId && !isNaN(increment) && increment > 0) {
              counts[blogId] = (counts[blogId] || 0) + increment;
            }
          }
        }
      } catch (err: any) {
        this.logger.error(`[RedisProvider] Failed to drain Redis view buffer: ${err.message}`);
      }
    }

    // 2. Drain L1 In-Memory Buffer
    if (this.memoryViewBuffer.size > 0) {
      for (const [blogId, increment] of this.memoryViewBuffer.entries()) {
        counts[blogId] = (counts[blogId] || 0) + increment;
      }
      this.memoryViewBuffer.clear();
    }

    return counts;
  }
}

