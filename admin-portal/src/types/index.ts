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
  ownerName?: string;
  ownerEmail?: string;
  notificationEmails?: string[];
  monthlyBlogTarget?: number;
  targetCadence?: string;
  targetAlertEnabled?: boolean;
  targetAlertDays?: number[];
  targetAlertSchedule?: string;
  digestSchedule?: string;
  recipientScope?: string;
  defaultCoverUrl?: string;
  lastTargetAlertSentAt?: string;
  createdAt: string;
  _count?: {
    blogs?: number;
    categories?: number;
    tags?: number;
  };
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
  authorId?: string | null;
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
  | 'plugins'
  | 'support';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  websiteId: string;
  userId?: string | null;
  userName: string;
  userEmail: string;
  userRole: string;
  subject: string;
  description: string;
  screenshotUrl: string;
  pageUrl: string;
  errorDetails: string;
  status: TicketStatus;
  priority: TicketPriority;
  adminNotes: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  website?: {
    id: string;
    name: string;
    domain: string;
  };
}

// User Account Contract (TRD Section 5 & 17)
export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  // Scoped per website tenant: websiteId -> UserRole
  roleAssignments: Record<string, UserRole>;
  // For Role Admin: explicitly delegated roles they can invite and oversee
  managedRoles?: UserRole[];
  // Initial / temporary password for onboarding delivery (via Email or WhatsApp)
  tempPassword?: string;
  role?: UserRole;
  roles?: string[];
  status: 'active' | 'suspended';
  reportsTo?: string;
  lastLoginIp: string;
  createdAt: string;
  customModules?: AppModule[];
}

// System Audit Log Contract (TRD Section 15 & 17)
// Active Login Session Contract
export interface ActiveSession {
  id: string;
  userId: string;
  device: string;
  browser: string;
  os: string;
  ipAddress: string;
  location?: string;
  isp?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  userAgent?: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

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

export interface TeamMemberTimeSpent {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  todayMinutes: number;
  weekMinutes: number;
  totalMinutes: number;
  isOnline: boolean;
  lastHeartbeat: string | null;
  lastSeen: string;
}

// In-App Notification Contract (Phase 4 & 5 SaaS UX)
export interface SystemNotification {
  id: string;
  userId: string;
  websiteId: string;
  title: string;
  message: string;
  type: 'TARGET_DEFICIT' | 'BLOG_PUBLISHED' | 'PIPELINE_STUCK' | 'SYSTEM_ALERT';
  link: string;
  isRead: boolean;
  createdAt: string;
  website?: {
    id: string;
    name: string;
    domain: string;
    logoUrl?: string;
  };
}



