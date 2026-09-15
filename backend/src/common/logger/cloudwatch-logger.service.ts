/**
 * CloudWatchLoggerService — AWS CloudWatch Logs Pusher
 *
 * In production (ECS/Fargate), logs are automatically captured from stdout/stderr
 * by the ECS log driver — no SDK push needed.
 *
 * This service handles METRIC FILTERS — it pushes custom CloudWatch metrics for:
 *   - Error rate (count of ERROR log events per minute)
 *   - Webhook failure rate
 *   - Slow API response rate (>500ms)
 *   - Email delivery failure count
 *
 * TRD §18: "AWS CloudWatch logs, metrics, alarms"
 *
 * Only active when CLOUDWATCH_LOG_GROUP env var is set (production).
 * Silently no-ops in development.
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
} from '@aws-sdk/client-cloudwatch-logs';

export type MetricName =
  | 'ErrorCount'
  | 'WebhookFailureCount'
  | 'SlowApiCount'
  | 'EmailFailureCount'
  | 'PublishedBlogCount';

@Injectable()
export class CloudWatchLoggerService implements OnModuleInit {
  private readonly logger = new Logger(CloudWatchLoggerService.name);
  private client: CloudWatchLogsClient | null = null;
  private logGroup: string;
  private logStream: string;
  private isEnabled: boolean;
  private sequenceToken: string | undefined;

  constructor(private config: ConfigService) {
    this.logGroup  = this.config.get<string>('CLOUDWATCH_LOG_GROUP')  || '/jupsoft-cms/backend';
    this.logStream = this.config.get<string>('CLOUDWATCH_LOG_STREAM') || `app-${new Date().toISOString().slice(0, 10)}`;

    const accessKeyId     = this.config.get<string>('AWS_ACCESS_KEY_ID')     || '';
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY') || '';
    const region          = this.config.get<string>('AWS_REGION')            || 'ap-south-1';
    const cwGroup         = this.config.get<string>('CLOUDWATCH_LOG_GROUP');

    // Only enable if real AWS creds + explicit log group configured
    this.isEnabled =
      Boolean(cwGroup) &&
      Boolean(accessKeyId) &&
      !accessKeyId.startsWith('mock');

    if (this.isEnabled) {
      this.client = new CloudWatchLogsClient({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log(`📊 CloudWatchLoggerService enabled — group: ${this.logGroup}`);
    } else {
      this.logger.debug('📊 CloudWatchLoggerService: disabled (dev mode or no CLOUDWATCH_LOG_GROUP set)');
    }
  }

  async onModuleInit() {
    if (!this.isEnabled || !this.client) return;
    await this.ensureLogGroupAndStream();
  }

  // ─── Ensure log group + stream exist ─────────────────────────────────────

  private async ensureLogGroupAndStream() {
    try {
      await this.client!.send(new CreateLogGroupCommand({ logGroupName: this.logGroup }));
    } catch (e: any) {
      if (!e.name?.includes('ResourceAlreadyExistsException')) {
        this.logger.warn(`Could not create log group: ${e.message}`);
      }
    }
    try {
      await this.client!.send(
        new CreateLogStreamCommand({
          logGroupName:  this.logGroup,
          logStreamName: this.logStream,
        }),
      );
    } catch (e: any) {
      if (!e.name?.includes('ResourceAlreadyExistsException')) {
        this.logger.warn(`Could not create log stream: ${e.message}`);
      }
    }
  }

  // ─── Push a structured metric event to CloudWatch Logs ───────────────────
  // CloudWatch Metric Filters can parse these JSON events and create metrics

  async putMetricEvent(metric: MetricName, value = 1, dimensions: Record<string, string> = {}) {
    if (!this.isEnabled || !this.client) return;

    const logEvent = {
      timestamp: Date.now(),
      message: JSON.stringify({
        type:       'METRIC',
        metric,
        value,
        dimensions,
        service:    'jupsoft-cms-backend',
        env:        process.env.NODE_ENV || 'production',
        timestamp:  new Date().toISOString(),
      }),
    };

    try {
      const cmd = new PutLogEventsCommand({
        logGroupName:  this.logGroup,
        logStreamName: this.logStream,
        logEvents:     [logEvent],
        sequenceToken: this.sequenceToken,
      });
      const res = await this.client.send(cmd);
      this.sequenceToken = res.nextSequenceToken;
    } catch (err: any) {
      // DataAlreadyAcceptedException — update sequence token and retry once
      if (err.name === 'DataAlreadyAcceptedException' || err.name === 'InvalidSequenceTokenException') {
        this.sequenceToken = err.expectedSequenceToken;
      } else {
        this.logger.warn(`CloudWatch putMetricEvent failed: ${err.message}`);
      }
    }
  }

  // ─── Convenience helpers ──────────────────────────────────────────────────

  async recordError(context: string)          { await this.putMetricEvent('ErrorCount',          1, { context }); }
  async recordWebhookFailure(domain: string)  { await this.putMetricEvent('WebhookFailureCount', 1, { domain });  }
  async recordSlowApi(path: string)           { await this.putMetricEvent('SlowApiCount',         1, { path });   }
  async recordEmailFailure(event: string)     { await this.putMetricEvent('EmailFailureCount',    1, { event });  }
  async recordBlogPublished(websiteId: string){ await this.putMetricEvent('PublishedBlogCount',   1, { websiteId }); }
}
