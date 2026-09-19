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
        next: () => {
          const statusCode = context.switchToHttp().getResponse().statusCode;
          const durationMs = Date.now() - startTime;

          // Skip health checks from logs to avoid noise
          if (url.includes('/v1/health')) return;

          // Non-blocking fire-and-forget: do not hold up HTTP response for remote DB roundtrip
          this.prisma.apiLog.create({
            data: { method, path: url, statusCode, websiteId, durationMs },
          }).catch(() => {});
        },
        error: (err: any) => {
          const statusCode = err?.status || 500;
          const durationMs = Date.now() - startTime;
          this.prisma.apiLog.create({
            data: { method, path: url, statusCode, websiteId, durationMs },
          }).catch(() => {});
        },
      }),
    );
  }
}
