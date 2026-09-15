import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const websiteId = req.tenant?.id || req.query?.websiteId || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: async () => {
          const statusCode = context.switchToHttp().getResponse().statusCode;
          const durationMs = Date.now() - startTime;

          // Skip health checks from logs to avoid noise
          if (url.includes('/v1/health')) return;

          try {
            await this.prisma.apiLog.create({
              data: { method, path: url, statusCode, websiteId, durationMs },
            });
          } catch {
            // Non-blocking: log failure should never break the request
          }
        },
        error: async (err: any) => {
          const statusCode = err?.status || 500;
          const durationMs = Date.now() - startTime;
          try {
            await this.prisma.apiLog.create({
              data: { method, path: url, statusCode, websiteId, durationMs },
            });
          } catch {
            // Non-blocking
          }
        },
      }),
    );
  }
}
