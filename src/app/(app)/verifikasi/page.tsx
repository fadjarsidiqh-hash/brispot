'use client'

import { useDN, requiresBOH, BOH_THRESHOLD } from '@/hooks/useDN'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { CheckCircle2, XCircle, Clock, FileText, Loader2, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import type { DecisionNote } from '@/types'
import { useI18n } from '@/contexts/I18nContext'

const STATUS_PILL: Record<string, string> = {
  SUBMITTED:       'bg-[#e8f0fe] text-[#003087]',
  DECIDED_MANAGER: 'bg-[#e0f2f1] text-[#00897b]',
  DECIDED_BOH:     'bg-[#fffbe0] text-[#b8890a]',
  VERIFIED_ADK:    'bg-[#f3e8ff] text-[#7c3aed]',
}

const SLIK_BADGE: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  HIJAU:  { bg: '#e8f5e9', color: '#16a34a', dot: '#16a34a', label: 'SLIK Hijau' },
  KUNING: { bg: '#fff8e1', color: '#b8890a', dot: '#f0b429', label: 'SLIK Kuning' },
  MERAH:  { bg: '#ffebee', color: '#CC0000', dot: '#CC0000', label: 'SLIK Merah' },
}

export default function VerifikasiPage() {
  const { profile } = useAuth()
  const { list, loading, error, fetchList, decideManager, decideBOH, verifyADK, completeDN, rejectDN, requestRevision } = useDN()
  const { t } = useI18n()
  const [selected, setSelected] = useState<DecisionNote | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [acting, setActing] = useState(false)
  const [selectedConfid, setSelectedConfid] = useState<'UMUM' | 'RAHASIA'>('UMUM')

  const role = profile?.role
  const queue = list.filter((dn) => {
    if (role === 'MANAGER' || role === 'ADMIN') return dn.status === 'SUBMITTED'
    if (role === 'BOH') return dn.status === 'DECIDED_MANAGER' && requiresBOH(dn)
    if (role === 'ADK') return (
      dn.status === 'DECIDED_BOH' ||
      (dn.status === 'DECIDED_MANAGER' && !requiresBOH(dn))
    )
    return false
  })

  // True when the current user is acting as a pemutus (Manager/BOH/Admin) on this DN.
  const isDeciderFor = (dn: DecisionNote) =>
    ((role === 'MANAGER' || role === 'ADMIN') && dn.status === 'SUBMITTED') ||
    (role === 'BOH' && dn.status === 'DECIDED_MANAGER')

  const handleDecide = async (dn: DecisionNote) => {
    if (!profile) return
    setActing(true)
    try {
      if ((role === 'MANAGER' || role === 'ADMIN') && dn.status === 'SUBMITTED') {
        await decideManager(dn.id, selectedConfid, profile.id, rejectNotes.trim() || undefined)
      } else if (role === 'BOH' && dn.status === 'DECIDED_MANAGER') {
        await decideBOH(dn.id, selectedConfid, profile.id, rejectNotes.trim() || undefined)
      } else {
        // ADK: verifikasi lalu langsung selesaikan (satu langkah)
        await verifyADK(dn.id, profile.id)
        await completeDN(dn.id)
      }
      await fetchList()
      setSelected(null)
      setSelectedConfid('UMUM')
      setRejectNotes('')
    } finally {
      setActing(false)
    }
  }

  const handleReject = async (dn: DecisionNote) => {
    if (!profile) return
    setActing(true)
    try {
      const rejectedBy =
        role === 'MANAGER' || role === 'ADMIN' ? { manager_id: profile.id }
        : role === 'BOH' ? { boh_id: profile.id }
        : { adk_id: profile.id }
      await rejectDN(dn.id, rejectNotes, rejectedBy)
      await fetchList()
      setSelected(null)
      setRejectNotes('')
    } finally {
      setActing(false)
    }
  }

  const handleRequestRevision = async (dn: DecisionNote) => {
    if (!profile) return
    if (!rejectNotes.trim()) return
    setActing(true)
    try {
      const currentStatus = dn.status as 'SUBMITTED' | 'DECIDED_MANAGER' | 'DECIDED_BOH'
      await requestRevision(dn.id, rejectNotes, profile.id, currentStatus)
      await fetchList()
      setSelected(null)
      setRejectNotes('')
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h1 className="text-[13px] font-bold text-[#002470]">{t.verif.title}</h1>
        <p className="text-[9px] text-[#9ca3af]">
          {role === 'BOH' || role === 'ADMIN' ? t.verif.subtitle : t.verif.subtitle}
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
            <div className="flex items-center justify-center h-40 text-[11px] text-[#9ca3af]">{t.common.loading}</div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 px-4">
              <p className="text-[10px] text-[#CC0000] font-medium text-center">{error}</p>
              <button onClick={fetchList} className="px-3 py-1.5 text-[9px] font-semibold text-white bg-[#003087] rounded-lg hover:bg-[#002470]">
                Coba Lagi
              </button>
            </div>
          ) : queue.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[11px] text-[#9ca3af]">{t.verif.empty}</div>
          ) : (
            <div className="divide-y divide-[#e8ecf4]">
              {queue.map((dn) => (
                <button
                  key={dn.id}
                  onClick={() => { setSelected(dn); setRejectNotes('') }}
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
                      {(t.status as Record<string, string>)[dn.status] ?? dn.status}
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
              <p className="text-[11px]">{t.common.noData}</p>
            </div>
          ) : (
            <>
              <div className="bg-[#003087] text-white px-3.5 py-2.5 text-[10px] font-bold flex items-center justify-between">
                <span>Detail DN: {selected.dn_number}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${STATUS_PILL[selected.status] ?? 'bg-white/20 text-white'}`}>
                  {(t.status as Record<string, string>)[selected.status] ?? selected.status}
                </span>
              </div>

              <div className="p-4 space-y-4">
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                  {([
                    [t.dnDetail.debtorName, selected.debtor_name],
                    [t.dnDetail.cif, selected.debtor_cif],
                    [t.dnDetail.creditType, selected.credit_type],
                    [t.dnDetail.creditAmount, formatCurrency(selected.credit_amount)],
                    [t.dnDetail.approvalDate, formatDate(selected.approval_date)],
                    [t.common.no === 'No' ? 'Submitted' : 'Diajukan', selected.submitted_at ? formatDate(selected.submitted_at) : '—'],
                    [t.dnDetail.dueDate, selected.due_date ? formatDate(selected.due_date) : '—'],
                    [t.common.branch, selected.branch_code],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="contents">
                      <span className="text-[#9ca3af]">{label}</span>
                      <span className="font-medium text-[#002470]">{value}</span>
                    </div>
                  ))}
                </div>

                {/* SLIK badge + routing hint */}
                <div className="flex flex-wrap items-center gap-2">
                  {selected.slik_status && SLIK_BADGE[selected.slik_status] && (
                    <span
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: SLIK_BADGE[selected.slik_status].bg, color: SLIK_BADGE[selected.slik_status].color }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: SLIK_BADGE[selected.slik_status].dot }} />
                      {SLIK_BADGE[selected.slik_status].label}
                    </span>
                  )}
                  <span className="inline-flex items-center text-[9px] font-semibold px-2 py-1 rounded-full bg-[#f0f4f8] text-[#475569]">
                    {requiresBOH(selected)
                      ? (selected.slik_status === 'MERAH' && selected.credit_amount <= BOH_THRESHOLD
                          ? 'SLIK Merah → wajib BOH'
                          : 'Plafond > Rp1 M → wajib BOH')
                      : 'Plafond ≤ Rp1 M & SLIK aman → cukup CBM / Manager'}
                  </span>
                </div>

                {/* Evidence list (placeholder) */}
                <div>
                  <div className="text-[9px] font-bold text-[#002470] mb-1.5">{t.verif.evidenceTitle}</div>
                  <div className="text-[10px] text-[#9ca3af] bg-[#fafbfc] rounded-lg border border-[#e8ecf4] px-3 py-3">
                    {t.verif.evidenceEmpty}
                    <Link href={`/decision-notes/${selected.id}/upload`} className="ml-1 text-[#003087] font-medium hover:underline">{t.verif.uploadLink}</Link>
                  </div>
                </div>

                {/* Pemutus (Manager/BOH): confidentiality selector */}
                {isDeciderFor(selected) && (
                  <div>
                    <label className="block text-[9px] font-bold text-[#002470] mb-1">{t.verif.confidLabel}</label>
                    <select
                      value={selectedConfid}
                      onChange={(e) => setSelectedConfid(e.target.value as 'UMUM' | 'RAHASIA')}
                      className="w-full border border-[#e8ecf4] rounded-lg px-3 py-2 text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#003087] transition-colors"
                    >
                      <option value="UMUM">{t.verif.confidUmum}</option>
                      <option value="RAHASIA">{t.verif.confidRahasia}</option>
                    </select>
                  </div>
                )}

                {/* Catatan dari pemutus sebelumnya — shown to BOH & ADK */}
                {(role === 'BOH' || role === 'ADK') && selected.manager_notes && (
                  <div className="rounded-lg bg-[#e0f2f1] border border-[#80cbc4] p-3">
                    <div className="text-[9px] font-bold text-[#00695c] mb-1.5">Catatan Putusan dari CBM / Manager</div>
                    <p className="text-[10.5px] text-[#004d40] leading-relaxed whitespace-pre-wrap">{selected.manager_notes}</p>
                  </div>
                )}
                {role === 'ADK' && selected.boh_notes && (
                  <div className="rounded-lg bg-[#fffbe0] border border-[#f0e08a] p-3">
                    <div className="text-[9px] font-bold text-[#b8890a] mb-1.5">Catatan Putusan dari BOH</div>
                    <p className="text-[10.5px] text-[#7a5e10] leading-relaxed whitespace-pre-wrap">{selected.boh_notes}</p>
                  </div>
                )}

                {/* Catatan — for Manager/BOH (decision notes), for ADK (rejection reason only) */}
                {isDeciderFor(selected) && (
                  <div>
                    <label className="block text-[9px] font-bold text-[#002470] mb-1">
                      {role === 'BOH' ? 'Catatan Putusan BOH' : 'Catatan Putusan CBM / Manager'}
                      <span className="text-[#9ca3af] font-normal ml-1">(opsional untuk setuju · wajib untuk tolak/revisi)</span>
                    </label>
                    <textarea
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      rows={3}
                      placeholder="Catatan putusan, syarat pencairan, atau alasan penolakan..."
                      className="w-full border border-[#e8ecf4] rounded-lg px-3 py-2 text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/10 resize-none transition-colors"
                    />
                  </div>
                )}
                {role === 'ADK' && (
                  <div>
                    <label className="block text-[9px] font-bold text-[#002470] mb-1">
                      Alasan Penolakan / Revisi
                      <span className="text-[#9ca3af] font-normal ml-1">(wajib diisi jika menolak atau minta revisi)</span>
                    </label>
                    <textarea
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      rows={2}
                      placeholder="Tulis alasan penolakan atau permintaan revisi dokumen..."
                      className="w-full border border-[#e8ecf4] rounded-lg px-3 py-2 text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#CC0000] focus:ring-2 focus:ring-[#CC0000]/10 resize-none transition-colors"
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => handleDecide(selected)}
                    className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold text-white bg-[#22c55e] rounded-lg hover:bg-[#16a34a] transition-colors disabled:opacity-50"
                    disabled={acting}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isDeciderFor(selected)
                      ? (requiresBOH(selected) ? 'Putuskan → Teruskan ke BOH' : 'Setujui / Putuskan (CBM)')
                      : t.verif.approveADK}
                  </button>
                  <button
                    onClick={() => handleRequestRevision(selected)}
                    disabled={acting || !rejectNotes.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold text-white bg-[#f0b429] rounded-lg hover:bg-[#d4a020] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="DN akan dikembalikan ke RM untuk dilengkapi dokumennya"
                  >
                    {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {t.verif.requestRevision}
                  </button>
                  <button
                    onClick={() => handleReject(selected)}
                    disabled={acting || !rejectNotes.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold text-white bg-[#CC0000] rounded-lg hover:bg-[#a00000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    {t.verif.rejectBtn}
                  </button>
                  <button
                    onClick={() => { setSelected(null); setRejectNotes('') }}
                    disabled={acting}
                    className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold text-[#002470] bg-[#f0f4f8] border border-[#e8ecf4] rounded-lg hover:bg-[#e8ecf4] transition-colors disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5" /> {t.verif.postpone}
                  </button>
                  <Link
                    href={`/decision-notes/${selected.id}`}
                    className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold text-[#003087] bg-[#e8f0fe] rounded-lg hover:bg-[#d1e3fc] transition-colors"
                  >
                    {t.verif.viewDetail}
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

