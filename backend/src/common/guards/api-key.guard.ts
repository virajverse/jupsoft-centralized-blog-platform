/**
 * ApiKeyGuard — TRD §12 (REST API Architecture) + §13 (Hybrid Integration)
 *
 * Supports flexible multi-tenant identification:
 *   1. Authorization: Bearer <tenant_api_key>
 *   2. x-api-key: <tenant_api_key> header
 *   3. query.apiKey: ?apiKey=<tenant_api_key>
 *   4. query.website: ?website=jupsoft (exact TRD §12 & §13 requirement for public reads)
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
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
    if (signature.length !== expectedSignature.length) return false;
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8'),
    );
    if (!isValid) return false;
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
    const xApiKey =
      (request.headers['x-api-key'] as string) ||
      (request.headers['api-key'] as string) ||
      (request.headers['apikey'] as string);
    const queryApiKey =
      (request.query?.apiKey as string) ||
      (request.query?.api_key as string);
    const websiteParam =
      (request.query?.website as string) ||
      (request.query?.websiteId as string) ||
      (request.query?.site as string) ||
      (request.headers['x-website-id'] as string) ||
      (request.headers['website-id'] as string);

    const candidateParams = [
      request.query?.website,
      request.query?.websiteId,
      request.query?.site,
      request.headers['x-website-id'],
      request.headers['website-id'],
      request.params?.websiteId,
    ].filter((p): p is string => typeof p === 'string' && p.trim().length > 0);

    // 1. Extract API Key / Bearer token if provided
    let tokenValue: string | null = null;
    if (authHeader) {
      const parts = authHeader.trim().split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        tokenValue = parts[1];
      } else if (parts.length === 1) {
        tokenValue = parts[0];
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

        // STRICT TENANT ISOLATION:
        // An API key can ONLY see data of its own registered website.
        // It CANNOT query another tenant or 'all' websites.
        for (const rawParam of candidateParams) {
          const param = rawParam.trim();
          if (param.toLowerCase() === 'all') {
            throw new ForbiddenException(
              `Access denied: API key for "${website.name}" is strictly scoped to this website and cannot query "all" websites.`,
            );
          }
          const cleanParam = param.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '').split('/')[0].split(':')[0];
          const siteDomain = (website.domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '').split('/')[0].split(':')[0];
          const siteName = (website.name || '').toLowerCase();
          const sitePrefix = (website.s3Prefix || '').toLowerCase().replace(/\/+$/, '');

          const matches =
            website.id === param ||
            cleanParam === siteDomain ||
            cleanParam === siteDomain.replace(/^www\./, '') ||
            siteDomain === cleanParam.replace(/^www\./, '') ||
            cleanParam.endsWith('.' + siteDomain) ||
            cleanParam === siteName ||
            (sitePrefix && cleanParam === sitePrefix);

          if (!matches) {
            throw new ForbiddenException(
              `Access denied: this API key belongs to "${website.name}" (${website.domain}) and cannot access data for website "${param}".`,
            );
          }
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

    // 2. Public read support via ?website=<domain|id|slug> — ONLY for requests originating from registered domain
    if (candidateParams.some((p) => p.trim().toLowerCase() === 'all')) {
      throw new ForbiddenException(
        'Access denied: "all" is not a valid website parameter. Public requests must specify a registered website domain or provide a tenant API key.',
      );
    }

    if (websiteParam) {
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

      // ── DOMAIN PROTECTION ──
      // Direct browser address bar navigation without an API key is blocked.
      // Unauthenticated access via ?website= is ONLY permitted if the request originates from the CMS-registered domain.
      const originHeader = (request.headers['origin'] as string) || '';
      const refererHeader = (request.headers['referer'] as string) || '';

      const extractHost = (val: string): string => {
        if (!val) return '';
        try {
          return new URL(val).hostname.toLowerCase();
        } catch {
          return val.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
        }
      };

      const callerHost = extractHost(originHeader) || extractHost(refererHeader);
      const targetDomain = extractHost(website.domain || '');

      const isLocalhost = callerHost === 'localhost' || callerHost === '127.0.0.1' || callerHost.startsWith('192.168.') || callerHost.startsWith('10.');

      const isAuthorizedDomain =
        Boolean(callerHost && targetDomain && (callerHost === targetDomain || callerHost.endsWith('.' + targetDomain))) ||
        isLocalhost ||
        callerHost.endsWith('.netlify.app') ||
        callerHost.endsWith('.vercel.app') ||
        callerHost.endsWith('.github.io');

      if (!isAuthorizedDomain) {
        throw new UnauthorizedException(
          `Direct browser access denied. Provide a valid tenant API key (x-api-key header) or make requests from registered domain "${website.domain}".`,
        );
      }

      request.tenant = website;
      return true;
    }

    throw new UnauthorizedException(
      'Missing tenant credentials. Provide Authorization: Bearer <api_key>, x-api-key header, or make requests from registered domain with ?website=<slug>.',
    );
  }
}
