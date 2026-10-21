import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisProvider } from '../../common/providers/redis.provider';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  sessionId?: string;
  iat?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
    private redis: RedisProvider,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        '[SECURITY] JWT_SECRET is not set. ' +
        'JwtStrategy cannot be initialized without a secret.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    // 1. Session Revocation Check: Instant multi-device token invalidation
    if (payload.sessionId) {
      const isSessionRevoked = await this.redis.get<string>(`auth:revoked_session:${payload.sessionId}`);
      if (isSessionRevoked) {
        throw new UnauthorizedException('This session has been revoked. Please sign in again.');
      }
    }

    // 2. Global Sign-Out Check: If all sessions were revoked after token iat
    if (payload.iat) {
      const revokedAllBefore = await this.redis.get<string>(`auth:user_revoked_all_before:${payload.sub}`);
      if (revokedAllBefore && payload.iat < Number(revokedAllBefore)) {
        throw new UnauthorizedException('All sessions have been signed out. Please sign in again.');
      }
    }

    const cacheKey = `auth:user:${payload.sub}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) {
      return { ...cached, sessionId: payload.sessionId };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roleAssignments: true,
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User account is inactive or not found');
    }

    // Map role assignments — include isGlobal for RolesGuard (FIX 13)
    const roles = user.roleAssignments.map((r) => r.role);
    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      roles,
      // Pass full roleAssignments (with isGlobal flag) so guards can scope-check
      roleAssignments: user.roleAssignments.map((ra) => ({
        websiteId: ra.websiteId,
        isGlobal: ra.isGlobal,
        role: ra.role,
      })),
      sessionId: payload.sessionId,
    };

    // Cache user object for 60s to avoid DB hit on every request
    await this.redis.set(cacheKey, authUser, 60);

    return authUser;
  }
}
