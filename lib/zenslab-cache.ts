import { unstable_cache } from 'next/cache'
import { supabaseServer } from '@/lib/supabase-server'

export const ONE_YEAR_SECONDS = 31536000
export const ONE_WEEK_SECONDS = 604800

export const ZENSLAB_CACHE_TAGS = {
  PRODUCTS: 'zenslab:products',
  FILTERS: 'zenslab:filters',
  DISCOUNTS: 'zenslab:discounts',
  ALGORITHM: 'zenslab:algorithm',
  SITEMAP: 'zenslab:sitemap',
} as const

export function zenslabProductTag(id: string | number) {
  return `zenslab:product:${String(id)}`
}

export type CategoryKey = 'all' | 'slabs' | 'rough' | 'leg' | 'chair'

export type FilterState = {
  type: string
  material: string
  panel: string
  status: string
  lengthMin: string
  lengthMax: string
  widthMin: string
  widthMax: string
  thickMin: string
  thickMax: string
  priceMin: string
  priceMax: string
  q: string
  discount: string
}

const TABLE = 'products'
const LIST_SELECT_META =
  'id,name,sku,barcode,price,image_url,status,length_cm,width_cm,thickness_cm,specs,updated_at,created_at,category_id'
const RECOMMEND_SELECT_META =
  'id,name,sku,price,image_url,status,specs,updated_at,favorite_count'

export function getCategoryFilter(category: CategoryKey): {
  categoryId?: string
  specType?: string
  excludeCategories?: string[]
} {
  if (category === 'rough') return { categoryId: 'rough_wood' }
  if (category === 'leg') return { categoryId: 'SLABS', specType: 'Leg' }
  if (category === 'chair') return { categoryId: 'SLABS', specType: 'Chair/Stool' }
  if (category === 'slabs') return { categoryId: 'SLABS', specType: 'Wood slabs' }
  if (category === 'all') return { categoryId: 'SLABS' }
  return { categoryId: 'SLABS', specType: 'Wood slabs' }
}

// ============================================================
// LIVE (NEVER CACHED) STOCK & STATUS QUERIES
// ============================================================

export type LiveStockInfo = {
  id: number | string
  status: string | null
  stock: Array<{ qty: number | string | null }>
}

export async function fetchLiveStockMap(
  productIds: Array<number | string>
): Promise<Map<string, LiveStockInfo>> {
  const map = new Map<string, LiveStockInfo>()
  const uniqueIds = Array.from(new Set(productIds.filter((v) => v !== null && v !== undefined && v !== '')))
  if (uniqueIds.length === 0) return map

  const { data, error } = await supabaseServer
    .from(TABLE)
    .select('id, status, stock(qty)')
    .in('id', uniqueIds)

  if (error || !data) {
    if (error) console.error('[zenslab-cache] fetchLiveStockMap error:', error)
    return map
  }

  for (const row of data as any[]) {
    map.set(String(row.id), {
      id: row.id,
      status: row.status ?? null,
      stock: Array.isArray(row.stock) ? row.stock : [],
    })
  }
  return map
}

export async function fetchLiveProductDetailStock(id: string | number) {
  const { data, error } = await supabaseServer
    .from(TABLE)
    .select('id, status, favorite_count, stock(qty, branch_id, branches(branch_name))')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as {
    id: number | string
    status: string | null
    favorite_count: number | null
    stock: Array<{ qty: number | string | null; branch_id?: any; branches?: any }>
  }
}

// ============================================================
// 1-YEAR CACHED METADATA (AUTO-PURGED BY ADMIN)
// ============================================================

async function safeCached<T>(
  fn: () => Promise<T>,
  keyParts?: string[],
  options?: { revalidate?: number | false; tags?: string[] }
): Promise<T> {
  try {
    const cached = unstable_cache(fn, keyParts, options)
    return await cached()
  } catch (err) {
    console.warn('[zenslab-cache] unstable_cache fallback to direct query:', err)
    return await fn()
  }
}

export async function getCachedActiveDiscounts() {
  return safeCached(
    async () => {
      const { data, error } = await supabaseServer
        .from('discounts')
        .select('*, discount_rules(*)')
        .eq('active', true)
      if (error) return []
      return data || []
    },
    ['zenslab:active-discounts:v1'],
    {
      revalidate: ONE_YEAR_SECONDS,
      tags: [ZENSLAB_CACHE_TAGS.DISCOUNTS],
    }
  )
}

