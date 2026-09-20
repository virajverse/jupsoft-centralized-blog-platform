import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor() {}

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

          // Skip health checks to keep logs clean
          if (url.includes('/v1/health')) return;

          // Structured high-performance HTTP access logging without database write amplification
          if (durationMs > 1000) {
            this.logger.warn(`SLOW REQUEST [${method}] ${url} -> ${statusCode} (${durationMs}ms) tenant=${websiteId || 'none'}`);
          } else if (statusCode >= 400) {
            this.logger.warn(`[${method}] ${url} -> ${statusCode} (${durationMs}ms)`);
          }
        },
        error: (err: any) => {
          const statusCode = err?.status || 500;
          const durationMs = Date.now() - startTime;
          this.logger.error(`[${method}] ${url} -> ${statusCode} (${durationMs}ms): ${err?.message || err}`);
        },
      }),
    );
  }
}
