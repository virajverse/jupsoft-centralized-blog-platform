/**
 * EmailService Unit Tests — AWS SES Workflow Notifications
 *
 * Tests:
 *  1. In dev mode (mock creds) — logs but does NOT call SES
 *  2. Has correct email template for each workflow status
 *  3. Never throws on SES failure (graceful degradation)
 *  4. Skips sending when no template matches the event
 */

import { EmailService, WorkflowEmailPayload } from './email.service';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

jest.mock('@aws-sdk/client-ses');

const mockPayload: WorkflowEmailPayload = {
  toEmail: 'author@example.com',
  toName: 'John Doe',
  event: 'Published',
  blogTitle: 'My Awesome Article',
  blogId: 'blog-123',
  websiteDomain: 'jupsoft.com',
  actorName: 'Publisher User',
  notes: 'Looks great!',
};

function buildService(awsKeyId = '', awsSecret = ''): EmailService {
  const config = {
    get: (key: string) => {
      const map: Record<string, string> = {
        AWS_ACCESS_KEY_ID:     awsKeyId,
        AWS_SECRET_ACCESS_KEY: awsSecret,
        AWS_REGION:            'ap-south-1',
        SES_FROM_EMAIL:        'noreply@jupsoft.com',
      };
      return map[key];
    },
  } as unknown as ConfigService;
  return new EmailService(config);
}

