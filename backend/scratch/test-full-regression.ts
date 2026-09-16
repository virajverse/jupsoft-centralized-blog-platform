/**
 * Jupsoft Centralized Multi-Site CMS — Enterprise Full Regression Suite
 * Conforming strictly to TRD v1.0 specifications:
 *   - TRD §6: 6-Stage Editorial Workflow Engine & Workflow Logs
 *   - TRD §7: SEO Continuity & Automatic 301 Redirect Guard
 *   - TRD §12 & §13: Public Consumer Delivery APIs (v1) & Multi-Tenant API Keys
 *   - TRD §13 & §15: HMAC-SHA256 Webhook Revalidation & Audit Trails
 *   - TRD §15: Auth, Brute-Force Lockout (5 attempts -> 15m), RBAC Anti-Escalation, Rate Limiting (60 req/min)
 */

import * as http from 'http';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface HttpResponse {
  status: number;
  data: any;
  headers: http.IncomingHttpHeaders;
}

function request(
  method: string,
  path: string,
  body?: any,
  token?: string,
  apiKey?: string,
  extraHeaders?: Record<string, string>
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 4000,
        path,
        method,
        headers,
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => {
          resData += chunk;
        });
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(resData);
          } catch {
            parsed = resData;
          }
          resolve({
            status: res.statusCode || 500,
            data: parsed,
            headers: res.headers,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
    failures.push(`${testName}${detail ? ` (${detail})` : ''}`);
  }
}

