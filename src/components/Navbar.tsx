'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getCart } from '@/app/actions/cart'
import { getNavbarProfile } from '@/app/actions/getNavbarProfile'
import { signOutAction } from '@/app/actions/auth'

// --- HELPER FUNCTION ---
const getImageUrl = (path: string | null, version?: string) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('https')) return path;
  const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gshppxgvdrmbfcxsxeph.supabase.co"}/storage/v1/object/public`;
  const cleanPath = path.replace(/^\/+/, "");
  const fullUrl = `${baseUrl}/${cleanPath}`;
  if (version) {
      return `${fullUrl}?v=${new Date(version).getTime()}`;
  }
  return fullUrl;
}

// --- ICONS ---
const IconMenu = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>);
const IconClose = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>);
const IconUser = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const IconShoppingCart = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>);
const IconLogout = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>);
const IconProfile = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const IconHeart = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>);
const IconPackage = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/></svg>);

// --- NAVLINK ---
const NavLink = ({ href, children, className }: { href: string, children: React.ReactNode, className: string }) => (
  <Link href={href} className="relative group py-3">
    {/* ✅ ยายแก้ขนาดจาก text-[10px] md:text-[11px] ให้กลายเป็น text-xs md:text-sm (ใหญ่ขึ้นกำลังสวย) */}
    {/* ✅ และปรับ tracking ลงนิดนึงให้พอดีกับตัวอักษรที่ใหญ่ขึ้นจ้ะ */}
    <span className={`font-sans text-xs md:text-sm font-medium uppercase tracking-[0.15em] group-hover:text-[#d4a373] ${className}`}>
      {children}
    </span>
    <span className="absolute bottom-0 left-1/2 w-0 h-[1px] bg-[#d4a373] transition-all duration-300 ease-out group-hover:w-full group-hover:left-0"></span>
  </Link>
);

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true); 
  const [cartCount, setCartCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleLogout = async () => {
    try {
        await signOutAction();
        setUser(null); 
        setCartCount(0);
        setIsMobileOpen(false);
        setIsDropdownOpen(false);
        router.push('/login');
        router.refresh(); 
    } catch (error) {
        console.error("Logout failed", error);
    }
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const initData = async () => {
        setIsLoading(true);
        try {
            const profileData = await getNavbarProfile();
            if (profileData) {
                setUser(profileData);
                const cartItems = await getCart();
                const total = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
                setCartCount(total);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false); 
        }
    }
    initData();

    const handleCartUpdate = async () => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);
        const cartItems = await getCart();
        const total = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
        setCartCount(total);
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, [pathname]); 

  useEffect(() => {
    setIsMobileOpen(false);
    setIsDropdownOpen(false);
  }, [pathname]);

  // กลุ่ม 1: มี dark hero image → navbar โปร่งใส + ตัวอักษรขาว
  const isDarkHeroPage = pathname === '/' || pathname === '/about' || pathname === '/franchisee';
  // กลุ่ม 2: พื้นหลังสว่าง → navbar โปร่งใส + ตัวอักษรดำ
  const isLightHeroPage = pathname === '/woodslab' || pathname === '/contact' || pathname.startsWith('/woodslab/product');
  const isHeroPage = isDarkHeroPage || isLightHeroPage;

  // Navbar มีพื้นขาวเมื่อ: scroll ลง / เปิด mobile menu / ไม่ใช่หน้า hero
  const isThemeDark = !isHeroPage || isScrolled || isMobileOpen;
  // ตัวอักษรขาวเฉพาะ dark hero page ที่ยังไม่ scroll
  const useWhiteText = isDarkHeroPage && !isScrolled && !isMobileOpen;

  const commonTransition = "transition-all duration-500 ease-in-out";
  const mainTextColor = useWhiteText ? 'text-white' : 'text-zinc-800';
  const navBgClass = isThemeDark
    ? 'bg-white border-b border-zinc-100 py-3 md:py-4'
    : 'bg-transparent border-transparent py-6';

  const UserAvatar = () => {
    const avatarUrl = getImageUrl(user?.avatar_url, user?.created_at);
    const avatarBorder = useWhiteText ? 'border-white/50 hover:border-white' : 'border-zinc-300 hover:border-[#d4a373]';
    
    return (
        <div className={`w-8 h-8 rounded-full overflow-hidden border flex items-center justify-center text-[10px] font-serif relative cursor-pointer ${commonTransition} ${avatarBorder} ${mainTextColor}`}>
             {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
             ) : (
                <span>{user?.full_name?.charAt(0).toUpperCase() || 'U'}</span>
             )}
        </div>
    );
  };

  return (
    <>
      {/* ✅ LAYOUT FIX: 
         - Mobile/Tablet (ค่า Default): ใช้ Flex justify-between (ซ้ายขวาดันกัน)
         - Desktop (lg ขึ้นไป): ใช้ Grid 3 คอลัมน์ (ซ้าย-กลาง-ขวา) เพื่อให้เมนูกลาง อยู่ตรงกลางเป๊ะๆ 
         - grid-cols-[1fr_auto_1fr] คือเทคนิคที่ทำให้ ซ้ายกับขวากินพื้นที่เท่ากัน เพื่อบีบให้ตรงกลาง Center จริงๆ
      */}
      <nav className={`fixed top-0 left-0 w-full z-[1000] px-6 md:px-12 flex justify-between items-center lg:grid lg:grid-cols-[1fr_auto_1fr] ${navBgClass} ${commonTransition}`}>
          
          {/* 1. LOGO (ชิดซ้าย) */}
          <div className="flex justify-start">
             <Link href="/" className="flex items-center cursor-pointer z-[1001] relative group">
                
                {/* ✅ ยายปรับ h (ความสูง) ให้ใหญ่ขึ้นเป็น 14 ถึง 20 
                    และใส่ origin-left (ขยายจากฝั่งซ้าย) + scale-125 (ขยายอีก 25%) จ้ะ */}
                <img 
                  src="/wood_slabs_photo/Artboard 1 copy 2.png"
                  alt="ZENSLAB Logo" 
                  className={`object-contain w-auto h-14 md:h-16 lg:h-20 origin-left transform md:scale-125 ${commonTransition} ${useWhiteText ? 'brightness-0 invert' : ''}`}
                />
                
             </Link>
          </div>
          
          {/* 2. CENTER MENU (ตรงกลาง - แสดงเฉพาะ lg ขึ้นไป) */}
          {/* ✅ เปลี่ยนเป็น hidden lg:flex เพื่อซ่อนบน Tablet ที่พื้นที่ไม่พอ */}
          <div className="hidden lg:flex justify-center items-center gap-8 xl:gap-12 px-4 whitespace-nowrap">
            <NavLink href="/about" className={`${commonTransition} ${mainTextColor}`}>About</NavLink>
            <NavLink href="/woodslab" className={`${commonTransition} ${mainTextColor}`}>Collection</NavLink>
            <NavLink href="/franchisee" className={`${commonTransition} ${mainTextColor}`}>Franchisee</NavLink>
            <NavLink href="/contact" className={`${commonTransition} ${mainTextColor}`}>Contact</NavLink>
          </div>

          {/* 3. RIGHT ACTIONS (ชิดขวา) */}
          <div className="flex justify-end items-center gap-6">
            
            {/* Desktop Icons (แสดงเฉพาะ lg ขึ้นไป) */}
            <div className="hidden lg:flex items-center gap-6">
                {user && (
                    <Link href="/cart" className="relative p-1 group hover:text-[#d4a373]" title="Shopping Cart">
                        <div className={isAnimating ? 'animate-bump' : ''}>
                           <IconShoppingCart className={`w-5 h-5 group-hover:scale-110 transform ${commonTransition} ${mainTextColor}`} />
                        </div>
                        {cartCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-[#d4a373] text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-sm border border-white">
                                {cartCount > 9 ? '9+' : cartCount}
                            </span>
                        )}
                    </Link>
                )}

                {isLoading ? (
                    <div className="w-8 h-8 rounded-full bg-zinc-200 animate-pulse"></div>
                ) : user ? (
                    <div className="relative" ref={dropdownRef}>
                        <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="focus:outline-none">
                            <UserAvatar />
                        </button>
                        <div className={`absolute right-0 mt-6 w-60 bg-white rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-zinc-100 py-2 transition-all duration-300 origin-top-right ${isDropdownOpen ? 'opacity-100 scale-100 visible translate-y-0' : 'opacity-0 scale-95 invisible -translate-y-2'}`}>
                            <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-t border-l border-zinc-100 transform rotate-45"></div>
                            <div className="px-6 py-4 border-b border-zinc-50 mb-1">
                                <p className="text-[9px] text-zinc-400 uppercase tracking-widest mb-1">Signed in as</p>
                                <p className="text-sm font-bold text-zinc-800 truncate font-serif">{user.full_name || 'User'}</p>
                            </div>
                            <div className="py-1">
                                <Link href="/profile" className="flex items-center gap-3 px-6 py-3 text-xs text-zinc-600 hover:bg-zinc-50 hover:text-[#d4a373] transition-colors uppercase tracking-wider">
                                    <IconProfile className="w-4 h-4" /> My Profile
                                </Link>
                                {/* <Link href="/cart" className="flex items-center gap-3 px-6 py-3 text-xs text-zinc-600 hover:bg-zinc-50 hover:text-[#d4a373] transition-colors uppercase tracking-wider">
                                    <IconShoppingCart className="w-4 h-4" /> My Cart ({cartCount})
                                </Link> */}
                                <Link href="/favorites" className="flex items-center gap-3 px-6 py-3 text-xs text-zinc-600 hover:bg-zinc-50 hover:text-[#d4a373] transition-colors uppercase tracking-wider">
                                    <IconHeart className="w-4 h-4" /> My Favorites
                                </Link>
                                {/* <Link href="/my-orders" className="flex items-center gap-3 px-6 py-3 text-xs text-zinc-600 hover:bg-zinc-50 hover:text-[#d4a373] transition-colors uppercase tracking-wider">
                                    <IconPackage className="w-4 h-4" /> My Reservations
                                </Link> */}
                            </div>
                            <div className="border-t border-zinc-50 mt-1 pt-1 pb-1">
                                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-6 py-3 text-xs text-red-500 hover:bg-red-50 transition-colors text-left uppercase tracking-wider">
                                    <IconLogout className="w-4 h-4" /> Log Out
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <Link href="/login" className="p-1 hover:text-[#d4a373]" title="Login">
                        <IconUser className={`w-5 h-5 ${commonTransition} ${mainTextColor}`} />
                    </Link>
                )}
            </div>

            {/* Mobile Hamburger (แสดงเมื่อเล็กกว่า lg) */}
            {/* ✅ เปลี่ยนเป็น lg:hidden เพื่อให้ Tablet เห็น Hamburger แทนเมนูยาวๆ */}
            <div className="lg:hidden flex items-center gap-4 z-[1001]">
                  {user && (
                    <Link href="/cart" className="relative p-2">
                        <IconShoppingCart className={`w-6 h-6 ${commonTransition} ${mainTextColor}`} />
                        {cartCount > 0 && <span className="absolute top-0 right-0 bg-[#d4a373] text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full">{cartCount}</span>}
                    </Link>
                  )}
                  <button className="p-2 hover:text-[#d4a373]" onClick={() => setIsMobileOpen(!isMobileOpen)}>
                    {isMobileOpen ? 
                        <IconClose className="w-6 h-6 text-zinc-800" /> : 
                        <IconMenu className={`w-6 h-6 ${commonTransition} ${mainTextColor}`} />
                    }
                  </button>
            </div>
          </div>
      </nav>

      {/* MOBILE MENU (ส่วนนี้เหมือนเดิม) */}
      <div className={`fixed inset-0 bg-[#FAF9F6] z-[999] flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${isMobileOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-10'}`}>
          <div className="absolute bottom-10 left-0 w-full text-center pointer-events-none opacity-5">
             <span className="text-[15vw] font-serif font-bold text-black uppercase tracking-widest leading-none">Woods</span>
          </div>
          <div className="flex flex-col gap-8 text-center relative z-10">
    {/* ✅ ยายเปลี่ยนเป็น font-sans และเพิ่ม tracking ให้ตัวอักษรดูโปร่งๆ เข้ากับแบรนด์จ้ะ */}
    <Link href="/" className="text-4xl font-sans font-light uppercase tracking-[0.1em] text-[#1C1917] hover:text-[#d4a373] transition-colors">Home</Link>
    <Link href="/about" className="text-4xl font-sans font-light uppercase tracking-[0.1em] text-[#1C1917] hover:text-[#d4a373] transition-colors">About</Link>
    <Link href="/woodslab" className="text-4xl font-sans font-light uppercase tracking-[0.1em] text-[#1C1917] hover:text-[#d4a373] transition-colors">Collection</Link>
    <Link href="/franchisee" className="text-4xl font-sans font-light uppercase tracking-[0.1em] text-[#1C1917] hover:text-[#d4a373] transition-colors">Franchisee</Link>
    <Link href="/contact" className="text-4xl font-sans font-light uppercase tracking-[0.1em] text-[#1C1917] hover:text-[#d4a373] transition-colors">Contact</Link>
</div>
          
          {user ? (
             <div className="flex flex-col items-center gap-6 mt-12 border-t border-zinc-200 pt-12 w-48">
                <Link href="/profile" className="flex items-center gap-3 text-sm uppercase tracking-widest text-zinc-600 hover:text-[#d4a373]"><UserAvatar /> <span>{user.full_name}</span></Link>
                <Link href="/favorites" className="flex items-center gap-3 text-sm uppercase tracking-widest text-zinc-600 hover:text-[#d4a373]"><IconHeart className="w-4 h-4" /> Favorites</Link>
                <Link href="/my-orders" className="flex items-center gap-3 text-sm uppercase tracking-widest text-zinc-600 hover:text-[#d4a373]"><IconPackage className="w-4 h-4" /> Reservations</Link>
                <button onClick={handleLogout} className="flex items-center gap-2 text-sm uppercase tracking-widest text-red-500 hover:text-red-700 mt-4"><IconLogout className="w-4 h-4" /> Log Out</button>
             </div>
          ) : (
             <Link href="/login" className="text-lg font-serif text-zinc-500 hover:text-[#d4a373] transition-colors mt-12 flex items-center gap-2 italic"><IconUser className="w-5 h-5" /> Login / Register</Link>
          )}
      </div>
      
      {isThemeDark && <div className="h-[80px]"></div>}
    </>
  )
}