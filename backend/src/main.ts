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

async function bootstrap() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  // TRD §18: Use structured JSON logger in production for CloudWatch Logs Insights
  const appLogger = nodeEnv === 'production' ? new JsonLogger('jupsoft-cms') : undefined;
  const logger = new Logger('JupsoftCmsBootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: appLogger ?? ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 4000;

  // 1. Static Assets — Local Media Storage (/uploads)
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
  });
  logger.log(`📁 Static assets mounted: /uploads -> ${uploadsDir}`);

  // 2. Helmet — HTTP Security Headers
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
    }),
  );

  // 3. CORS — allow admin-portal and test client sites
  const allowedOrigins = (
    configService.get<string>('ALLOWED_ORIGINS') ||
    'http://localhost:3000,http://localhost:3001,http://localhost:5001,http://localhost:5002,http://localhost:5003'
  )
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      // In development, permit all localhost / 127.0.0.1 origins for seamless multi-site testing
      if (nodeEnv !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS blocked: origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-signature', 'x-timestamp', 'x-tenant-id', 'X-Tenant-ID', 'Accept'],
  });

  // 3. Global Validation Pipe — FIX 4: forbidNonWhitelisted:true
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

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

  await app.listen(port);
  logger.log('Jupsoft CMS Backend running on port ' + port + ' [' + nodeEnv + ']');
  logger.log('Admin API: http://localhost:' + port + '/admin');
  logger.log('Public V1 API: http://localhost:' + port + '/v1');
}

bootstrap();
