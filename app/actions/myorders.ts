'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const DEFAULT_SUPABASE_URL = 'https://gshppxgvdrmbfcxsxeph.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaHBweGd2ZHJtYmZjeHN4ZXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMjQzODAsImV4cCI6MjEwNzYwMDM4MH0.lhpLOeb7oY0e-ZCIgSBgzHfPAgAzK8eqFgUPg9te8XM'

// Helper สำหรับเชื่อมต่อ Supabase
async function getSupabase() {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
  return createClient(
    url,
    anon,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}
  )
}

export async function getMyPaidOrders() {
  try {
    const supabase = await getSupabase()
    
    // 1. เช็ค User ปัจจุบัน
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: "กรุณาเข้าสู่ระบบ", data: [] }
    }

    // 2. ดึงข้อมูล Orders ของ User นี้
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        amount,
        status,
        original_price,
        discount_snapshot,
        products (
          id,
          name,
          sku,
          image_url,  
          price,
          status,
          specs
        )
      `)
      .eq('user_id', user.id) // ✅ กรองเฉพาะของ User นี้
      .eq('status', 'deposit_paid') // ✅ กรองเฉพาะที่จ่ายแล้ว
      .order('created_at', { ascending: false })

    if (error) {
      console.error("❌ Error fetching paid orders:", error.message)
      return { success: false, message: error.message, data: [] }
    }

    return { 
      success: true, 
      data: data || [] 
    }

  } catch (error: any) {
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * (แถม) ดึงออเดอร์ที่ยังค้างชำระ (เผื่อคุณอยากทำหน้า 'รายการรอชำระเงิน' แยก)
 */
export async function getMyPendingOrders() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, data: [] }

    const { data } = await supabase
      .from('orders')
      .select('*, products(*)')
      .eq('user_id', user.id)
      .eq('status', 'waiting_payment')
      .order('created_at', { ascending: false })

    return { success: true, data: data || [] }
}