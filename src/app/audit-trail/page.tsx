'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuditLog } from '@/types'
import { formatDate } from '@/lib/utils'
import { Search, Download } from 'lucide-react'

export default function AuditTrailPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setLogs(data ?? [])
        setLoading(false)
      })
  }, [supabase])

  const filtered = logs.filter(
    (l) =>
      l.entity_type.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_id.includes(search)
  )

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
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-trail-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const ACTION_COLORS: Record<string, string> = {
    AUTO_ESCALATED: 'bg-red-100 text-red-700',
    INSERT: 'bg-green-100 text-green-700',
    UPDATE: 'bg-blue-100 text-blue-700',
    DELETE: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-sm text-gray-500">Log aktivitas sistem BRIMOS</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#002D62] bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari entitas, aksi, ID..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#002D62]/30"
        />
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Memuat log...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Waktu</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Entitas</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">ID</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Aksi</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Pelaku</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(log.created_at, 'dd/MM/yy HH:mm')}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 font-mono">{log.entity_type}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono truncate max-w-[120px]" title={log.entity_id}>{log.entity_id.slice(0, 8)}...</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{log.performed_by?.slice(0, 8) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
