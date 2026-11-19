import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import ProfileForm from '@/src/components/ProfileForm'
import { supabaseServer } from '@/lib/supabase-server'
import Navbar from '@/src/components/Navbar' // มั่นใจว่ามี Navbar เพื่อความสวยงาม

export const runtime = 'edge'

export const metadata = {
  title: 'My Profile | WOODSLABS',
}

export default async function ProfilePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('sb-access-token')?.value

  if (!token) redirect('/login')

  const { data: { user }, error } = await supabaseServer.auth.getUser(token)
  if (error || !user) redirect('/login')

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  )

  const { data: customer } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="bg-[#FAF9F6] text-[#1C1917] font-sans selection:bg-[#d4a373] selection:text-white min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center relative w-full px-6 py-0 overflow-hidden">
         {/* Background Pattern บางๆ */}
         <div className="absolute inset-0 pointer-events-none opacity-5 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>

         <div className="w-full max-w-2xl bg-white p-10 md:p-16 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-zinc-100 relative z-10 transition-all duration-700">
            
            {/* Header สไตล์เดียวกับ Favorites / Cart */}
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#1C1917] mb-3 uppercase tracking-tight">
                  My Profile
                </h1>
                <p className="text-zinc-500 uppercase tracking-widest text-xs md:text-sm font-light">
                  Account details & Preferences
                </p>
                <div className="w-20 h-[1px] bg-[#d4a373] mx-auto mt-8"></div>
            </div>
            
            {/* Form Section */}
            <div className="fade-in-up">
               <ProfileForm customer={customer} key={customer?.updated_at} />
            </div>
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