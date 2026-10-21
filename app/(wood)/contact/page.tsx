'use client'

import React, { useState, useEffect, useRef } from 'react';
import { submitContactInquiry } from '@/app/actions/contact';
import { FiCheckCircle, FiLoader } from 'react-icons/fi';

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

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await submitContactInquiry({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        message: formData.message,
      });

      if (res.success) {
        setIsSuccess(true);
        setFormData({
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          message: '',
        });
      } else {
        setErrorMessage(res.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      }
    } catch {
      setErrorMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FAF9F6] text-[#1C1917] font-sans selection:bg-[#d4a373] selection:text-white min-h-screen flex flex-col">
      
      {/* 1. Header Section */}
      <section className="relative pt-24 sm:pt-28 md:pt-32 pb-8 sm:pb-12 px-4 sm:px-6 text-center">
         <FadeInSection>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-serif font-medium tracking-tight text-[#1C1917] mb-4 sm:mb-6 uppercase">
              Contact ZENSLAB
            </h1>
            <p className="text-zinc-500 text-xs sm:text-sm md:text-base font-light tracking-wide max-w-2xl mx-auto leading-relaxed">
              หากคุณกำลังมองหาแผ่นไม้จริง Live Edge หรือเฟอร์นิเจอร์ไม้สั่งทำพิเศษ <br className="hidden md:block"/>
              ทีมงาน ZENSLAB พร้อมดูแลและให้คำปรึกษาอย่างมืออาชีพ
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

            {/* Right: Contact Form (Connected to Database) */}
            <div className="w-full lg:w-7/12 bg-white p-5 sm:p-8 md:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-zinc-100 rounded-xl sm:rounded-2xl h-fit lg:sticky top-10">
               <FadeInSection>
                   <h3 className="text-xl sm:text-2xl font-serif text-[#1C1917] mb-2">Get In Touch</h3>
                   <p className="text-zinc-400 text-xs sm:text-sm mb-6 sm:mb-8 font-light leading-relaxed">
                      กรอกแบบฟอร์มเพื่อรับคำแนะนำการเลือกและสั่งซื้อแผ่นไม้จริง Live Edge จากผู้เชี่ยวชาญ
                   </p>
                   
                   {isSuccess ? (
                     <div className="py-8 text-center space-y-4 animate-in fade-in duration-300">
                       <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                         <FiCheckCircle className="w-8 h-8" />
                       </div>
                       <div>
                         <h4 className="text-lg font-serif font-bold text-[#1C1917] mb-1">
                           ส่งข้อความเรียบร้อยแล้ว
                         </h4>
                         <p className="text-sm text-zinc-500 font-light max-w-md mx-auto leading-relaxed">
                           ขอบพระคุณที่ให้ความสนใจ ZENSLAB ทีมงานผู้เชี่ยวชาญได้รับข้อมูลแล้ว และจะติดต่อกลับโดยเร็วที่สุดครับ
                         </p>
                       </div>
                       <button
                         type="button"
                         onClick={() => setIsSuccess(false)}
                         className="inline-block mt-4 text-xs font-bold uppercase tracking-widest text-[#d4a373] hover:text-[#b88656] underline cursor-pointer"
                       >
                         ส่งข้อความเพิ่มเติม
                       </button>
                     </div>
                   ) : (
                     <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                         {errorMessage && (
                           <div className="p-3 text-xs rounded bg-rose-50 border border-rose-200 text-rose-700">
                             {errorMessage}
                           </div>
                         )}

                         {/* Row 1: Name & Last Name */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                             <div className="relative group">
                                 <input
                                   type="text"
                                   id="name"
                                   required
                                   value={formData.firstName}
                                   onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                   className="block py-3 px-0 w-full text-base text-zinc-800 bg-transparent border-0 border-b border-zinc-200 appearance-none focus:outline-none focus:ring-0 focus:border-[#d4a373] peer transition-all duration-300 placeholder-transparent"
                                   placeholder="Name"
                                 />
                                 <label htmlFor="name" className="absolute text-[10px] uppercase tracking-[0.2em] text-zinc-400 duration-300 transform -translate-y-8 scale-100 top-3 -z-10 origin-[0] peer-focus:text-[#d4a373] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-100 peer-focus:-translate-y-8 font-bold">First Name</label>
                             </div>
                             <div className="relative group">
                                 <input
                                   type="text"
                                   id="lastname"
                                   required
                                   value={formData.lastName}
                                   onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                   className="block py-3 px-0 w-full text-base text-zinc-800 bg-transparent border-0 border-b border-zinc-200 appearance-none focus:outline-none focus:ring-0 focus:border-[#d4a373] peer transition-all duration-300 placeholder-transparent"
                                   placeholder="Last Name"
                                 />
                                 <label htmlFor="lastname" className="absolute text-[10px] uppercase tracking-[0.2em] text-zinc-400 duration-300 transform -translate-y-8 scale-100 top-3 -z-10 origin-[0] peer-focus:text-[#d4a373] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-100 peer-focus:-translate-y-8 font-bold">Last Name</label>
                             </div>
                         </div>

                         {/* Row 2: Phone & Email */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                             <div className="relative group">
                                 <input
                                   type="tel"
                                   id="phone"
                                   required
                                   value={formData.phone}
                                   onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                   className="block py-3 px-0 w-full text-base text-zinc-800 bg-transparent border-0 border-b border-zinc-200 appearance-none focus:outline-none focus:ring-0 focus:border-[#d4a373] peer transition-all duration-300 placeholder-transparent"
                                   placeholder="Phone"
                                 />
                                 <label htmlFor="phone" className="absolute text-[10px] uppercase tracking-[0.2em] text-zinc-400 duration-300 transform -translate-y-8 scale-100 top-3 -z-10 origin-[0] peer-focus:text-[#d4a373] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-100 peer-focus:-translate-y-8 font-bold">Phone</label>
                             </div>
                             <div className="relative group">
                                 <input
                                   type="email"
                                   id="email"
                                   required
                                   value={formData.email}
                                   onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                   className="block py-3 px-0 w-full text-base text-zinc-800 bg-transparent border-0 border-b border-zinc-200 appearance-none focus:outline-none focus:ring-0 focus:border-[#d4a373] peer transition-all duration-300 placeholder-transparent"
                                   placeholder="Email"
                                 />
                                 <label htmlFor="email" className="absolute text-[10px] uppercase tracking-[0.2em] text-zinc-400 duration-300 transform -translate-y-8 scale-100 top-3 -z-10 origin-[0] peer-focus:text-[#d4a373] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-100 peer-focus:-translate-y-8 font-bold">Email address</label>
                             </div>
                         </div>

                         {/* Message */}
                         <div className="relative group">
                             <textarea
                               id="message"
                               rows={4}
                               value={formData.message}
                               onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                               className="block py-3 px-0 w-full text-base text-zinc-800 bg-transparent border-0 border-b border-zinc-200 appearance-none focus:outline-none focus:ring-0 focus:border-[#d4a373] peer transition-all duration-300 placeholder-transparent resize-none"
                               placeholder="Message"
                             ></textarea>
                             <label htmlFor="message" className="absolute text-[10px] uppercase tracking-[0.2em] text-zinc-400 duration-300 transform -translate-y-8 scale-100 top-3 -z-10 origin-[0] peer-focus:text-[#d4a373] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-100 peer-focus:-translate-y-8 font-bold">Message (Optional)</label>
                         </div>

                         <button
                           type="submit"
                           disabled={isSubmitting}
                           className="group relative inline-flex items-center justify-center w-full py-4 sm:py-5 border border-zinc-200 text-zinc-800 uppercase tracking-[0.3em] text-[10px] font-bold transition-all duration-500 overflow-hidden mt-6 sm:mt-8 active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           <span className="absolute inset-0 bg-[#d4a373] transition-all duration-500 ease-out w-0 group-hover:w-full"></span>
                           <span className="relative z-10 transition-colors duration-500 group-hover:text-white flex items-center gap-2">
                             {isSubmitting ? (
                               <>
                                 <FiLoader className="w-3.5 h-3.5 animate-spin" />
                                 <span>Sending...</span>
                               </>
                             ) : (
                               <span>Send Message</span>
                             )}
                           </span>
                         </button>
                     </form>
                   )}
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
            title="ZENSLAB Showroom Map"
            src="https://maps.google.com/maps?q=Woodden%20Flagship%20Showroom&t=&z=13&ie=UTF8&iwloc=&output=embed"
            className="opacity-70 hover:opacity-100 transition-opacity duration-700 grayscale hover:grayscale-0"
          ></iframe>
          <div className="absolute inset-0 pointer-events-none border-t border-b border-black/5 shadow-inner"></div>
      </section>

      {/* 4. Footer */}
      <footer className="py-12 sm:py-16 md:py-20 bg-[#0a0a0a] text-white border-t border-white/5 px-4 sm:px-8 md:px-12">
        <div className="max-w-8xl mx-auto text-center space-y-6 sm:space-y-8">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-[0.2em] uppercase text-white opacity-50">ZENSLAB</h2>
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">
              © 2026 ZENSLAB Thailand. All Rights Reserved.
            </div>
        </div>
      </footer>

    </div>
  );
}
