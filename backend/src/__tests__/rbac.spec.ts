/**
 * RBAC TESTS — Phase 5
 * Tests: Role enforcement for each route, privilege escalation attempts
 */
import { RolesGuard } from '../common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';

function makeContext(userRoles: string[], targetWebsiteId?: string, roleAssignments?: any[]): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          roles: userRoles,
          roleAssignments: roleAssignments || userRoles.map(r => ({ role: r, websiteId: null, isGlobal: true })),
        },
        query: targetWebsiteId ? { websiteId: targetWebsiteId } : {},
        body: {},
        headers: {},
      }),
    }),
  } as any;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  // ── 5.1: No roles required → any authenticated user passes ────────────
  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext(['Content Writer']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // ── 5.2: Super Admin bypasses all role checks ──────────────────────────
  it('should allow Super Admin to access any route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Publisher']);
    const ctx = makeContext(['Super Admin']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // ── 5.3: Content Writer cannot access Publisher-only route ─────────────
  it('should deny Content Writer access to Publisher-only route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Publisher']);
    const ctx = makeContext(['Content Writer']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  // ── 5.4: Editor cannot access Super Admin only route ──────────────────
  it('should deny Editor access to Super Admin-only route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Super Admin']);
    const ctx = makeContext(['Editor']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  // ── 5.5: Publisher can access Publisher route ──────────────────────────
  it('should allow Publisher access to Publisher route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Publisher', 'Super Admin', 'Website Admin']);
    const ctx = makeContext(['Publisher']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // ── 5.6: SEO Manager cannot publish ───────────────────────────────────
  it('should deny SEO Manager access to publish route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Super Admin', 'Website Admin', 'Publisher']);
    const ctx = makeContext(['SEO Manager']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  // ── 5.7: Website Admin gets site-admin permissions below Super Admin ───
  it('should allow Website Admin access to non-super-admin routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Editor']);
    const ctx = makeContext(
      ['Website Admin'],
      'site-1',
      [{ role: 'Website Admin', websiteId: 'site-1', isGlobal: false }]
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // ── 5.8: Missing user on request → ForbiddenException ─────────────────
  it('should throw ForbiddenException when user is missing from request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Editor']);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: null, query: {}, body: {}, headers: {} }),
      }),
    } as any;
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  // ── 5.9: Privilege escalation: Content Writer → approve ───────────────
  it('should deny Content Writer from approving (Editor-only action)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Super Admin', 'Website Admin', 'Role Admin', 'Editor']);
    const ctx = makeContext(['Content Writer']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  // ── 5.10: Privilege escalation: Content Writer → manage websites ───────
  it('should deny Content Writer from managing websites', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Super Admin']);
    const ctx = makeContext(['Content Writer']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  // ── 5.11: Website-scoped role check passes for correct site ───────────
  it('should allow Editor on site-1 to approve for site-1', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Editor', 'Super Admin', 'Website Admin', 'Role Admin']);
    const ctx = makeContext(
      ['Editor'],
      'site-1',
      [{ role: 'Editor', websiteId: 'site-1', isGlobal: false }]
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // ── 5.12: Website-scoped: Editor for site-1 denied for site-2 ────────
  it('should deny Editor on site-1 from acting on site-2', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Editor', 'Super Admin', 'Website Admin', 'Role Admin']);
    const ctx = makeContext(
      ['Editor'],
      'site-2',
      [{ role: 'Editor', websiteId: 'site-1', isGlobal: false }]
    );
    // Editor is scoped to site-1, request targets site-2
    // The guard checks roleAssignments for site-2, finding none
    // However the guard also checks global roles from user.roles
    // This is actually a potential issue — let's verify behavior:
    // If user.roles=['Editor'] but targetWebsiteId='site-2' and roleAssignment only covers site-1
    // applicableRoles will be empty → hasRole = false → throw
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
