import { JupsoftConfig, BlogPost, BlogListResponse, Category, Tag } from './types.js';

export class JupsoftClient {
  private config: Partial<JupsoftConfig>;

  constructor(config?: Partial<JupsoftConfig>) {
    this.config = config || {};
  }

  // Lazy dynamic getters to ensure runtime .env.local changes are always picked up (Fix Bug #1, #23)
  get apiUrl(): string {
    return (
      (this.config.apiUrl !== undefined
        ? this.config.apiUrl
        : typeof process !== 'undefined'
        ? process.env?.NEXT_PUBLIC_CMS_API_URL
        : '') || ''
    ).replace(/\/$/, '');
  }

  get apiKey(): string {
    return (
      this.config.apiKey !== undefined
        ? this.config.apiKey
        : typeof process !== 'undefined'
        ? process.env?.CMS_TENANT_API_KEY
        : ''
    ) || '';
  }

  get websiteId(): string {
    return (
      this.config.websiteId !== undefined
        ? this.config.websiteId
        : typeof process !== 'undefined'
        ? process.env?.CMS_WEBSITE_ID
        : ''
    ) || '';
  }

  get defaultLang(): string {
    return this.config.defaultLang || 'en';
  }

  private async request<T>(path: string, options: { tags?: string[]; revalidate?: number } = {}): Promise<T> {
    const apiUrl = this.apiUrl;
    const apiKey = this.apiKey;
    const websiteId = this.websiteId;

    if (!apiUrl) {
      throw new Error('Jupsoft CMS Error: NEXT_PUBLIC_CMS_API_URL is missing. Please define it in your .env.local file.');
    }
    if (!apiKey) {
      throw new Error('Jupsoft CMS Error: CMS_TENANT_API_KEY is missing. Please define it in your .env.local file.');
    }
    if (!websiteId) {
      throw new Error('Jupsoft CMS Error: CMS_WEBSITE_ID is missing. Please define it in your .env.local file.');
    }

    const url = new URL(`${apiUrl}${path}`);
    // Fix Bug #4: Redundant if removed
    if (!url.searchParams.has('websiteId')) url.searchParams.set('websiteId', websiteId);
    if (!url.searchParams.has('website')) url.searchParams.set('website', websiteId);

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'x-api-key': apiKey,
      'X-Tenant-ID': websiteId,
    };

    const res = await fetch(url.toString(), {
      headers,
      next: {
        tags: options.tags || ['blogs'],
        revalidate: options.revalidate ?? 3600,
      } as any,
    });

    if (!res.ok) {
      throw new Error(`Jupsoft CMS Error: ${res.status} ${res.statusText} on ${path}`);
    }

    return res.json() as Promise<T>;
  }

  async getBlogs(params?: { page?: number; limit?: number; category?: string; tag?: string; lang?: string; q?: string }): Promise<BlogListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.category) query.set('category', params.category);
    if (params?.tag) query.set('tag', params.tag);
    if (params?.lang || this.defaultLang) query.set('lang', params?.lang || this.defaultLang);
    if (params?.q) query.set('q', params.q);

    return this.request<BlogListResponse>(`/v1/blogs?${query.toString()}`, {
      tags: ['blogs', 'blogs-list'],
    });
  }

  async getBlogBySlug(slug: string, lang?: string): Promise<BlogPost | null> {
    try {
      const res = await this.request<{ success: boolean; data: BlogPost; redirect?: { statusCode: number; fromSlug: string; toSlug: string } }>(
        `/v1/blogs/${encodeURIComponent(slug)}?lang=${lang || this.defaultLang}`,
        { tags: [`blog:${slug}`, 'blogs'] }
      );
      if (res.data && res.redirect) {
        (res.data as any).redirect = res.redirect;
      }
      return res.data;
    } catch (err: any) {
      // Fix Bug #11: Differentiate 404 from unexpected server crashes
      if (err.message && err.message.includes('404')) {
        return null;
      }
      console.error(`[Jupsoft SDK] Error fetching blog "${slug}":`, err.message || err);
      return null;
    }
  }

  async getLatest(limit = 5, lang?: string): Promise<BlogPost[]> {
    const res = await this.request<{ success: boolean; data: BlogPost[] }>(
      `/v1/blogs/latest?limit=${limit}&lang=${lang || this.defaultLang}`,
      { tags: ['blogs', 'blogs-latest'] }
    );
    return res.data || [];
  }

  async getPopular(limit = 5, lang?: string): Promise<BlogPost[]> {
    const res = await this.request<{ success: boolean; data: BlogPost[] }>(
      `/v1/blogs/popular?limit=${limit}&lang=${lang || this.defaultLang}`,
      { tags: ['blogs', 'blogs-popular'] }
    );
    return res.data || [];
  }

  async getCategories(): Promise<{ success: boolean; data: Category[] }> {
    return this.request<{ success: boolean; data: Category[] }>('/v1/categories', {
      tags: ['categories'],
    });
  }

  async getTags(): Promise<{ success: boolean; data: Tag[] }> {
    return this.request<{ success: boolean; data: Tag[] }>('/v1/tags', {
      tags: ['tags'],
    });
  }

  async search(query: string, lang?: string, limit = 10): Promise<{ success: boolean; data: BlogPost[] }> {
    return this.request<{ success: boolean; data: BlogPost[] }>(
      `/v1/search?q=${encodeURIComponent(query)}&lang=${lang || this.defaultLang}&limit=${limit}`,
      { tags: ['blogs'] }
    );
  }

  async getWebsiteInfo(): Promise<any> {
    return this.request<any>('/v1/website');
  }

  // Fix Bug #7 & #19: Check apiUrl before dispatching fetch, return Promise<void> correctly
  async recordView(slug: string, blogId?: string): Promise<void> {
    const apiUrl = this.apiUrl;
    if (!apiUrl || typeof fetch === 'undefined') return;

    try {
      await fetch(`${apiUrl}/v1/track`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}` 
        },
        body: JSON.stringify({
          websiteId: this.websiteId,
          slug,
          blogId,
        }),
      });
    } catch {
      // Non-blocking telemetry
    }
  }

  // Fix Bug #5: Timing-safe constant-time comparison to prevent HMAC timing attacks
  async verifyWebhookSignature(payloadText: string, signature: string | null, secret?: string): Promise<boolean> {
    const targetSecret =
      secret ||
      (typeof process !== 'undefined' ? process.env?.CMS_WEBHOOK_SECRET : undefined) ||
      'wh_sec_jupsoft_default_revalidate_2026';
    if (!signature || !targetSecret) return false;
    const cleanSig = signature.startsWith('sha256=') ? signature.slice(7) : signature;

    try {
      if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
        const encoder = new TextEncoder();
        const key = await globalThis.crypto.subtle.importKey(
          'raw',
          encoder.encode(targetSecret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const sigBuffer = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(payloadText));
        const computedHex = Array.from(new Uint8Array(sigBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        // Constant-time comparison (prevents byte-by-byte timing attacks)
        if (computedHex.length !== cleanSig.length) return false;
        let mismatch = 0;
        for (let i = 0; i < computedHex.length; i++) {
          mismatch |= computedHex.charCodeAt(i) ^ cleanSig.charCodeAt(i);
        }
        return mismatch === 0;
      }
      return false;
    } catch {
      return false;
    }
  }
}

// Global default singleton with dynamic getter resolution
export const jupsoft = new JupsoftClient();
