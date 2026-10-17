/**
 * Media URL & S3 Key utilities
 * Ensures robust image loading across environments and guarantees all media
 * assets resolve directly to AWS S3 bucket blogary (ap-south-1).
 */

import { API_BASE } from '../services/apiClient';

export const AWS_S3_ORIGIN = 'https://blogary.s3.ap-south-1.amazonaws.com';

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

  // Look for 'avatars/' prefix
  const avatarsIndex = pathOrUrl.indexOf('avatars/');
  if (avatarsIndex !== -1) {
    return pathOrUrl.substring(avatarsIndex).replace(/^\/+/, '');
  }

  // Look for 'logos/' prefix
  const logosIndex = pathOrUrl.indexOf('logos/');
  if (logosIndex !== -1) {
    return pathOrUrl.substring(logosIndex).replace(/^\/+/, '');
  }

  // Strip protocol, host, and leading uploads/
  return pathOrUrl
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/?uploads\//, '')
    .replace(/^\/+/, '');
}

/**
 * Resolves any image URL (raw S3 key, relative /uploads path, legacy domain URL)
 * into a direct, high-speed AWS S3 cloud URL.
 */
export function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // 1. Direct AWS S3 URL - keep as-is
  if (url.startsWith(AWS_S3_ORIGIN) || url.includes('.amazonaws.com/')) {
    return url;
  }

  // 2. Extract S3 key if present (blogs/..., avatars/..., logos/...)
  const s3Key = extractS3Key(url);
  if (s3Key && (s3Key.startsWith('blogs/') || s3Key.startsWith('avatars/') || s3Key.startsWith('logos/'))) {
    return `${AWS_S3_ORIGIN}/${s3Key}`;
  }

  // 3. Inactive cdn.jupsoft.com or legacy platform upload URLs
  if (url.includes('cdn.jupsoft.com') || url.includes('/uploads/')) {
    if (s3Key) return `${AWS_S3_ORIGIN}/${s3Key}`;
  }

  // 4. External third-party URLs (e.g. Unsplash, Gravatar)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // 5. Fallback for any relative path
  return s3Key ? `${AWS_S3_ORIGIN}/${s3Key}` : url;
}
