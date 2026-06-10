'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

/** Auto-logout after this many milliseconds of inactivity */
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000 // 15 minutes
const LAST_ACTIVITY_KEY   = 'brimos_last_activity'

/**
 * SessionGuard — wraps all authenticated pages.
 * - Redirects to login when user is null (logout, browser-close, token expiry)
 * - Auto-logouts after 15 minutes of inactivity
 * - Registers this tab's session via Realtime Presence
 * - Listens for 'kick' broadcast from a new login on another device
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [kicked, setKicked] = useState(false)

  // ── Redirect to login when not authenticated ────────────────────────────
  useEffect(() => {
    if (!loading && !user && !kicked) {
      router.replace('/auth/login')
    }
  }, [user, loading, kicked, router])

  // ── Inactivity auto-logout (15 min) ─────────────────────────────────────
  const inactivityTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user) return

    const updateActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
    }

    // Record activity on any meaningful user interaction
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }))
    updateActivity() // initialise on mount

    // Check every 30 s whether the user has been idle > 15 min
    inactivityTimer.current = setInterval(() => {
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) ?? Date.now())
      if (Date.now() - last > INACTIVITY_LIMIT_MS) {
        clearInterval(inactivityTimer.current!)
        signOut()
        router.replace('/auth/login?reason=inactive')
      }
    }, 30_000)

    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity))
      if (inactivityTimer.current) clearInterval(inactivityTimer.current)
    }
  }, [user, signOut, router])

  // ── Kick via Realtime broadcast ──────────────────────────────────────────
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

  // While redirecting (user gone, not kicked), render nothing to avoid flash
  if (!loading && !user) return null

  return <>{children}</>
}
