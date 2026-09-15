/**
 * ApiKeyGuard Unit Tests — TRD §12/§13 (Public API Authentication)
 *
 * Tests:
 *  1. Valid tenant API key via Authorization: Bearer → allowed, tenant set on request
 *  2. Valid tenant API key via x-api-key header → allowed
 *  3. Invalid / unknown API key → throws UnauthorizedException
 *  4. Deactivated tenant → throws UnauthorizedException
 *  5. ?website= query param resolves tenant → allowed
 *  6. Unknown website slug → throws UnauthorizedException
 *  7. No credentials at all → throws UnauthorizedException
 */

import { ApiKeyGuard } from './api-key.guard';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const mockActiveWebsite  = { id: 'web-1', apiKey: 'valid-key-123', status: 'active',   domain: 'jupsoft.com' };
const mockInactiveWebsite = { id: 'web-2', apiKey: 'inactive-key',  status: 'inactive', domain: 'down.com' };

function buildContext(headers: Record<string, string> = {}, query: Record<string, string> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers, query }),
    }),
  } as any;
}

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = {
      website: {
        findUnique: jest.fn(),
        findFirst:  jest.fn(),
      },
    } as any;
    guard = new ApiKeyGuard(prisma);
  });

  it('allows request with valid Bearer API key and sets request.tenant', async () => {
    (prisma.website.findUnique as jest.Mock).mockResolvedValue(mockActiveWebsite);
    const req: any = { headers: { authorization: 'Bearer valid-key-123' }, query: {} };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as any;

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req.tenant).toEqual(mockActiveWebsite);
  });

  it('allows request with valid x-api-key header', async () => {
    (prisma.website.findUnique as jest.Mock).mockResolvedValue(mockActiveWebsite);
    const req: any = { headers: { 'x-api-key': 'valid-key-123' }, query: {} };
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as any;

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req.tenant.id).toBe('web-1');
  });

  it('throws UnauthorizedException for unknown API key', async () => {
    (prisma.website.findUnique as jest.Mock).mockResolvedValue(null);
    // No JWT_SECRET set → will throw after failed apiKey lookup
    const ctx = buildContext({ authorization: 'Bearer bad-key' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when tenant is inactive', async () => {
    (prisma.website.findUnique as jest.Mock).mockResolvedValue(mockInactiveWebsite);
    const ctx = buildContext({ authorization: 'Bearer inactive-key' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('resolves tenant via ?website= query param', async () => {
    (prisma.website.findFirst as jest.Mock).mockResolvedValue(mockActiveWebsite);
    const req: any = { headers: {}, query: { website: 'jupsoft.com' } };
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as any;

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req.tenant.domain).toBe('jupsoft.com');
  });

  it('throws UnauthorizedException for unknown ?website= param', async () => {
    (prisma.website.findFirst as jest.Mock).mockResolvedValue(null);
    const ctx = buildContext({}, { website: 'unknown.com' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException with no credentials at all', async () => {
    const ctx = buildContext({}, {});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
