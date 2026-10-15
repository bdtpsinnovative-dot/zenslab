'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/src/components/Navbar'
import { getMyFavorites, toggleProductLike, getActiveDiscounts } from '@/app/actions/product'
import { useRouter } from 'next/navigation'

// --- CONSTANTS & UTILS ---
const BUCKET = "product-images"
const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gshppxgvdrmbfcxsxeph.supabase.co"

const normalizeImg = (u: any) => {
  const s = String(u || "").trim()
  if (!s) return ""
  if (/^https?:\/\//i.test(s)) return s
  const cleanPath = s.replace(/^\/+/, "")
  return `${PROJECT_URL}/storage/v1/object/public/${BUCKET}/${cleanPath}`
}

const currency = (n: any) =>
  n ? new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n) : "ติดต่อสอบถาม"

const getSizeText = (specs: any) => {
  if (!specs || typeof specs !== "object") return ""
  return specs.size_text || specs.size || specs.dimension || ""
}

const getDiscountInfo = (prod: any, discounts: any[]) => {
  if (!prod?.price || discounts.length === 0) return null
  const price = parseFloat(prod.price)
  const now = new Date()
  const active = discounts.filter(d => {
    if (d.start_date && new Date(d.start_date) > now) return false
    if (d.end_date && new Date(d.end_date) < now) return false
    return true
  })
  const matching = active.filter(d => {
    const rules = d.discount_rules || []
    if (rules.length === 0) return true
    return rules.some((r: any) => {
      if (r.product_id && String(r.product_id) !== String(prod.id)) return false
      if (price < parseFloat(r.min_subtotal || 0)) return false
      return true
    })
  })
  if (matching.length === 0) return null
  let best: any = null, maxSave = 0
  matching.forEach(d => {
    let save = 0
    const val = parseFloat(d.value)
    if (d.discount_type === 'PERCENT') save = price * (val / 100)
    else save = val
    if (save > price) save = price
    if (save > maxSave) { maxSave = save; best = { ...d, saving: save, newPrice: Math.max(0, price - save) } }
  })
  return best
}

// --- COMPONENTS ---
const HeartIcon = ({ filled, onClick }: { filled: boolean, onClick: (e: React.MouseEvent) => void }) => (
  <button 
    onClick={onClick}
    className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all duration-300 shadow-sm group"
    title={filled ? "Remove from favorites" : "Undo remove"}
  >
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="20" height="20" 
      viewBox="0 0 24 24" 
      fill={filled ? "#e74c3c" : "none"} 
      stroke={filled ? "#e74c3c" : "currentColor"} 
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="transition-transform duration-200 group-hover:scale-110"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  </button>
)

const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 aspect-[3/4] w-full mb-4"></div>
    <div className="bg-gray-200 h-6 w-3/4 mb-2 mx-auto"></div>
    <div className="bg-gray-200 h-4 w-1/2 mx-auto"></div>
  </div>
)

