import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../modules/auth/auth.service';
import { JwtStrategy, JwtPayload } from '../modules/auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { RedisProvider } from '../common/providers/redis.provider';
import { parseUserAgent } from '../common/utils/user-agent.util';

describe('Multi-Device Session Management & One-Click Sign Out', () => {
  describe('User-Agent & Device Parser', () => {
    it('should correctly parse Windows Desktop with Chrome', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
      const parsed = parseUserAgent(ua);
      expect(parsed.device).toBe('Windows PC');
      expect(parsed.deviceType).toBe('desktop');
      expect(parsed.os).toBe('Windows 10/11');
      expect(parsed.browser).toContain('Chrome');
    });

    it('should correctly parse Apple iPhone with Mobile Safari', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
      const parsed = parseUserAgent(ua);
      expect(parsed.device).toBe('Apple iPhone');
      expect(parsed.deviceType).toBe('mobile');
      expect(parsed.os).toBe('iOS (iPhone)');
      expect(parsed.browser).toBe('Safari');
    });

    it('should correctly parse Apple iPad with iPadOS', () => {
      const ua = 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';
      const parsed = parseUserAgent(ua);
      expect(parsed.device).toBe('Tablet Device');
      expect(parsed.deviceType).toBe('tablet');
      expect(parsed.os).toBe('iPadOS');
    });

    it('should fallback gracefully on empty or unknown user agent', () => {
      const parsed = parseUserAgent('');
      expect(parsed.device).toBe('Desktop PC');
      expect(parsed.browser).toBe('Unknown Browser');
      expect(parsed.os).toBe('Unknown OS');
    });
  });

  describe('AuthService Session Operations', () => {
    let authService: AuthService;
    let redisMock: Record<string, any>;
    let redisProvider: any;
    let prismaMock: any;

    beforeEach(async () => {
      redisMock = {};
      redisProvider = {
        get: jest.fn(async (key: string) => redisMock[key] ?? null),
        set: jest.fn(async (key: string, val: any) => { redisMock[key] = val; }),
        del: jest.fn(async (key: string) => { delete redisMock[key]; }),
      };

      prismaMock = {
        user: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        website: {
          findMany: jest.fn(async () => []),
        },
        systemAuditLog: {
          create: jest.fn(async () => ({})),
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: PrismaService, useValue: prismaMock },
          {
            provide: JwtService,
            useValue: {
              sign: jest.fn(() => 'mock-jwt-token'),
              verify: jest.fn(() => ({ sub: 'user-1', roles: ['Editor'] })),
            },
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultVal?: string) => {
                if (key === 'JWT_SECRET') return 'test-secret-at-least-32-chars-long!';
                if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret-32-chars-long!';
                if (key === 'JWT_EXPIRATION') return '3650d';
                if (key === 'JWT_REFRESH_EXPIRATION') return '3650d';
                return defaultVal;
              }),
            },
          },
          { provide: RedisProvider, useValue: redisProvider },
        ],
      }).compile();

      authService = module.get<AuthService>(AuthService);
    });

    it('should record a new session and retrieve active sessions with current flagged', async () => {
      const userId = 'user-123';
      const sessionId = 'session-abc';
      const refreshToken = 'sample-rt-1';
      const ip = '122.161.45.10';
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0';

      await authService.recordSession(userId, sessionId, refreshToken, ip, ua);

      const result = await authService.getActiveSessions(userId, sessionId, ip, ua);
      expect(result.success).toBe(true);
      expect(result.sessions.length).toBe(1);
      expect(result.sessions[0].id).toBe(sessionId);
      expect(result.sessions[0].device).toBe('Windows PC');
      expect(result.sessions[0].isCurrent).toBe(true);
    });

    it('should sort multiple active sessions with current session first', async () => {
      const userId = 'user-123';
      const session1 = 'session-1';
      const session2 = 'session-2';

      await authService.recordSession(userId, session1, 'rt-1', '1.1.1.1', 'Mozilla/5.0 (Windows NT 10.0)');
      await authService.recordSession(userId, session2, 'rt-2', '2.2.2.2', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4)');

      // If user is accessing from session-1, session-1 must be first
      const res = await authService.getActiveSessions(userId, session1);
      expect(res.sessions.length).toBe(2);
      expect(res.sessions[0].id).toBe(session1);
      expect(res.sessions[0].isCurrent).toBe(true);
      expect(res.sessions[1].id).toBe(session2);
      expect(res.sessions[1].isCurrent).toBe(false);
    });

    it('should revoke a single specific session', async () => {
      const userId = 'user-123';
      const session1 = 'session-1';
      const session2 = 'session-2';

      await authService.recordSession(userId, session1, 'rt-1', '1.1.1.1');
      await authService.recordSession(userId, session2, 'rt-2', '2.2.2.2');

      const revokeResult = await authService.revokeSession(userId, session2);
      expect(revokeResult.success).toBe(true);

      // Verify session2 is marked revoked in Redis
      expect(redisMock['auth:revoked_session:session-2']).toBe('1');

      // Verify active sessions now only contain session1
      const active = await authService.getActiveSessions(userId, session1);
      expect(active.sessions.find((s) => s.id === session2)).toBeUndefined();
      expect(active.sessions.some((s) => s.id === session1)).toBe(true);
    });

    it('should sign out all other devices keeping current session active', async () => {
      const userId = 'user-123';
      const currentSession = 'current-device-session';
      const otherSessionA = 'laptop-session';
      const otherSessionB = 'phone-session';

      await authService.recordSession(userId, currentSession, 'rt-curr', '10.0.0.1');
      await authService.recordSession(userId, otherSessionA, 'rt-a', '10.0.0.2');
      await authService.recordSession(userId, otherSessionB, 'rt-b', '10.0.0.3');

      const result = await authService.revokeAllSessions(userId, currentSession, false);
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);

      // Both other sessions must be revoked in Redis
      expect(redisMock[`auth:revoked_session:${otherSessionA}`]).toBe('1');
      expect(redisMock[`auth:revoked_session:${otherSessionB}`]).toBe('1');
      expect(redisMock[`auth:revoked_session:${currentSession}`]).toBeUndefined();

      // Active list should only retain current session
      const remaining = await authService.getActiveSessions(userId, currentSession);
      expect(remaining.sessions.length).toBe(1);
      expect(remaining.sessions[0].id).toBe(currentSession);
    });

    it('should sign out all sessions when includeCurrent is true', async () => {
      const userId = 'user-123';
      const currentSession = 'current-device-session';
      const otherSession = 'laptop-session';

      await authService.recordSession(userId, currentSession, 'rt-curr', '10.0.0.1');
      await authService.recordSession(userId, otherSession, 'rt-a', '10.0.0.2');

      const result = await authService.revokeAllSessions(userId, currentSession, true);
      expect(result.success).toBe(true);
      expect(redisMock[`auth:user_revoked_all_before:${userId}`]).toBeDefined();
    });
  });

  describe('JwtStrategy Token & Session Invalidation Guard', () => {
    let jwtStrategy: JwtStrategy;
    let redisMock: Record<string, any>;
    let prismaMock: any;

    beforeEach(async () => {
      redisMock = {};
      const redisProvider = {
        get: jest.fn(async (key: string) => redisMock[key] ?? null),
        set: jest.fn(async (key: string, val: any) => { redisMock[key] = val; }),
      };

      prismaMock = {
        user: {
          findUnique: jest.fn(async () => ({
            id: 'user-1',
            email: 'user@jupsoft.com',
            name: 'Test User',
            avatar: '',
            status: 'active',
            roleAssignments: [{ role: 'Super Admin', isGlobal: true, websiteId: null }],
          })),
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((k: string) => k === 'JWT_SECRET' ? 'test-secret-at-least-32-chars-long!' : null),
            },
          },
          { provide: PrismaService, useValue: prismaMock },
          { provide: RedisProvider, useValue: redisProvider },
        ],
      }).compile();

      jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
    });

    it('should validate active token with unrevoked sessionId successfully', async () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'user@jupsoft.com',
        roles: ['Super Admin'],
        sessionId: 'session-valid-1',
        iat: Math.floor(Date.now() / 1000),
      };

      const user = await jwtStrategy.validate(payload);
      expect(user).toBeDefined();
      expect(user.id).toBe('user-1');
      expect(user.sessionId).toBe('session-valid-1');
    });

    it('should throw UnauthorizedException if sessionId has been revoked', async () => {
      redisMock['auth:revoked_session:revoked-session-id'] = '1';

      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'user@jupsoft.com',
        roles: ['Super Admin'],
        sessionId: 'revoked-session-id',
        iat: Math.floor(Date.now() / 1000),
      };

      await expect(jwtStrategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token was issued before global revoke timestamp', async () => {
      const tokenIat = 1000;
      redisMock['auth:user_revoked_all_before:user-1'] = '2000'; // Revoked at timestamp 2000

      const payload: JwtPayload = {
        sub: 'user-1',
        email: 'user@jupsoft.com',
        roles: ['Super Admin'],
        sessionId: 'any-session',
        iat: tokenIat,
      };

      await expect(jwtStrategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
