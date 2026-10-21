import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  FIRST_TOUCH_COOKIE_NAME,
  LAST_PRODUCT_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_SOURCE_COOKIE_NAME,
  SOURCE_CONFIDENCE_COOKIE_NAME,
  SOURCE_DETAIL_COOKIE_NAME,
  SOURCE_EVIDENCE_COOKIE_NAME,
  SOURCE_REFERRER_COOKIE_NAME,
  VISITOR_COOKIE_NAME,
  classifyTraffic,
  getAttributionData,
  getClientProfile,
  getTrustedClientIp,
  getViewBucket,
  hashClientIp,
  isInternalIp,
} from '@/src/lib/algorithm'

export const dynamic = 'force-dynamic'

const EVENT_TYPES = new Set([
  'product_view', 'page_view', 'cta', 'journey',
  'session_start', 'session_heartbeat', 'session_end',
])

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)
}

function safeText(value: unknown, maxLength: number): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null
}

function validMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).slice(0, 20))
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}))
    const eventType = payload.event_type
    if (!eventType || !EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const reqHeaders = await headers()

    // 1. Visitor & Session IDs
    let visitorId = cookieStore.get(VISITOR_COOKIE_NAME)?.value || ''
    if (!isUuid(visitorId)) {
      visitorId = crypto.randomUUID()
    }

    let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value || ''
    if (!isUuid(sessionId)) {
      sessionId = payload.session_id && isUuid(payload.session_id) ? payload.session_id : crypto.randomUUID()
    }

    const rawLastProduct = cookieStore.get(LAST_PRODUCT_COOKIE_NAME)?.value
    const previousProductId = rawLastProduct ? Number(rawLastProduct) : (payload.previous_product_id || null)

    // 2. Client Profile & Attribution
    const userAgent = reqHeaders.get('user-agent')
    const referrer = reqHeaders.get('referer') || payload.tracking_url || null
    const requestUrl = payload.tracking_url || request.url

    const clientIp = getTrustedClientIp(reqHeaders)
    const ipHash = await hashClientIp(clientIp)
    const internal = isInternalIp(clientIp)
    const traffic = classifyTraffic(userAgent, internal)
    const clientProfile = getClientProfile(userAgent)

    const attribution = getAttributionData(
      requestUrl,
      referrer,
      cookieStore.get(FIRST_TOUCH_COOKIE_NAME)?.value || null,
      cookieStore.get(SESSION_SOURCE_COOKIE_NAME)?.value || null,
      cookieStore.get(SOURCE_EVIDENCE_COOKIE_NAME)?.value || null,
      cookieStore.get(SOURCE_CONFIDENCE_COOKIE_NAME)?.value || null,
      cookieStore.get(SOURCE_DETAIL_COOKIE_NAME)?.value || null,
      cookieStore.get(SOURCE_REFERRER_COOKIE_NAME)?.value || null,
    )

    // 3. Geolocation
    const countryCode = reqHeaders.get('x-vercel-ip-country') || reqHeaders.get('cf-ipcountry') || 'TH'
    const region = reqHeaders.get('x-vercel-ip-country-region') || null
    const city = reqHeaders.get('x-vercel-ip-city') || null

    // 4. Product Snapshot if viewing a slab
    let productSnapshot: Record<string, any> = {}
    const productId = Number.isSafeInteger(Number(payload.product_id)) ? Number(payload.product_id) : null

    if (productId) {
      if (payload.product_name_snapshot) {
        productSnapshot = {
          product_name_snapshot: safeText(payload.product_name_snapshot, 255),
          product_sku_snapshot: safeText(payload.product_sku_snapshot, 100),
          product_material_snapshot: safeText(payload.product_material_snapshot, 100),
          product_price_snapshot: payload.product_price_snapshot ? Number(payload.product_price_snapshot) : null,
        }
      } else {
        const { data: prod } = await supabaseAdmin
          .from('products')
          .select('id, name, sku, price, specs')
          .eq('id', productId)
          .maybeSingle()
        if (prod) {
          productSnapshot = {
            product_name_snapshot: prod.name,
            product_sku_snapshot: prod.sku,
            product_material_snapshot: prod.specs?.material || null,
            product_price_snapshot: prod.price ? Number(prod.price) : null,
          }
        }
      }
    }

    const identityKey = `visitor:${visitorId}`
    const pagePath = safeText(payload.page_path, 500) || '/'
    const pageType = safeText(payload.page_type, 100) || 'page'

    // 5. Insert event into algorithm_events with source_tag = 'slab'
    const eventData = {
      event_type: eventType,
      source_tag: 'slab',
      source_category: 'SLABS',
      product_id: productId,
      visitor_id: visitorId,
      identity_type: 'visitor',
      identity_key: identityKey,
      view_bucket: getViewBucket(),
      ip_hash: ipHash,
      country_code: countryCode,
      country: countryCode,
      region: region,
      city: city,
      user_agent: userAgent ? userAgent.slice(0, 1000) : null,
      referrer: referrer ? referrer.slice(0, 500) : null,
      traffic_type: traffic.trafficType,
      is_bot: traffic.isBot,
      is_internal: internal,
      is_countable: traffic.isCountable,
      session_id: sessionId,
      previous_product_id: Number.isSafeInteger(previousProductId) ? previousProductId : null,
      page_type: pageType,
      page_path: pagePath,
      page_instance_id: payload.page_instance_id && isUuid(payload.page_instance_id) ? payload.page_instance_id : null,
      device_type: clientProfile.deviceType,
      os_name: clientProfile.osName,
      browser_name: clientProfile.browserName,
      source_platform: attribution.sourcePlatform,
      first_touch_source: attribution.firstTouchSource,
      session_source: attribution.sessionSource,
      utm_source: attribution.utmSource,
      utm_medium: attribution.utmMedium,
      utm_campaign: attribution.utmCampaign,
      utm_content: attribution.utmContent,
      utm_term: attribution.utmTerm,
      referrer_host: attribution.referrerHost,
      duration_seconds: payload.duration_seconds ? Number(payload.duration_seconds) : 0,
      metadata: validMetadata({
        ...(payload.metadata || {}),
        source_evidence: attribution.sourceEvidence,
        source_confidence: attribution.sourceConfidence,
        source_detail: attribution.sourceDetail,
      }),
      created_at: new Date().toISOString(),
      ...productSnapshot,
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('algorithm_events')
      .insert(eventData)
      .select('id')
      .single()

    if (insertError) {
      console.error('[slab-algorithm-events] insert failed:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // 6. Build Response & Set Tracking Cookies
    const response = NextResponse.json({ success: true, event_id: inserted?.id })

    const cookieOptions = {
      path: '/',
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    }

    // Visitor cookie (13 months)
    response.cookies.set(VISITOR_COOKIE_NAME, visitorId, {
      ...cookieOptions,
      maxAge: 400 * 24 * 60 * 60,
    })

    // Session cookie (30 minutes sliding)
    response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      ...cookieOptions,
      maxAge: 30 * 60,
    })

    if (productId) {
      response.cookies.set(LAST_PRODUCT_COOKIE_NAME, String(productId), {
        ...cookieOptions,
        maxAge: 30 * 60,
      })
    }

    if (!cookieStore.get(FIRST_TOUCH_COOKIE_NAME)) {
      response.cookies.set(FIRST_TOUCH_COOKIE_NAME, attribution.firstTouchSource, {
        ...cookieOptions,
        maxAge: 400 * 24 * 60 * 60,
      })
    }

    response.cookies.set(SESSION_SOURCE_COOKIE_NAME, attribution.sessionSource, {
      ...cookieOptions,
      maxAge: 30 * 60,
    })

    return response
  } catch (err: any) {
    console.error('[slab-algorithm-events] error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
