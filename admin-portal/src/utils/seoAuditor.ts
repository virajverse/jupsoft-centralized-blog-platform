import { SEOScoreResult, SEOCheckItem, BlogSEO } from '../types';

export function analyzeSEO(params: {
  title: string;
  slug: string;
  content: string;
  seo: Partial<BlogSEO>;
  featuredImage?: string;
  featuredImageAlt?: string;
}): SEOScoreResult {
  const { title, slug, content, seo, featuredImage, featuredImageAlt } = params;
  const checks: SEOCheckItem[] = [];

  const focusKeyword = (seo.focusKeyword || '').trim().toLowerCase();
  const metaTitle = (seo.metaTitle || title || '').trim();
  const metaDescription = (seo.metaDescription || '').trim();
  const canonicalUrl = (seo.canonicalUrl || '').trim();

  // Strip HTML to get plain text
  const plainContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const firstParagraph = content.match(/<p>(.*?)<\/p>/i)?.[1]?.replace(/<[^>]*>/g, '').toLowerCase() || '';

  // 1. Meta Title Length (50-60 chars) - 20 points
  const titleLen = metaTitle.length;
  if (titleLen >= 50 && titleLen <= 60) {
    checks.push({
      id: 'meta-title-length',
      label: 'Meta Title Length',
      status: 'pass',
      message: `Optimal length (${titleLen} chars). Recommended: 50–60 characters.`,
      scoreImpact: 20,
    });
  } else if ((titleLen >= 40 && titleLen < 50) || (titleLen > 60 && titleLen <= 70)) {
    checks.push({
      id: 'meta-title-length',
      label: 'Meta Title Length',
      status: 'warning',
      message: `Acceptable but not optimal (${titleLen} chars). Ideal range is 50–60 characters.`,
      scoreImpact: 12,
    });
  } else {
    checks.push({
      id: 'meta-title-length',
      label: 'Meta Title Length',
      status: 'fail',
      message: `Title is ${titleLen === 0 ? 'missing' : `${titleLen} chars (too ${titleLen < 40 ? 'short' : 'long'})`}. Keep between 50–60.`,
      scoreImpact: 0,
    });
  }

  // 2. Meta Description Length (140-160 chars) - 20 points
  const descLen = metaDescription.length;
  if (descLen >= 140 && descLen <= 160) {
    checks.push({
      id: 'meta-desc-length',
      label: 'Meta Description Length',
      status: 'pass',
      message: `Optimal length (${descLen} chars). Search snippets won't be truncated.`,
      scoreImpact: 20,
    });
  } else if ((descLen >= 110 && descLen < 140) || (descLen > 160 && descLen <= 180)) {
    checks.push({
      id: 'meta-desc-length',
      label: 'Meta Description Length',
      status: 'warning',
      message: `${descLen} chars. Target 140–160 chars to maximize click-through rate.`,
      scoreImpact: 12,
    });
  } else {
    checks.push({
      id: 'meta-desc-length',
      label: 'Meta Description Length',
      status: 'fail',
      message: `Description is ${descLen === 0 ? 'missing' : `${descLen} chars`}. Required: 140–160 chars.`,
      scoreImpact: 0,
    });
  }

  // 3. Focus Keyword in Title (15 points)
  if (!focusKeyword) {
    checks.push({
      id: 'focus-kw-title',
      label: 'Focus Keyword in Title',
      status: 'fail',
      message: 'No focus keyword specified. Set a focus keyword in SEO settings.',
      scoreImpact: 0,
    });
  } else if (metaTitle.toLowerCase().includes(focusKeyword) || title.toLowerCase().includes(focusKeyword)) {
    checks.push({
      id: 'focus-kw-title',
      label: 'Focus Keyword in Title',
      status: 'pass',
      message: `Focus keyword "${focusKeyword}" is present in the title.`,
      scoreImpact: 15,
    });
  } else {
    checks.push({
      id: 'focus-kw-title',
      label: 'Focus Keyword in Title',
      status: 'fail',
      message: `Focus keyword "${focusKeyword}" was not found in the title.`,
      scoreImpact: 0,
    });
  }

  // 4. Focus Keyword in URL Slug (15 points)
  const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, ' ');
  const kwWords = focusKeyword.split(/\s+/).filter(Boolean);
  const slugMatchesKw = kwWords.length > 0 && kwWords.every((word) => normalizedSlug.includes(word));

  if (!focusKeyword) {
    checks.push({
      id: 'focus-kw-slug',
      label: 'Focus Keyword in Slug',
      status: 'fail',
      message: 'Specify a focus keyword to evaluate URL slug relevance.',
      scoreImpact: 0,
    });
  } else if (slugMatchesKw) {
    checks.push({
      id: 'focus-kw-slug',
      label: 'Focus Keyword in Slug',
      status: 'pass',
      message: `Focus keyword appears in the URL slug (/blog/${slug}).`,
      scoreImpact: 15,
    });
  } else {
    checks.push({
      id: 'focus-kw-slug',
      label: 'Focus Keyword in Slug',
      status: 'warning',
      message: `Slug does not contain the focus keyword words.`,
      scoreImpact: 6,
    });
  }

  // 5. Focus Keyword in First Paragraph (10 points)
  if (!focusKeyword) {
    checks.push({
      id: 'focus-kw-intro',
      label: 'Focus Keyword in Intro',
      status: 'fail',
      message: 'Specify a focus keyword.',
      scoreImpact: 0,
    });
  } else if (firstParagraph.includes(focusKeyword) || plainContent.slice(0, 350).toLowerCase().includes(focusKeyword)) {
    checks.push({
      id: 'focus-kw-intro',
      label: 'Focus Keyword in Intro',
      status: 'pass',
      message: `Keyword appears in the opening paragraph.`,
      scoreImpact: 10,
    });
  } else {
    checks.push({
      id: 'focus-kw-intro',
      label: 'Focus Keyword in Intro',
      status: 'warning',
      message: `Include "${focusKeyword}" within the first 100 words of the body.`,
      scoreImpact: 4,
    });
  }

  // 6. Heading Structure (10 points)
  const h1Matches = (content.match(/<h1[^>]*>/gi) || []).length;
  const h2Matches = (content.match(/<h2[^>]*>/gi) || []).length;
  // If editing body, the article page supplies the main H1 via article title
  if (h1Matches === 0 && h2Matches >= 1) {
    checks.push({
      id: 'heading-hierarchy',
      label: 'Heading Structure',
      status: 'pass',
      message: `Proper hierarchy: H1 reserved for page title, ${h2Matches} H2 subsections in body.`,
      scoreImpact: 10,
    });
  } else if (h1Matches === 1 && h2Matches >= 1) {
    checks.push({
      id: 'heading-hierarchy',
      label: 'Heading Structure',
      status: 'pass',
      message: 'Clean hierarchy with single H1 and H2 subheadings.',
      scoreImpact: 10,
    });
  } else if (h2Matches === 0) {
    checks.push({
      id: 'heading-hierarchy',
      label: 'Heading Structure',
      status: 'warning',
      message: 'No H2 subheadings found. Break your content into structured sections.',
      scoreImpact: 5,
    });
  } else {
    checks.push({
      id: 'heading-hierarchy',
      label: 'Heading Structure',
      status: 'warning',
      message: `Found ${h1Matches} H1 tags. Exactly one H1 is recommended per page.`,
      scoreImpact: 5,
    });
  }

  // 7. Image Alt Tags (5 points)
  if (featuredImage && (!featuredImageAlt || featuredImageAlt.trim().length < 5)) {
    checks.push({
      id: 'image-alt-tags',
      label: 'Image Alt Text',
      status: 'warning',
      message: 'Featured image is missing descriptive alt text for screen readers & image SEO.',
      scoreImpact: 2,
    });
  } else {
    checks.push({
      id: 'image-alt-tags',
      label: 'Image Alt Text',
      status: 'pass',
      message: 'Featured image includes descriptive alt text.',
      scoreImpact: 5,
    });
  }

  // 8. Canonical URL (5 points)
  const isValidUrl = /^https?:\/\/.+/i.test(canonicalUrl);
  if (isValidUrl) {
    checks.push({
      id: 'canonical-url',
      label: 'Canonical URL',
      status: 'pass',
      message: `Canonical link properly configured: ${canonicalUrl}`,
      scoreImpact: 5,
    });
  } else {
    checks.push({
      id: 'canonical-url',
      label: 'Canonical URL',
      status: 'warning',
      message: 'Canonical URL is missing or invalid. Add a full https:// link.',
      scoreImpact: 1,
    });
  }

  const rawScore = checks.reduce((acc, curr) => acc + curr.scoreImpact, 0);
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  const status = score >= 80 ? 'good' : score >= 50 ? 'average' : 'poor';

  return { score, status, checks };
}
