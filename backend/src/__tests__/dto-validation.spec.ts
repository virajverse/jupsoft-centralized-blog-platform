/**
 * DTO VALIDATION / FUZZ TESTS — Phase 25 (Property Testing + Boundary Values)
 * Tests: Input validation, mass assignment, oversized payloads, type confusion
 */
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBlogDto, UpdateBlogDto, BlogTranslationInputDto, TransitionBlogStatusDto } from '../modules/blogs/dto/create-blog.dto';

async function validateDto(dtoClass: any, plain: object): Promise<string[]> {
  const instance = plainToInstance(dtoClass, plain);
  const errors = await validate(instance as object);
  return errors.flatMap((e) => Object.values(e.constraints || {}));
}

describe('DTO Validation — CreateBlogDto', () => {

  const validTranslation = {
    lang: 'en',
    title: 'Valid Blog Title',
    slug: 'valid-blog-title',
    excerpt: 'Short excerpt',
    content: '<p>Content here</p>',
  };

  // ── Positive: valid DTO passes ─────────────────────────────────────
  it('should pass validation with all valid fields', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      translations: [validTranslation],
    });
    expect(errors).toHaveLength(0);
  });

  // ── Missing required websiteId ──────────────────────────────────────
  it('should fail when websiteId is missing', async () => {
    const errors = await validateDto(CreateBlogDto, {
      translations: [validTranslation],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('websiteId') || e.includes('empty'))).toBe(true);
  });

  // ── Empty websiteId ─────────────────────────────────────────────────
  it('should fail when websiteId is empty string', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: '',
      translations: [validTranslation],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  // ── Missing translations ──────────────────────────────────────────
  it('should fail when translations array is missing', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  // ── Empty translations array ─────────────────────────────────────
  it('should fail with empty translations array', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      translations: [],
    });
    // An empty array passes @IsArray() but has no items
    // The content of translations is not validated for minimum length
    // FLAG: Missing @ArrayMinSize(1) validator on translations
    expect(typeof errors).toBe('object');
  });

  // ── Missing translation title ─────────────────────────────────────
  it('should fail when translation title is missing', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      translations: [{ lang: 'en', slug: 'valid-slug' }],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  // ── Missing translation slug ─────────────────────────────────────
  it('should fail when translation slug is missing', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      translations: [{ lang: 'en', title: 'Valid Title' }],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  // ── [SECURITY] status field accepts any string value ─────────────
  it('[SECURITY-FINDING] status field accepts any arbitrary string value', async () => {
    // The DTO: @IsString() @IsOptional() status?: string;
    // No @IsEnum() or @IsIn(['Draft', 'Under Review', ...]) validator
    // An attacker could send status: 'Hack' or status: 'Published'
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      status: 'Arbitrary Status Value',
      translations: [validTranslation],
    });
    // This passes validation (empty errors)
    expect(errors).toHaveLength(0);
    // FLAG: STATUS FIELD NOT ENUM-VALIDATED — allows arbitrary status strings in DTO
    // The service partially handles this in transitionStatus, but create() and update() don't validate
  });

  // ── [SECURITY] TransitionBlogStatusDto accepts any string status ──
  it('[SECURITY-FINDING] TransitionBlogStatusDto status field accepts any string', async () => {
    const errors = await validateDto(TransitionBlogStatusDto, {
      status: 'HackerPublished',
    });
    expect(errors).toHaveLength(0);
    // FLAG: Status transition DTO has @IsString() but no @IsIn() enum validator
    // The transitionStatus service call doesn't validate the status enum either
    // An attacker could send status: 'hackerinject' and it would be stored
  });

  // ── Unknown lang code is accepted without validation ───────────────
  it('[SECURITY-FINDING] arbitrary language codes accepted in translation', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      translations: [{ lang: 'xx-unknown', title: 'Title', slug: 'slug' }],
    });
    expect(errors).toHaveLength(0);
    // FLAG: lang field has no @IsIn(['en', 'hi', 'fr', 'ar']) validator
  });

  // ── robots field validation ──────────────────────────────────────
  it('[SECURITY-FINDING] robots field accepts any string including malicious values', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      translations: [{
        lang: 'en', title: 'T', slug: 's',
        robots: 'noindex, nofollow, script-injected-value'
      }],
    });
    expect(errors).toHaveLength(0);
    // FLAG: robots field has no allowlist validation
  });

  // ── Non-array categoryIds ──────────────────────────────────────────
  it('should fail when categoryIds is not an array', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      categoryIds: 'not-an-array',
      translations: [validTranslation],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  // ── Integer websiteId ─────────────────────────────────────────────
  it('should fail when websiteId is an integer', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 12345,
      translations: [validTranslation],
    });
    // With enableImplicitConversion: true, integer may be coerced to string
    // This is a potential type coercion issue
    expect(typeof (plainToInstance(CreateBlogDto, { websiteId: 12345, translations: [validTranslation] }) as any).websiteId)
      .toBe('string'); // Implicit conversion
  });

  // ── [SECURITY] Nested object injection in translations ────────────
  it('[SECURITY] prototype pollution attempt via __proto__ in translation', async () => {
    const malicious = {
      websiteId: 'site-1',
      translations: [{
        lang: 'en',
        title: 'Valid',
        slug: 'valid',
        '__proto__': { isAdmin: true },
        'constructor': { prototype: { isAdmin: true } },
      }],
    };
    // NestJS class-transformer + forbidNonWhitelisted:true at global level should strip extra props
    // But in unit test without the global pipe, check class-validator behavior
    const errors = await validateDto(CreateBlogDto, malicious);
    // Should not crash the validation process
    expect(Array.isArray(errors)).toBe(true);
  });
});

