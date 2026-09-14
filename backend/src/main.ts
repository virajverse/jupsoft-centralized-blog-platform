import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('JupsoftCmsBootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 4000;

  // 1. Enable CORS for Admin Portal and Consumer Sites
  app.enableCors({
    origin: true, // Allow all in development (localhost:3000, etc.)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-signature', 'Accept'],
  });

  // 2. Global Input Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // 3. Swagger OpenAPI Documentation (TRD Section 12)
  const config = new DocumentBuilder()
    .setTitle('Jupsoft Multi-Site Centralized Blog CMS API')
    .setDescription(
      'Production-grade RESTful API engine powering centralized blog authoring, multi-tenant isolation, on-demand ISR revalidation, and consumer delivery.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Jupsoft CMS API Documentation',
  });

  await app.listen(port);
  logger.log(`🚀 Jupsoft NestJS Backend Service running on: http://localhost:${port}`);
  logger.log(`📚 Swagger OpenAPI Documentation available at: http://localhost:${port}/api/docs`);
  logger.log(`⚡ Public Consumer API Base URL: http://localhost:${port}/v1`);
  logger.log(`🔐 Admin Management API Base URL: http://localhost:${port}/admin`);
}

bootstrap();
