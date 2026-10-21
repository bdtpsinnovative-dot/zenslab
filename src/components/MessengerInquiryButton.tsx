"use client"

import { useEffect, useRef, useState } from 'react'
import { FiArrowUpRight, FiCheck, FiCircle, FiLoader, FiMessageCircle, FiAlertTriangle, FiX } from 'react-icons/fi'
import styles from './MessengerInquiryButton.module.css'

export const MESSENGER_INBOX_URL = 'https://m.me/zenslab.th'
export const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/zenslab.th/'
export const LINE_PROFILE_URL = 'https://lin.ee/uirA2CX'

export type MessengerInquiryState = 'default' | 'loading' | 'error' | 'success'
export type MessengerInquiryPreviewState = 'default' | 'hover' | 'focus' | 'active'

export type MessengerInquiryButtonProps = {
  productName?: string
  state?: MessengerInquiryState
  disabled?: boolean
  preview?: boolean
  previewState?: MessengerInquiryPreviewState
  previewOpen?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

/* Official SVG Icons for Channels */
export function LineIconSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.066.51.25l2.451 3.328V8.108c0-.345.282-.63.63-.63.346 0 .626.285.626.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  )
}

export function MessengerIconSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.192 14.963l-3.056-3.26-5.963 3.26L10.772 7.84l3.12 3.26 5.898-3.26-6.598 7.123z" />
    </svg>
  )
}

export function InstagramIconSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function ButtonIcon({ state, disabled, open }: { state: MessengerInquiryState; disabled: boolean; open: boolean }) {
  if (disabled) {
    return <FiMessageCircle aria-hidden="true" className={styles.icon} />
  }

  if (state === 'loading') {
    return <FiLoader aria-hidden="true" className={`${styles.icon} ${styles.spinner}`} />
  }

  if (state === 'error') {
    return <FiAlertTriangle aria-hidden="true" className={styles.icon} />
  }

  if (state === 'success') {
    return <FiCheck aria-hidden="true" className={styles.icon} />
  }

  return open ? (
    <FiX aria-hidden="true" className={`${styles.icon} ${styles.iconClose}`} />
  ) : (
    <FiMessageCircle aria-hidden="true" className={styles.icon} />
  )
}

