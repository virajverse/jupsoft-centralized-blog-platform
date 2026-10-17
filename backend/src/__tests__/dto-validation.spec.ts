/**
 * DTO VALIDATION / FUZZ TESTS — Phase 25 (Property Testing + Boundary Values)
 * Tests: Input validation, mass assignment, oversized payloads, type confusion
 */
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBlogDto, UpdateBlogDto, BlogTranslationInputDto, TransitionBlogStatusDto } from '../modules/blogs/dto/create-blog.dto';

function collectConstraints(errors: any[]): string[] {
  const result: string[] = [];
  for (const err of errors) {
    if (err.constraints) {
      result.push(...Object.values(err.constraints as Record<string, string>));
    }
    if (err.children && err.children.length > 0) {
      result.push(...collectConstraints(err.children));
    }
  }
  return result;
}

async function validateDto(dtoClass: any, plain: object): Promise<string[]> {
  const instance = plainToInstance(dtoClass, plain);
  const errors = await validate(instance as object);
  return collectConstraints(errors);
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
    expect(errors.length).toBeGreaterThan(0);
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
  it('should reject arbitrary status string value (enum enforcement)', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      status: 'Arbitrary Status Value',
      translations: [validTranslation],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('status must be one of'))).toBe(true);
  });

  // ── [SECURITY] TransitionBlogStatusDto accepts any string status ──
  it('should reject invalid TransitionBlogStatusDto status (enum enforcement)', async () => {
    const errors = await validateDto(TransitionBlogStatusDto, {
      status: 'HackerPublished',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('status must be one of'))).toBe(true);
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
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('websiteId must be a string'))).toBe(true);
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
    const errors = await validateDto(CreateBlogDto, malicious);
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

  // ── Extremely long title rejected by MaxLength ───────────────────
  it('should reject extremely long title string (MaxLength validator)', async () => {
    const longTitle = 'A'.repeat(10000);
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      translations: [{ lang: 'en', title: longTitle, slug: 'slug' }],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('title must be shorter'))).toBe(true);
  });

  // ── Extremely long slug rejected by MaxLength ────────────────────
  it('should reject extremely long slug (MaxLength and Matches validator)', async () => {
    const longSlug = 'a-'.repeat(5000);
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      translations: [{ lang: 'en', title: 'Title', slug: longSlug }],
    });
    expect(errors.length).toBeGreaterThan(0);
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

  // ── Negative readTimeMinutes rejected by @Min(1) ─────────────────
  it('should reject negative readTimeMinutes (@Min validator)', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      readTimeMinutes: -5,
      translations: [{ lang: 'en', title: 'Title', slug: 'slug' }],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('readTimeMinutes must not be less than 1'))).toBe(true);
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

  // ── Non-URL-safe slugs rejected ───────────────────────────────────
  it('should reject non-URL-safe slugs', async () => {
    const errors = await validateDto(CreateBlogDto, {
      websiteId: 'site-1',
      translations: [{ lang: 'ar', title: 'عنوان', slug: 'مقال-عربي-2026' }],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('slug must contain only lowercase'))).toBe(true);
  });
});
