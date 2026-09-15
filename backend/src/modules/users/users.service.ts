import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteUserDto, UpdateUserRoleDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(viewer?: any) {
    const isSuperAdmin = viewer?.roles?.includes('Super Admin');
    const where: any = {};

    if (!isSuperAdmin && viewer?.roleAssignments && viewer.roleAssignments.length > 0) {
      const allowedWebsites = viewer.roleAssignments.map((ra: any) => ra.websiteId);
      where.roleAssignments = {
        some: {
          websiteId: { in: allowedWebsites },
        },
      };
    }

    const users = await this.prisma.user.findMany({
      where,
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
        const key = curr.isGlobal || !curr.websiteId ? 'all' : curr.websiteId;
        acc[key] = curr.role;
        return acc;
      }, {} as Record<string, string>),
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));
  }

  async invite(dto: InviteUserDto, inviter: any, ipAddress: string) {
    const isSuperAdmin = inviter?.roles?.includes('Super Admin');
    if (!isSuperAdmin) {
      const inviterSites = inviter?.roleAssignments?.map((ra: any) => ra.websiteId) || [];
      if (!inviterSites.includes(dto.websiteId) && !inviterSites.includes('all')) {
        throw new ForbiddenException('You can only invite team members to your assigned website');
      }
      if (dto.role === 'Super Admin') {
        throw new ForbiddenException('Only Super Admin can assign the Super Admin role');
      }
      const inviterRolesForSite = inviter?.roleAssignments
        ?.filter((ra: any) => ra.websiteId === dto.websiteId || ra.websiteId === 'all')
        ?.map((ra: any) => ra.role) || [];
      if (inviterRolesForSite.includes('Role Admin') && !inviterRolesForSite.includes('Website Admin')) {
        const allowedRoleAdminRoles = ['Editor', 'Content Writer'];
        if (!allowedRoleAdminRoles.includes(dto.role)) {
          throw new ForbiddenException('Role Admins can only assign Editor or Content Writer roles');
        }
      }
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('A user with this email address already exists');
    }

    // Invited users get the provided password from SaaS portal or a strong generated fallback
    const rawPassword = dto.password?.trim() || `Tmp${Math.random().toString(36).slice(2, 10)}!${Date.now().toString(36)}`;
    const defaultPasswordHash = await bcrypt.hash(rawPassword, 10);

    const isGlobal = dto.websiteId === 'all' || !dto.websiteId;
    let targetWebsiteId: string | null = null;
    if (!isGlobal) {
      const siteExists = await this.prisma.website.findUnique({ where: { id: dto.websiteId } });
      if (!siteExists) {
        throw new BadRequestException(`Website with ID "${dto.websiteId}" does not exist`);
      }
      targetWebsiteId = dto.websiteId;
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        passwordHash: defaultPasswordHash,
        avatar: '',
        status: 'active',
        roleAssignments: {
          create: {
            websiteId: targetWebsiteId,
            isGlobal: isGlobal,
            role: dto.role,
          },
        },
      },
      include: {
        roleAssignments: true,
      },
    });

    await this.prisma.systemAuditLog.create({
      data: {
        userName: inviter?.name || 'Admin',
        role: inviter?.roles?.[0] || 'Super Admin',
        websiteId: dto.websiteId,
        event: 'user.invited',
        ipAddress: ipAddress || '',
        details: `Invited user ${user.name} (${user.email}) with role ${dto.role}.`,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      tempPassword: rawPassword,
      roleAssignments: user.roleAssignments.reduce((acc, curr) => {
        const key = curr.isGlobal || !curr.websiteId ? 'all' : curr.websiteId;
        acc[key] = curr.role;
        return acc;
      }, {} as Record<string, string>),
    };
  }

  async updateRole(userId: string, dto: UpdateUserRoleDto, updater: any, ipAddress: string) {
    const isSuperAdmin = updater?.roles?.includes('Super Admin');
    if (!isSuperAdmin) {
      const updaterSites = updater?.roleAssignments?.map((ra: any) => ra.websiteId) || [];
      if (!updaterSites.includes(dto.websiteId) && !updaterSites.includes('all')) {
        throw new ForbiddenException('You can only modify roles for your assigned website');
      }
      if (dto.role === 'Super Admin') {
        throw new ForbiddenException('Only Super Admin can assign the Super Admin role');
      }
      const updaterRolesForSite = updater?.roleAssignments
        ?.filter((ra: any) => ra.websiteId === dto.websiteId || ra.websiteId === 'all')
        ?.map((ra: any) => ra.role) || [];
      if (updaterRolesForSite.includes('Role Admin') && !updaterRolesForSite.includes('Website Admin')) {
        const allowedRoleAdminRoles = ['Editor', 'Content Writer'];
        if (!allowedRoleAdminRoles.includes(dto.role)) {
          throw new ForbiddenException('Role Admins can only assign Editor or Content Writer roles');
        }
      }
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User "${userId}" not found`);
    }

    const isGlobal = dto.websiteId === 'all' || !dto.websiteId;
    const targetWebsiteId = isGlobal ? null : dto.websiteId;

    const existingAssignment = await this.prisma.userRoleAssignment.findFirst({
      where: {
        userId,
        ...(isGlobal ? { isGlobal: true } : { websiteId: targetWebsiteId }),
      },
    });

    if (existingAssignment) {
      await this.prisma.userRoleAssignment.update({
        where: { id: existingAssignment.id },
        data: { role: dto.role },
      });
    } else {
      await this.prisma.userRoleAssignment.create({
        data: {
          userId,
          websiteId: targetWebsiteId,
          isGlobal,
          role: dto.role,
        },
      });
    }

    await this.prisma.systemAuditLog.create({
      data: {
        userName: updater.name,
        role: updater.roles[0] || 'Super Admin',
        websiteId: dto.websiteId,
        event: 'user.role_updated',
        ipAddress: ipAddress || '',
        details: `Updated role for ${user.name} to ${dto.role} on ${dto.websiteId}.`,
      },
    });

    return { success: true, message: 'Role updated successfully' };
  }

  async toggleStatus(userId: string, status: string, updater: any, ipAddress: string) {
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
        ipAddress: ipAddress || '',
        details: `Changed status for ${user.name} to ${status}.`,
      },
    });

    return updated;
  }

  async delete(userId: string, deleter: any, ipAddress: string) {
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
        ipAddress: ipAddress || '',
        details: `Deleted account for ${user.name} (${user.email}).`,
      },
    });

    return { success: true, message: 'User deleted' };
  }
}
