'use client'

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// ✅ Import Actions สินค้า
import {
  getProductDetail,
  getActiveDiscounts,
  getRecommendProducts,
  getProductLikeStatus,
  toggleProductLike
} from '../../../actions/product'

// ✅ Import Actions การสั่งซื้อ
import { addToCart, checkPaymentStatus, createDepositQR } from '@/app/actions/order'

import '../woodslab.css'

// --- CONFIG ---
const BUCKET = "product-images"
const PROJECT_URL = "https://zexflchjcycxrpjkuews.supabase.co"

// --- UTILS ---
const normalizeImg = (u: any) => {
  const s = String(u || "").trim()
  if (!s) return ""
  if (/^https?:\/\//i.test(s)) return s
  const cleanPath = s.replace(/^\/+/, "")
  return `${PROJECT_URL}/storage/v1/object/public/${BUCKET}/${cleanPath}`
}

const currency = (n: any) =>
  n ? new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n) : "ติดต่อสอบถาม"

const getSizeText = (specsOrRow: any, rowFallback?: any) => {
  if (!specsOrRow || typeof specsOrRow !== "object") return ""
  const specs = specsOrRow.specs && typeof specsOrRow.specs === "object" ? specsOrRow.specs : specsOrRow
  const row = rowFallback || (specsOrRow.specs ? specsOrRow : null)
  // Support legacy size_raw if present
  if (specs.size_raw) return specs.size_raw
  const direct = specs.size_text || specs.size || specs.dimension || specs.dimensions || specs.Size
  if (direct) return direct

  const l = specs.length_cm ?? specs.length_mm ?? specs.length ?? row?.length_cm
  const w = specs.width_cm ?? specs.width_mm ?? specs.width ?? row?.width_cm
  const t = specs.thickness_cm ?? specs.thickness_mm ?? specs.thickness ?? specs.height ?? row?.thickness_cm
  const parts = [l, w, t].filter(v => v !== null && v !== undefined && v !== "" && Number(v) > 0)
  if (parts.length > 0) return `${parts.join("-")} MM`
  return ""
}

const escClass = (v: string) => String(v || "").toLowerCase().replace(/[^a-z0-9_-]/g, "")

// ✅ Helper ใหม่: เช็คจำนวนสต็อก (เหมือนหน้า Main)
const getStockQty = (row: any) => {
  if (!row?.stock || !Array.isArray(row.stock) || row.stock.length === 0) return 99;
  return row.stock.reduce((sum: number, item: any) => sum + (parseFloat(item.qty) || 0), 0);
}

// --- CONSTANTS ---
const STATUS_META: any = {
  available: { label: "Available", canBuy: true, overlay: false },
  on_request: { label: "มีคนกำลังสนใจ", canBuy: true, overlay: true, en: "INTERESTED", jp: "Interested" },
  pending: { label: "Booked", canBuy: false, overlay: true, jp: "Reserved", en: "BOOKED" },
  reserved: { label: "Booked", canBuy: false, overlay: true, jp: "Reserved", en: "BOOKED" },
  hold: { label: "Booked", canBuy: false, overlay: true, jp: "Reserved", en: "BOOKED" },
  sold: { label: "Sold Out", canBuy: false, overlay: true, jp: "SOLD OUT", en: "SOLD OUT" },
  archived: { label: "Archive", canBuy: false, overlay: false },
  inactive: { label: "Archive", canBuy: false, overlay: false },
  draft: { label: "Draft", canBuy: false, overlay: false },
}

// --- ICON COMPONENTS ---
const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? "#e74c3c" : "none"} stroke={filled ? "#e74c3c" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'all 0.2s ease' }}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
)

function ProductContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const idParam = searchParams.get('id')

  // --- STATE ---
  const [product, setProduct] = useState<any>(null)
  const [discounts, setDiscounts] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])

  const [activeImage, setActiveImage] = useState("")
  const [dedupImages, setDedupImages] = useState<string[]>([])

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")

  const [qty, setQty] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ text: string, color: string } | null>(null)

  // ❤️ Like & Auth
  const [likeCount, setLikeCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // 🔹 QR Code Modal State
  const [showQR, setShowQR] = useState(false)
  const [qrUrl, setQrUrl] = useState("")
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Refs
  const zoomContainerRef = useRef<HTMLDivElement>(null)
  const mainImageRef = useRef<HTMLImageElement>(null)

  // --- Redirect Login ---
  const redirectToLogin = useCallback(() => {
    const currentPath = `/woodslab/product?id=${idParam}`
    router.push(`/login?next=${encodeURIComponent(currentPath)}`)
  }, [router, idParam])

  // --- LOGIC 1: Fetch Data ---
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const activeDiscounts = await getActiveDiscounts()
        setDiscounts(activeDiscounts)
        if (!idParam) { setErrorMsg("Product ID required"); return }

        const [prod, likeData] = await Promise.all([
          getProductDetail(idParam),
          getProductLikeStatus(idParam)
        ])

        if (!prod) { setErrorMsg("Product not found"); return }
        setProduct(prod)

        setLikeCount(likeData.count)
        setIsLiked(likeData.isLiked)
        setIsLoggedIn((likeData as any).isLoggedIn || false)

        // Images Logic
        const s = prod.specs || {}
        const main = normalizeImg(prod.image_url) || normalizeImg(s.main_image?.url)

        const rawExtras = Array.isArray(s.images) ? s.images : Array.isArray(s.gallery) ? s.gallery : []
        const extras = rawExtras.map((it: any) => typeof it === "string" ? normalizeImg(it) : normalizeImg(it.url || it.path)).filter(Boolean)

        const allImgs = [main, ...extras].filter(Boolean)
        const uniqueImgs = [...new Set(allImgs)] as string[]
        setDedupImages(uniqueImgs)
        if (uniqueImgs.length > 0) setActiveImage(uniqueImgs[0])

        const recs = await getRecommendProducts(prod.id, prod.specs, prod.category_id)
        setRecommendations(recs)
      } catch (e) {
        console.error(e)
        setErrorMsg("Connection Error")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [idParam])

  // --- LOGIC 2: Polling ---
  useEffect(() => {
    if (showQR && idParam) {
      timerRef.current = setInterval(async () => {
        const res = await checkPaymentStatus(idParam)
        if (res.success) {
          clearInterval(timerRef.current!)
          setShowQR(false)
          setProduct((prev: any) => ({
            ...prev,
            status: 'pending',
            specs: { ...prev.specs, pending: true }
          }))
          setStatusMsg({ text: "Payment Received! Item Booked.", color: "#27ae60" })
        }
      }, 2000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [showQR, idParam])

  // --- Helpers ---
  // ✅ LOGIC ใหม่: เช็ค stock ก่อน status (Consistency with Main Page)
  const getEffectiveStatus = useCallback((row: any) => {
    // 1. เช็คสต็อกก่อน (สำคัญที่สุด)
    // const qty = getStockQty(row);
    //if (qty <= 0) return "sold"; // หมด

    // 2. ถ้ามี Legacy pending flag
    if (row?.specs?.pending === true || row?.specs?.pending === "true") return "pending"

    // 3. เช็ค Status
    const st = String(row?.status || "").toLowerCase().trim()
    if (st === "draft") return "draft"
    if (st === "on_request") return "on_request"

    // ถ้าสถานะเป็น Reserved/Pending ให้โชว์ Booked แม้จะมีของ
    if (st === "pending" || st === "reserved" || st === "hold") return "pending"

    if (st === "inactive") return "archived"
    if (st === "active") return "available"

    return st || "available"
  }, [])

  const getStatusMeta = useCallback((row: any) => {
    const key = getEffectiveStatus(row)
    return { key, ...(STATUS_META[key] || { label: key, canBuy: false, overlay: false }) }
  }, [getEffectiveStatus])

  const getDiscountInfo = useCallback((prod: any) => {
    if (!prod?.price || discounts.length === 0) return null
    const price = parseFloat(prod.price)
    const matching = discounts.filter(d => {
      const rules = d.discount_rules || []
      if (rules.length === 0) return true
      return rules.some((r: any) => {
        if (r.product_id && String(r.product_id) !== String(prod.id)) return false
        if (price < parseFloat(r.min_subtotal || 0)) return false
        return true
      })
    })
    if (matching.length === 0) return null
    let best = null, maxSave = 0
    matching.forEach(d => {
      let save = 0
      const val = parseFloat(d.value)
      if (d.discount_type === 'PERCENT') save = price * (val / 100)
      else save = val
      if (save > price) save = price
      if (save > maxSave) {
        maxSave = save
        best = { ...d, saving: save, newPrice: Math.max(0, price - save) }
      }
    })
    return best
  }, [discounts])

  const getSpecRows = () => {
    if (!product) return []
    const s = product.specs || {}
    const rows: any[] = []
    const seenLabels = new Set<string>()

    const addRow = (label: string, val: any, color?: string) => {
      if (val === null || val === undefined || String(val).trim() === "") return
      if (seenLabels.has(label)) return
      seenLabels.add(label)
      const valDisplay = Array.isArray(val) ? val.join(", ") : String(val)
      rows.push(color ? { label, value: valDisplay, color } : { label, value: valDisplay })
    }

    // 1. Status
    const meta = getStatusMeta(product)
    addRow("Status", meta.label, meta.key !== "available" ? "#e74c3c" : undefined)

    // 2. Material
    addRow("Material", s.material ?? s.wood_type)

    // 3. Size
    const sizeVal = s.group_size || s.size || s.size_raw || s.size_text || getSizeText(s, product)
    addRow("Size", sizeVal)

    // 4. Length (mm)
    const lenVal = s.length_cm ?? s.length_mm ?? product.length_cm
    if (lenVal !== null && lenVal !== undefined && String(lenVal).trim() !== "" && Number(lenVal) > 0) {
      addRow("Length (mm)", lenVal)
    }

    // 5. Width (mm)
    const widVal = s.width_cm ?? s.width_mm ?? product.width_cm
    if (widVal !== null && widVal !== undefined && String(widVal).trim() !== "" && Number(widVal) > 0) {
      addRow("Width (mm)", widVal)
    }

    // 6. Thickness (mm) / Height (mm)
    const thickVal = s.thickness_cm ?? s.thickness_mm ?? product.thickness_cm
    const heightVal = s.height_cm ?? s.height_mm
    if (heightVal != null && Number(heightVal) > 0 && thickVal === heightVal) {
      addRow("Height (mm)", heightVal)
    } else {
      if (thickVal !== null && thickVal !== undefined && String(thickVal).trim() !== "" && Number(thickVal) > 0) {
        addRow("Thickness (mm)", thickVal)
      }
      if (heightVal !== null && heightVal !== undefined && String(heightVal).trim() !== "" && Number(heightVal) > 0) {
        addRow("Height (mm)", heightVal)
      }
    }

    // 7. Weight
    if (product.weight != null && Number(product.weight) > 0) {
      addRow("Weight", `${product.weight} kg`)
    } else if (s.weight != null && String(s.weight).trim() !== "" && String(s.weight).trim() !== "0") {
      const cleanW = String(s.weight).replace(/\s*kg$/i, "").trim()
      addRow("Weight", `${cleanW} kg`)
    }

    // 8. Panel Craft
    addRow("Panel Craft", s.panel_craft)

    // 9. Panel Design
    addRow("Panel Design", s.panel_design)

    // 10. Edge Design
    addRow("Edge Design", s.edge_design)

    // 11. Color Craft
    addRow("Color Craft", s.color_craft)

    // 12. Finish
    addRow("Finish", s.finish)

    // แถวอื่นๆ เพิ่มเติม (ถ้ามี เช่น ไม้ดิบ) โดยซ่อนคีย์ระบบและคีย์ที่จัดเรียงไปแล้ว
    const HIDE = [
      "images", "gallery", "main_image", "description", "pending", "grade",
      "images_count", "dimensions", "dimension", "type", "spec_type",
      "size", "size_raw", "size_text", "group_size",
      "material", "wood_type", "length_cm", "length_mm", "width_cm", "width_mm",
      "thickness_cm", "thickness_mm", "height_cm", "height_mm", "weight",
      "panel_craft", "panel_design", "edge_design", "color_craft", "finish"
    ]
    const LABELS: any = {
      origin: "Origin",
      texture_craft: "Texture Craft",
      brightness: "Brightness",
    }

    Object.entries(s).forEach(([k, v]) => {
      if (HIDE.includes(k) || v === null || v === "") return
      const label = LABELS[k] || k.replace(/_/g, " ").replace(/\b\w/g, m => m.toUpperCase())
      addRow(label, v)
    })

    return rows
  }

  // --- IMAGE NAVIGATION ---
  const touchStartX = useRef<number>(0)

  const goNext = useCallback(() => {
    const idx = dedupImages.indexOf(activeImage)
    if (idx < dedupImages.length - 1) setActiveImage(dedupImages[idx + 1])
  }, [activeImage, dedupImages])

  const goPrev = useCallback(() => {
    const idx = dedupImages.indexOf(activeImage)
    if (idx > 0) setActiveImage(dedupImages[idx - 1])
  }, [activeImage, dedupImages])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) diff > 0 ? goNext() : goPrev()
  }

  // --- EVENTS ---
  const handleZoom = (e: React.MouseEvent) => {
    const container = zoomContainerRef.current
    const img = mainImageRef.current
    if (!container || !img) return
    const { left, top, width, height } = container.getBoundingClientRect()
    const x = ((e.clientX - left) / width) * 100
    const y = ((e.clientY - top) / height) * 100
    img.style.transformOrigin = `${x}% ${y}%`
    container.classList.add("zoomed")
  }
  const handleLeaveZoom = () => {
    const container = zoomContainerRef.current
    const img = mainImageRef.current
    container?.classList.remove("zoomed")
    setTimeout(() => { if (img && !container?.classList.contains("zoomed")) img.style.transformOrigin = "center center" }, 250)
  }

  // ✅ LOGIC 3: ADD TO CART
  const handleAddToCart = async () => {
    if (!isLoggedIn) { redirectToLogin(); return }
    if (!product) return
    setProcessing(true)
    setStatusMsg({ text: "Adding to cart...", color: "#3498db" })
    try {
      await addToCart(product.id, qty)
      window.dispatchEvent(new Event('cart-updated'));
      setStatusMsg({ text: "Added to cart successfully!", color: "#27ae60" })
    } catch (err: any) {
      if (err.message?.includes("login")) redirectToLogin()
      else setStatusMsg({ text: "Error adding to cart.", color: "#e74c3c" })
    } finally {
      setProcessing(false)
    }
  }

  // ✅ LOGIC 4: HANDLE DEPOSIT
  const handleDeposit = async () => {
    if (!isLoggedIn) { redirectToLogin(); return }
    if (!product) return
    setProcessing(true)
    setStatusMsg({ text: "QR Code...", color: "#3498db" })
    try {
      const res = await createDepositQR(product.id)
      if (res.success && res.qrImage) {
        setQrUrl(res.qrImage)
        setShowQR(true)
        setStatusMsg(null)
      } else {
        setStatusMsg({ text: "Error: " + res.message, color: "#e74c3c" })
      }
    } catch (err) {
      setStatusMsg({ text: "System Error", color: "#e74c3c" })
    } finally {
      setProcessing(false)
    }
  }

  // ✅ LOGIC 5: LIKE
  const handleToggleLike = async () => {
    if (!isLoggedIn) { redirectToLogin(); return }
    if (likeLoading || !product) return
    setLikeLoading(true)
    const prevLiked = isLiked
    const prevCount = likeCount
    setIsLiked(!prevLiked)
    setLikeCount(prev => prevLiked ? prev - 1 : prev + 1)
    try {
      await toggleProductLike(product.id)
    } catch (err: any) {
      setIsLiked(prevLiked)
      setLikeCount(prevCount)
      if (err.message.includes("logged in")) redirectToLogin()
    } finally {
      setLikeLoading(false)
    }
  }

  // --- RENDER HELPERS ---
  // ค้นหาฟังก์ชันนี้แล้วแก้เป็นแบบนี้ครับนาย
  const renderStatusOverlay = (meta: any) => {
    return null; // สั่งให้ไม่ต้องวาดอะไรเลย
  }

  // ใช้ Logic เดียวกับหน้าหลักสำหรับการ์ดสินค้าแนะนำ
  const renderRecBadge = (status: string) => {
    const s = String(status || "").toLowerCase().trim()
    if (!s || s === "available") return null

    const STATUS_BADGE: Record<string, any> = {
      on_request: { text: "มีคนกำลังสนใจ", style: "pill" },
      pending: { text: "BOOKED", jp: "Reserved", style: "circle" },
      sold: { text: "SOLD OUT", jp: "Sold", style: "circle" }, // ✅ ให้เหมือนหน้าหลัก
      reserved: { text: "RESERVED", style: "pill" },
      archived: { text: "ARCHIVE", style: "pill" },
      draft: { text: "DRAFT", style: "pill" },
    }
    const meta = STATUS_BADGE[s] || { text: s.toUpperCase(), style: "pill" }
    const cls = escClass(s)

    if (s === 'on_request') return <div className={`rec-badge on_request`}>{meta.text}</div>
    if (meta.style === 'circle') {
      return (
        <div className="status-overlay">
          <div className={`status-circle ${cls}`}>
            {meta.jp && <div className="jp">{meta.jp}</div>}
            <div className="en">{meta.text}</div>
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) return <div className="wrap"><div style={{ textAlign: 'center', padding: 60, color: '#666' }}>Loading Product...</div></div>
  if (errorMsg || !product) return <div className="wrap"><div style={{ textAlign: 'center', padding: 40, border: '1px solid #e5e5e5' }}>{errorMsg}</div></div>

  const meta = getStatusMeta(product)
  const discountInfo = getDiscountInfo(product)
  const specList = getSpecRows()
  const maxStock = getStockQty(product)
  return (
    <>
      <style jsx global>{`
        /* Global & Layout */
        .wrap { max-width: 1200px; margin: 0 auto; padding: 100px 20px 20px; }
        .topbar { margin-bottom: 20px; }
        .back-link { cursor: pointer; display: inline-block; color: #666; font-size: 0.9rem; transition: color 0.2s; }
        .back-link:hover { color: #000; text-decoration: underline; }

        /* RESPONSIVE GRID LAYOUT */
        .product-container {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 40px;
            align-items: start;
            margin-bottom: 60px;
        }

        @media (max-width: 900px) {
            .product-container {
                grid-template-columns: 1fr;
                gap: 30px;
            }
        }

        /* GALLERY & IMAGE SIZING */
        .gallery { width: 100%; display: flex; flex-direction: column; gap: 15px; }

        .main-image-frame {
            width: 100%;
            aspect-ratio: 1 / 1;
            background-color: #fafafa;
            border: 1px solid #eee;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            cursor: zoom-in;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .main-image-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover; /* เปลี่ยนเป็น cover เพื่อให้เต็มกรอบ */
    object-position: center;
    transition: transform 0.2s ease-out;
    display: block;
}

        .main-image-frame.zoomed img {
            transform: scale(2);
            cursor: zoom-out;
        }

        .zoom-hint {
            position: absolute; bottom: 10px; right: 10px;
            background: rgba(0,0,0,0.6); color: #fff;
            padding: 4px 8px; font-size: 0.7rem; border-radius: 4px;
            pointer-events: none; opacity: 0; transition: opacity 0.3s;
        }
        .main-image-frame:hover .zoom-hint { opacity: 1; }

        @media (hover: none) {
          .main-image-frame { cursor: default; }
          .zoom-hint { display: none !important; }
          .main-image-frame.zoomed img { transform: none !important; }
        }

        .img-nav {
            position: absolute; top: 50%; transform: translateY(-50%);
            background: rgba(255,255,255,0.85); border: none; border-radius: 50%;
            width: 40px; height: 40px; font-size: 1.6rem; line-height: 1;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; z-index: 5; transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15); color: #333;
        }
        .img-nav:hover:not(:disabled) { background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .img-nav:disabled { opacity: 0.25; cursor: default; }
        .img-nav-prev { left: 10px; }
        .img-nav-next { right: 10px; }

        .img-dots {
            position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
            display: flex; gap: 6px; z-index: 5;
        }
        .img-dot {
            width: 6px; height: 6px; border-radius: 50%;
            background: rgba(255,255,255,0.6); transition: all 0.2s;
        }
        .img-dot.active { background: #fff; transform: scale(1.3); }

        .thumbnails {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
            gap: 10px;
        }
        .thumb {
            aspect-ratio: 1 / 1;
            border: 1px solid #eee;
            border-radius: 4px;
            cursor: pointer;
            overflow: hidden;
            opacity: 0.7;
            transition: all 0.2s;
        }
        .thumb.active, .thumb:hover { opacity: 1; border-color: #000; box-shadow: 0 0 0 1px #000; }
        .thumb img { width: 100%; height: 100%; object-fit: cover; }

        /* DETAILS SECTION */
        .details { width: 100%; font-family: 'Kanit', sans-serif; }
        .p-sku { font-size: 0.85rem; color: #999; letter-spacing: 2px; margin-bottom: 8px; font-family: 'Kanit', sans-serif;}
        .p-header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
        .p-title-main { margin: 0; font-size: 2rem; line-height: 1.3; font-weight: 600; color: #1a1a1a; font-family: 'Kanit', sans-serif; }

        .like-btn-wrap { display: flex; align-items: center; cursor: pointer; min-width: 48px; padding: 8px; border-radius: 50%; transition: background 0.2s; }
        .like-btn-wrap:hover { background: #fff0f0; }
        .like-btn-wrap:active { transform: scale(0.9); }

        .spec-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .spec-table tr { border-bottom: 1px solid #ebebeb; }
        .spec-table td { padding: 14px 0; vertical-align: middle; }
        .details .spec-label {
          width: 40%;
          color: #aaa !important;
          font-weight: 400;
          font-size: 0.82rem;
          letter-spacing: 0.04em;
          font-family: 'Kanit', sans-serif;
        }
        .details .spec-value {
          width: 60%;
          color: #1a1a1a !important;
          font-weight: 500;
          font-size: 0.85rem;
          letter-spacing: 0.12em;
          text-align: right;
          text-transform: uppercase;
          font-family: 'Prompt', sans-serif;
          font-variant-numeric: lining-nums tabular-nums;
        }

        .price-block { margin-bottom: 25px; border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 20px 0; }
        .price { font-size: 1.8rem; font-weight: 500; color: #1a1a1a; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-family: 'Kanit', sans-serif; }
        .price-old { font-size: 1rem; color: #999; text-decoration: line-through; font-weight: 400; }
        .price-new { color: #e74c3c; }
        .badge-discount { background: #e74c3c; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; }
        .vat-note { font-size: 0.8rem; color: #888; margin-top: 5px; }

        .qty-row { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
        .qty-control { display: flex; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
        .qty-btn { border: none; background: #f9f9f9; width: 40px; height: 40px; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; transition: bg 0.2s; }
        .qty-btn:hover:not(:disabled) { background: #eee; }
        .qty-input { width: 50px; border: none; text-align: center; font-size: 1rem; outline: none; border-left: 1px solid #ddd; border-right: 1px solid #ddd; }

        .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
        @media (max-width: 480px) { .actions { grid-template-columns: 1fr; } }

        .btn { border: 1px solid #000; background: transparent; color: #000; padding: 14px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; text-transform: uppercase; border-radius: 4px; }
        .btn:hover:not(:disabled) { background: #f0f0f0; }
        .btn-primary { background: #000; color: #fff; }
        .btn-primary:hover:not(:disabled) { background: #333; border-color: #333; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .status-msg { font-size: 0.9rem; font-weight: 500; min-height: 20px; margin-top: 10px; }

        /* Detail Images Section */
        .detail-section { margin-top: 60px; }
        .detail-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 5px; }
        .detail-images { display: flex; flex-direction: column; gap: 30px; }
        
        .detail-shot { width: 100%; display: block; }
        .detail-shot img { width: 100%; height: auto; border-radius: 8px; display: block; }

        /* RECOMMENDATIONS */
        .rec-section { margin-top: 80px; padding-top: 40px; border-top: 1px solid #eee; }
        .rec-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 30px; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
        
        .rec-grid { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 20px; 
        }
        @media (max-width: 1024px) { .rec-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px) { .rec-grid { grid-template-columns: repeat(2, 1fr); } }

        .rec-card { display: block; text-decoration: none; color: inherit; transition: transform 0.2s; overflow: hidden; position: relative; background: var(--card-bg); }
        .rec-card:hover { transform: translateY(-5px); }
        .rec-card:hover .rec-img img { transform: scale(1.05); }

        .rec-img {
            width: 100%;
            aspect-ratio: 1 / 1;
            background: var(--card-bg);
            position: relative;
            overflow: hidden;
            display: flex; align-items: center; justify-content: center;
        }
        .rec-img img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            transition: transform 0.5s ease;
        }
        .rec-noimg { color: #ccc; font-size: 0.8rem; }

        .rec-body { padding: 15px; text-align: center; background: var(--bg); border-top: 1px solid var(--line); }
        .rec-name { font-weight: 600; font-size: 0.9rem; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-serif); }
        .rec-size { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px; font-variant-numeric: lining-nums tabular-nums; }
        .rec-price { font-weight: 700; color: var(--text-main); font-size: 1rem; font-variant-numeric: lining-nums tabular-nums; }

        /* Status Badges Overlay */
        .status-overlay { position: absolute; top:0; left:0; right:0; bottom:0; background: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center; z-index: 10; backdrop-filter: blur(2px); }
        .status-circle { width: 80px; height: 80px; background: #000; color: #fff; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.2); transform: rotate(-10deg); }
        .status-circle.sold { background: #e74c3c; }
        .status-circle.pending { background: #f39c12; }
        .status-circle .jp { font-size: 0.7rem; opacity: 0.8; }
        .status-circle .en { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; }

        .rec-badge.on_request { 
            position: absolute; top: 10px; right: 10px; 
            background: #f39c12; color: #fff; 
            padding: 4px 8px; font-size: 0.7rem; font-weight: 700; border-radius: 4px; z-index: 5;
        }

        /* Modal Styles */
        .qr-modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 9999;
            display: flex; justify-content: center; align-items: center;
        }
        .qr-modal-content {
            background: white; padding: 30px; border-radius: 12px;
            text-align: center; max-width: 90%; width: 350px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative;
        }
        .qr-img { width: 100%; height: auto; margin: 20px 0; border: 1px solid #eee; border-radius: 8px; }
        .close-qr { position: absolute; top: 10px; right: 15px; font-size: 24px; cursor: pointer; color: #999; }
        .loader-dots { display: inline-block; animation: dot-blink 1.5s infinite; }
        @keyframes dot-blink { 0% {opacity:0.2} 20% {opacity:1} 100% {opacity:0.2} }
      `}</style>

      {/* ✅ QR CODE MODAL */}
      {showQR && (
        <div className="qr-modal-overlay" onClick={() => setShowQR(false)}>
          <div className="qr-modal-content" onClick={e => e.stopPropagation()}>
            <div className="close-qr" onClick={() => setShowQR(false)}>×</div>
            <h3 style={{ margin: 0 }}>Scan to Pay (Deposit)</h3>
            <div style={{ color: '#666', fontSize: '0.9rem' }}>100.00 THB</div>

            {/* รูป QR Code ที่ได้จาก Server */}
            <img src={qrUrl} className="qr-img" alt="PromptPay QR" />

            <div style={{ color: '#27ae60', fontWeight: 500 }}>
              Waiting for payment<span className="loader-dots">...</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#999', marginTop: 10 }}>
              (System will auto-detect your payment)
            </div>
            <button onClick={() => setShowQR(false)} style={{ marginTop: 15, padding: '8px 20px', border: '1px solid #ddd', background: 'white', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="wrap">
        <div className="topbar">
          <div className="back-link" onClick={() => router.push('/woodslab')}>← Back to Collection</div>
        </div>

        <div className="product-container">
          <div className="gallery">
            <div className="main-image-frame" id="zoomContainer" ref={zoomContainerRef} onMouseMove={handleZoom} onMouseLeave={handleLeaveZoom} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              {activeImage ? <img src={activeImage} alt={product.name} id="mainImage" ref={mainImageRef} /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#666' }}>No Image</div>}
              {renderStatusOverlay(meta)}
              <div className="zoom-hint">HOVER TO ZOOM</div>
              {dedupImages.length > 1 && (
                <>
                  <button className="img-nav img-nav-prev" onClick={e => { e.stopPropagation(); goPrev() }} disabled={dedupImages.indexOf(activeImage) === 0} aria-label="Previous">&#8249;</button>
                  <button className="img-nav img-nav-next" onClick={e => { e.stopPropagation(); goNext() }} disabled={dedupImages.indexOf(activeImage) === dedupImages.length - 1} aria-label="Next">&#8250;</button>
                  <div className="img-dots">
                    {dedupImages.map((_, i) => (
                      <span key={i} className={`img-dot${dedupImages.indexOf(activeImage) === i ? ' active' : ''}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="thumbnails">
              {dedupImages.map((u, i) => (
                <div key={i} className={`thumb ${activeImage === u ? "active" : ""}`} onClick={() => setActiveImage(u)}>
                  <img src={u} alt="thumb" />
                </div>
              ))}
            </div>
          </div>

          <div className="details">
            <div className="p-sku">Num: {product.barcode || "—"}</div>
            <div className="p-header-row">
              <h1 className="p-title-main">{product.name || "ติดต่อสอบถาม"}</h1>
              <div className="like-btn-wrap" onClick={handleToggleLike} title={isLiked ? "Unlike" : "Like"}>
                <HeartIcon filled={isLiked} />
              </div>
            </div>

            <table className="spec-table">
              <tbody>
                {specList.map((r: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e8e8e8' }}>
                    <td style={{
                      padding: '13px 0',
                      width: '40%',
                      fontFamily: "'Kanit', sans-serif",
                      fontWeight: 400,
                      fontSize: '0.85rem',
                      color: '#999',
                    }}>{r.label}</td>
                    <td style={{
                      padding: '13px 0',
                      width: '60%',
                      textAlign: 'right',
                      fontFamily: "'Prompt', sans-serif",
                      fontWeight: 400,
                      fontSize: '0.85rem',
                      color: r.color || '#2c2c2c',
                      fontVariantNumeric: 'lining-nums tabular-nums',
                    }}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="price-block">
              <div className="price">
                {discountInfo ? (
                  <>
                    <span className="price-old">{currency(product.price)}</span>
                    <span className="price-new">{currency(discountInfo.newPrice)}</span>
                    <span className="badge-discount" style={{ fontSize: '0.6em', verticalAlign: 'middle' }}>
                      -{discountInfo.discount_type === 'PERCENT' ? parseFloat(discountInfo.value) + '%' : discountInfo.value}
                    </span>
                  </>
                ) : currency(product.price)}
              </div>

            </div>

            <div className="qty-row">
              <div className="qty-control">
                {/* ปุ่มลบ: ถ้า qty <= 1 ให้ disable ปุ่มไปเลย */}
                <button
                  className="qty-btn"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                >
                  −
                </button>

                <input className="qty-input" value={qty} readOnly />

                {/* ปุ่มบวก: เปลี่ยนจาก 99 เป็น maxStock และ disable เมื่อ qty ถึง maxStock */}
                <button
                  className="qty-btn"
                  onClick={() => setQty(Math.min(maxStock, qty + 1))}
                  disabled={qty >= maxStock}
                >
                  +
                </button>
              </div>

              {/* (Optional) แสดงจำนวนสต็อกให้ลูกค้าเห็นด้วยก็ได้ */}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Unit(s) {maxStock > 0 && <span style={{ fontSize: '0.8em' }}> (Available: {maxStock})</span>}
              </span>
            </div>

            <div className="actions">
              <button className="btn btn-primary" onClick={handleAddToCart} disabled={processing}>
                {processing ? "Processing..." : "Add to Cart"}
              </button>
              <button className="btn" onClick={handleDeposit} disabled={processing}>
                Deposit
              </button>
            </div>

            <div className="status-msg">
              {statusMsg ? (
                <span style={{ color: statusMsg.color }}>{statusMsg.text}</span>
              ) : (
                <>
                  {meta.key === 'on_request' && <span style={{ color: '#f39c12' }}>● {meta.label}</span>}
                  {(meta.key === 'pending' || meta.key === 'sold') && <span>This item is {meta.label}. อยู่ในช่วงพัฒนา</span>}
                </>
              )}
            </div>

            {product.specs?.description && (
              <div style={{ marginTop: 24, fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                {product.specs.description}
              </div>
            )}
          </div>
        </div>

        {dedupImages.length > 0 && (
          <section className="detail-section">
            <div className="detail-title">Product Detail</div>
            <div className="detail-images">
              {dedupImages.map((u, i) => (
                <div key={i} className="detail-shot"><img loading="lazy" src={u} alt="detail" /></div>
              ))}
            </div>
          </section>
        )}

        <section className="rec-section">
          <div className="rec-title">RECOMMENDED PRODUCTS</div>
          <div className="rec-grid">
            {recommendations.length === 0 ? (
              <div className="rec-empty" style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666' }}>No recommended products.</div>
            ) : (
              recommendations.map((rec) => {
                const recImg = normalizeImg(rec.image_url) || normalizeImg(rec.specs?.main_image?.url)
                const recDiscount = getDiscountInfo(rec)
                const effectiveStatus = getEffectiveStatus(rec) // ✅ ใช้ status ที่ถูกต้องตาม stock

                return (
                  <a key={rec.id} className="rec-card" href={`/woodslab/product?id=${rec.id}`}>
                    <div className="rec-img">
                      {recImg ? <img src={recImg} alt={rec.name} /> : <div className="rec-noimg">No Image</div>}
                      {renderRecBadge(effectiveStatus)}
                    </div>
                    <div className="rec-body">
                      <div className="rec-name">{rec.name || "ติดต่อสอบถาม"}</div>
                      <div className="rec-size">{getSizeText(rec.specs)}</div>
                      <div className="rec-price">
                        {recDiscount ? (
                          <>
                            <span className="price-old" style={{ fontSize: '0.8em' }}>{currency(rec.price)}</span>
                            <span className="price-new" style={{ fontSize: '1em' }}>{currency(recDiscount.newPrice)}</span>
                            <span className="badge-discount">-{recDiscount.discount_type === 'PERCENT' ? parseFloat(recDiscount.value) + '%' : recDiscount.value}</span>
                          </>
                        ) : currency(rec.price)}
                      </div>
                    </div>
                  </a>
                )
              })
            )}
          </div>
        </section>
      </div>
    </>
  )
}

export default function ProductPageWrapper() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading Product...</div>}>
      <ProductContent />
    </Suspense>
  )
}