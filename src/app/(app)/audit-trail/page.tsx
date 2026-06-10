'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuditLog } from '@/types'
import { formatDate } from '@/lib/utils'
import { Search, Download, ClipboardList, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'

const ACTION_PILL: Record<string, string> = {
  AUTO_ESCALATED: 'bg-[#fff0f0] text-[#CC0000]',
  INSERT:         'bg-[#e8f5e9] text-[#16a34a]',
  UPDATE:         'bg-[#e8f0fe] text-[#003087]',
  DELETE:         'bg-[#fff0f0] text-[#CC0000]',
  SUBMIT:         'bg-[#fffbe0] text-[#b8890a]',
  DECIDE_BOH:     'bg-[#fffbe0] text-[#b8890a]',
  VERIFY_ADK:     'bg-[#f3e8ff] text-[#7c3aed]',
  COMPLETE:       'bg-[#e8f5e9] text-[#16a34a]',
  REJECT:         'bg-[#fff0f0] text-[#CC0000]',
  // legacy keys kept for old log entries
  VERIFY_DK:      'bg-[#e8f0fe] text-[#003087]',
  VERIFY_BOH:     'bg-[#f3e8ff] text-[#7c3aed]',
}

export default function AuditTrailPage() {
  const supabase = createClient()
  const { t } = useI18n()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25

  useEffect(() => {
    setLoading(true)
    supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setLogs(data ?? [])
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = logs.filter((l) => {
    const matchSearch = !search ||
      l.entity_type.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_id.includes(search)
    const matchAction = actionFilter ? l.action === actionFilter : true
    return matchSearch && matchAction
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)))

  const exportCSV = () => {
    const headers = ['Waktu', 'Entitas', 'ID', 'Aksi', 'Pelaku']
    const rows = filtered.map((l) => [
      formatDate(l.created_at, 'dd/MM/yyyy HH:mm'),
      l.entity_type,
      l.entity_id,
      l.action,
      l.performed_by ?? '—',
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `audit-trail-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Summary counts
  const totalLogs  = logs.length
  const insertLogs = logs.filter((l) => l.action === 'INSERT').length
  const closedLogs = logs.filter((l) => l.action === 'COMPLETE').length
  const escalated  = logs.filter((l) => l.action === 'AUTO_ESCALATED').length

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[13px] font-bold text-[#002470]">{t.audit.title}</h1>
          <p className="text-[9px] text-[#9ca3af]">{t.audit.subtitle}</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold text-[#003087] bg-[#e8f0fe] rounded-lg hover:bg-[#d1e3fc] transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> {t.common.no === 'No' ? 'Export CSV' : 'Ekspor CSV'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {[
          { icon: ClipboardList, label: t.common.no === 'No' ? 'Total Logs' : 'Total Log',   value: totalLogs,  color: 'border-t-[#003087] text-[#003087]' },
          { icon: FileText,      label: t.common.no === 'No' ? 'DN Created' : 'DN Dibuat',   value: insertLogs, color: 'border-t-[#22c55e] text-[#22c55e]' },
          { icon: CheckCircle2,  label: t.common.no === 'No' ? 'DN Closed' : 'DN Closed',    value: closedLogs, color: 'border-t-[#f0b429] text-[#c8870a]' },
          { icon: AlertTriangle, label: t.common.no === 'No' ? 'Escalated' : 'Eskalasi',     value: escalated,  color: 'border-t-[#CC0000] text-[#CC0000]' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className={`bg-white rounded-[10px] p-3 border border-[#e8ecf4] border-t-4 ${color.split(' ')[0]} shadow-[0_1px_3px_rgba(0,36,112,0.07)]`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`w-3.5 h-3.5 ${color.split(' ')[1]}`} />
              <div className="text-[9px] text-[#9ca3af] font-medium">{label}</div>
            </div>
            <div className={`text-2xl font-extrabold leading-none ${color.split(' ')[1]}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#9ca3af]" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder={t.common.no === 'No' ? 'Search entity, action, ID...' : 'Cari entitas, aksi, ID...'}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#e8ecf4] text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/10 transition-colors"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
            className="py-2 px-2.5 rounded-lg border border-[#e8ecf4] text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#003087] transition-colors"
          >
            <option value="">{t.common.no === 'No' ? 'All Actions' : 'Semua Aksi'}</option>
            {uniqueActions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {filtered.length > 0 && (
          <p className="text-[9px] text-[#9ca3af] mt-1.5">{filtered.length} {t.common.no === 'No' ? 'logs found' : 'log ditemukan'}</p>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[11px] text-[#9ca3af]">{t.common.loading}</div>
        ) : paginated.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-[11px] text-[#9ca3af]">{t.audit.noAudit}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#003087] text-left">
                  {[
                    t.common.date,
                    t.common.no === 'No' ? 'Entity' : 'Entitas',
                    t.common.no === 'No' ? 'Object ID' : 'ID Objek',
                    t.audit.action,
                    t.audit.user,
                    t.common.no === 'No' ? 'Previous Status' : 'Status Sebelum',
                    t.common.no === 'No' ? 'New Status' : 'Status Sesudah',
                  ].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-[9px] font-bold text-white tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ecf4]">
                {paginated.map((log) => (
                  <tr key={log.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-3 py-2 text-[9px] text-[#9ca3af] whitespace-nowrap">
                      {formatDate(log.created_at, 'dd/MM/yy HH:mm')}
                    </td>
                    <td className="px-3 py-2 text-[9px] text-[#4a5568] font-mono">{log.entity_type}</td>
                    <td className="px-3 py-2 text-[9px] text-[#9ca3af] font-mono" title={log.entity_id}>
                      {log.entity_id.slice(0, 8)}…
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-semibold ${ACTION_PILL[log.action] ?? 'bg-[#f0f2f7] text-[#718096]'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[9px] text-[#9ca3af] font-mono">
                      {log.performed_by?.slice(0, 8) ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-[9px] text-[#9ca3af]">
                      {(log.old_values as Record<string, string> | null)?.status ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-[9px] text-[#9ca3af]">
                      {(log.new_values as Record<string, string> | null)?.status ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-[10px] font-medium text-[#003087] bg-white border border-[#e8ecf4] rounded-lg disabled:opacity-40 hover:bg-[#f0f4f8] transition-colors"
          >
            ← Prev
          </button>
          <span className="text-[9px] text-[#9ca3af] px-2">{t.common.no === 'No' ? `Page ${page} / ${totalPages}` : `Halaman ${page} / ${totalPages}`}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-[10px] font-medium text-[#003087] bg-white border border-[#e8ecf4] rounded-lg disabled:opacity-40 hover:bg-[#f0f4f8] transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

