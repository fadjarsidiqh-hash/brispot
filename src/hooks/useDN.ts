'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DecisionNote, DecisionNoteWithRelations, InsertDN } from '@/types'

export function useDN(id?: string) {
  const supabase = createClient()
  const [dn, setDN] = useState<DecisionNoteWithRelations | null>(null)
  const [list, setList] = useState<DecisionNote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('decision_notes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setList(data ?? [])
    setLoading(false)
  }, [supabase])

  const fetchOne = useCallback(async (dnId: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('decision_notes')
      .select(`
        *,
        ao:ao_id(id, full_name, email),
        dk:dk_id(id, full_name, email),
        boh:boh_id(id, full_name, email),
        conditions:dn_conditions(*),
        evidences:dn_evidences(*),
        followup_actions(*)
      `)
      .eq('id', dnId)
      .single()
    if (error) setError(error.message)
    else setDN(data as DecisionNoteWithRelations)
    setLoading(false)
  }, [supabase])

  const createDN = async (values: InsertDN) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('decision_notes')
      .insert(values)
      .select()
      .single()
    return { data, error }
  }

  const updateDN = async (dnId: string, values: Partial<InsertDN>) => {
    const { data, error } = await (supabase as any)
      .from('decision_notes')
      .update(values)
      .eq('id', dnId)
      .select()
      .single()
    return { data, error }
  }

  const submitDN = async (dnId: string) => {
    return updateDN(dnId, { status: 'SUBMITTED', submitted_at: new Date().toISOString() })
  }

  const verifyDK = async (dnId: string) => {
    return updateDN(dnId, { status: 'VERIFIED_DK', verified_dk_at: new Date().toISOString() })
  }

  const verifyBOH = async (dnId: string) => {
    return updateDN(dnId, { status: 'VERIFIED_BOH', verified_boh_at: new Date().toISOString() })
  }

  const completeDN = async (dnId: string) => {
    return updateDN(dnId, { status: 'COMPLETED', completed_at: new Date().toISOString() })
  }

  useEffect(() => {
    if (id) fetchOne(id)
    else fetchList()
  }, [id, fetchOne, fetchList])

  return { dn, list, loading, error, fetchList, fetchOne, createDN, updateDN, submitDN, verifyDK, verifyBOH, completeDN }
}
