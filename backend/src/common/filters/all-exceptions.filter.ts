/**
 * AllExceptionsFilter — Centralized Global Exception Filter (TRD §15 & Velocity NodeBestPractices)
 *
 * Traps all uncaught exceptions, Prisma ORM database errors, and HttpExceptions,
 * normalizing them into an RFC-compliant, consistent JSON error envelope:
 * {
 *   statusCode: number,
 *   errorCode: string,
 *   message: string,
 *   timestamp: string (ISO),
 *   path: string
 * }
 *
 * In production mode, sensitive internal database schema details, SQL statements,
 * and stack traces are shielded to prevent information leakage.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected internal server error occurred';
    let errorCode = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        errorCode = exception.name.replace(/Exception$/, '').replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = Array.isArray(resObj.message)
          ? resObj.message.join('; ')
          : resObj.message || exception.message;
        const rawCode = resObj.error || exception.name.replace(/Exception$/, '');
        errorCode = String(rawCode).replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toUpperCase();
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        // Unique constraint violation (e.g. duplicate email, slug, domain)
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          const target = (exception.meta?.target as string[])?.join(', ') || 'field';
          message = `A resource with this ${target} already exists.`;
          errorCode = 'RESOURCE_ALREADY_EXISTS';
          break;
        }
        // Record to update/delete not found
        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          message = 'The requested resource was not found or has been deleted.';
          errorCode = 'RESOURCE_NOT_FOUND';
          break;
        }
        // Foreign key relation violation
        case 'P2003': {
          status = HttpStatus.BAD_REQUEST;
          message = 'Foreign key relation constraint violation.';
          errorCode = 'RELATION_CONSTRAINT_VIOLATION';
          break;
        }
        // Value out of range
        case 'P2020': {
          status = HttpStatus.BAD_REQUEST;
          message = 'Input value is out of range for the designated field.';
          errorCode = 'VALUE_OUT_OF_RANGE';
          break;
        }
        default: {
          status = HttpStatus.BAD_REQUEST;
          message = 'Database operation failed due to invalid data constraints.';
          errorCode = `PRISMA_${exception.code}`;
          break;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Database query validation error: invalid fields or argument types provided.';
      errorCode = 'DATABASE_VALIDATION_ERROR';
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Database service is currently unreachable or initializing.';
      errorCode = 'DATABASE_UNAVAILABLE';
    } else if (exception instanceof Error) {
      message = process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred processing your request.'
        : exception.message;
      errorCode = exception.name || 'ERROR';
    }

    // Structured logging for 5xx errors and connection issues
    if (status >= 500) {
      const errStack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(
        `[${request.method}] ${request.url} -> ${status} [${errorCode}]: ${message}`,
        errStack,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} -> ${status} [${errorCode}]: ${message}`,
      );
    }

    if (!response.headersSent) {
      response.status(status).json({
        statusCode: status,
        errorCode,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }
}
