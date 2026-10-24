/**
 * Jupsoft Centralized Blog CMS — API Client Service
 * TRD §16 (API Design) + §17 (Integration)
 *
 * Production-grade: 401 auto-refresh, token rotation support,
 * cookie-based token storage for Edge Middleware compatibility.
 */

import {
  Blog, Website, Category, Tag, MediaItem, ActiveSession,
  UserAccount, RedirectItem, SystemAuditLog, BlogStatus, BlogSEO, BlogTranslation,
  SupportTicket, TeamMemberTimeSpent, SystemNotification,
} from '../types';

export type BlogTranslationPayload = Omit<Partial<BlogTranslation>, 'seo' | 'languageCode'> & {
  lang?: string;
  languageCode?: string;
  seo?: Partial<BlogSEO>;
  [key: string]: unknown;
};

export type BlogPayloadInput = Omit<Partial<Blog>, 'translations'> & {
  translations?: Record<string, BlogTranslationPayload> | BlogTranslationPayload[];
};

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  createdAt: string;
}

export interface WebhookTestResult {
  success: boolean;
  statusCode: number;
  statusText: string;
  responseBody: string;
  latencyMs: number;
  url: string;
  timestamp: string;
  message: string;
}

export interface WebhookDeliveryLogItem {
  id: string;
  websiteId: string;
  event: string;
  slug: string;
  targetUrl: string;
  statusCode: number;
  responseBody: string;
  attempt: number;
  delivered: boolean;
  timestamp: string;
}


export function getApiBase(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window === 'undefined') {
    return (envUrl || 'http://localhost:4010').replace(/\/+$/, '');
  }

  // 1. If explicit env URL is set to a remote domain or path
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }

  // 2. If running on production blogary domain
  if (window.location.hostname === 'blogary.jupsoft.com') {
    return 'https://blogary.jupsoft.com';
  }

  // 3. If accessed via VPS IP or custom domain (not localhost)
  const host = window.location.hostname;
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    if (!window.location.port || window.location.port === '80' || window.location.port === '443') {
      return window.location.origin;
    }
    return `${window.location.protocol}//${host}:4010`;
  }

  return (envUrl || 'http://localhost:4010').replace(/\/+$/, '');
}

export const API_BASE = getApiBase();

