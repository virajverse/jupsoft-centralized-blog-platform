/**
 * PERF-002: View Count Buffering & Scheduled Batch Persistence Tests
 * Validates:
 * 1. Atomic Redis HINCRBY buffering
 * 2. Transparent L1 In-Memory fallback on Redis outage
 * 3. Atomic buffer drain via Lua script
 * 4. AnalyticsService.track delegates to bufferViewIncrement (0 row locks)
 * 5. AnalyticsService scheduled batch persistence via batched Prisma transaction
 * 6. Fault-tolerant rebuffering on database transaction failure (zero data loss)
 * 7. Distributed lock coordination across cluster workers
 * 8. Graceful shutdown flush on onModuleDestroy
 */

import { AnalyticsService, TrackEventDto } from '../modules/analytics/analytics.service';
import { RedisProvider } from '../common/providers/redis.provider';
import { ConfigService } from '@nestjs/config';

describe('PERF-002: View Count Buffering & Batch Persistence', () => {
  describe('RedisProvider View Buffering & Drain', () => {
    let redisProvider: RedisProvider;
    let mockConfigService: ConfigService;

    beforeEach(() => {
      mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      } as any;
      // In unit tests without Redis server running, RedisProvider runs in L1 fallback mode
      redisProvider = new RedisProvider(mockConfigService);
    });

    afterEach(async () => {
      await redisProvider.onModuleDestroy();
    });

    it('should buffer increments in L1 memory when Redis is not connected', async () => {
      await redisProvider.bufferViewIncrement('blog-1', 1);
      await redisProvider.bufferViewIncrement('blog-1', 4);
      await redisProvider.bufferViewIncrement('blog-2', 2);

      const drained = await redisProvider.drainViewCountBuffer();

      expect(drained).toEqual({
        'blog-1': 5,
        'blog-2': 2,
      });

      // Buffer must be empty after drain
      const secondDrain = await redisProvider.drainViewCountBuffer();
      expect(secondDrain).toEqual({});
    });

    it('should ignore invalid blogId or count <= 0', async () => {
      await redisProvider.bufferViewIncrement('', 1);
      await redisProvider.bufferViewIncrement('blog-invalid', 0);
      await redisProvider.bufferViewIncrement('blog-invalid', -5);

      const drained = await redisProvider.drainViewCountBuffer();
      expect(drained).toEqual({});
    });

    it('should buffer in Redis client via HINCRBY when client is active', async () => {
      const mockClient = {
        hincrby: jest.fn().mockResolvedValue(1),
        eval: jest.fn().mockResolvedValue(['blog-redis-1', '10', 'blog-redis-2', '25']),
        quit: jest.fn().mockResolvedValue('OK'),
      };
      (redisProvider as any).client = mockClient;
      (redisProvider as any).isConnected = true;

      await redisProvider.bufferViewIncrement('blog-redis-1', 3);
      expect(mockClient.hincrby).toHaveBeenCalledWith('blogs:view_buffer', 'blog-redis-1', 3);

      const drained = await redisProvider.drainViewCountBuffer();
      expect(mockClient.eval).toHaveBeenCalled();
      expect(drained['blog-redis-1']).toBe(10);
      expect(drained['blog-redis-2']).toBe(25);
    });
  });

  describe('AnalyticsService View Buffering & Batch Flush', () => {
    let service: AnalyticsService;
    let mockPrisma: any;
    let mockRedis: any;

    beforeEach(() => {
      mockPrisma = {
        analyticsEvent: {
          create: jest.fn().mockResolvedValue({ id: 'evt-1' }),
        },
        $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
        $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      };

      mockRedis = {
        bufferViewIncrement: jest.fn().mockResolvedValue(undefined),
        drainViewCountBuffer: jest.fn().mockResolvedValue({}),
        acquireLock: jest.fn().mockResolvedValue(true),
        releaseLock: jest.fn().mockResolvedValue(undefined),
      };

      service = new AnalyticsService(mockPrisma, mockRedis);
    });

    it('should buffer view increment and NOT execute synchronous raw SQL on track()', async () => {
      const dto: TrackEventDto = {
        blogId: 'blog-test-1',
        websiteId: 'site-test',
        sessionId: 'session-123',
        event: 'page_view',
      };

      await service.track(dto);

      expect(mockPrisma.analyticsEvent.create).toHaveBeenCalled();
      expect(mockRedis.bufferViewIncrement).toHaveBeenCalledWith('blog-test-1');
      // Direct SQL update should NOT be called synchronously
      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it('should batch persist buffered counts to database on persistBufferedViews()', async () => {
      mockRedis.drainViewCountBuffer.mockResolvedValueOnce({
        'blog-a': 15,
        'blog-b': 42,
      });

      await service.persistBufferedViews();

      expect(mockRedis.drainViewCountBuffer).toHaveBeenCalled();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        'UPDATE blogs SET view_count = view_count + $1 WHERE id = $2',
        15,
        'blog-a',
      );
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        'UPDATE blogs SET view_count = view_count + $1 WHERE id = $2',
        42,
        'blog-b',
      );
    });

    it('should gracefully skip persistence when buffer is empty', async () => {
      mockRedis.drainViewCountBuffer.mockResolvedValueOnce({});

      await service.persistBufferedViews();

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it('should re-buffer view counts if database transaction fails (zero data loss)', async () => {
      mockRedis.drainViewCountBuffer.mockResolvedValueOnce({
        'blog-err': 100,
      });
      mockPrisma.$transaction.mockRejectedValueOnce(new Error('PostgreSQL connection timeout'));

      await expect(service.persistBufferedViews()).rejects.toThrow('PostgreSQL connection timeout');

      // Must re-buffer to prevent losing views
      expect(mockRedis.bufferViewIncrement).toHaveBeenCalledWith('blog-err', 100);
    });

    it('should acquire distributed lock in scheduled flushViewCountBuffer() and skip if locked', async () => {
      mockRedis.acquireLock.mockResolvedValueOnce(false); // another worker holds the lock

      await service.flushViewCountBuffer();

      expect(mockRedis.acquireLock).toHaveBeenCalledWith('lock:cron:flush-view-counts', 50);
      expect(mockRedis.drainViewCountBuffer).not.toHaveBeenCalled();
    });

    it('should flush buffered views during graceful shutdown onModuleDestroy()', async () => {
      mockRedis.drainViewCountBuffer.mockResolvedValueOnce({
        'blog-shutdown': 7,
      });

      await service.onModuleDestroy();

      expect(mockRedis.drainViewCountBuffer).toHaveBeenCalled();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        'UPDATE blogs SET view_count = view_count + $1 WHERE id = $2',
        7,
        'blog-shutdown',
      );
    });
  });
});
