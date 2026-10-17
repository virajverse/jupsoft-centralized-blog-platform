/**
 * RolesGuard Unit Tests — TRD §5 (RBAC)
 *
 * Tests:
 *  1. No @Roles() decorator — always passes (open endpoint)
 *  2. Super Admin bypasses all role checks
 *  3. Website Admin bypasses non-Super-Admin checks
 *  4. Matching required role — allowed
 *  5. Missing role — throws ForbiddenException
 *  6. No user on request — throws ForbiddenException
 *  7. Website-scoped role assignment filtering
 */

import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  function buildContext(user: any, query: any = {}): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass:   () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user, query }),
      }),
    } as any;
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new RolesGuard(reflector);
  });

  it('passes when no @Roles() decorator is set', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = buildContext({ roles: [] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('passes when @Roles([]) is empty array', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const ctx = buildContext({ roles: [] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('Super Admin bypasses ALL role checks', () => {
    reflector.getAllAndOverride.mockReturnValue(['Publisher']);
    const ctx = buildContext({ roles: ['Super Admin'] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('Website Admin bypasses non-Super-Admin checks', () => {
    reflector.getAllAndOverride.mockReturnValue(['Editor', 'Content Writer']);
    const ctx = buildContext({ roles: ['Website Admin'] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when no user on request', () => {
    reflector.getAllAndOverride.mockReturnValue(['Editor']);
    const ctx = buildContext(null);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows when user has the required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['Publisher']);
    const ctx = buildContext({ roles: ['Publisher'] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when user lacks required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['Publisher']);
    const ctx = buildContext({ roles: ['Content Writer'] });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('filters website-scoped role assignments to match target websiteId', () => {
    reflector.getAllAndOverride.mockReturnValue(['Editor']);
    const ctx = buildContext(
      {
        roles: ['Content Writer'],
        roleAssignments: [
          { role: 'Editor', websiteId: 'web-1', isGlobal: false },
          { role: 'Content Writer', websiteId: 'web-2', isGlobal: false },
        ],
      },
      { websiteId: 'web-1' },
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects scoped role that does not match target websiteId', () => {
    reflector.getAllAndOverride.mockReturnValue(['Publisher']);
    const ctx = buildContext(
      {
        roles: ['Publisher'],
        roleAssignments: [
          { role: 'Publisher', websiteId: 'web-2', isGlobal: false },
        ],
      },
      { websiteId: 'web-1' },
    );
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows global role assignments across all websites', () => {
    reflector.getAllAndOverride.mockReturnValue(['Editor']);
    const ctx = buildContext(
      {
        roles: ['Editor'],
        roleAssignments: [{ role: 'Editor', websiteId: null, isGlobal: true }],
      },
      { websiteId: 'web-3' },
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
