'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
}

export function useAuth() {
  // createClient() returns the module-level singleton, same reference every call
  const supabase = createClient()
  const [state, setState] = useState<AuthState>({ user: null, profile: null, loading: true })

  const fetchProfile = useCallback(async (userId: string) => {
    const attempt = async () => {
      const query = supabase.from('profiles').select('*').eq('id', userId).single()
      // 8-second safety timeout — prevents loading:true forever on cold Supabase starts
      const timeout = new Promise<{ data: null }>((resolve) =>
        setTimeout(() => resolve({ data: null }), 8000)
      )
      const { data } = await Promise.race([query, timeout]) as { data: Profile | null }
      return data
    }

    let data = await attempt()
    if (!data) {
      // Single retry after a brief pause to handle Supabase free-tier cold start
      await new Promise((r) => setTimeout(r, 1500))
      data = await attempt()
    }
    return data ?? null
  }, [supabase])

  useEffect(() => {
    // Safety timeout: if onAuthStateChange never fires within 10s, stop loading
    const fallback = setTimeout(() => {
      setState((prev) => prev.loading ? { user: null, profile: null, loading: false } : prev)
    }, 10000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      clearTimeout(fallback)
      const user = session?.user ?? null
      if (user) {
        // Mark alive in localStorage so new tabs and reloads don't get forced out.
        // Previously this used sessionStorage which cleared on new-tab open,
        // causing a forced signOut that also invalidated other tabs' sessions.
        if (typeof window !== 'undefined') localStorage.setItem('brimos_alive', '1')
        const profile = await fetchProfile(user.id)
        setState({ user, profile, loading: false })
      } else {
        setState({ user: null, profile: null, loading: false })
      }
    })

    return () => { subscription.unsubscribe(); clearTimeout(fallback) }
  }, [supabase, fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && typeof window !== 'undefined') {
      localStorage.setItem('brimos_alive', '1')
    }
    return { data, error }
  }, [supabase])

  const signOut = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('brimos_alive')
      sessionStorage.removeItem('brimos_session_id')
    }
    // Immediately clear local state so SessionGuard redirects at once — no network wait.
    setState({ user: null, profile: null, loading: false })
    // Invalidate the Supabase token in the background (don't block the UI).
    supabase.auth.signOut().catch(() => {})
  }, [supabase])

  return { ...state, signIn, signOut }
}
