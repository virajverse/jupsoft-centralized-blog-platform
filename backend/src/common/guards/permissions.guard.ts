/**
 * PermissionsGuard — TRD §5 Composable RBAC
 *
 * Reads required permissions from @RequirePermissions() decorator.
 * Checks the authenticated user's roles against ROLE_PERMISSIONS map.
 * Super Admin always passes.
 */
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission, rolesHavePermission } from '../permissions/permissions.constants';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const userRoles: string[] = user.roles || [];

    // Super Admin bypasses all permission checks
    if (userRoles.includes('Super Admin')) {
      return true;
    }

    // Check all required permissions
    const missingPermissions = requiredPermissions.filter(
      (perm) => !rolesHavePermission(userRoles, perm),
    );

    if (missingPermissions.length > 0) {
      throw new ForbiddenException(
        `Missing required permissions: ${missingPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
