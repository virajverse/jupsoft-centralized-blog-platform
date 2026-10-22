import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisProvider } from '../../common/providers/redis.provider';
import * as crypto from 'crypto';

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
      passReqToCallback: true,
    });
  }

  async validate(reqOrPayload: any, maybePayload?: JwtPayload) {
    const hasReq = maybePayload !== undefined;
    const req = hasReq ? reqOrPayload : null;
    const payload: JwtPayload = hasReq ? maybePayload! : reqOrPayload;

    // Determine deterministic sessionId (extract from payload or derive from bearer token for legacy tokens)
    let sessionId = payload.sessionId;
    if (!sessionId && req) {
      try {
        const authHeader = req.headers?.authorization || req.headers?.Authorization;
        if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
          const rawToken = authHeader.substring(7);
          const hash = crypto.createHash('sha256').update(rawToken).digest('hex').substring(0, 16);
          sessionId = `legacy_${hash}`;
        }
      } catch {}
    }

    // 1. Session Revocation Check: Instant multi-device token invalidation
    if (sessionId) {
      const isSessionRevoked = await this.redis.get<string>(`auth:revoked_session:${sessionId}`);
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

    // 3. Debounced Session Activity Touch (once every 60s per session)
    if (sessionId && payload.sub) {
      const touchKey = `auth:session_touch:${sessionId}`;
      this.redis.get<string>(touchKey).then((exists) => {
        if (!exists) {
          this.redis.set(touchKey, '1', 60);
          const key = `auth:sessions:${payload.sub}`;
          this.redis.get<any[]>(key).then((raw) => {
            if (raw && Array.isArray(raw) && raw.length > 0) {
              const nowIso = new Date().toISOString();
              let modified = false;
              const mapped = raw.map((s) => {
                if (s.id === sessionId) {
                  modified = true;
                  return { ...s, lastActiveAt: nowIso };
                }
                return s;
              });
              if (modified) {
                this.redis.set(key, mapped, 60 * 60 * 24 * 30);
              }
            }
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    const cacheKey = `auth:user:${payload.sub}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) {
      return { ...cached, sessionId };
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
      sessionId,
    };

    // Cache user object for 60s to avoid DB hit on every request
    await this.redis.set(cacheKey, authUser, 60);

    return authUser;
  }
}
