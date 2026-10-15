'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function getCurrentUser() {
  const cookieStore = await cookies()

  // Support Singapore Supabase cookie name, Sydney, or dynamic matching
  const tokenCookie = cookieStore.get('sb-gshppxgvdrmbfcxsxeph-auth-token') 
    || cookieStore.get('sb-zexflchjcycxrpjkuews-auth-token')
    || cookieStore.getAll().find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
  const manualToken = cookieStore.get('sb-access-token') // เผื่อไว้

  let token = manualToken?.value

  // 👇 2. Logic แกะ Token จาก Cookie ของ Supabase (ที่ขึ้นต้นด้วย base64-)
  if (tokenCookie?.value) {
    try {
      // ตัดคำว่า 'base64-' ออก แล้วแปลงเป็นข้อความปกติ
      const base64 = tokenCookie.value.replace('base64-', '')
      const jsonStr = Buffer.from(base64, 'base64').toString('utf-8')
      const sessionData = JSON.parse(jsonStr)
      
      // ดึง access_token ตัวล่าสุดออกมา
      if (sessionData.access_token) {
        token = sessionData.access_token
      }
    } catch (e) {
      console.error("Error parsing supabase cookie", e)
    }
  }

  if (!token) return null

  // 3. เอา Token ที่แกะได้ (หรือตัวเก่า) ไปเช็คกับ Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    // console.log("Token expired or invalid")
    return null
  }

  return {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email,
    avatar_url: user.user_metadata?.avatar_url || ''
  }
}