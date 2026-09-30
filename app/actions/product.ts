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

  // ค้นหาแบบสุ่มสินค้าบนหน้า All Items (เมื่อไม่ได้ระบุการค้นหาหรือฟิลเตอร์ย่อย)
  const isDefaultAll = category === 'all' && 
    !filters.q && 
    !filters.type && 
    !filters.material && 
    !filters.panel && 
    filters.status === 'all' &&
    !filters.lengthMin &&
    !filters.lengthMax &&
    !filters.widthMin &&
    !filters.widthMax &&
    !filters.thickMin &&
    !filters.thickMax &&
    !filters.priceMin &&
    !filters.priceMax &&
    filters.discount === 'all';

  if (isDefaultAll) {
    console.log("SERVER ACTION - Randomizing all items landing page")
    try {
      const countQuery = supabaseServer
        .from(TABLE)
        .select('id', { count: 'exact', head: true })
      
      if (categoryId) countQuery.eq('category_id', categoryId)
      if (excludeCategories?.length) countQuery.not('category_id', 'in', `(${excludeCategories.join(',')})`)
      if (specType) countQuery.eq('specs->>spec_type', specType)

      const { count: totalCount, error: countErr } = await countQuery
      if (countErr) throw countErr

      const total = totalCount || 0
      const poolSize = Math.min(200, total)
      const maxOffset = Math.max(0, total - poolSize)
      const randomOffset = Math.floor(Math.random() * maxOffset)

      let poolQuery = supabaseServer
        .from(TABLE)
        .select(LIST_SELECT_ACTIVE)
        .range(randomOffset, randomOffset + poolSize - 1)
        
      if (categoryId) poolQuery = poolQuery.eq('category_id', categoryId)
      if (excludeCategories?.length) poolQuery = poolQuery.not('category_id', 'in', `(${excludeCategories.join(',')})`)
      if (specType) poolQuery = poolQuery.eq('specs->>spec_type', specType)

      const { data: poolData, error: poolErr } = await poolQuery
      if (poolErr) throw poolErr

      if (poolData && poolData.length > 0) {
        const shuffled = [...poolData].sort(() => Math.random() - 0.5)
        const pageData = shuffled.slice(0, limit)
        console.log("SERVER ACTION - Random success! Row count:", total, "Returned data length:", pageData.length)
        return { data: pageData, count: total }
      }
    } catch (err) {
      console.error("SERVER ACTION - Randomization failed, falling back to standard query:", err)
    }
  }

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
    available: ["available", "active"],
    pending: ["pending", "reserved", "hold", "on_request"],
    sold: ["sold", "archived", "inactive"],
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
  return { data: data || [], count: count || 0 }
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
  const { data } = await supabaseServer.from(TABLE).select('*, stock(qty)').eq('id', id).single()
  return data
}

// ✅ อัลกอริทึมแนะนำสินค้า (Demo Version): แสดงสินค้าทั้งหมดไม่สน Status เอาให้เต็ม 8 ช่อง
export async function getRecommendProducts(currentId: number | string, specs: any, categoryId?: string) {
  const material = specs?.material || ""
  
  const selectCols = "id,name,sku,price,image_url,status,specs,updated_at,favorite_count,stock(qty)"

  // 🎯 Step 1: หาแผ่นที่ "ชนิดไม้เดียวกัน (Material)"
  // เรียงตามความนิยม (favorite_count) ให้หน้าเดโมดูเนียนตา
  let q1 = supabaseServer
    .from(TABLE)
    .select(selectCols)
    .neq("id", currentId)
    
  if (categoryId) {
      q1 = q1.eq("category_id", categoryId)
  }

  if (material) {
      q1 = q1.eq("specs->>material", material)
  }

  q1 = q1.order("favorite_count", { ascending: false }) 
         .order("updated_at", { ascending: false })     
         .limit(8)

  const { data: matchedMaterial } = await q1
  let results = matchedMaterial || []

  // 🎯 Step 2: ถ้าไม้ชนิดเดียวกันมีไม่ถึง 8 แผ่น (ในเดโมของอาจจะยังน้อย)
  // ให้ดึง "สินค้ายอดฮิตที่สุดในเดโม" มาเติมให้เต็ม 8 กรอบ
  if (results.length < 8) {
    const existingIds = new Set(results.map(r => r.id))
    existingIds.add(currentId)

    let q2 = supabaseServer
      .from(TABLE)
      .select(selectCols)
      .order("favorite_count", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(15) 

    if (categoryId) {
        q2 = q2.eq("category_id", categoryId)
    }

    const { data: popularData } = await q2

    if (popularData) {
      for (const item of popularData) {
        if (!existingIds.has(item.id)) {
          results.push(item)
          existingIds.add(item.id)
        }
        // เติมจนครบ 8 แผ่นแล้วหยุด หน้าเว็บจะได้เรียงกรอบสวยๆ พอดี
        if (results.length >= 8) break; 
      }
    }
  }

  return results
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