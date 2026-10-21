'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

type AnalyticsEvent = {
  event_type: 'page_view' | 'session_start' | 'session_heartbeat' | 'session_end' | 'cta' | 'journey' | 'product_view'
  product_id?: number
  page_type?: string
  page_path?: string
  page_instance_id?: string
  duration_seconds?: number
  product_name_snapshot?: string
  product_sku_snapshot?: string
  product_material_snapshot?: string
  product_price_snapshot?: number | null
  metadata?: Record<string, unknown>
}

const TAB_KEY = 'slab_analytics_tab_id'

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function getTabId() {
  if (typeof window === 'undefined') return ''
  const existing = window.sessionStorage.getItem(TAB_KEY)
  if (existing) return existing
  const created = uuid()
  window.sessionStorage.setItem(TAB_KEY, created)
  return created
}

function classifyPage(pathname: string, searchParams: URLSearchParams) {
  if (pathname === '/') return { pageType: 'home' }
  if (pathname.includes('/woodslab/product')) {
    const id = searchParams.get('id')
    return { pageType: 'product', productId: id ? Number(id) : undefined }
  }
  if (pathname.includes('/woodslab')) return { pageType: 'catalog' }
  if (pathname.includes('/catalog')) return { pageType: 'catalog' }
  if (pathname.includes('/about')) return { pageType: 'about' }
  if (pathname.includes('/contact')) return { pageType: 'contact' }
  if (pathname.includes('/cart')) return { pageType: 'cart' }
  if (pathname.includes('/login')) return { pageType: 'login' }
  return { pageType: 'other' }
}

export default function AnalyticsTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const pageStartedAtRef = useRef(0)
  const lastActivityAtRef = useRef(0)
  const pageInstanceRef = useRef<string | null>(null)
  const activeSecondsRef = useRef(0)
  const sendRef = useRef<(event: AnalyticsEvent) => void>(() => undefined)
  const startedSessionRef = useRef(false)

  const send = useCallback((event: AnalyticsEvent) => {
    const body = {
      ...event,
      tracking_url: typeof window !== 'undefined' ? window.location.href : '',
      metadata: { ...(event.metadata || {}), tab_id: getTabId() },
    }
    void fetch('/api/algorithm/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      keepalive: event.event_type === 'session_end' || event.event_type === 'cta',
      body: JSON.stringify(body),
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    sendRef.current = send
  }, [send])

  // Track page transitions
  useEffect(() => {
    const now = Date.now()
    const instanceId = uuid()
    pageInstanceRef.current = instanceId
    pageStartedAtRef.current = now
    lastActivityAtRef.current = now
    activeSecondsRef.current = 0

    const currentUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : pathname
    const classified = classifyPage(pathname, searchParams)

    if (!startedSessionRef.current) {
      startedSessionRef.current = true
      sendRef.current({
        event_type: 'session_start',
        page_type: classified.pageType,
        page_path: currentUrl,
        page_instance_id: instanceId,
      })
    }

    sendRef.current({
      event_type: 'page_view',
      page_type: classified.pageType,
      page_path: currentUrl,
      page_instance_id: instanceId,
      product_id: classified.productId,
    })

    const onActivity = () => {
      lastActivityAtRef.current = Date.now()
    }

    window.addEventListener('mousemove', onActivity, { passive: true })
    window.addEventListener('scroll', onActivity, { passive: true })
    window.addEventListener('keydown', onActivity, { passive: true })
    window.addEventListener('click', onActivity, { passive: true })

    // Heartbeat every 15s when active
    const heartbeatTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - lastActivityAtRef.current < 60000) {
        activeSecondsRef.current += 15
        sendRef.current({
          event_type: 'session_heartbeat',
          page_type: classified.pageType,
          page_path: currentUrl,
          page_instance_id: instanceId,
          product_id: classified.productId,
          duration_seconds: activeSecondsRef.current,
        })
      }
    }, 15000)

    return () => {
      clearInterval(heartbeatTimer)
      window.removeEventListener('mousemove', onActivity)
      window.removeEventListener('scroll', onActivity)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('click', onActivity)

      const duration = Math.round((Date.now() - pageStartedAtRef.current) / 1000)
      if (duration > 1) {
        sendRef.current({
          event_type: 'journey',
          page_type: classified.pageType,
          page_path: currentUrl,
          page_instance_id: instanceId,
          product_id: classified.productId,
          duration_seconds: duration,
        })
      }
    }
  }, [pathname, searchParams])

  return null
}