export default function MessengerInquiryButton({
  productName,
  state = 'default',
  disabled = false,
  preview = false,
  previewState = 'default',
  previewOpen = false,
  isOpen,
  onOpenChange,
}: MessengerInquiryButtonProps) {
  const [internalOpen, setInternalOpen] = useState(previewOpen)
  const isControlled = typeof isOpen === 'boolean'
  const open = isControlled ? isOpen : internalOpen

  const setOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof next === 'function' ? next(open) : next
    if (!isControlled) {
      setInternalOpen(nextVal)
    }
    onOpenChange?.(nextVal)
  }

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const isUnavailable = disabled || state === 'loading'
  const visualState = disabled ? 'disabled' : state

  useEffect(() => {
    const handleGlobalInquiry = () => {
      setOpen(true)
    }
    window.addEventListener('open-inquiry-modal', handleGlobalInquiry)
    return () => window.removeEventListener('open-inquiry-modal', handleGlobalInquiry)
  }, [isControlled, open])

  useEffect(() => {
    if (!open || preview) return

    panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (target?.closest?.('[data-inquiry-trigger="true"]')) {
        return
      }
      if (target?.closest?.('[data-inquiry-backdrop="true"]')) {
        setOpen(false)
        return
      }
      if (!panelRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, preview])

  return (
    <>
      {open && !preview ? (
        <div
          data-inquiry-backdrop="true"
          className={styles.backdrop}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      ) : null}
      <div
        ref={rootRef}
        className={styles.root}
        data-preview={preview ? 'true' : undefined}
      >
        {open ? (
          <div
            ref={panelRef}
            id="contact-channel-menu"
            role="menu"
            aria-label="ช่องทางติดต่อสอบถาม ZENSLAB"
            className={styles.panel}
          >
            {/* Header */}
            <div className={styles.panelHeader}>
              <div className={styles.brandCenterWrap}>
                <span className={styles.brandText}>ZENSLAB</span>
              </div>

              <div className={styles.headerContent}>
                <h3 className={styles.headerTitle}>สอบถาม & สั่งซื้อสินค้า</h3>
                {productName ? (
                  <p className={styles.headerSubtitle} title={productName}>
                    <span className={styles.productTag}>ชิ้นที่สนใจ</span>
                    <span className={styles.productNameText}>{productName}</span>
                  </p>
                ) : null}
              </div>
            </div>

            {/* Channel Cards */}
            <div className={styles.channelList}>
              {/* 1. LINE */}
              <a
                href={LINE_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                data-analytics-event={preview ? undefined : 'open_line_contact'}
                data-analytics-product-name={productName || undefined}
                className={styles.channel}
                onClick={() => setOpen(false)}
              >
                <span className={styles.channelIconWrap} data-channel="line">
                  <LineIconSvg className={styles.brandIconSvg} />
                </span>
                <div className={styles.channelInfo}>
                  <div className={styles.channelTitleRow}>
                    <span className={styles.channelName}>LINE</span>
                  </div>
                  <span className={styles.channelDesc}>สอบถามสินค้าโดยตรง</span>
                </div>
                <div className={styles.arrowWrap}>
                  <FiArrowUpRight aria-hidden="true" className={styles.channelArrow} />
                </div>
              </a>

              {/* 2. Messenger */}
              <a
                href={MESSENGER_INBOX_URL}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                data-analytics-event={preview ? undefined : 'open_messenger_inquiry'}
                data-analytics-product-name={productName || undefined}
                className={styles.channel}
                onClick={() => setOpen(false)}
              >
                <span className={styles.channelIconWrap} data-channel="messenger">
                  <MessengerIconSvg className={styles.brandIconSvg} />
                </span>
                <div className={styles.channelInfo}>
                  <div className={styles.channelTitleRow}>
                    <span className={styles.channelName}>Messenger</span>
                  </div>
                  <span className={styles.channelDesc}>Inbox</span>
                </div>
                <div className={styles.arrowWrap}>
                  <FiArrowUpRight aria-hidden="true" className={styles.channelArrow} />
                </div>
              </a>

              {/* 3. Instagram */}
              <a
                href={INSTAGRAM_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                data-analytics-event={preview ? undefined : 'open_instagram_profile'}
                data-analytics-product-name={productName || undefined}
                className={styles.channel}
                onClick={() => setOpen(false)}
              >
                <span className={styles.channelIconWrap} data-channel="instagram">
                  <InstagramIconSvg className={styles.brandIconSvg} />
                </span>
                <div className={styles.channelInfo}>
                  <div className={styles.channelTitleRow}>
                    <span className={styles.channelName}>Instagram</span>
                  </div>
                  <span className={styles.channelDesc}>@zenslab.th · ดูรูปและมุมจัดวาง</span>
                </div>
                <div className={styles.arrowWrap}>
                  <FiArrowUpRight aria-hidden="true" className={styles.channelArrow} />
                </div>
              </a>
            </div>

            {/* Footer Note */}
            <div className={styles.panelFooter}>
              <FiCircle className={styles.footerIcon} aria-hidden="true" />
              <span>ยินดีให้คำปรึกษา</span>
            </div>
          </div>
        ) : null}

        {/* Trigger Button */}
        <button
          ref={triggerRef}
          type="button"
          data-inquiry-trigger="true"
          disabled={isUnavailable}
          aria-label={open ? 'ปิดช่องทางติดต่อ' : `เลือกช่องทางเพื่อสอบถามเกี่ยวกับ ${productName || 'ZENSLAB'}`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls="contact-channel-menu"
          data-analytics-event={isUnavailable || preview ? undefined : 'open_contact_channels'}
          data-analytics-product-name={productName || undefined}
          data-state={visualState}
          data-preview-state={preview ? previewState : undefined}
          data-open={open ? 'true' : 'false'}
          className={styles.trigger}
          onClick={() => setOpen((current) => !current)}
        >
          <span className={styles.triggerContent}>
            <ButtonIcon state={state} disabled={disabled} open={open} />
            {!open && <span className={styles.triggerLabel}>สอบถามสินค้า</span>}
          </span>
        </button>
      </div>
    </>
  )
}
