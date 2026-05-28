import Link from 'next/link'
import { Home, AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#003087] flex items-center justify-center p-6">
      <div className="text-center text-white max-w-sm">

        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-[rgba(240,180,41,0.15)] border-2 border-[rgba(240,180,41,0.4)] flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-8 h-8 text-[#f0b429]" />
        </div>

        {/* 404 */}
        <div className="text-[80px] font-extrabold text-[#f0b429] leading-none mb-3">
          404
        </div>

        {/* Brand */}
        <div className="text-[22px] font-extrabold tracking-[2px] mb-1">
          BRI<span className="text-[#f0b429]">MOS</span>
        </div>

        {/* Message */}
        <h1 className="text-sm font-bold mb-1">Halaman Tidak Ditemukan</h1>
        <p className="text-[11px] text-white/60 leading-relaxed mb-6">
          Halaman yang Anda cari tidak tersedia atau<br />telah dipindahkan.
        </p>

        {/* Back button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-[#f0b429] text-[#003087] font-bold text-xs px-5 py-2.5 rounded-lg hover:bg-[#e0a820] transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          Kembali ke Dashboard
        </Link>

        <p className="mt-6 text-[9px] text-white/30">
          BRI Monitoring &amp; Oversight System — PT Bank BRI (Persero) Tbk
        </p>
      </div>
    </div>
  )
}
