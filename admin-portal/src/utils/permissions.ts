import { UserRole, AppModule } from '../types';
export type { AppModule };

/**
 * Modular Plugin-Type Feature Visibility Matrix
 * Maps each UserRole to the exact list of application modules they are permitted to see.
 */
const ROLE_MODULE_PERMISSIONS: Record<UserRole, AppModule[]> = {
  'Super Admin': [
    'dashboard',
    'blogs',
    'workflow',
    'media',
    'taxonomy',
    'redirects',
    'analytics',
    'users',
    'settings',
    'plugins',
  ],
  'Website Admin': [
    'dashboard',
    'blogs',
    'workflow',
    'media',
    'taxonomy',
    'redirects',
    'analytics',
    'users',
    'settings',
    'plugins',
  ],
  'Role Admin': [
    'dashboard',
    'blogs',
    'workflow',
    'media',
    'taxonomy',
    'users',
  ],
  'Editor': [
    'dashboard',
    'blogs',
    'workflow',
    'media',
    'taxonomy',
  ],
  'Content Writer': [
    'dashboard',
    'blogs',
    'media',
  ],
  'Publisher': [
    'dashboard',
    'blogs',
    'workflow',
    'media',
    'redirects',
  ],
  'SEO Manager': [
    'dashboard',
    'blogs',
    'taxonomy',
    'redirects',
    'analytics',
  ],
};

export function getDefaultRoleModules(role: UserRole | string | undefined): AppModule[] {
  if (!role) return [];
  if (role === 'Super Admin') {
    return [
      'dashboard',
      'blogs',
      'workflow',
      'media',
      'taxonomy',
      'redirects',
      'analytics',
      'users',
      'settings',
      'plugins',
    ];
  }
  return [...(ROLE_MODULE_PERMISSIONS[role as UserRole] || [])];
}

export function canAccessModule(
  role: UserRole | string | undefined,
  module: AppModule,
  customModules?: AppModule[]
): boolean {
  if (!role) return false;
  if (role === 'Super Admin') return true;
  if (module === 'dashboard') return true;

  // If custom module permissions are configured for this user, they strictly dictate access (both ON and OFF)
  if (customModules && Array.isArray(customModules) && customModules.length > 0) {
    return customModules.includes(module);
  }

  // Fallback to role defaults if no custom modules are specified
  const allowed = ROLE_MODULE_PERMISSIONS[role as UserRole];
  return allowed ? allowed.includes(module) : false;
}

export function canCreateBlog(role: UserRole | string | undefined): boolean {
  return (
    role === 'Super Admin' ||
    role === 'Website Admin' ||
    role === 'Role Admin' ||
    role === 'Editor' ||
    role === 'Content Writer'
  );
}

export function canEditBlog(role: UserRole | string | undefined): boolean {
  return (
    role === 'Super Admin' ||
    role === 'Website Admin' ||
    role === 'Role Admin' ||
    role === 'Editor' ||
    role === 'Content Writer' ||
    role === 'Publisher' ||
    role === 'SEO Manager'
  );
}

export function canPublish(role: UserRole | string | undefined): boolean {
  return role === 'Super Admin' || role === 'Website Admin' || role === 'Publisher';
}

export function canApprove(role: UserRole | string | undefined): boolean {
  return role === 'Super Admin' || role === 'Website Admin' || role === 'Role Admin' || role === 'Editor';
}

export function canDeleteBlog(role: UserRole | string | undefined): boolean {
  return role === 'Super Admin' || role === 'Website Admin';
}

export function canManageUsers(role: UserRole | string | undefined): boolean {
  return role === 'Super Admin' || role === 'Website Admin' || role === 'Role Admin';
}

export function canManageWebsites(role: UserRole | string | undefined): boolean {
  return role === 'Super Admin';
}

export function canEditWebsiteSettings(role: UserRole | string | undefined): boolean {
  return role === 'Super Admin' || role === 'Website Admin';
}

export function isGlobalScopeRole(role: UserRole | string | undefined): boolean {
  return role === 'Super Admin';
}

/**
 * Returns allowed roles that the current user can assign when inviting a new team member.
 * - Super Admin can assign any role.
 * - Website Admin can assign any role EXCEPT Super Admin.
 * - Role Admin can assign roles only within their functional scope.
 */
export function getAllowedInviteRoles(
  currentRole: UserRole | string | undefined,
  managedRoles?: UserRole[],
): UserRole[] {
  if (currentRole === 'Super Admin') {
    return [
      'Super Admin',
      'Website Admin',
      'Role Admin',
      'Editor',
      'Content Writer',
      'Publisher',
      'SEO Manager',
    ];
  }
  if (currentRole === 'Website Admin') {
    return [
      'Role Admin',
      'Editor',
      'Content Writer',
      'Publisher',
      'SEO Manager',
    ];
  }
  if (currentRole === 'Role Admin') {
    if (managedRoles && managedRoles.length > 0) {
      return managedRoles;
    }
    return [
      'Editor',
      'Content Writer',
    ];
  }
  return [];
}

/**
 * Strict Avatar Sanitizer
 * Rejects any external or online photo (e.g. Unsplash, third-party HTTP/HTTPS JPG/PNG).
 * Only permits local /vectors/*.svg assets or inline SVG data URIs.
 */
export function cleanAvatarUrl(avatar?: string | null): string | null {
  if (!avatar || typeof avatar !== 'string') return null;
  let trimmed = avatar.trim();
  if (trimmed === '') return null;
  // Normalize upload URLs to relative /uploads
  if (trimmed.startsWith('https://blogary.jupsoft.com/uploads/')) {
    trimmed = trimmed.replace('https://blogary.jupsoft.com', '');
  } else if (trimmed.startsWith('http://localhost:4000/uploads/')) {
    trimmed = trimmed.replace('http://localhost:4000', '');
  } else if (trimmed.startsWith('http://localhost:3000/uploads/')) {
    trimmed = trimmed.replace('http://localhost:3000', '');
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('unsplash')) {
    return null;
  }
  return trimmed;
}
