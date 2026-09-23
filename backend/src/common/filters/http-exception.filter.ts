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

    // 1b. Prisma Client Known Request Errors -> Map DB constraint errors to standard HTTP status codes
    if (exception && typeof exception === 'object' && 'code' in exception) {
      const prismaError = exception as { code: string; meta?: Record<string, unknown>; message?: string };

      // P2002: Unique constraint violation (e.g. duplicate slug, name, or email)
      if (prismaError.code === 'P2002') {
        const target = Array.isArray(prismaError.meta?.target)
          ? prismaError.meta.target.join(', ')
          : String(prismaError.meta?.target || 'field');
        const conflictMsg = `Duplicate entry: a resource with this ${target} already exists.`;
        this.logger.warn(`Prisma unique constraint conflict (409) on ${request.method} ${request.originalUrl}: ${conflictMsg}`);
        response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: conflictMsg,
          path: request.originalUrl,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // P2025: Record to update/delete not found
      if (prismaError.code === 'P2025') {
        const notFoundMsg = 'The requested resource was not found or has already been deleted.';
        this.logger.warn(`Prisma record not found (404) on ${request.method} ${request.originalUrl}: ${notFoundMsg}`);
        response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: notFoundMsg,
          path: request.originalUrl,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // P2003: Foreign key constraint failed
      if (prismaError.code === 'P2003') {
        const conflictMsg = 'Operation cannot be completed due to related database records.';
        response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: conflictMsg,
          path: request.originalUrl,
          timestamp: new Date().toISOString(),
        });
        return;
      }
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
