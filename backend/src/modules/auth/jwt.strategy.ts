import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
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
    return {
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
    };
  }
}
