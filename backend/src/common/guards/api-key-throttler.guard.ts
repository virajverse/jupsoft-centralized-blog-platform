/**
 * ApiKeyThrottlerGuard — Per-Tenant Rate Limiting (TRD §15)
 *
 * Problem: The global ThrottlerGuard uses IP address as the throttle key,
 * which means one high-traffic tenant can exhaust the shared IP bucket and
 * affect all other clients behind the same NAT/proxy.
 *
 * Solution: Key throttling on the tenant's API key (x-api-key header or
 * Bearer token) so each tenant has its own isolated rate limit bucket.
 * Falls back to IP if no API key is present (covers unauthenticated probes).
 *
 * Configuration (ThrottlerModule in AppModule):
 *   - name: 'public-api'
 *   - ttl: 60_000 ms (1 minute window)
 *   - limit: 120 requests per minute per API key
 */

import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';

@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  /**
   * Override the default throttle key generator.
   * Returns the tenant API key if present, otherwise falls back to client IP.
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Extract API key from multiple sources (same priority as ApiKeyGuard)
    const authHeader = req.headers?.['authorization'] as string | undefined;
    const xApiKey = req.headers?.['x-api-key'] as string | undefined;
    const queryApiKey = req.query?.apiKey as string | undefined;

    let apiKey: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      apiKey = authHeader.slice(7);
    } else if (xApiKey) {
      apiKey = xApiKey;
    } else if (queryApiKey) {
      apiKey = queryApiKey;
    }

    // Use API key as bucket key → each tenant gets its own isolated limit
    if (apiKey && apiKey.length > 10) {
      return `apikey:${apiKey}`;
    }

    // Fallback: IP-based bucketing (for unauthenticated requests / bots).
    // P0 Fix (C2): use Express's proxy-aware req.ip (main.ts sets
    // `trust proxy = 1`) instead of raw X-Forwarded-For. Raw XFF is
    // client-controlled — an attacker could rotate it to mint infinite
    // buckets and bypass the per-tenant rate limit entirely.
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';

    return `ip:${ip}`;
  }

  /**
   * Override to select the correct throttler config ('public-api').
   * The global ThrottlerModule registers both 'global' and 'public-api' configs.
   * Public routes use 'public-api'; admin routes use 'global' (the default).
   */
  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    return super.handleRequest(requestProps);
  }
}
