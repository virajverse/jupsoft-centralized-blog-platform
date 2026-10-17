/**
 * Permissions Constants — TRD §5 Composable RBAC
 *
 * Granular permission scopes that map to roles.
 * Each permission is a string constant: '<resource>.<action>'
 * New roles can be composed from these without code changes to guards.
 */

export const PERMISSIONS = {
  // Blog permissions
  BLOG_CREATE: 'blog.create',
  BLOG_READ: 'blog.read',
  BLOG_UPDATE: 'blog.update',
  BLOG_DELETE: 'blog.delete',
  BLOG_SUBMIT: 'blog.submit',
  BLOG_APPROVE: 'blog.approve',
  BLOG_PUBLISH: 'blog.publish',
  BLOG_SCHEDULE: 'blog.schedule',
  BLOG_ARCHIVE: 'blog.archive',
  BLOG_SEO_AUDIT: 'blog.seo_audit',

  // SEO permissions
  SEO_EDIT: 'seo.edit',
  SEO_READ: 'seo.read',

  // Media permissions
  MEDIA_UPLOAD: 'media.upload',
  MEDIA_READ: 'media.read',
  MEDIA_DELETE: 'media.delete',

  // Website/tenant permissions
  SITE_MANAGE: 'site.manage',
  SITE_READ: 'site.read',

  // User management
  USER_MANAGE: 'user.manage',
  USER_READ: 'user.read',

  // Analytics
  ANALYTICS_READ: 'analytics.read',

  // Taxonomy
  TAXONOMY_MANAGE: 'taxonomy.manage',
  TAXONOMY_READ: 'taxonomy.read',

  // Redirects
  REDIRECT_MANAGE: 'redirect.manage',
  REDIRECT_READ: 'redirect.read',

  // Audit logs
  AUDIT_READ: 'audit.read',

  // Webhook management
  WEBHOOK_MANAGE: 'webhook.manage',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Role-to-permissions mapping.
 * TRD §5: Permissions stored as granular scopes mapped to roles.
 * To add a new role, add it here without changing any guard code.
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  'Super Admin': Object.values(PERMISSIONS) as Permission[], // All permissions

  'Website Admin': [
    PERMISSIONS.BLOG_CREATE, PERMISSIONS.BLOG_READ, PERMISSIONS.BLOG_UPDATE,
    PERMISSIONS.BLOG_DELETE, PERMISSIONS.BLOG_SUBMIT, PERMISSIONS.BLOG_APPROVE,
    PERMISSIONS.BLOG_PUBLISH, PERMISSIONS.BLOG_SCHEDULE, PERMISSIONS.BLOG_ARCHIVE,
    PERMISSIONS.BLOG_SEO_AUDIT,
    PERMISSIONS.SEO_EDIT, PERMISSIONS.SEO_READ,
    PERMISSIONS.MEDIA_UPLOAD, PERMISSIONS.MEDIA_READ, PERMISSIONS.MEDIA_DELETE,
    PERMISSIONS.SITE_READ,
    PERMISSIONS.USER_MANAGE, PERMISSIONS.USER_READ,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.TAXONOMY_MANAGE, PERMISSIONS.TAXONOMY_READ,
    PERMISSIONS.REDIRECT_MANAGE, PERMISSIONS.REDIRECT_READ,
    PERMISSIONS.AUDIT_READ,
  ],

  'Role Admin': [
    PERMISSIONS.BLOG_CREATE, PERMISSIONS.BLOG_READ, PERMISSIONS.BLOG_UPDATE,
    PERMISSIONS.BLOG_SUBMIT, PERMISSIONS.BLOG_APPROVE, PERMISSIONS.BLOG_ARCHIVE,
    PERMISSIONS.BLOG_SEO_AUDIT,
    PERMISSIONS.SEO_EDIT, PERMISSIONS.SEO_READ,
    PERMISSIONS.MEDIA_UPLOAD, PERMISSIONS.MEDIA_READ,
    PERMISSIONS.TAXONOMY_MANAGE, PERMISSIONS.TAXONOMY_READ,
    PERMISSIONS.USER_READ, PERMISSIONS.USER_MANAGE,
    PERMISSIONS.ANALYTICS_READ,
  ],

  'Editor': [
    PERMISSIONS.BLOG_CREATE, PERMISSIONS.BLOG_READ, PERMISSIONS.BLOG_UPDATE,
    PERMISSIONS.BLOG_SUBMIT, PERMISSIONS.BLOG_APPROVE, PERMISSIONS.BLOG_ARCHIVE,
    PERMISSIONS.BLOG_SEO_AUDIT,
    PERMISSIONS.SEO_EDIT, PERMISSIONS.SEO_READ,
    PERMISSIONS.MEDIA_UPLOAD, PERMISSIONS.MEDIA_READ,
    PERMISSIONS.TAXONOMY_READ,
  ],

  'Content Writer': [
    PERMISSIONS.BLOG_CREATE, PERMISSIONS.BLOG_READ, PERMISSIONS.BLOG_UPDATE,
    PERMISSIONS.BLOG_SUBMIT, PERMISSIONS.BLOG_SEO_AUDIT,
    PERMISSIONS.SEO_READ,
    PERMISSIONS.MEDIA_UPLOAD, PERMISSIONS.MEDIA_READ,
  ],

  'Publisher': [
    PERMISSIONS.BLOG_READ, PERMISSIONS.BLOG_PUBLISH, PERMISSIONS.BLOG_SCHEDULE,
    PERMISSIONS.BLOG_ARCHIVE,
    PERMISSIONS.MEDIA_READ,
    PERMISSIONS.REDIRECT_MANAGE, PERMISSIONS.REDIRECT_READ,
    PERMISSIONS.ANALYTICS_READ,
  ],

  'SEO Manager': [
    PERMISSIONS.BLOG_READ, PERMISSIONS.BLOG_SEO_AUDIT,
    PERMISSIONS.SEO_EDIT, PERMISSIONS.SEO_READ,
    PERMISSIONS.TAXONOMY_READ,
    PERMISSIONS.REDIRECT_MANAGE, PERMISSIONS.REDIRECT_READ,
    PERMISSIONS.ANALYTICS_READ,
  ],
};

/**
 * Check if a role has a specific permission.
 * Used by guards and service-level authorization checks.
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const rolePerms = ROLE_PERMISSIONS[role];
  if (!rolePerms) return false;
  return rolePerms.includes(permission);
}

/**
 * Check if ANY of the provided roles grants the permission.
 */
export function rolesHavePermission(roles: string[], permission: Permission): boolean {
  return roles.some((role) => hasPermission(role, permission));
}

/**
 * Get all permissions for a set of roles (union).
 */
export function getEffectivePermissions(roles: string[]): Permission[] {
  const perms = new Set<Permission>();
  for (const role of roles) {
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    for (const p of rolePerms) perms.add(p);
  }
  return Array.from(perms);
}