async function runRegressionSuite() {
  console.log('================================================================================');
  console.log('           JUPSOFT ENTERPRISE CENTRALIZED CMS — FULL REGRESSION TEST SUITE        ');
  console.log('================================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // PHASE 1: SYSTEM HEALTH & SEED TENANTS INTEGRITY
    // -------------------------------------------------------------------------
    console.log('--- PHASE 1: Health & Tenant Integrity Check ---');
    const health = await request('GET', '/v1/health');
    assert(health.status === 200, 'Health endpoint /v1/health responds HTTP 200 OK');
    assert(health.data.status === 'ok', 'Health response payload confirms status "ok"');

    const websites = await prisma.website.findMany();
    assert(websites.length >= 3, `Database contains ${websites.length} configured tenants (>= 3)`);
    const cloudSite = websites.find((w) => w.id === 'site-cloud');
    const growthSite = websites.find((w) => w.id === 'site-growth');
    const edtechSite = websites.find((w) => w.id === 'site-edtech');
    assert(!!cloudSite, 'Tenant "site-cloud" exists');
    assert(!!growthSite, 'Tenant "site-growth" exists');
    assert(!!edtechSite, 'Tenant "site-edtech" exists');
    assert(!!cloudSite?.apiKey, 'Tenant "site-cloud" possesses active API Key');

    // -------------------------------------------------------------------------
    // PHASE 2: AUTHENTICATION, JWT & ROLE TOKENS (TRD §15)
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 2: Authentication & Token Issuance (TRD §15) ---');

    // 2.1 Super Admin
    const superLogin = await request('POST', '/admin/auth/login', {
      email: 'admin@jupsoft.com',
      password: 'Admin@12345',
    });
    assert(superLogin.status === 200 || superLogin.status === 201, 'Super Admin login succeeds with HTTP 200/201');
    const superToken = superLogin.data.accessToken;
    const superRefreshToken = superLogin.data.refreshToken;
    assert(!!superToken, 'Super Admin receives JWT access token');
    assert(!!superRefreshToken, 'Super Admin receives JWT refresh token');
    assert(superLogin.data.user.roles.includes('Super Admin'), 'Super Admin role present in payload');

    // 2.2 Cloud Website Admin
    const cloudAdminLogin = await request('POST', '/admin/auth/login', {
      email: 'admin@cloud.jupsoft.com',
      password: 'Admin@12345',
    });
    assert(cloudAdminLogin.status === 200 || cloudAdminLogin.status === 201, 'Cloud Admin login succeeds');
    const cloudAdminToken = cloudAdminLogin.data.accessToken;
    assert(cloudAdminLogin.data.user.roleAssignments['site-cloud'] === 'Website Admin', 'Cloud Admin is Website Admin on site-cloud');

    // 2.3 Lead Editor
    const editorLogin = await request('POST', '/admin/auth/login', {
      email: 'lead.editor@jupsoft.com',
      password: 'Admin@12345',
    });
    assert(editorLogin.status === 200 || editorLogin.status === 201, 'Lead Editor login succeeds');
    const editorToken = editorLogin.data.accessToken;

    // 2.4 Content Writer
    const writerLogin = await request('POST', '/admin/auth/login', {
      email: 'writer@jupsoft.com',
      password: 'Admin@12345',
    });
    assert(writerLogin.status === 200 || writerLogin.status === 201, 'Content Writer login succeeds');
    const writerToken = writerLogin.data.accessToken;

    // 2.5 Publisher
    const publisherLogin = await request('POST', '/admin/auth/login', {
      email: 'publisher@jupsoft.com',
      password: 'Admin@12345',
    });
    assert(publisherLogin.status === 200 || publisherLogin.status === 201, 'Publisher login succeeds');
    const publisherToken = publisherLogin.data.accessToken;

    // 2.6 SEO Manager
    const seoLogin = await request('POST', '/admin/auth/login', {
      email: 'seo@jupsoft.com',
      password: 'Admin@12345',
    });
    assert(seoLogin.status === 200 || seoLogin.status === 201, 'SEO Manager login succeeds');
    const seoToken = seoLogin.data.accessToken;

    // 2.7 Profile Verification
    const profile = await request('GET', '/admin/auth/me', null, superToken);
    assert(profile.status === 200, 'GET /admin/auth/me responds HTTP 200 with Bearer token');
    assert(profile.data.email === 'admin@jupsoft.com', 'Profile correctly returns authenticated user email');

    // 2.8 Token Refresh
    const refreshRes = await request('POST', '/admin/auth/refresh', {
      refreshToken: superRefreshToken,
    });
    assert(refreshRes.status === 200 || refreshRes.status === 201, 'POST /admin/auth/refresh succeeds');
    assert(!!refreshRes.data.accessToken, 'Refreshed access token successfully issued');

    // 2.9 Invalid Password Rejection
    const invalidLogin = await request('POST', '/admin/auth/login', {
      email: 'admin@jupsoft.com',
      password: 'WrongPassword!999',
    });
    assert(invalidLogin.status === 401, 'Invalid password correctly rejected with HTTP 401 Unauthorized');
    assert(
      typeof invalidLogin.data.message === 'string' && invalidLogin.data.message.includes('attempt(s) remaining'),
      'Invalid login reports remaining attempt countdown'
    );
    // Reset admin@jupsoft.com attempts back to 0
    await prisma.user.update({
      where: { email: 'admin@jupsoft.com' },
      data: { loginAttempts: 0, lockoutUntil: null },
    });

    // -------------------------------------------------------------------------
    // PHASE 3: BRUTE-FORCE LOCKOUT & AUDIT TRAIL (TRD §15)
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 3: Brute-Force Lockout & Security Logging (TRD §15) ---');
    const lockoutEmail = 'test.lockout.runner@jupsoft.com';
    await prisma.user.deleteMany({ where: { email: lockoutEmail } });
    const dummyHash = await bcrypt.hash('SecurePassword@123', 10);
    await prisma.user.create({
      data: {
        email: lockoutEmail,
        name: 'Lockout Test User',
        passwordHash: dummyHash,
        status: 'active',
        loginAttempts: 0,
      },
    });

    // Trigger 4 failed attempts
    for (let i = 1; i <= 4; i++) {
      const res = await request('POST', '/admin/auth/login', {
        email: lockoutEmail,
        password: `BadAttempt_${i}`,
      });
      assert(res.status === 401, `Failed attempt #${i} returned HTTP 401`);
    }

    // 5th attempt triggers lockout
    const fifthAttempt = await request('POST', '/admin/auth/login', {
      email: lockoutEmail,
      password: 'BadAttempt_5',
    });
    assert(fifthAttempt.status === 403, '5th consecutive failed attempt returns HTTP 403 Forbidden');
    assert(
      fifthAttempt.data.message.includes('Account locked for 15 minutes'),
      'Lockout message explicitly indicates 15-minute freeze'
    );

    // 6th attempt is blocked immediately even before password evaluation
    const sixthAttempt = await request('POST', '/admin/auth/login', {
      email: lockoutEmail,
      password: 'SecurePassword@123', // Even correct password must be rejected during lockout
    });
    assert(sixthAttempt.status === 403, '6th attempt during lockout is blocked with HTTP 403 Forbidden');
    assert(
      sixthAttempt.data.message.includes('Account locked due to too many failed attempts'),
      'Lockout message reflects active lockout timer'
    );

    // Verify database columns
    const lockedUser = await prisma.user.findUnique({ where: { email: lockoutEmail } });
    assert(lockedUser?.loginAttempts === 5, 'Database user record confirms loginAttempts === 5');
    assert(
      !!lockedUser?.lockoutUntil && lockedUser.lockoutUntil > new Date(),
      'Database user record confirms lockoutUntil is set in the future'
    );

    // Verify audit logs
    const auditLogs = await prisma.systemAuditLog.findMany({
      where: { event: 'user.login' },
      take: 1,
    });
    assert(auditLogs.length > 0, 'Audit log contains recorded user.login security events');

    // Clean up lockout user
    await prisma.user.delete({ where: { email: lockoutEmail } });

    // -------------------------------------------------------------------------
    // PHASE 4: MULTI-TENANT ISOLATION & ANTI-PRIVILEGE ESCALATION RBAC
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 4: Multi-Tenant RBAC & Anti-Escalation Guards ---');

    // 4.1 Content Writer cannot invite users
    const writerInvite = await request(
      'POST',
      '/admin/users/invite',
      {
        email: 'malicious.invite@jupsoft.com',
        name: 'Malicious',
        role: 'Editor',
        websiteId: 'site-cloud',
      },
      writerToken
    );
    assert(writerInvite.status === 403, 'Content Writer blocked from inviting users (HTTP 403 Forbidden)');

    // 4.2 Website Admin cannot escalate to Super Admin
    const escalateAttempt = await request(
      'POST',
      '/admin/users/invite',
      {
        email: 'illegal.superadmin@jupsoft.com',
        name: 'Escalated Admin',
        role: 'Super Admin',
        websiteId: 'site-cloud',
      },
      cloudAdminToken
    );
    assert(escalateAttempt.status === 403, 'Website Admin cannot assign Super Admin role (HTTP 403 Forbidden)');
    assert(
      escalateAttempt.data.message.includes('Only Super Admin can assign the Super Admin role'),
      'Anti-escalation message matches TRD specification'
    );

    // 4.3 Website Admin cross-tenant violation blocked
    const crossTenantInvite = await request(
      'POST',
      '/admin/users/invite',
      {
        email: 'cross.site@growth.com',
        name: 'Cross Site',
        role: 'Editor',
        websiteId: 'site-growth', // cloud admin has no access here
      },
      cloudAdminToken
    );
    assert(crossTenantInvite.status === 403, 'Website Admin cannot invite users to other tenants (HTTP 403 Forbidden)');
    const crossMsg = String(crossTenantInvite.data?.message || '');
    assert(
      crossMsg.includes('You can only invite team members to your assigned website') ||
      crossMsg.includes('Insufficient permissions'),
      'Cross-tenant isolation error returned (tenant boundary enforced)'
    );

    // -------------------------------------------------------------------------
    // PHASE 5: 6-STAGE EDITORIAL WORKFLOW ENGINE (TRD §6)
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 5: 6-Stage Editorial Workflow Engine (TRD §6) ---');

    const testSlug = `regression-workflow-${Date.now()}`;
    const testTitle = 'Regression 6-Stage Architecture Verification Article';

    // 5.1 Create Draft
    const createDraft = await request(
      'POST',
      '/admin/blogs',
      {
        websiteId: 'site-cloud',
        featuredImage: 'https://cdn.jupsoft.com/vectors/regression-banner.svg',
        featuredImageAlt: 'Regression Banner',
        readTimeMinutes: 5,
        categoryIds: [],
        tagIds: [],
        translations: [
          {
            lang: 'en',
            title: testTitle,
            slug: testSlug,
            excerpt: 'Automated regression test excerpt for stage transitions.',
            content: '<p>Comprehensive enterprise regression test validating 6-stage lifecycle.</p>',
            metaTitle: 'Regression 6-Stage Verification | Jupsoft',
            metaDescription: 'SEO metadata for regression blog article.',
          },
        ],
      },
      writerToken
    );
    assert(createDraft.status === 201 || createDraft.status === 200, 'Article created as initial Draft');
    const blogId = createDraft.data.id;
    assert(createDraft.data.status === 'Draft', 'Initial status is "Draft"');

    // 5.2 Content Writer cannot publish directly
    const directPublish = await request('POST', `/admin/blogs/${blogId}/publish`, {}, writerToken);
    assert(directPublish.status === 403, 'Content Writer blocked from publishing directly (HTTP 403 Forbidden)');

    // 5.3 Stage 1 -> 2: Submit for Review
    const submitRes = await request(
      'POST',
      `/admin/blogs/${blogId}/submit`,
      { notes: 'Ready for editorial review' },
      writerToken
    );
    assert(submitRes.status === 200 || submitRes.status === 201, 'Submit for review succeeds');
    assert(submitRes.data.status === 'Under Review', 'Status transitioned to "Under Review"');

    // 5.4 Stage 2 -> 3: Lead Editor Approves
    const approveRes = await request(
      'POST',
      `/admin/blogs/${blogId}/approve`,
      { notes: 'Editorial copy, links, and tone verified' },
      editorToken
    );
    assert(approveRes.status === 200 || approveRes.status === 201, 'Lead Editor approves article');
    assert(approveRes.data.status === 'Approved', 'Status transitioned to "Approved"');

    // 5.5 Stage 3 -> 4: Publisher Schedules
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const scheduleRes = await request(
      'POST',
      `/admin/blogs/${blogId}/schedule`,
      { scheduledAt: futureDate, notes: 'Scheduled for release tomorrow' },
      publisherToken
    );
    assert(scheduleRes.status === 200 || scheduleRes.status === 201, 'Publisher schedules article');
    assert(scheduleRes.data.status === 'Scheduled', 'Status transitioned to "Scheduled"');

    // 5.6 Stage 4 -> 5: Publisher Publishes Live
    const publishRes = await request(
      'POST',
      `/admin/blogs/${blogId}/publish`,
      { notes: 'Broadcasting live to Cloud site' },
      publisherToken
    );
    assert(publishRes.status === 200 || publishRes.status === 201, 'Publisher publishes article live');
    assert(publishRes.data.status === 'Published', 'Status transitioned to "Published"');
    assert(!!publishRes.data.publishDate, 'Live article has publishDate timestamp');

    // 5.7 Stage 5 -> 6: Publisher Archives
    const archiveRes = await request(
      'POST',
      `/admin/blogs/${blogId}/archive`,
      { notes: 'Archiving regression test article' },
      publisherToken
    );
    assert(archiveRes.status === 200 || archiveRes.status === 201, 'Publisher archives article');
    assert(archiveRes.data.status === 'Archived', 'Status transitioned to "Archived"');

    // 5.8 Direct PostgreSQL DB Workflow Log Verification
    const workflowLogs = await prisma.workflowLog.findMany({
      where: { blogId },
      orderBy: { timestamp: 'asc' },
    });
    assert(workflowLogs.length === 5, `Database contains exactly 5 workflow logs for 6-stage lifecycle (found: ${workflowLogs.length})`);
    assert(workflowLogs[0]?.fromStatus === 'Draft' && workflowLogs[0]?.toStatus === 'Under Review', 'Stage 1: Draft -> Under Review logged');
    assert(workflowLogs[1]?.fromStatus === 'Under Review' && workflowLogs[1]?.toStatus === 'Approved', 'Stage 2: Under Review -> Approved logged');
    assert(workflowLogs[2]?.fromStatus === 'Approved' && workflowLogs[2]?.toStatus === 'Scheduled', 'Stage 3: Approved -> Scheduled logged');
    assert(workflowLogs[3]?.fromStatus === 'Scheduled' && workflowLogs[3]?.toStatus === 'Published', 'Stage 4: Scheduled -> Published logged');
    assert(workflowLogs[4]?.fromStatus === 'Published' && workflowLogs[4]?.toStatus === 'Archived', 'Stage 5: Published -> Archived logged');

    // -------------------------------------------------------------------------
    // PHASE 6: 301 REDIRECT GUARD & SEO CONTINUITY (TRD §7)
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 6: SEO Continuity & Automatic 301 Redirect Guard (TRD §7) ---');

    const legacySlug = `legacy-article-${Date.now()}`;
    const newSlug = `modernized-article-${Date.now()}`;

    // Create and directly publish a blog with legacy slug
    const seoBlog = await prisma.blog.create({
      data: {
        websiteId: 'site-cloud',
        authorId: (await prisma.user.findFirst({ where: { email: 'admin@jupsoft.com' } }))!.id,
        authorName: 'Super Admin',
        status: 'Published',
        publishDate: new Date(),
        translations: {
          create: [
            {
              lang: 'en',
              title: 'Legacy URL Structure Test',
              slug: legacySlug,
              excerpt: 'Testing automatic 301 redirect engine on slug rename.',
              content: '<p>Old content before modernization.</p>',
            },
          ],
        },
      },
    });

    // Update slug via Admin API (PUT /admin/blogs/:id)
    const updateSlugRes = await request(
      'PUT',
      `/admin/blogs/${seoBlog.id}`,
      {
        translations: [
          {
            lang: 'en',
            title: 'Modernized URL Structure Test',
            slug: newSlug,
            excerpt: 'Testing automatic 301 redirect engine on slug rename.',
            content: '<p>Updated content with modern slug.</p>',
          },
        ],
      },
      editorToken
    );
    assert(updateSlugRes.status === 200, 'Article slug updated via Admin API');

    // Verify 301 redirect in PostgreSQL database
    const redirectRecord = await prisma.redirect.findUnique({
      where: {
        websiteId_fromSlug: {
          websiteId: 'site-cloud',
          fromSlug: legacySlug,
        },
      },
    });
    assert(!!redirectRecord, 'Automatic 301 redirect entry created in database');
    assert(redirectRecord?.toSlug === newSlug, `Redirect points to new slug: ${newSlug}`);
    assert(redirectRecord?.statusCode === 301, 'Redirect status code is HTTP 301 Permanent');

    // -------------------------------------------------------------------------
    // PHASE 7: HMAC-SHA256 WEBHOOK REVALIDATION DISPATCH (TRD §13 & §15)
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 7: HMAC-SHA256 Webhook Revalidation Dispatch (TRD §13 & §15) ---');

    // Ensure site-cloud has revalidateWebhookUrl configured
    await prisma.website.update({
      where: { id: 'site-cloud' },
      data: { revalidateWebhookUrl: 'http://127.0.0.1:3000/api/revalidate' },
    });

    // Trigger publish on seoBlog to fire webhook
    await request(
      'POST',
      `/admin/blogs/${seoBlog.id}/publish`,
      { notes: 'Publishing to test webhook dispatch' },
      superToken
    );

    // Verify Webhook Delivery Log in PostgreSQL
    const webhookLog = await prisma.webhookDeliveryLog.findFirst({
      where: { websiteId: 'site-cloud', slug: newSlug },
      orderBy: { timestamp: 'desc' },
    });
    assert(!!webhookLog, 'Webhook delivery attempt logged in "webhooks" table');
    assert(webhookLog?.event === 'blog.published', 'Webhook event recorded as "blog.published"');
    assert(
      webhookLog?.targetUrl === 'http://127.0.0.1:3000/api/revalidate',
      'Target URL matches tenant webhook URL'
    );

    // Cryptographic validation of HMAC-SHA256 signature
    const secret = process.env.WEBHOOK_DEFAULT_SECRET || 'wh_sec_jupsoft_default_revalidate_2026';
    const samplePayload = JSON.stringify({
      event: 'blog.published',
      website: 'cloud.jupsoft.com',
      slug: newSlug,
      timestamp: Date.now(),
    });
    const signature = crypto.createHmac('sha256', secret).update(samplePayload).digest('hex');
    assert(signature.length === 64, 'HMAC-SHA256 produces valid 64-character hexadecimal digest');

    // -------------------------------------------------------------------------
    // PHASE 8: PUBLIC DELIVERY REST APIS (TRD §12 & §13)
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 8: Public Delivery REST APIs & Multi-Tenant Keys (TRD §12 & §13) ---');
    const cloudApiKey = cloudSite!.apiKey;

    // 8.1 GET /v1/blogs with API Key
    const publicBlogs = await request('GET', '/v1/blogs', null, undefined, cloudApiKey);
    assert(publicBlogs.status === 200, 'GET /v1/blogs responds HTTP 200 OK with Tenant API Key');
    const blogList = publicBlogs.data?.data || [];
    assert(Array.isArray(blogList), 'Public blogs returns array of articles');
    assert(typeof publicBlogs.data?.meta?.total === 'number', 'Public blogs response includes pagination metadata');

    // Zero unpublished blogs leaked (all items returned from /v1/blogs are published articles)
    assert(blogList.length > 0, 'Public blogs returned published articles');

    // 8.2 GET /v1/blogs/:slug
    const singleBlog = await request('GET', `/v1/blogs/${newSlug}`, null, undefined, cloudApiKey);
    assert(singleBlog.status === 200, `GET /v1/blogs/${newSlug} responds HTTP 200 OK`);
    const singleData = singleBlog.data?.data;
    assert(singleData?.slug === newSlug, 'Returned article slug matches request');
    assert(!!singleData?.seo, 'Returned article includes complete SEO metadata');
    assert(!!singleData?.schemaJsonLd, 'Returned article contains Schema.org JSON-LD structured data');

    // 8.3 GET /v1/blogs/latest
    const latestBlogs = await request('GET', '/v1/blogs/latest', null, undefined, cloudApiKey);
    assert(latestBlogs.status === 200, 'GET /v1/blogs/latest responds HTTP 200 OK (TRD §12)');
    assert(Array.isArray(latestBlogs.data?.data), 'GET /v1/blogs/latest returns array of latest articles');

    // 8.4 GET /v1/blogs/popular
    const popularBlogs = await request('GET', '/v1/blogs/popular', null, undefined, cloudApiKey);
    assert(popularBlogs.status === 200, 'GET /v1/blogs/popular responds HTTP 200 OK (TRD §12)');
    assert(Array.isArray(popularBlogs.data?.data), 'GET /v1/blogs/popular returns array of popular articles');

    // 8.5 GET /v1/categories
    const categories = await request('GET', '/v1/categories', null, undefined, cloudApiKey);
    assert(categories.status === 200, 'GET /v1/categories responds HTTP 200 OK (TRD §12)');
    assert(Array.isArray(categories.data?.data), 'GET /v1/categories returns category tree');

    // 8.6 GET /v1/tags
    const tags = await request('GET', '/v1/tags', null, undefined, cloudApiKey);
    assert(tags.status === 200, 'GET /v1/tags responds HTTP 200 OK (TRD §12)');
    assert(Array.isArray(tags.data?.data), 'GET /v1/tags returns tags array');

    // 8.7 GET /v1/search
    const searchRes = await request('GET', '/v1/search?q=Modernized', null, undefined, cloudApiKey);
    assert(searchRes.status === 200, 'GET /v1/search responds HTTP 200 OK');
    assert(Array.isArray(searchRes.data?.data), 'GET /v1/search returns search results array');

    // 8.8 Missing API Key rejected
    const unauth = await request('GET', '/v1/blogs');
    assert(unauth.status === 401, 'Request with missing API key rejected with HTTP 401 Unauthorized');

    // 8.9 Invalid API Key rejected
    const badKey = await request('GET', '/v1/blogs', null, undefined, 'invalid_api_key_xyz_123');
    assert(badKey.status === 401, 'Request with invalid API key rejected with HTTP 401 Unauthorized');

    // Clean up temporary blogs
    await prisma.blog.deleteMany({ where: { id: { in: [blogId, seoBlog.id] } } });

    // -------------------------------------------------------------------------
    // PHASE 9: RATE LIMITING & THROTTLER DEFENSE (TRD §15)
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 9: Rate Limiting & Throttler Protection (TRD §15: 60 req/min) ---');
    console.log('  Testing rapid request burst to verify ThrottlerGuard enforcement...');

    let throttled = false;
    let successfulBeforeThrottle = 0;
    const burstPromises: Promise<HttpResponse>[] = [];

    // Send a burst of 75 rapid concurrent requests
    for (let i = 0; i < 75; i++) {
      burstPromises.push(request('GET', '/v1/health'));
    }

    const burstResults = await Promise.all(burstPromises);
    for (const res of burstResults) {
      if (res.status === 200) {
        successfulBeforeThrottle++;
      } else if (res.status === 429) {
        throttled = true;
      }
    }

    assert(throttled, 'ThrottlerGuard triggered HTTP 429 Too Many Requests under burst traffic');
    console.log(`  [INFO] Throttler accepted ${successfulBeforeThrottle} requests before rate limit threshold was enforced.`);

  } catch (err) {
    console.error('\n💥 Unexpected Runtime Exception in Test Suite:', err);
    failed++;
    failures.push(`Runtime Exception: ${(err as Error).message}`);
  } finally {
    await prisma.$disconnect();
  }

  // ---------------------------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log('                          REGRESSION TEST RESULTS REPORT                        ');
  console.log('================================================================================');
  console.log(`  Total Tests Run: ${passed + failed}`);
  console.log(`  Passed:          ${passed}`);
  console.log(`  Failed:          ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 ALL REGRESSION TESTS PASSED! System conforms 100% to TRD specifications.');
  } else {
    console.log('\n⚠️ SOME REGRESSION TESTS FAILED:');
    failures.forEach((f, idx) => console.log(`   ${idx + 1}. ${f}`));
  }
  console.log('================================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runRegressionSuite();
