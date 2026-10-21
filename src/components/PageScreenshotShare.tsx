"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { Camera, Share2, Copy, Download, Check, X, Loader2, Smartphone, Monitor, ChevronLeft, ChevronRight } from "lucide-react"
import html2canvas from "html2canvas"
import { BRAND_DARK_LOGO_BASE64 } from "@/src/constants/brandLogo"

export interface CatalogItem {
  id: string | number
  name: string
  sku?: string
  size?: string
  imageUrl?: string
  price?: number | null
  discountedPrice?: number | null
  discountValue?: number | null
  discountType?: string | null
  outOfStock?: boolean
  statusText?: string
}

interface PageScreenshotShareProps {
  categoryName?: string
  items: CatalogItem[]
  currentPage?: number
  totalPages?: number
  className?: string
  showFloatingButton?: boolean
}

function getCleanImageUrl(url?: string): string {
  if (!url) return ""
  if (url.startsWith("data:")) return url
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}cors=1`
}

export default function PageScreenshotShare({
  categoryName = "WOOD SLABS COLLECTION",
  items = [],
  currentPage = 1,
  totalPages = 1,
  className = "",
  showFloatingButton = true,
}: PageScreenshotShareProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"mobile" | "desktop">("mobile")
  const [itemsPerSheet, setItemsPerSheet] = useState<number>(8)
  const [currentSheet, setCurrentSheet] = useState<number>(1)
  const [isGenerating, setIsGenerating] = useState(false)

  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [copySuccess, setCopySuccess] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)
  const [flashActive, setFlashActive] = useState(false)

  const mobileContainerRef = useRef<HTMLDivElement | null>(null)
  const desktopContainerRef = useRef<HTMLDivElement | null>(null)

  const totalSheets = Math.ceil(items.length / itemsPerSheet) || 1
  const sheetItems = items.slice((currentSheet - 1) * itemsPerSheet, currentSheet * itemsPerSheet)

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanNativeShare(true)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const generateCapture = useCallback(async (tab: "mobile" | "desktop", sheetNum: number, perSheet: number) => {
    const container = tab === "mobile" ? mobileContainerRef.current : desktopContainerRef.current
    if (!container) return

    setIsGenerating(true)
    try {
      await new Promise((r) => setTimeout(r, 120))

      const imgElements = Array.from(container.querySelectorAll("img"))
      await Promise.all(
        imgElements.map((img) => {
          if (img.complete && img.naturalHeight > 0) {
            return img.decode ? img.decode().catch(() => {}) : Promise.resolve()
          }
          return new Promise<void>((resolve) => {
            let done = false
            const finish = () => {
              if (done) return
              done = true
              if (img.decode) {
                img.decode().then(() => resolve()).catch(() => resolve())
              } else {
                resolve()
              }
            }
            img.onload = finish
            img.onerror = () => {
              if (done) return
              done = true
              resolve()
            }
            setTimeout(finish, 3500)
          })
        })
      )

      await new Promise((r) => setTimeout(r, 120))

      const canvas = await html2canvas(container, {
        useCORS: true,
        allowTaint: true,
        scale: tab === "mobile" ? 2 : 1.5,
        backgroundColor: "#FAF9F6",
        logging: false,
        imageTimeout: 15000,
      })

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            setPreviewBlob(blob)
            setPreviewUrl(url)
          }
          setIsGenerating(false)
        },
        "image/png",
        0.92
      )
    } catch (err) {
      console.error("Screenshot capture error:", err)
      setIsGenerating(false)
    }
  }, [])

  const handleOpenModal = () => {
    setFlashActive(true)
    setTimeout(() => setFlashActive(false), 250)
    setIsModalOpen(true)
    generateCapture(activeTab, currentSheet, itemsPerSheet)
  }

  const handleTabChange = (tab: "mobile" | "desktop") => {
    setActiveTab(tab)
    generateCapture(tab, currentSheet, itemsPerSheet)
  }

  const handleItemsPerSheetChange = (count: number) => {
    setItemsPerSheet(count)
    setCurrentSheet(1)
    generateCapture(activeTab, 1, count)
  }

  const handleSheetChange = (newSheet: number) => {
    if (newSheet < 1 || newSheet > totalSheets) return
    setCurrentSheet(newSheet)
    generateCapture(activeTab, newSheet, itemsPerSheet)
  }

  const handleCopyImage = async () => {
    if (!previewBlob) return
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": previewBlob,
          }),
        ])
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2500)
      } else {
        handleDownload()
      }
    } catch (err) {
      console.warn("Copy to clipboard failed:", err)
      handleDownload()
    }
  }

  const handleNativeShare = async () => {
    if (!previewBlob) return
    const filename = `zenslab-${activeTab}-sheet${currentSheet}.png`
    const file = new File([previewBlob], filename, { type: "image/png" })

    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "ZENSLABS Collection",
          text: `รายการแผ่นไม้ธรรมชาติ ZENSLABS (${categoryName} • แผ่นที่ ${currentSheet}/${totalSheets})`,
        })
      } else if (navigator.share) {
        await navigator.share({
          title: "ZENSLABS Collection",
          url: window.location.href,
        })
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("Native share error:", err)
      }
    }
  }

  const handleDownload = () => {
    if (!previewUrl) return
    const a = document.createElement("a")
    a.href = previewUrl
    a.download = `zenslab-${activeTab}-sheet${currentSheet}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <>
      {flashActive && (
        <div className="fixed inset-0 z-[9999] pointer-events-none bg-white/70 backdrop-blur-[2px] transition-opacity duration-300" />
      )}

      {/* Floating Button right above inquiry button */}
      {showFloatingButton && (
        <div
          className="fixed z-40 no-screenshot right-[max(1rem,env(safe-area-inset-right))] min-[481px]:right-[max(1.25rem,env(safe-area-inset-right))] bottom-[calc(max(1rem,env(safe-area-inset-bottom))+3.25rem)] min-[481px]:bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+3.4rem)]"
          data-no-screenshot="true"
        >
          <button
            type="button"
            onClick={handleOpenModal}
            aria-label="แชร์ภาพหน้าเว็บ"
            title="แชร์ภาพหน้าเว็บ (เลือกแบบมือถือ หรือ คอมพิวเตอร์)"
            className={`flex items-center justify-center w-[2.625rem] h-[2.625rem] sm:w-auto sm:h-auto p-0 sm:px-3.5 sm:py-2.5 sm:gap-2 bg-[#1C1917] hover:bg-[#C8935A] text-white rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] shadow-xl transition-all duration-300 active:scale-95 border border-white/20 cursor-pointer group ${className}`}
          >
            <div className="flex items-center justify-center sm:p-1 rounded-full bg-transparent sm:bg-[#C8935A] group-hover:sm:bg-white text-white group-hover:sm:text-[#1C1917] transition-colors">
              <Camera className="w-[1.05rem] h-[1.05rem] sm:w-3.5 sm:h-3.5" />
            </div>
            <span className="hidden sm:inline">แชร์ภาพหน้าเว็บ</span>
          </button>
        </div>
      )}

      {/* Modal Preview */}
      {isModalOpen && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm no-screenshot"
          data-no-screenshot="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false)
          }}
        >
          <div className="relative w-full max-w-xl sm:max-w-2xl bg-[#FAF9F6] rounded-[8px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-[#C8935A]/30">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-zinc-200 bg-[#F4F1EA]">
              <div className="flex items-center gap-2 min-w-0">
                <Camera className="w-4 h-4 text-[#C8935A] shrink-0" />
                <h2 className="text-[11px] sm:text-xs font-bold tracking-[0.08em] sm:tracking-[0.14em] uppercase text-zinc-800 truncate">
                  แชร์ภาพหน้าเว็บ ZENSLABS
                  <span className="hidden sm:inline font-normal text-zinc-500 ml-1.5">
                    (เลือกรูปแบบและจำนวนสินค้า)
                  </span>
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
                className="p-1 -mr-1 rounded text-zinc-400 hover:text-zinc-800 hover:bg-black/5 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls Bar */}
            <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-zinc-200 bg-white flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2 sm:gap-3">
              {/* Format Switcher */}
              <div className="grid grid-cols-2 sm:flex items-center gap-1 bg-[#F4F1EA] p-1 rounded">
                <button
                  type="button"
                  onClick={() => handleTabChange("mobile")}
                  className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === "mobile"
                      ? "bg-[#1C1917] text-white shadow-xs"
                      : "text-zinc-700 hover:text-[#C8935A]"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 shrink-0" />
                  <span>มือถือ (2 คอลัมน์)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("desktop")}
                  className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === "desktop"
                      ? "bg-[#1C1917] text-white shadow-xs"
                      : "text-zinc-700 hover:text-[#C8935A]"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5 shrink-0" />
                  <span>คอม (4 คอลัมน์)</span>
                </button>
              </div>

              {/* Items Per Sheet */}
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider whitespace-nowrap shrink-0">
                  แผ่นไม้ต่อรูป:
                </span>
                <div className="grid grid-cols-4 sm:flex flex-1 sm:flex-initial items-center gap-1 bg-[#F4F1EA] p-1 rounded">
                  {[8, 12, 16, 40].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => handleItemsPerSheetChange(count)}
                      className={`px-2 sm:px-2.5 py-1 rounded text-[10px] font-bold whitespace-nowrap text-center transition-all cursor-pointer ${
                        itemsPerSheet === count
                          ? "bg-[#C8935A] text-white shadow-xs"
                          : "text-zinc-700 hover:bg-black/5"
                      }`}
                    >
                      {count === 40 ? "ทั้งหมด" : `${count} แผ่น`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pagination if > 1 */}
            {totalSheets > 1 && (
              <div className="px-3.5 sm:px-5 py-2 border-b border-zinc-200 bg-[#FAF9F6] flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0 whitespace-nowrap">
                  <span className="text-[11px] font-bold text-zinc-800">
                    แผ่นที่ {currentSheet}/{totalSheets}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-normal">
                    (รายการที่ {(currentSheet - 1) * itemsPerSheet + 1}–{Math.min(currentSheet * itemsPerSheet, items.length)})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={currentSheet === 1 || isGenerating}
                    onClick={() => handleSheetChange(currentSheet - 1)}
                    className="px-2.5 py-1 bg-white border border-zinc-200 hover:border-[#C8935A] rounded text-[10px] font-bold disabled:opacity-40 flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer"
                  >
                    <ChevronLeft className="w-3 h-3 shrink-0" />
                    <span>ก่อนหน้า</span>
                  </button>
                  <button
                    type="button"
                    disabled={currentSheet === totalSheets || isGenerating}
                    onClick={() => handleSheetChange(currentSheet + 1)}
                    className="px-2.5 py-1 bg-white border border-zinc-200 hover:border-[#C8935A] rounded text-[10px] font-bold disabled:opacity-40 flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer"
                  >
                    <span>ถัดไป</span>
                    <ChevronRight className="w-3 h-3 shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {/* Preview Box */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 flex flex-col items-center justify-center min-h-[280px] sm:min-h-[360px] bg-zinc-100/60">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#C8935A]">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-xs uppercase tracking-wider font-semibold text-zinc-800 text-center">
                    กำลังเรนเดอร์ภาพแผ่นไม้แผ่นที่ {currentSheet} ({activeTab === "mobile" ? "หน้าจอมือถือ" : "หน้าจอคอม"})...
                  </p>
                </div>
              ) : previewUrl ? (
                <div className="relative max-w-full shadow-lg rounded overflow-hidden border border-zinc-200 max-h-[46vh] sm:max-h-[50vh]">
                  <img
                    src={previewUrl}
                    alt="Captured Wood Slab Webpage Preview"
                    className="w-full h-auto block select-none max-h-[46vh] sm:max-h-[50vh] object-contain"
                  />
                </div>
              ) : (
                <button
                  onClick={() => generateCapture(activeTab, currentSheet, itemsPerSheet)}
                  className="px-4 py-2 text-xs bg-[#1C1917] text-white rounded cursor-pointer"
                >
                  ลองสร้างใหม่อีกครั้ง
                </button>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-3.5 sm:p-5 border-t border-zinc-200 bg-[#FAF9F6] flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                {canNativeShare && (
                  <button
                    onClick={handleNativeShare}
                    disabled={isGenerating || !previewBlob}
                    className="col-span-2 py-3 px-4 bg-[#1C1917] hover:bg-[#C8935A] text-white text-[10.5px] sm:text-[11px] font-bold tracking-[0.08em] sm:tracking-[0.14em] uppercase rounded flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 shrink-0" />
                    <span>แชร์เข้า LINE / ส่งแชทลูกค้า (แผ่นที่ {currentSheet})</span>
                  </button>
                )}

                <button
                  onClick={handleCopyImage}
                  disabled={isGenerating || !previewBlob}
                  className={`py-2.5 sm:py-3 px-2.5 sm:px-3 border text-[10px] font-bold tracking-[0.08em] sm:tracking-[0.12em] uppercase rounded flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-[0.99] disabled:opacity-50 whitespace-nowrap cursor-pointer ${
                    copySuccess
                      ? "bg-[#C8935A] text-white border-[#C8935A]"
                      : "bg-white border-zinc-300 text-zinc-800 hover:text-[#C8935A] hover:border-[#C8935A]"
                  } ${!canNativeShare ? "col-span-1" : ""}`}
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white shrink-0" />
                      <span>คัดลอกรูปแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 shrink-0" />
                      <span>คัดลอกรูปภาพ</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  disabled={isGenerating || !previewUrl}
                  className={`py-2.5 sm:py-3 px-2.5 sm:px-3 bg-white border border-zinc-300 hover:border-[#C8935A] text-zinc-800 hover:text-[#C8935A] text-[10px] font-bold tracking-[0.08em] sm:tracking-[0.12em] uppercase rounded flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-[0.99] disabled:opacity-50 whitespace-nowrap cursor-pointer ${
                    !canNativeShare ? "col-span-1" : ""
                  }`}
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>บันทึกรูป PNG</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================ */}
      {/* OFF-SCREEN RENDER CONTAINERS FOR CRISP HIGH-RES SCREENSHOTS  */}
      {/* ============================================================ */}

      {/* 1. MOBILE CONTAINER (720px width, 2 columns, luxury wood slab grid) */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "720px",
          backgroundColor: "#FAF9F6",
          color: "#1C1917",
          padding: "36px 28px 28px 28px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          zIndex: -100,
        }}
        ref={mobileContainerRef}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <img
            src={BRAND_DARK_LOGO_BASE64}
            alt="ZENSLABS"
            style={{
              maxHeight: "56px",
              width: "auto",
              margin: "0 auto 12px auto",
              display: "block",
            }}
          />
          <div style={{ padding: "5px 16px", backgroundColor: "#EDE8DF", display: "inline-block", borderRadius: "2px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", color: "#1C1917", textTransform: "uppercase" }}>
            {categoryName} {totalSheets > 1 ? `• SHEET ${currentSheet}/${totalSheets}` : ""}
          </div>
        </div>

        {/* 2-Column Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            borderTop: "1px solid #D5D0C5",
            borderLeft: "1px solid #D5D0C5",
            marginBottom: "22px",
          }}
        >
          {sheetItems.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              style={{
                backgroundColor: "#FAF9F6",
                padding: "0 0 20px 0",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "center",
                borderRight: "1px solid #D5D0C5",
                borderBottom: "1px solid #D5D0C5",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Product Photo */}
              <div
                style={{
                  width: "100%",
                  height: "250px",
                  backgroundColor: "#F3EFE6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {item.imageUrl ? (
                  <img
                    src={getCleanImageUrl(item.imageUrl)}
                    alt={item.name}
                    crossOrigin="anonymous"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      padding: "6px",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.2em" }}>
                    NO IMAGE
                  </span>
                )}

                {/* Status Badge */}
                {item.statusText && (
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      backgroundColor: item.statusText === "SOLD OUT" ? "#991B1B" : "#B45309",
                      color: "#fff",
                      fontSize: "9px",
                      fontWeight: 800,
                      letterSpacing: "0.15em",
                      padding: "3px 8px",
                      borderRadius: "2px",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.statusText}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "100%", padding: "0 10px" }}>
                <h3
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    textAlign: "center",
                    margin: "0 0 4px 0",
                    color: "#1C1917",
                    lineHeight: 1.35,
                  }}
                >
                  {item.name ? item.name.substring(0, 32) : "WOOD SLAB"}
                </h3>

                {item.size && (
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#C8935A",
                      letterSpacing: "0.08em",
                      marginBottom: "6px",
                      fontVariantNumeric: "lining-nums tabular-nums",
                    }}
                  >
                    {item.size}
                  </div>
                )}

                {item.sku && (
                  <div style={{ fontSize: "10px", color: "#78716C", letterSpacing: "0.06em", marginBottom: "4px" }}>
                    SKU: {item.sku}
                  </div>
                )}

                {item.discountedPrice && item.price && item.discountedPrice < item.price ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontVariantNumeric: "lining-nums tabular-nums" }}>
                    <span style={{ fontSize: "11px", color: "#A8A29E", textDecoration: "line-through" }}>
                      ฿{Number(item.price).toLocaleString()}
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#1C1917", letterSpacing: "0.04em" }}>
                      ฿{Number(item.discountedPrice).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#1C1917", letterSpacing: "0.04em", fontVariantNumeric: "lining-nums tabular-nums" }}>
                    {item.price && item.price > 0 ? `฿${Number(item.price).toLocaleString()}` : "ติดต่อสอบถาม"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "6px", borderTop: "1px solid #D5D0C5" }}>
          <span style={{ fontSize: "12px", color: "#1C1917", fontWeight: 700, letterSpacing: "0.08em" }}>
            zen-slab.com
          </span>
          <span style={{ fontSize: "11px", color: "#C8935A", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Premium Live Edge Wood Slabs
          </span>
        </div>
      </div>

      {/* 2. DESKTOP CONTAINER (1320px width, 4 columns, luxury editorial grid) */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "1320px",
          backgroundColor: "#FAF9F6",
          color: "#1C1917",
          padding: "44px 40px 34px 40px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          zIndex: -100,
        }}
        ref={desktopContainerRef}
      >
        {/* Brand Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "26px" }}>
          <div>
            <img
              src={BRAND_DARK_LOGO_BASE64}
              alt="ZENSLABS"
              style={{
                maxHeight: "64px",
                width: "auto",
                display: "block",
              }}
            />
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ padding: "7px 18px", backgroundColor: "#EDE8DF", borderRadius: "2px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em", color: "#1C1917", textTransform: "uppercase" }}>
              {categoryName} {totalSheets > 1 ? `• SHEET ${currentSheet}/${totalSheets}` : ""}
            </span>
          </div>
        </div>

        {/* 4-Column Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            borderTop: "1px solid #D5D0C5",
            borderLeft: "1px solid #D5D0C5",
            marginBottom: "26px",
          }}
        >
          {sheetItems.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              style={{
                backgroundColor: "#FAF9F6",
                padding: "0 0 22px 0",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "center",
                borderRight: "1px solid #D5D0C5",
                borderBottom: "1px solid #D5D0C5",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Product Photo */}
              <div
                style={{
                  width: "100%",
                  height: "240px",
                  backgroundColor: "#F3EFE6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {item.imageUrl ? (
                  <img
                    src={getCleanImageUrl(item.imageUrl)}
                    alt={item.name}
                    crossOrigin="anonymous"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      padding: "8px",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.2em" }}>
                    NO IMAGE
                  </span>
                )}

                {/* Status Badge */}
                {item.statusText && (
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      backgroundColor: item.statusText === "SOLD OUT" ? "#991B1B" : "#B45309",
                      color: "#fff",
                      fontSize: "9px",
                      fontWeight: 800,
                      letterSpacing: "0.15em",
                      padding: "3px 8px",
                      borderRadius: "2px",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.statusText}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "100%", padding: "0 12px" }}>
                <h3
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    textAlign: "center",
                    margin: "0 0 4px 0",
                    color: "#1C1917",
                    lineHeight: 1.35,
                  }}
                >
                  {item.name ? item.name.substring(0, 32) : "WOOD SLAB"}
                </h3>

                {item.size && (
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#C8935A",
                      letterSpacing: "0.08em",
                      marginBottom: "6px",
                      fontVariantNumeric: "lining-nums tabular-nums",
                    }}
                  >
                    {item.size}
                  </div>
                )}

                {item.sku && (
                  <div style={{ fontSize: "10px", color: "#78716C", letterSpacing: "0.06em", marginBottom: "4px" }}>
                    SKU: {item.sku}
                  </div>
                )}

                {item.discountedPrice && item.price && item.discountedPrice < item.price ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontVariantNumeric: "lining-nums tabular-nums" }}>
                    <span style={{ fontSize: "11px", color: "#A8A29E", textDecoration: "line-through" }}>
                      ฿{Number(item.price).toLocaleString()}
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: 800, color: "#1C1917", letterSpacing: "0.04em" }}>
                      ฿{Number(item.discountedPrice).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#1C1917", letterSpacing: "0.04em", fontVariantNumeric: "lining-nums tabular-nums" }}>
                    {item.price && item.price > 0 ? `฿${Number(item.price).toLocaleString()}` : "ติดต่อสอบถาม"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #D5D0C5" }}>
          <span style={{ fontSize: "13px", color: "#1C1917", fontWeight: 700, letterSpacing: "0.08em" }}>
            zen-slab.com
          </span>
          <span style={{ fontSize: "12px", color: "#C8935A", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Premium Live Edge Wood Slabs & Luxury Furniture
          </span>
        </div>
      </div>
    </>
  )
}
