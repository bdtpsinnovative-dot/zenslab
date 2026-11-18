import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public GET/HEAD HTML page shells safe to cache on Cloudflare Edge for 1 year.
// Product stock & live status are NEVER embedded in these HTML shells — they are
// loaded client-side via Server Actions (POST), which always bypass Cloudflare cache.
const PUBLIC_CACHEABLE_EXACT_PATHS = new Set([
  '/',
  '/about',
  '/contact',
  '/franchisee',
  '/catalog',
  '/woodslab',
  '/woodslab/product',
  '/sitemap.xml',
  '/robots.txt',
])

const PRIVATE_PREFIXES = [
  '/api/',
  '/cart',
  '/favorites',
  '/login',
  '/register',
  '/my-orders',
  '/profile',
]

function isNextRscRequest(req: NextRequest): boolean {
  return (
    req.headers.get('rsc') === '1' ||
    req.headers.get('next-router-prefetch') === '1' ||
    req.headers.has('next-router-state-tree') ||
    req.headers.has('next-action') ||
    req.nextUrl.searchParams.has('_rsc')
  )
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Let /api/proxy-image manage its own image caching headers
  if (pathname === '/api/proxy-image') {
    return NextResponse.next()
  }

  const res = NextResponse.next()

  // Never cache non-GET/HEAD (POST Server Actions, /api/algorithm/events, etc.)
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.headers.set('Cloudflare-CDN-Cache-Control', 'no-store')
    res.headers.set('CDN-Cache-Control', 'no-store')
    return res
  }

  // Never cache Next.js RSC/prefetch or private/API routes on Cloudflare Edge
  const isPrivate = PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}`)
  )
  if (isPrivate || isNextRscRequest(req)) {
    res.headers.set('Cloudflare-CDN-Cache-Control', 'no-store')
    res.headers.set('CDN-Cache-Control', 'no-store')
    return res
  }

  if (PUBLIC_CACHEABLE_EXACT_PATHS.has(pathname)) {
    // Cache public HTML page shells on Cloudflare Edge for 1 year (purged via /api/revalidate)
    res.headers.set('Cloudflare-CDN-Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400')
    res.headers.set('CDN-Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400')
    res.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
    return res
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|pdf)$).*)',
  ],
}
