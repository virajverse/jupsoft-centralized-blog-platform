/**
 * HEALTH CHECK & READINESS TESTS — Scenario #26
 * Tests: PostgreSQL probe + Redis status + HTTP 503 degraded state
 */
import { PublicV1Controller } from '../modules/public-v1/public-v1.controller';
import { HttpStatus } from '@nestjs/common';

describe('PublicV1Controller - Health & Readiness Probe', () => {
  let controller: PublicV1Controller;
  let mockPublicV1Service: any;
  let mockAnalyticsService: any;
  let mockResponse: any;

  beforeEach(() => {
    mockPublicV1Service = {
      checkRedis: jest.fn(),
      checkDatabase: jest.fn(),
    };
    mockAnalyticsService = {
      track: jest.fn(),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
    };
    controller = new PublicV1Controller(mockPublicV1Service, mockAnalyticsService);
  });

  it('should return HTTP 200 and status ok when both PostgreSQL and Redis are healthy', async () => {
    mockPublicV1Service.checkRedis.mockResolvedValue(true);
    mockPublicV1Service.checkDatabase.mockResolvedValue(true);

    const result = await controller.healthCheck(mockResponse);

    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(result.redis).toBe('connected');
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return HTTP 503 and degraded status when PostgreSQL is disconnected', async () => {
    mockPublicV1Service.checkRedis.mockResolvedValue(true);
    mockPublicV1Service.checkDatabase.mockResolvedValue(false);

    const result = await controller.healthCheck(mockResponse);

    expect(result.status).toBe('degraded');
    expect(result.database).toBe('disconnected');
    expect(result.redis).toBe('connected');
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('should report redis offline but remain operational if PostgreSQL is healthy', async () => {
    mockPublicV1Service.checkRedis.mockResolvedValue(false);
    mockPublicV1Service.checkDatabase.mockResolvedValue(true);

    const result = await controller.healthCheck(mockResponse);

    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(result.redis).toBe('offline');
    expect(mockResponse.status).not.toHaveBeenCalled();
  });
});
