'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { DecisionNote, DecisionNoteWithRelations, InsertDN } from '@/types'
import type { User } from '@supabase/supabase-js'

/** Returns true if the current user is allowed to see a confidential DN */
function canViewConfidential(dn: DecisionNote, user: User | null, role: string | undefined): boolean {
  if (role === 'ADMIN') return true
  if (!user) return false
  return dn.rm_id === user.id || dn.adk_id === user.id || dn.boh_id === user.id || dn.manager_id === user.id
}

/** Threshold (Rp) above which a DN must also be decided by BOH after the Manager. */
export const BOH_THRESHOLD = 1_000_000_000

/**
 * Apakah DN wajib melewati Pemutus 2 (BOH) setelah Pemutus 1 (Manager/CBM)?
 * Sesuai flowchart: plafond di atas Rp1 miliar ATAU status SLIK MERAH.
 */
export function requiresBOH(dn: { credit_amount?: number | null; slik_status?: string | null }): boolean {
  return (dn.credit_amount ?? 0) > BOH_THRESHOLD || dn.slik_status === 'MERAH'
}

// ─── Role cache backed by sessionStorage with 5-minute TTL ─────────────────
const ROLE_CACHE_KEY = 'brimos_role_cache'
const ROLE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

type RoleCacheEntry = { userId: string; role: string | undefined; expiresAt: number }

function readRoleCache(userId: string): string | undefined | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(ROLE_CACHE_KEY)
    if (!raw) return null
    const entry: RoleCacheEntry = JSON.parse(raw)
    if (entry.userId !== userId || Date.now() > entry.expiresAt) return null
    return entry.role
  } catch { return null }
}

function writeRoleCache(userId: string, role: string | undefined): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({
      userId, role, expiresAt: Date.now() + ROLE_CACHE_TTL,
    } satisfies RoleCacheEntry))
  } catch {}
}

function clearRoleCache(): void {
  if (typeof window === 'undefined') return
  try { sessionStorage.removeItem(ROLE_CACHE_KEY) } catch {}
}

async function resolveAuth(
  supabase: ReturnType<typeof createClient>
): Promise<{ user: User | null; role: string | undefined }> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) {
    clearRoleCache()
    return { user: null, role: undefined }
  }

  const cached = readRoleCache(user.id)
  if (cached !== null) return { user, role: cached }

  const metaRole = (user.user_metadata?.role || user.app_metadata?.role) as string | undefined
  if (metaRole) {
    writeRoleCache(user.id, metaRole)
    return { user, role: metaRole }
  }

  const profilePromise = supabase.from('profiles').select('role').eq('id', user.id).single()
  const timeoutPromise = new Promise<{ data: null }>((resolve) =>
    setTimeout(() => resolve({ data: null }), 5000)
  )
  const { data: p } = await Promise.race([profilePromise, timeoutPromise]) as { data: { role: string } | null }
  const role = (p as { role: string } | null)?.role
  writeRoleCache(user.id, role)
  return { user, role }
}

const FETCH_TIMEOUT_MS = 15000

