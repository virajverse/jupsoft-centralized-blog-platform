export interface JupsoftConfig {
  apiUrl?: string;
  apiKey?: string;
  websiteId?: string;
  defaultLang?: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  featuredImage?: string;
  authorName: string;
  publishedAt?: string;
  readTimeMinutes: number;
  categoryIds: string[];
  tagIds: string[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    canonicalUrl?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
  };
  canonicalUrl?: string;
  schemaJsonLd?: Record<string, unknown>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface BlogListResponse {
  success: boolean;
  meta: { website: string; total: number; page: number; limit: number };
  data: BlogPost[];
}

export type SupportedLocale = 'en' | 'hi' | 'fr' | 'ar';

export interface PageProps {
  params?: Promise<{ slug?: string }> | { slug?: string };
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}

export interface BlogListPageProps {
  params?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
  searchParams?: Promise<{
    page?: string;
    category?: string;
    tag?: string;
    q?: string;
    lang?: string;
  }> | {
    page?: string;
    category?: string;
    tag?: string;
    q?: string;
    lang?: string;
  };
}