describe('EmailService', () => {
  let sendSpy: jest.SpyInstance;

  beforeEach(() => {
    (SESClient as jest.Mock).mockClear();
    (SendEmailCommand as unknown as jest.Mock).mockClear();
    sendSpy = jest.fn().mockResolvedValue({ MessageId: 'msg-001' });
    (SESClient as jest.Mock).mockImplementation(() => ({ send: sendSpy }));
  });

  it('does NOT call SES when credentials are not configured', async () => {
    const svc = buildService('', '');
    await svc.sendWorkflowNotification(mockPayload);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('calls SES SendEmailCommand with real credentials', async () => {
    const svc = buildService('AKIA_REAL_KEY', 'real-secret-value');
    await svc.sendWorkflowNotification(mockPayload);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const arg = sendSpy.mock.calls[0][0];
    expect(arg).toBeInstanceOf(SendEmailCommand);
  });

  it('never throws even when SES send() rejects', async () => {
    sendSpy.mockRejectedValue(new Error('SES quota exceeded'));
    const svc = buildService('AKIA_REAL_KEY', 'real-secret-value');
    await expect(svc.sendWorkflowNotification(mockPayload)).resolves.not.toThrow();
  });

  it('skips sending for unrecognized event types', async () => {
    const svc = buildService('AKIA_REAL_KEY', 'real-secret-value');
    const unknownPayload = { ...mockPayload, event: 'SomeUnknownEvent' };
    await svc.sendWorkflowNotification(unknownPayload);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it.each(['Under Review', 'Approved', 'Published', 'Archived', 'Scheduled'])(
    'has a template for workflow event: %s',
    async (event) => {
      const svc = buildService('AKIA_REAL_KEY', 'real-secret-value');
      await svc.sendWorkflowNotification({ ...mockPayload, event });
      expect(sendSpy).toHaveBeenCalledTimes(1);
      sendSpy.mockClear();
    },
  );

  it('calls SES SendEmailCommand for sendUserCredentialsEmail with real credentials', async () => {
    const svc = buildService('AKIA_REAL_KEY', 'real-secret-value');
    await svc.sendUserCredentialsEmail({
      toEmail: 'newuser@example.com',
      toName: 'New Member',
      role: 'Content Writer',
      tempPassword: 'Test@Password123',
      portalUrl: 'https://blogary.jupsoft.com',
      isPasswordReset: false,
    });
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const arg = sendSpy.mock.calls[0][0];
    expect(arg).toBeInstanceOf(SendEmailCommand);
  });

  describe('Phase 2: Real Owner Publish, Cadence Alerts & Monthly Digest', () => {
    it('sends WebsiteOwnerPublishNotification via SES when credentials are set', async () => {
      const svc = buildService('AKIA_REAL_KEY', 'real-secret-value');
      const result = await svc.sendWebsiteOwnerPublishNotification({
        toEmail: 'owner@jupsoft.com',
        toName: 'Director Jupsoft',
        websiteName: 'Jupsoft Cloud',
        websiteDomain: 'jupsoft.com',
        blogTitle: 'Next-Gen School ERP in 2026',
        blogSlug: 'next-gen-school-erp-2026',
        blogId: 'blog-456',
        authorName: 'Sachin Tendulkar',
        authorRole: 'Senior Content Strategist',
        categoryName: 'EdTech',
        publishDate: new Date(),
        readTimeMinutes: 5,
        excerpt: 'How AI and modern ERPs are transforming classrooms.',
      });

      expect(result).toBe(true);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      const commandArgs = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0];
      expect(commandArgs.Destination.ToAddresses).toContain('owner@jupsoft.com');
      expect(commandArgs.Message.Subject.Data).toContain('Next-Gen School ERP in 2026');
      expect(commandArgs.Message.Body.Html.Data).toContain('View Live Article');
      expect(commandArgs.Message.Body.Html.Data).toContain('https://jupsoft.com/blog/next-gen-school-erp-2026');
      expect(commandArgs.Message.Body.Html.Data).toContain('Read Time:');
      expect(commandArgs.Message.Body.Html.Data).toContain('5 min');
    });

    it('sends TargetCadenceAlert with progress bar and pipeline diagnostics', async () => {
      (SendEmailCommand as unknown as jest.Mock).mockClear();
      sendSpy.mockClear();
      const svc = buildService('AKIA_REAL_KEY', 'real-secret-value');
      const result = await svc.sendTargetCadenceAlert({
        toEmail: 'writer@digifynext.com',
        toName: 'Digify Content Writer',
        recipientRole: 'Content Writer',
        websiteName: 'DigifyNext',
        websiteDomain: 'digifynext.com',
        targetCount: 20,
        publishedCount: 8,
        underReviewCount: 4,
        draftsCount: 3,
        cycleMonth: 'October 2026',
        daysRemaining: 10,
        pacingStatus: 'BEHIND',
        contributors: [
          { name: 'Sachin', publishedCount: 5 },
          { name: 'Priya', publishedCount: 3 },
        ],
      });

      expect(result).toBe(true);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      const commandArgs = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0];
      expect(commandArgs.Destination.ToAddresses).toContain('writer@digifynext.com');
      expect(commandArgs.Message.Subject.Data).toContain('Publishing Cadence Alert: DigifyNext');
      expect(commandArgs.Message.Body.Html.Data).toContain('Editorial Pipeline Diagnostics');
      expect(commandArgs.Message.Body.Html.Data).toContain('8 / 20 Articles (40%)');
      expect(commandArgs.Message.Body.Html.Data).toContain('Sachin');
      expect(commandArgs.Message.Body.Html.Data).toContain('View Workflow Board');
      expect(commandArgs.Message.Body.Html.Data).not.toContain('Kanban');
    });

    it('sends MonthlyExecutiveDigest with performance statistics', async () => {
      (SendEmailCommand as unknown as jest.Mock).mockClear();
      sendSpy.mockClear();
      const svc = buildService('AKIA_REAL_KEY', 'real-secret-value');
      const result = await svc.sendMonthlyExecutiveDigest({
        toEmail: 'executive@jupsoft.com',
        toName: 'Managing Director',
        websiteName: 'Jupsoft Cloud',
        websiteDomain: 'jupsoft.com',
        cycleMonth: 'September 2026',
        targetCount: 15,
        publishedCount: 16,
        totalViews: 45200,
        topArticles: [
          { title: 'AI Campus Guide', slug: 'ai-campus-guide', views: 18400, category: 'AI' },
          { title: 'School Fee Automation', slug: 'school-fee-automation', views: 12100, category: 'Finance' },
        ],
        topAuthors: [
          { name: 'Rahul Sharma', blogCount: 7 },
          { name: 'Ananya Verma', blogCount: 5 },
        ],
      });

      expect(result).toBe(true);
      expect(sendSpy).toHaveBeenCalledTimes(1);
      const commandArgs = (SendEmailCommand as unknown as jest.Mock).mock.calls[0][0];
      expect(commandArgs.Destination.ToAddresses).toContain('executive@jupsoft.com');
      expect(commandArgs.Message.Subject.Data).toContain('Monthly Executive Content Digest: Jupsoft Cloud');
      expect(commandArgs.Message.Body.Html.Data).toContain('Monthly Target Achieved');
      expect(commandArgs.Message.Body.Html.Data).toContain('AI Campus Guide');
    });

    it('gracefully no-ops and returns false when credentials are not configured without throwing', async () => {
      const unconfiguredSvc = buildService('', '');

      const publishRes = await unconfiguredSvc.sendWebsiteOwnerPublishNotification({
        toEmail: 'owner@dev.test',
        websiteName: 'Dev Site',
        websiteDomain: 'dev.test',
        blogTitle: 'Dev Post',
        blogSlug: 'dev-post',
        blogId: '1',
        authorName: 'Dev Author',
      });
      expect(publishRes).toBe(false);

      const cadenceRes = await unconfiguredSvc.sendTargetCadenceAlert({
        toEmail: 'team@dev.test',
        toName: 'Dev Team',
        websiteName: 'Dev Site',
        websiteDomain: 'dev.test',
        targetCount: 10,
        publishedCount: 2,
        cycleMonth: 'October 2026',
        daysRemaining: 15,
      });
      expect(cadenceRes).toBe(false);

      const digestRes = await unconfiguredSvc.sendMonthlyExecutiveDigest({
        toEmail: 'exec@dev.test',
        toName: 'Dev Exec',
        websiteName: 'Dev Site',
        websiteDomain: 'dev.test',
        cycleMonth: 'September 2026',
        targetCount: 10,
        publishedCount: 12,
      });
      expect(digestRes).toBe(false);

      // When unconfigured, no SES calls made
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });
});
