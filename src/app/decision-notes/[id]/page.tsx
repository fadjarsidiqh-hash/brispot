'use client'

import { useDN } from '@/hooks/useDN'
import { useAuth } from '@/hooks/useAuth'
import { StatusTimeline } from '@/components/StatusTimeline'
import { EscalationCountdown } from '@/components/EscalationCountdown'
import { STATUS_LABELS, PRIORITY_COLORS, formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, UploadCloud, CheckCircle2 } from 'lucide-react'
import { useParams } from 'next/navigation'

const STATUS_PILL: Record<string, string> = {
  ESCALATED:    'bg-[#fff0f0] text-[#CC0000]',
  COMPLETED:    'bg-[#e8f5e9] text-[#16a34a]',
  SUBMITTED:    'bg-[#e8f0fe] text-[#003087]',
  VERIFIED_DK:  'bg-[#fffbe0] text-[#b8890a]',
  VERIFIED_BOH: 'bg-[#f3e8ff] text-[#7c3aed]',
  DRAFT:        'bg-[#f0f2f7] text-[#718096]',
  REJECTED:     'bg-[#fff0f0] text-[#CC0000]',
}

const COND_STATUS_PILL: Record<string, string> = {
  PENDING:   'bg-[#f0f2f7] text-[#718096]',
  FULFILLED: 'bg-[#e8f5e9] text-[#16a34a]',
  WAIVED:    'bg-[#fffbe0] text-[#b8890a]',
}

export default function DNDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { dn, loading, submitDN, verifyDK, verifyBOH, completeDN } = useDN(id)
  const { profile } = useAuth()

  if (loading) return <div className="flex items-center justify-center h-64 text-[11px] text-[#9ca3af]">Memuat...</div>
  if (!dn) return <div className="flex items-center justify-center h-64 text-[11px] text-[#9ca3af]">DN tidak ditemukan</div>

  const canSubmit    = dn.status === 'DRAFT'        && profile?.id === dn.ao_id
  const canVerifyDK  = dn.status === 'SUBMITTED'    && (profile?.role === 'DK'  || profile?.role === 'ADMIN')
  const canVerifyBOH = dn.status === 'VERIFIED_DK'  && (profile?.role === 'BOH' || profile?.role === 'ADMIN')
  const canComplete  = dn.status === 'VERIFIED_BOH' && (profile?.role === 'DK'  || profile?.role === 'BOH' || profile?.role === 'ADMIN')

  return (
    <div className="space-y-3.5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Link href="/decision-notes" className="p-1.5 rounded-lg hover:bg-[#e8ecf4] text-[#718096] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[13px] font-bold text-[#002470] truncate">{dn.dn_number}</h1>
          <p className="text-[9px] text-[#9ca3af]">{dn.title}</p>
        </div>
        <span className={`text-[9px] px-2.5 py-1 rounded-full font-semibold ${STATUS_PILL[dn.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {STATUS_LABELS[dn.status]}
        </span>
      </div>

      {/* Escalation countdown */}
      {dn.escalation_date && !['COMPLETED','REJECTED'].includes(dn.status) && (
        <EscalationCountdown escalationDate={dn.escalation_date} />
      )}

      {/* Status Timeline */}
      <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-3.5">
        <div className="text-[10px] font-bold text-[#002470] mb-2">Progress Status</div>
        <StatusTimeline
          status={dn.status}
          timestamps={{
            submitted_at:   dn.submitted_at,
            verified_dk_at: dn.verified_dk_at,
            verified_boh_at:dn.verified_boh_at,
            completed_at:   dn.completed_at,
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left: Info + Conditions */}
        <div className="lg:col-span-2 space-y-3">
          {/* Info card */}
          <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
            <div className="bg-[#003087] text-white px-3.5 py-2.5 text-[10px] font-bold">
              Informasi Debitur &amp; Kredit
            </div>
            <div className="p-3.5 grid grid-cols-2 gap-y-2.5 text-[11px]">
              {([
                ['Nama Debitur', dn.debtor_name],
                ['CIF', dn.debtor_cif],
                ['Jenis Kredit', dn.credit_type],
                ['Jumlah Kredit', formatCurrency(dn.credit_amount)],
                ['Tgl. Persetujuan', formatDate(dn.approval_date)],
                ['No. Persetujuan', dn.approval_number ?? '—'],
                ['Cabang', dn.branch_code],
                ['Batas Penyelesaian', dn.due_date ? formatDate(dn.due_date) : '—'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="contents">
                  <span className="text-[#9ca3af]">{label}</span>
                  <span className="font-medium text-[#002470]">{value}</span>
                </div>
              ))}
              <span className="text-[#9ca3af]">Prioritas</span>
              <span><span className={`text-[8px] px-2 py-0.5 rounded-full font-semibold ${PRIORITY_COLORS[dn.priority]}`}>{dn.priority}</span></span>
            </div>
          </div>

          {/* Conditions */}
          {dn.conditions && dn.conditions.length > 0 && (
            <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
              <div className="bg-[#003087] text-white px-3.5 py-2.5 text-[10px] font-bold">
                Kondisi Pasca Persetujuan ({dn.conditions.length})
              </div>
              <div className="p-3.5 space-y-2">
                {dn.conditions.map((c, i) => (
                  <div key={c.id} className="flex gap-2.5 p-2.5 rounded-lg bg-[#fafbfc] border border-[#e8ecf4]">
                    <span className="w-5 h-5 bg-[#003087] text-white text-[8px] rounded-full flex items-center justify-center shrink-0 font-bold">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[#002470]">{c.condition_text}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${COND_STATUS_PILL[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {c.status}
                        </span>
                        {c.due_date && <span className="text-[8px] text-[#9ca3af]">Batas: {formatDate(c.due_date)}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-3.5">
            <div className="text-[10px] font-bold text-[#002470] mb-3">Aksi</div>
            <div className="flex flex-wrap gap-2">
              {canSubmit && (
                <button onClick={() => submitDN(dn.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-white bg-[#003087] rounded-lg hover:bg-[#002470] transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ajukan ke DK
                </button>
              )}
              {canVerifyDK && (
                <button onClick={() => verifyDK(dn.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-[#002470] bg-[#f0b429] rounded-lg hover:bg-[#d4a020] transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verifikasi DK
                </button>
              )}
              {canVerifyBOH && (
                <button onClick={() => verifyBOH(dn.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-white bg-[#7c3aed] rounded-lg hover:bg-[#6d28d9] transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verifikasi BOH
                </button>
              )}
              {canComplete && (
                <button onClick={() => completeDN(dn.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-white bg-[#22c55e] rounded-lg hover:bg-[#16a34a] transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Selesaikan DN
                </button>
              )}
              <Link href={`/decision-notes/${dn.id}/upload`}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-[#003087] bg-[#e8f0fe] rounded-lg hover:bg-[#d1e3fc] transition-colors">
                <UploadCloud className="w-3.5 h-3.5" /> Upload Bukti
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Notes */}
        {dn.notes && (
          <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-3.5">
            <div className="text-[10px] font-bold text-[#002470] mb-2">Catatan</div>
            <p className="text-[11px] text-[#4a5568] leading-relaxed">{dn.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

