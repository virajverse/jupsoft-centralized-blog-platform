import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteUserDto, UpdateUserRoleDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        roleAssignments: {
          include: {
            website: { select: { id: true, name: true, domain: true } },
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      status: u.status,
      lastLoginIp: u.lastLoginIp,
      roleAssignments: u.roleAssignments.reduce((acc, curr) => {
        acc[curr.websiteId] = curr.role;
        return acc;
      }, {} as Record<string, string>),
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));
  }

  async invite(dto: InviteUserDto, inviter: any) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('A user with this email address already exists');
    }

    const defaultPasswordHash = await bcrypt.hash('Temporary@123', 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        passwordHash: defaultPasswordHash,
        avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80`,
        status: 'active',
        roleAssignments: {
          create: {
            websiteId: dto.websiteId,
            role: dto.role,
          },
        },
      },
      include: {
        roleAssignments: true,
      },
    });

    // Record in audit log
    await this.prisma.systemAuditLog.create({
      data: {
        userName: inviter.name,
        role: inviter.roles[0] || 'Super Admin',
        websiteId: dto.websiteId,
        event: 'user.invited',
        ipAddress: '127.0.0.1',
        details: `Invited user ${user.name} (${user.email}) with role ${dto.role}.`,
      },
    });

    return user;
  }

  async updateRole(userId: string, dto: UpdateUserRoleDto, updater: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User "${userId}" not found`);
    }

    await this.prisma.userRoleAssignment.upsert({
      where: {
        userId_websiteId: {
          userId,
          websiteId: dto.websiteId,
        },
      },
      update: { role: dto.role },
      create: {
        userId,
        websiteId: dto.websiteId,
        role: dto.role,
      },
    });

    await this.prisma.systemAuditLog.create({
      data: {
        userName: updater.name,
        role: updater.roles[0] || 'Super Admin',
        websiteId: dto.websiteId,
        event: 'user.role_updated',
        ipAddress: '127.0.0.1',
        details: `Updated role for ${user.name} to ${dto.role} on ${dto.websiteId}.`,
      },
    });

    return { success: true, message: 'Role updated successfully' };
  }

  async toggleStatus(userId: string, status: string, updater: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User "${userId}" not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    await this.prisma.systemAuditLog.create({
      data: {
        userName: updater.name,
        role: updater.roles[0] || 'Super Admin',
        websiteId: 'system',
        event: 'user.status_updated',
        ipAddress: '127.0.0.1',
        details: `Changed status for ${user.name} to ${status}.`,
      },
    });

    return updated;
  }

  async delete(userId: string, deleter: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User "${userId}" not found`);
    }

    await this.prisma.user.delete({ where: { id: userId } });

    await this.prisma.systemAuditLog.create({
      data: {
        userName: deleter.name,
        role: deleter.roles[0] || 'Super Admin',
        websiteId: 'system',
        event: 'user.deleted',
        ipAddress: '127.0.0.1',
        details: `Deleted account for ${user.name} (${user.email}).`,
      },
    });

    return { success: true, message: 'User deleted' };
  }
}
