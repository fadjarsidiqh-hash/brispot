'use client'

import { useDN } from '@/hooks/useDN'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency, formatDate, getMonitoringStatus, type MonitoringStatus } from '@/lib/utils'
import Link from 'next/link'
import { useState } from 'react'
import { AlertTriangle, Clock, CheckCircle2, XCircle, FileText, Users, Layers } from 'lucide-react'
import { EscalationCountdown } from '@/components/EscalationCountdown'

const STATUS_COLS: { key: MonitoringStatus; label: string; color: string; text: string; dot: string }[] = [
  { key: 'NEW',                  label: 'NEW',                  color: 'bg-[#e8f0fe]', text: 'text-[#003087]', dot: 'bg-[#003087]' },
  { key: 'IN_PROGRESS',          label: 'IN PROGRESS',          color: 'bg-[#fff8e1]', text: 'text-[#b8890a]', dot: 'bg-[#f0b429]' },
  { key: 'WAITING_VERIFICATION', label: 'WAITING VERIFICATION', color: 'bg-[#f3e8ff]', text: 'text-[#7c3aed]', dot: 'bg-[#7c3aed]' },
  { key: 'CLOSED',               label: 'CLOSED',               color: 'bg-[#e8f5e9]', text: 'text-[#16a34a]', dot: 'bg-[#22c55e]' },
  { key: 'OVERDUE',              label: 'OVERDUE',              color: 'bg-[#fff0f0]', text: 'text-[#CC0000]', dot: 'bg-[#CC0000]' },
  { key: 'REJECTED',             label: 'DITOLAK',              color: 'bg-[#fef2f2]', text: 'text-[#991b1b]', dot: 'bg-[#dc2626]' },
]

type ViewMode = 'pipeline' | 'rm'

