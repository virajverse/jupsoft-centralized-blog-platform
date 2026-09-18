/**
 * JsonLogger — Structured JSON Logger for NestJS
 *
 * Replaces the default NestJS pretty-print logger with structured JSON output.
 * Every log line is a single JSON object with:
 *   { timestamp, level, context, message, ...meta }
 *
 * Benefits:
 *   - CloudWatch Logs Insights can filter/query on any field
 *   - ECS/Fargate automatically captures stdout as CloudWatch log events
 *   - Splunk, Datadog, Loki all ingest JSON logs natively
 *
 * TRD §18: "AWS CloudWatch Logs & Metrics" requirement
 */

import { LoggerService, LogLevel } from '@nestjs/common';

export class JsonLogger implements LoggerService {
  private readonly service: string;

  constructor(service = 'jupsoft-cms') {
    this.service = service;
  }

  private write(level: string, message: any, context?: string, meta?: Record<string, any>) {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service:  this.service,
      context:  context || 'Application',
      message:
        typeof message === 'string'
          ? message
          : message instanceof Error
          ? (message.stack || message.message)
          : (message?.message || JSON.stringify(message)),
      env:      process.env.NODE_ENV || 'development',
      ...meta,
    });
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(entry + '\n');
    } else {
      process.stdout.write(entry + '\n');
    }
  }

  log(message: any, context?: string)   { this.write('info',  message, context); }
  error(message: any, stack?: string, context?: string) {
    this.write('error', message, context, stack ? { stack } : undefined);
  }
  warn(message: any,  context?: string) { this.write('warn',  message, context); }
  debug(message: any, context?: string) { this.write('debug', message, context); }
  verbose(message: any, context?: string) { this.write('verbose', message, context); }
  fatal(message: any, context?: string) { this.write('fatal', message, context); }

  setLogLevels(_levels: LogLevel[]) { /* controlled by NODE_ENV */ }
}
