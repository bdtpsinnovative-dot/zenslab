'use server'

import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const BUCKET = "product-images"
const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gshppxgvdrmbfcxsxeph.supabase.co"

function normalizeImg(path: string | null) {
  if (!path) return ""
  const s = String(path).trim()
  if (s.includes("ixiumu.cn")) {
    return `/api/proxy-image?url=${encodeURIComponent(s)}`
  }
  if (/^https?:\/\//i.test(s)) return s
  const cleanPath = s.replace(/^\/+/, "")
  return `${PROJECT_URL}/storage/v1/object/public/${BUCKET}/${cleanPath}`
}

async function getSupabaseUserClient() {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  if (!token) return null

  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

export async function getCart() {
  const supabase = await getSupabaseUserClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      quantity,
      product_id,
      products (
        name,
        price,
        image_url,
        sku,
        category_id
      )
    `)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  
  // 🚨 ป้องกันข้อมูล Coupling กับ Terrahome (เช่น prop, rough_wood)
  const filteredData = data.filter(
    (item) => !['prop', 'rough_wood'].includes(item.products?.category_id || '')
  )

  return filteredData.map((item) => ({
    ...item,
    products: {
      ...item.products,
      image_url: normalizeImg(item.products?.image_url)
    }
  }))
}

// ... removeFromCart และ updateQuantity (คงเดิมตามที่คุณให้มา)

// 2. ลบสินค้าออกจากตะกร้า
export async function removeFromCart(itemId: string) {
  const supabase = await getSupabaseUserClient()
  if (!supabase) return

  await supabase.from('cart_items').delete().eq('id', itemId)
  revalidatePath('/cart')
}

// 3. ปรับจำนวนสินค้า (+/-)
export async function updateQuantity(itemId: string, newQuantity: number) {
  const supabase = await getSupabaseUserClient()
  if (!supabase) return

  if (newQuantity < 1) {
    await removeFromCart(itemId)
    return
  }

  await supabase
    .from('cart_items')
    .update({ quantity: newQuantity })
    .eq('id', itemId)
    
  revalidatePath('/cart')
}