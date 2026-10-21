'use client'

import React, { useState, useEffect, useRef } from 'react';

// --- Animation Helper ---
const FadeInSection = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const [isVisible, setVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => setVisible(entry.isIntersecting));
    }, { threshold: 0.1 });
    if (domRef.current) observer.observe(domRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={domRef}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
      } ${className}`}
    >
      {children}
    </div>
  );
};

// --- Minimalist Button ---
const SubmitButton = () => (
    <button 
      type="button" 
      className="group relative inline-block w-full py-4 sm:py-5 border border-zinc-200 text-zinc-800 uppercase tracking-[0.3em] text-[10px] font-bold transition-all duration-500 overflow-hidden mt-6 sm:mt-8 active:scale-[0.99] cursor-pointer"
    >
      <span className="absolute inset-0 bg-[#d4a373] transition-all duration-500 ease-out w-0 group-hover:w-full"></span>
      <span className="relative z-10 transition-colors duration-500 group-hover:text-white">
        Send Message
      </span>
    </button>
);

export default function ContactPage() {
  return (
    <div className="bg-[#FAF9F6] text-[#1C1917] font-sans selection:bg-[#d4a373] selection:text-white min-h-screen flex flex-col">
      
      {/* 1. Header Section */}
      <section className="relative pt-24 sm:pt-28 md:pt-32 pb-8 sm:pb-12 px-4 sm:px-6 text-center">
         <FadeInSection>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-serif font-medium tracking-tight text-[#1C1917] mb-4 sm:mb-6 uppercase">
              Contact WoodDen
            </h1>
            <p className="text-zinc-500 text-xs sm:text-sm md:text-base font-light tracking-wide max-w-2xl mx-auto leading-relaxed">
              หากคุณกำลังมองหาพื้นไม้เอ็นจิเนียร์ หรือเฟอร์นิเจอร์ไม้จริง <br className="hidden md:block"/>
              ทีมงานเราพร้อมดูแลและให้คำปรึกษาอย่างมืออาชีพ
            </p>
            <div className="w-16 h-[1px] bg-[#d4a373] mx-auto mt-6 sm:mt-8"></div>
         </FadeInSection>
      </section>

      {/* 2. Content Grid (Info & Form) */}
      <section className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-20">
         <div className="flex flex-col lg:flex-row gap-10 lg:gap-24">
            
            {/* Left: Contact Info (Branches) */}
            <div className="w-full lg:w-5/12 space-y-8 sm:space-y-12">
               <FadeInSection>
                   <div className="space-y-8 sm:space-y-12">
                       {/* Branch 1 */}
                       <div className="pb-8 border-b border-zinc-200">
                           <h3 className="text-lg sm:text-xl font-serif text-[#1C1917] mb-2">Woodden Flagship Showroom</h3>
                           <p className="text-xs font-bold text-[#d4a373] uppercase tracking-widest mb-3 sm:mb-4">Design Village Kaset-Nawamin</p>
                           <p className="text-zinc-500 font-light leading-relaxed text-xs sm:text-sm">
                               เลขที่ A201, A202 อาคาร A ชั้น 2<br />
                               ถนนประเสริฐมนูกิจ เขตลาดพร้าว<br />
                               กรุงเทพมหานคร 10240
                           </p>
                           <p className="mt-3 sm:mt-4 text-[#1C1917] font-medium text-sm sm:text-base">Tel: 065-774-1717</p>
                           <p className="mt-1.5 sm:mt-2 text-xs text-zinc-400 font-light">*สาขานี้ให้คำปรึกษาและนัดหมายงานติดตั้งได้</p>
                       </div>

                       {/* Branch 2 */}
                       <div className="pb-8 border-b border-zinc-200">
                           <h3 className="text-lg sm:text-xl font-serif text-[#1C1917] mb-2">Woodden Phuket Branch</h3>
                           <p className="text-xs font-bold text-[#d4a373] uppercase tracking-widest mb-3 sm:mb-4">Premium Outlet Phuket</p>
                           <p className="text-zinc-500 font-light leading-relaxed text-xs sm:text-sm">
                               ศูนย์การค้าพรีเมี่ยมเอ้าท์เล็ทภูเก็ต<br />
                               888, 888/1 หมู่ 2 ต.เกาะแก้ว<br />
                               อ.เมือง จ.ภูเก็ต 83000
                           </p>
                           <p className="mt-3 sm:mt-4 text-[#1C1917] font-medium text-sm sm:text-base">Tel: 098-018-0190</p>
                           <p className="mt-1.5 sm:mt-2 text-xs text-zinc-400 font-light">*สาขานี้ให้คำปรึกษาและนัดหมายงานติดตั้งได้</p>
                       </div>

                       {/* Branch 3 */}
                       <div>
                           <h3 className="text-lg sm:text-xl font-serif text-[#1C1917] mb-2">Woodden Liab Duan Ramintra</h3>
                           <p className="text-xs font-bold text-[#d4a373] uppercase tracking-widest mb-3 sm:mb-4">Showroom</p>
                           <p className="text-zinc-500 font-light leading-relaxed text-xs sm:text-sm">
                               เลขที่ 332 ถนนลาดพร้าววังหินซอย 84<br />
                               แขวงวังทองหลาง เขตวังทองหลาง<br />
                               กรุงเทพมหานคร 10310
                           </p>
                           <p className="mt-3 sm:mt-4 text-[#1C1917] font-medium text-sm sm:text-base">Tel: 02-026-6571</p>
                           <p className="mt-1.5 sm:mt-2 text-xs text-zinc-400 font-light">*สาขานี้ให้คำปรึกษาและนัดหมายงานติดตั้งได้</p>
                       </div>
                   </div>
               </FadeInSection>
            </div>

            {/* Right: Contact Form */}
            <div className="w-full lg:w-7/12 bg-white p-5 sm:p-8 md:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-zinc-100 rounded-xl sm:rounded-2xl h-fit lg:sticky top-10">
               <FadeInSection>
                   <h3 className="text-xl sm:text-2xl font-serif text-[#1C1917] mb-2">Get In Touch</h3>
                   <p className="text-zinc-400 text-xs sm:text-sm mb-6 sm:mb-8 font-light leading-relaxed">
                      กรอกแบบฟอร์มเพื่อรับคำแนะนำการเลือกและติดตั้งพื้นไม้จากผู้เชี่ยวชาญ
                   </p>
                   
                   <form className="space-y-6 sm:space-y-8">
                       
                       {/* Row 1: Name & Last Name */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                           <div className="relative group">
                               <input type="text" id="name" required className="block py-3 px-0 w-full text-base text-zinc-800 bg-transparent border-0 border-b border-zinc-200 appearance-none focus:outline-none focus:ring-0 focus:border-[#d4a373] peer transition-all duration-300 placeholder-transparent" placeholder="Name" />
                               <label htmlFor="name" className="absolute text-[10px] uppercase tracking-[0.2em] text-zinc-400 duration-300 transform -translate-y-8 scale-100 top-3 -z-10 origin-[0] peer-focus:text-[#d4a373] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-100 peer-focus:-translate-y-8 font-bold">First Name</label>
                           </div>
                           <div className="relative group">
                               <input type="text" id="lastname" required className="block py-3 px-0 w-full text-base text-zinc-800 bg-transparent border-0 border-b border-zinc-200 appearance-none focus:outline-none focus:ring-0 focus:border-[#d4a373] peer transition-all duration-300 placeholder-transparent" placeholder="Last Name" />
                               <label htmlFor="lastname" className="absolute text-[10px] uppercase tracking-[0.2em] text-zinc-400 duration-300 transform -translate-y-8 scale-100 top-3 -z-10 origin-[0] peer-focus:text-[#d4a373] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-100 peer-focus:-translate-y-8 font-bold">Last Name</label>
                           </div>
                       </div>

                       {/* Row 2: Phone & Email */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                           <div className="relative group">
                               <input type="tel" id="phone" required className="block py-3 px-0 w-full text-base text-zinc-800 bg-transparent border-0 border-b border-zinc-200 appearance-none focus:outline-none focus:ring-0 focus:border-[#d4a373] peer transition-all duration-300 placeholder-transparent" placeholder="Phone" />
                               <label htmlFor="phone" className="absolute text-[10px] uppercase tracking-[0.2em] text-zinc-400 duration-300 transform -translate-y-8 scale-100 top-3 -z-10 origin-[0] peer-focus:text-[#d4a373] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-100 peer-focus:-translate-y-8 font-bold">Phone</label>
                           </div>
                           <div className="relative group">
                               <input type="email" id="email" required className="block py-3 px-0 w-full text-base text-zinc-800 bg-transparent border-0 border-b border-zinc-200 appearance-none focus:outline-none focus:ring-0 focus:border-[#d4a373] peer transition-all duration-300 placeholder-transparent" placeholder="Email" />
                               <label htmlFor="email" className="absolute text-[10px] uppercase tracking-[0.2em] text-zinc-400 duration-300 transform -translate-y-8 scale-100 top-3 -z-10 origin-[0] peer-focus:text-[#d4a373] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-100 peer-focus:-translate-y-8 font-bold">Email address</label>
                           </div>
                       </div>

                       {/* Message */}
                       <div className="relative group">
                           <textarea id="message" rows={4} className="block py-3 px-0 w-full text-base text-zinc-800 bg-transparent border-0 border-b border-zinc-200 appearance-none focus:outline-none focus:ring-0 focus:border-[#d4a373] peer transition-all duration-300 placeholder-transparent resize-none" placeholder="Message"></textarea>
                           <label htmlFor="message" className="absolute text-[10px] uppercase tracking-[0.2em] text-zinc-400 duration-300 transform -translate-y-8 scale-100 top-3 -z-10 origin-[0] peer-focus:text-[#d4a373] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-100 peer-focus:-translate-y-8 font-bold">Message (Optional)</label>
                       </div>

                       <SubmitButton />
                   </form>
               </FadeInSection>
            </div>

         </div>
      </section>

      {/* 3. Map Section */}
      <section className="w-full h-[300px] sm:h-[380px] md:h-[450px] bg-zinc-200 grayscale relative">
          <iframe 
            width="100%" 
            height="100%" 
            frameBorder="0" 
            scrolling="no" 
            marginHeight={0} 
            marginWidth={0} 
            title="Woodden Showroom Map"
            src="https://maps.google.com/maps?q=Woodden%20Flagship%20Showroom&t=&z=13&ie=UTF8&iwloc=&output=embed"
            className="opacity-70 hover:opacity-100 transition-opacity duration-700 grayscale hover:grayscale-0"
          ></iframe>
          <div className="absolute inset-0 pointer-events-none border-t border-b border-black/5 shadow-inner"></div>
      </section>

      {/* 4. Footer */}
      <footer className="py-12 sm:py-16 md:py-20 bg-[#0a0a0a] text-white border-t border-white/5 px-4 sm:px-8 md:px-12">
        <div className="max-w-8xl mx-auto text-center space-y-6 sm:space-y-8">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-[0.2em] uppercase text-white opacity-50">WOODDEN</h2>
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">
              © 2026 Woodden Thailand. All Rights Reserved.
            </div>
        </div>
      </footer>

    </div>
  );
}
