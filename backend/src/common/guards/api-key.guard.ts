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

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const xApiKey = request.headers['x-api-key'] as string;
    const queryApiKey = request.query?.apiKey as string;
    const websiteParam = (request.query?.website as string) || (request.query?.websiteId as string);

    // 1. Check API Key via header or query
    let apiKey: string | null = null;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) {
        apiKey = token;
      }
    } else if (xApiKey) {
      apiKey = xApiKey;
    } else if (queryApiKey) {
      apiKey = queryApiKey;
    }

    if (apiKey) {
      const website = await this.prisma.website.findUnique({
        where: { apiKey },
      });

      if (!website) {
        throw new UnauthorizedException('Invalid tenant API key');
      }

      if (website.status !== 'active') {
        throw new UnauthorizedException('Tenant is currently deactivated');
      }

      request.tenant = website;
      return true;
    }

    // 2. TRD §12 & §13: Public read support via ?website=<domain|id|slug>
    if (websiteParam) {
      const website = await this.prisma.website.findFirst({
        where: {
          OR: [
            { id: websiteParam },
            { domain: { contains: websiteParam, mode: 'insensitive' } },
            { name: { contains: websiteParam, mode: 'insensitive' } },
            { s3Prefix: websiteParam },
          ],
        },
      });

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
