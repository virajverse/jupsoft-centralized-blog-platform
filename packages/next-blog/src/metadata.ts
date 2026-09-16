import type { Metadata } from 'next';
import { jupsoft } from './client.js';

import type { PageProps } from './types.js';

export async function generateBlogMeta(
  { params, searchParams }: PageProps,
  client?: typeof jupsoft
): Promise<Metadata> {
  const activeClient = client || jupsoft;
  // Fix Bug #3: Safely resolve params without crashing on undefined or synchronous params
  const resolvedParams = (params ? await params : {}) as { slug?: string };
  const slug = resolvedParams?.slug || '';
  if (!slug) {
    return { title: 'Article Not Found' };
  }

  const sp = (searchParams ? await searchParams : {}) as Record<string, string | undefined>;
  // Fix Bug #20: Respect client's defaultLang instead of hardcoded 'en'
  const lang = sp?.lang || activeClient.defaultLang || 'en';
  const blog = await activeClient.getBlogBySlug(slug, lang);

  if (!blog) {
    return { title: 'Article Not Found' };
  }

  const baseUrl = (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SITE_DOMAIN : '') || '';

  return {
    title: blog.seo?.metaTitle || blog.title,
    description: blog.seo?.metaDescription || blog.excerpt,
    alternates: {
      canonical: baseUrl ? `${baseUrl}/blog/${slug}${lang !== activeClient.defaultLang ? `?lang=${lang}` : ''}` : undefined,
      languages: baseUrl ? {
        'en': `${baseUrl}/blog/${slug}?lang=en`,
        'hi': `${baseUrl}/blog/${slug}?lang=hi`,
        'fr': `${baseUrl}/blog/${slug}?lang=fr`,
        'ar': `${baseUrl}/blog/${slug}?lang=ar`,
        'x-default': `${baseUrl}/blog/${slug}`,
      } : undefined,
    },
    openGraph: {
      title: blog.seo?.ogTitle || blog.title,
      description: blog.seo?.ogDescription || blog.excerpt,
      images: blog.featuredImage ? [blog.featuredImage] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.seo?.twitterTitle || blog.title,
      description: blog.seo?.twitterDescription || blog.excerpt,
      images: blog.seo?.twitterImage ? [blog.seo.twitterImage] : (blog.featuredImage ? [blog.featuredImage] : []),
    },
  };
}
