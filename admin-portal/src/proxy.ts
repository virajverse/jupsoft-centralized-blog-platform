import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/api/auth'];

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/blogs',
  '/workflow',
  '/media',
  '/taxonomy',
  '/redirects',
  '/analytics',
  '/users',
  '/settings',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow root homepage and public paths
  if (pathname === '/' || PUBLIC_PATHS.some((p) => p !== '/' && pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 2. Allow Next.js internals, static files, and all public images/assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Any static file extension (.png, .jpg, .svg, .ico, .json, etc.)
  ) {
    return NextResponse.next();
  }

  // 3. Check if current path requires authentication
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next();
  }

  // 4. Check for auth token in cookies
  const token = request.cookies.get('jupsoft_auth_token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// For backward compatibility
export const middleware = proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static chunks)
     * - _next/image (Next.js image optimization)
     * - favicon.ico and any file with an extension (.png, .jpg, .svg, .json, .webp, etc.)
     * - login page
     */
    '/((?!_next/static|_next/image|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)$).*)',
  ],
};