// Cookie helpers for Edge Middleware compatibility
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function setCookie(name: string, value: string, days = 3650) {
  if (typeof document === 'undefined') return;
  const maxAge = days * 86400;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = `${name}=${value}; max-age=${maxAge}; expires=${expires}; path=/; SameSite=Lax${isHttps ? '; Secure' : ''}`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const sec = isHttps ? '; Secure' : '';
  const domain = typeof window !== 'undefined' ? window.location.hostname : '';

  // 1. Standard root path
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/; SameSite=Lax${sec}`;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/`;

  if (domain) {
    // 2. Explicit hostname and wildcards
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/; domain=${domain}; SameSite=Lax${sec}`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/; domain=.${domain}; SameSite=Lax${sec}`;

    // 3. Parent domain for subdomains (e.g., .jupsoft.com for blogary.jupsoft.com)
    const parts = domain.split('.');
    if (parts.length >= 2) {
      const rootDomain = `.${parts.slice(-2).join('.')}`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/; domain=${rootDomain}; SameSite=Lax${sec}`;
    }
  }
}

class ApiClient {
  private token: string | null = null;
  private refreshTokenValue: string | null = null;
  private isRefreshing = false;
  private refreshQueue: Array<(token: string | null) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = getCookie('jupsoft_auth_token');
      this.refreshTokenValue = getCookie('jupsoft_refresh_token');
      if (!this.token) {
        try { this.token = localStorage.getItem('jupsoft_auth_token'); } catch {}
      }
      if (!this.refreshTokenValue) {
        try { this.refreshTokenValue = localStorage.getItem('jupsoft_refresh_token'); } catch {}
      }
    }
  }

  setTokens(accessToken: string | null, refreshToken?: string | null) {
    this.token = accessToken;
    if (accessToken) {
      setCookie('jupsoft_auth_token', accessToken, 3650); // 10 years persistent session
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('jupsoft_auth_token', accessToken); } catch {}
      }
    } else {
      deleteCookie('jupsoft_auth_token');
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem('jupsoft_auth_token'); } catch {}
      }
    }
    if (refreshToken !== undefined) {
      this.refreshTokenValue = refreshToken;
      if (refreshToken) {
        setCookie('jupsoft_refresh_token', refreshToken, 3650); // 10 years persistent session
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('jupsoft_refresh_token', refreshToken); } catch {}
        }
      } else {
        deleteCookie('jupsoft_refresh_token');
        if (typeof window !== 'undefined') {
          try { localStorage.removeItem('jupsoft_refresh_token'); } catch {}
        }
      }
    }
  }

  clearTokens() {
    this.token = null;
    this.refreshTokenValue = null;
    deleteCookie('jupsoft_auth_token');
    deleteCookie('jupsoft_refresh_token');
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('jupsoft_auth_token');
        localStorage.removeItem('jupsoft_refresh_token');
        sessionStorage.removeItem('jupsoft_auth_token');
        sessionStorage.removeItem('jupsoft_refresh_token');
      } catch {}
    }
  }

  /**
   * Nuclear cleanup: scrub tokens, cookies, session storage, and persisted Zustand auth states.
   * Prevents infinite 401 redirect loops when an account or token was deleted in PostgreSQL.
   */
  hardPurge() {
    this.clearTokens();
    if (typeof window !== 'undefined') {
      try {
        ['jupsoft_cms_platform_store_v7', 'jupsoft_cms_platform_store_v6', 'blog-storage'].forEach((key) => {
          const rawStore = localStorage.getItem(key);
          if (rawStore) {
            try {
              const parsed = JSON.parse(rawStore);
              if (parsed?.state) {
                parsed.state.isAuthenticated = false;
                parsed.state.currentUser = null;
                localStorage.setItem(key, JSON.stringify(parsed));
              }
            } catch {}
          }
        });
      } catch {}
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      const c = getCookie('jupsoft_auth_token');
      if (c && c !== 'null' && c !== 'undefined') {
        this.token = c;
      } else {
        try {
          const ls = localStorage.getItem('jupsoft_auth_token');
          if (ls && ls !== 'null' && ls !== 'undefined') {
            this.token = ls;
            setCookie('jupsoft_auth_token', this.token, 3650);
          }
        } catch {}
      }
    }
    if (this.token === 'null' || this.token === 'undefined') {
      this.token = null;
    }
    return this.token;
  }

  getRefreshToken(): string | null {
    let rt = this.refreshTokenValue || getCookie('jupsoft_refresh_token');
    if (!rt && typeof window !== 'undefined') {
      try { rt = localStorage.getItem('jupsoft_refresh_token'); } catch {}
    }
    return (rt && rt !== 'null' && rt !== 'undefined') ? rt : null;
  }

  private async attemptRefresh(): Promise<string | null> {
    let rt = this.refreshTokenValue || getCookie('jupsoft_refresh_token');
    if (!rt && typeof window !== 'undefined') {
      try { rt = localStorage.getItem('jupsoft_refresh_token'); } catch {}
    }
    if (!rt || rt === 'null' || rt === 'undefined') return null;

    try {
      const res = await fetch(`${getApiBase()}/admin/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          this.hardPurge();
        }
        return null;
      }

      const data = await res.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch (networkErr) {
      console.warn('[apiClient] Refresh network glitch, preserving storage credentials:', networkErr);
      return null;
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (typeof window !== 'undefined') {
      const storedPublicIp = localStorage.getItem('jupsoft_client_public_ip');
      if (storedPublicIp) {
        headers.set('X-Client-Public-IP', storedPublicIp);
      }
    }

    const response = await fetch(`${getApiBase()}${endpoint}`, {
      credentials: 'include',
      ...options,
      headers,
    });

    if (response.status === 204) return undefined as unknown as T;

    // --- 401 Auto-Refresh Logic (skip for auth login/refresh/reset endpoints) ---
    const isAuthEndpoint =
      endpoint.includes('/admin/auth/login') ||
      endpoint.includes('/admin/auth/google') ||
      endpoint.includes('/admin/auth/refresh') ||
      endpoint.includes('/admin/auth/forgot-password') ||
      endpoint.includes('/admin/auth/reset-password') ||
      endpoint.includes('/admin/auth/validate-reset-token');
    if (response.status === 401 && !isAuthEndpoint) {
      // 1. Inspect error payload: if 401 was due to a deleted or unknown tenant/website param,
      // this is NOT a user credential failure — do NOT invalidate session or trigger refresh!
      try {
        const cloned = response.clone();
        const errJson = await cloned.json().catch(() => ({}));
        const errMsg = typeof errJson?.message === 'string' ? errJson.message : '';
        if (
          errMsg.toLowerCase().includes('tenant website') ||
          (errMsg.toLowerCase().includes('tenant') && errMsg.toLowerCase().includes('not found'))
        ) {
          console.warn(`[apiClient] Stale tenant website in request: "${errMsg}". Auto-healing storage.`);
          if (typeof window !== 'undefined') {
            try {
              const rawStore = localStorage.getItem('jupsoft_cms_platform_store_v7');
              if (rawStore) {
                const parsed = JSON.parse(rawStore);
                if (parsed?.state) {
                  parsed.state.activeWebsiteId = 'all';
                  localStorage.setItem('jupsoft_cms_platform_store_v7', JSON.stringify(parsed));
                }
              }
            } catch {}
          }
          throw new Error(errMsg);
        }
      } catch (inspectErr) {
        if (inspectErr instanceof Error && inspectErr.message.toLowerCase().includes('tenant')) {
          throw inspectErr;
        }
      }

      if (this.isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          this.refreshQueue.push((newToken) => {
            if (!newToken) {
              reject(new Error('Session expired. Please log in again.'));
              return;
            }
            const retryHeaders = new Headers(headers);
            retryHeaders.set('Authorization', `Bearer ${newToken}`);
            fetch(`${getApiBase()}${endpoint}`, { ...options, headers: retryHeaders })
              .then(async (r) => {
                if (r.status === 204) {
                  resolve(undefined as unknown as T);
                  return;
                }
                if (!r.ok) {
                  const errorBody = await r.json().catch(() => ({}));
                  reject(new Error(errorBody.message || `Request failed: ${r.status}`));
                  return;
                }
                const data = await r.json().catch(() => ({}));
                resolve(data);
              })
              .catch(reject);
          });
        });
      }

      this.isRefreshing = true;
      const newToken = await this.attemptRefresh();
      this.isRefreshing = false;

      // Flush queue
      this.refreshQueue.forEach((cb) => cb(newToken));
      this.refreshQueue = [];

      if (!newToken) {
        this.hardPurge();
        // Refresh failed — force clean logout without loop
        if (typeof window !== 'undefined') {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login?session=expired';
          }
        }
        throw new Error('Session expired. Please log in again.');
      }

      // Retry the original request with new token
      headers.set('Authorization', `Bearer ${newToken}`);
      const retryResponse = await fetch(`${getApiBase()}${endpoint}`, {
        credentials: 'include',
        ...options,
        headers,
      });
      if (retryResponse.status === 204) return undefined as unknown as T;
      if (!retryResponse.ok) {
        const errorBody = await retryResponse.json().catch(() => ({}));
        throw new Error(errorBody.message || `Request failed: ${retryResponse.status}`);
      }
      return retryResponse.json();
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || `API Request failed: ${response.status}`);
    }

    return response.json();
  }

  // ─── Health ───────────────────────────────────────────────────────────────

  async checkHealth(): Promise<{ status: string; uptime: number; timestamp: string }> {
    return this.request('/v1/health');
  }

  // ─── Auth (TRD §4) ────────────────────────────────────────────────────────

  async login(email: string, password: string) {
    const clientPublicIp = typeof window !== 'undefined' ? localStorage.getItem('jupsoft_client_public_ip') || undefined : undefined;
    const data = await this.request<{
      accessToken: string;
      refreshToken: string;
      user: UserAccount;
      websites?: Website[];
    }>(
      '/admin/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password, clientPublicIp }) },
    );
    if (data.accessToken) {
      this.setTokens(data.accessToken, data.refreshToken);
    }
    return data;
  }

  async googleLogin(credential: string) {
    const clientPublicIp = typeof window !== 'undefined' ? localStorage.getItem('jupsoft_client_public_ip') || undefined : undefined;
    const data = await this.request<{
      accessToken: string;
      refreshToken: string;
      user: UserAccount;
      websites?: Website[];
    }>(
      '/admin/auth/google',
      { method: 'POST', body: JSON.stringify({ credential, clientPublicIp }) },
    );
    if (data.accessToken) {
      this.setTokens(data.accessToken, data.refreshToken);
    }
    return data;
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const clientPublicIp = typeof window !== 'undefined' ? localStorage.getItem('jupsoft_client_public_ip') || undefined : undefined;
    return this.request<{ success: boolean; message: string }>(
      '/admin/auth/forgot-password',
      { method: 'POST', body: JSON.stringify({ email, clientPublicIp }) },
    );
  }

  async validateResetToken(token: string): Promise<{ valid: boolean; message?: string }> {
    return this.request<{ valid: boolean; message?: string }>(
      `/admin/auth/validate-reset-token?token=${encodeURIComponent(token)}`,
      { method: 'GET' },
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const clientPublicIp = typeof window !== 'undefined' ? localStorage.getItem('jupsoft_client_public_ip') || undefined : undefined;
    return this.request<{ success: boolean; message: string }>(
      '/admin/auth/reset-password',
      { method: 'POST', body: JSON.stringify({ token, newPassword, clientPublicIp }) },
    );
  }

  async syncClientIp(ip: string): Promise<{ success: boolean; ip: string }> {
    if (typeof window !== 'undefined' && ip) {
      localStorage.setItem('jupsoft_client_public_ip', ip);
    }
    return this.request('/admin/auth/sync-ip', {
      method: 'PUT',
      body: JSON.stringify({ ip }),
    });
  }

  async refreshTokens(refreshToken: string) {
    const data = await this.request<{ accessToken: string; refreshToken: string }>(
      '/admin/auth/refresh',
      { method: 'POST', body: JSON.stringify({ refreshToken }) },
    );
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async getProfile(): Promise<UserAccount> {
    return this.request('/admin/auth/me');
  }

  async updateProfile(data: { name?: string; avatar?: string; bio?: string; linkedinUrl?: string; twitterUrl?: string }): Promise<UserAccount> {
    return this.request('/admin/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadAvatar(file: File): Promise<{ success: boolean; avatar: string; user: UserAccount }> {
    const form = new FormData();
    form.append('file', file);
    return this.request('/admin/auth/avatar', {
      method: 'POST',
      body: form,
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    return this.request('/admin/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async logout() {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      try {
        await this.request('/admin/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch (err) {
        console.warn('[apiClient] Backend logout revocation notice:', err);
      }
    }
    this.hardPurge();
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Active Sessions & Multi-Device Token Management
  // ═════════════════════════════════════════════════════════════════════════

  async getActiveSessions(): Promise<{ success: boolean; count: number; sessions: ActiveSession[] }> {
    return this.request('/admin/auth/sessions');
  }

  async revokeSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/auth/sessions/revoke/${sessionId}`, {
      method: 'POST',
    });
  }

  async revokeAllSessions(includeCurrent = false): Promise<{ success: boolean; message: string; count: number }> {
    return this.request('/admin/auth/sessions/revoke-all', {
      method: 'POST',
      body: JSON.stringify({ includeCurrent }),
    });
  }

  // ─── Websites / Multi-Tenant (TRD §3) ─────────────────────────────────────

  async getWebsites(): Promise<Website[]> {
    return this.request('/admin/websites');
  }

  async createWebsite(site: Partial<Website>): Promise<Website> {
    return this.request('/admin/websites', { method: 'POST', body: JSON.stringify(site) });
  }

  async updateWebsite(id: string, updates: Partial<Website>): Promise<Website> {
    return this.request(`/admin/websites/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  }

  async deleteWebsite(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/websites/${id}`, { method: 'DELETE' });
  }

  // ─── Blogs (TRD §7 + §9) ──────────────────────────────────────────────────

  async getBlogs(params?: {
    websiteId?: string;
    status?: BlogStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Blog[]; total: number; page: number; limit: number }> {
    const query = new URLSearchParams();
    if (params?.websiteId && params.websiteId !== 'all') query.append('websiteId', params.websiteId);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return this.request(`/admin/blogs${qs ? `?${qs}` : ''}`);
  }

  async getBlogById(id: string): Promise<Blog> {
    return this.request(`/admin/blogs/${id}`);
  }

  private formatBlogPayload(blog: BlogPayloadInput): Record<string, unknown> {
    // Format translations dictionary to backend DTO array
    const transArray: BlogTranslationPayload[] = [];
    if (blog.translations && !Array.isArray(blog.translations)) {
      for (const [lang, t] of Object.entries(blog.translations)) {
        if (t && typeof t === 'object' && t.title && t.title.trim()) {
          const rawSlug = t.slug && t.slug.trim()
            ? t.slug.trim()
            : t.title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');

          transArray.push({
            lang,
            title: t.title.trim(),
            slug: rawSlug || `post-${Date.now()}`,
            excerpt: t.excerpt || '',
            content: t.content || '',
            metaTitle: t.seo?.metaTitle || t.metaTitle || t.title,
            metaDescription: t.seo?.metaDescription || t.metaDescription || t.excerpt || '',
            metaKeywords: t.seo?.metaKeywords || t.metaKeywords || '',
            canonicalUrl: t.seo?.canonicalUrl || t.canonicalUrl || '',
            focusKeyword: t.seo?.focusKeyword || t.focusKeyword || '',
            robots: t.seo?.robots || t.robots || 'index, follow',
            ogTitle: t.seo?.ogTitle || t.ogTitle || t.title,
            ogDescription: t.seo?.ogDescription || t.ogDescription || t.excerpt || '',
            ogImage: t.seo?.ogImage || t.ogImage || blog.featuredImage || '',
            twitterTitle: t.seo?.twitterTitle || t.twitterTitle || t.title,
            twitterDescription: t.seo?.twitterDescription || t.twitterDescription || t.excerpt || '',
            twitterImage: t.seo?.twitterImage || t.twitterImage || blog.featuredImage || '',
          });
        }
      }
    } else if (Array.isArray(blog.translations)) {
      transArray.push(...blog.translations);
    }

    const cleanWebsiteId = (blog.websiteId && blog.websiteId !== 'all' && blog.websiteId !== 'site-cloud')
      ? blog.websiteId
      : undefined;

    // Strictly whitelist only properties defined in CreateBlogDto / UpdateBlogDto
    const payload: Record<string, unknown> = {
      translations: transArray,
    };
    if (cleanWebsiteId) payload.websiteId = cleanWebsiteId;

    if (blog.featuredImage !== undefined && blog.featuredImage !== null) payload.featuredImage = blog.featuredImage;
    if (blog.featuredImageAlt !== undefined && blog.featuredImageAlt !== null) payload.featuredImageAlt = blog.featuredImageAlt;
    if (blog.status !== undefined && blog.status !== null) payload.status = blog.status;
    if (blog.readTimeMinutes !== undefined && blog.readTimeMinutes !== null) payload.readTimeMinutes = blog.readTimeMinutes;
    if (Array.isArray(blog.categoryIds)) payload.categoryIds = blog.categoryIds;
    if (Array.isArray(blog.tagIds)) payload.tagIds = blog.tagIds;
    if (blog.authorId !== undefined) {
      payload.authorId = (blog.authorId === 'usr-custom' || !blog.authorId || (typeof blog.authorId === 'string' && blog.authorId.trim() === ''))
        ? null
        : blog.authorId.trim();
    }
    if (blog.authorName) payload.authorName = blog.authorName;
    if (blog.authorAvatar !== undefined && blog.authorAvatar !== null) payload.authorAvatar = blog.authorAvatar;
    if (blog.publishDate && typeof blog.publishDate === 'string' && blog.publishDate.trim() !== '') {
      payload.publishDate = blog.publishDate.trim();
    }
    if (blog.scheduledAt && typeof blog.scheduledAt === 'string' && blog.scheduledAt.trim() !== '') {
      payload.scheduledAt = blog.scheduledAt.trim();
    }

    return payload;
  }

  async createBlog(blog: BlogPayloadInput): Promise<Blog> {
    const payload = this.formatBlogPayload(blog);
    if (!payload.websiteId) {
      const websites = await this.getWebsites().catch(() => []);
      payload.websiteId = websites[0]?.id || 'site-jupsoft-test';
    }
    return this.request('/admin/blogs', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateBlog(id: string, updates: BlogPayloadInput): Promise<Blog> {
    const payload = this.formatBlogPayload(updates);
    return this.request(`/admin/blogs/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  async deleteBlog(id: string): Promise<{ success: boolean }> {
    return this.request(`/admin/blogs/${id}`, { method: 'DELETE' });
  }

  async deleteBlogsBulk(ids: string[]): Promise<{ success: boolean; count: number; message: string }> {
    return this.request(`/admin/blogs/bulk`, {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  }

  async submitBlogForReview(id: string, notes?: string): Promise<Blog> {
    return this.request(`/admin/blogs/${id}/submit`, { method: 'POST', body: JSON.stringify({ notes }) });
  }

  async approveBlog(id: string, notes?: string): Promise<Blog> {
    return this.request(`/admin/blogs/${id}/approve`, { method: 'POST', body: JSON.stringify({ notes }) });
  }

  async publishBlog(id: string, scheduledAt?: string): Promise<Blog> {
    return this.request(`/admin/blogs/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify(scheduledAt ? { scheduledAt } : {}),
    });
  }

  async archiveBlog(id: string): Promise<Blog> {
    return this.request(`/admin/blogs/${id}/archive`, { method: 'POST', body: JSON.stringify({}) });
  }

  async getBlog(id: string): Promise<Blog> {
    return this.getBlogById(id);
  }

  async duplicateBlog(id: string): Promise<Blog> {
    const original = await this.getBlogById(id);
    const translations: Record<string, BlogTranslationPayload> = {};
    if (original.translations) {
      Object.entries(original.translations).forEach(([lang, t]: [string, Partial<BlogTranslation> & { featuredImage?: string; authorName?: string }]) => {
        translations[lang] = {
          title: `${t.title || 'Untitled'} (Copy)`,
          slug: `${t.slug || 'copy'}-${Date.now().toString(36)}`,
          content: t.content || '<p></p>',
          excerpt: t.excerpt || '',
          featuredImage: t.featuredImage || '',
          authorName: t.authorName || original.authorName || '',
          seo: t.seo || {},
        };
      });
    }
    const payload: BlogPayloadInput = {
      websiteId: original.websiteId,
      status: 'Draft',
      categoryIds: original.categoryIds || [],
      tagIds: original.tagIds || [],
      authorName: original.authorName || 'Staff Writer',
      translations,
      readTimeMinutes: original.readTimeMinutes || 3,
    };
    return this.createBlog(payload);
  }

  // ─── Media Library (TRD §10) ──────────────────────────────────────────────

  async getMedia(websiteId?: string): Promise<MediaItem[]> {
    const qs = websiteId && websiteId !== 'all' ? `?websiteId=${websiteId}` : '';
    return this.request(`/admin/media${qs}`);
  }

  async uploadMedia(
    file: File, websiteId: string, altText?: string,
  ): Promise<{ 
    id: string; 
    cdnUrl: string; 
    thumbnailUrl?: string; 
    mediumUrl?: string; 
    s3Key?: string;
    fileName: string;
    fileSizeBytes?: number;
    dimensions?: { width: number; height: number };
  }> {
    const form = new FormData();
    form.append('file', file);
    const qs = `?websiteId=${websiteId}${altText ? `&altText=${encodeURIComponent(altText)}` : ''}`;
    return this.request(`/admin/media/upload${qs}`, { method: 'POST', body: form });
  }

  async getPresignedUploadUrl(fileName: string, fileType: string, websiteId: string) {
    return this.request<{ uploadUrl: string; s3Key: string; cdnUrl: string; fileName: string }>(
      '/admin/media/presigned-url',
      { method: 'POST', body: JSON.stringify({ fileName, fileType, websiteId }) },
    );
  }

  async deleteMedia(id: string): Promise<{ success: boolean }> {
    return this.request(`/admin/media/${id}`, { method: 'DELETE' });
  }

  async updateMedia(id: string, updates: { fileName?: string; altText?: string }): Promise<MediaItem> {
    return this.request(`/admin/media/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // ─── Redirects (TRD §11) ──────────────────────────────────────────────────

  async getRedirects(websiteId?: string): Promise<RedirectItem[]> {
    const qs = websiteId && websiteId !== 'all' ? `?websiteId=${websiteId}` : '';
    return this.request(`/admin/redirects${qs}`);
  }

  async createRedirect(redirect: Partial<RedirectItem>): Promise<RedirectItem> {
    return this.request('/admin/redirects', { method: 'POST', body: JSON.stringify(redirect) });
  }

  async deleteRedirect(id: string): Promise<{ success: boolean }> {
    return this.request(`/admin/redirects/${id}`, { method: 'DELETE' });
  }

  // ─── Taxonomy: Categories & Tags (TRD §9) ─────────────────────────────────

  async getCategories(websiteId?: string): Promise<Category[]> {
    const qs = websiteId && websiteId !== 'all' ? `?websiteId=${websiteId}` : '';
    return this.request(`/admin/categories${qs}`);
  }

  async createCategory(data: {
    websiteId: string;
    name: string;
    slug?: string;
    description?: string;
    parentId?: string | null;
  }): Promise<Category> {
    return this.request('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string): Promise<{ success: boolean; message?: string }> {
    return this.request(`/admin/categories/${id}`, { method: 'DELETE' });
  }

  async getTags(websiteId?: string): Promise<Tag[]> {
    const qs = websiteId && websiteId !== 'all' ? `?websiteId=${websiteId}` : '';
    return this.request(`/admin/tags${qs}`);
  }

  async createTag(data: {
    websiteId: string;
    name: string;
    slug?: string;
  }): Promise<Tag> {
    return this.request('/admin/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTag(id: string): Promise<{ success: boolean; message?: string }> {
    return this.request(`/admin/tags/${id}`, { method: 'DELETE' });
  }

  // ─── Users (TRD §5) ───────────────────────────────────────────────────────

  async getUsers(): Promise<UserAccount[]> {
    return this.request('/admin/users');
  }

  async inviteUser(user: { email: string; name: string; websiteId: string; role: string; password?: string; customModules?: string[] }): Promise<UserAccount> {
    return this.request('/admin/users/invite', { method: 'POST', body: JSON.stringify(user) });
  }

  async updateUserRole(id: string, role: string, websiteId: string): Promise<UserAccount> {
    return this.request(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role, websiteId }) });
  }

  async removeUserRole(id: string, websiteId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/users/${id}/role/${websiteId}`, { method: 'DELETE' });
  }

  async updateUserModules(id: string, customModules: string[]): Promise<UserAccount> {
    return this.request(`/admin/users/${id}/modules`, { method: 'PUT', body: JSON.stringify({ customModules }) });
  }

  async updateUserStatus(id: string, status: string): Promise<UserAccount> {
    return this.request(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  }

  async deleteUser(id: string): Promise<{ success: boolean }> {
    return this.request(`/admin/users/${id}`, { method: 'DELETE' });
  }

  async resetUserPassword(id: string): Promise<{ success: boolean; tempPassword: string; message: string }> {
    return this.request(`/admin/users/${id}/reset-password`, { method: 'POST' });
  }

  async sendUserCredentials(id: string, password?: string, email?: string): Promise<{ success: boolean; emailSent: boolean; tempPassword?: string; message: string }> {
    return this.request(`/admin/users/${id}/send-credentials`, {
      method: 'POST',
      body: JSON.stringify({ password, email }),
    });
  }

  // ─── AI Translation Engine (TRD §10) ───────────────────────────────────────

  async translateText(data: {
    title?: string;
    content?: string;
    excerpt?: string;
    text?: string;
    from: string;
    to: string;
  }): Promise<{
    title?: string;
    content?: string;
    excerpt?: string;
    translatedText?: string;
  }> {
    return this.request('/admin/translate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── Audit Logs (TRD §6) ──────────────────────────────────────────────────

  async getAuditLogs(websiteId?: string, limit = 50): Promise<SystemAuditLog[]> {
    const qs = websiteId && websiteId !== 'all'
      ? `?websiteId=${websiteId}&limit=${limit}`
      : `?limit=${limit}`;
    return this.request(`/admin/audit-logs${qs}`);
  }

  // ─── Analytics (TRD §14) ──────────────────────────────────────────────────

  async getAnalyticsDashboard(websiteId: string, days = 30) {
    return this.request(`/admin/analytics?websiteId=${websiteId}&days=${days}`);
  }

  async getBlogAnalytics(blogId: string, days = 30) {
    return this.request(`/admin/analytics/blog/${blogId}?days=${days}`);
  }

  async trackView(data: {
    blogId: string; websiteId: string; sessionId: string;
    referrer?: string; event?: 'page_view' | 'read_complete';
  }): Promise<void> {
    return this.request('/v1/track', { method: 'POST', body: JSON.stringify(data) });
  }

  async sendHeartbeat(): Promise<{ success: boolean }> {
    return this.request('/admin/analytics/heartbeat', { method: 'POST' });
  }

  async getTeamTimeSpent(): Promise<TeamMemberTimeSpent[]> {
    return this.request('/admin/analytics/team-time-spent');
  }

  // ─── Webhooks (TRD §13 & §15) ──────────────────────────────────────────────

  async testWebhookPing(websiteId: string, url?: string, event?: string): Promise<WebhookTestResult> {
    return this.request('/admin/webhooks/test-ping', {
      method: 'POST',
      body: JSON.stringify({ websiteId, url, event }),
    });
  }

  async getWebhookEndpoints(websiteId: string): Promise<WebhookEndpoint[]> {
    return this.request(`/admin/webhooks/endpoints?websiteId=${websiteId}`);
  }

  async addWebhookEndpoint(
    websiteId: string,
    endpoint: { name: string; url: string; events?: string[]; secret?: string; isActive?: boolean },
  ): Promise<WebhookEndpoint> {
    return this.request('/admin/webhooks/endpoints', {
      method: 'POST',
      body: JSON.stringify({ websiteId, ...endpoint }),
    });
  }

  async updateWebhookEndpoint(
    websiteId: string,
    id: string,
    updates: Partial<WebhookEndpoint>,
  ): Promise<WebhookEndpoint> {
    return this.request(`/admin/webhooks/endpoints/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ websiteId, ...updates }),
    });
  }

  async deleteWebhookEndpoint(websiteId: string, id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/webhooks/endpoints/${id}?websiteId=${websiteId}`, {
      method: 'DELETE',
    });
  }

  async getWebhookLogs(websiteId?: string, limit = 50): Promise<{ total: number; data: WebhookDeliveryLogItem[] }> {
    const qs = websiteId && websiteId !== 'all' ? `?websiteId=${websiteId}&limit=${limit}` : `?limit=${limit}`;
    return this.request(`/admin/webhooks/logs${qs}`);
  }

  // ─── Central Support & Bug Reporting System ──────────────────────────────

  async createSupportTicket(formData: FormData): Promise<SupportTicket> {
    return this.request('/admin/support/tickets', {
      method: 'POST',
      body: formData,
    });
  }

  async getMySupportTickets(): Promise<SupportTicket[]> {
    return this.request('/admin/support/tickets/my-tickets');
  }

  async getSupportTickets(params?: {
    websiteId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: SupportTicket[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    const q = new URLSearchParams();
    if (params?.websiteId && params.websiteId !== 'all') q.set('websiteId', params.websiteId);
    if (params?.status && params.status !== 'all') q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/admin/support/tickets${qs}`);
  }

  async getSupportStats(websiteId?: string): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  }> {
    const qs = websiteId && websiteId !== 'all' ? `?websiteId=${websiteId}` : '';
    return this.request(`/admin/support/tickets/stats${qs}`);
  }

  async getSupportTicket(id: string): Promise<SupportTicket> {
    return this.request(`/admin/support/tickets/${id}`);
  }

  async updateSupportTicket(
    id: string,
    updates: { status?: string; priority?: string; adminNotes?: string },
  ): Promise<SupportTicket> {
    return this.request(`/admin/support/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteSupportTicket(id: string): Promise<{ id: string }> {
    return this.request(`/admin/support/tickets/${id}`, {
      method: 'DELETE',
    });
  }

  // ─── System & Target Cadence Notifications (Phase 4 & 5 SaaS UX) ──────────────

  async getNotifications(
    websiteId?: string,
    unreadOnly?: boolean,
  ): Promise<{ notifications: SystemNotification[]; unreadCount: number }> {
    const params = new URLSearchParams();
    if (websiteId && websiteId !== 'all') params.append('websiteId', websiteId);
    if (unreadOnly) params.append('unreadOnly', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/admin/notifications${qs}`);
  }

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return this.request(`/admin/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsRead(websiteId?: string): Promise<{ success: boolean; count?: number }> {
    const qs = websiteId && websiteId !== 'all' ? `?websiteId=${websiteId}` : '';
    return this.request(`/admin/notifications/read-all${qs}`, {
      method: 'POST',
    });
  }
}


export const apiClient = new ApiClient();
