import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Navbar from '@/src/components/Navbar' // มั่นใจว่ามี Navbar นะครับ
import CartList from '@/src/components/CartList'
import { getCart } from '@/app/actions/cart'
import Link from 'next/link'

export const runtime = 'edge'

export const metadata = {
  title: 'Shopping Cart | WOODSLABS',
}

export default async function CartPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value

  if (!token) {
    redirect('/login?next=/cart')
  }

  const cartItems = await getCart()

  return (
    <div className="bg-[#FAF9F6] text-[#1C1917] font-sans selection:bg-[#d4a373] selection:text-white min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow w-full px-6 py-3 md:px-12 relative overflow-hidden">
         {/* Background Pattern */}
         <div className="absolute inset-0 pointer-events-none opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
         
         <div className="max-w-7xl mx-auto relative z-10">
            {/* Header สไตล์ Serif + Gold Line เหมือน Favorites */}
            <div className="mb-1 text-center">
                <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-[#1C1917] mb-3 uppercase">
                  My Cart
                </h1>
                <p className="text-zinc-500 text-xs md:text-sm font-light tracking-[0.2em] uppercase">
                  Review your selected pieces
                </p>
                <div className="w-20 h-[1px] bg-[#d4a373] mx-auto mt-6"></div>
            </div>

            {/* ส่วนเช็คตะกร้าว่าง */}
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                <div className="w-16 h-16 mb-8 text-zinc-300">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                   </svg>
                </div>
                <h2 className="text-xl font-serif text-zinc-800 mb-4 tracking-wide">Your cart is currently empty</h2>
                <p className="text-zinc-500 mb-12 max-w-sm font-light text-sm leading-relaxed">
                  It seems you haven't added any wood slabs to your collection yet.
                </p>

                {/* ปุ่มที่คุณชอบ */}
                <Link 
                  href="/woodslab" 
                  className="group relative inline-block px-14 py-4 border border-zinc-200 text-zinc-800 uppercase tracking-[0.3em] text-[10px] font-bold transition-all duration-500"
                >
                  <span className="absolute inset-0 w-0 bg-[#d4a373] transition-all duration-500 ease-out group-hover:w-full"></span>
                  <span className="relative z-10 group-hover:text-white transition-colors duration-500">
                    Explore Gallery
                  </span>
                </Link>
              </div>
            ) : (
              /* ถ้ามีของ ให้โชว์ List ปกติ */
              <div className="fade-in-up">
                <CartList items={cartItems} />
              </div>
            )}
         </div>
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