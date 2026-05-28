'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

/**
 * SessionGuard — wraps all authenticated pages.
 * - Registers this tab's session via Realtime Presence
 * - Listens for 'kick' broadcast from a new login on another device
 * - Shows a fullscreen overlay and redirects to login when kicked
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  const [kicked, setKicked] = useState(false)

  useEffect(() => {
    if (!user) return

    const sessionId = sessionStorage.getItem('brimos_session_id')
    if (!sessionId) return

    const supabase = createClient()
    const channel = supabase.channel(`brimos:session:${user.id}`)

    channel
      .on('broadcast', { event: 'kick' }, ({ payload }) => {
        const isTargeted = payload?.target === sessionId
        const isKickAll  = payload?.kickAll === true && payload?.except !== sessionId
        if (isTargeted || isKickAll) {
          setKicked(true)
          sessionStorage.removeItem('brimos_alive')
          sessionStorage.removeItem('brimos_session_id')
          supabase.auth.signOut().finally(() => {
            setTimeout(() => router.replace('/auth/login?reason=kicked'), 1800)
          })
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ sessionId })
        }
      })

    return () => { channel.unsubscribe() }
  }, [user, router])

  if (kicked) {
    return (
      <div className="fixed inset-0 z-[999] bg-[#002470] flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-14 h-14 rounded-full bg-[#f0b429]/20 border-2 border-[#f0b429] flex items-center justify-center mb-2">
          <svg className="w-7 h-7 text-[#f0b429]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-base font-bold">Sesi Anda Diakhiri</p>
        <p className="text-[11px] text-white/60 text-center max-w-xs">
          Akun Anda masuk dari perangkat lain.<br />Anda akan diarahkan ke halaman login.
        </p>
        <div className="mt-2 w-32 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-[#f0b429] animate-[progress_1.8s_linear_forwards]" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
