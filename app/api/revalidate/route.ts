import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  purgeCloudflareZoneCache,
  ZENSLAB_CACHE_TAGS,
  zenslabProductTag,
} from '@/lib/zenslab-cache'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.REVALIDATE_SECRET?.trim()
  if (!secret) return false

  const headerSecret = req.headers.get('x-revalidate-secret')?.trim()
  if (headerSecret && headerSecret === secret) return true

  const auth = req.headers.get('authorization')?.trim()
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim()
    if (token === secret) return true
  }

  return false
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const revalidatedTags = new Set<string>()
  const revalidatedPaths = new Set<string>()

  const markTag = (tag: string) => {
    revalidateTag(tag, { expire: 0 })
    revalidatedTags.add(tag)
  }

  const markPath = (path: string) => {
    revalidatePath(path)
    revalidatedPaths.add(path)
  }

  const scope = typeof body?.scope === 'string' ? body.scope : ''
  const includeAlgorithm = Boolean(body?.includeAlgorithm)
  const productIds: Array<string | number> = Array.isArray(body?.productIds)
    ? body.productIds
    : body?.productId !== undefined && body?.productId !== null
      ? [body.productId]
      : []

  // Support optional Supabase Database Webhook payload format
  const webhookTable = typeof body?.table === 'string' ? body.table : ''

  if (scope === 'discounts' || webhookTable === 'discounts' || webhookTable === 'discount_rules') {
    markTag(ZENSLAB_CACHE_TAGS.DISCOUNTS)
    markPath('/woodslab')
    markPath('/woodslab/product')
  } else if (scope === 'algorithm') {
    markTag(ZENSLAB_CACHE_TAGS.ALGORITHM)
  } else if (Array.isArray(body?.tags) && body.tags.length > 0) {
    for (const t of body.tags) {
      if (typeof t === 'string' && t.trim()) {
        markTag(t.trim())
      }
    }
  } else {
    // Default / products / all: clear products, filters, discounts, sitemap
    // (Keep 7-day algorithm cache intact unless includeAlgorithm === true)
    markTag(ZENSLAB_CACHE_TAGS.PRODUCTS)
    markTag(ZENSLAB_CACHE_TAGS.FILTERS)
    markTag(ZENSLAB_CACHE_TAGS.DISCOUNTS)
    markTag(ZENSLAB_CACHE_TAGS.SITEMAP)

    if (includeAlgorithm) {
      markTag(ZENSLAB_CACHE_TAGS.ALGORITHM)
    }

    markPath('/')
    markPath('/woodslab')
    markPath('/woodslab/product')
    markPath('/sitemap.xml')
  }

  for (const pid of productIds) {
    markTag(zenslabProductTag(pid))
  }

  if (Array.isArray(body?.paths)) {
    for (const p of body.paths) {
      if (typeof p === 'string' && p.startsWith('/')) {
        markPath(p)
      }
    }
  }

  // Purge Cloudflare Edge cache (unless explicitly skipped)
  const skipCloudflare = body?.purgeCloudflare === false
  const cfResult = skipCloudflare
    ? { skipped: true, ok: true }
    : await purgeCloudflareZoneCache(Array.isArray(body?.urls) ? body.urls : undefined)

  return NextResponse.json(
    {
      ok: true,
      revalidatedAt: new Date().toISOString(),
      tags: Array.from(revalidatedTags),
      paths: Array.from(revalidatedPaths),
      cloudflare: cfResult,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Cloudflare-CDN-Cache-Control': 'no-store',
      },
    }
  )
}
