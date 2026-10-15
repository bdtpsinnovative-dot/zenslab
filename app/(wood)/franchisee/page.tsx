'use client'

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

/* ─── FadeIn helper ─── */
const FadeIn = ({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const [v, setV] = useState(false);
  const r = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: 0.08 });
    if (r.current) obs.observe(r.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={r} style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-[1100ms] ease-out ${v ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} ${className}`}>
      {children}
    </div>
  );
};

const Tag = ({ text }: { text: string }) => (
  <p className="text-[#C8935A] text-[11px] font-bold uppercase tracking-[0.4em] mb-5">{text}</p>
);

/* ─── Data ─── */
const HERO_IMGS = [
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1775730179631-744.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1775730215191-964.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1775724626723-645.webp",
  "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1775724638171-371.webp",
];

const ADVANTAGES = [
  {
    tag: "01 — Material",
    title: "คัดสรรวัตถุดิบ",
    titleEn: "Premium Material Selection",
    desc: "ทีมจัดหาวัตถุดิบระดับโลกของเราสำรวจป่าที่ยั่งยืนทั่วโลกอย่างสม่ำเสมอ มุ่งค้นหาซุงอายุร้อยปีที่มีลายเนื้อไม้เฉพาะตัว เราเลือกเฉพาะไม้ที่มีรูปทรงธรรมชาติอันหาได้ยาก เพื่อสร้างไม้แผ่นระดับโลกอย่างแท้จริง",
    img: "https://gshppxgvdrmbfcxsxeph.supabase.co/storage/v1/object/public/site-assets/general/f473ea3dcaf601f3c6ee4b6b75e505b0-l896u.webp",
    reverse: false,
  },
  {
    tag: "02 — Design",
    title: "ปรัชญาการออกแบบ",
    titleEn: "Design Philosophy",
    desc: "ทีมนักออกแบบของเราเข้าใจลึกซึ้งถึงคุณลักษณะและความงามของไม้แต่ละชนิด พร้อมผสมผสานแนวคิดเฟอร์นิเจอร์ร่วมสมัยเข้ากับธรรมชาติของไม้ สร้างสไตล์ขอบ 14 แบบและแบบผิว 17 แบบ เพื่อให้ลูกค้าเลือกและปรับแต่งได้อย่างอิสระ",
    img: "https://gshppxgvdrmbfcxsxeph.supabase.co/storage/v1/object/public/site-assets/general/68472cc7da4659be15da224c8a898827-7v52j.webp",
    reverse: true,
  },
  {
    tag: "03 — Craftsmanship",
    title: "ช่างฝีมือระดับมาสเตอร์",
    titleEn: "Master Craftsmanship",
    desc: "ทีมช่างเทคนิคมืออาชีพของเราเชี่ยวชาญงานไม้แผ่นเนื้อแข็งโดยเฉพาะ กระบวนการทุกขั้นตอนถูกออกแบบให้ไม่กระทบต่อความเสถียรโดยธรรมชาติของไม้ พร้อมมอบตัวเลือกสี 18 เฉดและเนื้อผิว 9 แบบ",
    img: "https://gshppxgvdrmbfcxsxeph.supabase.co/storage/v1/object/public/site-assets/general/5d3bdeb73b39b3dd05fd75c9e80711e9-qqox1.webp",
    reverse: false,
  },
  {
    tag: "04 — Technology",
    title: "เทคโนโลยีระดับนำ",
    titleEn: "Advanced Technology",
    desc: "ด้วยการสนับสนุนจากเทคโนโลยีชั้นนำระดับโลก เราใช้เครื่องอบแห้งความถี่สูงนำเข้าจากญี่ปุ่น และเครื่องปรับระดับไม้ขนาดใหญ่ ทีมช่างไม้ผู้มีประสบการณ์กว่า 15 ปีดูแลทุกขั้นตอนการผลิต",
    img: "https://gshppxgvdrmbfcxsxeph.supabase.co/storage/v1/object/public/site-assets/general/a8bceb7a237a54537e38cc24da55a6c4-ie2cd.webp",
    reverse: true,
  },
  {
    tag: "05 — Eco",
    title: "รับผิดชอบต่อสิ่งแวดล้อม",
    titleEn: "Eco-Responsibility",
    desc: "เราควบคุมทุกรายละเอียดด้านความยั่งยืนอย่างพิถีพิถัน ตั้งแต่การคัดเลือกวัตถุดิบ วัสดุเรซิน กาว จนถึงสีเคลือบผิว ทุกอย่างผ่านการตรวจสอบให้ปลอดภัย เป็นมิตรกับสิ่งแวดล้อม และทนทานสูง",
    img: "https://gshppxgvdrmbfcxsxeph.supabase.co/storage/v1/object/public/site-assets/general/e9baa1b8ae605818af42473d388bf0eb-xwcek.webp",
    reverse: false,
  },
  {
    tag: "06 — Collection",
    title: "คอลเลกชันพิเศษเฉพาะ",
    titleEn: "Exclusive Collection",
    desc: "คลังสินค้ามากกว่า 10,000 แผ่นที่อบแห้งตามธรรมชาติ และอีกกว่า 1,500 แผ่นระดับพรีเมียม ครอบคลุมพันธุ์ไม้หายากกว่า 40 ชนิดจากยุโรป อเมริกาเหนือ อเมริกาใต้ แอฟริกา และเอเชียตะวันออกเฉียงใต้",
    img: "https://gshppxgvdrmbfcxsxeph.supabase.co/storage/v1/object/public/site-assets/general/8ddac0c25fa633cb6bbdfcb4a031254c-0arvm.webp",
    reverse: true,
  },
];

const SERVICES = [
  { n: "01", th: "ระบบสินค้าร่วม", en: "Shared Product System", desc: "เข้าถึงไม้แผ่นดิบกว่า 10,000 ชิ้น ไม้แผ่นสำเร็จ 1,500+ ชิ้น และเฟอร์นิเจอร์งานฝีมือ" },
  { n: "02", th: "ราคาเดียวกันทั่วประเทศ", en: "Unified Pricing", desc: "ราคาขายปลีกที่สม่ำเสมอทั้งออนไลน์และออฟไลน์ ปกป้องความน่าเชื่อถือของตัวแทน" },
  { n: "03", th: "การคุ้มครองพื้นที่", en: "Regional Protection", desc: "สิทธิ์ตัวแทนพิเศษเฉพาะพื้นที่ที่กำหนด เพื่อความเสถียรของตลาด" },
  { n: "04", th: "บริการครบวงจร", en: "One-Stop Service", desc: "ตั้งแต่การเลือกทำเล ออกแบบร้าน ไปจนถึงกลยุทธ์การจัดแสดงสินค้า" },
  { n: "05", th: "โซลูชันปรับแต่งได้", en: "Custom Solutions", desc: "ออกแบบรูปแบบร้านค้าที่เหมาะสมกับแต่ละแบรนด์ เพื่อประสบการณ์การช็อปปิ้งที่ดียิ่งขึ้น" },
  { n: "06", th: "ฝึกอบรมจากผู้เชี่ยวชาญ", en: "Expert Training", desc: "การฝึกอบรมครบถ้วนด้านความรู้แบรนด์ รายละเอียดสินค้า และมาตรฐานการให้บริการ" },
  { n: "07", th: "สนับสนุนการดำเนินงาน", en: "Operational Support", desc: "แผนดำเนินงานเชิงกลยุทธ์ที่เชื่อมโยงระบบออนไลน์และออฟไลน์เข้าด้วยกัน" },
];

const STEPS = [
  { n: "01", th: "ปรึกษาหารือ", en: "Consultation" },
  { n: "02", th: "ตอบคำถาม", en: "Q&A Session" },
  { n: "03", th: "ศึกษาข้อมูล", en: "Research" },
  { n: "04", th: "แสดงเจตจำนง", en: "Intent" },
  { n: "05", th: "ลงนามสัญญา", en: "Agreement" },
  { n: "06", th: "เริ่มความร่วมมือ", en: "Cooperation" },
];

export default function FranchiseePage() {
  const [hi, setHi] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setHi(i => (i + 1) % HERO_IMGS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-[#F7F4EF] text-[#1C1917] font-sans selection:bg-[#C8935A] selection:text-white min-h-screen">

      {/* ══ HERO ══ */}
      <section className="relative w-full h-[75vh] md:h-screen overflow-hidden bg-[#0d0b09]">
        {HERO_IMGS.map((src, i) => (
          <img key={i} src={src} alt=""
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ease-in-out ${i === hi ? 'opacity-60' : 'opacity-0'}`}
            style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
          />
        ))}
        {/* 2-layer gradient — แสงมาจากขวา เหมือนหน้าหลัก */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <FadeIn>
            <p className="text-[#C8935A] text-[9px] uppercase tracking-[0.6em] mb-6 font-medium">BY WOODDEN™ — Franchise Program</p>
            <p className="text-white/55 text-xs md:text-sm uppercase tracking-[0.4em] font-light">
              Partner With Us — Crafting Nature's Legacy Together
            </p>
          </FadeIn>
        </div>

        {/* dot nav */}
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {HERO_IMGS.map((_, i) => (
            <button key={i} onClick={() => setHi(i)}
              className={`rounded-full transition-all duration-500 ${i === hi ? 'bg-[#C8935A] w-7 h-1.5' : 'bg-white/30 w-1.5 h-1.5'}`} />
          ))}
        </div>

        {/* scroll hint */}
        <div className="absolute bottom-7 right-8 flex flex-col items-center gap-2 opacity-40">
          <div className="w-[1px] h-14 bg-white animate-pulse" />
          <span className="text-white text-[8px] uppercase tracking-[0.3em] rotate-90 mt-2">Scroll</span>
        </div>
      </section>

      {/* ══ OPENING ══ */}
      <section className="py-32 px-6 bg-[#F7F4EF]">
        <FadeIn className="max-w-4xl mx-auto text-center">
          <Tag text="Why Partner With Us" />
          {/* ✅ ลบ font-serif เพิ่ม font-medium */}
          <h2 className="text-[#1C1917] font-medium leading-snug mb-8"
            style={{ fontSize: 'clamp(1.6rem, 3.5vw, 3.5rem)' }}>
            "เติบโตไปพร้อมกับเรา<br className="hidden md:block" />
            <span className="text-zinc-400 font-light"> ภายใต้แบรนด์ที่ตลาดเชื่อถือ"</span>
          </h2>
          <p className="text-zinc-500 font-light leading-loose text-sm md:text-lg max-w-2xl mx-auto">
            WOODSLABS เปิดโอกาสให้นักลงทุนและผู้ประกอบการที่มีวิสัยทัศน์ร่วมขยายแบรนด์ระดับโลก
            พร้อมระบบสนับสนุนที่ครอบคลุมทุกมิติ ตั้งแต่วันแรกจนถึงวันที่คุณเติบโตอย่างยั่งยืน
          </p>
          <div className="w-12 h-[1px] bg-[#C8935A] my-10 opacity-60 mx-auto" />
          <p className="text-[#C8935A] text-sm font-light tracking-wide italic">
            "สร้างพื้นที่ที่กลมกลืนระหว่างคนและธรรมชาติ"
          </p>
        </FadeIn>
      </section>

      {/* ══ ADVANTAGES — ZigZag ══ */}
      <div className="space-y-0">
        {ADVANTAGES.map((a, i) => (
          <section key={i} className={`flex flex-col ${a.reverse ? 'md:flex-row-reverse' : 'md:flex-row'} min-h-[560px] md:h-[620px]`}>
            {/* image */}
            <div className="w-full md:w-1/2 h-[50vw] md:h-full overflow-hidden relative group">
              <img src={a.img} alt={a.title}
                className="w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-110"
                style={{ 
                  backfaceVisibility: 'hidden', 
                  transform: 'translateZ(0)', 
                  WebkitFontSmoothing: 'subpixel-antialiased' 
                }} 
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-700" />
              {/* ✅ ลบ font-serif เพิ่ม font-light เพื่อความมินิมอล */}
              <div className="absolute bottom-6 right-6 text-white/15 text-8xl font-light leading-none select-none pointer-events-none tracking-tighter">
                {a.n?.replace("0", "").split("—")[0].trim() || String(i + 1).padStart(2, '0')}
              </div>
            </div>
            {/* text */}
            <div className={`w-full md:w-1/2 flex items-center ${i % 2 === 0 ? 'bg-white' : 'bg-[#F7F4EF]'}`}>
              <div className="p-10 md:p-20 lg:p-24 w-full">
                <FadeIn>
                  <Tag text={a.tag} />
                  {/* ✅ ลบ font-serif */}
                  <h3 className="text-[#1C1917] font-medium leading-snug mb-2"
                    style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.8rem)' }}>
                    {a.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mb-8 tracking-wider font-light">{a.titleEn}</p>
                  <p className="text-zinc-700 font-light leading-[1.95] text-base md:text-lg text-justify">
                    {a.desc}
                  </p>
                </FadeIn>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* ══ SERVICES ══ */}
      <section className="py-0 bg-[#1C1917] overflow-hidden">
        {/* top image strip */}
        <div className="w-full h-64 md:h-72 relative overflow-hidden">
          <img src="https://gshppxgvdrmbfcxsxeph.supabase.co/storage/v1/object/public/site-assets/general/joinshop7-l6un4.webp"
            alt="" className="w-full h-full object-cover opacity-25"
            style={{ 
              backfaceVisibility: 'hidden', 
              transform: 'translateZ(0)', 
              WebkitFontSmoothing: 'subpixel-antialiased' 
            }} 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1C1917]" />
          <div className="absolute inset-0 flex items-end justify-center pb-12">
            <FadeIn className="text-center">
              <Tag text="Support System — Exclusive Services" />
              {/* ✅ ลบ font-serif */}
              <h2 className="text-white font-medium" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3.5rem)' }}>
                สิทธิประโยชน์<span className="text-[#C8935A]">เฉพาะพาร์ทเนอร์</span>
              </h2>
            </FadeIn>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 pb-28 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5">
            {SERVICES.map((s, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div className="group bg-[#1C1917] p-8 md:p-10 hover:bg-white/4 transition-colors duration-500 cursor-default">
                  <div className="flex items-start gap-5">
                    {/* ✅ ลบ font-serif เพิ่ม font-light */}
                    <p className="text-2xl font-light tracking-widest text-white/10 group-hover:text-[#C8935A] transition-colors duration-500 leading-none flex-shrink-0 pt-0.5">{s.n}</p>
                    <div>
                      {/* ✅ ลบ font-serif */}
                      <p className="text-white font-medium text-lg mb-1 group-hover:text-[#C8935A] transition-colors duration-500">{s.th}</p>
                      <p className="text-[#C8935A] text-[8px] uppercase tracking-[0.4em] mb-3 opacity-60">{s.en}</p>
                      <p className="text-white/50 font-light text-base leading-relaxed group-hover:text-white/70 transition-colors duration-500">{s.desc}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ INVESTMENT PARALLAX ══ */}
      <section className="relative py-52 px-6 bg-fixed bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: `url("https://gshppxgvdrmbfcxsxeph.supabase.co/storage/v1/object/public/site-assets/general/joinshop7-l6un4.webp")` }}>
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative z-10 max-w-3xl mx-auto text-center text-white">
          <FadeIn>
            <Tag text="Opportunity — Investment & Growth" />
            {/* ✅ ลบ font-serif */}
            <h2 className="text-white font-medium leading-snug mb-10"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 4rem)' }}>
              โอกาสลงทุน<br />
              <span className="text-[#C8935A]">ที่เติบโตไปด้วยกัน</span>
            </h2>
            <p className="text-white/70 font-light text-base md:text-lg max-w-xl mx-auto leading-loose mb-4">
              WOODSLABS เติบโตจากรากฐานเฟอร์นิเจอร์ไม้เนื้อแข็งสู่แบรนด์ระดับนานาชาติ
              เราพร้อมร่วมมือกับเจ้าของแบรนด์ นักออกแบบ และโชว์รูมผ่านรูปแบบความร่วมมือที่ยืดหยุ่น
            </p>
            <p className="text-white/70 font-light text-base md:text-lg max-w-xl mx-auto leading-loose mb-14">
              เราสนับสนุนแฟรนไชส์แบบเฉพาะตัว พร้อมโซลูชันที่ออกแบบเพื่อคุณโดยเฉพาะ
              ร่วมสร้างพื้นที่ที่ผสมผสานความเป็นมนุษย์และธรรมชาติในยุคใหม่
            </p>
            <Link href="/contact"
              className="group relative inline-flex items-center gap-3 px-12 py-4 border border-white/20 text-[10px] font-bold uppercase tracking-[0.35em] overflow-hidden transition-all duration-500 hover:border-[#C8935A]">
              <span className="absolute inset-0 w-0 group-hover:w-full bg-[#C8935A] transition-all duration-500 ease-out" />
              <span className="relative z-10 group-hover:text-white transition-colors duration-500">ติดต่อสอบถาม</span>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ══ FRANCHISE STEPS ══ */}
      <section className="py-32 px-6 bg-[#F7F4EF]">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-20">
            <Tag text="The Process — Franchise Roadmap" />
            {/* ✅ ลบ font-serif */}
            <h2 className="text-[#1C1917] font-medium" style={{ fontSize: 'clamp(1.8rem, 3vw, 3rem)' }}>
              เส้นทางสู่การเป็นพาร์ทเนอร์
            </h2>
          </FadeIn>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-[#E8E2D9]">
            {STEPS.map((s, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="group bg-[#F7F4EF] hover:bg-white transition-colors duration-500 p-8 md:p-10 text-center cursor-default relative overflow-hidden">
                  {/* ✅ ลบ font-serif เพิ่ม font-light */}
                  <p className="text-5xl font-light tracking-tighter text-[#E8E2D9] group-hover:text-[#C8935A]/20 transition-colors duration-500 absolute top-4 right-4 leading-none select-none">
                    {s.n}
                  </p>
                  <div className="relative z-10 pt-8">
                    {/* ✅ ลบ font-serif */}
                    <p className="text-[#1C1917] font-medium text-lg mb-1">{s.th}</p>
                    <p className="text-[#C8935A] text-[8px] uppercase tracking-[0.4em]">{s.en}</p>
                    <div className="w-6 h-[1px] bg-[#C8935A] mx-auto mt-5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="py-32 px-6 bg-white text-center border-t border-[#E8E2D9]">
        <FadeIn>
          <Tag text="Start Your Journey" />
          {/* ✅ ลบ font-serif */}
          <h2 className="text-[#1C1917] font-medium mb-4" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3.5rem)' }}>
            พร้อมเริ่มต้นกับเราหรือยัง?
          </h2>
          <p className="text-zinc-700 mb-12 max-w-lg mx-auto leading-relaxed text-base md:text-lg font-light">
            ส่งข้อความมาหาเราวันนี้ ทีมงานของเราพร้อมให้คำปรึกษาและตอบทุกคำถาม
            เพื่อช่วยให้คุณตัดสินใจได้อย่างมั่นใจ
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact"
              className="group relative inline-flex items-center gap-3 px-10 py-4 border border-[#1C1917]/25 text-[10px] font-bold uppercase tracking-[0.25em] overflow-hidden transition-all duration-500 hover:border-[#C8935A]">
              <span className="absolute inset-0 w-0 group-hover:w-full bg-[#C8935A] transition-all duration-500 ease-out" />
              <span className="relative z-10 group-hover:text-white transition-colors duration-500">ติดต่อเรา</span>
            </Link>
            <Link href="/about"
              className="group relative inline-flex items-center gap-3 px-10 py-4 border border-[#1C1917]/25 text-[10px] font-bold uppercase tracking-[0.25em] overflow-hidden transition-all duration-500 hover:border-[#C8935A]">
              <span className="absolute inset-0 w-0 group-hover:w-full bg-[#C8935A] transition-all duration-500 ease-out" />
              <span className="relative z-10 group-hover:text-white transition-colors duration-500">เรียนรู้เพิ่มเติม</span>
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="py-16 bg-[#0a0a0a] text-zinc-500 border-t border-white/5 text-center">
        {/* ✅ ลบ font-serif เพิ่ม font-light */}
        <p className="text-white/20 text-4xl font-light tracking-[0.4em] uppercase mb-6">WOODSLABS</p>
        <p className="text-[10px] uppercase tracking-widest mb-1">© 2026 Woodslabs Industry Co., Ltd. — BY WOODDEN™</p>
        <p className="text-[9px] opacity-40 normal-case mt-1 font-light">"making every piece of wood warm the world."</p>
      </footer>

    </div>
  );
}