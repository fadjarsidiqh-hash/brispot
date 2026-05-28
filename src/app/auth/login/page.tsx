'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, Lock, Smartphone, ArrowRight, Eye, EyeOff, Loader2, Building2, AlertTriangle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [wasKicked, setWasKicked] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWasKicked(new URLSearchParams(window.location.search).get('reason') === 'kicked')
    }
  }, [])
  const { signIn, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kickModal, setKickModal] = useState<{
    userId: string
    sessionId: string
    otherCount: number
  } | null>(null)
  const [kickLoading, setKickLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data, error } = await signIn(email, password)
    if (error || !data?.user) {
      setError('Username/NIP atau password salah.')
      setLoading(false)
      return
    }

    // Generate session ID and detect other active sessions via Realtime Presence
    const sessionId = crypto.randomUUID()
    sessionStorage.setItem('brimos_session_id', sessionId)

    const supabase = createClient()
    const channel = supabase.channel(`brimos:session:${data.user.id}`)
    let otherCount = 0

    await new Promise<void>((resolve) => {
      let resolved = false
      const done = () => { if (!resolved) { resolved = true; resolve() } }
      const timer = setTimeout(done, 2000)

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ sessionId: string }>()
        otherCount = Object.values(state)
          .flat()
          .filter((p) => p.sessionId !== sessionId).length
        clearTimeout(timer)
        done()
      })

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ sessionId })
        }
      })
    })

    channel.unsubscribe()

    if (otherCount > 0) {
      setKickModal({ userId: data.user.id, sessionId, otherCount })
      setLoading(false)
    } else {
      router.replace('/dashboard')
    }
  }

  const handleKick = async () => {
    if (!kickModal) return
    setKickLoading(true)
    const supabase = createClient()
    const channel = supabase.channel(`brimos:session:${kickModal.userId}`)

    await new Promise<void>((resolve) => {
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Kick all sessions except this new one
          await channel.send({
            type: 'broadcast',
            event: 'kick',
            payload: { kickAll: true, except: kickModal.sessionId },
          })
          resolve()
        }
      })
    })

    setTimeout(() => channel.unsubscribe(), 500)
    router.replace('/dashboard')
  }

  const handleCancelKick = async () => {
    setKickModal(null)
    await signOut()
  }

  return (
    <div className="min-h-screen bg-[#003087] flex items-center justify-center p-6">
      {/* Kick modal overlay */}
      {kickModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-[300px] w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-[#003087]">Akun Sedang Aktif</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Sesi lain terdeteksi</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed mb-5">
              Akun Anda aktif di <span className="font-bold text-[#003087]">{kickModal.otherCount}</span> perangkat lain.
              Paksa keluar dari semua perangkat tersebut?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCancelKick}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-[10px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleKick}
                disabled={kickLoading}
                className="flex-1 bg-[#003087] text-white rounded-lg py-2 text-[10px] font-bold hover:bg-[#002470] disabled:opacity-60 transition-colors flex items-center justify-center gap-1"
              >
                {kickLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Paksa Keluar'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-12 items-center max-w-[760px] w-full">

        {/* ── Left brand panel ── */}
        <div className="flex-1 text-white hidden md:block">
          <div className="text-[32px] font-extrabold tracking-[2px] mb-1">
            BRI<span className="text-[#f0b429]">MOS</span>
          </div>
          <div className="text-xs text-white/65 font-medium mb-1.5">
            BRI Monitoring &amp; Oversight System
          </div>
          <div className="w-10 h-[3px] bg-[#f0b429] rounded mb-5" />
          <p className="text-[11px] text-white/60 leading-[1.9] max-w-[300px]">
            Platform monitoring Decision Notes terintegrasi untuk seluruh jenjang operasional Bank BRI — dari Kantor Kas hingga Kantor Pusat.
          </p>
          <div className="flex flex-col gap-3 mt-7">
            {[
              { icon: ShieldCheck, text: 'Sistem resmi PT Bank BRI (Persero) Tbk' },
              { icon: Lock,        text: 'Data terenkripsi & aman (Supabase RLS)' },
              { icon: Smartphone,  text: 'Dapat diakses via mobile (PWA)' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-[30px] h-[30px] rounded-full bg-[rgba(240,180,41,0.15)] border border-[rgba(240,180,41,0.3)] flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-[#f0b429]" />
                </div>
                <span className="text-[10px] text-white/70">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right login card ── */}
        <div className="flex-1 max-w-[290px] w-full mx-auto">
          <div className="bg-white rounded-2xl p-7 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <h2 className="text-sm font-extrabold text-[#003087] mb-1">Selamat Datang</h2>
            <p className="text-[10px] text-gray-400 mb-5">Masuk ke akun BRIMOS Anda</p>

          {wasKicked && (
            <div className="flex items-center gap-2 mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2.5 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <p className="text-[10px] font-medium">Sesi Anda diakhiri dari perangkat lain.</p>
            </div>
          )}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">
                  Username / NIP
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="nama@bri.co.id atau NIP"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[11px] text-[#003087] bg-[#fafbfc] focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/10 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-[11px] text-[#003087] bg-[#fafbfc] focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/10 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-right mt-1">
                  <span className="text-[9px] text-[#003087] font-semibold cursor-pointer hover:underline">
                    Lupa Password?
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-[10px] text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#003087] text-white rounded-[9px] py-3 text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#002470] disabled:opacity-60 transition-colors"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><span>Masuk / Sign In</span><ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </form>

            <div className="flex items-center gap-2 my-3.5">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[9px] text-gray-400">atau</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <button className="w-full bg-[#f0f4f8] border border-gray-200 rounded-lg py-2.5 text-[10px] text-gray-600 font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
              <Building2 className="w-3.5 h-3.5 text-[#003087]" /> SSO BRI Internal
            </button>

            <p className="text-[9px] text-gray-400 text-center mt-4">
              Butuh bantuan? Hubungi IT Helpdesk BRI
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

