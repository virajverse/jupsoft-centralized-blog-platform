/**
 * WebhookDispatcherService Unit Tests — TRD §13 (Hybrid ISR Delivery)
 *
 * Tests:
 *  1. Dispatches webhook with correct HMAC signature
 *  2. Skips dispatch if website has no revalidateWebhookUrl
 *  3. Logs delivery attempt to webhook_delivery_logs table
 *  4. Does NOT throw on HTTP failure (fire-and-forget with logging)
 *  5. HMAC signature uses x-signature + x-timestamp headers
 */

import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

const mockWebsite = {
  id: 'web-1',
  revalidateWebhookUrl: 'https://jupsoft.com/api/revalidate',
  webhookSecret: 'test-secret-abc123',
  domain: 'jupsoft.com',
};

describe('WebhookDispatcherService', () => {
  let service: WebhookDispatcherService;
  let prisma: jest.Mocked<PrismaService>;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    prisma = {
      website: { findUnique: jest.fn() },
      webhookDeliveryLog: { create: jest.fn() },
    } as any;

    const configService = {
      get: jest.fn().mockReturnValue('test-default-secret'),
    } as any;

    service = new WebhookDispatcherService(prisma, configService);

    // Mock global fetch
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
    } as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it('skips dispatch when website has no revalidateWebhookUrl', async () => {
    (prisma.website.findUnique as jest.Mock).mockResolvedValue({
      ...mockWebsite,
      revalidateWebhookUrl: null,
    });
    await service.dispatchWebhook('web-1', 'blog.published', 'my-slug');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('dispatches POST request to revalidateWebhookUrl', async () => {
    (prisma.website.findUnique as jest.Mock).mockResolvedValue(mockWebsite);
    (prisma.webhookDeliveryLog.create as jest.Mock).mockResolvedValue({});
    await service.dispatchWebhook('web-1', 'blog.published', 'my-slug');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://jupsoft.com/api/revalidate');
    expect(opts.method).toBe('POST');
  });

  it('sends HMAC-SHA256 x-signature header', async () => {
    (prisma.website.findUnique as jest.Mock).mockResolvedValue(mockWebsite);
    (prisma.webhookDeliveryLog.create as jest.Mock).mockResolvedValue({});
    await service.dispatchWebhook('web-1', 'blog.published', 'my-slug');

    const [, opts] = fetchSpy.mock.calls[0];
    const headers = opts.headers as Record<string, string>;
    expect(headers['x-signature']).toMatch(/^sha256=/);
    expect(headers['x-timestamp']).toBeTruthy();

    // Verify the HMAC is valid
    const timestamp = headers['x-timestamp'];
    const body = opts.body as string;
    const expected = 'sha256=' + crypto
      .createHmac('sha256', mockWebsite.webhookSecret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    expect(headers['x-signature']).toBe(expected);
  });

  it('logs delivery to webhookDeliveryLog even on HTTP failure', async () => {
    (prisma.website.findUnique as jest.Mock).mockResolvedValue(mockWebsite);
    (prisma.webhookDeliveryLog.create as jest.Mock).mockResolvedValue({});
    fetchSpy.mockResolvedValue({ ok: false, status: 502 } as any);

    // Should NOT throw
    await expect(
      service.dispatchWebhook('web-1', 'blog.published', 'my-slug'),
    ).resolves.not.toThrow();

    expect(prisma.webhookDeliveryLog.create).toHaveBeenCalled();
    const logCall = (prisma.webhookDeliveryLog.create as jest.Mock).mock.calls[0][0];
    expect(logCall.data.success).toBe(false);
  });

  it('logs delivery success when HTTP 200', async () => {
    (prisma.website.findUnique as jest.Mock).mockResolvedValue(mockWebsite);
    (prisma.webhookDeliveryLog.create as jest.Mock).mockResolvedValue({});
    fetchSpy.mockResolvedValue({ ok: true, status: 200 } as any);

    await service.dispatchWebhook('web-1', 'blog.published', 'my-slug');

    const logCall = (prisma.webhookDeliveryLog.create as jest.Mock).mock.calls[0][0];
    expect(logCall.data.success).toBe(true);
    expect(logCall.data.statusCode).toBe(200);
  });
});
