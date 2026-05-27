'use client'

import { useDN } from '@/hooks/useDN'
import { useAuth } from '@/hooks/useAuth'
import { STATUS_LABELS, STATUS_COLORS, formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function VerifikasiPage() {
  const { profile } = useAuth()
  const { list, loading, verifyDK, verifyBOH } = useDN()

  const role = profile?.role
  const queue = list.filter((dn) => {
    if (role === 'DK' || role === 'ADMIN') return dn.status === 'SUBMITTED'
    if (role === 'BOH') return dn.status === 'VERIFIED_DK'
    return false
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Antrian Verifikasi</h1>
        <p className="text-sm text-gray-500">
          {role === 'DK' || role === 'ADMIN' ? 'DN yang menunggu verifikasi DK' : 'DN yang menunggu verifikasi BOH'}
        </p>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Memuat data...</div>
        ) : queue.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Tidak ada DN dalam antrian</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  <th className="px-4 py-3 font-semibold text-gray-600">Nomor DN</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Debitur</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Jumlah</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Diajukan</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {queue.map((dn) => (
                  <tr key={dn.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/decision-notes/${dn.id}`} className="font-medium text-[#002D62] hover:underline">
                        {dn.dn_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{dn.debtor_name}</p>
                      <p className="text-xs text-gray-400">{dn.debtor_cif}</p>
                    </td>
                    <td className="px-4 py-3">{formatCurrency(dn.credit_amount)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{dn.submitted_at ? formatDate(dn.submitted_at) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[dn.status]}`}>
                        {STATUS_LABELS[dn.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {dn.status === 'SUBMITTED' && (
                        <button onClick={() => verifyDK(dn.id)}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg font-medium hover:bg-yellow-100 transition-colors">
                          <CheckCircle2 className="w-3 h-3" /> Verifikasi DK
                        </button>
                      )}
                      {dn.status === 'VERIFIED_DK' && (
                        <button onClick={() => verifyBOH(dn.id)}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition-colors">
                          <CheckCircle2 className="w-3 h-3" /> Verifikasi BOH
                        </button>
                      )}
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
