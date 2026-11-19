'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

const DEFAULT_SUPABASE_URL = 'https://gshppxgvdrmbfcxsxeph.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzaHBweGd2ZHJtYmZjeHN4ZXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMjQzODAsImV4cCI6MjEwNzYwMDM4MH0.lhpLOeb7oY0e-ZCIgSBgzHfPAgAzK8eqFgUPg9te8XM'

// Lazy Omise Client (ป้องกัน Error บน Edge runtime ตอน import)
function getOmiseClient() {
  const Omise = require('omise')
  return Omise({
    publicKey: process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY || 'pkey_test_66ij6jh1nq03bieeeic',
    secretKey: process.env.OMISE_SECRET_KEY || 'skey_test_66ij5z9uq9d1myb17g0',
  })
}

// Helper เชื่อมต่อ Supabase
async function getSupabase() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('sb-access-token')?.value
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
    const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
    return createClient(
      url,
      anon,
      token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}
    )
  } catch (err) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
    const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
    return createClient(url, anon)
  }
}

// ---------------------------------------------------------
// Helper: คำนวณและ Snapshot ส่วนลด (ฉบับแก้ไข Logic วันที่)
// ---------------------------------------------------------
async function calculateDiscountSnapshot(supabase: any, productId: string, originalPrice: number) {
    console.log(`🚀 Calculating Discount for Product: ${productId}, Price: ${originalPrice}`)
    
    const now = new Date()

    // 1. ดึงโปรโมชั่นที่ Active ทั้งหมด (ยังไม่กรองวันที่ตรงนี้ เพื่อรองรับค่า NULL)
    const { data: discounts, error } = await supabase
        .from('discounts')
        .select(`
            id, name, code, discount_type, value, start_date, end_date, active,
            discount_rules (
                id, min_subtotal, product_id, branch_id
            )
        `)
        .eq('active', true)

    if (error) {
        console.error("❌ Error fetching discounts:", error.message)
        return null
    }

    if (!discounts || discounts.length === 0) {
        console.log("⚠️ No active discounts found in DB.")
        return null
    }

    console.log(`🔎 Found ${discounts.length} active discounts candidates. Filtering...`)

    // 2. หาส่วนลดที่ดีที่สุด (กรองด้วย JS)
    let bestDiscount = null
    let maxSaving = 0

    for (const d of discounts) {
        // --- 2.1 เช็ควันที่ (รองรับ NULL = ตลอดไป) ---
        if (d.start_date) {
            if (new Date(d.start_date) > now) {
                console.log(`   -> Skip "${d.name}": Not started yet.`)
                continue
            }
        }
        if (d.end_date) {
            if (new Date(d.end_date) < now) {
                console.log(`   -> Skip "${d.name}": Expired.`)
                continue
            }
        }

        // --- 2.2 เช็คเงื่อนไข (Rules) ---
        const rules = d.discount_rules || []
        let isEligible = false
        let matchedRule = null

        // กรณีไม่มี Rule เลย (General Discount) -> ถือว่าผ่าน
        if (rules.length === 0) {
            isEligible = true
        } else {
            // กรณีมี Rule ต้องผ่านอย่างน้อย 1 ข้อ
            for (const r of rules) {
                // เช็ค Product ID (ถ้ากำหนดต้องตรง, ถ้าเป็น NULL คือใช้ได้ทุกสินค้า)
                if (r.product_id && String(r.product_id) !== String(productId)) continue
                
                // เช็คยอดขั้นต่ำ (ราคาสินค้าต้องมากกว่า min_subtotal)
                // แปลงเป็น float ก่อนเทียบ เพื่อความชัวร์
                const minSub = parseFloat(r.min_subtotal || '0')
                if (originalPrice < minSub) continue

                // ถ้าหลุดมาถึงตรงนี้แปลว่าผ่านเงื่อนไขนี้
                isEligible = true
                matchedRule = r
                break 
            }
        }

        if (!isEligible) {
            console.log(`   -> Skip "${d.name}": Conditions not met.`)
            continue
        }

        // --- 2.3 คำนวณยอดลด ---
        let saving = 0
        const val = parseFloat(d.value)
        
        if (d.discount_type === 'PERCENT') {
            saving = originalPrice * (val / 100)
        } else {
            saving = val // FIXED
        }

        if (saving > originalPrice) saving = originalPrice

        console.log(`   ✅ Eligible "${d.name}": Saving = ${saving}`)

        if (saving > maxSaving) {
            maxSaving = saving
            
            // ✅ เก็บข้อมูลละเอียดตาม Schema ที่ให้มา
            bestDiscount = {
                applied_at: now.toISOString(),
                discount_id: d.id,
                discount_name: d.name,
                discount_code: d.code,
                discount_type: d.discount_type,
                discount_value: val,
                
                // ข้อมูล Rule ที่ทำให้ได้รับสิทธิ์
                rule_id: matchedRule?.id || null,
                rule_min_subtotal: matchedRule?.min_subtotal || 0,
                rule_product_specific: matchedRule?.product_id || null,
                
                // ตัวเลขการคำนวณ
                original_price: originalPrice,
                saving_amount: saving,
                final_price: originalPrice - saving
            }
        }
    }

    return bestDiscount
}

