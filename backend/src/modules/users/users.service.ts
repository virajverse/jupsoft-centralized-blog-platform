import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisProvider } from '../../common/providers/redis.provider';
import { InviteUserDto, UpdateUserRoleDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisProvider,
  ) {}

  async findAll(viewer?: any) {
    const isSuperAdmin = viewer?.roles?.includes('Super Admin');
    const allowedWebsites = viewer?.roleAssignments?.map((ra: any) => ra.websiteId) || [];
    const cacheKey = `admin:users:${isSuperAdmin ? 'super' : (allowedWebsites.sort().join('_') || 'viewer')}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const where: any = {};

    if (!isSuperAdmin && viewer?.roleAssignments && viewer.roleAssignments.length > 0) {
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

    const result = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      status: u.status,
      lastLoginIp: u.lastLoginIp,
      customModules: u.customModules || [],
      roleAssignments: u.roleAssignments.reduce((acc, curr) => {
        const key = curr.isGlobal || !curr.websiteId ? 'all' : curr.websiteId;
        acc[key] = curr.role;
        return acc;
      }, {} as Record<string, string>),
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));

    await this.redis.set(cacheKey, result, 120);
    return result;
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
        customModules: dto.customModules || [],
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

    await this.invalidateUserCache();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      customModules: user.customModules || [],
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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roleAssignments: true },
    });
    if (!user) {
      throw new NotFoundException(`User "${userId}" not found`);
    }

    // 🛡️ CRITICAL SECURITY GUARD: Super Admin master role cannot be revoked or downgraded
    const isTargetSuperAdmin =
      userId === 'usr-superadmin' ||
      user.email === 'superadmin@jupsoft.com' ||
      user.roleAssignments?.some((ra) => ra.role === 'Super Admin' && ra.isGlobal);

    if (isTargetSuperAdmin && dto.role !== 'Super Admin') {
      throw new ForbiddenException('Super Admin master role cannot be revoked, modified, or downgraded.');
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

    await this.invalidateUserCache();
    return { success: true, message: 'Role updated successfully' };
  }

  async toggleStatus(userId: string, status: string, updater: any, ipAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roleAssignments: true },
    });
    if (!user) {
      throw new NotFoundException(`User "${userId}" not found`);
    }

    // 🛡️ CRITICAL SECURITY GUARD: Super Admin account cannot be deactivated or suspended
    if (
      user.id === 'usr-superadmin' ||
      user.email === 'superadmin@jupsoft.com' ||
      user.roleAssignments?.some((ra) => ra.role === 'Super Admin' && ra.isGlobal)
    ) {
      throw new ForbiddenException('Super Admin status cannot be altered. The master administrator must remain active.');
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

    await this.invalidateUserCache();
    return updated;
  }

  async delete(userId: string, deleter: any, ipAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roleAssignments: true },
    });
    if (!user) {
      throw new NotFoundException(`User "${userId}" not found`);
    }

    // 🛡️ CRITICAL SECURITY GUARD: Super Admin accounts CANNOT be deleted
    const isTargetSuperAdmin =
      user.id === 'usr-superadmin' ||
      user.email === 'superadmin@jupsoft.com' ||
      user.roleAssignments?.some((ra) => ra.role === 'Super Admin' && ra.isGlobal);

    if (isTargetSuperAdmin) {
      throw new ForbiddenException(
        'Super Admin accounts are permanently protected and cannot be deleted or revoked.',
      );
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

    await this.invalidateUserCache();
    return { success: true, message: 'User deleted' };
  }

  async resetPassword(userId: string, requester: any, ipAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roleAssignments: true },
    });
    if (!user) {
      throw new NotFoundException(`User "${userId}" not found`);
    }

    const isSuperAdmin = requester?.roles?.includes('Super Admin');
    if (!isSuperAdmin) {
      const requesterSites = requester?.roleAssignments?.map((ra: any) => ra.websiteId) || [];
      const userSites = user.roleAssignments.map((ra) => ra.websiteId || 'all');
      const hasOverlap = userSites.some((s) => requesterSites.includes(s) || requesterSites.includes('all'));
      if (!hasOverlap) {
        throw new ForbiddenException('You do not have permission to reset credentials for this user');
      }
    }

    // Generate strong 12-char temporary password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
    let rawPassword = 'Jup@';
    for (let i = 0; i < 8; i++) {
      rawPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.prisma.systemAuditLog.create({
      data: {
        userName: requester?.name || 'Admin',
        role: requester?.roles?.[0] || 'Super Admin',
        websiteId: user.roleAssignments[0]?.websiteId || 'system',
        event: 'user.password_reset',
        ipAddress: ipAddress || '',
        details: `Reset password credentials for ${user.name} (${user.email}).`,
      },
    });

    await this.invalidateUserCache();
    return {
      success: true,
      userId: user.id,
      email: user.email,
      tempPassword: rawPassword,
      message: 'Temporary password generated successfully',
    };
  }

  async updateModules(userId: string, modules: string[], updater: any, ipAddress: string) {
    const isSuperAdmin = updater?.roles?.includes('Super Admin');
    const isWebsiteAdmin = updater?.roles?.includes('Website Admin');
    if (!isSuperAdmin && !isWebsiteAdmin) {
      throw new ForbiddenException('Only Super Admin or Website Admin can customize modular permissions');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        customModules: modules,
      },
    });

    await this.prisma.systemAuditLog.create({
      data: {
        userName: updater?.name || 'Admin',
        role: updater?.roles?.[0] || 'Super Admin',
        websiteId: 'system',
        event: 'user.permissions_updated',
        ipAddress: ipAddress || '',
        details: `Updated custom modules for ${user.name} (${user.email}): [${modules.join(', ')}].`,
      },
    });

    await this.invalidateUserCache();
    await this.redis.del(`auth:profile:${userId}`);

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      customModules: updated.customModules,
      message: 'Modular permissions successfully updated in database',
    };
  }

  private async invalidateUserCache() {
    await Promise.allSettled([
      this.redis.delPattern('admin:users:*'),
      this.redis.delPattern('auth:user:*'),
      this.redis.delPattern('auth:profile:*'),
    ]);
  }
}
