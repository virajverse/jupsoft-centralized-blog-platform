/**
 * Jupsoft Centralized Blog CMS — API Client Service
 * TRD §16 (API Design) + §17 (Integration)
 *
 * All endpoints match the NestJS backend exactly.
 * Uses Vite env vars (VITE_API_URL).
 */

import {
  Blog, Website, Category, Tag, MediaItem,
  UserAccount, RedirectItem, SystemAuditLog, BlogStatus, LanguageCode
} from '../types';

// API base URL from Next.js environment or localhost default
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('jupsoft_auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('jupsoft_auth_token', token);
      } else {
        localStorage.removeItem('jupsoft_auth_token');
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('jupsoft_auth_token');
    }
    return this.token;
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

    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

    if (response.status === 204) return undefined as unknown as T;

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
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    if (data.accessToken) this.setToken(data.accessToken);
    return data;
  }

  async getProfile(): Promise<UserAccount> {
    return this.request('/admin/auth/me');
  }

  logout() {
    this.setToken(null);
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

  async createBlog(blog: Partial<Blog>): Promise<Blog> {
    return this.request('/admin/blogs', { method: 'POST', body: JSON.stringify(blog) });
  }

  async updateBlog(id: string, updates: Partial<Blog>): Promise<Blog> {
    return this.request(`/admin/blogs/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  }

  async deleteBlog(id: string): Promise<{ success: boolean }> {
    return this.request(`/admin/blogs/${id}`, { method: 'DELETE' });
  }

  // TRD §7: Workflow transitions via dedicated endpoints (not PATCH /status)
  async submitBlogForReview(id: string, notes?: string): Promise<Blog> {
    return this.request(`/admin/blogs/${id}/submit`, { method: 'POST', body: JSON.stringify({ notes }) });
  }

  async approveBlog(id: string, notes?: string): Promise<Blog> {
    return this.request(`/admin/blogs/${id}/approve`, { method: 'POST', body: JSON.stringify({ notes }) });
  }

  async publishBlog(id: string, scheduledAt?: string): Promise<Blog> {
    return this.request(`/admin/blogs/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify(scheduledAt ? { scheduledAt } : {})
    });
  }

  async archiveBlog(id: string): Promise<Blog> {
    return this.request(`/admin/blogs/${id}/archive`, { method: 'POST', body: JSON.stringify({}) });
  }

  // ─── Taxonomy (TRD §8) ────────────────────────────────────────────────────

  async getCategories(websiteId?: string): Promise<Category[]> {
    const qs = websiteId && websiteId !== 'all' ? `?websiteId=${websiteId}` : '';
    return this.request(`/v1/categories${qs}`);
  }

  async getTags(websiteId?: string): Promise<Tag[]> {
    const qs = websiteId && websiteId !== 'all' ? `?websiteId=${websiteId}` : '';
    return this.request(`/v1/tags${qs}`);
  }

  // ─── Media Library (TRD §10) ──────────────────────────────────────────────

  async getMedia(websiteId?: string): Promise<MediaItem[]> {
    const qs = websiteId && websiteId !== 'all' ? `?websiteId=${websiteId}` : '';
    return this.request(`/admin/media${qs}`);
  }

  async uploadMedia(
    file: File, websiteId: string, altText?: string
  ): Promise<{ id: string; cdnUrl: string; thumbnailUrl: string; mediumUrl: string; fileName: string }> {
    const form = new FormData();
    form.append('file', file);
    const qs = `?websiteId=${websiteId}${altText ? `&altText=${encodeURIComponent(altText)}` : ''}`;
    return this.request(`/admin/media/upload${qs}`, { method: 'POST', body: form });
  }

  async getPresignedUploadUrl(fileName: string, fileType: string, websiteId: string) {
    return this.request<{ uploadUrl: string; s3Key: string; cdnUrl: string; fileName: string }>(
      '/admin/media/presigned-url',
      { method: 'POST', body: JSON.stringify({ fileName, fileType, websiteId }) }
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

  // ─── Users (TRD §5) ───────────────────────────────────────────────────────

  async getUsers(): Promise<UserAccount[]> {
    return this.request('/admin/users');
  }

  async inviteUser(user: { email: string; name: string; websiteId: string; role: string }): Promise<UserAccount> {
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
}

export const apiClient = new ApiClient();
