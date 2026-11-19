'use server'

import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const DEFAULT_SUPABASE_URL = 'https://gshppxgvdrmbfcxsxeph.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaHBweGd2ZHJtYmZjeHN4ZXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMjQzODAsImV4cCI6MjEwNzYwMDM4MH0.lhpLOeb7oY0e-ZCIgSBgzHfPAgAzK8eqFgUPg9te8XM'

export async function toggleFavorite(productId: number) {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value

  if (!token) return { error: 'Please login to favorite items', success: false }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

  const supabase = createClient(
    url,
    anon,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'User not found', success: false }

  // 1. เช็คว่าเคยกดใจไว้หรือยัง
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .single()

  if (existing) {
    // 2. ถ้ามีอยู่แล้ว -> ลบออก (Unlike)
    await supabase.from('favorites').delete().eq('id', existing.id)
  } else {
    // 3. ถ้ายังไม่มี -> เพิ่มเข้าไป (Like)
    await supabase.from('favorites').insert({
      user_id: user.id,
      product_id: productId
    })
  }

  // อัปเดตข้อมูลในหน้าสินค้าทันที
  revalidatePath('/woodslab')
  return { success: true }
}