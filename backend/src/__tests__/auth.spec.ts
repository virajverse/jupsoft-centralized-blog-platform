/**
 * AUTH TESTS — Phase 4
 * Tests: login, invalid credentials, brute-force, JWT tamper, refresh rotation, logout
 */
import { AuthService } from '../modules/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  systemAuditLog: { create: jest.fn() },
};
const mockJwt = {
  sign: jest.fn(() => 'signed.token.value'),
  verify: jest.fn(),
};
const mockConfig = { get: jest.fn((key: string) => {
  const map: Record<string, string> = {
    JWT_SECRET: 'test-jwt-secret-32chars-long-enough',
    JWT_REFRESH_SECRET: 'test-refresh-secret-32chars-long',
    JWT_EXPIRATION: '7d',
    JWT_REFRESH_EXPIRATION: '30d',
  };
  return map[key];
})};
const mockRedis = {
  get: jest.fn(() => null),
  set: jest.fn(),
};

const makeUser = (overrides: any = {}) => ({
  id: 'user-uuid-1',
  email: 'admin@test.com',
  passwordHash: '$2b$10$hashedpassword',
  name: 'Test Admin',
  avatar: '',
  status: 'active',
  loginAttempts: 0,
  lockoutUntil: null,
  roleAssignments: [{ role: 'Super Admin', websiteId: null, isGlobal: true }],
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      mockPrisma as any,
      mockJwt as any,
      mockConfig as any,
      mockRedis as any,
    );
  });

  // ── PHASE 4.1: Valid login ─────────────────────────────────────────────
  describe('login()', () => {
    it('should return tokens and user on valid credentials', async () => {
      const user = makeUser();
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue(user);
      mockPrisma.systemAuditLog.create.mockResolvedValue({});
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login({ email: 'admin@test.com', password: 'ValidPass123!' }, '127.0.0.1');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('admin@test.com');
    });

    // PHASE 4.2: Invalid password
    it('should throw UnauthorizedException on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockPrisma.user.update.mockResolvedValue({});
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login({ email: 'admin@test.com', password: 'WrongPass!' }, '127.0.0.1'))
        .rejects.toThrow('Invalid email or password');
    });

    // PHASE 4.3: Non-existent user
    it('should throw UnauthorizedException for unknown email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ email: 'nobody@test.com', password: 'any' }, '127.0.0.1'))
        .rejects.toThrow('Invalid email or password');
    });

    // PHASE 4.4: Suspended account
    it('should throw for suspended account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser({ status: 'suspended' }));

      await expect(service.login({ email: 'admin@test.com', password: 'any' }, '127.0.0.1'))
        .rejects.toThrow('suspended');
    });

    // PHASE 4.5: Brute-force lockout
    it('should lock account after 5 failed attempts', async () => {
      const user = makeUser({ loginAttempts: 4, lockoutUntil: null });
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({});
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login({ email: 'admin@test.com', password: 'Wrong!' }, '127.0.0.1'))
        .rejects.toThrow('locked');
    });

    // PHASE 4.6: Locked account
    it('should reject login when account is locked', async () => {
      const lockoutUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 min in future
      mockPrisma.user.findUnique.mockResolvedValue(makeUser({ lockoutUntil }));

      await expect(service.login({ email: 'admin@test.com', password: 'any' }, '127.0.0.1'))
        .rejects.toThrow('locked');
    });

    // PHASE 4.7: Email case normalization
    it('should normalize email to lowercase on lookup', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await service.login({ email: 'ADMIN@TEST.COM', password: 'pass' }, '127.0.0.1').catch(() => {});
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'admin@test.com' } })
      );
    });
  });

  // ── PHASE 4.8: Refresh token rotation ─────────────────────────────────
  describe('refreshToken()', () => {
    it('should return new tokens on valid refresh token', async () => {
      mockRedis.get.mockResolvedValue(null); // not revoked
      mockJwt.verify.mockReturnValue({ sub: 'user-uuid-1', email: 'admin@test.com', roles: ['Super Admin'] });
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.refreshToken({ refreshToken: 'valid.refresh.token' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should reject revoked refresh token (replay attack)', async () => {
      mockRedis.get.mockResolvedValue('1'); // token is revoked

      await expect(service.refreshToken({ refreshToken: 'revoked.token' }))
        .rejects.toThrow('revoked');
    });

    it('should reject expired/invalid refresh token', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockJwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });

      await expect(service.refreshToken({ refreshToken: 'expired.token' }))
        .rejects.toThrow();
    });

    it('should revoke old refresh token on rotation (one-time use)', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockJwt.verify.mockReturnValue({ sub: 'user-uuid-1', email: 'admin@test.com', roles: [] });
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockRedis.set.mockResolvedValue('OK');

      await service.refreshToken({ refreshToken: 'valid.refresh.token' });
      // Redis.set should be called to revoke old token
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('auth:revoked_rt:'),
        '1',
        expect.any(Number)
      );
    });
  });

  // ── PHASE 4.9: Logout ──────────────────────────────────────────────────
  describe('logout()', () => {
    it('should revoke refresh token on logout', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'user-uuid-1' });
      mockRedis.set.mockResolvedValue('OK');
      mockPrisma.systemAuditLog.create.mockResolvedValue({});

      const result = await service.logout({ refreshToken: 'valid.refresh.token' }, 'user-uuid-1');
      expect(result.success).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('auth:revoked_rt:'),
        '1',
        expect.any(Number)
      );
    });

    it('should not allow revoking another user\'s token', async () => {
      // mockJwt.verify returns sub='different-user-uuid' but userId='user-uuid-1'
      // The code throws 'Cannot revoke a token belonging to another user'
      // But when verify throws (e.g. token is invalid), it catches and throws 'Invalid refresh token'
      // We need to use a valid verify (returns different sub) to test this path
      mockJwt.verify.mockReturnValue({ sub: 'different-user-uuid' });

      await expect(service.logout({ refreshToken: 'other.user.token' }, 'user-uuid-1'))
        .rejects.toThrow();
    });
  });

  // ── PHASE 4.10: Change password ────────────────────────────────────────
  describe('changePassword()', () => {
    it('should reject same new password as current', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await expect(service.changePassword('user-uuid-1', {
        currentPassword: 'SamePass123!',
        newPassword: 'SamePass123!',
      }, '127.0.0.1')).rejects.toThrow('different');
    });

    it('should reject wrong current password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.changePassword('user-uuid-1', {
        currentPassword: 'WrongPass!',
        newPassword: 'NewPass456!',
      }, '127.0.0.1')).rejects.toThrow('incorrect');
    });
  });
});