export default function FavoritesPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDiscounts, setActiveDiscounts] = useState<any[]>([])

  // เปลี่ยนจาก removingIds เป็น unlikedIds เพื่อแทร็กว่าอันไหน "ถูกกดเอาออก" ในเซสชั่นนี้
  const [unlikedIds, setUnlikedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchFavs = async () => {
      try {
        const [data, discounts] = await Promise.all([getMyFavorites(), getActiveDiscounts()])
        setProducts(data)
        setActiveDiscounts(discounts)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchFavs()
  }, [])

  const handleToggleFavorite = async (e: React.MouseEvent, productId: number) => {
    e.preventDefault()
    e.stopPropagation()

    // 1. Toggle Visual State (เปลี่ยนสีหัวใจทันที ไม่ลบ Card)
    setUnlikedIds(prev => {
        const next = new Set(prev)
        if (next.has(productId)) {
            next.delete(productId) // ถ้ามีใน list แปลว่ากดซ้ำ -> ให้กลับมาชอบใหม่ (Undo)
        } else {
            next.add(productId) // ถ้ายังไม่มี -> ให้ใส่เข้าไป (เลิกชอบ)
        }
        return next
    })

    try {
      // 2. เรียก Server Action
      await toggleProductLike(String(productId))
      // ไม่ต้อง filter products ออก เพื่อให้ Card ยังอยู่จนกว่าจะ refresh
    } catch (error) {
      console.error("Failed to toggle favorite", error)
      // Revert visual state if error
      setUnlikedIds(prev => {
        const next = new Set(prev)
        if (next.has(productId)) next.delete(productId)
        else next.add(productId)
        return next
      })
    }
  }

  return (
    <div className="bg-[#FAF9F6] min-h-screen flex flex-col font-sans selection:bg-[#d4a373] selection:text-white">
      <Navbar />

      <main className="flex-grow pt-2 pb-20 px-6 md:px-12 max-w-[1600px] mx-auto w-full">
        
        <div className="mb-12 text-center fade-in-up">
          <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#1C1917] mb-3">
            My Favorites
          </h1>
          <p className="text-zinc-500 uppercase tracking-widest text-xs md:text-sm font-light">
            Collected Pieces
          </p>
          <div className="w-20 h-[1px] bg-[#d4a373] mx-auto mt-6"></div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-12 gap-x-8">
            {[1, 2, 3, 4].map((i) => <LoadingSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
            <div className="w-16 h-16 mb-6 text-zinc-300">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
               </svg>
            </div>
            <h2 className="text-xl font-serif text-zinc-800 mb-3">Your collection is empty</h2>
            <p className="text-zinc-500 mb-8 max-w-sm font-light text-sm mx-auto leading-relaxed">
              You haven't saved any items yet. Browse our gallery to find your perfect piece.
            </p>

            <Link 
  href="/woodslab" 
  className="group relative inline-block px-12 py-4 border border-zinc-200 text-zinc-800 uppercase tracking-[0.3em] text-[10px] font-bold transition-all duration-500"
>
  {/* พื้นหลังที่จะวิ่งขึ้นมาตอน Hover */}
  <span className="absolute inset-0 w-0 bg-[#d4a373] transition-all duration-500 ease-out group-hover:w-full"></span>
  
  {/* ข้อความที่ต้องอยู่เหนือพื้นหลัง */}
  <span className="relative z-10 group-hover:text-white transition-colors duration-500">
    Start Browsing
  </span>
</Link>
            
          </div>
        ) : (
          // Product Grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-12 gap-x-8">
            {products.map((p) => {
              const imgUrl = normalizeImg(p.image_url || p.specs?.main_image?.url)
              const size = getSizeText(p.specs)
              const discountInfo = getDiscountInfo(p, activeDiscounts)

              // ✅ ตรวจสอบว่าสินค้าชิ้นนี้ถูกกด Unliked ใน session นี้หรือไม่
              const isUnliked = unlikedIds.has(p.id)

              return (
                <div key={p.id} className="group cursor-pointer flex flex-col fade-in-up">
                  {/* Image Card Container */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 mb-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                     
                     <Link href={`/woodslab/product?id=${p.id}`} className="block w-full h-full">
                        {imgUrl ? (
                          <img 
                            src={imgUrl} 
                            alt={p.name} 
                            // ถ้าถูก Unliked ให้ภาพดูจางลงนิดหน่อย เพื่อบอก user ว่าอันนี้เอาออกแล้วนะ
                            className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 ${isUnliked ? 'grayscale opacity-70' : ''}`}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-300">No Image</div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
                     </Link>

                     {/* ปุ่มหัวใจ */}
                     <div className="absolute top-3 right-3 z-20">
                        <HeartIcon 
                          // ✅ ถ้า isUnliked เป็น true -> filled เป็น false (หัวใจกลวง)
                          filled={!isUnliked} 
                          onClick={(e) => handleToggleFavorite(e, p.id)}
                        />
                     </div>

                     <Link href={`/woodslab/product?id=${p.id}`} className="absolute bottom-0 left-0 w-full p-4 z-10 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                       <div className="bg-white/95 backdrop-blur text-[#1C1917] text-center py-3 text-xs uppercase tracking-widest font-bold shadow-lg">
                         View Details
                       </div>
                     </Link>
                  </div>

                  {/* Info Section */}
                  <div className={`text-center px-2 transition-opacity duration-300 ${isUnliked ? 'opacity-50' : 'opacity-100'}`}>
                    <h3 className="font-serif text-lg text-[#1C1917] mb-1 group-hover:text-[#d4a373] transition-colors line-clamp-1">
                      <Link href={`/woodslab/product?id=${p.id}`}>
                        {p.name}
                      </Link>
                    </h3>
                    <p className="text-[10px] md:text-xs text-zinc-500 uppercase tracking-widest mb-2 font-medium">
                      {size || p.sku}
                    </p>
                    <div className="text-sm font-medium text-[#1C1917]">
                      {discountInfo ? (
                        <span className="flex items-center justify-center gap-2 flex-wrap">
                          <span className="line-through text-zinc-400 text-xs">{currency(p.price)}</span>
                          <span className="text-rose-600 font-semibold">{currency(discountInfo.newPrice)}</span>
                          <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            -{discountInfo.discount_type === 'PERCENT' ? parseFloat(discountInfo.value) + '%' : currency(discountInfo.saving)}
                          </span>
                        </span>
                      ) : currency(p.price)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <footer className="py-12 bg-[#0a0a0a] text-white border-t border-white/5 px-8 md:px-12 mt-auto">
        <div className="max-w-8xl mx-auto text-center">
            <h2 className="text-2xl font-serif font-bold tracking-[0.2em] uppercase text-white mb-6 opacity-50">WOODSLABS</h2>
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">
              &copy; 2026 Woodslabs Industry Co., Ltd.
            </div>
        </div>
      </footer>
    </div>
  )
}