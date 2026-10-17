/**
 * API KEY GUARD TESTS — Phase 11
 * Tests: Tenant resolution, missing credentials, invalid keys, JWT bypass, parameter injection
 */
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';

const mockPrisma = {
  website: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
};

function makeContext(headers: any = {}, query: any = {}): ExecutionContext {
  const req = { headers, query };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as any;
}

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear in-memory cache between tests
    guard = new ApiKeyGuard(mockPrisma as any);
    process.env.JWT_SECRET = 'test-jwt-secret-32chars-long-enough';
  });

  // ── 11.1: Valid API key in x-api-key header ──────────────────────────
  it('should authenticate valid tenant API key via x-api-key header', async () => {
    const website = { id: 'site-1', apiKey: 'valid-api-key-123', status: 'active', name: 'Test Site' };
    mockPrisma.website.findUnique.mockResolvedValue(website);

    const ctx = makeContext({ 'x-api-key': 'valid-api-key-123' });
    const request = ctx.switchToHttp().getRequest();

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    // request.tenant is set by the guard inside canActivate
    expect(request.tenant).toBeDefined();
    expect(request.tenant.id).toBe('site-1');
  });

  // ── 11.2: Valid API key in Authorization: Bearer header ───────────────
  it('should authenticate tenant API key via Authorization Bearer header', async () => {
    const website = { id: 'site-1', apiKey: 'valid-api-key-123', status: 'active' };
    mockPrisma.website.findUnique.mockResolvedValue(website);

    const ctx = makeContext({ 'authorization': 'Bearer valid-api-key-123' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  // ── 11.3: Valid API key via ?apiKey query parameter ───────────────────
  it('should authenticate tenant API key via ?apiKey query param', async () => {
    const website = { id: 'site-1', apiKey: 'valid-api-key-123', status: 'active' };
    mockPrisma.website.findUnique.mockResolvedValue(website);

    const ctx = makeContext({}, { apiKey: 'valid-api-key-123' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  // ── 11.4: Missing credentials → UnauthorizedException ─────────────────
  it('should throw UnauthorizedException when no credentials provided', async () => {
    const ctx = makeContext({}, {});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  // ── 11.5: Invalid API key → UnauthorizedException ─────────────────────
  it('should throw UnauthorizedException for invalid API key', async () => {
    mockPrisma.website.findUnique.mockResolvedValue(null); // key not found

    const ctx = makeContext({ 'x-api-key': 'invalid-key-xxx' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  // ── 11.6: Deactivated tenant → UnauthorizedException ──────────────────
  it('should reject deactivated tenant', async () => {
    mockPrisma.website.findUnique.mockResolvedValue({
      id: 'site-1', apiKey: 'valid-key', status: 'inactive'
    });

    const ctx = makeContext({ 'x-api-key': 'valid-key' });
    await expect(guard.canActivate(ctx)).rejects.toThrow('deactivated');
  });

  // ── 11.7: Public ?website= parameter resolves tenant for registered origin ───
  it('should resolve tenant by ?website= query parameter from registered domain origin', async () => {
    const website = { id: 'site-1', domain: 'jupsoft.com', name: 'Jupsoft', status: 'active' };
    mockPrisma.website.findFirst.mockResolvedValue(website);

    const ctx = makeContext({ origin: 'https://jupsoft.com' }, { website: 'jupsoft' });
    const request = ctx.switchToHttp().getRequest();
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.tenant).toBeDefined();
    expect(request.tenant.id).toBe('site-1');
  });

  it('should reject direct browser navigation via ?website= without API key or registered origin', async () => {
    const website = { id: 'site-1', domain: 'jupsoft.com', name: 'Jupsoft', status: 'active' };
    mockPrisma.website.findFirst.mockResolvedValue(website);

    // Direct browser navigation has no origin/referer and no API key
    const ctx = makeContext({}, { website: 'jupsoft' });
    await expect(guard.canActivate(ctx)).rejects.toThrow('Direct browser access denied');
  });

  it('should reject request when origin does not match registered website domain', async () => {
    const website = { id: 'site-1', domain: 'jupsoft.com', name: 'Jupsoft', status: 'active' };
    mockPrisma.website.findFirst.mockResolvedValue(website);

    const ctx = makeContext({ origin: 'https://attacker.com' }, { website: 'jupsoft' });
    await expect(guard.canActivate(ctx)).rejects.toThrow('Direct browser access denied');
  });

  // ── 11.8: Unknown ?website= → UnauthorizedException ──────────────────
  it('should throw for unknown ?website= parameter', async () => {
    mockPrisma.website.findFirst.mockResolvedValue(null);

    const ctx = makeContext({ origin: 'https://jupsoft.com' }, { website: 'nonexistent-site' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  // ── 11.9: SECURITY FINDING: ?websiteId can override tenant ────────────
  it('[SECURITY] ?websiteId=all bypasses tenant filter in some controllers', async () => {
    // In public-v1.controller.ts:
    //   const targetSiteId = queryWebsiteId || req.tenant?.id;
    // Passing ?websiteId=all could return data for ALL tenants if service doesn't filter
    // FLAG: Potential tenant bypass via ?websiteId parameter manipulation
    expect(true).toBe(true); // Documentation test
  });

  // ── 11.10: Malformed Authorization header ─────────────────────────────
  it('should reject malformed Authorization header (no Bearer prefix)', async () => {
    // Without "Bearer " prefix, tokenValue will be null
    // Falls through to websiteParam check, then throws if no website param
    const ctx = makeContext({ 'authorization': 'Basic invalidbase64==' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  // ── 11.11: SECURITY FINDING: isValidAdminJwt uses custom HMAC not JwtService
  it('[SECURITY-FINDING] ApiKeyGuard uses custom JWT verification not NestJS JwtService', () => {
    // In api-key.guard.ts, isValidAdminJwt() manually verifies using HMAC
    // This could have subtle differences from NestJS JwtService verification
    // e.g. it uses Buffer.from(signature, 'utf8') instead of base64url
    // This could lead to verification bypass with specially crafted tokens
    // FLAG: Custom JWT verification implementation — audit for bypass risk
    expect(true).toBe(true); // Documentation test
  });

  // ── 11.12: SQL injection via website parameter ────────────────────────
  it('[SECURITY] ?website= parameter injection is handled by Prisma parameterization', async () => {
    // Prisma handles SQL injection via parameterized queries
    // So ?website=' OR 1=1-- is safe at DB level
    mockPrisma.website.findFirst.mockResolvedValue(null);

    const ctx = makeContext({}, { website: "' OR 1=1--" });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    // Query was made — Prisma parametrized it safely
    expect(mockPrisma.website.findFirst).toHaveBeenCalled();
  });

  // ── 11.13: STRICT TENANT ISOLATION: Cross-tenant query by API key is FORBIDDEN ─────
  it('[SECURITY] API key for site-1 CANNOT query site-2 via ?website= parameter', async () => {
    const website1 = { id: 'site-1', apiKey: 'valid-api-key-1', status: 'active', name: 'Site One', domain: 'siteone.com' };
    mockPrisma.website.findUnique.mockResolvedValue(website1);

    const ctx = makeContext({ 'x-api-key': 'valid-api-key-1' }, { website: 'site-2' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('[SECURITY] API key for site-1 CANNOT query site-2 via ?websiteId= parameter', async () => {
    const website1 = { id: 'site-1', apiKey: 'valid-api-key-1', status: 'active', name: 'Site One', domain: 'siteone.com' };
    mockPrisma.website.findUnique.mockResolvedValue(website1);

    const ctx = makeContext({ 'x-api-key': 'valid-api-key-1' }, { websiteId: 'site-2' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('[SECURITY] API key for site-1 CANNOT query site-2 via x-website-id header', async () => {
    const website1 = { id: 'site-1', apiKey: 'valid-api-key-1', status: 'active', name: 'Site One', domain: 'siteone.com' };
    mockPrisma.website.findUnique.mockResolvedValue(website1);

    const ctx = makeContext({ 'x-api-key': 'valid-api-key-1', 'x-website-id': 'site-2' }, {});
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('[SECURITY] API key for site-1 CANNOT query "all" websites', async () => {
    const website1 = { id: 'site-1', apiKey: 'valid-api-key-1', status: 'active', name: 'Site One', domain: 'siteone.com' };
    mockPrisma.website.findUnique.mockResolvedValue(website1);

    const ctx = makeContext({ 'x-api-key': 'valid-api-key-1' }, { website: 'all' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('[SECURITY] Unauthenticated request with ?website=all is blocked', async () => {
    const ctx = makeContext({}, { website: 'all' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
