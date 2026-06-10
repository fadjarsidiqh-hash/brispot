'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
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

// Cache role lookup so we only hit the profiles table once per session.
let _cachedRole: { userId: string; role: string | undefined } | null = null

/**
 * Resolve current user + role using the LOCAL cached session (synchronous,
 * no network call) — avoids hangs on rapid back/forth navigation.
 * Role is fetched once per user and cached at module level.
 */
async function resolveAuth(
  supabase: ReturnType<typeof createClient>
): Promise<{ user: User | null; role: string | undefined }> {
  // getSession() reads from in-memory/localStorage — no network round-trip.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  if (!user) {
    _cachedRole = null
    return { user: null, role: undefined }
  }
  if (_cachedRole && _cachedRole.userId === user.id) {
    return { user, role: _cachedRole.role }
  }
  // Try reading role from JWT metadata first — zero latency, no network call.
  const metaRole = (user.user_metadata?.role || user.app_metadata?.role) as string | undefined
  if (metaRole) {
    _cachedRole = { userId: user.id, role: metaRole }
    return { user, role: metaRole }
  }
  // Fallback: query profiles table with a 5-second safety timeout so the hook
  // never hangs indefinitely (e.g. on Supabase free-tier cold start).
  const profilePromise = supabase.from('profiles').select('role').eq('id', user.id).single()
  const timeoutPromise = new Promise<{ data: null }>((resolve) =>
    setTimeout(() => resolve({ data: null }), 5000)
  )
  const { data: p } = await Promise.race([profilePromise, timeoutPromise]) as { data: { role: string } | null }
  const role = (p as { role: string } | null)?.role
  _cachedRole = { userId: user.id, role }
  return { user, role }
}

export function useDN(id?: string) {
  const supabase = createClient()
  const [dn, setDN] = useState<DecisionNoteWithRelations | null>(null)
  const [list, setList] = useState<DecisionNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Holds the AbortController for the in-flight request so we can cancel
  // the previous one whenever a new fetch starts (or component unmounts).
  const activeController = useRef<AbortController | null>(null)

  // Cancel any in-flight request on unmount so it never blocks future fetches.
  useEffect(() => {
    return () => {
      activeController.current?.abort()
      activeController.current = null
    }
  }, [])

  // Create a fresh AbortController, cancelling any previous one.
  // 12s safety timeout — if Supabase hangs, we bail out instead of stuck loading.
  const newController = (): AbortController => {
    activeController.current?.abort()
    const c = new AbortController()
    activeController.current = c
    setTimeout(() => { if (!c.signal.aborted) c.abort() }, 12000)
    return c
  }

  const fetchList = useCallback(async () => {
    const ctrl = newController()
    setLoading(true)
    setError(null)
    try {
      const { user, role } = await resolveAuth(supabase)
      if (ctrl.signal.aborted) return
      const { data, error } = await supabase
        .from('decision_notes')
        .select('*')
        .order('created_at', { ascending: false })
        .abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      if (error) {
        setError(error.message)
      } else {
        const visible = (data ?? []).filter((d) =>
          d.confidentiality !== 'RAHASIA' || canViewConfidential(d, user, role)
        )
        setList(visible)
      }
    } catch (e) {
      if (ctrl.signal.aborted) {
        // Aborted by newer fetch or by timeout — silently drop.
        // If timeout, surface a friendly error so user can retry.
        if (!activeController.current || activeController.current === ctrl) {
          setError('Permintaan terlalu lama. Silakan coba lagi.')
        }
      } else {
        setError(e instanceof Error ? e.message : 'Fetch error')
      }
    } finally {
      // ALWAYS clear loading — only skip if this request was superseded by a newer one.
      if (activeController.current === ctrl || activeController.current === null) {
        setLoading(false)
      }
    }
  }, [supabase])

  const fetchOne = useCallback(async (dnId: string) => {
    const ctrl = newController()
    setLoading(true)
    setError(null)
    try {
      const { user, role } = await resolveAuth(supabase)
      if (ctrl.signal.aborted) return
      const { data, error } = await supabase
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
        .abortSignal(ctrl.signal)
        .single()
      if (ctrl.signal.aborted) return
      if (error) {
        setError(error.message)
      } else if (data) {
        const d = data as unknown as DecisionNoteWithRelations
        if (d.confidentiality === 'RAHASIA' && !canViewConfidential(d as unknown as DecisionNote, user, role)) {
          setError('Anda tidak memiliki akses ke DN rahasia ini.')
          setDN(null)
        } else {
          setDN(d)
          setError(null)
        }
      }
    } catch (e) {
      if (ctrl.signal.aborted) {
        if (!activeController.current || activeController.current === ctrl) {
          setError('Permintaan terlalu lama. Silakan coba lagi.')
        }
      } else {
        setError(e instanceof Error ? e.message : 'Fetch error')
      }
    } finally {
      if (activeController.current === ctrl || activeController.current === null) {
        setLoading(false)
      }
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

  // ─── Single trigger effect ──────────────────────────────────────────────────
  // Because id/fetchOne/fetchList never change, this fires exactly ONCE per mount.
  useEffect(() => {
    if (id) fetchOne(id)
    else fetchList()
  }, [id, fetchOne, fetchList])

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
