import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * P2: Global exception filter (APP_FILTER).
 *
 * Why: without it, unexpected errors (Prisma connection drops, Redis blips,
 * type errors) surface as Nest's default 500 — which can echo internal
 * error messages to clients, and non-HTTP exceptions can leak stack traces.
 *
 * Behavior:
 *  - HttpException        → passed through UNCHANGED (validation arrays,
 *                           401/403/404/429 shapes stay exactly as clients expect).
 *  - Unknown exception    → logged with full stack server-side; client gets a
 *                           generic JSON body (message hidden in production,
 *                           shown in dev to speed up debugging).
 *  - Response is always JSON with an explicit statusCode.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly isProduction = (process.env.NODE_ENV || 'development') === 'production';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 1. Known HTTP exceptions → Nest's own response shape, untouched.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(typeof body === 'string' ? { statusCode: status, message: body } : body);
      return;
    }

    // 2. Unexpected exception → full detail to logs only.
    const message = exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(
      `Unhandled exception on ${request.method} ${request.originalUrl}: ${message}${stack ? `\n${stack}` : ''}`,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: this.isProduction ? 'Internal server error' : message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
