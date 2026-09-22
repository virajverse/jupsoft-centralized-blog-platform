import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { JsonLogger } from './common/logger/json-logger';
import { PrismaService } from './prisma/prisma.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// ─── P0 Fix (C5): Process-level crash safety ────────────────────────────────
// Without these, a single unhandled rejection/exception silently kills the
// PM2 process mid-traffic (or worse, leaves it in an undefined state).
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error(`[FATAL] unhandledRejection: ${reason instanceof Error ? reason.stack || reason.message : String(reason)}`);
});
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error(`[FATAL] uncaughtException: ${err.stack || err.message}`);
  // Exit cleanly so PM2 (exp_backoff_restart_delay) restarts into a healthy state
  process.exit(1);
});

async function bootstrap() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  // TRD §18: Use structured JSON logger in production for CloudWatch Logs Insights
  const appLogger = nodeEnv === 'production' ? new JsonLogger('jupsoft-cms') : undefined;
  const logger = new Logger('JupsoftCmsBootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: appLogger ?? ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 4000;

  // ─── P0 Fix (C1): Trust the reverse proxy (nginx → 127.0.0.1) ────────────
  // Without this, req.ip = 127.0.0.1 for EVERY client behind nginx, so the
  // global ThrottlerGuard buckets all users into ONE 300 req/min IP bucket →
  // spontaneous mass 429s under normal traffic. With `1`, Express resolves the
  // real client IP from X-Forwarded-For (set only by our trusted nginx hop).
  app.set('trust proxy', 1);

  // 1. Static Assets — Local Media Storage (/uploads)
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
    // P2: media keys are unique per upload (timestamp+random) → safe to cache
    // aggressively; ETag/Last-Modified still allow cheap revalidation.
    maxAge: '7d',
    etag: true,
  });
  // Missing assets now return a real 404 — no fake "200 OK" placeholder images in production.
  logger.log(`📁 Static assets mounted: /uploads -> ${uploadsDir}`);

  // 1.B Static Assets — Universal Embed Widget (/widget)
  const widgetDir = join(process.cwd(), 'public', 'widget');
  if (fs.existsSync(widgetDir)) {
    app.useStaticAssets(widgetDir, {
      prefix: '/widget/',
      maxAge: '1h',
      etag: true,
    });
    logger.log(`📁 Universal widget mounted: /widget -> ${widgetDir}`);
  }

  // Increase body parser limits for rich multi-language blog posts and media payloads (native Nest method)
  app.useBodyParser('json', { limit: '25mb' });
  app.useBodyParser('urlencoded', { limit: '25mb', extended: true });

  // 2. Helmet — HTTP Security Headers
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
    }),
  );

  // 3. CORS — Dynamic Multi-Tenant Whitelist (TRD §15)
  const rawAllowedOrigins = configService.get<string>('ALLOWED_ORIGINS') || '';
  const allowAllOrigins = rawAllowedOrigins.trim() === '*' || rawAllowedOrigins.split(',').map((s) => s.trim()).includes('*');
  const staticAllowedOrigins = new Set(
    rawAllowedOrigins
      ? rawAllowedOrigins.split(',').map((o) => o.trim().toLowerCase().replace(/\/+$/, ''))
      : []
  );

  const platformBaseUrl = configService.get<string>('PLATFORM_BASE_URL') || '';
  let platformHost = '';
  try {
    if (platformBaseUrl) platformHost = new URL(platformBaseUrl).hostname.toLowerCase();
  } catch {}

  // Dynamic In-Memory Cache for registered tenant domains (Zero DB query overhead)
  const prisma = app.get(PrismaService);
  let activeTenantDomains = new Set<string>();
  let lastTenantFetch = 0;
  // Negative CORS cache: track recently-rejected origins to avoid DB hammering by bots/scanners
  const rejectedOriginsCache = new Map<string, number>(); // origin → rejectedAt timestamp
  const REJECTED_ORIGIN_TTL_MS = 60_000; // 60 seconds TTL for negative cache

  async function getTenantDomains(): Promise<Set<string>> {
    const now = Date.now();
    if (now - lastTenantFetch > 60_000 || activeTenantDomains.size === 0) {
      try {
        const websites = await prisma.website.findMany({
          where: { status: 'active' },
          select: { domain: true },
        });
        const domains = new Set<string>();
        for (const w of websites) {
          if (w.domain) {
            const cleanDomain = w.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
            domains.add(cleanDomain);
          }
        }
        activeTenantDomains = domains;
        lastTenantFetch = now;
      } catch (err) {
        logger.warn(`Could not refresh tenant CORS domains from database: ${(err as Error).message}`);
      }
    }
    return activeTenantDomains;
  }

  // Pre-fetch active domains at server startup
  await getTenantDomains().catch(() => {});

  app.enableCors({
    origin: async (origin, callback) => {
      // 1. Allow non-browser requests (cURL, server-to-server, SSR/ISR, webhooks) or wildcard
      if (!origin || allowAllOrigins) return callback(null, true);

      // 2. Permit localhost / 127.0.0.1 / private LAN origins in all envs
      if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.toLowerCase().replace(/\/+$/, '');

      // Fast negative cache check: skip DB query for origins recently rejected (DoS mitigation)
      const rejectedAt = rejectedOriginsCache.get(normalizedOrigin);
      if (rejectedAt && Date.now() - rejectedAt < REJECTED_ORIGIN_TTL_MS) {
        return callback(null, false);
      }

      let hostname = '';
      try {
        const parsed = new URL(origin);
        hostname = parsed.hostname.toLowerCase();
      } catch {
        hostname = normalizedOrigin.replace(/^https?:\/\//, '');
      }

      // 3. Instant check: Explicitly configured static origins or platform base domain
      if (
        staticAllowedOrigins.has(normalizedOrigin) ||
        (platformHost && (hostname === platformHost || hostname.endsWith(`.${platformHost}`))) ||
        hostname.endsWith('.jupsoft.com') ||
        hostname === 'jupsoft.com' ||
        hostname.endsWith('.netlify.app') ||
        hostname.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }

      // 4. Dynamic check for registered tenant websites in database (O(1) memory lookup)
      try {
        const tenantDomains = await getTenantDomains();
        if (tenantDomains.has(hostname) || tenantDomains.has(normalizedOrigin.replace(/^https?:\/\//, ''))) {
          return callback(null, true);
        }

        // 5. Cache-miss fallback: if a tenant domain was just added seconds ago in Admin UI
        const exists = await prisma.website.findFirst({
          where: {
            status: 'active',
            domain: { equals: hostname, mode: 'insensitive' },
          },
          select: { id: true },
        });

        if (exists) {
          activeTenantDomains.add(hostname);
          return callback(null, true);
        }
      } catch (err) {
        logger.warn(`Dynamic CORS check error: ${(err as Error).message}`);
      }

      // Rejected: add to negative cache to prevent repeated DB queries for this bad origin
      rejectedOriginsCache.set(normalizedOrigin, Date.now());
      // Cleanup old entries periodically (keep map small)
      if (rejectedOriginsCache.size > 500) {
        const cutoff = Date.now() - REJECTED_ORIGIN_TTL_MS;
        for (const [k, v] of rejectedOriginsCache) {
          if (v < cutoff) rejectedOriginsCache.delete(k);
        }
      }
      logger.warn(`CORS rejected origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-signature', 'x-timestamp', 'x-tenant-id', 'X-Tenant-ID', 'Accept'],
  });

  // 3. Global Validation Pipe — whitelist strips unknown fields, forbidNonWhitelisted DISABLED in production
  // Reason: forbidNonWhitelisted causes 400 on any DTO mismatch (e.g. frontend ahead of backend after deploy)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // Strip undeclared fields silently (safe)
      transform: true,
      forbidNonWhitelisted: false,  // Do NOT reject requests with extra fields — strip them instead
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 3.B Global Exception Filter (P2: APP_FILTER) — consistent JSON errors,
  // no internal details/stack leaks in production, known HttpExceptions pass through untouched.
  app.useGlobalFilters(new HttpExceptionFilter());

  // 4. Swagger — FIX 14: available in all envs, gated by SWAGGER_API_KEY in production
  const swaggerApiKey = configService.get<string>('SWAGGER_API_KEY');
  const enableSwagger = nodeEnv !== 'production' || Boolean(swaggerApiKey);

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Jupsoft Multi-Site Centralized Blog CMS API')
      .setDescription('Production-grade RESTful API engine.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);

    if (nodeEnv === 'production' && swaggerApiKey) {
      app.use('/api/docs', (req: any, res: any, next: any) => {
        const key = req.query?.api_key || req.headers?.['x-swagger-key'];
        if (key !== swaggerApiKey) {
          res.status(401).json({ message: 'Swagger requires ?api_key=<SWAGGER_API_KEY>' });
          return;
        }
        next();
      });
    }

    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Jupsoft CMS API Documentation',
    });
    logger.log('Swagger docs: http://localhost:' + port + '/api/docs');
  }

  // Enable graceful shutdown hooks for PM2 SIGTERM / SIGINT
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log('Jupsoft CMS Backend running on port ' + port + ' [' + nodeEnv + ']');
  logger.log('Admin API: http://localhost:' + port + '/admin');
  logger.log('Public V1 API: http://localhost:' + port + '/v1');
}

// ─── P0 Fix (C5): Never let bootstrap fail silently ────────────────────────
bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(`[FATAL] Bootstrap failed: ${err?.stack || err?.message || err}`);
  process.exit(1);
});
