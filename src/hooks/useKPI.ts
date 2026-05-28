'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { KPITarget, KPIRealization } from '@/types'

export interface KPIData {
  target: KPITarget | null
  realization: KPIRealization | null
  monthlyTrend: { month: number; label: string; completed: number; total: number; rate: number }[]
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

export function useKPI(branchCode?: string) {
  const supabase = createClient()
  const [data, setData] = useState<KPIData>({ target: null, realization: null, monthlyTrend: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const fetchKPI = useCallback(async () => {
    if (!branchCode) return
    setLoading(true)

    // Fetch current month target
    const { data: targetData } = await supabase
      .from('kpi_targets')
      .select('*, kpi_realizations(*)')
      .eq('period_year', year)
      .eq('period_month', month)
      .eq('branch_code', branchCode)
      .single()

    // Fetch yearly trend
    const { data: yearlyTargets } = await supabase
      .from('kpi_targets')
      .select('period_month, kpi_realizations(completed_dn, total_dn)')
      .eq('period_year', year)
      .eq('branch_code', branchCode)
      .order('period_month')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monthlyTrend = ((yearlyTargets ?? []) as any[]).map((t) => {
      const real = (t.kpi_realizations as KPIRealization[] | undefined)?.[0]
      const completed = real?.completed_dn ?? 0
      const total = real?.total_dn ?? 0
      return {
        month: t.period_month as number,
        label: MONTH_LABELS[(t.period_month as number) - 1],
        completed,
        total,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      }
    })

    const realization = targetData
      ? ((targetData as unknown as { kpi_realizations: KPIRealization[] }).kpi_realizations?.[0] ?? null)
      : null

    setData({
      target: targetData as KPITarget | null,
      realization,
      monthlyTrend,
    })
    setLoading(false)
  }, [supabase, branchCode, year, month])

  const setTarget = async (values: Omit<KPITarget, 'id' | 'created_at' | 'updated_at'>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('kpi_targets')
      .upsert(values, { onConflict: 'period_year,period_month,branch_code' })
      .select()
      .single()
    if (!error) await fetchKPI()
    return { data, error }
  }

  useEffect(() => {
    fetchKPI()
  }, [fetchKPI])

  return { ...data, loading, error, fetchKPI, setTarget }
}
