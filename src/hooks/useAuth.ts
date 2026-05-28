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
  const supabase = createClient()
  const [state, setState] = useState<AuthState>({ user: null, profile: null, loading: true })

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    return data as Profile | null
  }, [supabase])

  useEffect(() => {
    // Auto-logout: if no alive flag in sessionStorage, this is a fresh browser session
    // sessionStorage is cleared when the browser/tab is closed (unlike localStorage)
    const alive = typeof window !== 'undefined' ? sessionStorage.getItem('brimos_alive') : null
    if (!alive) {
      supabase.auth.signOut().finally(() => {
        setState({ user: null, profile: null, loading: false })
      })
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null
      if (user) {
        const profile = await fetchProfile(user.id)
        setState({ user, profile, loading: false })
      } else {
        setState({ user: null, profile: null, loading: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && typeof window !== 'undefined') {
      sessionStorage.setItem('brimos_alive', '1')
    }
    return { data, error }
  }

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('brimos_alive')
      sessionStorage.removeItem('brimos_session_id')
    }
    await supabase.auth.signOut()
  }

  return { ...state, signIn, signOut }
}
