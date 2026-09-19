/**
 * ApiKeyGuard — TRD §12 (REST API Architecture) + §13 (Hybrid Integration)
 *
 * Supports flexible multi-tenant identification:
 *   1. Authorization: Bearer <tenant_api_key>
 *   2. x-api-key: <tenant_api_key> header
 *   3. query.apiKey: ?apiKey=<tenant_api_key>
 *   4. query.website: ?website=jupsoft (exact TRD §12 & §13 requirement for public reads)
 */

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

function isValidAdminJwt(token: string, secret: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [header, payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');
    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

const tenantCache = new Map<string, { website: any; expiresAt: number }>();

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const xApiKey = request.headers['x-api-key'] as string;
    const queryApiKey = request.query?.apiKey as string;
    const websiteParam = (request.query?.website as string) || (request.query?.websiteId as string);

    // 1. Extract API Key / Bearer token if provided
    let tokenValue: string | null = null;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) {
        tokenValue = token;
      }
    } else if (xApiKey) {
      tokenValue = xApiKey;
    } else if (queryApiKey) {
      tokenValue = queryApiKey;
    }

    const now = Date.now();

    if (tokenValue) {
      // 1.A Check if it matches a Tenant API Key (Check Cache First)
      const cacheKey = `tenant:key:${tokenValue}`;
      const cached = tenantCache.get(cacheKey);
      let website = cached && cached.expiresAt > now ? cached.website : null;

      if (!website) {
        website = await this.prisma.website.findUnique({
          where: { apiKey: tokenValue },
        });
        if (website) {
          tenantCache.set(cacheKey, { website, expiresAt: now + 300_000 });
        }
      }

      if (website) {
        if (website.status !== 'active') {
          throw new UnauthorizedException('Tenant is currently deactivated');
        }
        request.tenant = website;
        return true;
      }

      // 1.B If not a Tenant API Key, check if it's a valid Admin Portal JWT
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new UnauthorizedException('Server misconfiguration: JWT_SECRET not set');
      }
      if (isValidAdminJwt(tokenValue, jwtSecret)) {
        if (websiteParam && websiteParam !== 'all') {
          const siteCacheKey = `tenant:param:${websiteParam}`;
          const cachedSite = tenantCache.get(siteCacheKey);
          let matchedSite = cachedSite && cachedSite.expiresAt > now ? cachedSite.website : null;

          if (!matchedSite) {
            matchedSite = await this.prisma.website.findFirst({
              where: {
                OR: [
                  { id: websiteParam },
                  { domain: { contains: websiteParam, mode: 'insensitive' } },
                  { name: { contains: websiteParam, mode: 'insensitive' } },
                  { s3Prefix: websiteParam },
                ],
              },
            });
            if (matchedSite) {
              tenantCache.set(siteCacheKey, { website: matchedSite, expiresAt: now + 300_000 });
            }
          }

          if (matchedSite) {
            request.tenant = matchedSite;
            return true;
          }
        }
        const defaultSite = await this.prisma.website.findFirst({ where: { status: 'active' } });
        request.tenant = defaultSite || null;
        return true;
      }

      throw new UnauthorizedException('Invalid tenant API key or Bearer token');
    }

    // 2. TRD §12 & §13: Public read support via ?website=<domain|id|slug>
    if (websiteParam && websiteParam !== 'all') {
      const siteCacheKey = `tenant:param:${websiteParam}`;
      const cachedSite = tenantCache.get(siteCacheKey);
      let website = cachedSite && cachedSite.expiresAt > now ? cachedSite.website : null;

      if (!website) {
        website = await this.prisma.website.findFirst({
          where: {
            OR: [
              { id: websiteParam },
              { domain: { contains: websiteParam, mode: 'insensitive' } },
              { name: { contains: websiteParam, mode: 'insensitive' } },
              { s3Prefix: websiteParam },
            ],
          },
        });
        if (website) {
          tenantCache.set(siteCacheKey, { website, expiresAt: now + 300_000 });
        }
      }

      if (!website) {
        throw new UnauthorizedException(`Tenant website "${websiteParam}" not found`);
      }

      if (website.status !== 'active') {
        throw new UnauthorizedException('Tenant is currently deactivated');
      }

      request.tenant = website;
      return true;
    }

    throw new UnauthorizedException(
      'Missing tenant credentials. Provide Authorization: Bearer <api_key>, x-api-key header, or ?website=<slug> query parameter (TRD §12/§13).',
    );
  }
}
