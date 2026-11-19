import React from 'react';
import { cookies } from 'next/headers'; // ✅ เรียกใช้ได้แล้วเพราะเป็น Server Component
import { redirect } from 'next/navigation';
import Navbar from '../../../src/components/Navbar';
import LoginForm from '@/src/components/LoginForm'; // ✅ เรียกใช้ Form ที่เราแยกออกมา
import { createClient } from '@supabase/supabase-js'; // ✅ เพิ่ม import

export const runtime = 'edge';

export default async function LoginPage() {
  // 1. ตรวจสอบ Cookie ก่อนเลย
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;

  // 2. ถ้ามี Token แล้ว ให้ดีดไปหน้า woodslab ทันที
if (token) {
      // สร้าง Client ชั่วคราวเพื่อเช็ค Token
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
      )

      // เช็คว่า Token นี้ยัง Valid จริงไหม?
      const { data: { user }, error } = await supabase.auth.getUser(token)

      // ถ้า Token ยังดีอยู่ -> ค่อยดีดไปหน้าอื่น
      if (user && !error) {
         redirect('/woodslab');
      }
      
      // ⚠️ ถ้า Token หมดอายุ (error) -> ปล่อยให้มันรัน Code ข้างล่างต่อ
      // เพื่อแสดงฟอร์ม Login ให้ User กรอกใหม่ได้เลย (ไม่ต้องดีดกลับไปมา)
  }

  // 3. ถ้าไม่มี Token ให้แสดงหน้า Login ปกติ
  return (
    <div className="bg-[#FAF9F6] text-[#1C1917] font-sans selection:bg-[#d4a373] selection:text-white min-h-screen flex flex-col">
      
      {/* 1. Navbar */}
      <Navbar />

      {/* 2. Main Login Section */}
      <main className="flex-grow flex items-center justify-center relative w-full px-6 py-32">
         {/* Background Texture */}
         <div className="absolute inset-0 pointer-events-none opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>

         <div className="w-full max-w-md bg-white p-10 md:p-14 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-[#e5e5e5] relative z-10">
            
            <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-wide text-black mb-2 uppercase">
                  Welcome Back
                </h1>
                <p className="text-zinc-500 text-sm font-light tracking-wider uppercase">
                  Log in to access your exclusive collection
                </p>
            </div>

            {/* เรียกใช้ Component ฟอร์มที่เราแยกไว้ */}
            <LoginForm />

         </div>
      </main>

      {/* 3. Footer */}
      <footer className="py-12 bg-[#0a0a0a] text-white border-t border-white/5 px-8 md:px-12 mt-auto">
        <div className="max-w-8xl mx-auto text-center">
            <h2 className="text-2xl font-serif font-bold tracking-[0.2em] uppercase text-white mb-6 opacity-50">WOODSLABS</h2>
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">
              &copy; 2026 Woodslabs Industry Co., Ltd.
            </div>
        </div>
      </footer>

    </div>
  );
}