'use server'

import { supabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const TABLE = "products"

// ⚠️ อันเดิมเก็บไว้ (เผื่อใช้ในฟังก์ชันอื่นที่อยากเห็นของหมด)
const LIST_SELECT = "id,name,sku,barcode,price,image_url,status,length_cm,width_cm,thickness_cm,specs,updated_at,created_at,stock(qty)"

// --- Helper Functions ---
export type CategoryKey = 'all' | 'slabs' | 'rough' | 'leg' | 'chair'

const EXCLUDED_CATEGORIES = ['rough_wood', 'prop']

const getCategoryFilter = (category: CategoryKey): { categoryId?: string; specType?: string; excludeCategories?: string[] } => {
  if (category === 'rough') return { categoryId: 'rough_wood' }
  if (category === 'leg') return { categoryId: 'SLABS', specType: 'Leg' }
  if (category === 'chair') return { categoryId: 'SLABS', specType: 'Chair/Stool' }
  if (category === 'slabs') return { categoryId: 'SLABS', specType: 'Wood slabs' }
  if (category === 'all') return { categoryId: 'SLABS' }
  return { categoryId: 'SLABS', specType: 'Wood slabs' }
}
// 👇👇👇 เอามาวางตรงนี้เลยจ้ะหลานชาย 👇👇👇
const getDbCategory = (category: 'slabs' | 'rough'): string => {
  if (category === 'rough') return 'rough_wood'
  return 'SLABS' // default สำหรับ 'slabs'
}

// 🔹 ฟังก์ชันสร้าง Client แบบอ่าน Cookie (สำหรับระบบ User/Auth)
async function createAuthClient() {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value

  if (!token) return null

  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  )
}

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

// ==========================================
// 1. ส่วนดึงข้อมูลสำหรับหน้า Main Listing
// ==========================================

// 1.1 ดึงส่วนลด
export async function getActiveDiscounts() {
  const { data, error } = await supabaseServer
    .from('discounts')
    .select('*, discount_rules(*)')
    .eq('active', true)
  if (error) return []
  return data || []
}

