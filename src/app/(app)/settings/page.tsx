'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Lock, Bell, Shield, Eye, EyeOff } from 'lucide-react'

const ROLE_LABEL: Record<string, string> = {
  AO: 'Account Officer',
  DK: 'Divisi Kepatuhan',
  BOH: 'Back Office Head',
  ADMIN: 'Administrator',
}

export default function SettingsPage() {
  const { profile, user } = useAuth()
  const supabase = createClient()

  const [currentPwd, setCurrentPwd]   = useState('')
  const [newPwd, setNewPwd]           = useState('')
  const [confirmPwd, setConfirmPwd]   = useState('')
  const [showNewPwd, setShowNewPwd]       = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [pwdLoading, setPwdLoading]   = useState(false)
  const [pwdMsg, setPwdMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'error', text: 'Password baru tidak cocok.' })
      return
    }
    if (newPwd.length < 8) {
      setPwdMsg({ type: 'error', text: 'Password minimal 8 karakter.' })
      return
    }
    setPwdLoading(true)
    setPwdMsg(null)
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    if (error) {
      setPwdMsg({ type: 'error', text: error.message })
    } else {
      setPwdMsg({ type: 'success', text: 'Password berhasil diubah.' })
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    }
    setPwdLoading(false)
  }

  const inputCls = 'w-full rounded-md border border-[#e8ecf4] px-3 py-2 text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/10 transition-colors'

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-[15px] font-bold text-[#002470]">Pengaturan Akun</h1>
        <p className="text-[10px] text-[#9ca3af] mt-0.5">Kelola informasi profil dan keamanan akun Anda</p>
      </div>

      {/* Profile info */}
      <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
        <div className="flex items-center gap-2.5 bg-[#003087] px-4 py-3">
          <User className="w-3.5 h-3.5 text-white/70" />
          <span className="text-[10px] font-bold text-white">Informasi Profil</span>
        </div>
        <div className="p-4 grid grid-cols-2 gap-y-3 text-[11px]">
          {[
            ['Nama Lengkap',  profile?.full_name ?? '—'],
            ['Email',         user?.email ?? '—'],
            ['Role',          ROLE_LABEL[profile?.role ?? ''] ?? profile?.role ?? '—'],
            ['Kode Cabang',   profile?.branch_code ?? '—'],
            ['NIP',           profile?.nip ?? '—'],
            ['No. HP',        profile?.phone ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="contents">
              <span className="text-[#9ca3af]">{label}</span>
              <span className="font-medium text-[#002470]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
        <div className="flex items-center gap-2.5 bg-[#003087] px-4 py-3">
          <Lock className="w-3.5 h-3.5 text-white/70" />
          <span className="text-[10px] font-bold text-white">Ubah Password</span>
        </div>
        <form onSubmit={handleChangePassword} className="p-4 space-y-3">
          <div>
            <label className="block text-[10px] font-medium text-[#002470] mb-1">Password Baru</label>
            <div className="relative">
              <input type={showNewPwd ? 'text' : 'password'} value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                className={inputCls + ' pr-10'} placeholder="Minimal 8 karakter" required />
              <button type="button" onClick={() => setShowNewPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[#002470] mb-1">Konfirmasi Password Baru</label>
            <div className="relative">
              <input type={showConfirmPwd ? 'text' : 'password'} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                className={inputCls + ' pr-10'} placeholder="Ulangi password baru" required />
              <button type="button" onClick={() => setShowConfirmPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {pwdMsg && (
            <p className={`text-[10px] font-medium ${pwdMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {pwdMsg.text}
            </p>
          )}

          <button type="submit" disabled={pwdLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#003087] hover:bg-[#002470] text-white text-[11px] font-semibold transition-colors disabled:opacity-60">
            {pwdLoading ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </form>
      </div>

      {/* Role & permissions info */}
      <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
        <div className="flex items-center gap-2.5 bg-[#003087] px-4 py-3">
          <Shield className="w-3.5 h-3.5 text-white/70" />
          <span className="text-[10px] font-bold text-white">Hak Akses</span>
        </div>
        <div className="p-4 space-y-2 text-[11px] text-[#002470]">
          {profile?.role === 'AO' && (
            <ul className="space-y-1 list-disc list-inside text-[#718096]">
              <li>Membuat dan mengelola Decision Notes</li>
              <li>Upload bukti / dokumen ke DN</li>
              <li>Memantau progress kondisi DN</li>
            </ul>
          )}
          {profile?.role === 'DK' && (
            <ul className="space-y-1 list-disc list-inside text-[#718096]">
              <li>Verifikasi DN yang diajukan AO</li>
              <li>Melihat antrean verifikasi</li>
              <li>Memantau seluruh DN di cabang</li>
            </ul>
          )}
          {(profile?.role === 'BOH' || profile?.role === 'ADMIN') && (
            <ul className="space-y-1 list-disc list-inside text-[#718096]">
              <li>Verifikasi final DN yang telah disetujui DK</li>
              <li>Menetapkan target KPI</li>
              <li>Akses penuh ke seluruh laporan dan monitoring</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
