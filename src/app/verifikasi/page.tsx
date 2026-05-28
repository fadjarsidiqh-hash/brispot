'use client'

import { useDN } from '@/hooks/useDN'
import { useAuth } from '@/hooks/useAuth'
import { STATUS_LABELS, formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { CheckCircle2, XCircle, Clock, FileText } from 'lucide-react'
import { useState } from 'react'
import type { DecisionNote } from '@/types'

const STATUS_PILL: Record<string, string> = {
  SUBMITTED:    'bg-[#e8f0fe] text-[#003087]',
  VERIFIED_DK:  'bg-[#fffbe0] text-[#b8890a]',
}

export default function VerifikasiPage() {
  const { profile } = useAuth()
  const { list, loading, verifyDK, verifyBOH } = useDN()
  const [selected, setSelected] = useState<DecisionNote | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')

  const role = profile?.role
  const queue = list.filter((dn) => {
    if (role === 'DK' || role === 'ADMIN') return dn.status === 'SUBMITTED'
    if (role === 'BOH') return dn.status === 'VERIFIED_DK'
    return false
  })

  const handleVerify = (dn: DecisionNote) => {
    if (dn.status === 'SUBMITTED') verifyDK(dn.id)
    else if (dn.status === 'VERIFIED_DK') verifyBOH(dn.id)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h1 className="text-[13px] font-bold text-[#002470]">Antrian Verifikasi</h1>
        <p className="text-[9px] text-[#9ca3af]">
          {role === 'DK' || role === 'ADMIN' ? 'DN yang menunggu verifikasi DK' : 'DN yang menunggu verifikasi BOH'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-3">
        {/* ── Left: Queue list ── */}
        <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
          <div className="bg-[#003087] text-white px-3.5 py-2.5 text-[10px] font-bold flex items-center justify-between">
            <span>Antrian DN</span>
            <span className="bg-white/20 rounded-full px-2 py-0.5 text-[9px]">{queue.length} item</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40 text-[11px] text-[#9ca3af]">Memuat...</div>
          ) : queue.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[11px] text-[#9ca3af]">Antrian kosong ✓</div>
          ) : (
            <div className="divide-y divide-[#e8ecf4]">
              {queue.map((dn) => (
                <button
                  key={dn.id}
                  onClick={() => setSelected(dn)}
                  className={`w-full text-left px-3.5 py-2.5 border-l-4 transition-colors ${
                    selected?.id === dn.id
                      ? 'bg-[rgba(240,180,41,0.08)] border-l-[#f0b429]'
                      : 'border-l-[#003087] hover:bg-[#f8fafc]'
                  }`}
                >
                  <div className="text-[10px] font-semibold text-[#002470]">{dn.dn_number}</div>
                  <div className="text-[9px] text-[#4a5568] mt-0.5">{dn.debtor_name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] text-[#9ca3af]">{formatCurrency(dn.credit_amount)}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_PILL[dn.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[dn.status]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Detail panel ── */}
        <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-[#9ca3af]">
              <FileText className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-[11px]">Pilih DN dari antrian untuk melihat detail</p>
            </div>
          ) : (
            <>
              <div className="bg-[#003087] text-white px-3.5 py-2.5 text-[10px] font-bold flex items-center justify-between">
                <span>Detail DN: {selected.dn_number}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[selected.status] ?? 'bg-white/20 text-white'}`}>
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>

              <div className="p-4 space-y-4">
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                  {([
                    ['Nama Debitur', selected.debtor_name],
                    ['CIF', selected.debtor_cif],
                    ['Jenis Kredit', selected.credit_type],
                    ['Jumlah Kredit', formatCurrency(selected.credit_amount)],
                    ['Tgl. Persetujuan', formatDate(selected.approval_date)],
                    ['Diajukan', selected.submitted_at ? formatDate(selected.submitted_at) : '—'],
                    ['Batas Waktu', selected.due_date ? formatDate(selected.due_date) : '—'],
                    ['Cabang', selected.branch_code],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="contents">
                      <span className="text-[#9ca3af]">{label}</span>
                      <span className="font-medium text-[#002470]">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Evidence list (placeholder) */}
                <div>
                  <div className="text-[9px] font-bold text-[#002470] mb-1.5">Bukti / Evidence</div>
                  <div className="text-[10px] text-[#9ca3af] bg-[#fafbfc] rounded-lg border border-[#e8ecf4] px-3 py-3">
                    Belum ada bukti yang diunggah untuk DN ini.
                    <Link href={`/decision-notes/${selected.id}/upload`} className="ml-1 text-[#003087] font-medium hover:underline">Upload →</Link>
                  </div>
                </div>

                {/* Reject notes */}
                <div>
                  <label className="block text-[9px] font-bold text-[#002470] mb-1">Catatan / Alasan Penolakan (opsional)</label>
                  <textarea
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    rows={3}
                    placeholder="Masukkan catatan jika perlu..."
                    className="w-full border border-[#e8ecf4] rounded-lg px-3 py-2 text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/10 resize-none transition-colors"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => handleVerify(selected)}
                    className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold text-white bg-[#22c55e] rounded-lg hover:bg-[#16a34a] transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {selected.status === 'SUBMITTED' ? 'Setujui (DK)' : 'Setujui (BOH)'}
                  </button>
                  <button
                    className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold text-white bg-[#CC0000] rounded-lg hover:bg-[#a00000] transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Tolak
                  </button>
                  <button
                    className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold text-[#002470] bg-[#f0f4f8] border border-[#e8ecf4] rounded-lg hover:bg-[#e8ecf4] transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" /> Tunda
                  </button>
                  <Link
                    href={`/decision-notes/${selected.id}`}
                    className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold text-[#003087] bg-[#e8f0fe] rounded-lg hover:bg-[#d1e3fc] transition-colors"
                  >
                    Lihat Detail DN →
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

