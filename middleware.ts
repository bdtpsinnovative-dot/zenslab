import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CLOUDFLARE_PUBLIC_CACHE_HEADER = 'public, max-age=3600, stale-while-revalidate=86400';

const NON_CACHEABLE_PREFIXES = [
  '/api/',
  '/cart',
  '/favorites',
  '/login',
  '/register',
  '/my-orders',
  '/profile',
];

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const isGetOrHead = request.method === 'GET' || request.method === 'HEAD';
  const isRscOrPrefetch =
    request.headers.get('rsc') === '1' ||
    request.headers.get('next-router-prefetch') === '1' ||
    Boolean(request.headers.get('next-router-state-tree')) ||
    request.nextUrl.searchParams.has('_rsc');

  const isNonCacheable = NON_CACHEABLE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );

  if (!isGetOrHead || isNonCacheable || isRscOrPrefetch) {
    response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  } else {
    response.headers.set('Cloudflare-CDN-Cache-Control', CLOUDFLARE_PUBLIC_CACHE_HEADER);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
