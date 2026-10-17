import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User authentication required for role verification');
    }

    // Super Admin bypasses all checks
    const userRoles = user.roles || [];
    if (userRoles.includes('Super Admin')) {
      return true;
    }

    // Determine target website scope if present in request (query, body, or header)
    const targetWebsiteId = request.query?.websiteId || request.body?.websiteId || request.headers?.['x-website-id'];

    // FIX 13: Use isGlobal flag instead of websiteId='all' sentinel
    let applicableRoles: string[] = userRoles;
    if (targetWebsiteId && user.roleAssignments && user.roleAssignments.length > 0) {
      applicableRoles = user.roleAssignments
        .filter((ra: any) => ra.isGlobal || ra.websiteId === targetWebsiteId)
        .map((ra: any) => ra.role);
    }

    // If user has Website Admin on target site, they have all non-Super Admin permissions for that site
    if (applicableRoles.includes('Website Admin') && !requiredRoles.includes('Super Admin')) {
      return true;
    }

    const hasRole = requiredRoles.some((role) => applicableRoles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(`Insufficient permissions. Required role(s): ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