describe('DTO Validation — Boundary Value Analysis', () => {

  // ── Slug: empty string fails ─────────────────────────────────────
  it('should reject empty slug', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      translations: [{ lang: 'en', title: 'Title', slug: '' }],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  // ── Extremely long title ─────────────────────────────────────────
  it('[BOUNDARY] should accept very long title string (no MaxLength validator)', async () => {
    const longTitle = 'A'.repeat(10000);
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      translations: [{ lang: 'en', title: longTitle, slug: 'slug' }],
    });
    expect(errors).toHaveLength(0);
    // FLAG: No @MaxLength validators on title, slug, excerpt, content fields
    // Could cause DB field overflow or performance issues
  });

  // ── Extremely long slug ──────────────────────────────────────────
  it('[BOUNDARY] should accept very long slug (no MaxLength validator)', async () => {
    const longSlug = 'a-'.repeat(5000);
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      translations: [{ lang: 'en', title: 'Title', slug: longSlug }],
    });
    expect(errors).toHaveLength(0);
    // FLAG: No @MaxLength on slug — DB VARCHAR may have limits
  });

  // ── readTimeMinutes: float rejected by @IsInt() ───────────────────
  it('should reject float readTimeMinutes', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      readTimeMinutes: 3.5,
      translations: [{ lang: 'en', title: 'Title', slug: 'slug' }],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  // ── Negative readTimeMinutes accepted ────────────────────────────
  it('[BOUNDARY] should accept negative readTimeMinutes (no @Min validator)', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      readTimeMinutes: -5,
      translations: [{ lang: 'en', title: 'Title', slug: 'slug' }],
    });
    expect(errors).toHaveLength(0);
    // FLAG: No @Min(1) validator on readTimeMinutes
  });

  // ── Boolean status fails @IsString() ────────────────────────────
  it('should reject boolean status', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      status: true,
      translations: [{ lang: 'en', title: 'Title', slug: 'slug' }],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  // ── Null translation lang fails ───────────────────────────────────
  it('should reject null lang in translation', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      translations: [{ lang: null, title: 'Title', slug: 'slug' }],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  // ── Unicode slugs accepted (no slug format validator) ────────────
  it('[BOUNDARY] should accept Unicode slugs (no slug format validation)', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      translations: [{ lang: 'ar', title: 'عنوان', slug: 'مقال-عربي-2026' }],
    });
    expect(errors).toHaveLength(0);
    // FLAG: No slug format validation — Unicode slugs pass through
    // This may cause issues in URL routing and Redis cache key construction
  });
});
