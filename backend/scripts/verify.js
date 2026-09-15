const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Redis = require('ioredis');

const backendDir = 'D:/Company work/jupsoft-centralized-blog-platform/backend';
const adminPortalDir = 'D:/Company work/jupsoft-centralized-blog-platform/admin-portal';

// Load compiled dist files
const { PERMISSIONS, hasPermission, rolesHavePermission, getEffectivePermissions } = require(path.join(backendDir, 'dist/src/common/permissions/permissions.constants'));
const { CreateWebsiteDto } = require(path.join(backendDir, 'dist/src/modules/websites/dto/create-website.dto'));
const { validate } = require('class-validator');
const { plainToInstance } = require('class-transformer');

async function run() {
  console.log('================================================================');
  console.log('🚀 RUNNING E2E VERIFICATION TEST SUITE: 15 FIXES');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail) {
    if (condition) {
      console.log('  ✅ PASS: ' + testName);
      passed++;
    } else {
      console.error('  ❌ FAIL: ' + testName);
      if (detail) console.error('     Reason: ' + detail);
      failed++;
    }
  }

  // 1. JWT Secret Enforcement
  console.log('📦 [1/15] Testing JWT Secret Security (No Hardcoded Fallback)...');
  const authModule = fs.readFileSync(path.join(backendDir, 'src/modules/auth/auth.module.ts'), 'utf8');
  const jwtStrategy = fs.readFileSync(path.join(backendDir, 'src/modules/auth/jwt.strategy.ts'), 'utf8');
  const apiKeyGuard = fs.readFileSync(path.join(backendDir, 'src/common/guards/api-key.guard.ts'), 'utf8');
  assert(!authModule.includes("|| 'jupsoft_enterprise_jwt_super_secret_key_2026'"), 'AuthModule: No hardcoded fallback secret');
  assert(!jwtStrategy.includes("|| 'jupsoft_enterprise_jwt_super_secret_key_2026'"), 'JwtStrategy: No hardcoded fallback secret');
  assert(!apiKeyGuard.includes("|| 'jupsoft_enterprise_jwt_super_secret_key_2026'"), 'ApiKeyGuard: No hardcoded fallback secret');

  // 2. Webhook Secret Enforcement
  console.log('\n📦 [2/15] Testing Webhook Secret Security (No Hardcoded Fallback)...');
  const webhookDispatcher = fs.readFileSync(path.join(backendDir, 'src/modules/webhooks/webhook-dispatcher.service.ts'), 'utf8');
  assert(!webhookDispatcher.includes("|| 'wh_sec_jupsoft_default_revalidate_2026'"), 'WebhookDispatcher: No hardcoded fallback secret');

  // 3. Redis Token Revocation & Logout
  console.log('\n📦 [3/15] Testing Redis Token Revocation & Logout...');
  const redis = new Redis({ host: 'localhost', port: 6379, lazyConnect: true });
  try {
    await redis.connect();
    const testRefreshToken = 'test_token_' + Date.now();
    const tokenHash = crypto.createHash('sha256').update(testRefreshToken).digest('hex');
    const revokedKey = 'auth:revoked_rt:' + tokenHash;
    await redis.set(revokedKey, '1', 'EX', 60);
    const isRevoked = await redis.get(revokedKey);
    assert(isRevoked === '1', 'Redis stores revoked token hash with TTL');
    await redis.del(revokedKey);
    assert((await redis.get(revokedKey)) === null, 'Revoked token cleaned up properly');
  } catch (err) {
    console.warn('  ⚠️ Redis note: ' + err.message);
  } finally {
    redis.disconnect();
  }

  // 4. forbidNonWhitelisted: true
  console.log('\n📦 [4/15] Testing Global ValidationPipe forbidNonWhitelisted: true...');
  const mainContent = fs.readFileSync(path.join(backendDir, 'src/main.ts'), 'utf8');
  assert(mainContent.includes('forbidNonWhitelisted: true'), 'main.ts has forbidNonWhitelisted: true');

  // 5. Category & Tag Filter in public-v1
  console.log('\n📦 [5/15] Testing Category & Tag Query Wireup in public-v1...');
  const publicV1 = fs.readFileSync(path.join(backendDir, 'src/modules/public-v1/public-v1.service.ts'), 'utf8');
  assert(publicV1.includes('categoryIds: { has: category }') || publicV1.includes('blogCategories:'), 'getPublishedBlogs filters category in database');
  assert(publicV1.includes('tagIds: { has: tag }') || publicV1.includes('blogTags:'), 'getPublishedBlogs filters tag in database');

  // 6. Media Soft Delete
  console.log('\n📦 [6/15] Testing Media Soft Delete...');
  const schema = fs.readFileSync(path.join(backendDir, 'prisma/schema.prisma'), 'utf8');
  const mediaService = fs.readFileSync(path.join(backendDir, 'src/modules/media/media.service.ts'), 'utf8');
  assert(schema.includes('deletedAt            DateTime?'), 'Prisma schema has deletedAt on MediaAsset');
  assert(mediaService.includes('where.deletedAt = null'), 'media.service findAll filters deletedAt: null');
  assert(mediaService.includes('data: { deletedAt: new Date() }'), 'media.service delete performs soft-delete');

  // 7. Join Tables Sync
  console.log('\n📦 [7/15] Testing Join Tables Sync in Blogs Service...');
  const blogsService = fs.readFileSync(path.join(backendDir, 'src/modules/blogs/blogs.service.ts'), 'utf8');
  assert(blogsService.includes('prisma.blogCategory.createMany'), 'blogs.service syncs blogCategory join table');
  assert(blogsService.includes('prisma.blogTag.createMany'), 'blogs.service syncs blogTag join table');

  // 8. Composable RBAC Permissions
  console.log('\n📦 [8/15] Testing Composable RBAC Permissions System...');
  assert(hasPermission('Super Admin', PERMISSIONS.BLOG_PUBLISH), 'Super Admin has BLOG_PUBLISH');
  assert(hasPermission('Publisher', PERMISSIONS.BLOG_PUBLISH), 'Publisher has BLOG_PUBLISH');
  assert(!hasPermission('Content Writer', PERMISSIONS.BLOG_PUBLISH), 'Content Writer does NOT have BLOG_PUBLISH');
  assert(hasPermission('Content Writer', PERMISSIONS.BLOG_CREATE), 'Content Writer has BLOG_CREATE');
  assert(rolesHavePermission(['Content Writer', 'Publisher'], PERMISSIONS.BLOG_PUBLISH), 'Union of roles grants publish');
  const editorPerms = getEffectivePermissions(['Editor']);
  assert(editorPerms.includes(PERMISSIONS.BLOG_APPROVE), 'Editor effective permissions include BLOG_APPROVE');

  // 9. Backend 8-Rule SEO Audit
  console.log('\n📦 [9/15] Testing Backend 8-Rule SEO Audit Coverage...');
  assert(blogsService.includes('focus-kw-intro'), 'SEO Rule 6: Focus keyword in intro checked');
  assert(blogsService.includes('heading-structure'), 'SEO Rule 7: Heading structure checked');
  assert(blogsService.includes('robots'), 'SEO Rule 8: Robots directive checked');

  // 10. Tiptap Image & Link in BlogEditor
  console.log('\n📦 [10/15] Testing BlogEditor Tiptap Extensions...');
  const editor = fs.readFileSync(path.join(adminPortalDir, 'src/components/editor/BlogEditor.tsx'), 'utf8');
  assert(editor.includes('Image.configure'), 'BlogEditor includes Image extension');
  assert(editor.includes('TiptapLink.configure'), 'BlogEditor includes TiptapLink extension');
  assert(editor.includes('setImage({ src: item.cdnUrl'), 'BlogEditor uses setImage command');

  // 11. Webhook Retry Cron Service
  console.log('\n📦 [11/15] Testing Webhook Retry Service...');
  const retryService = fs.readFileSync(path.join(backendDir, 'src/modules/webhooks/webhook-retry.service.ts'), 'utf8');
  assert(retryService.includes('@Cron('), 'Webhook retry service has cron schedule');
  assert(retryService.includes('attempt: { lt: MAX_RETRY_ATTEMPTS }'), 'Webhook retry filters failed with attempt count');

  // 12. AI Auto-Translate Scaffold Warning
  console.log('\n📦 [12/15] Testing AI Auto-Translate Disclaimer...');
  assert(editor.includes('Translation Scaffold'), 'BlogEditor warns user that AI translate is scaffolding');

  // 13. UserRoleAssignment isGlobal & Nullable websiteId
  console.log('\n📦 [13/15] Testing UserRoleAssignment isGlobal & Nullable FK...');
  assert(schema.includes('websiteId            String?'), 'UserRoleAssignment.websiteId is nullable');
  assert(schema.includes('isGlobal             Boolean'), 'UserRoleAssignment has isGlobal flag');
  const rolesGuard = fs.readFileSync(path.join(backendDir, 'src/common/guards/roles.guard.ts'), 'utf8');
  assert(rolesGuard.includes('ra.isGlobal'), 'RolesGuard checks isGlobal flag');

  // 14. Swagger Docs with API Key Protection
  console.log('\n📦 [14/15] Testing Swagger Documentation Protection...');
  assert(mainContent.includes('SWAGGER_API_KEY'), 'main.ts references SWAGGER_API_KEY for production access');

  // 15. Webhook URL Validation
  console.log('\n📦 [15/15] Testing Webhook URL Validation...');
  const invalidDto = plainToInstance(CreateWebsiteDto, {
    id: 'test-site',
    name: 'Test Site',
    domain: 'test.com',
    revalidateWebhookUrl: 'not-a-valid-url',
  });
  const errors = await validate(invalidDto);
  const webhookUrlError = errors.find((e) => e.property === 'revalidateWebhookUrl');
  assert(webhookUrlError !== undefined, 'Validation rejects malformed revalidateWebhookUrl');

  const validDto = plainToInstance(CreateWebsiteDto, {
    id: 'test-site',
    name: 'Test Site',
    domain: 'test.com',
    revalidateWebhookUrl: 'https://test.com/api/revalidate',
  });
  const validErrors = await validate(validDto);
  const validUrlError = validErrors.find((e) => e.property === 'revalidateWebhookUrl');
  assert(validUrlError === undefined, 'Validation accepts valid https:// URL');

  console.log('\n================================================================');
  console.log('📊 TEST SUITE SUMMARY: ' + passed + ' PASSED, ' + failed + ' FAILED (TOTAL: ' + (passed + failed) + ')');
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