// ---------------------------------------------------------
// 1. ฟังก์ชันเพิ่มลงตะกร้า (คงเดิม)
// ---------------------------------------------------------
export async function addToCart(productId: string | number, quantity: number) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Please login first")

  const pid = String(productId)
  const { data: existing } = await supabase.from('cart_items').select('id, quantity').eq('product_id', pid).eq('user_id', user.id).single()

  if (existing) {
    await supabase.from('cart_items').update({ quantity: existing.quantity + quantity }).eq('id', existing.id)
  } else {
    await supabase.from('cart_items').insert({ user_id: user.id, product_id: pid, quantity: quantity })
  }
  
  revalidatePath('/cart') 
  revalidatePath('/woodslab')
  return { success: true }
}

// ---------------------------------------------------------
// 2. ฟังก์ชันสร้าง QR Code มัดจำ (Create QR)
// ---------------------------------------------------------
export async function createDepositQR(productId: string | number) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Please login first" }

  try {
    // 2.1 ดึงราคาจริง
    const { data: product } = await supabase
        .from('products')
        .select('price, name, sku')
        .eq('id', productId)
        .single()
    
    if (!product) throw new Error("Product not found")

    const originalPrice = parseFloat(product.price || 0)

    // 2.2 ⚡ คำนวณและ Snapshot ส่วนลด
    const discountSnapshot = await calculateDiscountSnapshot(supabase, String(productId), originalPrice)

    // DEBUG: ดูผลลัพธ์ใน Terminal
    console.log("📝 Final Snapshot to DB:", JSON.stringify(discountSnapshot, null, 2))

    // ค่ามัดจำ (100 บาท)
    const depositAmountSatang = 10000 

    // 2.3 สร้าง Source PromptPay
    const omise = getOmiseClient()
    const source = await new Promise((resolve, reject) => {
      omise.sources.create({
        amount: depositAmountSatang,
        currency: 'thb',
        type: 'promptpay'
      }, (err: any, resp: any) => {
        if (err) reject(err)
        else resolve(resp)
      })
    }) as any

    // 2.4 สร้าง Charge
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const charge = await new Promise((resolve, reject) => {
      omise.charges.create({
        amount: depositAmountSatang,
        currency: 'thb',
        source: source.id,
        return_uri: `${baseUrl}/woodslab/product?id=${productId}`,
        description: `Deposit: ${product.sku} (User: ${user.email})`
      }, (err: any, resp: any) => {
        if (err) reject(err)
        else resolve(resp)
      })
    }) as any

    // 2.5 ✅ บันทึก Order
    await supabase.from('orders').insert({
        user_id: user.id,
        product_id: productId,
        amount: 100,
        status: 'waiting_payment',
        payment_id: charge.id,
        original_price: originalPrice,
        discount_snapshot: discountSnapshot || {} // บันทึกลงไป
    })

    const qrImage = charge.source?.scannable_code?.image?.download_uri

    if (qrImage) {
        return { success: true, qrImage: qrImage, chargeId: charge.id }
    } else {
        throw new Error("Could not generate QR Code")
    }

  } catch (error: any) {
    console.error("QR Gen Error:", error)
    return { success: false, message: error.message }
  }
}

// ---------------------------------------------------------
// 3. ฟังก์ชันเช็คสถานะการจ่าย (Check Status)
// ---------------------------------------------------------
export async function checkPaymentStatus(productId: string) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Please login" }

  const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .eq('status', 'waiting_payment')

  if (!orders || orders.length === 0) return { success: false, message: "No pending orders" }

  const omise = getOmiseClient()
  for (const order of orders) {
      if (!order.payment_id) continue
      try {
          const charge = await new Promise((resolve, reject) => {
              omise.charges.retrieve(order.payment_id, (err: any, resp: any) => {
                  if (err) reject(err)
                  else resolve(resp)
              })
          }) as any

          if (charge.status === 'successful') {
              // Update Order
              await supabase.from('orders')
                  .update({ status: 'deposit_paid' })
                  .eq('id', order.id)

              // Update Product Status
              const { data: product } = await supabase.from('products').select('specs').eq('id', productId).single()
              const oldSpecs = product?.specs || {}
              const newSpecs = { ...oldSpecs, pending: true }

              await supabase.from('products')
                  .update({ status: 'pending', specs: newSpecs })
                  .eq('id', productId)
              
              revalidatePath('/woodslab') 
              return { success: true, message: "Payment confirmed!" }
          }
      } catch (error: any) {
          console.error(`Error checking charge ${order.payment_id}:`, error.message)
      }
  }

  return { success: false, message: "Still waiting..." }
}

