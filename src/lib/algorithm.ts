import 'server-only'

import {
  detectAttribution,
  isSourceConfidence,
  isSourceEvidence,
  type SourceConfidence,
  type SourceEvidence,
} from './attribution'

export {
  FIRST_TOUCH_COOKIE_NAME,
  SESSION_SOURCE_COOKIE_NAME,
  SOURCE_CONFIDENCE_COOKIE_NAME,
  SOURCE_DETAIL_COOKIE_NAME,
  SOURCE_EVIDENCE_COOKIE_NAME,
  SOURCE_REFERRER_COOKIE_NAME,
  classifySource,
} from './attribution'

export const VISITOR_COOKIE_NAME = 'slab_visitor_id'
export const SESSION_COOKIE_NAME = 'slab_session_id'
export const LAST_PRODUCT_COOKIE_NAME = 'slab_last_product_id'
export const ALGORITHM_EVENT_TYPE = 'product_view'

const BOT_USER_AGENT = /bot|crawler|spider|slurp|headless|prerender|facebookexternalhit|whatsapp/i

const isIP = (ip: string): number => {
  const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6 = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i

  if (ipv4.test(ip)) return 4
  if (ipv6.test(ip)) return 6
  return 0
}

async function hashHex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export type AttributionData = {
  sourcePlatform: string
  firstTouchSource: string
  sessionSource: string
  referrerHost: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
  sourceEvidence: SourceEvidence
  sourceConfidence: SourceConfidence
  sourceDetail: string | null
}

function firstHeaderValue(value: string | null): string | null {
  return value?.split(',')[0]?.trim() || null
}

export function getTrustedClientIp(headers: Headers): string | null {
  const candidates: Array<string | null> = []

  if (headers.get('cf-ray')) {
    candidates.push(headers.get('cf-connecting-ip'))
  }
  if (headers.get('x-vercel-id') || headers.get('x-vercel-ip-country')) {
    candidates.push(firstHeaderValue(headers.get('x-forwarded-for')))
    candidates.push(headers.get('x-real-ip'))
  }
  candidates.push(headers.get('x-real-ip'))
  candidates.push(firstHeaderValue(headers.get('x-forwarded-for')))

  return candidates.find((candidate): candidate is string => Boolean(candidate && isIP(candidate) > 0)) || null
}

export async function hashClientIp(ip: string | null): Promise<string | null> {
  if (!ip) return null
  return hashHex(`slab-ip-v1:${ip}`)
}

export function isInternalIp(ip: string | null): boolean {
  if (!ip) return false
  return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.')
}

export function classifyTraffic(userAgent: string | null, internal: boolean) {
  const isBot = Boolean(userAgent && BOT_USER_AGENT.test(userAgent))
  const trafficType = isBot ? 'bot' : internal ? 'internal' : 'unknown'

  return {
    isBot,
    trafficType,
    isCountable: !isBot && !internal,
  } as const
}

function cleanAttributionValue(value: string | null, maxLength = 200): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

export function getClientProfile(userAgent: string | null) {
  const ua = userAgent || ''
  const deviceType = /ipad|tablet|android(?!.*mobile)/i.test(ua)
    ? 'tablet'
    : /mobile|iphone|ipod|android/i.test(ua)
      ? 'mobile'
      : 'desktop'
  const osName = /windows/i.test(ua)
    ? 'Windows'
    : /android/i.test(ua)
      ? 'Android'
      : /iphone|ipad|ipod/i.test(ua)
        ? 'iOS'
        : /mac os|macintosh/i.test(ua)
          ? 'macOS'
          : /linux/i.test(ua)
            ? 'Linux'
            : 'Other'
  const browserName = /edg\//i.test(ua)
    ? 'Edge'
    : /chrome\//i.test(ua)
      ? 'Chrome'
      : /firefox\//i.test(ua)
        ? 'Firefox'
        : /safari\//i.test(ua) && !/chrome\//i.test(ua)
          ? 'Safari'
          : /opr\//i.test(ua)
            ? 'Opera'
            : 'Other'
  return { deviceType, osName, browserName }
}

export function getAttributionData(
  requestUrl: string,
  referrer: string | null,
  firstTouchCookie: string | null,
  sessionSourceCookie: string | null,
  evidenceCookie: string | null = null,
  confidenceCookie: string | null = null,
  detailCookie: string | null = null,
  referrerHostCookie: string | null = null,
): AttributionData {
  const url = new URL(requestUrl)
  const params = url.searchParams
  const utmSource = cleanAttributionValue(params.get('utm_source'))
  const utmMedium = cleanAttributionValue(params.get('utm_medium'))
  const utmCampaign = cleanAttributionValue(params.get('utm_campaign'))
  const utmContent = cleanAttributionValue(params.get('utm_content'))
  const utmTerm = cleanAttributionValue(params.get('utm_term'))
  const detected = detectAttribution(requestUrl, referrer)
  const hasExplicitCurrentSource = detected.evidence !== 'direct'
  const sourcePlatform = hasExplicitCurrentSource ? detected.sourcePlatform : sessionSourceCookie || detected.sourcePlatform
  const sourceEvidence = hasExplicitCurrentSource
    ? detected.evidence
    : isSourceEvidence(evidenceCookie) ? evidenceCookie : detected.evidence
  const sourceConfidence = hasExplicitCurrentSource
    ? detected.confidence
    : isSourceConfidence(confidenceCookie) ? confidenceCookie : detected.confidence
  const sourceDetail = hasExplicitCurrentSource ? detected.detail : detailCookie || detected.detail
  const referrerHost = hasExplicitCurrentSource ? detected.referrerHost : referrerHostCookie || detected.referrerHost
  return {
    sourcePlatform,
    firstTouchSource: firstTouchCookie || sourcePlatform,
    sessionSource: sourcePlatform,
    referrerHost,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    sourceEvidence,
    sourceConfidence,
    sourceDetail,
  }
}

export function getViewBucket(date = new Date()): number {
  return Math.floor(date.getTime() / (30 * 60 * 1000))
}
