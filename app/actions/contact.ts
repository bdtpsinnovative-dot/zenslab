'use server'

import { supabaseServer } from '@/lib/supabase-server'

export type ContactFormData = {
  firstName: string
  lastName: string
  phone: string
  email: string
  message?: string
}

export async function submitContactInquiry(data: ContactFormData) {
  try {
    if (!data.firstName?.trim() || !data.lastName?.trim()) {
      return { success: false, error: 'กรุณากรอกชื่อและนามสกุล' }
    }
    if (!data.phone?.trim() && !data.email?.trim()) {
      return { success: false, error: 'กรุณากรอกเบอร์โทรหรืออีเมลเพื่อการติดต่อกลับ' }
    }

    // 1. Insert into contact_inquiries
    const { error: insertError } = await supabaseServer
      .from('contact_inquiries')
      .insert({
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        phone: data.phone.trim(),
        email: data.email.trim(),
        message: data.message?.trim() || '',
        source: 'zenslab_web',
        status: 'new',
      })

    if (insertError) {
      console.error('Failed to insert contact inquiry:', insertError)
      return { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง' }
    }

    // 2. Notify ONLY Admins via notifications table
    try {
      const { data: adminUsers } = await supabaseServer
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .eq('status', 'active')

      if (adminUsers && adminUsers.length > 0) {
        const notifRows = adminUsers.map((admin: any) => ({
          user_id: admin.id,
          title: '📩 มีลูกค้าติดต่อใหม่จากเว็บ ZENSLAB',
          body: `คุณ ${data.firstName.trim()} ${data.lastName.trim()} (${data.phone.trim()}): ${
            data.message?.trim() ? data.message.trim().slice(0, 80) : 'สนใจแผ่นไม้จริง Live Edge'
          }`,
          type: 'inquiry',
          is_read: false,
        }))
        await supabaseServer.from('notifications').insert(notifRows)
      }
    } catch (notifErr) {
      console.error('Error dispatching admin notifications:', notifErr)
      // We don't fail the submission if notification dispatch fails
    }

    return { success: true }
  } catch (err: any) {
    console.error('Unexpected error submitting contact inquiry:', err)
    return { success: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง' }
  }
}