export default function MonitoringPage() {
  const { list, loading } = useDN()
  const { profile } = useAuth()
  const [view, setView] = useState<ViewMode>('pipeline')
  const [rmFilter, setRmFilter] = useState('')

  const role = profile?.role
  const canSeeAll = role === 'BOH' || role === 'ADMIN' || role === 'ADK'

  const byCols = STATUS_COLS.map((col) => ({
    ...col,
    items: list.filter((d) => getMonitoringStatus(d) === col.key),
  }))

  const rmMap = new Map<string, { name: string; items: typeof list }>()
  for (const dn of list) {
    if (!dn.rm_id) continue
    const rmData = (dn as unknown as { rm?: { full_name?: string } }).rm
    if (!rmMap.has(dn.rm_id)) {
      rmMap.set(dn.rm_id, { name: rmData?.full_name ?? dn.rm_id.slice(0, 8), items: [] })
    }
    rmMap.get(dn.rm_id)!.items.push(dn)
  }
  const rmList = Array.from(rmMap.entries())
    .map(([id, v]) => ({ id, ...v }))
    .filter((r) => !rmFilter || r.name.toLowerCase().includes(rmFilter.toLowerCase()))
    .sort((a, b) => b.items.length - a.items.length)

  const escalated = list.filter((d) => d.status === 'ESCALATED')
  const overdue   = list.filter((d) => d.due_date && new Date(d.due_date) < new Date() && !['COMPLETED','REJECTED'].includes(d.status))
  const nearDue   = list.filter((d) => {
    if (!d.due_date || ['COMPLETED','REJECTED'].includes(d.status)) return false
    const diff = (new Date(d.due_date).getTime() - Date.now()) / 864e5
    return diff >= 0 && diff <= 3
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[13px] font-bold text-[#002470]">Monitoring DN</h1>
          <p className="text-[9px] text-[#9ca3af]">Pantau pipeline dan kondisi seluruh Catatan Pemutus</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-[#e8ecf4] rounded-lg p-1 shadow-[0_1px_3px_rgba(0,36,112,0.07)]">
          <button
            onClick={() => setView('pipeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold transition-colors ${view === 'pipeline' ? 'bg-[#003087] text-white' : 'text-[#718096] hover:bg-[#f0f2f7]'}`}
          >
            <Layers className="w-3 h-3" /> Pipeline
          </button>
          {canSeeAll && (
            <button
              onClick={() => setView('rm')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold transition-colors ${view === 'rm' ? 'bg-[#003087] text-white' : 'text-[#718096] hover:bg-[#f0f2f7]'}`}
            >
              <Users className="w-3 h-3" /> Per RM
            </button>
          )}
        </div>
      </div>

      {(escalated.length > 0 || overdue.length > 0 || nearDue.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {escalated.length > 0 && (
            <div className="flex items-center gap-2.5 flex-1 bg-[#fff0f0] border border-[#fca5a5] rounded-[10px] px-3.5 py-2.5">
              <AlertTriangle className="w-4 h-4 text-[#CC0000] shrink-0" />
              <div>
                <div className="text-[10px] font-bold text-[#CC0000]">{escalated.length} DN Dieskalasi</div>
                <div className="text-[8px] text-[#9ca3af]">Perlu tindaklanjut segera</div>
              </div>
            </div>
          )}
          {overdue.length > 0 && (
            <div className="flex items-center gap-2.5 flex-1 bg-[#fff7ed] border border-[#fed7aa] rounded-[10px] px-3.5 py-2.5">
              <Clock className="w-4 h-4 text-[#c2410c] shrink-0" />
              <div>
                <div className="text-[10px] font-bold text-[#c2410c]">{overdue.length} DN Melewati Due Date</div>
                <div className="text-[8px] text-[#9ca3af]">Due date sudah terlampaui</div>
              </div>
            </div>
          )}
          {nearDue.length > 0 && (
            <div className="flex items-center gap-2.5 flex-1 bg-[#fffbe0] border border-[#f0e08a] rounded-[10px] px-3.5 py-2.5">
              <Clock className="w-4 h-4 text-[#b8890a] shrink-0" />
              <div>
                <div className="text-[10px] font-bold text-[#b8890a]">{nearDue.length} DN Mendekati Due Date</div>
                <div className="text-[8px] text-[#9ca3af]">≤ 3 hari kerja</div>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-[11px] text-[#9ca3af]">Memuat data monitoring...</div>
      ) : view === 'pipeline' ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {byCols.map((col) => (
            <div key={col.key} className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
              <div className={`${col.color} px-3 py-2 flex items-center justify-between`}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                  <span className={`text-[9px] font-bold ${col.text}`}>{col.label}</span>
                </div>
                <span className={`text-[11px] font-extrabold ${col.text}`}>{col.items.length}</span>
              </div>
              <div className="divide-y divide-[#e8ecf4] max-h-[400px] overflow-y-auto">
                {col.items.length === 0 ? (
                  <div className="px-3 py-5 text-center text-[9px] text-[#9ca3af]">Tidak ada</div>
                ) : (
                  col.items.map((dn) => (
                    <Link key={dn.id} href={`/decision-notes/${dn.id}`} className="block px-3 py-2 hover:bg-[#f8fafc] transition-colors">
                      <div className="text-[9.5px] font-semibold text-[#002470] truncate">{dn.dn_number}</div>
                      <div className="text-[8.5px] text-[#4a5568] truncate">{dn.debtor_name}</div>
                      <div className="text-[8px] text-[#9ca3af] mt-0.5">{formatCurrency(dn.credit_amount)}</div>
                      {dn.escalation_date && col.key === 'OVERDUE' && (
                        <EscalationCountdown escalationDate={dn.escalation_date} />
                      )}
                      {dn.due_date && !['COMPLETED','REJECTED'].includes(dn.status) && (
                        <div className="text-[7.5px] text-[#9ca3af] mt-0.5">Due: {formatDate(dn.due_date)}</div>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white rounded-[10px] border border-[#e8ecf4] p-3">
            <input
              value={rmFilter}
              onChange={(e) => setRmFilter(e.target.value)}
              placeholder="Cari nama RM..."
              className="w-full max-w-xs px-3 py-2 rounded-lg border border-[#e8ecf4] text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/10 transition-colors"
            />
          </div>
          {rmList.length === 0 ? (
            <div className="text-center py-10 text-[10px] text-[#9ca3af]">Tidak ada data</div>
          ) : (
            rmList.map((rm) => {
              const done     = rm.items.filter((d) => d.status === 'COMPLETED').length
              const rej      = rm.items.filter((d) => d.status === 'REJECTED').length
              const prog     = rm.items.filter((d) => ['SUBMITTED','DECIDED_MANAGER','DECIDED_BOH'].includes(d.status)).length
              const rev      = rm.items.filter((d) => d.status === 'NEEDS_REVISION').length
              const esc      = rm.items.filter((d) => d.status === 'ESCALATED').length
              const pct      = (done + rej) > 0 ? Math.round((done / (done + rej)) * 100) : 0

              return (
                <div key={rm.id} className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#f8fafc] border-b border-[#e8ecf4]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#003087] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                        {rm.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[10.5px] font-bold text-[#002470]">{rm.name}</div>
                        <div className="text-[8.5px] text-[#9ca3af]">{rm.items.length} total DN</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-20 bg-[#e8ecf4] rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 80 ? 'bg-[#22c55e]' : pct >= 50 ? 'bg-[#f0b429]' : 'bg-[#CC0000]'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold ${pct >= 80 ? 'text-[#16a34a]' : pct >= 50 ? 'text-[#b8890a]' : 'text-[#CC0000]'}`}>{pct}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 divide-x divide-[#e8ecf4]">
                    {[
                      { label: 'Proses',   val: prog, cls: 'text-[#003087]' },
                      { label: 'Selesai',  val: done, cls: 'text-[#16a34a]' },
                      { label: 'Ditolak',  val: rej,  cls: 'text-[#CC0000]' },
                      { label: 'Revisi',   val: rev,  cls: 'text-[#b8890a]' },
                      { label: 'Eskalasi', val: esc,  cls: 'text-[#CC0000]' },
                    ].map(({ label, val, cls }) => (
                      <div key={label} className="text-center py-2">
                        <div className={`text-[12px] font-extrabold ${cls}`}>{val}</div>
                        <div className="text-[7.5px] text-[#9ca3af]">{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="divide-y divide-[#e8ecf4] max-h-40 overflow-y-auto">
                    {rm.items.slice(0, 5).map((dn) => (
                      <div key={dn.id} className="flex items-center justify-between px-4 py-2 hover:bg-[#f8fafc] transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3 h-3 text-[#9ca3af] shrink-0" />
                          <div className="min-w-0">
                            <Link href={`/decision-notes/${dn.id}`} className="text-[9.5px] font-semibold text-[#003087] hover:underline truncate block">{dn.dn_number}</Link>
                            <div className="text-[8.5px] text-[#4a5568] truncate">{dn.debtor_name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[8.5px] text-[#9ca3af]">{formatCurrency(dn.credit_amount)}</span>
                          {dn.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 text-[#16a34a]" />}
                          {dn.status === 'REJECTED'  && <XCircle className="w-3 h-3 text-[#CC0000]" />}
                          {dn.status === 'ESCALATED' && <AlertTriangle className="w-3 h-3 text-[#CC0000]" />}
                        </div>
                      </div>
                    ))}
                    {rm.items.length > 5 && (
                      <div className="px-4 py-2 text-[8.5px] text-[#9ca3af] text-center">+{rm.items.length - 5} DN lainnya</div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

