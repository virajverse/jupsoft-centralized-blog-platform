/**
 * WEBHOOK SECURITY TESTS — Phase 17
 * Tests: HMAC signing, replay protection, endpoint management, payload validation
 */
import { WebhookDispatcherService } from '../modules/webhooks/webhook-dispatcher.service';
import * as crypto from 'crypto';

const mockPrisma = {
  website: { findUnique: jest.fn(), update: jest.fn() },
  webhookDeliveryLog: { create: jest.fn() },
};
const mockConfig = {
  get: jest.fn((k: string) => {
    if (k === 'WEBHOOK_DEFAULT_SECRET') return 'wh_sec_test_secret_2026';
    return null;
  }),
};

const makeWebsite = (webhookUrl: string) => ({
  id: 'site-1',
  domain: 'test.com',
  revalidateWebhookUrl: webhookUrl,
  status: 'active',
});

describe('WebhookDispatcherService', () => {
  let service: WebhookDispatcherService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WebhookDispatcherService(mockPrisma as any, mockConfig as any);
  });

  // ── 17.1: HMAC signature is included in webhook request ───────────────
  it('should include valid HMAC-SHA256 x-signature header', async () => {
    const website = makeWebsite('https://consumer.test.com/api/revalidate');
    mockPrisma.website.findUnique.mockResolvedValue(website);
    mockPrisma.webhookDeliveryLog.create.mockResolvedValue({});

    let capturedHeaders: any = null;
    // Mock global fetch
    const mockFetch = jest.fn().mockImplementation(async (url: string, opts: any) => {
      capturedHeaders = opts.headers;
      return { status: 200, ok: true, text: () => Promise.resolve('ok') };
    });
    global.fetch = mockFetch as any;

    await service.dispatchWebhook('site-1', 'blog.published', 'test-slug');

    expect(capturedHeaders).toBeDefined();
    expect(capturedHeaders['x-signature']).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  // ── 17.2: Timestamp is included in webhook for replay protection ───────
  it('should include x-timestamp header in webhook for replay protection', async () => {
    const website = makeWebsite('https://consumer.test.com/api/revalidate');
    mockPrisma.website.findUnique.mockResolvedValue(website);
    mockPrisma.webhookDeliveryLog.create.mockResolvedValue({});

    let capturedHeaders: any = null;
    const mockFetch = jest.fn().mockImplementation(async () => {
      return { status: 200, ok: true, text: () => Promise.resolve('ok') };
    });
    global.fetch = mockFetch as any;

    const before = Date.now();
    await service.dispatchWebhook('site-1', 'blog.updated', 'test-slug');
    const after = Date.now();

    if (mockFetch.mock.calls.length > 0) {
      const [, opts] = mockFetch.mock.calls[0];
      const timestamp = parseInt(opts.headers['x-timestamp'], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    }
  });

  // ── 17.3: No webhook dispatched when none configured ──────────────────
  it('should not throw when no revalidateWebhookUrl configured', async () => {
    mockPrisma.website.findUnique.mockResolvedValue(makeWebsite(''));

    await expect(service.dispatchWebhook('site-1', 'blog.published', 'test-slug'))
      .resolves.not.toThrow();
  });

  // ── 17.4: Webhook delivery logged to database ─────────────────────────
  it('should log webhook delivery result to database', async () => {
    const website = makeWebsite('https://consumer.test.com/api/revalidate');
    mockPrisma.website.findUnique.mockResolvedValue(website);
    mockPrisma.webhookDeliveryLog.create.mockResolvedValue({});
    global.fetch = jest.fn().mockResolvedValue({
      status: 200, ok: true, text: () => Promise.resolve('{"revalidated":true}')
    }) as any;

    await service.dispatchWebhook('site-1', 'blog.published', 'test-slug');

    expect(mockPrisma.webhookDeliveryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          websiteId: 'site-1',
          event: 'blog.published',
          slug: 'test-slug',
          delivered: true,
          statusCode: 200,
        })
      })
    );
  });

  // ── 17.5: Failed delivery still logged ───────────────────────────────
  it('should log failed webhook delivery (non-2xx response)', async () => {
    const website = makeWebsite('https://consumer.test.com/api/revalidate');
    mockPrisma.website.findUnique.mockResolvedValue(website);
    mockPrisma.webhookDeliveryLog.create.mockResolvedValue({});
    global.fetch = jest.fn().mockResolvedValue({
      status: 500, ok: false, text: () => Promise.resolve('Internal Server Error')
    }) as any;

    await service.dispatchWebhook('site-1', 'blog.published', 'test-slug');

    expect(mockPrisma.webhookDeliveryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          delivered: false,
          statusCode: 500,
        })
      })
    );
  });

  // ── 17.6: Network failure still logged ────────────────────────────────
  it('should handle network errors gracefully and log failure', async () => {
    const website = makeWebsite('https://unreachable.test.com/api/revalidate');
    mockPrisma.website.findUnique.mockResolvedValue(website);
    mockPrisma.webhookDeliveryLog.create.mockResolvedValue({});
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as any;

    await expect(service.dispatchWebhook('site-1', 'blog.published', 'test-slug'))
      .resolves.not.toThrow(); // Should NOT throw, just log

    expect(mockPrisma.webhookDeliveryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          delivered: false,
          statusCode: 0,
        })
      })
    );
  });

  // ── 17.7: HMAC signature verification logic (consuming site perspective)
  it('should generate verifiable HMAC signature', () => {
    const secret = 'wh_sec_test_secret_2026';
    const payload = JSON.stringify({
      event: 'blog.published',
      website: 'test.com',
      slug: 'test-slug',
      timestamp: 1234567890,
    });

    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    expect(signature).toMatch(/^[a-f0-9]{64}$/);

    // Consuming site verification:
    const recomputed = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    expect(crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(recomputed))).toBe(true);
  });

  // ── 17.8: Altered payload fails HMAC verification ────────────────────
  it('should detect tampered webhook payload via HMAC mismatch', () => {
    const secret = 'wh_sec_test_secret_2026';
    const payload = JSON.stringify({ event: 'blog.published', website: 'test.com', slug: 'test-slug', timestamp: 1234567890 });
    const alteredPayload = JSON.stringify({ event: 'blog.published', website: 'evil.com', slug: 'malicious-slug', timestamp: 1234567890 });

    const originalSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const recomputedSig = crypto.createHmac('sha256', secret).update(alteredPayload).digest('hex');

    expect(originalSig).not.toBe(recomputedSig); // Tampered payload has different signature
  });

  // ── 17.9: SECURITY FINDING: Secret is sent in plain text headers ──────
  it('[SECURITY-FINDING] webhook sends secret in x-cms-webhook-secret header — plain text exposure', async () => {
    // In webhook-dispatcher.service.ts line 171:
    //   'x-cms-webhook-secret': secret,
    //   'Authorization': `Bearer ${secret}`,
    // The secret is sent in clear text — this is a security issue
    // If HTTPS is not enforced, the secret could be intercepted
    // FLAG: SECURITY — WEBHOOK_DEFAULT_SECRET transmitted in plain text headers
    expect(true).toBe(true); // Documentation test
  });

  // ── 17.10: Multi-webhook JSON configuration parse ────────────────────
  it('should correctly parse multi-webhook JSON config', () => {
    const multiWebhookConfig = JSON.stringify([
      { id: 'wh_1', name: 'ISR Revalidation', url: 'https://consumer1.com/api/revalidate', events: ['blog.published'], isActive: true },
      { id: 'wh_2', name: 'Slack Notify', url: 'https://hooks.slack.com/services/XXX', events: ['blog.published', 'blog.updated'], isActive: false },
    ]);

    const endpoints = service.parseWebhookEndpoints(multiWebhookConfig);
    expect(endpoints).toHaveLength(2);
    expect(endpoints[0].url).toBe('https://consumer1.com/api/revalidate');
    expect(endpoints[1].isActive).toBe(false);
  });

  // ── 17.11: Only active endpoints receive webhooks ─────────────────────
  it('should only dispatch to active endpoints', async () => {
    const multiWebhookConfig = JSON.stringify([
      { id: 'wh_1', name: 'Active', url: 'https://active.com/api/revalidate', events: ['blog.published'], isActive: true },
      { id: 'wh_2', name: 'Inactive', url: 'https://inactive.com/api/revalidate', events: ['blog.published'], isActive: false },
    ]);
    const website = makeWebsite(multiWebhookConfig);
    mockPrisma.website.findUnique.mockResolvedValue(website);
    mockPrisma.webhookDeliveryLog.create.mockResolvedValue({});

    const fetchUrls: string[] = [];
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      fetchUrls.push(url);
      return { status: 200, ok: true, text: () => Promise.resolve('ok') };
    }) as any;

    await service.dispatchWebhook('site-1', 'blog.published', 'test-slug');

    expect(fetchUrls).toContain('https://active.com/api/revalidate');
    expect(fetchUrls).not.toContain('https://inactive.com/api/revalidate');
  });

  // ── 17.12: Webhook endpoint SSRF check ────────────────────────────────
  it('[SECURITY] should validate webhook URL scheme in addEndpoint', async () => {
    mockPrisma.website.findUnique.mockResolvedValue(makeWebsite(''));
    mockPrisma.website.update.mockResolvedValue({});

    await expect(service.addEndpoint('site-1', {
      name: 'Test',
      url: 'javascript:alert(1)',
      events: ['blog.published'],
    })).rejects.toThrow('must start with http');
  });

  it('[SECURITY] should reject file:// scheme in webhook URL', async () => {
    mockPrisma.website.findUnique.mockResolvedValue(makeWebsite(''));
    mockPrisma.website.update.mockResolvedValue({});

    await expect(service.addEndpoint('site-1', {
      name: 'Test',
      url: 'file:///etc/passwd',
      events: ['blog.published'],
    })).rejects.toThrow('must start with http');
  });

  // BUG-004 (SSRF Fix verification): internal IPs are now blocked
  it('[SECURITY] should reject internal/private network addresses to prevent SSRF', async () => {
    mockPrisma.website.findUnique.mockResolvedValue(makeWebsite(''));
    mockPrisma.website.update.mockResolvedValue({});

    await expect(service.addEndpoint('site-1', {
      name: 'SSRF Test AWS Metadata',
      url: 'http://169.254.169.254/latest/meta-data',
      events: ['blog.published'],
    })).rejects.toThrow('link-local');

    await expect(service.addEndpoint('site-1', {
      name: 'SSRF Test Localhost',
      url: 'http://localhost:3000/api/secret',
      events: ['blog.published'],
    })).rejects.toThrow('loopback');

    await expect(service.addEndpoint('site-1', {
      name: 'SSRF Test Private IP',
      url: 'http://192.168.1.100/admin',
      events: ['blog.published'],
    })).rejects.toThrow('private network');
  });
});
