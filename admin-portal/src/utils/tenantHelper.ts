import { Website, UserAccount } from '../types';

/**
 * Resolves the active / effective website ID dynamically based on available context.
 * Eliminates static fallbacks to hardcoded website IDs like 'site-cloud'.
 *
 * Priority:
 * 1. An explicitly selected website ID (if valid, not 'all', and exists)
 * 2. The first website assigned to the current user (via roleAssignments)
 * 3. The first available website in the global websites array
 * 4. Fallback to empty string '' if no websites exist yet
 */
export function resolveEffectiveWebsiteId(
  websites: Website[] = [],
  preferredWebsiteId?: string | null,
  currentUser?: UserAccount | null
): string {
  // 1. If preferred ID is provided, valid, and not 'all'
  if (preferredWebsiteId && preferredWebsiteId !== 'all') {
    const exists = websites.some((w) => w.id === preferredWebsiteId);
    if (exists) {
      return preferredWebsiteId;
    }
    // If websites array is still loading/empty, keep preferredWebsiteId if not 'all'
    if (websites.length === 0) {
      return preferredWebsiteId;
    }
  }

  // 2. If user has explicit roleAssignments, pick the first assigned tenant
  if (currentUser?.roleAssignments) {
    const assignedKeys = Object.keys(currentUser.roleAssignments);
    if (assignedKeys.length > 0) {
      const match = websites.find((w) => assignedKeys.includes(w.id));
      if (match) return match.id;
      return assignedKeys[0];
    }
  }

  // 3. First website in the loaded websites array
  if (websites.length > 0 && websites[0]?.id) {
    return websites[0].id;
  }

  // 4. Default empty string when no sites exist yet
  return '';
}

/**
 * Returns a user-friendly site name for the given siteId, or a sensible fallback.
 */
export function resolveWebsiteName(
  websites: Website[] = [],
  siteId?: string | null
): string {
  if (!siteId || siteId === 'all') return 'All Websites';
  const found = websites.find((w) => w.id === siteId);
  return found?.name || siteId;
}
