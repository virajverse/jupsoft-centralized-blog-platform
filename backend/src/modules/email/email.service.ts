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
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID') || '';
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY') || '';
    const region = this.config.get<string>('AWS_REGION') || 'ap-south-1';
    this.fromAddress =
      this.config.get<string>('SES_FROM_EMAIL') || 'noreply@jupsoft.com';

    // Only initialize SES if real credentials are provided (not mocked)
    this.isEnabled =
      Boolean(accessKeyId) &&
      !accessKeyId.startsWith('mock') &&
      Boolean(secretAccessKey) &&
      !secretAccessKey.startsWith('mock');

    if (this.isEnabled) {
      this.sesClient = new SESClient({
        region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log(`✉️  EmailService initialized — SES region: ${region}, from: ${this.fromAddress}`);
    } else {
      this.logger.warn(
        '✉️  EmailService: SES credentials are mocked/missing — emails will be logged only (dev mode)',
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
      // Dev mode: just log what would have been sent
      this.logger.log(
        `[DEV EMAIL] To: ${payload.toEmail} | Subject: ${template.subject} | Blog: "${payload.blogTitle}"`,
      );
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
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0a0a0f; margin:0; padding:20px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto;">
    <tr>
      <td style="background:#111827; border-radius:12px; padding:40px; border:1px solid #1f2937;">
        <!-- Header -->
        <div style="border-bottom:1px solid #1f2937; padding-bottom:24px; margin-bottom:24px;">
          <span style="color:#6366f1; font-size:20px; font-weight:700; letter-spacing:-0.5px;">Jupsoft CMS</span>
          <span style="color:#6b7280; font-size:12px; margin-left:8px;">Editorial Workflow</span>
        </div>
        <!-- Headline -->
        <h2 style="color:#f9fafb; font-size:22px; font-weight:600; margin:0 0 12px;">${template.headline}</h2>
        <p style="color:#9ca3af; font-size:15px; line-height:1.6; margin:0 0 24px;">${template.bodyLine}</p>
        <!-- Article Card -->
        <div style="background:#1f2937; border-radius:8px; padding:20px; margin-bottom:24px; border-left:3px solid #6366f1;">
          <p style="color:#d1d5db; font-size:13px; margin:0 0 6px; text-transform:uppercase; letter-spacing:0.5px;">Article</p>
          <p style="color:#f9fafb; font-size:17px; font-weight:600; margin:0 0 8px;">${this.escapeHtml(payload.blogTitle)}</p>
          <p style="color:#9ca3af; font-size:13px; margin:0;">Site: <span style="color:#6366f1;">${this.escapeHtml(payload.websiteDomain)}</span></p>
          ${payload.notes ? `<p style="color:#9ca3af; font-size:13px; margin:8px 0 0;">Note: <em>${this.escapeHtml(payload.notes)}</em></p>` : ''}
        </div>
        <!-- Actor -->
        <p style="color:#6b7280; font-size:13px; margin:0 0 24px;">
          Action taken by: <strong style="color:#d1d5db;">${this.escapeHtml(payload.actorName)}</strong>
        </p>
        <!-- Footer -->
        <div style="border-top:1px solid #1f2937; padding-top:20px; margin-top:8px;">
          <p style="color:#4b5563; font-size:12px; margin:0;">This is an automated notification from Jupsoft CMS. Do not reply to this email.</p>
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

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
