/**
 * Media URL & S3 Key utilities
 * Ensures robust image loading across environments (Local Dev vs Production AWS EC2)
 * and safely rewrites inactive domains like cdn.jupsoft.com to the active platform domain.
 */

import { API_BASE } from '../services/apiClient';

/**
 * Extracts a clean relative S3 key (e.g. 'blogs/site-cloud/2026/09/image.webp')
 * from full URLs, domain paths, or relative paths.
 */
export function extractS3Key(pathOrUrl?: string): string {
  if (!pathOrUrl || pathOrUrl.startsWith('data:')) return '';

  // Look for canonical 'blogs/' prefix
  const blogsIndex = pathOrUrl.indexOf('blogs/');
  if (blogsIndex !== -1) {
    return pathOrUrl.substring(blogsIndex).replace(/^\/+/, '');
  }

  // Strip protocol, host, and leading uploads/
  return pathOrUrl
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/?uploads\//, '')
    .replace(/^\/+/, '');
}

/**
 * Resolves any image URL (raw S3 key, relative /uploads path, or inactive cdn.jupsoft.com URL)
 * into a working, accessible URL for the browser.
 */
export function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  const isBrowser = typeof window !== 'undefined';
  const hostname = isBrowser ? window.location.hostname : '';
  const isProductionAws = hostname.includes('jupsoft.com') || hostname.includes('blogary');

  // Active base for uploads:
  // On AWS production: use relative /uploads (or https://blogary.jupsoft.com/uploads)
  // In local dev: use http://localhost:4000/uploads (served by NestJS backend)
  const uploadsBase = isProductionAws
    ? `${window.location.origin}/uploads`
    : `${API_BASE.replace(/\/+$/, '')}/uploads`;

  // 1. Rewrite inactive cdn.jupsoft.com URLs to the active server endpoint
  if (url.includes('cdn.jupsoft.com')) {
    const s3Key = extractS3Key(url);
    return `${uploadsBase}/${s3Key}`;
  }

  // 2. Relative /uploads/... paths
  if (url.startsWith('/uploads/')) {
    return isProductionAws ? url : `${API_BASE.replace(/\/+$/, '')}${url}`;
  }
  if (url.startsWith('uploads/')) {
    return isProductionAws ? `/${url}` : `${API_BASE.replace(/\/+$/, '')}/${url}`;
  }

  // 3. Raw S3 key like 'blogs/site-cloud/2026/09/image.webp'
  if (url.startsWith('blogs/')) {
    return `${uploadsBase}/${url}`;
  }

  // 4. External URLs (Unsplash, Gravatar, external CDNs)
  return url;
}
