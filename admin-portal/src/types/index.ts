export type UserRole = 
  | 'Super Admin' 
  | 'Website Admin' 
  | 'Role Admin' 
  | 'Editor' 
  | 'Content Writer' 
  | 'Publisher' 
  | 'SEO Manager';

export type BlogStatus = 'Draft' | 'Under Review' | 'Approved' | 'Scheduled' | 'Published' | 'Archived';

export type LanguageCode = 'en' | 'hi' | 'fr' | 'ar';

export type PermissionScope = 
  | 'blog.create'
  | 'blog.edit_own'
  | 'blog.edit_assigned'
  | 'blog.review_approve'
  | 'blog.publish_schedule'
  | 'seo.edit'
  | 'site.manage'
  | 'users.manage';

export interface Website {
  id: string;
  name: string;
  domain: string;
  logoUrl: string;
  description: string;
  apiKey: string;
  s3Prefix: string;
  status: 'active' | 'inactive';
  defaultLanguage: LanguageCode;
  supportedLanguages: LanguageCode[];
  revalidateWebhookUrl: string;
  createdAt: string;
}

export interface Category {
  id: string;
  websiteId: string;
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string;
  count?: number;
}

export interface Tag {
  id: string;
  websiteId: string;
  name: string;
  slug: string;
  count?: number;
}

export interface BlogSEO {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  canonicalUrl: string;
  focusKeyword: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
}

export interface BlogTranslation {
  id: string;
  blogId: string;
  languageCode: LanguageCode;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // HTML or JSON
  seo: BlogSEO;
}

export interface WorkflowLog {
  id: string;
  blogId: string;
  fromStatus: BlogStatus;
  toStatus: BlogStatus;
  changedBy: string;
  role: UserRole;
  notes?: string;
  timestamp: string;
}

export interface Blog {
  id: string;
  websiteId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  featuredImage: string;
  featuredImageAlt: string;
  status: BlogStatus;
  publishDate?: string;
  scheduledAt?: string;
  publishedBy?: string;
  viewCount: number;
  readTimeMinutes: number;
  categoryIds: string[];
  tagIds: string[];
  translations: Record<LanguageCode, BlogTranslation>;
  workflowLogs: WorkflowLog[];
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  websiteId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  s3Key: string;
  cdnUrl: string;
  altText: string;
  dimensions: { width: number; height: number };
  uploadedBy: string;
  createdAt: string;
}

export interface SEOCheckItem {
  id: string;
  label: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  scoreImpact: number;
}

export interface SEOScoreResult {
  score: number; // 0 - 100
  status: 'good' | 'average' | 'poor';
  checks: SEOCheckItem[];
}

// 301 Permanent Redirect Contract (TRD Section 7 & 17)
export interface RedirectItem {
  id: string;
  websiteId: string;
  fromSlug: string;
  toSlug: string;
  statusCode: 301;
  hitCount: number;
  createdAt: string;
}

export type AppModule = 
  | 'dashboard'
  | 'blogs'
  | 'workflow'
  | 'media'
  | 'taxonomy'
  | 'redirects'
  | 'analytics'
  | 'users'
  | 'settings'
  | 'plugins';

// User Account Contract (TRD Section 5 & 17)
export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
  // Scoped per website tenant: websiteId -> UserRole
  roleAssignments: Record<string, UserRole>;
  // For Role Admin: explicitly delegated roles they can invite and oversee
  managedRoles?: UserRole[];
  // Initial / temporary password for onboarding delivery (via Email or WhatsApp)
  tempPassword?: string;
  role?: UserRole;
  status: 'active' | 'suspended';
  lastLoginIp: string;
  createdAt: string;
  customModules?: AppModule[];
}

// System Audit Log Contract (TRD Section 15 & 17)
export interface SystemAuditLog {
  id: string;
  timestamp: string;
  userName: string;
  role: UserRole;
  websiteId: string;
  event: string;
  ipAddress: string;
  details: string;
}

// Author Analytics Contract (TRD Section 14)
export interface AuthorStats {
  authorId: string;
  authorName: string;
  authorAvatar: string;
  blogsWritten: number;
  publishedCount: number;
  totalViews: number;
  avgReadTimeMinutes: number;
}

// Enterprise Modular System & Plugin Registry Contract
export interface PlatformModuleConfig {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'content' | 'operations' | 'marketing' | 'system';
  enabled: boolean;
  allowedRoles: UserRole[];
  allowedWebsites: string[]; // ['all'] or specific website IDs
  icon: string;
  isCustomPlugin?: boolean;
  route?: string;
  author?: string;
  version?: string;
}

