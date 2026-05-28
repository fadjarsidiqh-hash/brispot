'use client'

import { useDN } from '@/hooks/useDN'
import { STATUS_LABELS, PRIORITY_COLORS, formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'

const STATUS_PILL: Record<string, string> = {
  ESCALATED:    'bg-[#fff0f0] text-[#CC0000]',
  COMPLETED:    'bg-[#e8f5e9] text-[#16a34a]',
  SUBMITTED:    'bg-[#e8f0fe] text-[#003087]',
  VERIFIED_DK:  'bg-[#fffbe0] text-[#b8890a]',
  VERIFIED_BOH: 'bg-[#f3e8ff] text-[#7c3aed]',
  DRAFT:        'bg-[#f0f2f7] text-[#718096]',
  REJECTED:     'bg-[#fff0f0] text-[#CC0000]',
}

function getRowBorder(status: string, dueDate: string | null) {
  if (status === 'ESCALATED' || (dueDate && new Date(dueDate) < new Date() && !['COMPLETED','REJECTED'].includes(status))) {
    return 'border-l-[#CC0000]'
  }
  if (status === 'COMPLETED') return 'border-l-[#22c55e]'
  if (dueDate) {
    const diff = (new Date(dueDate).getTime() - Date.now()) / 864e5
    if (diff <= 3) return 'border-l-[#f0b429]'
  }
  return 'border-l-[#003087]'
}

export default function DecisionNotesPage() {
  const { list, loading } = useDN()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const filtered = list.filter((dn) => {
    const matchSearch = !search ||
      dn.debtor_name.toLowerCase().includes(search.toLowerCase()) ||
      dn.dn_number.toLowerCase().includes(search.toLowerCase()) ||
      dn.debtor_cif.toLowerCase().includes(search.toLowerCase())
    const matchStatus   = statusFilter   ? dn.status === statusFilter     : true
    const matchPriority = priorityFilter ? dn.priority === priorityFilter  : true
    return matchSearch && matchStatus && matchPriority
  })

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[13px] font-bold text-[#002470]">Decision Notes</h1>
        <Link
          href="/decision-notes/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#003087] text-white text-[11px] font-bold rounded-lg hover:bg-[#002470] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Buat DN
        </Link>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#9ca3af]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama debitur, nomor DN, CIF..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#e8ecf4] text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/10 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-2.5 rounded-lg border border-[#e8ecf4] text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#003087] transition-colors"
          >
            <option value="">Semua Status</option>
            {(['DRAFT','SUBMITTED','VERIFIED_DK','VERIFIED_BOH','COMPLETED','ESCALATED','REJECTED'] as const).map((k) => (
              <option key={k} value={k}>{STATUS_LABELS[k]}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="py-2 px-2.5 rounded-lg border border-[#e8ecf4] text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#003087] transition-colors"
          >
            <option value="">Semua Prioritas</option>
            {(['RENDAH','SEDANG','TINGGI','KRITIS'] as const).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[11px] text-[#9ca3af]">Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-[11px] text-[#9ca3af]">Tidak ada data ditemukan</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#003087] text-left">
                  {['Nomor DN','Debitur','Jumlah Kredit','Jenis Kredit','Prioritas','Batas Waktu','Status'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-[9px] font-bold text-white tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ecf4]">
                {filtered.map((dn) => (
                  <tr key={dn.id} className={`hover:bg-[#f8fafc] transition-colors border-l-4 ${getRowBorder(dn.status, dn.due_date)}`}>
                    <td className="px-3 py-2.5">
                      <Link href={`/decision-notes/${dn.id}`} className="text-[10px] font-semibold text-[#003087] hover:underline">
                        {dn.dn_number}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-[10px] font-medium text-[#002470]">{dn.debtor_name}</p>
                      <p className="text-[8px] text-[#9ca3af]">{dn.debtor_cif}</p>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-[#4a5568]">{formatCurrency(dn.credit_amount)}</td>
                    <td className="px-3 py-2.5 text-[10px] text-[#4a5568]">{dn.credit_type}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${PRIORITY_COLORS[dn.priority]}`}>
                        {dn.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-[#9ca3af]">
                      {dn.due_date ? formatDate(dn.due_date) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${STATUS_PILL[dn.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[dn.status]}
                      </span>
                    </td>
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

