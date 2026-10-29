import { 
  Website, 
  Category, 
  Tag, 
  Blog, 
  MediaItem, 
  BlogSEO, 
  BlogTranslation, 
  LanguageCode,
  UserAccount,
  RedirectItem,
  SystemAuditLog,
  PlatformModuleConfig
} from '../types';

export const createEmptySEO = (): BlogSEO => ({
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  canonicalUrl: '',
  focusKeyword: '',
  robots: 'index, follow',
  schemaType: 'BlogPosting',
  customSchema: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  twitterTitle: '',
  twitterDescription: '',
  twitterImage: '',
});

export const createEmptyTranslation = (blogId: string, lang: LanguageCode): BlogTranslation => ({
  id: `trans-${blogId}-${lang}`,
  blogId,
  languageCode: lang,
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  seo: createEmptySEO(),
});

// Production Tenant Setup (Dynamically loaded from PostgreSQL via /v1/websites)
export const INITIAL_WEBSITES: Website[] = [];

export const INITIAL_CATEGORIES: Record<string, Category[]> = {};

export const INITIAL_TAGS: Record<string, Tag[]> = {};

// Initial Team Accounts (dynamically loaded from PostgreSQL Database)
export const INITIAL_USERS: UserAccount[] = [];

// Initial 301 Permanent Redirects (dynamically loaded from PostgreSQL Database)
export const INITIAL_REDIRECTS: RedirectItem[] = [];

// Initial System Audit Logs (dynamically loaded from PostgreSQL Database)
export const INITIAL_AUDIT_LOGS: SystemAuditLog[] = [];

// Initial Production Starter Blogs (TRD Section 1, 2, 7 & 17)
// Initial Production Starter Blogs (empty - dynamically loaded from NestJS Backend API)
export const INITIAL_BLOGS: Blog[] = [];

// Initial Production Media Library (empty - dynamically loaded from S3/Backend API)
export const INITIAL_MEDIA: MediaItem[] = [];

// Production Master Modules & Plugin Directory
export const INITIAL_MODULES: PlatformModuleConfig[] = [
  {
    id: 'dashboard',
    name: 'Executive Dashboard',
    description: 'Cross-website overview, publishing trend metrics, and activity logs.',
    category: 'core',
    enabled: true,
    allowedRoles: ['Super Admin', 'Website Admin', 'Role Admin', 'Editor', 'Content Writer', 'SEO Manager', 'Publisher'],
    allowedWebsites: ['all'],
    icon: 'LayoutDashboard',
    route: '/dashboard',
    version: '1.2.0',
    author: 'Jupsoft Core',
  },
  {
    id: 'blogs',
    name: 'Multi-Language Blog Studio',
    description: 'Distraction-free Tiptap editorial writing canvas, 4-language translations, and automated WebP media insertion.',
    category: 'content',
    enabled: true,
    allowedRoles: ['Super Admin', 'Website Admin', 'Role Admin', 'Editor', 'Content Writer', 'SEO Manager', 'Publisher'],
    allowedWebsites: ['all'],
    icon: 'FileText',
    route: '/blogs',
    version: '2.0.0',
    author: 'Jupsoft Editorial',
  },
  {
    id: 'workflow',
    name: 'Editorial Workflow Board',
    description: '6-stage lifecycle governance (Draft, Review, Approved, Scheduled, Published, Archived) with activity log.',
    category: 'operations',
    enabled: true,
    allowedRoles: ['Super Admin', 'Website Admin', 'Role Admin', 'Editor', 'Publisher'],
    allowedWebsites: ['all'],
    icon: 'Kanban',
    route: '/workflow',
    version: '1.4.0',
    author: 'Jupsoft Workflow',
  },
  {
    id: 'media',
    name: 'Automated WebP Media Studio',
    description: 'Cloudflare/S3 media assets, client/server WebP conversion, dimension extraction, and alt-text SEO tags.',
    category: 'content',
    enabled: true,
    allowedRoles: ['Super Admin', 'Website Admin', 'Role Admin', 'Editor', 'Content Writer', 'SEO Manager', 'Publisher'],
    allowedWebsites: ['all'],
    icon: 'Image',
    route: '/media',
    version: '2.1.0',
    author: 'Jupsoft Media',
  },
  {
    id: 'taxonomy',
    name: 'Categories & Tags Engine',
    description: 'Hierarchical category architecture, slug management, tag clouds, and live article counters.',
    category: 'content',
    enabled: true,
    allowedRoles: ['Super Admin', 'Website Admin', 'Role Admin', 'Editor', 'Content Writer', 'SEO Manager'],
    allowedWebsites: ['all'],
    icon: 'Tags',
    route: '/taxonomy',
    version: '1.1.0',
    author: 'Jupsoft Core',
  },
  {
    id: 'analytics',
    name: 'Search & Performance Analytics',
    description: 'Google Search Console insights, page click-through rates, top keyword rankings, and website traffic comparisons.',
    category: 'marketing',
    enabled: true,
    allowedRoles: ['Super Admin', 'Website Admin', 'Role Admin', 'SEO Manager'],
    allowedWebsites: ['all'],
    icon: 'BarChart3',
    route: '/analytics',
    version: '1.3.0',
    author: 'Jupsoft SEO',
  },
  {
    id: 'redirects',
    name: 'Old Link Redirects (301)',
    description: 'Automated permanent redirect management on URL updates, link mapping, and broken link prevention.',
    category: 'marketing',
    enabled: true,
    allowedRoles: ['Super Admin', 'Website Admin', 'SEO Manager', 'Publisher'],
    allowedWebsites: ['all'],
    icon: 'ArrowRightLeft',
    route: '/redirects',
    version: '1.0.0',
    author: 'Jupsoft SEO',
  },
  {
    id: 'users',
    name: 'Team Roles & Permissions',
    description: 'Website role delegation, team member assignment, secure credential generation, and permissions table.',
    category: 'system',
    enabled: true,
    allowedRoles: ['Super Admin', 'Website Admin', 'Role Admin'],
    allowedWebsites: ['all'],
    icon: 'Users',
    route: '/users',
    version: '2.0.0',
    author: 'Jupsoft Security',
  },
  {
    id: 'settings',
    name: 'Website & API Settings',
    description: 'Multi-website domain mapping, API key rotation, website sync webhooks, and storage settings.',
    category: 'system',
    enabled: true,
    allowedRoles: ['Super Admin', 'Website Admin'],
    allowedWebsites: ['all'],
    icon: 'Settings',
    route: '/settings',
    version: '1.5.0',
    author: 'Jupsoft Core',
  },
  {
    id: 'plugins',
    name: 'Plugin & Custom Feature Manager',
    description: 'Admin authority to toggle core modules, assign custom feature flags, and install extensible modular extensions.',
    category: 'system',
    enabled: true,
    allowedRoles: ['Super Admin', 'Website Admin'],
    allowedWebsites: ['all'],
    icon: 'Boxes',
    route: '/plugins',
    version: '1.0.0',
    author: 'Jupsoft Platform',
  },
];

