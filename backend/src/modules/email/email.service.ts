/**
 * EmailService — AWS SES Workflow Notification Engine
 *
 * Sends transactional emails on editorial workflow transitions.
 * Uses @aws-sdk/client-ses directly with nodemailer for production,
 * falls back to no-op in development when SES creds are not set.
 *
 * Events handled:
 *   blog.submitted        → Email Editor(s): "New article ready for review"
 *   blog.approved         → Email Publisher(s): "Article approved for publishing"
 *   blog.published        → Email Author: "Your article is now live"
 *   blog.archived         → Email Author: "Your article has been archived"
 *   blog.under_review     → Email Author: "Your article is under review"
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import * as fs from 'fs';
import { join } from 'path';

export interface WorkflowEmailPayload {
  toEmail: string;
  toName: string;
  event: string;
  blogTitle: string;
  blogId: string;
  websiteDomain: string;
  actorName: string;
  notes?: string;
}

export interface PasswordResetEmailPayload {
  toEmail: string;
  toName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export interface UserCredentialsEmailPayload {
  toEmail: string;
  toName: string;
  role: string;
  tempPassword?: string;
  portalUrl?: string;
  websiteName?: string;
  websiteDomain?: string;
  isPasswordReset?: boolean;
}

export interface WebsiteOwnerPublishEmailPayload {
  toEmail: string;
  toName?: string;
  websiteName: string;
  websiteDomain: string;
  websiteLogoUrl?: string;
  blogTitle: string;
  blogSlug: string;
  blogId: string;
  featuredImage?: string;
  authorName: string;
  authorRole?: string;
  authorAvatarUrl?: string;
  publishDate?: Date | string;
  readTimeMinutes?: number;
  categoryName?: string;
  excerpt?: string;
  liveUrl?: string;
  portalUrl?: string;
}

export interface TargetCadenceAlertEmailPayload {
  toEmail: string;
  toName: string;
  recipientRole?: string;
  websiteName: string;
  websiteDomain: string;
  websiteLogoUrl?: string;
  targetCount: number;
  publishedCount: number;
  underReviewCount?: number;
  draftsCount?: number;
  cycleMonth: string;
  daysRemaining: number;
  pacingStatus?: 'BEHIND' | 'CRITICAL' | 'ON_TRACK';
  recommendedWeeklyPace?: number;
  contributors?: Array<{ name: string; publishedCount: number }>;
  portalUrl?: string;
}

export interface MonthlyExecutiveDigestEmailPayload {
  toEmail: string;
  toName: string;
  websiteName: string;
  websiteDomain: string;
  websiteLogoUrl?: string;
  cycleMonth: string;
  targetCount: number;
  publishedCount: number;
  totalViews?: number;
  topArticles?: Array<{
    title: string;
    slug: string;
    views?: number;
    category?: string;
    publishDate?: string;
  }>;
  topAuthors?: Array<{
    name: string;
    blogCount: number;
  }>;
  portalUrl?: string;
}

// Map status transitions to email subjects and human-readable messages
const EMAIL_TEMPLATES: Record<string, { subject: string; headline: string; bodyLine: string }> = {
  'Under Review': {
    subject: '📝 Article Submitted for Review — Jupsoft CMS',
    headline: 'New Article Ready for Editorial Review',
    bodyLine: 'A new article has been submitted for your review.',
  },
  Approved: {
    subject: '✅ Article Approved — Ready to Publish',
    headline: 'Article Approved for Publishing',
    bodyLine: 'The following article has been approved and is ready to be published.',
  },
  Published: {
    subject: '🚀 Your Article is Now Live!',
    headline: 'Article Successfully Published',
    bodyLine: 'Great news! Your article is now live and visible to readers.',
  },
  Archived: {
    subject: '📦 Article Archived — Jupsoft CMS',
    headline: 'Article Has Been Archived',
    bodyLine: 'The following article has been archived and removed from public view.',
  },
  Scheduled: {
    subject: '🗓️ Article Scheduled for Publishing',
    headline: 'Article Scheduled',
    bodyLine: 'The following article has been scheduled for automated publishing.',
  },
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private sesClient: SESClient | null = null;
  private fromAddress: string;
  private isEnabled: boolean;

  constructor(private config: ConfigService) {
    const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);

    let accessKeyId =
      this.config.get<string>('AWS_SES_ACCESS_KEY_ID') ||
      (!isTestEnv ? process.env.AWS_SES_ACCESS_KEY_ID : '') ||
      '';
    let secretAccessKey =
      this.config.get<string>('AWS_SES_SECRET_ACCESS_KEY') ||
      (!isTestEnv ? process.env.AWS_SES_SECRET_ACCESS_KEY : '') ||
      '';
    let region =
      this.config.get<string>('AWS_SES_REGION') ||
      (!isTestEnv ? process.env.AWS_SES_REGION : '') ||
      this.config.get<string>('AWS_REGION') ||
      (!isTestEnv ? process.env.AWS_REGION : '') ||
      'ap-south-1';
    let fromAddress =
      this.config.get<string>('SES_FROM_EMAIL') ||
      (!isTestEnv ? process.env.SES_FROM_EMAIL : '') ||
      'do_not_reply@jupsoft.com';

    // If missing, fallback to searching .env files on disk directly (production/dev only, skip in unit test runner)
    if (!isTestEnv && (!accessKeyId || !secretAccessKey)) {
      const candidatePaths = [
        join(process.cwd(), '.env'),
        join(process.cwd(), 'backend', '.env'),
        join(process.cwd(), '..', '.env'),
        '/var/www/blogary.jupsoft.com/backend/.env',
        '/var/www/blogary.jupsoft.com/.env',
      ];
      for (const p of candidatePaths) {
        try {
          if (fs.existsSync(p)) {
            const raw = fs.readFileSync(p, 'utf-8');
            for (const line of raw.split('\n')) {
              const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
              if (m) {
                const k = m[1].trim();
                let v = m[2] ? m[2].trim() : '';
                if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
                if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
                if (k === 'AWS_SES_ACCESS_KEY_ID' && v) {
                  accessKeyId = v;
                }
                if (k === 'AWS_SES_SECRET_ACCESS_KEY' && v) {
                  secretAccessKey = v;
                }
                if (k === 'AWS_SES_REGION' && v) region = v;
                if (k === 'SES_FROM_EMAIL' && v) fromAddress = v;
              }
            }
            if (accessKeyId && secretAccessKey) {
              break;
            }
          }
        } catch {}
      }
    }

    // Fallback to standard AWS_ACCESS_KEY_ID if AWS_SES_ACCESS_KEY_ID wasn't set
    if (!accessKeyId) {
      accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID') || (!isTestEnv ? process.env.AWS_ACCESS_KEY_ID : '') || '';
    }
    if (!secretAccessKey) {
      secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY') || (!isTestEnv ? process.env.AWS_SECRET_ACCESS_KEY : '') || '';
    }

    this.fromAddress = fromAddress;

    // Real AWS SES Client Initialization
    this.isEnabled = Boolean(accessKeyId) && Boolean(secretAccessKey);

    if (this.isEnabled) {
      this.sesClient = new SESClient({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log(`✉️  EmailService initialized — SES region: ${region}, from: ${this.fromAddress}, key: ${accessKeyId.slice(0, 6)}...`);
    } else {
      this.logger.warn(
        `✉️  EmailService: AWS SES credentials not configured — email dispatch is disabled until credentials are provided.`,
      );
    }
  }

  /**
   * Send a workflow notification email.
   * Gracefully no-ops if SES is not configured.
   */
  async sendWorkflowNotification(payload: WorkflowEmailPayload): Promise<void> {
    const template = EMAIL_TEMPLATES[payload.event];
    if (!template) {
      this.logger.debug(`No email template for event "${payload.event}" — skipping`);
      return;
    }

    const htmlBody = this.buildHtmlEmail(template, payload);
    const textBody = this.buildTextEmail(template, payload);

    if (!this.isEnabled || !this.sesClient) {
      this.logger.warn(`Email delivery skipped to ${payload.toEmail}: AWS SES is not configured.`);
      return;
    }

    try {
      const command = new SendEmailCommand({
        Source: `Jupsoft CMS <${this.fromAddress}>`,
        Destination: { ToAddresses: [payload.toEmail] },
        Message: {
          Subject: { Data: template.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: htmlBody, Charset: 'UTF-8' },
            Text: { Data: textBody, Charset: 'UTF-8' },
          },
        },
      });

      await this.sesClient.send(command);
      this.logger.log(
        `✅ Email sent via SES → ${payload.toEmail} (event: ${payload.event}, blog: "${payload.blogTitle}")`,
      );
    } catch (err) {
      // Never throw — email failures must not block workflow transitions
      this.logger.error(
        `❌ SES email delivery failed to ${payload.toEmail}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Send a secure password reset link email.
   * Gracefully logs in dev mode if SES is not configured.
   */
  async sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<void> {
    const subject = '🔒 Reset Your Blogary CMS Password';
    const htmlBody = this.buildPasswordResetHtml(payload);
    const textBody = this.buildPasswordResetText(payload);

    if (!this.isEnabled || !this.sesClient) {
      this.logger.warn(`Password reset email skipped to ${payload.toEmail}: AWS SES is not configured.`);
      return;
    }

    try {
      const command = new SendEmailCommand({
        Source: `Jupsoft CMS <${this.fromAddress}>`,
        Destination: { ToAddresses: [payload.toEmail] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: htmlBody, Charset: 'UTF-8' },
            Text: { Data: textBody, Charset: 'UTF-8' },
          },
        },
      });

      await this.sesClient.send(command);
      this.logger.log(`✅ Password reset email sent via SES → ${payload.toEmail}`);
    } catch (err) {
      this.logger.error(
        `❌ SES password reset email delivery failed to ${payload.toEmail}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Send new user welcome invitation OR temporary password reset credentials via AWS SES.
   * Gracefully logs in dev mode if SES credentials are not set.
   */
  async sendUserCredentialsEmail(payload: UserCredentialsEmailPayload): Promise<boolean> {
    const isReset = Boolean(payload.isPasswordReset);
    const subject = isReset
      ? '🔑 Your Blogary CMS Temporary Password Has Been Reset'
      : '🎉 Welcome to Blogary CMS — Your Account Credentials';
    const htmlBody = this.buildUserCredentialsHtml(payload);
    const textBody = this.buildUserCredentialsText(payload);

    if (!this.isEnabled || !this.sesClient) {
      this.logger.warn(`Credentials email skipped to ${payload.toEmail}: AWS SES is not configured.`);
      return false;
    }

    try {
      const command = new SendEmailCommand({
        Source: `Blogary CMS <${this.fromAddress}>`,
        Destination: { ToAddresses: [payload.toEmail] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: htmlBody, Charset: 'UTF-8' },
            Text: { Data: textBody, Charset: 'UTF-8' },
          },
        },
      });

      await this.sesClient.send(command);
      this.logger.log(`✅ Credentials email sent via SES → ${payload.toEmail} (isReset: ${isReset})`);
      return true;
    } catch (err) {
      this.logger.error(
        `❌ SES credentials email delivery failed to ${payload.toEmail}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Send a branded publish notification email to the verified website owner.
   * Dispatched whenever a blog is published on their domain.
   */
  async sendWebsiteOwnerPublishNotification(payload: WebsiteOwnerPublishEmailPayload): Promise<boolean> {
    const subject = `[${payload.websiteName}] New Article Live: "${payload.blogTitle}"`;
    const htmlBody = this.buildWebsiteOwnerPublishHtml(payload);
    const textBody = this.buildWebsiteOwnerPublishText(payload);

    if (!this.isEnabled || !this.sesClient) {
      this.logger.warn(`Website Owner Publish notification skipped to ${payload.toEmail}: AWS SES is not configured.`);
      return false;
    }

    try {
      const command = new SendEmailCommand({
        Source: `${payload.websiteName} Alerts <${this.fromAddress}>`,
        Destination: { ToAddresses: [payload.toEmail] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: htmlBody, Charset: 'UTF-8' },
            Text: { Data: textBody, Charset: 'UTF-8' },
          },
        },
      });

      await this.sesClient.send(command);
      this.logger.log(`✅ Website Owner Publish notification sent via SES → ${payload.toEmail} ("${payload.blogTitle}")`);
      return true;
    } catch (err) {
      this.logger.error(
        `❌ SES Website Owner notification failed to ${payload.toEmail}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Send a publishing cadence deficit alert with pipeline diagnostics and visual progress.
   * Dispatched to Content Writers and Website Admins when behind quota.
   */
  async sendTargetCadenceAlert(payload: TargetCadenceAlertEmailPayload): Promise<boolean> {
    const deficit = Math.max(0, payload.targetCount - payload.publishedCount);
    const isCritical = payload.pacingStatus === 'CRITICAL' || (payload.daysRemaining <= 7 && deficit > 0);
    const subject = isCritical
      ? `Publishing Target Alert: ${payload.websiteName} is ${deficit} blogs behind monthly quota`
      : `Publishing Cadence Alert: ${payload.websiteName} (${payload.publishedCount}/${payload.targetCount} blogs completed)`;
    
    const htmlBody = this.buildTargetCadenceAlertHtml(payload);
    const textBody = this.buildTargetCadenceAlertText(payload);

    if (!this.isEnabled || !this.sesClient) {
      this.logger.warn(`Target Cadence Alert skipped to ${payload.toEmail}: AWS SES is not configured.`);
      return false;
    }

    try {
      const command = new SendEmailCommand({
        Source: `Blogary Cadence <${this.fromAddress}>`,
        Destination: { ToAddresses: [payload.toEmail] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: htmlBody, Charset: 'UTF-8' },
            Text: { Data: textBody, Charset: 'UTF-8' },
          },
        },
      });

      await this.sesClient.send(command);
      this.logger.log(`✅ Target Cadence Alert sent via SES → ${payload.toEmail} (${payload.websiteName}: ${payload.publishedCount}/${payload.targetCount})`);
      return true;
    } catch (err) {
      this.logger.error(
        `❌ SES Target Cadence Alert failed to ${payload.toEmail}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Send a monthly executive performance digest to the real website owner.
   * Dispatched on cycle boundaries summarizing monthly output, target completion, and analytics.
   */
  async sendMonthlyExecutiveDigest(payload: MonthlyExecutiveDigestEmailPayload): Promise<boolean> {
    const subject = `Monthly Executive Content Digest: ${payload.websiteName} - ${payload.cycleMonth}`;
    const htmlBody = this.buildMonthlyExecutiveDigestHtml(payload);
    const textBody = this.buildMonthlyExecutiveDigestText(payload);

    if (!this.isEnabled || !this.sesClient) {
      this.logger.warn(`Monthly Executive Digest skipped to ${payload.toEmail}: AWS SES is not configured.`);
      return false;
    }

    try {
      const command = new SendEmailCommand({
        Source: `Blogary Executive Digest <${this.fromAddress}>`,
        Destination: { ToAddresses: [payload.toEmail] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: htmlBody, Charset: 'UTF-8' },
            Text: { Data: textBody, Charset: 'UTF-8' },
          },
        },
      });

      await this.sesClient.send(command);
      this.logger.log(`✅ Monthly Executive Digest sent via SES → ${payload.toEmail} (${payload.websiteName}: ${payload.cycleMonth})`);
      return true;
    } catch (err) {
      this.logger.error(
        `❌ SES Monthly Executive Digest failed to ${payload.toEmail}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  // ─── HTML email template ──────────────────────────────────────────────────

  private buildHtmlEmail(
    template: { subject: string; headline: string; bodyLine: string },
    payload: WorkflowEmailPayload,
  ): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <tr>
      <td style="padding: 36px 32px;">
        <!-- Header -->
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="color: #0f172a; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Blogary <span style="font-size: 11px; padding: 2px 7px; background-color: #e0e7ff; color: #4338ca; border-radius: 4px; border: 1px solid #c7d2fe; font-weight: 600; margin-left: 4px;">CMS</span></span>
              </td>
              <td align="right">
                <span style="color: #64748b; font-size: 12px; font-family: monospace;">Editorial Workflow</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Headline -->
        <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 10px; letter-spacing: -0.3px;">${template.headline}</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">${template.bodyLine}</p>

        <!-- Article Card -->
        <div style="background-color: #f8fafc; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb;">
          <p style="color: #64748b; font-size: 11px; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Article Details</p>
          <p style="color: #0f172a; font-size: 16px; font-weight: 700; margin: 0 0 8px;">${this.escapeHtml(payload.blogTitle)}</p>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Site: <strong style="color: #2563eb;">${this.escapeHtml(payload.websiteDomain)}</strong></p>
          ${payload.notes ? `<p style="color: #475569; font-size: 13px; margin: 10px 0 0; padding-top: 8px; border-top: 1px dashed #cbd5e1;">Review Note: <em>${this.escapeHtml(payload.notes)}</em></p>` : ''}
        </div>

        <!-- Actor -->
        <p style="color: #64748b; font-size: 13px; margin: 0 0 24px;">
          Action taken by: <strong style="color: #0f172a;">${this.escapeHtml(payload.actorName)}</strong>
        </p>

        <!-- Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 0;">This is an automated notification from Jupsoft Centralized Blog Platform. Do not reply to this email.</p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildTextEmail(
    template: { headline: string; bodyLine: string },
    payload: WorkflowEmailPayload,
  ): string {
    return [
      `Jupsoft CMS — Editorial Workflow Notification`,
      ``,
      template.headline,
      template.bodyLine,
      ``,
      `Article: "${payload.blogTitle}"`,
      `Website: ${payload.websiteDomain}`,
      `Action by: ${payload.actorName}`,
      payload.notes ? `Notes: ${payload.notes}` : '',
      ``,
      `This is an automated notification from Jupsoft CMS.`,
    ]
      .filter((l) => l !== undefined)
      .join('\n');
  }

  // ─── Password Reset Email Templates ──────────────────────────────────────

  private buildPasswordResetHtml(payload: PasswordResetEmailPayload): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password — Blogary CMS</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <tr>
      <td style="padding: 36px 32px;">
        <!-- Brand Header -->
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">Blogary <span style="font-size: 11px; padding: 2px 7px; background-color: #e0e7ff; color: #4338ca; border-radius: 4px; border: 1px solid #c7d2fe; font-weight: 600; margin-left: 6px;">CMS</span></span>
              </td>
              <td align="right">
                <span style="font-size: 12px; color: #64748b; font-family: monospace;">Security Service</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Headline -->
        <h1 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 12px; letter-spacing: -0.3px;">Password Reset Request</h1>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Hello <strong style="color: #0f172a;">${this.escapeHtml(payload.toName || 'Team Member')}</strong>, we received a request to reset your password for your Blogary CMS account (<strong style="color: #0f172a;">${this.escapeHtml(payload.toEmail)}</strong>).
        </p>

        <!-- CTA Button Box -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${payload.resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 13px 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);">
            Reset My Password &rarr;
          </a>
        </div>

        <!-- Expiration Alert -->
        <div style="background-color: #fffbeb; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; font-size: 12px; margin: 0; line-height: 1.5;">
            ⏰ This reset link is single-use and will expire in <strong>${payload.expiresInMinutes} minutes</strong>.
          </p>
        </div>

        <!-- Fallback Link -->
        <p style="color: #64748b; font-size: 11px; line-height: 1.5; margin: 0 0 24px; word-break: break-all;">
          If the button above does not work, copy and paste this URL into your browser:<br>
          <a href="${payload.resetUrl}" style="color: #2563eb; text-decoration: underline;">${payload.resetUrl}</a>
        </p>

        <!-- Security Disclaimer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 0;">
            🛡️ If you did not request this password reset, you can safely ignore this email. Your current password remains secure and no changes were made.
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildPasswordResetText(payload: PasswordResetEmailPayload): string {
    return [
      `Blogary CMS — Password Reset Request`,
      ``,
      `Hello ${payload.toName || 'Team Member'},`,
      ``,
      `We received a request to reset your password for your Blogary CMS account (${payload.toEmail}).`,
      ``,
      `To set a new password, click or visit the following link:`,
      payload.resetUrl,
      ``,
      `This link will expire in ${payload.expiresInMinutes} minutes and can only be used once.`,
      ``,
      `If you did not request this password reset, please ignore this email. Your account remains secure.`,
      ``,
      `— Jupsoft CMS Security Team`,
    ].join('\n');
  }

  // ─── User Credentials & Welcome Email Templates ────────────────────────────

  private buildUserCredentialsHtml(payload: UserCredentialsEmailPayload): string {
    const isReset = Boolean(payload.isPasswordReset);
    const headline = isReset
      ? 'Temporary Password Generated'
      : 'Welcome to Blogary CMS!';
    const subhead = isReset
      ? `Your Blogary CMS account password has been reset by an administrator. Use the temporary password below to sign in.`
      : `An account has been created for you on the Blogary Centralized Content Platform. Use the temporary credentials below to get started.`;
    const portalUrl = (payload.portalUrl || 'https://blogary.jupsoft.com').replace(/\/+$/, '');
    const loginLink = `${portalUrl}/login`;
    const siteScope = payload.websiteName || payload.websiteDomain || 'Global / Multi-Site';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isReset ? 'Your Temporary Password' : 'Welcome to Blogary CMS'}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <tr>
      <td style="padding: 36px 32px;">
        <!-- Brand Header -->
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">Blogary <span style="font-size: 11px; padding: 2px 7px; background-color: #e0e7ff; color: #4338ca; border-radius: 4px; border: 1px solid #c7d2fe; font-weight: 600; margin-left: 6px;">CMS</span></span>
              </td>
              <td align="right">
                <span style="font-size: 12px; color: #64748b; font-family: monospace;">Account Services</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Headline -->
        <h1 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 10px; letter-spacing: -0.3px;">${headline}</h1>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          Hello <strong style="color: #0f172a;">${this.escapeHtml(payload.toName || 'Team Member')}</strong>, ${subhead}
        </p>

        <!-- Credentials Card -->
        <div style="background-color: #f8fafc; border-radius: 10px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
            <tr>
              <td style="color: #64748b; padding: 7px 0; width: 35%; font-weight: 500;">User ID / Email:</td>
              <td style="color: #0f172a; font-weight: 600; padding: 7px 0; word-break: break-all;">${this.escapeHtml(payload.toEmail)}</td>
            </tr>
            ${payload.tempPassword ? `
            <tr>
              <td style="color: #64748b; padding: 7px 0; font-weight: 500;">Temporary Password:</td>
              <td style="padding: 7px 0;">
                <span style="background-color: #ffffff; color: #0284c7; padding: 5px 12px; border-radius: 6px; font-family: 'Courier New', Courier, monospace; font-size: 14px; font-weight: 700; border: 1px solid #cbd5e1; display: inline-block;">${this.escapeHtml(payload.tempPassword)}</span>
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="color: #64748b; padding: 7px 0; font-weight: 500;">Assigned Role:</td>
              <td style="color: #4338ca; font-weight: 600; padding: 7px 0;">${this.escapeHtml(payload.role)}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 7px 0; font-weight: 500;">Website Scope:</td>
              <td style="color: #334155; font-weight: 600; padding: 7px 0;">${this.escapeHtml(siteScope)}</td>
            </tr>
          </table>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${loginLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 13px 32px; border-radius: 8px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);">
            Sign In to Blogary CMS &rarr;
          </a>
        </div>

        <!-- Security Notice -->
        <div style="background-color: #fffbeb; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; font-size: 12px; margin: 0; line-height: 1.5;">
            ⚠️ <strong>Security Recommendation:</strong> For your protection, please change this temporary password immediately after logging in via <em>Profile &rarr; Security</em>.
          </p>
        </div>

        <!-- Fallback Link -->
        <p style="color: #64748b; font-size: 11px; line-height: 1.5; margin: 0 0 20px;">
          Portal link: <a href="${loginLink}" style="color: #2563eb; text-decoration: underline;">${loginLink}</a>
        </p>

        <!-- Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 0;">
            This is an automated system email from Jupsoft Centralized Blog Platform. Please do not reply directly to this message.
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildUserCredentialsText(payload: UserCredentialsEmailPayload): string {
    const isReset = Boolean(payload.isPasswordReset);
    const portalUrl = (payload.portalUrl || 'https://blogary.jupsoft.com').replace(/\/+$/, '');
    const siteScope = payload.websiteName || payload.websiteDomain || 'Global / Multi-Site';

    return [
      isReset ? `Blogary CMS — Temporary Password Reset` : `Welcome to Blogary CMS!`,
      ``,
      `Hello ${payload.toName || 'Team Member'},`,
      ``,
      isReset
        ? `Your temporary password has been reset by an administrator.`
        : `An account has been created for you on Blogary CMS.`,
      ``,
      `Your Account Credentials:`,
      `• User ID / Email: ${payload.toEmail}`,
      payload.tempPassword ? `• Temporary Password: ${payload.tempPassword}` : '',
      `• Assigned Role: ${payload.role}`,
      `• Website Scope: ${siteScope}`,
      `• Sign-in URL: ${portalUrl}/login`,
      ``,
      `IMPORTANT: Please change your temporary password immediately upon signing in.`,
      ``,
      `— Jupsoft Centralized Blog Platform`,
    ]
      .filter((l) => l !== undefined)
      .join('\n');
  }

  // ─── Website Owner Publish Notification Templates ─────────────────────────

  private buildWebsiteOwnerPublishHtml(payload: WebsiteOwnerPublishEmailPayload): string {
    const portalUrl = (payload.portalUrl || 'https://blogary.jupsoft.com').replace(/\/+$/, '');
    const cleanDomain = payload.websiteDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const liveUrl = payload.liveUrl || `https://${cleanDomain}/blog/${payload.blogSlug}`;
    const cmsInspectUrl = `${portalUrl}/blogs/${payload.blogId}`;
    
    let formattedDate = 'Recently Published';
    if (payload.publishDate) {
      try {
        const d = new Date(payload.publishDate);
        formattedDate = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch {}
    }

    const brandingHeader = payload.websiteLogoUrl
      ? `<img src="${this.escapeHtml(payload.websiteLogoUrl)}" alt="${this.escapeHtml(payload.websiteName)}" style="max-height: 38px; max-width: 170px; object-fit: contain; vertical-align: middle;" />`
      : `<span style="font-size: 19px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px;">${this.escapeHtml(payload.websiteName)}</span>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Article Published - ${this.escapeHtml(payload.websiteName)}</title>
  <style>
    body { margin: 0 !important; padding: 0 !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 8px 4px !important; }
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 8px !important; }
      .content-cell { padding: 18px 14px !important; }
      .header-cell { padding-bottom: 14px !important; margin-bottom: 14px !important; }
      .card-cell { padding: 14px 12px !important; }
      .stack-col { display: block !important; width: 100% !important; box-sizing: border-box !important; padding-left: 0 !important; padding-right: 0 !important; margin-bottom: 8px !important; }
      .btn-primary, .btn-secondary { display: block !important; width: 100% !important; text-align: center !important; box-sizing: border-box !important; padding: 13px 14px !important; }
      .mobile-title { font-size: 18px !important; line-height: 1.35 !important; }
      .meta-row { display: block !important; width: 100% !important; padding-bottom: 6px !important; }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-wrapper" style="background-color: #f1f5f9; padding: 24px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td class="content-cell" style="padding: 28px 24px;">
              
              <!-- Header -->
              <div class="header-cell" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 22px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left" style="vertical-align: middle;">
                      ${brandingHeader}
                    </td>
                    <td align="right" style="vertical-align: middle;">
                      <span style="font-size: 11px; padding: 4px 10px; background-color: #f0fdf4; color: #166534; border-radius: 4px; font-weight: 700; border: 1px solid #bbf7d0; text-transform: uppercase; letter-spacing: 0.5px;">Live Online</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Headline -->
              <h1 class="mobile-title" style="color: #0f172a; font-size: 21px; font-weight: 700; margin: 0 0 10px; letter-spacing: -0.3px; line-height: 1.3;">New Article Published</h1>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                Hello <strong style="color: #0f172a;">${this.escapeHtml(payload.toName || 'Website Owner')}</strong>, a new article is now live on <strong style="color: #0f172a;">${this.escapeHtml(payload.websiteName)}</strong> (<a href="https://${this.escapeHtml(cleanDomain)}" style="color: #2563eb; text-decoration: none;">${this.escapeHtml(cleanDomain)}</a>). It is publicly accessible and ready for indexing.
              </p>

              ${payload.featuredImage ? `
              <!-- Featured Image -->
              <div style="margin: 0 0 20px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; background-color: #f8fafc;">
                <img src="${this.escapeHtml(payload.featuredImage)}" alt="${this.escapeHtml(payload.blogTitle)}" style="width: 100%; max-height: 260px; object-fit: cover; display: block;" />
              </div>
              ` : ''}

              <!-- Article Card -->
              <div class="card-cell" style="background-color: #f8fafc; border-radius: 8px; padding: 18px 20px; margin-bottom: 22px; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb;">
                <div style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 6px;">Article Details</div>
                <h2 style="color: #0f172a; font-size: 17px; font-weight: 700; margin: 0 0 10px; line-height: 1.4;">${this.escapeHtml(payload.blogTitle)}</h2>
                ${payload.excerpt ? `<p style="color: #475569; font-size: 13px; line-height: 1.5; margin: 0 0 14px; font-style: italic;">"${this.escapeHtml(payload.excerpt)}"</p>` : ''}
                
                <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 8px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 12px; color: #475569;">
                    <tr>
                      <td class="meta-row" style="padding-bottom: 6px; width: 50%;">
                        <span style="color: #64748b; font-weight: 600;">Date:</span> ${this.escapeHtml(formattedDate)}
                      </td>
                      <td class="meta-row" style="padding-bottom: 6px; width: 50%;">
                        <span style="color: #64748b; font-weight: 600;">Category:</span> ${this.escapeHtml(payload.categoryName || 'General')}
                      </td>
                    </tr>
                    <tr>
                      <td class="meta-row">
                        <span style="color: #64748b; font-weight: 600;">Read Time:</span> ${payload.readTimeMinutes || 3} min
                      </td>
                      <td class="meta-row">
                        <span style="color: #64748b; font-weight: 600;">Author:</span> ${this.escapeHtml(payload.authorName)}${payload.authorRole ? ` (${this.escapeHtml(payload.authorRole)})` : ''}
                      </td>
                    </tr>
                  </table>
                </div>
              </div>

              <!-- Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                <tr>
                  <td align="center">
                    <a href="${liveUrl}" class="btn-primary" style="display: block; width: 100%; box-sizing: border-box; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 13px 20px; border-radius: 6px; text-align: center;">
                      View Live Article
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Direct Link Fallback -->
              <div style="background-color: #f8fafc; border-radius: 6px; padding: 12px 14px; font-size: 11px; color: #64748b; margin-bottom: 20px; border: 1px solid #e2e8f0; word-break: break-all; line-height: 1.6;">
                <strong>Live URL:</strong> <a href="${liveUrl}" style="color: #2563eb; text-decoration: underline;">${liveUrl}</a><br/>
                <strong>CMS Edit:</strong> <a href="${cmsInspectUrl}" style="color: #2563eb; text-decoration: underline;">${cmsInspectUrl}</a>
              </div>

              <!-- Footer -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 0;">
                  This is an automated publication notification sent to verified stakeholders of ${this.escapeHtml(payload.websiteName)} via Jupsoft Centralized Blog Platform.
                </p>
              </div>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildWebsiteOwnerPublishText(payload: WebsiteOwnerPublishEmailPayload): string {
    const cleanDomain = payload.websiteDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const liveUrl = payload.liveUrl || `https://${cleanDomain}/blog/${payload.blogSlug}`;

    return [
      `New Article Live on ${payload.websiteName}`,
      ``,
      `Hello ${payload.toName || 'Website Owner'},`,
      ``,
      `A new blog article has been successfully published to ${payload.websiteName} (${cleanDomain}).`,
      ``,
      `Article Details:`,
      `• Title: "${payload.blogTitle}"`,
      `• Author: ${payload.authorName}${payload.authorRole ? ` (${payload.authorRole})` : ''}`,
      `• Category: ${payload.categoryName || 'General'}`,
      `• Read Time: ${payload.readTimeMinutes || 3} min`,
      payload.excerpt ? `• Excerpt: "${payload.excerpt}"` : '',
      ``,
      `Live Article Link:`,
      liveUrl,
      ``,
      `Sent by Jupsoft Centralized Blog Platform`,
    ]
      .filter((l) => l !== undefined && l !== '')
      .join('\n');
  }

  // ─── Target Cadence Alert Templates ───────────────────────────────────────

  private buildTargetCadenceAlertHtml(payload: TargetCadenceAlertEmailPayload): string {
    const portalUrl = (payload.portalUrl || 'https://blogary.jupsoft.com').replace(/\/+$/, '');
    const createBlogUrl = `${portalUrl}/blogs/new`;
    const workflowUrl = `${portalUrl}/workflow`;
    const deficit = Math.max(0, payload.targetCount - payload.publishedCount);
    const percent = Math.min(100, Math.round((payload.publishedCount / payload.targetCount) * 100));
    const isCritical = payload.pacingStatus === 'CRITICAL' || (payload.daysRemaining <= 7 && deficit > 0);
    const isBehind = payload.pacingStatus === 'BEHIND' || percent < 50;
    
    let barColor = '#16a34a'; // Green
    if (isCritical) {
      barColor = '#dc2626'; // Red
    } else if (isBehind) {
      barColor = '#d97706'; // Amber
    }

    const recommendedPace = payload.recommendedWeeklyPace || Math.max(1, Math.ceil(deficit / Math.max(1, Math.ceil(payload.daysRemaining / 7))));

    const brandingHeader = payload.websiteLogoUrl
      ? `<img src="${this.escapeHtml(payload.websiteLogoUrl)}" alt="${this.escapeHtml(payload.websiteName)}" style="max-height: 38px; max-width: 170px; object-fit: contain; vertical-align: middle;" />`
      : `<span style="font-size: 19px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px;">${this.escapeHtml(payload.websiteName)}</span>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Target Cadence Notice - ${this.escapeHtml(payload.websiteName)}</title>
  <style>
    body { margin: 0 !important; padding: 0 !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 8px 4px !important; }
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 8px !important; }
      .content-cell { padding: 18px 14px !important; }
      .card-cell { padding: 14px 12px !important; }
      .stack-col { display: block !important; width: 100% !important; box-sizing: border-box !important; padding-left: 0 !important; padding-right: 0 !important; margin-bottom: 8px !important; }
      .btn-primary, .btn-secondary { display: block !important; width: 100% !important; text-align: center !important; box-sizing: border-box !important; padding: 13px 14px !important; }
      .mobile-title { font-size: 18px !important; line-height: 1.35 !important; }
      .diag-row { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 8px 0 !important; border-bottom: 1px solid #f1f5f9 !important; }
      .progress-label-stack { display: block !important; width: 100% !important; text-align: left !important; margin-top: 4px !important; }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-wrapper" style="background-color: #f1f5f9; padding: 24px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td class="content-cell" style="padding: 28px 24px;">

              <!-- Header -->
              <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 22px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left" style="vertical-align: middle;">${brandingHeader}</td>
                    <td align="right" style="vertical-align: middle;">
                      <span style="font-size: 11px; padding: 4px 10px; background-color: ${isCritical ? '#fef2f2' : '#fffbeb'}; color: ${isCritical ? '#991b1b' : '#92400e'}; border-radius: 4px; font-weight: 700; border: 1px solid ${isCritical ? '#fecaca' : '#fde68a'}; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${isCritical ? 'Critical Shortfall' : 'Pacing Notice'}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Headline -->
              <h1 class="mobile-title" style="color: #0f172a; font-size: 21px; font-weight: 700; margin: 0 0 10px; letter-spacing: -0.3px; line-height: 1.3;">Publishing Cadence Notice</h1>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                Hello <strong style="color: #0f172a;">${this.escapeHtml(payload.toName)}</strong> (${this.escapeHtml(payload.recipientRole || 'Content Team')}), here is the editorial status for <strong style="color: #0f172a;">${this.escapeHtml(payload.websiteName)}</strong> during <strong style="color: #0f172a;">${this.escapeHtml(payload.cycleMonth)}</strong>.
              </p>

              <!-- Progress Card -->
              <div class="card-cell" style="background-color: #f8fafc; border-radius: 8px; padding: 18px 20px; margin-bottom: 22px; border: 1px solid #e2e8f0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left" style="vertical-align: middle;">
                      <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Target Goal</span>
                    </td>
                    <td class="progress-label-stack" align="right" style="vertical-align: middle;">
                      <span style="font-size: 15px; font-weight: 800; color: #0f172a;">${payload.publishedCount} / ${payload.targetCount} Articles (${percent}%)</span>
                    </td>
                  </tr>
                </table>

                <!-- Visual Progress Bar -->
                <div style="background-color: #e2e8f0; border-radius: 8px; height: 16px; width: 100%; overflow: hidden; margin: 12px 0 10px;">
                  <div style="background-color: ${barColor}; width: ${Math.max(4, percent)}%; height: 100%; border-radius: 8px;"></div>
                </div>

                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 12px; color: #64748b;">
                  <tr>
                    <td align="left">Goal: <strong style="color: #0f172a;">${payload.targetCount}</strong></td>
                    <td align="center">Published: <strong style="color: #0f172a;">${payload.publishedCount}</strong></td>
                    <td align="right">Deficit: <strong style="color: ${isCritical ? '#b91c1c' : '#b45309'};">${deficit} needed</strong></td>
                  </tr>
                </table>
              </div>

              <!-- Pipeline Diagnostics -->
              <div class="card-cell" style="background-color: #ffffff; border-radius: 8px; padding: 18px 20px; margin-bottom: 22px; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b;">
                <div style="color: #0f172a; font-size: 14px; font-weight: 700; margin-bottom: 12px;">Editorial Pipeline Diagnostics</div>
                
                <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px;">
                  <tr class="diag-row" style="background-color: #f8fafc;">
                    <td style="color: #166534; font-weight: 600; width: 38%;">
                      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#16a34a; margin-right:6px; vertical-align:middle;"></span>Published & Live
                    </td>
                    <td style="color: #0f172a; font-weight: 700;">${payload.publishedCount} articles</td>
                    <td style="color: #64748b; font-size: 11px;">Active on website</td>
                  </tr>
                  <tr class="diag-row">
                    <td style="color: #92400e; font-weight: 600;">
                      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#f59e0b; margin-right:6px; vertical-align:middle;"></span>Under Review
                    </td>
                    <td style="color: #0f172a; font-weight: 700;">${payload.underReviewCount || 0} articles</td>
                    <td style="color: #b45309; font-size: 11px;">Awaiting editorial review</td>
                  </tr>
                  <tr class="diag-row" style="background-color: #f8fafc;">
                    <td style="color: #1e40af; font-weight: 600;">
                      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#3b82f6; margin-right:6px; vertical-align:middle;"></span>Drafts in Progress
                    </td>
                    <td style="color: #0f172a; font-weight: 700;">${payload.draftsCount || 0} articles</td>
                    <td style="color: #2563eb; font-size: 11px;">In editorial drafting</td>
                  </tr>
                  <tr class="diag-row">
                    <td style="color: #991b1b; font-weight: 600;">
                      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#dc2626; margin-right:6px; vertical-align:middle;"></span>Remaining Shortfall
                    </td>
                    <td style="color: #991b1b; font-weight: 800;">${deficit} articles</td>
                    <td style="color: #64748b; font-size: 11px;">${payload.daysRemaining} days left in cycle</td>
                  </tr>
                </table>
              </div>

              <!-- Recommended Pace -->
              <div style="background-color: #eff6ff; border-radius: 8px; padding: 14px 16px; margin-bottom: 22px; border: 1px solid #bfdbfe;">
                <p style="color: #1e40af; font-size: 13px; margin: 0; line-height: 1.5;">
                  <strong>Recommended Cadence:</strong> To hit your quota of <strong>${payload.targetCount} articles</strong> with <strong>${payload.daysRemaining} days remaining</strong> in ${this.escapeHtml(payload.cycleMonth)}, maintain a steady release pace of approximately <strong>${recommendedPace} articles per week</strong>.
                </p>
              </div>

              ${payload.contributors && payload.contributors.length > 0 ? `
              <!-- Contributors Leaderboard -->
              <div class="card-cell" style="background-color: #f8fafc; border-radius: 8px; padding: 14px 16px; margin-bottom: 22px; border: 1px solid #e2e8f0;">
                <div style="color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Monthly Editorial Contributors</div>
                <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 13px; color: #334155;">
                  ${payload.contributors.map((c, idx) => `
                  <tr>
                    <td style="width: 20px; color: #64748b; font-weight: 700;">${idx + 1}.</td>
                    <td><strong>${this.escapeHtml(c.name)}</strong></td>
                    <td align="right" style="color: #2563eb; font-weight: 700;">${c.publishedCount} published</td>
                  </tr>
                  `).join('')}
                </table>
              </div>
              ` : ''}

              <!-- Actions -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                <tr>
                  <td class="stack-col" align="center" style="padding-right: 6px; width: 50%;">
                    <a href="${createBlogUrl}" class="btn-primary" style="display: block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 18px; border-radius: 6px; text-align: center;">
                      Write New Article
                    </a>
                  </td>
                  <td class="stack-col" align="center" style="padding-left: 6px; width: 50%;">
                    <a href="${workflowUrl}" class="btn-secondary" style="display: block; background-color: #ffffff; color: #334155; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 18px; border-radius: 6px; text-align: center; border: 1px solid #cbd5e1;">
                      View Workflow Board
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 0;">
                  This automated reminder was generated by the Jupsoft Target Cadence Engine for ${this.escapeHtml(payload.websiteName)}. Target settings can be adjusted in Website Settings.
                </p>
              </div>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildTargetCadenceAlertText(payload: TargetCadenceAlertEmailPayload): string {
    const portalUrl = (payload.portalUrl || 'https://blogary.jupsoft.com').replace(/\/+$/, '');
    const deficit = Math.max(0, payload.targetCount - payload.publishedCount);
    const percent = Math.min(100, Math.round((payload.publishedCount / payload.targetCount) * 100));
    const recommendedPace = payload.recommendedWeeklyPace || Math.max(1, Math.ceil(deficit / Math.max(1, Math.ceil(payload.daysRemaining / 7))));

    return [
      `Publishing Target Cadence Notice - ${payload.websiteName}`,
      ``,
      `Hello ${payload.toName} (${payload.recipientRole || 'Content Team'}),`,
      ``,
      `Here is the publishing pacing report for ${payload.websiteName} for ${payload.cycleMonth}:`,
      ``,
      `• Target Goal: ${payload.targetCount} articles`,
      `• Published & Live: ${payload.publishedCount} articles (${percent}%)`,
      `• Target Deficit: ${deficit} articles needed`,
      `• Days Remaining: ${payload.daysRemaining} days`,
      ``,
      `Editorial Pipeline Diagnostics:`,
      `• Published & Live: ${payload.publishedCount} articles`,
      `• Under Review: ${payload.underReviewCount || 0} articles (Awaiting review)`,
      `• Drafts in Progress: ${payload.draftsCount || 0} articles (In drafting)`,
      ``,
      `Recommended Cadence: Publish approximately ${recommendedPace} articles per week to achieve the target.`,
      payload.contributors && payload.contributors.length > 0
        ? `\nContributors:\n` + payload.contributors.map((c, i) => `${i + 1}. ${c.name}: ${c.publishedCount} articles`).join('\n')
        : '',
      ``,
      `Create Article: ${portalUrl}/blogs/new`,
      `Workflow Board: ${portalUrl}/workflow`,
      ``,
      `Sent by Jupsoft Centralized Blog Platform`,
    ]
      .filter((l) => l !== undefined && l !== '')
      .join('\n');
  }

  // ─── Monthly Executive Digest Templates ───────────────────────────────────

  private buildMonthlyExecutiveDigestHtml(payload: MonthlyExecutiveDigestEmailPayload): string {
    const portalUrl = (payload.portalUrl || 'https://blogary.jupsoft.com').replace(/\/+$/, '');
    const analyticsUrl = `${portalUrl}/dashboard`;
    const blogsUrl = `${portalUrl}/blogs`;
    const cleanDomain = payload.websiteDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const percent = Math.min(100, Math.round((payload.publishedCount / payload.targetCount) * 100));
    const targetMet = payload.publishedCount >= payload.targetCount;

    const brandingHeader = payload.websiteLogoUrl
      ? `<img src="${this.escapeHtml(payload.websiteLogoUrl)}" alt="${this.escapeHtml(payload.websiteName)}" style="max-height: 38px; max-width: 170px; object-fit: contain; vertical-align: middle;" />`
      : `<span style="font-size: 19px; font-weight: 800; color: #0f172a; letter-spacing: -0.4px;">${this.escapeHtml(payload.websiteName)}</span>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monthly Executive Digest - ${this.escapeHtml(payload.websiteName)}</title>
  <style>
    body { margin: 0 !important; padding: 0 !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 8px 4px !important; }
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 8px !important; }
      .content-cell { padding: 18px 14px !important; }
      .card-cell { padding: 14px 12px !important; }
      .stack-col { display: block !important; width: 100% !important; box-sizing: border-box !important; padding-left: 0 !important; padding-right: 0 !important; margin-bottom: 8px !important; }
      .kpi-col { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 0 0 10px 0 !important; }
      .btn-primary, .btn-secondary { display: block !important; width: 100% !important; text-align: center !important; box-sizing: border-box !important; padding: 13px 14px !important; }
      .mobile-title { font-size: 18px !important; line-height: 1.35 !important; }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-wrapper" style="background-color: #f1f5f9; padding: 24px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td class="content-cell" style="padding: 28px 24px;">

              <!-- Header -->
              <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 22px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left" style="vertical-align: middle;">${brandingHeader}</td>
                    <td align="right" style="vertical-align: middle;">
                      <span style="font-size: 11px; padding: 4px 10px; background-color: #f5f3ff; color: #5b21b6; border-radius: 4px; font-weight: 700; border: 1px solid #ddd6fe; text-transform: uppercase; letter-spacing: 0.5px;">Executive Digest</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Headline -->
              <h1 class="mobile-title" style="color: #0f172a; font-size: 21px; font-weight: 700; margin: 0 0 10px; letter-spacing: -0.3px; line-height: 1.3;">Monthly Performance Report</h1>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                Hello <strong style="color: #0f172a;">${this.escapeHtml(payload.toName || 'Executive')}</strong>, here is the publishing report for <strong style="color: #0f172a;">${this.escapeHtml(payload.websiteName)}</strong> for <strong style="color: #0f172a;">${this.escapeHtml(payload.cycleMonth)}</strong>.
              </p>

              <!-- Target Status Card -->
              <div class="card-cell" style="background-color: ${targetMet ? '#f0fdf4' : '#eff6ff'}; border-radius: 8px; padding: 16px 18px; margin-bottom: 22px; border: 1px solid ${targetMet ? '#bbf7d0' : '#bfdbfe'}; border-left: 4px solid ${targetMet ? '#16a34a' : '#2563eb'};">
                <div style="color: ${targetMet ? '#166534' : '#1e40af'}; font-size: 14px; font-weight: 700; margin-bottom: 4px;">
                  ${targetMet ? 'Monthly Target Achieved' : 'Monthly Performance Progress'}
                </div>
                <p style="color: ${targetMet ? '#15803d' : '#1d4ed8'}; font-size: 13px; margin: 0; line-height: 1.5;">
                  Your editorial team published <strong>${payload.publishedCount} of ${payload.targetCount} target articles</strong> (${percent}% completion rate).
                </p>
              </div>

              <!-- KPI Grid (Mobile Stackable) -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td class="kpi-col" style="padding: 0 6px 12px 0; width: 50%;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center;">
                      <div style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Articles Published</div>
                      <div style="color: #0f172a; font-size: 22px; font-weight: 800; margin-top: 4px;">${payload.publishedCount}</div>
                    </div>
                  </td>
                  <td class="kpi-col" style="padding: 0 0 12px 6px; width: 50%;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center;">
                      <div style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Monthly Target</div>
                      <div style="color: #0f172a; font-size: 22px; font-weight: 800; margin-top: 4px;">${payload.targetCount}</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="kpi-col" style="padding: 0 6px 0 0; width: 50%;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center;">
                      <div style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Completion Rate</div>
                      <div style="color: ${targetMet ? '#166534' : '#2563eb'}; font-size: 22px; font-weight: 800; margin-top: 4px;">${percent}%</div>
                    </div>
                  </td>
                  <td class="kpi-col" style="padding: 0 0 0 6px; width: 50%;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center;">
                      <div style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Estimated Views</div>
                      <div style="color: #0f172a; font-size: 22px; font-weight: 800; margin-top: 4px;">${payload.totalViews !== undefined ? payload.totalViews.toLocaleString() : 'Active'}</div>
                    </div>
                  </td>
                </tr>
              </table>

              ${payload.topArticles && payload.topArticles.length > 0 ? `
              <!-- Top Articles -->
              <div class="card-cell" style="background-color: #f8fafc; border-radius: 8px; padding: 16px 18px; margin-bottom: 22px; border: 1px solid #e2e8f0;">
                <div style="color: #0f172a; font-size: 13px; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">Highlighted Articles of the Month</div>
                <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px;">
                  ${payload.topArticles.map((art, idx) => `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="color: #64748b; width: 22px; font-weight: 700;">${idx + 1}.</td>
                    <td>
                      <a href="https://${this.escapeHtml(cleanDomain)}/blog/${this.escapeHtml(art.slug)}" style="color: #2563eb; font-weight: 600; text-decoration: none;">
                        ${this.escapeHtml(art.title)}
                      </a>
                      ${art.category ? `<span style="color: #64748b; font-size: 11px; margin-left: 6px;">(${this.escapeHtml(art.category)})</span>` : ''}
                    </td>
                    ${art.views !== undefined ? `<td align="right" style="color: #166534; font-weight: 700; font-size: 12px;">${art.views.toLocaleString()} views</td>` : ''}
                  </tr>
                  `).join('')}
                </table>
              </div>
              ` : ''}

              ${payload.topAuthors && payload.topAuthors.length > 0 ? `
              <!-- Top Contributing Authors -->
              <div class="card-cell" style="background-color: #f8fafc; border-radius: 8px; padding: 14px 16px; margin-bottom: 22px; border: 1px solid #e2e8f0;">
                <div style="color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Top Editorial Contributors</div>
                <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 13px; color: #334155;">
                  ${payload.topAuthors.map((auth, idx) => `
                  <tr>
                    <td style="width: 20px; color: #64748b; font-weight: 700;">${idx + 1}.</td>
                    <td><strong>${this.escapeHtml(auth.name)}</strong></td>
                    <td align="right" style="color: #2563eb; font-weight: 700;">${auth.blogCount} published</td>
                  </tr>
                  `).join('')}
                </table>
              </div>
              ` : ''}

              <!-- Actions -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                <tr>
                  <td class="stack-col" align="center" style="padding-right: 6px; width: 50%;">
                    <a href="${analyticsUrl}" class="btn-primary" style="display: block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 18px; border-radius: 6px; text-align: center;">
                      View Analytics Report
                    </a>
                  </td>
                  <td class="stack-col" align="center" style="padding-left: 6px; width: 50%;">
                    <a href="${blogsUrl}" class="btn-secondary" style="display: block; background-color: #ffffff; color: #334155; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 18px; border-radius: 6px; text-align: center; border: 1px solid #cbd5e1;">
                      Browse All Articles
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 0;">
                  This is an automated monthly executive digest sent to verified owners of ${this.escapeHtml(payload.websiteName)} via Jupsoft Centralized Blog Platform.
                </p>
              </div>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildMonthlyExecutiveDigestText(payload: MonthlyExecutiveDigestEmailPayload): string {
    const portalUrl = (payload.portalUrl || 'https://blogary.jupsoft.com').replace(/\/+$/, '');
    const cleanDomain = payload.websiteDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const percent = Math.min(100, Math.round((payload.publishedCount / payload.targetCount) * 100));

    return [
      `Monthly Executive Content Digest - ${payload.websiteName}`,
      ``,
      `Hello ${payload.toName || 'Executive'},`,
      ``,
      `Here is the consolidated monthly publishing report for ${payload.websiteName} for ${payload.cycleMonth}:`,
      ``,
      `Key Performance Indicators:`,
      `• Articles Published: ${payload.publishedCount}`,
      `• Monthly Target: ${payload.targetCount}`,
      `• Target Completion Rate: ${percent}%`,
      payload.totalViews !== undefined ? `• Total Estimated Views: ${payload.totalViews.toLocaleString()}` : '',
      ``,
      payload.topArticles && payload.topArticles.length > 0
        ? `Highlighted Articles:\n` + payload.topArticles.map((a, i) => `${i + 1}. "${a.title}" - https://${cleanDomain}/blog/${a.slug}`).join('\n') + `\n`
        : '',
      payload.topAuthors && payload.topAuthors.length > 0
        ? `Top Contributing Authors:\n` + payload.topAuthors.map((a, i) => `${i + 1}. ${a.name}: ${a.blogCount} articles`).join('\n') + `\n`
        : '',
      `View Analytics: ${portalUrl}/dashboard`,
      `Manage Content: ${portalUrl}/blogs`,
      ``,
      `Sent by Jupsoft Centralized Blog Platform`,
    ]
      .filter((l) => l !== undefined && l !== '')
      .join('\n');
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
