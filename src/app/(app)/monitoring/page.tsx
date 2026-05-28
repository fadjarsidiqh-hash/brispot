'use client'

import { useDN } from '@/hooks/useDN'
import { STATUS_LABELS, STATUS_COLORS, formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { AlertTriangle, Clock, TrendingUp, Activity } from 'lucide-react'
import { EscalationCountdown } from '@/components/EscalationCountdown'

export default function MonitoringPage() {
  const { list, loading } = useDN()

  const overdue = list.filter((d) => d.due_date && new Date(d.due_date) < new Date() && !['COMPLETED','REJECTED'].includes(d.status))
  const escalated = list.filter((d) => d.status === 'ESCALATED')
  const inProgress = list.filter((d) => ['SUBMITTED','VERIFIED_DK','VERIFIED_BOH'].includes(d.status))
  const completed = list.filter((d) => d.status === 'COMPLETED')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Monitoring</h1>
        <p className="text-sm text-gray-500">Pantau status dan eskalasi Decision Notes secara real-time</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sedang Berjalan', value: inProgress.length, icon: Activity, color: 'bg-blue-500' },
          { label: 'Terlambat', value: overdue.length, icon: Clock, color: 'bg-orange-500' },
          { label: 'Dieskalasi', value: escalated.length, icon: AlertTriangle, color: 'bg-red-500' },
          { label: 'Selesai', value: completed.length, icon: TrendingUp, color: 'bg-green-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border p-5 flex items-center gap-4">
            <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Escalated DNs */}
      {escalated.length > 0 && (
        <div className="bg-white rounded-2xl border">
          <div className="px-6 py-4 border-b bg-red-50">
            <h3 className="font-semibold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> DN Dieskalasi ({escalated.length})
            </h3>
          </div>
          <div className="divide-y">
            {escalated.map((dn) => (
              <div key={dn.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <Link href={`/decision-notes/${dn.id}`} className="font-semibold text-[#002D62] hover:underline">{dn.dn_number}</Link>
                  <p className="text-sm text-gray-600">{dn.debtor_name} · {formatCurrency(dn.credit_amount)}</p>
                </div>
                {dn.escalation_date && <EscalationCountdown escalationDate={dn.escalation_date} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overdue DNs */}
      {overdue.length > 0 && (
        <div className="bg-white rounded-2xl border">
          <div className="px-6 py-4 border-b bg-orange-50">
            <h3 className="font-semibold text-orange-700 flex items-center gap-2">
              <Clock className="w-4 h-4" /> DN Melewati Batas Waktu ({overdue.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Nomor DN</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Debitur</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Batas</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {overdue.map((dn) => (
                  <tr key={dn.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/decision-notes/${dn.id}`} className="font-medium text-[#002D62] hover:underline">{dn.dn_number}</Link>
                    </td>
                    <td className="px-4 py-3">{dn.debtor_name}</td>
                    <td className="px-4 py-3 text-red-600 font-medium text-xs">{dn.due_date ? formatDate(dn.due_date) : '—'}</td>
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
        </div>
      )}

      {/* All in-progress */}
      <div className="bg-white rounded-2xl border">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-800">Semua DN Aktif</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">Memuat...</div>
        ) : inProgress.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">Tidak ada DN aktif</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Nomor DN</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Debitur</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Jumlah</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Batas</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inProgress.map((dn) => (
                  <tr key={dn.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/decision-notes/${dn.id}`} className="font-medium text-[#002D62] hover:underline">{dn.dn_number}</Link>
                    </td>
                    <td className="px-4 py-3">{dn.debtor_name}</td>
                    <td className="px-4 py-3">{formatCurrency(dn.credit_amount)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{dn.due_date ? formatDate(dn.due_date) : '—'}</td>
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
