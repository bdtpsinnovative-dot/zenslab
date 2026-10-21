import { getMyPaidOrders } from '@/app/actions/myorders'
import Navbar from '@/src/components/Navbar'
import Link from 'next/link'

// --- UTILS (ตามแบบหน้า Favorites) ---
const BUCKET = "product-images"
const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gshppxgvdrmbfcxsxeph.supabase.co"

const normalizeImg = (u: any) => {
  const s = String(u || "").trim()
  if (!s) return ""
  if (s.includes("ixiumu.cn")) {
    return `/api/proxy-image?url=${encodeURIComponent(s)}`
  }
  if (/^https?:\/\//i.test(s)) return s
  const cleanPath = s.replace(/^\/+/, "")
  return `${PROJECT_URL}/storage/v1/object/public/${BUCKET}/${cleanPath}`
}

const currency = (n: any) =>
  n ? new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n) : "฿0"

export default async function MyOrdersPage() {
  const { data: orders, success } = await getMyPaidOrders()

  return (
    <div className="bg-[#FAF9F6] min-h-screen flex flex-col font-sans selection:bg-[#d4a373] selection:text-white">
      <Navbar />

      <main className="flex-grow pt-2 pb-20 px-6 md:px-12 max-w-[1600px] mx-auto w-full">
        
        {/* Header สไตล์เดียวกับ Favorites */}
        <div className="mb-12 text-center fade-in-up">
          <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#1C1917] mb-3 uppercase tracking-tight">
            My Reservations
          </h1>
          <p className="text-zinc-500 uppercase tracking-widest text-xs md:text-sm font-light">
            Confirmed Pieces & Deposits
          </p>
          <div className="w-20 h-[1px] bg-[#d4a373] mx-auto mt-6"></div>
        </div>

        {(!success || !orders || orders.length === 0) ? (
          /* Empty State สไตล์เดียวกับ Favorites */
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="w-16 h-16 mb-6 text-zinc-300">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
               </svg>
            </div>
            <h2 className="text-xl font-serif text-zinc-800 mb-3">No active reservations</h2>
            <p className="text-zinc-500 mb-8 max-w-sm font-light text-sm mx-auto leading-relaxed">
              You haven't made any reservations yet. Discover our exclusive collection to find your piece.
            </p>
            <Link 
  href="/woodslab" 
  className="group relative inline-block px-12 py-4 border border-zinc-200 text-zinc-800 uppercase tracking-[0.3em] text-[10px] font-bold transition-all duration-500"
>
  {/* พื้นหลังที่จะวิ่งขึ้นมาตอน Hover */}
  <span className="absolute inset-0 w-0 bg-[#d4a373] transition-all duration-500 ease-out group-hover:w-full"></span>
  
  {/* ข้อความที่ต้องอยู่เหนือพื้นหลัง */}
  <span className="relative z-10 group-hover:text-white transition-colors duration-500">
    Explore Gallery
  </span>
</Link>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-8">
            {orders.map((order: any) => {
              const product = order.products
              const discount = order.discount_snapshot

              let displayImage = ""
              if (product?.image_url) displayImage = normalizeImg(product.image_url)
              else if (product?.specs?.main_image?.url) displayImage = normalizeImg(product.specs.main_image.url)

              return (
                <div key={order.id} className="group bg-white border border-zinc-100 rounded-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-500">
                  <div className="flex flex-col md:flex-row h-full">
                    
                    {/* ส่วนภาพสินค้า - ใช้ Aspect เดียวกับ Card ใน Favorites */}
                    <div className="md:w-72 h-72 md:h-auto relative overflow-hidden bg-zinc-50 shrink-0 border-r border-zinc-50">
                      {displayImage ? (
                        <img 
                          src={displayImage} 
                          alt={product?.name}
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-300 uppercase tracking-widest text-[10px]">No Image</div>
                      )}
                      {/* Overlay แบบบางเบา */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
                    </div>

                    {/* รายละเอียดสินค้า */}
                    <div className="flex-1 p-8 flex flex-col justify-between">
                      <div>
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                          <div>
                            <p className="text-[10px] text-[#d4a373] uppercase tracking-[0.2em] font-bold mb-1">
                              Confirmed Order #{order.id.toString().slice(-4)}
                            </p>
                            <h3 className="font-serif text-2xl text-[#1C1917] group-hover:text-[#d4a373] transition-colors">
                              {product?.name}
                            </h3>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">
                              SKU: {product?.sku || 'N/A'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold bg-[#1C1917] text-white px-4 py-1.5 uppercase tracking-widest">
                              มัดจำแล้ว
                            </span>
                            <span className="text-[10px] text-zinc-400 mt-2 tracking-widest uppercase">
                               {new Date(order.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 py-6 border-y border-zinc-50">
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Total Price</p>
                            <p className="text-lg font-medium text-[#1C1917]">{currency(order.original_price)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Deposit Paid</p>
                            <p className="text-lg font-bold text-[#d4a373]">{currency(order.amount)}</p>
                          </div>
                          <div className="hidden md:block">
                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Pending Balance</p>
                            <p className="text-lg font-medium text-zinc-400">
                               {currency((order.original_price || 0) - (discount?.saving_amount || 0) - (order.amount || 0))}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Promotion / Discount Info */}
                      {discount?.saving_amount > 0 && (
                        <div className="mt-6 flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
                          Promotion Applied: {discount.discount_name} (-{currency(discount.saving_amount)})
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer เดียวกับหน้าอื่นๆ */}
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