'use client'

import { useDN } from '@/hooks/useDN'
import { useAuth } from '@/hooks/useAuth'
import { StatusTimeline } from '@/components/StatusTimeline'
import { EscalationCountdown } from '@/components/EscalationCountdown'
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS, formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, UploadCloud, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useParams } from 'next/navigation'

export default function DNDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { dn, loading, submitDN, verifyDK, verifyBOH, completeDN } = useDN(id)
  const { profile } = useAuth()

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Memuat...</div>
  if (!dn) return <div className="flex items-center justify-center h-64 text-gray-400">DN tidak ditemukan</div>

  const canSubmit = dn.status === 'DRAFT' && profile?.id === dn.ao_id
  const canVerifyDK = dn.status === 'SUBMITTED' && (profile?.role === 'DK' || profile?.role === 'ADMIN')
  const canVerifyBOH = dn.status === 'VERIFIED_DK' && (profile?.role === 'BOH' || profile?.role === 'ADMIN')
  const canComplete = dn.status === 'VERIFIED_BOH' && (profile?.role === 'DK' || profile?.role === 'BOH' || profile?.role === 'ADMIN')

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/decision-notes" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{dn.dn_number}</h1>
          <p className="text-sm text-gray-500">{dn.title}</p>
        </div>
        <span className={`ml-auto text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[dn.status]}`}>
          {STATUS_LABELS[dn.status]}
        </span>
      </div>

      {/* Escalation countdown */}
      {dn.escalation_date && !['COMPLETED', 'REJECTED'].includes(dn.status) && (
        <EscalationCountdown escalationDate={dn.escalation_date} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Info card */}
          <div className="bg-white rounded-2xl border p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Informasi Debitur &amp; Kredit</h2>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-gray-500">Nama Debitur</span><span className="font-medium">{dn.debtor_name}</span>
              <span className="text-gray-500">CIF</span><span>{dn.debtor_cif}</span>
              <span className="text-gray-500">Jenis Kredit</span><span>{dn.credit_type}</span>
              <span className="text-gray-500">Jumlah Kredit</span><span className="font-semibold text-[#002D62]">{formatCurrency(dn.credit_amount)}</span>
              <span className="text-gray-500">Tgl. Persetujuan</span><span>{formatDate(dn.approval_date)}</span>
              <span className="text-gray-500">No. Persetujuan</span><span>{dn.approval_number ?? '—'}</span>
              <span className="text-gray-500">Prioritas</span>
              <span><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[dn.priority]}`}>{dn.priority}</span></span>
              <span className="text-gray-500">Batas Penyelesaian</span><span className={dn.due_date && new Date(dn.due_date) < new Date() ? 'text-red-600 font-semibold' : ''}>{dn.due_date ? formatDate(dn.due_date) : '—'}</span>
              <span className="text-gray-500">Cabang</span><span>{dn.branch_code}</span>
            </div>
          </div>

          {/* Conditions */}
          {dn.conditions && dn.conditions.length > 0 && (
            <div className="bg-white rounded-2xl border p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Kondisi Pasca Persetujuan ({dn.conditions.length})</h2>
              <div className="space-y-3">
                {dn.conditions.map((c, i) => (
                  <div key={c.id} className="flex gap-3 p-3 rounded-xl bg-gray-50">
                    <span className="w-6 h-6 bg-[#002D62] text-white text-xs rounded-full flex items-center justify-center shrink-0 font-bold">{i+1}</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{c.condition_text}</p>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</span>
                        {c.due_date && <span className="text-xs text-gray-400">Batas: {formatDate(c.due_date)}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-2xl border p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Aksi</h2>
            <div className="flex flex-wrap gap-3">
              {canSubmit && (
                <button onClick={() => submitDN(dn.id)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
                  <CheckCircle2 className="w-4 h-4" /> Ajukan ke DK
                </button>
              )}
              {canVerifyDK && (
                <button onClick={() => verifyDK(dn.id)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-yellow-600 rounded-xl hover:bg-yellow-700 transition-colors">
                  <CheckCircle2 className="w-4 h-4" /> Verifikasi DK
                </button>
              )}
              {canVerifyBOH && (
                <button onClick={() => verifyBOH(dn.id)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors">
                  <CheckCircle2 className="w-4 h-4" /> Verifikasi BOH
                </button>
              )}
              {canComplete && (
                <button onClick={() => completeDN(dn.id)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors">
                  <CheckCircle2 className="w-4 h-4" /> Selesaikan DN
                </button>
              )}
              <Link href={`/decision-notes/${dn.id}/upload`}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#002D62] bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                <UploadCloud className="w-4 h-4" /> Upload Bukti
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar – Timeline */}
        <div className="bg-white rounded-2xl border p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Progress</h2>
          <StatusTimeline
            status={dn.status}
            timestamps={{
              submitted_at: dn.submitted_at,
              verified_dk_at: dn.verified_dk_at,
              verified_boh_at: dn.verified_boh_at,
              completed_at: dn.completed_at,
            }}
          />
          {dn.notes && (
            <div className="mt-5 pt-5 border-t">
              <p className="text-xs font-semibold text-gray-500 mb-1">Catatan</p>
              <p className="text-sm text-gray-700">{dn.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
