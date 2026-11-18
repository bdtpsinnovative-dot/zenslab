'use server'

import { supabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import {
  fetchLiveProductDetailStock,
  fetchLiveStockMap,
  getCachedActiveDiscounts,
  getCachedDistinctOptions,
  getCachedMinMax,
  getCachedProductDetailMeta,
  getCachedProductListMeta,
  getCachedRangeValues,
  getCachedRecommendProductsMeta,
  getCategoryFilter,
} from '@/lib/zenslab-cache'

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

function sortByLiveStockFirst(rows: any[]) {
  return rows.slice().sort((a: any, b: any) => {
    const qtyA = Array.isArray(a?.stock)
      ? a.stock.reduce((s: number, i: any) => s + (Number(i?.qty) || 0), 0)
      : 0
    const qtyB = Array.isArray(b?.stock)
      ? b.stock.reduce((s: number, i: any) => s + (Number(i?.qty) || 0), 0)
      : 0
    const hasStockA = qtyA > 0 ? 1 : 0
    const hasStockB = qtyB > 0 ? 1 : 0
    if (hasStockA !== hasStockB) return hasStockB - hasStockA
    return 0
  })
}

// ==========================================
// 1. ส่วนดึงข้อมูลสำหรับหน้า Main Listing
// ==========================================

// 1.1 ดึงส่วนลด (แคช 1 ปี — ล้างอัตโนมัติเมื่อหลังบ้านแก้ส่วนลด)
export async function getActiveDiscounts() {
  return getCachedActiveDiscounts()
}

// 1.2 ✅ กรองสินค้าหลัก (Main Listing)
// - Metadata สินค้า (ชื่อ/รูป/ราคา/ขนาด/สเปค) แคช 1 ปี (ยกเว้นตอนกรองตาม status หรือพิมพ์ค้นหา q)
// - สต็อก (stock.qty) และ status จริง ดึงสดจาก DB ทุกครั้ง (ไม่แคชสต็อกเด็ดขาด)
export async function getProducts(
  page: number,
  limit: number,
  filters: FilterState,
  category: CategoryKey = 'all',
  discountFilter?: number[] | 'all' | null
) {
  // ถ้า discount filter ระบุ ID เฉพาะแต่ไม่มีเลย → ไม่มีสินค้าที่มีส่วนลด
  if (Array.isArray(discountFilter) && discountFilter.length === 0) {
    return { data: [], count: 0 }
  }

  const hasStatusFilter = Boolean(filters.status && filters.status !== 'all')
  const hasSearchQuery = Boolean(filters.q && filters.q.trim().length > 0)

  // กรณีไม่ได้กรองตาม status และไม่ได้ค้นหาอิสระ -> ใช้ Metadata จาก Cache 1 ปี แล้วประกอบ Stock + Status สด
  if (!hasStatusFilter && !hasSearchQuery) {
    const cached = await getCachedProductListMeta({
      page,
      limit,
      filters,
      category,
      discountFilter,
    })

    if (!cached.data.length) {
      return { data: [], count: cached.count }
    }

    const liveMap = await fetchLiveStockMap(cached.data.map((r: any) => r.id))
    const merged = cached.data.map((row: any) => {
      const live = liveMap.get(String(row.id))
      if (!live) return { ...row, stock: [] }
      return {
        ...row,
        status: live.status ?? row.status,
        stock: live.stock,
      }
    })

    return { data: sortByLiveStockFirst(merged), count: cached.count }
  }

  // กรณีกรองตาม status (เช่น On Stock / Sold Out) หรือค้นหาข้อความ -> ดึงสดจาก Supabase เพื่อความแม่นยำ 100%
  const offset = page * limit
  const { categoryId, specType, excludeCategories } = getCategoryFilter(category)
  const LIST_SELECT_ACTIVE =
    'id,name,sku,barcode,price,image_url,status,length_cm,width_cm,thickness_cm,specs,updated_at,created_at,category_id,stock(qty)'

  let query = supabaseServer
    .from(TABLE)
    .select(LIST_SELECT_ACTIVE, { count: 'exact' })
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

  const statusMap: Record<string, string[]> = {
    on_stock: ['On Stock', 'on_stock', 'in_stock', 'In Stock'],
    pre_order: ['Pre-Oder', 'Pre-order', 'pre_order', 'preorder'],
    available: ['available', 'active', 'On Stock', 'Pre-Oder', 'Pre-order'],
    pending: ['pending', 'reserved', 'hold', 'on_request'],
    sold: ['Sold Out', 'sold', 'archived', 'inactive'],
    draft: ['draft'],
  }
  if (hasStatusFilter && statusMap[filters.status]) {
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

  if (hasSearchQuery) {
    const qq = filters.q.replaceAll(',', ' ')
    query = query.or(`name.ilike.%${qq}%,barcode.ilike.%${qq}%,sku.ilike.%${qq}%`)
  }

  const { data, count, error } = await query
  if (error) {
    console.error('SERVER ACTION - Supabase query failed:', error)
  }

  return { data: sortByLiveStockFirst(data || []), count: count || 0 }
}

// 1.3 ✅ ดึงค่า Min/Max สำหรับ Slider (แคช 1 ปี)
export async function getMinMax(col: string, category: CategoryKey = 'all') {
  return getCachedMinMax(col, category)
}

// 1.4 ✅ ดึงค่าสำหรับ Histogram (แคช 1 ปี)
export async function getRangeValues(col: string, category: CategoryKey = 'all') {
  return getCachedRangeValues(col, category)
}

// 1.5 ✅ ดึงตัวเลือกสำหรับ Dropdown (แคช 1 ปี)
export async function getDistinctOptions(category: CategoryKey = 'all') {
  return getCachedDistinctOptions(category)
}

// ==========================================
// 2. ส่วน Product Detail
// ==========================================

// Metadata แคช 1 ปี + สต็อก/สาขา/สถานะ ดึงสดทุกครั้ง (ไม่แคชสต็อกเด็ดขาด)
export async function getProductDetail(id?: string) {
  if (!id) return null
  const [cachedMeta, liveStock] = await Promise.all([
    getCachedProductDetailMeta(id),
    fetchLiveProductDetailStock(id),
  ])

  if (!liveStock) return null
  if (!cachedMeta) {
    // Fallback กรณีเพิ่งเพิ่มสินค้าใหม่สดๆ และแคชยังไม่มี
    const { data } = await supabaseServer
      .from(TABLE)
      .select('*, stock(qty, branch_id, branches(branch_name))')
      .eq('id', id)
      .single()
    return data
  }

  return {
    ...cachedMeta,
    status: liveStock.status ?? cachedMeta.status,
    favorite_count: liveStock.favorite_count ?? cachedMeta.favorite_count,
    stock: liveStock.stock ?? [],
  }
}

// ✅ อัลกอริทึมแนะนำสินค้า: รีเฟรชผลอัลกอริทึมทุก 7 วัน (1 สัปดาห์) + ประกอบสต็อก/สถานะสดทุกครั้ง
export async function getRecommendProducts(
  currentId: number | string,
  specs: any,
  categoryId?: string
) {
  const recommendedMeta = await getCachedRecommendProductsMeta(currentId, specs, categoryId)
  if (!recommendedMeta.length) return []

  const liveMap = await fetchLiveStockMap(recommendedMeta.map((p: any) => p.id))
  return recommendedMeta.map((prod: any) => {
    const live = liveMap.get(String(prod.id))
    if (!live) return { ...prod, stock: [] }
    return {
      ...prod,
      status: live.status ?? prod.status,
      stock: live.stock,
    }
  })
}

export async function purchaseProduct(id: number) {
  const { error } = await supabaseServer
    .from(TABLE)
    .update({ status: 'on_request', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/woodslab/product')
  return { success: true }
}

// ==========================================
// 3. ส่วนของ Favorite / Like System (ไม่แคช — เป็นข้อมูลส่วนตัว User)
// ==========================================

export async function getProductLikeStatus(productId: string) {
  const authClient = await createAuthClient()
  let isLiked = false
  let isLoggedIn = false

  if (authClient) {
    const {
      data: { user },
    } = await authClient.auth.getUser()
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
  if (!authClient) throw new Error('Must be logged in to like')

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) throw new Error('Invalid session')

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
  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) return []

  const { data, error } = await authClient
    .from('favorites')
    .select(`product_id, products (id, name, sku, price, image_url, specs, status, stock(qty))`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return []
  const products = data?.map((item: any) => item.products).filter(Boolean) || []
  return products
}
