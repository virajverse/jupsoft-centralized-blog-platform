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

function buildService(awsKeyId = 'mock-key', awsSecret = 'mock-secret'): EmailService {
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
    sendSpy = jest.fn().mockResolvedValue({ MessageId: 'msg-001' });
    (SESClient as jest.Mock).mockImplementation(() => ({ send: sendSpy }));
  });

  it('does NOT call SES when using mock credentials (dev mode)', async () => {
    const svc = buildService('mock-key', 'mock-secret');
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
});
