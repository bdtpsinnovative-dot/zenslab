'use client'

import React, { useActionState, useState, useRef, useEffect, startTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { updateProfile } from '@/app/actions/profile'
import imageCompression from 'browser-image-compression'
import Cropper from 'react-easy-crop' // ✅ Import Cropper
import { getCroppedImg } from '@/src/utils/canvasUtils' // ✅ Import Helper ที่สร้างเมื่อกี้ (เช็ค path ด้วยนะ)

// --- Helper URL ---
const getImageUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('https') || path.startsWith('blob:')) return path;
  const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gshppxgvdrmbfcxsxeph.supabase.co"}/storage/v1/object/public`;
  const cleanPath = path.replace(/^\/+/, "");
  return `${baseUrl}/${cleanPath}`;
}

const IconCamera = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
)

function SubmitButton({ isCompressing }: { isCompressing: boolean }) {
  const { pending } = useFormStatus()
  const isBusy = pending || isCompressing
  return (
    <button type="submit" disabled={isBusy} suppressHydrationWarning className="group relative inline-block w-full py-5 border border-zinc-200 text-zinc-800 uppercase tracking-[0.3em] text-[10px] font-bold transition-all duration-500 overflow-hidden mt-10 disabled:opacity-70 disabled:cursor-not-allowed">
      <span className={`absolute inset-0 bg-[#d4a373] transition-all duration-500 ease-out ${isBusy ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
      <span className={`relative z-10 transition-colors duration-500 ${isBusy ? 'text-white' : 'group-hover:text-white'}`}>
        {isCompressing ? 'Processing Image...' : pending ? 'Saving Details...' : 'Save Profile Changes'}
      </span>
    </button>
  )
}

export default function ProfileForm({ customer }: { customer: any }) {
  const [state, formAction] = useActionState(updateProfile, null)
  
  // State สำหรับรูปภาพ
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null) // เก็บไฟล์ที่ครอปแล้ว
  const [isCompressing, setIsCompressing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State สำหรับ Cropper
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null) // รูปต้นฉบับที่จะเอามาครอป
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)

  const displayImage = previewUrl || getImageUrl(customer?.avatar_url)
  const imageVersion = customer?.updated_at ? new Date(customer.updated_at).getTime() : '1';

  // --- 1. เมื่อเลือกไฟล์จากเครื่อง (ยังไม่ครอป) ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setCropImageSrc(reader.result as string) // ส่งรูปไปให้ Cropper
        setIsCropperOpen(true) // เปิด Modal
      })
      reader.readAsDataURL(file)
    }
    // Reset input value เพื่อให้เลือกรูปเดิมซ้ำได้ถ้าต้องการแก้ไข
    event.target.value = ''
  }

  // --- 2. เมื่อครอปเสร็จ (กด Confirm) ---
  const handleCropConfirm = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return

    try {
      // ตัดรูปตามพิกัด
      const croppedFile = await getCroppedImg(cropImageSrc, croppedAreaPixels)
      
      if (croppedFile) {
        // สร้าง URL เพื่อแสดงผลหน้าเว็บทันที
        const objectUrl = URL.createObjectURL(croppedFile)
        setPreviewUrl(objectUrl)
        setSelectedFile(croppedFile) // เก็บไฟล์ที่ตัดแล้วไว้เตรียมส่ง
        
        // Reset & Close Modal
        setIsCropperOpen(false)
        setCropImageSrc(null)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  // --- 3. เมื่อกด Submit Form ---
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsCompressing(true)

    const formData = new FormData(event.currentTarget)
    
    // ถ้ามีไฟล์ที่ครอปแล้ว (selectedFile) ให้เอามาบีบอัด
    if (selectedFile) {
      try {
        console.log(`Cropped Size: ${selectedFile.size / 1024 / 1024} MB`)

        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          fileType: 'image/webp'
        }
        
        const compressedFile = await imageCompression(selectedFile, options)
        console.log(`Final WebP Size: ${compressedFile.size / 1024 / 1024} MB`)
        
        const newFileName = "avatar.webp"
        const finalFile = new File([compressedFile], newFileName, { type: 'image/webp' })
        
        // ใส่ไฟล์ที่บีบอัดแล้วลงไปแทนที่
        formData.set('avatar', finalFile)
        
      } catch (error) {
        console.error("Compression failed:", error)
      }
    } else {
        // ถ้าไม่ได้เปลี่ยนรูป (ไม่มี selectedFile) ให้ลบ field avatar ออก 
        // เพื่อไม่ให้ส่งไฟล์เปล่าไป Server
        formData.delete('avatar')
    }

    setIsCompressing(false)

    startTransition(() => {
      formAction(formData)
    })
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full">
        
        {/* Avatar Section */}
        <div className="flex justify-center mb-16">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-32 h-32 md:w-44 md:h-44 rounded-full overflow-hidden border-[1px] border-zinc-100 shadow-[0_10px_30px_rgba(0,0,0,0.08)] bg-zinc-50 relative z-10">
                  {displayImage ? (
                      <img 
                        src={`${displayImage}${!previewUrl && !displayImage.startsWith('blob:') ? `?v=${imageVersion}` : ''}`} 
                        alt="Profile" 
                        suppressHydrationWarning
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl text-zinc-200 font-serif">
                          {customer?.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                  )}
              </div>

              <div className="absolute bottom-2 right-2 z-20 bg-white text-zinc-400 p-3 rounded-full shadow-md border border-zinc-50 group-hover:bg-[#d4a373] group-hover:text-white group-hover:border-[#d4a373] transition-all duration-500">
                  <IconCamera />
              </div>

              <input 
                  type="file" 
                  name="avatar_hidden" // เปลี่ยนชื่อชั่วคราว ไม่ให้ FormData ดึงไปใช้ตรงๆ
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden" 
              />
          </div>
        </div>

        {/* Message Status */}
        {state?.success && <div className="mb-8 p-4 bg-zinc-50 text-[#d4a373] text-[10px] uppercase tracking-widest text-center font-bold border-y border-zinc-100 animate-fade-in">{state.message}</div>}
        {state?.error && <div className="mb-8 p-4 bg-red-50 text-red-500 text-[10px] uppercase tracking-widest text-center font-bold border-y border-red-100 animate-fade-in">{state.error}</div>}

        {/* Inputs */}
        <div className="space-y-12 px-2 md:px-4">
          <div className="relative group">
              <input type="text" name="fullName" defaultValue={customer?.full_name || ''} required className="block py-3 px-0 w-full text-base text-zinc-800 bg-transparent border-0 border-b border-zinc-200 appearance-none focus:outline-none focus:ring-0 focus:border-[#d4a373] peer transition-all duration-300 placeholder-transparent" placeholder="Full Name" />
              <label className="absolute text-[10px] uppercase tracking-[0.2em] text-zinc-400 duration-300 transform -translate-y-8 scale-100 top-3 -z-10 origin-[0] peer-focus:text-[#d4a373] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-100 peer-focus:-translate-y-8 font-bold">Full Name</label>
          </div>
          <div className="relative group">
              <input type="tel" name="phone" defaultValue={customer?.phone || ''} className="block py-3 px-0 w-full text-base text-zinc-800 bg-transparent border-0 border-b border-zinc-200 appearance-none focus:outline-none focus:ring-0 focus:border-[#d4a373] peer transition-all duration-300 placeholder-transparent" placeholder="Phone Number" />
              <label className="absolute text-[10px] uppercase tracking-[0.2em] text-zinc-400 duration-300 transform -translate-y-8 scale-100 top-3 -z-10 origin-[0] peer-focus:text-[#d4a373] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-100 peer-focus:-translate-y-8 font-bold">Phone Number</label>
          </div>
          <div className="relative group opacity-40">
              <input type="email" defaultValue={customer?.email || ''} disabled className="block py-3 px-0 w-full text-base text-zinc-400 bg-transparent border-0 border-b border-zinc-100 cursor-not-allowed" />
              <label className="absolute text-[10px] uppercase tracking-[0.2em] text-zinc-300 transform -translate-y-8 scale-100 top-3 -z-10 origin-[0] font-bold">Email Address</label>
          </div>
        </div>

        <SubmitButton isCompressing={isCompressing} />
      </form>

      {/* --- CROPPER MODAL --- */}
      {isCropperOpen && cropImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-xl overflow-hidden shadow-2xl animate-fade-in-up">
            
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center">
                <h3 className="font-serif text-lg text-[#1C1917]">Adjust Image</h3>
                <button onClick={() => setIsCropperOpen(false)} className="text-zinc-400 hover:text-black">✕</button>
            </div>

            <div className="relative w-full h-80 bg-zinc-900">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1} // ✅ บังคับสัดส่วน 1:1 (สี่เหลี่ยมจัตุรัส)
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="p-6 bg-white space-y-6">
               <div className="flex items-center gap-4">
                  <span className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Zoom</span>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#d4a373]"
                  />
               </div>

               <div className="flex gap-3">
                  <button 
                    onClick={() => setIsCropperOpen(false)}
                    className="flex-1 py-3 border border-zinc-200 text-zinc-600 text-xs font-bold uppercase tracking-widest hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCropConfirm}
                    className="flex-1 py-3 bg-[#1C1917] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#d4a373] transition-colors"
                  >
                    Confirm
                  </button>
               </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}