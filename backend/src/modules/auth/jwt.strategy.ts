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
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'jupsoft_enterprise_jwt_super_secret_key_2026',
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

    // Map role assignments
    const roles = user.roleAssignments.map((r) => r.role);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      roles,
      roleAssignments: user.roleAssignments,
    };
  }
}
