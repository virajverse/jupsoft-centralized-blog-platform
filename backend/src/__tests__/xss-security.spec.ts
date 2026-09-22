/**
 * XSS / CONTENT SECURITY TESTS — Phase 12
 * Tests: HTML sanitization, dangerous payloads, JavaScript URL injection
 */
import { sanitizeContent } from '../common/pipes/html-sanitize.pipe';

describe('XSS Sanitization (sanitizeContent)', () => {

  // ── 12.1: Script tag removal ───────────────────────────────────────────
  it('should strip <script> tags', () => {
    const malicious = '<p>Hello</p><script>alert("XSS")</script>';
    const result = sanitizeContent(malicious);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert("XSS")');
    expect(result).toContain('<p>Hello</p>');
  });

  // ── 12.2: Event handler removal ────────────────────────────────────────
  it('should strip onerror and onclick event handlers', () => {
    const malicious = '<img src="x" onerror="alert(1)" onclick="steal()"/>';
    const result = sanitizeContent(malicious);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('steal()');
  });

  // ── 12.3: javascript: URL scheme blocked ──────────────────────────────
  it('should block javascript: URL in href', () => {
    const malicious = '<a href="javascript:alert(document.cookie)">Click</a>';
    const result = sanitizeContent(malicious);
    expect(result).not.toContain('javascript:');
  });

  // ── 12.4: SVG with script ─────────────────────────────────────────────
  it('should remove inline SVG with script (onload event)', () => {
    const malicious = '<svg onload="alert(1)"><script>alert(2)</script></svg>';
    const result = sanitizeContent(malicious);
    expect(result).not.toContain('onload');
    expect(result).not.toContain('<script>');
  });

  // ── 12.5: iframe injection ─────────────────────────────────────────────
  it('should remove iframe tags', () => {
    const malicious = '<iframe src="https://evil.com/steal" style="display:none"></iframe>';
    const result = sanitizeContent(malicious);
    expect(result).not.toContain('<iframe');
  });

  // ── 12.6: Data URI in img src ─────────────────────────────────────────
  it('should handle data: URI in img (may pass or fail depending on policy)', () => {
    const input = '<img src="data:image/png;base64,abc123" alt="test"/>';
    const result = sanitizeContent(input);
    // sanitize-html by default allows data: URIs for img — document finding
    // Actual behavior: data: URIs are NOT blocked by default
    expect(typeof result).toBe('string');
  });

  // ── 12.7: Nested/encoded payload ──────────────────────────────────────
  it('should handle double-encoded XSS payloads', () => {
    const encoded = '<img src=x onerror=alert&#40;1&#41;>';
    const result = sanitizeContent(encoded);
    expect(result).not.toContain('onerror');
  });

  // ── 12.8: Normal HTML is preserved ───────────────────────────────────
  it('should preserve safe blog HTML elements', () => {
    const safe = '<h1>Title</h1><h2>Subtitle</h2><p>Content <strong>bold</strong> and <em>italic</em></p><ul><li>Item</li></ul>';
    const result = sanitizeContent(safe);
    expect(result).toContain('<h1>');
    expect(result).toContain('<h2>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  // ── 12.9: Code blocks preserved ───────────────────────────────────────
  it('should preserve code and pre blocks', () => {
    const code = '<pre><code>const x = 1; alert(x);</code></pre>';
    const result = sanitizeContent(code);
    expect(result).toContain('<pre>');
    expect(result).toContain('<code>');
    // Content inside code should be preserved as text
    expect(result).toContain('const x = 1;');
  });

  // ── 12.10: Null/empty input ───────────────────────────────────────────
  it('should handle null and empty inputs without throwing', () => {
    expect(sanitizeContent('')).toBe('');
    expect(sanitizeContent(null as any)).toBe(null as any);
    expect(sanitizeContent(undefined as any)).toBe(undefined as any);
  });

  // ── 12.11: Very long payload (DoS boundary test) ──────────────────────
  it('should handle very long HTML payloads without crashing', () => {
    const longHtml = '<p>' + 'A'.repeat(100000) + '</p>';
    expect(() => sanitizeContent(longHtml)).not.toThrow();
  });

  // ── 12.12: Prototype pollution in class/id attributes ──────────────────
  it('should allow class and id but not dangerous values', () => {
    const input = '<div class="__proto__" id="constructor"><p>Test</p></div>';
    const result = sanitizeContent(input);
    expect(result).toContain('<div');
    expect(result).not.toContain('<script');
  });

  // ── 12.13: Malicious canonical URL ────────────────────────────────────
  // NOTE: canonicalUrl is NOT sanitized through sanitizeContent
  // It's stored as plain text from the DTO — potential open redirect
  it('[SECURITY] documents that canonicalUrl field accepts any string including javascript: scheme', () => {
    // The DTO allows: @IsString() @IsOptional() canonicalUrl?: string;
    // There is NO URL validation on canonicalUrl
    // An attacker could inject: canonicalUrl: "javascript:alert(1)"
    // This would then be rendered in <link rel="canonical" href="javascript:alert(1)">
    // FLAG: SECURITY FINDING — canonicalUrl not URL-validated in DTO
    const maliciousCanonical = 'javascript:void(0)';
    // This string would pass DTO validation
    expect(typeof maliciousCanonical).toBe('string'); // Documents the vulnerability
  });

  // ── 12.14: object and embed tags blocked ──────────────────────────────
  it('should strip <object> and <embed> tags', () => {
    const malicious = '<object data="evil.swf"></object><embed src="evil.swf"/>';
    const result = sanitizeContent(malicious);
    expect(result).not.toContain('<object');
    expect(result).not.toContain('<embed');
  });

  // ── 12.15: Mutation XSS (mXSS) awareness ────────────────────────────
  it('should handle malformed tags that might cause mXSS', () => {
    const mxss = '<select><template></select><img src=1 onerror=alert(1)>';
    const result = sanitizeContent(mxss);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  // ── 12.16: Safe Image Transform & Alignment Preservation ───────────
  it('should preserve image rotation, alignment, and sizing attributes', () => {
    const rotatedImage = '<img src="https://example.com/pic.webp" data-rotate="90" data-align="center" style="transform: rotate(90deg); margin-left: auto; margin-right: auto; width: 450px;" />';
    const result = sanitizeContent(rotatedImage);
    expect(result).toContain('data-rotate="90"');
    expect(result).toContain('data-align="center"');
    expect(result).toContain('transform:rotate(90deg)');
    expect(result).toContain('width:450px');
  });
});
