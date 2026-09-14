import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RefreshTokenDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

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

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login IP
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginIp: ipAddress },
    });

    // Record login in audit log
    await this.prisma.systemAuditLog.create({
      data: {
        userName: user.name,
        role: user.roleAssignments[0]?.role || 'Staff Writer',
        websiteId: 'system',
        event: 'user.login',
        ipAddress: ipAddress || '127.0.0.1',
        details: `User ${user.name} logged in successfully`,
      },
    });

    const roles = user.roleAssignments.map((r) => r.role);
    const payload = { sub: user.id, email: user.email, roles };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>('JWT_EXPIRATION') || '7d') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'jupsoft_enterprise_refresh_super_secret_key_2026',
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '30d') as any,
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
        roleAssignments: user.roleAssignments.reduce((acc, curr) => {
          acc[curr.websiteId] = curr.role;
          return acc;
        }, {} as Record<string, string>),
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'jupsoft_enterprise_refresh_super_secret_key_2026',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { roleAssignments: true },
      });

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('Invalid user account');
      }

      const roles = user.roleAssignments.map((r) => r.role);
      const newPayload = { sub: user.id, email: user.email, roles };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: (this.configService.get<string>('JWT_EXPIRATION') || '7d') as any,
      });

      return { accessToken };
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleAssignments: {
          include: { website: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      lastLoginIp: user.lastLoginIp,
      roleAssignments: user.roleAssignments.reduce((acc, curr) => {
        acc[curr.websiteId] = curr.role;
        return acc;
      }, {} as Record<string, string>),
    };
  }
}
