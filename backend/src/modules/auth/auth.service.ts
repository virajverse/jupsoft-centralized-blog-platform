import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RefreshTokenDto, ChangePasswordDto, LogoutDto } from './dto/login.dto';
import { RedisProvider } from '../../common/providers/redis.provider';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Redis key prefix for revoked refresh tokens
// Value: '1', TTL = JWT_REFRESH_EXPIRATION seconds (so old keys auto-expire)
const REVOKED_TOKEN_PREFIX = 'auth:revoked_rt:';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisProvider,
  ) {}

  private get jwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('[SECURITY] JWT_SECRET is not configured');
    return secret;
  }

  private get jwtRefreshSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) throw new Error('[SECURITY] JWT_REFRESH_SECRET is not configured');
    return secret;
  }

  private get jwtExpiration(): string {
    return this.configService.get<string>('JWT_EXPIRATION') || '15m';
  }

  private get jwtRefreshExpiration(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '30d';
  }

  async login(dto: LoginDto, ipAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        roleAssignments: {
          include: { website: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('This account has been suspended');
    }

    // --- Brute Force Protection ---
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remaining = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(
        `Account locked due to too many failed attempts. Try again in ${remaining} minute(s).`,
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      const newAttempts = user.loginAttempts + 1;
      const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: newAttempts,
          lockoutUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
        },
      });

      if (shouldLock) {
        throw new ForbiddenException(
          'Too many failed login attempts. Account locked for 15 minutes.',
        );
      }

      throw new UnauthorizedException(
        `Invalid email or password. ${MAX_LOGIN_ATTEMPTS - newAttempts} attempt(s) remaining.`,
      );
    }

    // --- Success: reset lockout counters ---
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginIp: ipAddress || '',
        loginAttempts: 0,
        lockoutUntil: null,
      },
    });

    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: user.roleAssignments[0]?.role || 'Staff Writer',
        websiteId: 'system',
        event: 'user.login',
        ipAddress: ipAddress || '',
        details: `User ${user.name} (${user.email}) logged in from ${ipAddress || 'unknown'}.`,
      },
    });

    const roles = user.roleAssignments.map((r) => r.role);
    const payload = { sub: user.id, email: user.email, roles };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiration as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this.jwtRefreshExpiration as any,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        roles,
        customModules: user.customModules || [],
        roleAssignments: user.roleAssignments.reduce((acc, curr) => {
          const key = curr.isGlobal || !curr.websiteId ? 'all' : curr.websiteId;
          acc[key] = curr.role;
          return acc;
        }, {} as Record<string, string>),
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    // ── Step 1: Check if this refresh token has been revoked (logout) ──────
    const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
    const isRevoked = await this.redis.get<string>(`${REVOKED_TOKEN_PREFIX}${tokenHash}`);
    if (isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked. Please log in again.');
    }

    // ── Step 2: Verify signature and expiry ───────────────────────────────
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roleAssignments: true },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User account not found or suspended');
    }

    // ── Step 3: Revoke the OLD refresh token (token rotation — one-time use) ──
    const refreshTtlSeconds = this.parseExpirationToSeconds(this.jwtRefreshExpiration);
    await this.redis.set(
      `${REVOKED_TOKEN_PREFIX}${tokenHash}`,
      '1',
      refreshTtlSeconds,
    );

    const roles = user.roleAssignments.map((r) => r.role);
    const newPayload = { sub: user.id, email: user.email, roles };

    const accessToken = this.jwtService.sign(newPayload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiration as any,
    });

    const newRefreshToken = this.jwtService.sign(newPayload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this.jwtRefreshExpiration as any,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout — invalidates the refresh token by adding its SHA-256 hash to
   * the Redis revocation set. The entry auto-expires after the refresh token TTL.
   * This prevents the token from being used for token rotation after logout.
   */
  async logout(dto: LogoutDto, userId: string) {
    const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
    const refreshTtlSeconds = this.parseExpirationToSeconds(this.jwtRefreshExpiration);

    // Verify the token belongs to this user (prevent others from revoking tokens they don't own)
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.jwtRefreshSecret,
      });
      if (payload.sub !== userId) {
        throw new UnauthorizedException('Cannot revoke a token belonging to another user');
      }
    } catch (err: any) {
      // If already expired, still mark as revoked so it can't be replayed before expiry window
      if (err?.name !== 'TokenExpiredError') {
        throw new UnauthorizedException('Invalid refresh token provided for logout');
      }
    }

    await this.redis.set(`${REVOKED_TOKEN_PREFIX}${tokenHash}`, '1', refreshTtlSeconds);

    await this.prisma.systemAuditLog.create({
      data: {
        userName: 'User',
        role: 'User',
        websiteId: 'system',
        event: 'user.logout',
        ipAddress: '',
        details: `User ${userId} logged out and revoked refresh token.`,
      },
    });

    return { success: true, message: 'Logged out successfully. Refresh token revoked.' };
  }

  async getProfile(userId: string) {
    const cacheKey = `auth:profile:${userId}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        status: true,
        lastLoginIp: true,
        customModules: true,
        roleAssignments: {
          select: {
            isGlobal: true,
            websiteId: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      lastLoginIp: user.lastLoginIp,
      customModules: user.customModules || [],
      roleAssignments: user.roleAssignments.reduce((acc, curr) => {
        const key = curr.isGlobal || !curr.websiteId ? 'all' : curr.websiteId;
        acc[key] = curr.role;
        return acc;
      }, {} as Record<string, string>),
    };

    // Cache profile for 60 seconds (0-delay for fast multi-tab navigations)
    await this.redis.set(cacheKey, profile, 60);

    return profile;
  }

  async changePassword(userId: string, dto: ChangePasswordDto, ipAddress: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await this.redis.del(`auth:profile:${userId}`);

    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: 'User',
        websiteId: 'system',
        event: 'user.password_changed',
        ipAddress: ipAddress || '',
        details: `User ${user.name} (${user.email}) changed their password.`,
      },
    });

    return { success: true, message: 'Password changed successfully' };
  }

  /**
   * Parse expiration strings like '30d', '15m', '1h' into seconds for Redis TTL.
   */
  private parseExpirationToSeconds(exp: string): number {
    const match = exp.match(/^(\d+)([smhd])$/);
    if (!match) return 60 * 60 * 24 * 30; // default 30 days
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] || 1);
  }
}