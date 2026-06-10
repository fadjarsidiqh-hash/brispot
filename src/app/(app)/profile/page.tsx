'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { User, Lock, Eye, EyeOff, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'

const ROLE_LABEL: Record<string, string> = {
  RM: 'Relationship Manager',
  ADK: 'Administrasi Kredit',
  BOH: 'Branch Operational Head',
  MANAGER: 'CBM / Manager',
  ADMIN: 'Administrator',
}

// Strength checks
const checks = [
  { id: 'len', label: 'Minimal 8 karakter', test: (p: string) => p.length >= 8 },
  { id: 'lower', label: 'Mengandung huruf kecil (a-z)', test: (p: string) => /[a-z]/.test(p) },
  { id: 'upper', label: 'Mengandung huruf besar (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'num', label: 'Mengandung angka (0-9)', test: (p: string) => /[0-9]/.test(p) },
  { id: 'sym', label: 'Mengandung simbol (!@#$...)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export default function ProfilePage() {
  const { profile } = useAuth()
  const supabase = createClient()

  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const passed = checks.filter((c) => c.test(newPw)).length
  const allPassed = passed === checks.length
  const matches = newPw.length > 0 && newPw === confirmPw
  const canSubmit = oldPw.length > 0 && allPassed && matches && !saving

  const initials = (profile?.full_name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !profile?.email) return
    setSaving(true)
    setMsg(null)
    try {
      // 1. Verify the current password by re-authenticating
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: oldPw,
      })
      if (verifyErr) {
        setMsg({ type: 'error', text: 'Password lama salah. Silakan periksa kembali.' })
        setSaving(false)
        return
      }

      // 2. Update to the new password
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw })
      if (updateErr) {
        setMsg({ type: 'error', text: 'Gagal memperbarui password: ' + updateErr.message })
        setSaving(false)
        return
      }

      setMsg({ type: 'success', text: 'Password berhasil diperbarui.' })
      setOldPw('')
      setNewPw('')
      setConfirmPw('')
    } catch {
      setMsg({ type: 'error', text: 'Terjadi kesalahan. Silakan coba lagi.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-[18px] font-bold text-[#002470]">Profil Saya</h1>
        <p className="text-[11px] text-[#718096] mt-0.5">Informasi akun dan keamanan password</p>
      </div>

      {/* Identity card */}
      <div className="bg-white rounded-2xl border border-[#e8ecf4] p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#002470] text-white flex items-center justify-center text-[16px] font-bold shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-[#002470] truncate">{profile?.full_name ?? '—'}</p>
          <p className="text-[11px] text-[#718096]">
            {ROLE_LABEL[profile?.role ?? ''] ?? profile?.role} · NIP {profile?.nip ?? '—'}
          </p>
          <p className="text-[11px] text-[#718096]">{profile?.branch_name ?? profile?.branch_code ?? ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Email" value={profile?.email ?? '—'} />
        <InfoRow icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Peran" value={ROLE_LABEL[profile?.role ?? ''] ?? profile?.role ?? '—'} />
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-[#e8ecf4] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#e8ecf4] flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#002470]" />
          <h2 className="text-[13px] font-bold text-[#002470]">Ganti Password</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {msg && (
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium ${
                msg.type === 'success'
                  ? 'bg-[#ecfdf3] text-[#16a34a] border border-[#abefc6]'
                  : 'bg-[#fef3f2] text-[#CC0000] border border-[#fecdca]'
              }`}
            >
              {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              {msg.text}
            </div>
          )}
          {/* Old password */}
          <Field label="Password Lama">
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                placeholder="Masukkan password saat ini"
                className="w-full px-3 py-2 pr-9 rounded-lg border border-[#e8ecf4] text-[12px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#002470] focus:ring-2 focus:ring-[#002470]/10"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowOld((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a0aec0] hover:text-[#002470]">
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          {/* New password */}
          <Field label="Password Baru">
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Masukkan password baru"
                className="w-full px-3 py-2 pr-9 rounded-lg border border-[#e8ecf4] text-[12px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#002470] focus:ring-2 focus:ring-[#002470]/10"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a0aec0] hover:text-[#002470]">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          {/* Strength keterangan */}
          <div className="bg-[#f7f9fc] rounded-lg border border-[#e8ecf4] p-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-[#718096] uppercase tracking-wide">Syarat Password</p>
            {checks.map((c) => {
              const ok = c.test(newPw)
              return (
                <div key={c.id} className="flex items-center gap-2">
                  {ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a] shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-[#cbd5e0] shrink-0" />
                  )}
                  <span className={`text-[11px] ${ok ? 'text-[#16a34a]' : 'text-[#718096]'}`}>{c.label}</span>
                </div>
              )
            })}
          </div>

          {/* Confirm */}
          <Field label="Konfirmasi Password Baru">
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Ketik ulang password baru"
              className="w-full px-3 py-2 rounded-lg border border-[#e8ecf4] text-[12px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#002470] focus:ring-2 focus:ring-[#002470]/10"
              autoComplete="new-password"
            />
            {confirmPw.length > 0 && !matches && (
              <p className="text-[10px] text-[#CC0000] mt-1">Konfirmasi password tidak cocok.</p>
            )}
          </Field>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold text-white bg-[#002470] rounded-lg hover:bg-[#001a52] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Lock className="w-3.5 h-3.5" /> {saving ? 'Menyimpan...' : 'Perbarui Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#002470] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#e8ecf4] px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-[#eef2fb] text-[#002470] flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-[#718096]">{label}</p>
        <p className="text-[12px] font-semibold text-[#002470] truncate">{value}</p>
      </div>
    </div>
  )
}
