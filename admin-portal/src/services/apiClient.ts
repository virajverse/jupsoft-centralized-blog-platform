/**
 * Jupsoft Centralized Blog CMS — API Client Service
 * TRD §16 (API Design) + §17 (Integration)
 *
 * Production-grade: 401 auto-refresh, token rotation support,
 * cookie-based token storage for Edge Middleware compatibility.
 */

import {
  Blog, Website, Category, Tag, MediaItem,
  UserAccount, RedirectItem, SystemAuditLog, BlogStatus,
} from '../types';

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

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
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
    }
  }

  setTokens(accessToken: string | null, refreshToken?: string | null) {
    this.token = accessToken;
    if (accessToken) {
      setCookie('jupsoft_auth_token', accessToken, 1); // 1 day (access token short-lived)
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
        setCookie('jupsoft_refresh_token', refreshToken, 7); // 7 days (refresh token)
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
      } catch {}
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = getCookie('jupsoft_auth_token') || localStorage.getItem('jupsoft_auth_token');
    }
    return this.token;
  }

  private async attemptRefresh(): Promise<string | null> {
    const rt = this.refreshTokenValue || getCookie('jupsoft_refresh_token');
    if (!rt) return null;

    try {
      const res = await fetch(`${getApiBase()}/admin/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });

      if (!res.ok) {
        this.clearTokens();
        return null;
      }

      const data = await res.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      this.clearTokens();
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

    const response = await fetch(`${getApiBase()}${endpoint}`, { ...options, headers });

    if (response.status === 204) return undefined as unknown as T;

    // --- 401 Auto-Refresh Logic (skip for auth login/refresh endpoints) ---
    const isAuthEndpoint = endpoint.includes('/admin/auth/login') || endpoint.includes('/admin/auth/refresh');
    if (response.status === 401 && !isAuthEndpoint) {
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
              .then((r) => r.json().then(resolve))
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
        this.clearTokens();
        // Refresh failed — force clean logout without loop
        if (typeof window !== 'undefined') {
          try {
            ['jupsoft_cms_platform_store_v7', 'jupsoft_cms_platform_store_v6'].forEach((key) => {
              const rawStore = localStorage.getItem(key);
              if (rawStore) {
                const parsed = JSON.parse(rawStore);
                if (parsed?.state) {
                  parsed.state.isAuthenticated = false;
                  parsed.state.currentUser = null;
                  localStorage.setItem(key, JSON.stringify(parsed));
                }
              }
            });
          } catch {}

          if (window.location.pathname !== '/login') {
            window.location.href = '/login?session=expired';
          }
        }
        throw new Error('Session expired. Please log in again.');
      }

      // Retry the original request with new token
      headers.set('Authorization', `Bearer ${newToken}`);
      const retryResponse = await fetch(`${getApiBase()}${endpoint}`, { ...options, headers });
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
    const data = await this.request<{ accessToken: string; refreshToken: string; user: UserAccount }>(
      '/admin/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    );
    if (data.accessToken) {
      this.setTokens(data.accessToken, data.refreshToken);
    }
    return data;
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

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    return this.request('/admin/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  logout() {
    this.clearTokens();
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

  private formatBlogPayload(blog: Partial<Blog>): Record<string, any> {
    // Format translations dictionary to backend DTO array
    const transArray: any[] = [];
    if (blog.translations && !Array.isArray(blog.translations)) {
      for (const [lang, t] of Object.entries(blog.translations as Record<string, any>)) {
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

    const cleanWebsiteId = (blog.websiteId && blog.websiteId !== 'all') ? blog.websiteId : 'site-cloud';

    // Strictly whitelist only properties defined in CreateBlogDto / UpdateBlogDto
    const payload: Record<string, any> = {
      websiteId: cleanWebsiteId,
      translations: transArray,
    };

    if (blog.featuredImage !== undefined && blog.featuredImage !== null) payload.featuredImage = blog.featuredImage;
    if (blog.featuredImageAlt !== undefined && blog.featuredImageAlt !== null) payload.featuredImageAlt = blog.featuredImageAlt;
    if (blog.status !== undefined && blog.status !== null) payload.status = blog.status;
    if (blog.readTimeMinutes !== undefined && blog.readTimeMinutes !== null) payload.readTimeMinutes = blog.readTimeMinutes;
    if (Array.isArray(blog.categoryIds)) payload.categoryIds = blog.categoryIds;
    if (Array.isArray(blog.tagIds)) payload.tagIds = blog.tagIds;

    return payload;
  }

  async createBlog(blog: Partial<Blog>): Promise<Blog> {
    const payload = this.formatBlogPayload(blog);
    return this.request('/admin/blogs', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateBlog(id: string, updates: Partial<Blog>): Promise<Blog> {
    const payload = this.formatBlogPayload(updates);
    return this.request(`/admin/blogs/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  async deleteBlog(id: string): Promise<{ success: boolean }> {
    return this.request(`/admin/blogs/${id}`, { method: 'DELETE' });
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

  async inviteUser(user: { email: string; name: string; websiteId: string; role: string; password?: string }): Promise<UserAccount> {
    return this.request('/admin/users/invite', { method: 'POST', body: JSON.stringify(user) });
  }

  async updateUserRole(id: string, role: string, websiteId: string): Promise<UserAccount> {
    return this.request(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role, websiteId }) });
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

}


export const apiClient = new ApiClient();
