'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Users, CheckCircle2, XCircle, Clock, Award, ChevronDown, ChevronUp } from 'lucide-react'

interface RMStat {
  rm_id: string
  rm_name: string
  branch_code: string
  total: number
  submitted: number
  completed: number
  rejected: number
  needs_revision: number
  in_progress: number
  total_credit: number
  avg_credit: number
  approval_rate: number
}

type SortKey = 'rm_name' | 'total' | 'completed' | 'approval_rate' | 'total_credit'

export default function KPIPage() {
  const { profile } = useAuth()
  const supabase = createClient()
  const [stats, setStats] = useState<RMStat[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortAsc, setSortAsc] = useState(false)

  const role = profile?.role

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Fetch all DN with RM profile join
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('decision_notes')
          .select('rm_id, status, credit_amount, rm:rm_id(id, full_name, branch_code)')
          .order('created_at', { ascending: false })

        if (!data) return

        // For RM, only their own data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filtered: any[] = (role === 'RM')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? data.filter((d: any) => d.rm_id === profile?.id)
          : data

        // Group by rm_id
        const map = new Map<string, RMStat>()
        for (const row of filtered) {
          const rmProfile = row.rm as { id: string; full_name: string; branch_code: string } | null
          const rmId = row.rm_id ?? ''
          if (!map.has(rmId)) {
            map.set(rmId, {
              rm_id: rmId,
              rm_name: rmProfile?.full_name ?? '—',
              branch_code: rmProfile?.branch_code ?? '—',
              total: 0,
              submitted: 0,
              completed: 0,
              rejected: 0,
              needs_revision: 0,
              in_progress: 0,
              total_credit: 0,
              avg_credit: 0,
              approval_rate: 0,
            })
          }
          const s = map.get(rmId)!
          s.total++
          s.total_credit += (row.credit_amount ?? 0)
          if (row.status === 'COMPLETED') s.completed++
          else if (row.status === 'REJECTED') s.rejected++
          else if (row.status === 'NEEDS_REVISION') s.needs_revision++
          else if (['SUBMITTED', 'DECIDED_BOH'].includes(row.status)) { s.in_progress++; s.submitted++ }
        }

        const result = Array.from(map.values()).map((s) => ({
          ...s,
          avg_credit: s.total > 0 ? s.total_credit / s.total : 0,
          approval_rate: (s.completed + s.rejected) > 0
            ? Math.round((s.completed / (s.completed + s.rejected)) * 100)
            : 0,
        }))

        setStats(result)
      } finally {
        setLoading(false)
      }
    }
    if (profile) load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const sorted = [...stats].sort((a, b) => {
    const av = a[sortKey] as string | number
    const bv = b[sortKey] as string | number
    if (typeof av === 'string') return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  const totalAll = stats.reduce((acc, s) => acc + s.total, 0)
  const completedAll = stats.reduce((acc, s) => acc + s.completed, 0)
  const rejectedAll = stats.reduce((acc, s) => acc + s.rejected, 0)
  const totalCreditAll = stats.reduce((acc, s) => acc + s.total_credit, 0)
  const globalApprovalRate = (completedAll + rejectedAll) > 0
    ? Math.round((completedAll / (completedAll + rejectedAll)) * 100)
    : 0

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronDown className="w-3 h-3 opacity-30" />
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  const isAdminOrBOH = role === 'ADMIN' || role === 'BOH'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-[13px] font-bold text-[#002470]">
          {isAdminOrBOH ? 'KPI Performance Relationship Manager' : 'KPI Saya'}
        </h1>
        <p className="text-[9px] text-[#9ca3af]">
          {isAdminOrBOH
            ? 'Ringkasan kinerja seluruh RM berdasarkan data Catatan Pemutus'
            : 'Ringkasan kinerja Catatan Pemutus Anda'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-[11px] text-[#9ca3af]">Memuat data KPI...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: 'Total DN',
                value: totalAll,
                icon: Clock,
                color: 'bg-[#003087]',
                sub: isAdminOrBOH ? `${stats.length} RM aktif` : 'Total pengajuan',
              },
              {
                label: 'Selesai (Completed)',
                value: completedAll,
                icon: CheckCircle2,
                color: 'bg-[#16a34a]',
                sub: `${globalApprovalRate}% approval rate`,
              },
              {
                label: 'Ditolak',
                value: rejectedAll,
                icon: XCircle,
                color: 'bg-[#CC0000]',
                sub: `${rejectedAll > 0 ? Math.round((rejectedAll / Math.max(totalAll, 1)) * 100) : 0}% dari total`,
              },
              {
                label: 'Total Nilai Kredit',
                value: formatCurrency(totalCreditAll),
                icon: TrendingUp,
                color: 'bg-[#7c3aed]',
                sub: 'Akumulasi plafon',
                wide: true,
              },
            ].map(({ label, value, icon: Icon, color, sub }) => (
              <div key={label} className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-3.5 flex items-center gap-3">
                <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[#002470] leading-none">{value}</p>
                  <p className="text-[9px] font-semibold text-[#002470] mt-0.5">{label}</p>
                  <p className="text-[8px] text-[#9ca3af]">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top performer highlight (admin/boh only) */}
          {isAdminOrBOH && sorted.length > 0 && (
            <div className="bg-gradient-to-r from-[#002470] to-[#003087] rounded-[10px] p-4 flex items-center gap-4">
              <Award className="w-8 h-8 text-[#f0b429] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-bold text-[#f0b429] uppercase tracking-wider mb-0.5">Top Performer</div>
                <div className="text-[12px] font-bold text-white">
                  {[...sorted].sort((a, b) => b.completed - a.completed)[0]?.rm_name ?? '—'}
                </div>
                <div className="text-[9px] text-white/70">
                  {[...sorted].sort((a, b) => b.completed - a.completed)[0]?.completed ?? 0} DN selesai · {[...sorted].sort((a, b) => b.completed - a.completed)[0]?.approval_rate ?? 0}% approval rate
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] font-bold text-white">
                  {formatCurrency([...sorted].sort((a, b) => b.completed - a.completed)[0]?.total_credit ?? 0)}
                </div>
                <div className="text-[8px] text-white/60">Total kredit</div>
              </div>
            </div>
          )}

          {/* Per-RM table */}
          <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
            <div className="bg-[#003087] text-white px-3.5 py-2.5 text-[10px] font-bold flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              {isAdminOrBOH ? `Detail Kinerja per RM (${stats.length} RM)` : 'Detail Kinerja'}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e8ecf4]">
                    {isAdminOrBOH && (
                      <th
                        className="px-3 py-2 text-left text-[9px] font-bold text-[#718096] cursor-pointer hover:text-[#002470] select-none"
                        onClick={() => toggleSort('rm_name')}
                      >
                        <div className="flex items-center gap-1">Nama RM <SortIcon k="rm_name" /></div>
                      </th>
                    )}
                    {isAdminOrBOH && (
                      <th className="px-3 py-2 text-left text-[9px] font-bold text-[#718096]">Cabang</th>
                    )}
                    <th
                      className="px-3 py-2 text-right text-[9px] font-bold text-[#718096] cursor-pointer hover:text-[#002470] select-none"
                      onClick={() => toggleSort('total')}
                    >
                      <div className="flex items-center justify-end gap-1">Total DN <SortIcon k="total" /></div>
                    </th>
                    <th className="px-3 py-2 text-right text-[9px] font-bold text-[#718096]">Proses</th>
                    <th
                      className="px-3 py-2 text-right text-[9px] font-bold text-[#718096] cursor-pointer hover:text-[#002470] select-none"
                      onClick={() => toggleSort('completed')}
                    >
                      <div className="flex items-center justify-end gap-1">Selesai <SortIcon k="completed" /></div>
                    </th>
                    <th className="px-3 py-2 text-right text-[9px] font-bold text-[#718096]">Ditolak</th>
                    <th className="px-3 py-2 text-right text-[9px] font-bold text-[#718096]">Revisi</th>
                    <th
                      className="px-3 py-2 text-right text-[9px] font-bold text-[#718096] cursor-pointer hover:text-[#002470] select-none"
                      onClick={() => toggleSort('approval_rate')}
                    >
                      <div className="flex items-center justify-end gap-1">Approval % <SortIcon k="approval_rate" /></div>
                    </th>
                    <th
                      className="px-3 py-2 text-right text-[9px] font-bold text-[#718096] cursor-pointer hover:text-[#002470] select-none"
                      onClick={() => toggleSort('total_credit')}
                    >
                      <div className="flex items-center justify-end gap-1">Total Kredit <SortIcon k="total_credit" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8ecf4]">
                  {sorted.map((s) => (
                    <tr key={s.rm_id} className="hover:bg-[#f8fafc] transition-colors">
                      {isAdminOrBOH && (
                        <td className="px-3 py-2.5">
                          <div className="text-[10px] font-semibold text-[#002470]">{s.rm_name}</div>
                        </td>
                      )}
                      {isAdminOrBOH && (
                        <td className="px-3 py-2.5 text-[9px] text-[#9ca3af]">{s.branch_code}</td>
                      )}
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-[11px] font-bold text-[#002470]">{s.total}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[10px] text-[#4a5568]">{s.in_progress}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-[10px] font-semibold text-[#16a34a]">{s.completed}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-[10px] font-semibold text-[#CC0000]">{s.rejected}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[10px] text-[#b8890a]">{s.needs_revision}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-16 bg-[#e8ecf4] rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${s.approval_rate >= 80 ? 'bg-[#16a34a]' : s.approval_rate >= 50 ? 'bg-[#f0b429]' : 'bg-[#CC0000]'}`}
                              style={{ width: `${s.approval_rate}%` }}
                            />
                          </div>
                          <span className={`text-[9px] font-bold ${s.approval_rate >= 80 ? 'text-[#16a34a]' : s.approval_rate >= 50 ? 'text-[#b8890a]' : 'text-[#CC0000]'}`}>
                            {s.approval_rate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[9px] text-[#4a5568]">{formatCurrency(s.total_credit)}</td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={isAdminOrBOH ? 9 : 7} className="text-center py-10 text-[10px] text-[#9ca3af]">Belum ada data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