export function useDN(id?: string) {
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()
  const [dn, setDN] = useState<DecisionNoteWithRelations | null>(null)
  const [list, setList] = useState<DecisionNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Generation counter — only the latest in-flight request may update loading state.
  // Replaces AbortController race that could leave loading=true forever.
  const reqGen = useRef(0)

  const fetchList = useCallback(async () => {
    const gen = ++reqGen.current
    setLoading(true)
    setError(null)
    try {
      const work = async () => {
        const { user: u, role } = await resolveAuth(supabase)
        if (gen !== reqGen.current) return
        const { data, error: qErr } = await supabase
          .from('decision_notes')
          .select('*')
          .order('created_at', { ascending: false })
        if (gen !== reqGen.current) return
        if (qErr) {
          setError(qErr.message)
        } else {
          const visible = (data ?? []).filter((d) =>
            d.confidentiality !== 'RAHASIA' || canViewConfidential(d, u, role)
          )
          setList(visible)
        }
      }
      const timeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), FETCH_TIMEOUT_MS)
      )
      await Promise.race([work(), timeout])
    } catch (e) {
      if (gen !== reqGen.current) return
      if (e instanceof Error && e.message === 'TIMEOUT') {
        setError('Permintaan terlalu lama. Silakan coba lagi.')
      } else {
        setError(e instanceof Error ? e.message : 'Fetch error')
      }
    } finally {
      if (gen === reqGen.current) setLoading(false)
    }
  }, [supabase])

  const fetchOne = useCallback(async (dnId: string) => {
    const gen = ++reqGen.current
    setLoading(true)
    setError(null)
    try {
      const work = async () => {
        const { user: u, role } = await resolveAuth(supabase)
        if (gen !== reqGen.current) return
        const { data, error: qErr } = await supabase
          .from('decision_notes')
          .select(`
            *,
            rm:rm_id(id, full_name, email),
            adk:adk_id(id, full_name, email),
            boh:boh_id(id, full_name, email),
            manager:manager_id(id, full_name, email),
            conditions:dn_conditions(*),
            evidences:dn_evidences(*),
            followup_actions(*)
          `)
          .eq('id', dnId)
          .single()
        if (gen !== reqGen.current) return
        if (qErr) {
          setError(qErr.message)
        } else if (data) {
          const d = data as unknown as DecisionNoteWithRelations
          if (d.confidentiality === 'RAHASIA' && !canViewConfidential(d as unknown as DecisionNote, u, role)) {
            setError('Anda tidak memiliki akses ke DN rahasia ini.')
            setDN(null)
          } else {
            setDN(d)
            setError(null)
          }
        }
      }
      const timeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), FETCH_TIMEOUT_MS)
      )
      await Promise.race([work(), timeout])
    } catch (e) {
      if (gen !== reqGen.current) return
      if (e instanceof Error && e.message === 'TIMEOUT') {
        setError('Permintaan terlalu lama. Silakan coba lagi.')
      } else {
        setError(e instanceof Error ? e.message : 'Fetch error')
      }
    } finally {
      if (gen === reqGen.current) setLoading(false)
    }
  }, [supabase])

  const createDN = async (values: InsertDN) => {
    const { data, error } = await supabase
      .from('decision_notes')
      .insert(values)
      .select()
      .single()
    return { data, error }
  }

  const updateDN = async (dnId: string, values: Partial<InsertDN>) => {
    const { data, error } = await supabase
      .from('decision_notes')
      .update(values)
      .eq('id', dnId)
      .select()
      .single()
    return { data, error }
  }

  const submitDN = async (dnId: string) => {
    const result = await updateDN(dnId, { status: 'SUBMITTED', submitted_at: new Date().toISOString() })
    if (!result.error) notifyDNEvent(dnId, 'SUBMITTED')
    return result
  }

  const decideBOH = async (dnId: string, confidentiality: 'UMUM' | 'RAHASIA', bohId: string, bohNotes?: string) => {
    const result = await updateDN(dnId, {
      status: 'DECIDED_BOH',
      decided_boh_at: new Date().toISOString(),
      boh_id: bohId,
      confidentiality,
      boh_notes: bohNotes?.trim() || null,
    })
    if (!result.error) notifyDNEvent(dnId, 'DECIDED_BOH')
    return result
  }

  const decideManager = async (dnId: string, confidentiality: 'UMUM' | 'RAHASIA', managerId: string, managerNotes?: string) => {
    const result = await updateDN(dnId, {
      status: 'DECIDED_MANAGER',
      decided_manager_at: new Date().toISOString(),
      manager_id: managerId,
      confidentiality,
      manager_notes: managerNotes?.trim() || null,
    })
    if (!result.error) notifyDNEvent(dnId, 'DECIDED_MANAGER')
    return result
  }

  const verifyADK = async (dnId: string, adkId: string, adkNotes?: string) => {
    const result = await updateDN(dnId, {
      status: 'VERIFIED_ADK',
      verified_adk_at: new Date().toISOString(),
      adk_id: adkId,
      adk_notes: adkNotes?.trim() || null,
    })
    if (!result.error) notifyDNEvent(dnId, 'VERIFIED_ADK')
    return result
  }

  const rejectDN = async (dnId: string, reason: string, rejectedBy: { boh_id?: string; adk_id?: string; manager_id?: string }) => {
    const result = await updateDN(dnId, {
      status: 'REJECTED',
      reject_reason: reason || null,
      rejected_at: new Date().toISOString(),
      ...rejectedBy,
    })
    if (!result.error) notifyDNEvent(dnId, 'REJECTED', reason)
    return result
  }

  const requestRevision = async (
    dnId: string,
    notes: string,
    requestedBy: string,
    currentStatus: 'SUBMITTED' | 'DECIDED_MANAGER' | 'DECIDED_BOH'
  ) => {
    const result = await updateDN(dnId, {
      status: 'NEEDS_REVISION',
      revision_requested_by: requestedBy,
      revision_requested_at: new Date().toISOString(),
      revision_notes: notes || null,
      revision_from_status: currentStatus,
    })
    if (!result.error) notifyDNEvent(dnId, 'NEEDS_REVISION', notes)
    return result
  }

  const resubmitDN = async (dnId: string, returnToStatus: 'SUBMITTED' | 'DECIDED_MANAGER' | 'DECIDED_BOH') => {
    const result = await updateDN(dnId, {
      status: returnToStatus,
      revision_requested_by: null,
      revision_requested_at: null,
      revision_notes: null,
      revision_from_status: null,
    })
    if (!result.error) notifyDNEvent(dnId, 'RESUBMITTED')
    return result
  }

  const completeDN = async (dnId: string) => {
    const result = await updateDN(dnId, { status: 'COMPLETED', completed_at: new Date().toISOString() })
    if (!result.error) notifyDNEvent(dnId, 'COMPLETED')
    return result
  }

  // Wait for auth before fetching — prevents fetch during session init that can race/hang.
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      setList([])
      setDN(null)
      return
    }
    if (id) fetchOne(id)
    else fetchList()
  }, [id, fetchOne, fetchList, authLoading, user?.id])

  // Realtime subscription for single-DN detail view
  useEffect(() => {
    if (!id || !user) return

    const channel = supabase
      .channel(`dn-detail-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'brimos',
        table: 'decision_notes',
        filter: `id=eq.${id}`,
      }, () => { fetchOne(id) })
      .on('postgres_changes', {
        event: '*',
        schema: 'brimos',
        table: 'dn_conditions',
        filter: `dn_id=eq.${id}`,
      }, () => { fetchOne(id) })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, supabase, fetchOne, user?.id])

  return {
    dn, list, loading, error,
    fetchList, fetchOne,
    createDN, updateDN,
    submitDN, decideManager, decideBOH, verifyADK, rejectDN, requestRevision, resubmitDN, completeDN,
  }
}

/** Fire-and-forget notification dispatch */
function notifyDNEvent(dnId: string, event: string, notes?: string): void {
  fetch('/api/notify/dn-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dnId, event, notes }),
  }).catch((e) => console.error('[notifyDNEvent]', e))
}