// 1.2 ✅ กรองสินค้าหลัก (Main Listing)
export async function getProducts(
  page: number,
  limit: number,
  filters: FilterState,
  category: CategoryKey = 'all',
  discountFilter?: number[] | 'all' | null
) {
  console.log("SERVER ACTION - getProducts called with:", { page, limit, filters, category, discountFilter })
  const offset = page * limit
  const { categoryId, specType, excludeCategories } = getCategoryFilter(category)
  console.log("SERVER ACTION - Resolved category filters:", { categoryId, specType, excludeCategories })

  const LIST_SELECT_ACTIVE = "id,name,sku,barcode,price,image_url,status,length_cm,width_cm,thickness_cm,specs,updated_at,created_at,category_id,stock(qty)"

  // ถ้า discount filter ระบุ ID เฉพาะแต่ไม่มีเลย → ไม่มีสินค้าที่มีส่วนลด
  if (Array.isArray(discountFilter) && discountFilter.length === 0) {
    return { data: [], count: 0 }
  }

  // ✅ เรียงลำดับ: สินค้ามีสต็อกพร้อมส่ง (On Stock) ขึ้นก่อนเสมอ ตามด้วย Pre-order และ Sold Out

  let query = supabaseServer
    .from(TABLE)
    .select(LIST_SELECT_ACTIVE, { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order('status', { ascending: true })
    .order('updated_at', { ascending: false })

  if (categoryId) query = query.eq('category_id', categoryId)
  if (specType) query = query.eq('specs->>spec_type', specType)
  if (excludeCategories?.length) query = query.not('category_id', 'in', `(${excludeCategories.join(',')})`)

  // --- Discount filter (server-side) ---
  if (Array.isArray(discountFilter) && discountFilter.length > 0) {
    query = query.in('id', discountFilter)
  }
  // discountFilter === 'all' → ไม่ต้องกรอง ID (ทุกสินค้ามีส่วนลด)

  // --- Standard Filters ---
  if (filters.type) query = query.eq('specs->>spec_type', filters.type)
  if (filters.material) query = query.eq('specs->>material', filters.material)
  if (filters.panel) query = query.eq('specs->>panel_craft', filters.panel)

  const statusMap: Record<string, string[]> = {
    on_stock: ["On Stock", "on_stock", "in_stock", "In Stock"],
    pre_order: ["Pre-Oder", "Pre-order", "pre_order", "preorder"],
    available: ["available", "active", "On Stock", "Pre-Oder", "Pre-order"],
    pending: ["pending", "reserved", "hold", "on_request"],
    sold: ["Sold Out", "sold", "archived", "inactive"],
    draft: ["draft"],
  }
  if (filters.status !== 'all' && statusMap[filters.status]) {
    query = query.in('status', statusMap[filters.status])
  }

  if (filters.lengthMin) query = query.gte('specs->>length_cm', Number(filters.lengthMin))
  if (filters.lengthMax) query = query.lte('specs->>length_cm', Number(filters.lengthMax))
  if (filters.widthMin) query = query.gte('specs->>width_cm', Number(filters.widthMin))
  if (filters.widthMax) query = query.lte('specs->>width_cm', Number(filters.widthMax))
  if (filters.thickMin) query = query.gte('specs->>thickness_cm', Number(filters.thickMin))
  if (filters.thickMax) query = query.lte('specs->>thickness_cm', Number(filters.thickMax))
  if (filters.priceMin) query = query.gte('price', Number(filters.priceMin))
  if (filters.priceMax) query = query.lte('price', Number(filters.priceMax))

  if (filters.q) {
    const qq = filters.q.replaceAll(",", " ")
    query = query.or(`name.ilike.%${qq}%,barcode.ilike.%${qq}%,sku.ilike.%${qq}%`)
  }

  const { data, count, error } = await query
  if (error) {
    console.error("SERVER ACTION - Supabase query failed:", error)
  } else {
    console.log("SERVER ACTION - Supabase query succeeded. Row count:", count, "Data length:", data?.length)
  }

  // เรียงให้สินค้าที่มีจำนวนสต็อกจริง (qty > 0) ขึ้นก่อนเสมอในหน้านั้นๆ
  const sortedData = (data || []).slice().sort((a: any, b: any) => {
    const qtyA = Array.isArray(a?.stock) ? a.stock.reduce((s: number, i: any) => s + (Number(i?.qty) || 0), 0) : 0
    const qtyB = Array.isArray(b?.stock) ? b.stock.reduce((s: number, i: any) => s + (Number(i?.qty) || 0), 0) : 0
    const hasStockA = qtyA > 0 ? 1 : 0
    const hasStockB = qtyB > 0 ? 1 : 0
    if (hasStockA !== hasStockB) return hasStockB - hasStockA
    return 0
  })

  return { data: sortedData, count: count || 0 }
}

// 1.3 ✅ ดึงค่า Min/Max สำหรับ Slider
export async function getMinMax(col: string, category: CategoryKey = 'all') {
  const { categoryId, specType, excludeCategories } = getCategoryFilter(category)

  let qMin = supabaseServer.from(TABLE).select(col).not(col, 'is', null).order(col, { ascending: true }).limit(1).single()
  let qMax = supabaseServer.from(TABLE).select(col).not(col, 'is', null).order(col, { ascending: false }).limit(1).single()
  if (categoryId) { qMin = (qMin as any).eq('category_id', categoryId); qMax = (qMax as any).eq('category_id', categoryId) }
  if (specType) { qMin = (qMin as any).eq('specs->>spec_type', specType); qMax = (qMax as any).eq('specs->>spec_type', specType) }
  if (excludeCategories?.length) {
    qMin = (qMin as any).not('category_id', 'in', `(${excludeCategories.join(',')})`)
    qMax = (qMax as any).not('category_id', 'in', `(${excludeCategories.join(',')})`)
  }

  const [{ data: minData }, { data: maxData }] = await Promise.all([qMin, qMax])

  return {
    min: minData ? (minData as any)[col] : null,
    max: maxData ? (maxData as any)[col] : null
  }
}

// 1.4 ✅ ดึงค่าสำหรับ Histogram
export async function getRangeValues(col: string, category: CategoryKey = 'all') {
  const { categoryId, specType, excludeCategories } = getCategoryFilter(category)

  let query = supabaseServer.from(TABLE).select(col).not(col, 'is', null).limit(2000)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (specType) query = query.eq('specs->>spec_type', specType)
  if (excludeCategories?.length) query = query.not('category_id', 'in', `(${excludeCategories.join(',')})`)

  const { data } = await query

  if (!data) return []
  return data.map((r: any) => Number(r[col])).filter(n => Number.isFinite(n))
}

// 1.5 ✅ ดึงตัวเลือกสำหรับ Dropdown
export async function getDistinctOptions(category: CategoryKey = 'all') {
  const { categoryId, specType, excludeCategories } = getCategoryFilter(category)

  let query = supabaseServer.from(TABLE).select('specs').limit(3000)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (specType) query = query.eq('specs->>spec_type', specType)
  if (excludeCategories?.length) query = query.not('category_id', 'in', `(${excludeCategories.join(',')})`)

  const { data } = await query

  const sets = {
    type: new Set<string>(),
    material: new Set<string>(),
    panel: new Set<string>()
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
    panel: Array.from(sets.panel).sort((a, b) => a.localeCompare(b))
  }
}
// ==========================================
// 2. ส่วน Product Detail
// ==========================================

export async function getProductDetail(id?: string) {
  if (!id) return null
  // ⚠️ หน้ารายละเอียดคงไว้แบบเดิม (Left Join) เพื่อให้ยังเข้าดูของที่หมดแล้วได้ (แต่จะขึ้น Sold Out)
  const { data } = await supabaseServer.from(TABLE).select('*, stock(qty, branch_id, branches(branch_name))').eq('id', id).single()
  return data
}

// ✅ อัลกอริทึมแนะนำสินค้า (Demo Version): แสดงสินค้าทั้งหมดไม่สน Status เอาให้เต็ม 8 ช่อง
export async function getRecommendProducts(currentId: number | string, specs: any, categoryId?: string) {
  const currentNumId = Number(currentId)
  const material = specs?.material || ""
  const curLength = Number(specs?.length_cm) || 0
  const curWidth = Number(specs?.width_cm) || 0
  const curThick = Number(specs?.thickness_cm) || 0
  
  const selectCols = "id,name,sku,price,image_url,status,specs,updated_at,favorite_count,stock(qty)"
  const finalResults: any[] = []
  const seenIds = new Set<number | string>([currentId, currentNumId])

  try {
    // 🧠 Algorithm Step 1: User Journey / Sequential Views (ดึงสินค้าที่คนดูต่อกันจาก algorithm_events แบบเดียวกับ Terra)
    if (Number.isSafeInteger(currentNumId)) {
      const { data: recentSessions } = await supabaseServer
        .from('algorithm_events')
        .select('session_id')
        .eq('source_tag', 'slab')
        .eq('product_id', currentNumId)
        .not('session_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(30)

      const sessionIds = Array.from(new Set((recentSessions || []).map(r => r.session_id).filter(Boolean)))

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
          // นับคะแนนความถี่ที่ถูกเปิดดูคู่กัน
          const freqMap = new Map<number, number>()
          coViewedEvents.forEach(e => {
            const pid = Number(e.product_id)
            if (pid && !seenIds.has(pid)) {
              freqMap.set(pid, (freqMap.get(pid) || 0) + 1)
            }
          })

          const sortedPids = Array.from(freqMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(x => x[0])
            .slice(0, 8)

          if (sortedPids.length > 0) {
            const { data: coViewedProducts } = await supabaseServer
              .from(TABLE)
              .select(selectCols)
              .in('id', sortedPids)

            if (coViewedProducts) {
              for (const pid of sortedPids) {
                const prod = coViewedProducts.find(p => p.id === pid)
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
    console.warn("Algorithm co-view query fallback:", algoErr)
  }

  // 🎯 Algorithm Step 2: Dimension & Spec Similarity (จับคู่แผ่นไม้ชนิดเดียวกัน + ขนาดใกล้เคียงกัน)
  if (finalResults.length < 8) {
    let qMat = supabaseServer
      .from(TABLE)
      .select(selectCols)
      .neq("id", currentId)

    if (categoryId) qMat = qMat.eq("category_id", categoryId)
    if (material) qMat = qMat.eq("specs->>material", material)

    qMat = qMat.order("status", { ascending: true })
               .order("updated_at", { ascending: false })
               .limit(20)

    const { data: matData } = await qMat

    if (matData && matData.length > 0) {
      // คำนวณความใกล้เคียงของมิติขนาด (Dimension Proximity)
      const scored = matData
        .filter(p => !seenIds.has(p.id))
        .map(p => {
          const l = Number(p.specs?.length_cm) || 0
          const w = Number(p.specs?.width_cm) || 0
          const t = Number(p.specs?.thickness_cm) || 0
          // Normalised Euclidean distance for slab dimensions
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

  // 🎯 Algorithm Step 3: Trending & Popularity Fallback (ดึงสินค้ายอดฮิตมาเติมจนครบ 8 แผ่น)
  if (finalResults.length < 8) {
    let qPop = supabaseServer
      .from(TABLE)
      .select(selectCols)
      .neq("id", currentId)
      .order("favorite_count", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(15)

    if (categoryId) qPop = qPop.eq("category_id", categoryId)

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
}
export async function purchaseProduct(id: number) {
  const { error } = await supabaseServer.from(TABLE).update({ status: 'on_request', updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/woodslab/product')
  return { success: true }
}

// ==========================================
// 3. ส่วนของ Favorite / Like System (✅ เวอร์ชั่นสมบูรณ์)
// ==========================================

export async function getProductLikeStatus(productId: string) {
  const authClient = await createAuthClient()
  let isLiked = false
  let isLoggedIn = false

  if (authClient) {
     const { data: { user } } = await authClient.auth.getUser()
     if (user) {
        isLoggedIn = true 
        const { data: fav } = await authClient
          .from('favorites')
          .select('id')
          .eq('product_id', productId)
          .eq('user_id', user.id)
          .single()
        if (fav) isLiked = true
     }
  }

  const { data: product } = await supabaseServer
    .from(TABLE)
    .select('favorite_count')
    .eq('id', productId)
    .single()
  
  return { count: product?.favorite_count || 0, isLiked, isLoggedIn }
}

export async function toggleProductLike(productId: string) {
  const authClient = await createAuthClient()
  if (!authClient) throw new Error("Must be logged in to like")

  const { data: { user } } = await authClient.auth.getUser()
  if (!user) throw new Error("Invalid session")

  const { data: existing } = await authClient
    .from('favorites')
    .select('id')
    .eq('product_id', productId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    await authClient.from('favorites').delete().eq('id', existing.id)
  } else {
    await authClient.from('favorites').insert({ user_id: user.id, product_id: productId })
  }

  revalidatePath('/woodslab/product') 
  return { success: true }
}

export async function getMyFavorites() {
  const authClient = await createAuthClient()
  if (!authClient) return []
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return []

  const { data, error } = await authClient
    .from('favorites')
    // ✅ Favorites: ปล่อยให้เห็นของหมดได้ (จะได้รู้ว่าสินค้าที่ชอบหมดแล้ว)
    .select(`product_id, products (id, name, sku, price, image_url, specs, status, stock(qty))`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return []
  const products = data?.map((item: any) => item.products).filter(Boolean) || []
  return products
}