'use client'
export const dynamic = 'force-dynamic'
import { Suspense } from 'react'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProducts, getActiveDiscounts, getMinMax, getRangeValues, getDistinctOptions, type FilterState, type CategoryKey } from '../../actions/product'
import './woodslab.css'

import { LIMIT, RANGE_COLS } from './config'
import { calculateProductDiscount, buildPresetsFromValues, normalizeImg, getEffectiveStatus, getSizeText } from './utils'
import WoodSlabCard from './components/WoodSlabCard'
import FilterBar from './components/FilterBar'
import PageScreenshotShare, { type CatalogItem } from '@/src/components/PageScreenshotShare'

function WoodSlabContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCategory = (searchParams.get('cat') as CategoryKey) || 'all'

  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [products, setProducts] = useState<any[]>([])
  const [activeDiscounts, setActiveDiscounts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  // 🔥 URL ใช้เลข 1-based (?page=21) แต่ internal ใช้ 0-based (page=20)
  const page = Math.max(0, parseInt(searchParams.get('page') || '1', 10) - 1)
  const [pageInfo, setPageInfo] = useState("—")
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [statusText, setStatusText] = useState("")

  const [openKey, setOpenKey] = useState("")
  const [options, setOptions] = useState({ type: [] as string[], material: [] as string[], panel: [] as string[] })

  const [rangeStats, setRangeStats] = useState<any>({ length: null, width: null, thickness: null })
  const [rangePresets, setRangePresets] = useState<any>({ length: null, width: null, thickness: null })

  const [filters, setFilters] = useState<FilterState>({
    type: "",
    material: "",
    panel: "",
    status: "all",
    lengthMin: "",
    lengthMax: "",
    widthMin: "",
    widthMax: "",
    thickMin: "",
    thickMax: "",
    priceMin: "",
    priceMax: "",
    q: "",
    discount: "all",
  })

  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  // --- Wrapper for Discount Logic to maintain useCallback structure if needed by downstream ---
  const getProductDiscount = useCallback((product: any) => {
    return calculateProductDiscount(product, activeDiscounts)
  }, [activeDiscounts])

  // 📸 Catalog items for PageScreenshotShare
  const catalogItems: CatalogItem[] = React.useMemo(() => {
    return products.map((r) => {
      const discountInfo: any = getProductDiscount(r)
      const imgPath = r.image_url || r.specs?.main_image?.path || r.specs?.main_image?.url
      const img = normalizeImg(imgPath)
      const st = getEffectiveStatus(r)
      const sizeText = getSizeText(r.specs, r)
      const isOut = st === 'sold' || st === 'pending'

      return {
        id: r.id,
        name: (r.name && r.name !== '-') ? r.name : 'แผ่นไม้ธรรมชาติ',
        sku: r.sku || '',
        size: sizeText || '',
        imageUrl: img || '',
        price: r.price ? Number(r.price) : null,
        discountedPrice: discountInfo ? Number(discountInfo.newPrice) : null,
        discountValue: discountInfo ? parseFloat(discountInfo.value) : null,
        discountType: discountInfo ? discountInfo.discount_type : null,
        outOfStock: isOut,
        statusText: st === 'sold' ? 'SOLD OUT' : st === 'pending' ? 'BOOKED' : undefined,
      }
    })
  }, [products, getProductDiscount])

  // 🔥 setPage รับ 0-based แล้วเขียน 1-based ลง URL
  // หน้าแรก (0) → ลบ ?page ออก / หน้าอื่น → ?page=2, ?page=21
  const setPage = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    const urlPage = newPage + 1           // แปลง 0-based → 1-based
    if (urlPage <= 1) {
      params.delete('page')               // หน้า 1 ไม่ต้องใส่ใน URL
    } else {
      params.set('page', String(urlPage)) // ?page=21 ตรงกับที่ user เห็น
    }
    router.replace(`?${params.toString()}`)
  }, [searchParams, router])

  const handleCategoryChange = (cat: CategoryKey) => {
    // รีเซ็ต page ไปด้วยในครั้งเดียว ไม่ต้อง setPage แยก
    router.push(`/woodslab?cat=${cat}`)
    setFilters(prev => ({ ...prev, type: "", material: "", panel: "" }))
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, q: val }))
      setPage(0)
    }, 300)
  }

  const handleFilterChange = (key: keyof FilterState, val: string) => {
    setFilters(prev => ({ ...prev, [key]: val }))
    setPage(0)
  }

  const handleRangeApply = (minKey: string, maxKey: string, minVal: string, maxVal: string) => {
    setFilters(prev => ({ ...prev, [minKey]: minVal, [maxKey]: maxVal }))
    setPage(0)
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const init = async () => {
      const discs = await getActiveDiscounts()
      setActiveDiscounts(discs)
      const opts = await getDistinctOptions(currentCategory)
      setOptions(opts)

      setRangeStats({ length: null, width: null, thickness: null })
      setRangePresets({ length: null, width: null, thickness: null })
    }
    init()
  }, [currentCategory])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // คำนวณ discount filter server-side
        let discountFilter: number[] | 'all' | null = null
        if (filters.discount === 'yes') {
          const now = new Date()
          let allQualify = false
          const qualifyingIds = new Set<number>()

          for (const d of activeDiscounts) {
            if (d.start_date && new Date(d.start_date) > now) continue
            if (d.end_date && new Date(d.end_date) < now) continue
            const rules = d.discount_rules || []
            if (rules.length === 0) { allQualify = true; break }
            for (const r of rules) {
              const pid = r.product_id
              if (pid === null || pid === undefined || pid === '') { allQualify = true; break }
              qualifyingIds.add(Number(pid))
            }
            if (allQualify) break
          }
          discountFilter = allQualify ? 'all' : Array.from(qualifyingIds)
        }

        const { data: rows, count } = await getProducts(page, LIMIT, filters, currentCategory, discountFilter)

        setProducts(rows)
        setTotalCount(count)
        const calculatedTotalPages = Math.ceil(count / LIMIT)
        setTotalPages(calculatedTotalPages)

        const from = count === 0 ? 0 : (page * LIMIT) + 1
        const to = Math.min((page * LIMIT) + LIMIT, count)
        setPageInfo(`${from} — ${to} of ${count}`)
        setStatusText(`Displaying ${filters.discount === 'yes' ? `${count} (On Sale)` : count} items`)

      } catch (err) {
        console.error(err)
        setStatusText("Error fetching data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [page, filters, activeDiscounts, currentCategory])

  useEffect(() => {
    const key = openKey as keyof typeof RANGE_COLS
    if (!key || !RANGE_COLS[key]) return

    if (!rangeStats[key]) {
      setRangeStats((prev: any) => ({ ...prev, [key]: { loading: true } }))
      getMinMax(RANGE_COLS[key], currentCategory).then(res => {
        setRangeStats((prev: any) => ({ ...prev, [key]: res }))
      })
    }

    if (!rangePresets[key]) {
      setRangePresets((prev: any) => ({ ...prev, [key]: { loading: true } }))
      getRangeValues(RANGE_COLS[key], currentCategory).then(vals => {
        const presets = buildPresetsFromValues(key, vals)
        setRangePresets((prev: any) => ({ ...prev, [key]: presets.length ? presets : false }))
      })
    }
  }, [openKey, currentCategory, rangeStats, rangePresets])

  return (
    <div
      data-theme={isDark ? "dark" : "light"}
      className="min-h-screen transition-colors duration-300"
      suppressHydrationWarning={true}
    >
      <style jsx global>{`
        .badge-on_request { background: linear-gradient(135deg, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c) !important; color: #1a1a1a !important; font-weight: 700 !important; text-shadow: 0 0.5px 1px rgba(255,255,255,0.5); border: 1px solid #96701c !important; padding: 3px 10px !important; border-radius: 4px !important; display: inline-block; font-size: 11px !important; }
        .badge-discount { background: linear-gradient(135deg, #ff416c, #ff4b2b); color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-left: 6px; box-shadow: 0 2px 5px rgba(255, 65, 108, 0.4); display: inline-block; vertical-align: middle; }
        .price-old { text-decoration: line-thhh; color: #9ca3af; font-size: 0.9em; margin-right: 6px; font-weight: 400; }
        .price-new { color: #e11d48; font-weight: 700; font-size: 1.1em; }
        [data-theme="dark"] .price-new { color: #fb7185; }
        
        .cat-switcher { display: flex; justify-content: center; margin-bottom: 20px; gap: 10px; }
        .cat-btn { background: transparent; border: 2px solid #ddd; padding: 8px 20px; border-radius: 30px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.2s; }
        .cat-btn:hover { border-color: #999; color: #333; }
        .cat-btn.active { background: #1a1a1a; color: white; border-color: #1a1a1a; }
        [data-theme="dark"] .cat-btn { border-color: #444; color: #aaa; }
        [data-theme="dark"] .cat-btn.active { background: #fff; color: #000; border-color: #fff; }
      `}</style>

      <div className="wrap" style={{ paddingTop: '100px' }}>
        <header>
          <h1>The Best <span>Wood</span></h1>
          <div className="subtitle">
            {currentCategory === 'slabs' ? 'Premium Live Edge Slabs'
              : currentCategory === 'rough' ? 'High Quality Rough Wood'
              : currentCategory === 'leg' ? 'Table Legs & Furniture Legs'
              : currentCategory === 'chair' ? 'Chairs & Stools'
              : 'All Products'}
          </div>
          {!loading && totalCount > 0 && (
            <div style={{ marginTop: '8px', fontSize: '0.78rem', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--text-muted)', fontVariantNumeric: 'lining-nums tabular-nums' }}>
              {totalCount.toLocaleString()} items
            </div>
          )}
        </header>

        <div className="controls" style={{ marginTop: '30px' }}>
          <FilterBar
            currentCategory={currentCategory}
            handleCategoryChange={handleCategoryChange}
            filters={filters}
            setFilters={setFilters}
            handleFilterChange={handleFilterChange}
            handleSearch={handleSearch}
            openKey={openKey}
            setOpenKey={setOpenKey}
            options={options}
            rangeStats={rangeStats}
            rangePresets={rangePresets}
            handleRangeApply={handleRangeApply}
            setPage={setPage}
          />
        </div>

        {/* 🌟 ปุ่มลอยแชร์ภาพหน้าเว็บ ZENSLABS */}
        <PageScreenshotShare
          categoryName={currentCategory === 'all' ? 'WOOD SLABS COLLECTION' : `${currentCategory.toUpperCase()} COLLECTION`}
          items={catalogItems}
          currentPage={page + 1}
          totalPages={totalPages}
          showFloatingButton={true}
        />

        <div className="grid">
          {loading ? (
            Array.from({ length: LIMIT }).map((_, i) => (
              <div key={i} className="card">
                <div className="img-wrap skeleton-box"></div>
                <div className="card-info"><div className="skeleton-box" style={{ height: 14, width: '70%' }}></div></div>
              </div>
            ))
          ) : products.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 0' }}>No items found.</div>
          ) : (
            products.map(r => {
              const discountInfo = getProductDiscount(r)
              return (
                <WoodSlabCard key={r.id} product={r} discountInfo={discountInfo} />
              )
            })
          )}
        </div>

        <div className="footer-bar" style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button 
              className="btn-page-nav hover:bg-gray-50" 
              disabled={page <= 0} 
              onClick={() => setPage(page - 1)}
              style={{
                 padding: '8px 16px', borderRadius: '8px', border: '1px solid #eaeaea', backgroundColor: '#fff', color: '#333', fontSize: '0.9rem', fontWeight: 500, cursor: page <= 0 ? 'not-allowed' : 'pointer', opacity: page <= 0 ? 0.5 : 1, transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              ← Prev
            </button>
            
            {totalPages > 0 && (
              <div style={{ display: 'flex', gap: '6px' }}>
                {Array.from({ length: totalPages }, (_, i) => {
                  if (
                    i === 0 || 
                    i === totalPages - 1 || 
                    (i >= page - 1 && i <= page + 1)
                  ) {
                    const isActive = page === i;
                    return (
                      <button 
                        key={i} 
                        onClick={() => setPage(i)}
                        className="btn-page-number hover:-translate-y-0.5"
                        style={{
                          width: '40px',
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px',
                          background: isActive ? '#d4a373' : '#fff',
                          color: isActive ? '#fff' : '#444',
                          border: isActive ? '1px solid #d4a373' : '1px solid #eaeaea',
                          fontWeight: isActive ? 600 : 400,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isActive ? '0 4px 10px rgba(212, 163, 115, 0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        {i + 1}
                      </button>
                    )
                  } else if (
                    i === page - 2 || 
                    i === page + 2
                  ) {
                    return <span key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', color: '#999', fontSize: '1.2rem', letterSpacing: '1px' }}>...</span>
                  }
                  return null;
                })}
              </div>
            )}

            <button 
              className="btn-page-nav hover:bg-gray-50" 
              disabled={page >= totalPages - 1 || totalPages === 0} 
              onClick={() => setPage(page + 1)}
              style={{
                 padding: '8px 16px', borderRadius: '8px', border: '1px solid #eaeaea', backgroundColor: '#fff', color: '#333', fontSize: '0.9rem', fontWeight: 500, cursor: (page >= totalPages - 1 || totalPages === 0) ? 'not-allowed' : 'pointer', opacity: (page >= totalPages - 1 || totalPages === 0) ? 0.5 : 1, transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              Next →
            </button>
          </div>
          <div style={{ fontSize: '0.85rem', letterSpacing: '0.05em', color: '#888', fontWeight: 500, backgroundColor: '#f9f9f9', padding: '6px 16px', borderRadius: '20px', border: '1px solid #f0f0f0', fontVariantNumeric: 'lining-nums tabular-nums' }}>
            {pageInfo}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: '0.8rem', color: 'var(--text-muted)', fontVariantNumeric: 'lining-nums tabular-nums' }}>{statusText}</div>
        <div className="hint">
          Category: <b>{currentCategory.toUpperCase()}</b>
        </div>
      </div>
    </div>
  )
}

export default function WoodSlabPageWrapper() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <WoodSlabContent />
    </Suspense>
  )
}