'use client'

import { useDN } from '@/hooks/useDN'
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Plus, Search, Filter } from 'lucide-react'
import { useState } from 'react'

export default function DecisionNotesPage() {
  const { list, loading } = useDN()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = list.filter((dn) => {
    const matchSearch = dn.debtor_name.toLowerCase().includes(search.toLowerCase()) ||
      dn.dn_number.toLowerCase().includes(search.toLowerCase()) ||
      dn.debtor_cif.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter ? dn.status === statusFilter : true
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Decision Notes</h1>
        <Link href="/decision-notes/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#002D62] text-white text-sm font-semibold rounded-xl hover:bg-[#003f8a] transition-colors">
          <Plus className="w-4 h-4" /> Buat DN
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama debitur, nomor DN, CIF..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#002D62]/30"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#002D62]/30 bg-white"
          >
            <option value="">Semua Status</option>
            {Object.entries(STATUS_LABELS).filter(([k]) => ['DRAFT','SUBMITTED','VERIFIED_DK','VERIFIED_BOH','COMPLETED','ESCALATED','REJECTED'].includes(k)).map(([k,v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Tidak ada data ditemukan</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Nomor DN</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Debitur</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Jumlah Kredit</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Jenis</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Prioritas</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Batas</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((dn) => (
                  <tr key={dn.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/decision-notes/${dn.id}`} className="font-medium text-[#002D62] hover:underline">
                        {dn.dn_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{dn.debtor_name}</p>
                      <p className="text-xs text-gray-400">{dn.debtor_cif}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(dn.credit_amount)}</td>
                    <td className="px-4 py-3 text-gray-600">{dn.credit_type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[dn.priority]}`}>
                        {dn.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{dn.due_date ? formatDate(dn.due_date) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[dn.status]}`}>
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