export async function getCachedMinMax(col: string, category: CategoryKey = 'all') {
  return safeCached(
    async () => {
      const { categoryId, specType, excludeCategories } = getCategoryFilter(category)

      let qMin = supabaseServer
        .from(TABLE)
        .select(col)
        .not(col, 'is', null)
        .order(col, { ascending: true })
        .limit(1)
        .single()
      let qMax = supabaseServer
        .from(TABLE)
        .select(col)
        .not(col, 'is', null)
        .order(col, { ascending: false })
        .limit(1)
        .single()

      if (categoryId) {
        qMin = (qMin as any).eq('category_id', categoryId)
        qMax = (qMax as any).eq('category_id', categoryId)
      }
      if (specType) {
        qMin = (qMin as any).eq('specs->>spec_type', specType)
        qMax = (qMax as any).eq('specs->>spec_type', specType)
      }
      if (excludeCategories?.length) {
        qMin = (qMin as any).not('category_id', 'in', `(${excludeCategories.join(',')})`)
        qMax = (qMax as any).not('category_id', 'in', `(${excludeCategories.join(',')})`)
      }

      const [{ data: minData }, { data: maxData }] = await Promise.all([qMin, qMax])
      return {
        min: minData ? (minData as any)[col] : null,
        max: maxData ? (maxData as any)[col] : null,
      }
    },
    ['zenslab:minmax:v1', col, category],
    {
      revalidate: ONE_YEAR_SECONDS,
      tags: [ZENSLAB_CACHE_TAGS.FILTERS, ZENSLAB_CACHE_TAGS.PRODUCTS],
    }
  )
}

export async function getCachedRangeValues(col: string, category: CategoryKey = 'all') {
  return safeCached(
    async () => {
      const { categoryId, specType, excludeCategories } = getCategoryFilter(category)

      let query = supabaseServer.from(TABLE).select(col).not(col, 'is', null).limit(2000)
      if (categoryId) query = query.eq('category_id', categoryId)
      if (specType) query = query.eq('specs->>spec_type', specType)
      if (excludeCategories?.length) {
        query = query.not('category_id', 'in', `(${excludeCategories.join(',')})`)
      }

      const { data } = await query
      if (!data) return []
      return data.map((r: any) => Number(r[col])).filter((n) => Number.isFinite(n))
    },
    ['zenslab:range-values:v1', col, category],
    {
      revalidate: ONE_YEAR_SECONDS,
      tags: [ZENSLAB_CACHE_TAGS.FILTERS, ZENSLAB_CACHE_TAGS.PRODUCTS],
    }
  )
}

export async function getCachedDistinctOptions(category: CategoryKey = 'all') {
  return safeCached(
    async () => {
      const { categoryId, specType, excludeCategories } = getCategoryFilter(category)

      let query = supabaseServer.from(TABLE).select('specs').limit(3000)
      if (categoryId) query = query.eq('category_id', categoryId)
      if (specType) query = query.eq('specs->>spec_type', specType)
      if (excludeCategories?.length) {
        query = query.not('category_id', 'in', `(${excludeCategories.join(',')})`)
      }

      const { data } = await query

      const sets = {
        type: new Set<string>(),
        material: new Set<string>(),
        panel: new Set<string>(),
      }

      data?.forEach((r: any) => {
        const s = r.specs || {}
        if (s.spec_type) sets.type.add(s.spec_type)
        if (s.material) sets.material.add(s.material)
        if (s.panel_craft) sets.panel.add(s.panel_craft)
      })

      return {
        type: Array.from(sets.type).sort((a, b) => a.localeCompare(b)),
        material: Array.from(sets.material).sort((a, b) => a.localeCompare(b)),
        panel: Array.from(sets.panel).sort((a, b) => a.localeCompare(b)),
      }
    },
    ['zenslab:distinct-options:v1', category],
    {
      revalidate: ONE_YEAR_SECONDS,
      tags: [ZENSLAB_CACHE_TAGS.FILTERS, ZENSLAB_CACHE_TAGS.PRODUCTS],
    }
  )
}

export async function getCachedProductDetailMeta(id: string) {
  return safeCached(
    async () => {
      // Select ONLY product columns (never join stock here)
      const { data } = await supabaseServer.from(TABLE).select('*').eq('id', id).single()
      return data || null
    },
    ['zenslab:product-meta:v1', String(id)],
    {
      revalidate: ONE_YEAR_SECONDS,
      tags: [ZENSLAB_CACHE_TAGS.PRODUCTS, zenslabProductTag(id)],
    }
  )
}

export async function getCachedProductListMeta(params: {
  page: number
  limit: number
  filters: FilterState
  category: CategoryKey
  discountFilter?: number[] | 'all' | null
}) {
  const { page, limit, filters, category, discountFilter } = params
  const discountKey = Array.isArray(discountFilter)
    ? [...discountFilter].sort((a, b) => a - b).join(',')
    : String(discountFilter ?? '')

  const cacheKey = JSON.stringify({
    page,
    limit,
    category,
    discountKey,
    type: filters.type || '',
    material: filters.material || '',
    panel: filters.panel || '',
    lengthMin: filters.lengthMin || '',
    lengthMax: filters.lengthMax || '',
    widthMin: filters.widthMin || '',
    widthMax: filters.widthMax || '',
    thickMin: filters.thickMin || '',
    thickMax: filters.thickMax || '',
    priceMin: filters.priceMin || '',
    priceMax: filters.priceMax || '',
    discount: filters.discount || 'all',
  })

  return safeCached(
    async () => {
      const offset = page * limit
      const { categoryId, specType, excludeCategories } = getCategoryFilter(category)

      let query = supabaseServer
        .from(TABLE)
        .select(LIST_SELECT_META, { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('status', { ascending: true })
        .order('updated_at', { ascending: false })

      if (categoryId) query = query.eq('category_id', categoryId)
      if (specType) query = query.eq('specs->>spec_type', specType)
      if (excludeCategories?.length) {
        query = query.not('category_id', 'in', `(${excludeCategories.join(',')})`)
      }

      if (Array.isArray(discountFilter) && discountFilter.length > 0) {
        query = query.in('id', discountFilter)
      }

      if (filters.type) query = query.eq('specs->>spec_type', filters.type)
      if (filters.material) query = query.eq('specs->>material', filters.material)
      if (filters.panel) query = query.eq('specs->>panel_craft', filters.panel)

      if (filters.lengthMin) query = query.gte('specs->>length_cm', Number(filters.lengthMin))
      if (filters.lengthMax) query = query.lte('specs->>length_cm', Number(filters.lengthMax))
      if (filters.widthMin) query = query.gte('specs->>width_cm', Number(filters.widthMin))
      if (filters.widthMax) query = query.lte('specs->>width_cm', Number(filters.widthMax))
      if (filters.thickMin) query = query.gte('specs->>thickness_cm', Number(filters.thickMin))
      if (filters.thickMax) query = query.lte('specs->>thickness_cm', Number(filters.thickMax))
      if (filters.priceMin) query = query.gte('price', Number(filters.priceMin))
      if (filters.priceMax) query = query.lte('price', Number(filters.priceMax))

      const { data, count, error } = await query
      if (error) {
        console.error('[zenslab-cache] getCachedProductListMeta failed:', error)
        return { data: [], count: 0 }
      }

      return { data: data || [], count: count || 0 }
    },
    ['zenslab:product-list-meta:v1', cacheKey],
    {
      revalidate: ONE_YEAR_SECONDS,
      tags: [ZENSLAB_CACHE_TAGS.PRODUCTS],
    }
  )
}

export async function getCachedSitemapProducts() {
  return safeCached(
    async () => {
      const { data } = await supabaseServer
        .from(TABLE)
        .select('id, updated_at')
        .eq('category_id', 'SLABS')
        .order('updated_at', { ascending: false })
        .limit(500)
      return data || []
    },
    ['zenslab:sitemap-products:v1'],
    {
      revalidate: ONE_YEAR_SECONDS,
      tags: [ZENSLAB_CACHE_TAGS.SITEMAP, ZENSLAB_CACHE_TAGS.PRODUCTS],
    }
  )
}

// ============================================================
// 7-DAY (WEEKLY) CACHED RECOMMENDATION ALGORITHM (WITHOUT STOCK)
// ============================================================

export async function getCachedRecommendProductsMeta(
  currentId: number | string,
  specs: any,
  categoryId?: string
) {
  const material = String(specs?.material || '')
  const curLength = Number(specs?.length_cm) || 0
  const curWidth = Number(specs?.width_cm) || 0
  const curThick = Number(specs?.thickness_cm) || 0
  const catKey = String(categoryId || '')

  return safeCached(
    async () => {
      const currentNumId = Number(currentId)
      const finalResults: any[] = []
      const seenIds = new Set<number | string>([currentId, currentNumId])

      try {
        // Step 1: User Journey / Sequential Views (algorithm_events)
        if (Number.isSafeInteger(currentNumId)) {
          const { data: recentSessions } = await supabaseServer
            .from('algorithm_events')
            .select('session_id')
            .eq('source_tag', 'slab')
            .eq('product_id', currentNumId)
            .not('session_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(30)

          const sessionIds = Array.from(
            new Set((recentSessions || []).map((r) => r.session_id).filter(Boolean))
          )

          if (sessionIds.length > 0) {
            const { data: coViewedEvents } = await supabaseServer
              .from('algorithm_events')
              .select('product_id')
              .eq('source_tag', 'slab')
              .in('session_id', sessionIds)
              .neq('product_id', currentNumId)
              .not('product_id', 'is', null)
              .limit(40)

            if (coViewedEvents && coViewedEvents.length > 0) {
              const freqMap = new Map<number, number>()
              coViewedEvents.forEach((e) => {
                const pid = Number(e.product_id)
                if (pid && !seenIds.has(pid)) {
                  freqMap.set(pid, (freqMap.get(pid) || 0) + 1)
                }
              })

              const sortedPids = Array.from(freqMap.entries())
                .sort((a, b) => b[1] - a[1])
                .map((x) => x[0])
                .slice(0, 8)

              if (sortedPids.length > 0) {
                const { data: coViewedProducts } = await supabaseServer
                  .from(TABLE)
                  .select(RECOMMEND_SELECT_META)
                  .in('id', sortedPids)

                if (coViewedProducts) {
                  for (const pid of sortedPids) {
                    const prod = coViewedProducts.find((p) => p.id === pid)
                    if (prod && !seenIds.has(prod.id)) {
                      finalResults.push(prod)
                      seenIds.add(prod.id)
                    }
                  }
                }
              }
            }
          }
        }
      } catch (algoErr) {
        console.warn('[zenslab-cache] Algorithm co-view fallback:', algoErr)
      }

      // Step 2: Dimension & Spec Similarity
      if (finalResults.length < 8) {
        let qMat = supabaseServer
          .from(TABLE)
          .select(RECOMMEND_SELECT_META)
          .neq('id', currentId)

        if (categoryId) qMat = qMat.eq('category_id', categoryId)
        if (material) qMat = qMat.eq('specs->>material', material)

        qMat = qMat
          .order('status', { ascending: true })
          .order('updated_at', { ascending: false })
          .limit(20)

        const { data: matData } = await qMat

        if (matData && matData.length > 0) {
          const scored = matData
            .filter((p) => !seenIds.has(p.id))
            .map((p) => {
              const l = Number(p.specs?.length_cm) || 0
              const w = Number(p.specs?.width_cm) || 0
              const t = Number(p.specs?.thickness_cm) || 0
              const dL = curLength > 0 ? Math.abs(l - curLength) / curLength : 0
              const dW = curWidth > 0 ? Math.abs(w - curWidth) / curWidth : 0
              const dT = curThick > 0 ? Math.abs(t - curThick) / curThick : 0
              const distance = dL + dW + dT
              return { product: p, distance }
            })
            .sort((a, b) => a.distance - b.distance)

          for (const item of scored) {
            if (!seenIds.has(item.product.id)) {
              finalResults.push(item.product)
              seenIds.add(item.product.id)
              if (finalResults.length >= 8) break
            }
          }
        }
      }

      // Step 3: Trending & Popularity Fallback
      if (finalResults.length < 8) {
        let qPop = supabaseServer
          .from(TABLE)
          .select(RECOMMEND_SELECT_META)
          .neq('id', currentId)
          .order('favorite_count', { ascending: false })
          .order('updated_at', { ascending: false })
          .limit(15)

        if (categoryId) qPop = qPop.eq('category_id', categoryId)

        const { data: popData } = await qPop

        if (popData) {
          for (const item of popData) {
            if (!seenIds.has(item.id)) {
              finalResults.push(item)
              seenIds.add(item.id)
              if (finalResults.length >= 8) break
            }
          }
        }
      }

      return finalResults
    },
    [
      'zenslab:recommend-meta:v1',
      String(currentId),
      catKey,
      material,
      String(curLength),
      String(curWidth),
      String(curThick),
    ],
    {
      revalidate: ONE_WEEK_SECONDS,
      tags: [ZENSLAB_CACHE_TAGS.ALGORITHM],
    }
  )
}

// ============================================================
// CLOUDFLARE CACHE PURGE HELPER
// ============================================================

export async function purgeCloudflareZoneCache(urls?: string[]): Promise<{
  skipped?: boolean
  ok: boolean
  status?: number
  error?: string
}> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim()
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim()

  if (!zoneId || !apiToken) {
    return { skipped: true, ok: true }
  }

  try {
    const body =
      urls && urls.length > 0 ? { files: urls.slice(0, 30) } : { purge_everything: true }

    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, status: res.status, error: text.slice(0, 300) }
    }

    return { ok: true, status: res.status }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Cloudflare purge request failed' }
  }
}
