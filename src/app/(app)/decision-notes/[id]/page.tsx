'use client'

import { useDN, requiresBOH, BOH_THRESHOLD } from '@/hooks/useDN'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { StatusTimeline } from '@/components/StatusTimeline'
import { EscalationCountdown } from '@/components/EscalationCountdown'
import { PRIORITY_COLORS, formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, UploadCloud, CheckCircle2, Lock, Globe, XCircle, Plus, Trash2, Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useI18n } from '@/contexts/I18nContext'

// Daftar tindak lanjut standar sesuai flowchart BRISPOT
const STD_TINDAK_LANJUT: { value: string; label: string }[] = [
  { value: 'PELUNASAN_PINJAMAN', label: 'Pelunasan Pinjaman Lain' },
  { value: 'FLAGGING_TASPEN',    label: 'Flagging Taspen' },
  { value: 'PEMASANGAN_QRIS',    label: 'Pemasangan QRIS' },
  { value: 'PAYROLL_AKTIF',      label: 'Payroll Aktif' },
  { value: 'PENGKINIAN_DATA',    label: 'Pengkinian Data' },
  { value: 'PEMENUHAN_DOKUMEN',  label: 'Pemenuhan Dokumen' },
  { value: 'LAINNYA',            label: 'Lainnya' },
]

type DraftCondition = {
  condition_type: string
  condition_text: string
  requirement_type: 'EVIDENCE' | 'CHECKLIST'
  due_date: string
}

const STATUS_PILL: Record<string, string> = {
  ESCALATED:    'bg-[#fff0f0] text-[#CC0000]',
  COMPLETED:    'bg-[#e8f5e9] text-[#16a34a]',
  SUBMITTED:    'bg-[#e8f0fe] text-[#003087]',
  DECIDED_MANAGER: 'bg-[#e0f2f1] text-[#00897b]',
  DECIDED_BOH:  'bg-[#fffbe0] text-[#b8890a]',
  VERIFIED_ADK: 'bg-[#f3e8ff] text-[#7c3aed]',
  DRAFT:        'bg-[#f0f2f7] text-[#718096]',
  REJECTED:     'bg-[#fff0f0] text-[#CC0000]',
  NEEDS_REVISION: 'bg-[#fff8e1] text-[#b8890a]',
}

const SLIK_BADGE: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  HIJAU:  { bg: '#e8f5e9', color: '#16a34a', dot: '#16a34a', label: 'SLIK Hijau' },
  KUNING: { bg: '#fff8e1', color: '#b8890a', dot: '#f0b429', label: 'SLIK Kuning' },
  MERAH:  { bg: '#ffebee', color: '#CC0000', dot: '#CC0000', label: 'SLIK Merah' },
}

const COND_STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING:     { label: 'NEW',                 cls: 'bg-[#e8f0fe] text-[#003087]' },
  IN_PROGRESS: { label: 'IN PROGRESS',         cls: 'bg-[#fff8e1] text-[#b8890a]' },
  COMPLETED:   { label: 'CLOSED',              cls: 'bg-[#e8f5e9] text-[#16a34a]' },
  OVERDUE:     { label: 'OVERDUE',             cls: 'bg-[#fff0f0] text-[#CC0000]' },
  WAIVED:      { label: 'WAIVED',              cls: 'bg-[#f0f2f7] text-[#718096]' },
}

export default function DNDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { dn, loading, error, submitDN, decideManager, decideBOH, verifyADK, completeDN, resubmitDN, rejectDN, fetchOne } = useDN(id)
  const { profile } = useAuth()
  const { t } = useI18n()
  const supabase = createClient()
  const [confid, setConfid] = useState<'UMUM' | 'RAHASIA'>('UMUM')
  const [acting, setActing] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [bohNotes, setBohNotes] = useState('')
  const [draftConds, setDraftConds] = useState<DraftCondition[]>([])
  // 'manager' | 'boh' | 'adk' — which role is triggering the reject modal
  const [rejectRole, setRejectRole] = useState<'manager' | 'boh' | 'adk'>('boh')
  // Track whether the user has typed notes that haven't been saved yet
  const [notesIsDirty, setNotesIsDirty] = useState(false)

  const act = async (fn: () => Promise<unknown>, opts?: { clearDraft?: boolean }) => {
    setActing(true)
    try {
      await fn()
      await fetchOne(id)
      setNotesIsDirty(false)
      if (opts?.clearDraft) setDraftConds([])
    } finally {
      setActing(false)
    }
  }

  const addDraftCond = () =>
    setDraftConds((p) => [...p, { condition_type: 'PELUNASAN_PINJAMAN', condition_text: 'Pelunasan Pinjaman Lain', requirement_type: 'CHECKLIST', due_date: '' }])
  const updateDraftCond = (i: number, patch: Partial<DraftCondition>) =>
    setDraftConds((p) => p.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const removeDraftCond = (i: number) => setDraftConds((p) => p.filter((_, idx) => idx !== i))

  // Simpan tindak lanjut (draft) ke dn_conditions lalu jalankan putusan
  const insertDraftConds = async (dnId: string) => {
    if (draftConds.length === 0) return
    await supabase.from('dn_conditions').insert(
      draftConds.map((c, i) => ({
        dn_id: dnId,
        condition_text: c.condition_text.trim() || c.condition_type,
        condition_type: c.condition_type,
        requirement_type: c.requirement_type,
        due_date: c.due_date || null,
        status: 'PENDING' as const,
        sort_order: i,
      }))
    )
  }

  // PIC menandai status pelaksanaan sebuah tindak lanjut
  const setCondStatus = (condId: string, status: 'IN_PROGRESS' | 'COMPLETED') =>
    act(async () => {
      await supabase
        .from('dn_conditions')
        .update({ status, completed_at: status === 'COMPLETED' ? new Date().toISOString() : null })
        .eq('id', condId)
    })

  // Sync confidentiality selector with the value already saved in DB so BOH/Manager
  // never accidentally overwrite it with the default 'UMUM' on re-open.
  useEffect(() => {
    if (dn?.confidentiality) setConfid(dn.confidentiality)
  }, [dn?.id])

  // Pre-fill notes textarea with values already persisted — data survives page refresh.
  // Also reset dirty flag so the beforeunload guard doesn't fire on first load.
  useEffect(() => {
    if (!dn || !profile) return
    if (profile.role === 'BOH' && dn.boh_notes) setBohNotes(dn.boh_notes)
    else if ((profile.role === 'MANAGER' || profile.role === 'ADMIN') && dn.manager_notes) setBohNotes(dn.manager_notes)
    setNotesIsDirty(false)
  }, [dn?.id, profile?.id])

  // Warn before closing/reloading the tab when the user has unsaved notes or draft conditions.
  // The browser shows a generic "Leave site?" dialog — custom messages are not supported.
  useEffect(() => {
    const isDirty = notesIsDirty || draftConds.length > 0
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [notesIsDirty, draftConds.length])

  // Show full-page spinner only while initial data loads, NOT while an action is in flight.
  // Keeping the page visible during `acting` lets users read the DN and avoids the
  // appearance of a broken / unresponsive page.
  if (loading) return <div className="flex items-center justify-center h-64 text-[11px] text-[#9ca3af]">{t.common.loading}</div>
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-[11px] text-[#CC0000] font-medium text-center max-w-xs">{error}</p>
      <button onClick={() => fetchOne(id)} className="px-3 py-2 text-[10px] font-semibold text-white bg-[#003087] rounded-lg hover:bg-[#002470]">
        Coba Lagi
      </button>
    </div>
  )
  if (!dn) return <div className="flex items-center justify-center h-64 text-[11px] text-[#9ca3af]">{t.common.notFound}</div>

  // Access guard for confidential DNs
  const isAuthorisedForConfidential =
    profile?.role === 'ADMIN' ||
    profile?.id === dn.rm_id ||
    profile?.id === dn.adk_id ||
    profile?.id === dn.boh_id ||
    profile?.id === dn.manager_id
  if (dn.confidentiality === 'RAHASIA' && !isAuthorisedForConfidential) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Lock className="w-10 h-10 text-[#CC0000] opacity-70" />
        <p className="text-[13px] font-bold text-[#002470]">{t.dnDetail.accessDenied}</p>
        <p className="text-[11px] text-[#9ca3af] text-center max-w-xs">
          {t.dnDetail.accessMsg}
        </p>
        <Link href="/decision-notes" className="text-[11px] text-[#003087] hover:underline">
          {t.dnDetail.backToList}
        </Link>
      </div>
    )
  }

  const canSubmit       = dn.status === 'DRAFT'           && profile?.id === dn.rm_id
  const canDecideManager= dn.status === 'SUBMITTED'       && (profile?.role === 'MANAGER' || profile?.role === 'ADMIN')
  const canDecideBOH    = dn.status === 'DECIDED_MANAGER' && requiresBOH(dn) && (profile?.role === 'BOH' || profile?.role === 'ADMIN')
  const canVerifyADK    = (dn.status === 'DECIDED_BOH' || (dn.status === 'DECIDED_MANAGER' && !requiresBOH(dn))) && (profile?.role === 'ADK' || profile?.role === 'ADMIN')
  const canComplete     = dn.status === 'VERIFIED_ADK'    && (profile?.role === 'ADK'  || profile?.role === 'ADMIN')
  const canResubmit     = dn.status === 'NEEDS_REVISION'  && profile?.id === dn.rm_id

  // DN sudah diputus final (menunggu verifikasi ADK) → masuk fase pelaksanaan PIC
  const isFinalDecided  = dn.status === 'DECIDED_BOH' || (dn.status === 'DECIDED_MANAGER' && !requiresBOH(dn))
  const isPIC =
    profile?.role === 'ADMIN' ||
    (dn.pic_type === 'RM'   && profile?.id === dn.rm_id) ||
    (dn.pic_type === 'ADK'  && profile?.role === 'ADK') ||
    (dn.pic_type === 'BOTH' && (profile?.id === dn.rm_id || profile?.role === 'ADK'))
  const canExecuteConditions = isFinalDecided && isPIC

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
          {(t.status as Record<string, string>)[dn.status] ?? dn.status}
        </span>
        {dn.confidentiality === 'RAHASIA' ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2.5 py-1 rounded-full bg-[#fff0f0] text-[#CC0000]">
            <Lock className="w-2.5 h-2.5" /> {t.dnDetail.confidential}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2.5 py-1 rounded-full bg-[#e8f5e9] text-[#16a34a]">
            <Globe className="w-2.5 h-2.5" /> {t.dnDetail.general}
          </span>
        )}
      </div>

      {/* Escalation countdown */}
      {dn.escalation_date && !['COMPLETED','REJECTED'].includes(dn.status) && (
        <EscalationCountdown escalationDate={dn.escalation_date} />
      )}

      {/* ── Catatan Pemutus (formal review panel) ───────────────────────── */}
      {(dn.manager_id || dn.boh_id || dn.adk_id || dn.status === 'REJECTED') && (
        <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
          <div className="bg-[#002470] text-white px-3.5 py-2.5 text-[10px] font-bold flex items-center gap-2">
            <span>📋</span> Catatan Pemutus
          </div>
          <div className="divide-y divide-[#e8ecf4]">

            {/* Manager Decision row */}
            {dn.manager_id && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#00897b] text-white text-[8px] font-bold flex items-center justify-center">CBM</div>
                    <span className="text-[10px] font-bold text-[#002470]">Pemutus (CBM / Manager)</span>
                  </div>
                  {dn.decided_manager_at && (
                    <span className="text-[9px] text-[#9ca3af]">
                      {new Date(dn.decided_manager_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 text-[10.5px] mb-3">
                  <span className="text-[#9ca3af]">Nama Pemutus</span>
                  <span className="font-medium text-[#002470]">{dn.manager?.full_name ?? '—'}</span>
                </div>
                {dn.manager_notes ? (
                  <div className="rounded-lg bg-[#e0f2f1] border border-[#80cbc4] p-2.5">
                    <div className="text-[9px] font-bold text-[#00695c] mb-1">Catatan Putusan CBM / Manager</div>
                    <p className="text-[10.5px] text-[#004d40] leading-relaxed whitespace-pre-wrap">{dn.manager_notes}</p>
                  </div>
                ) : (
                  <p className="text-[10px] text-[#9ca3af] italic">Tidak ada catatan dari CBM / Manager</p>
                )}
              </div>
            )}

            {/* BOH Decision row */}
            {(dn.boh_id || dn.status === 'REJECTED') && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#f0b429] text-[#002470] text-[9px] font-bold flex items-center justify-center">BOH</div>
                    <span className="text-[10px] font-bold text-[#002470]">Pemutus (BOH)</span>
                  </div>
                  {dn.decided_boh_at && (
                    <span className="text-[9px] text-[#9ca3af]">
                      {new Date(dn.decided_boh_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 text-[10.5px] mb-3">
                  <span className="text-[#9ca3af]">Nama Pemutus</span>
                  <span className="font-medium text-[#002470]">{dn.boh?.full_name ?? '—'}</span>
                  <span className="text-[#9ca3af]">Kerahasiaan</span>
                  <span>
                    {dn.confidentiality === 'RAHASIA' ? (
                      <span className="inline-flex items-center gap-1 text-[8px] font-semibold px-2 py-0.5 rounded-full bg-[#fff0f0] text-[#CC0000]">
                        <Lock className="w-2 h-2" /> Rahasia
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[8px] font-semibold px-2 py-0.5 rounded-full bg-[#e8f5e9] text-[#16a34a]">
                        <Globe className="w-2 h-2" /> Umum
                      </span>
                    )}
                  </span>
                  {dn.status === 'REJECTED' && dn.boh_id && (
                    <>
                      <span className="text-[#9ca3af]">Status Putusan</span>
                      <span className="text-[8px] font-semibold px-2 py-0.5 rounded-full bg-[#fff0f0] text-[#CC0000] inline-block w-fit">Ditolak</span>
                    </>
                  )}
                </div>
                {dn.boh_notes ? (
                  <div className="rounded-lg bg-[#fffbe0] border border-[#f0e08a] p-2.5">
                    <div className="text-[9px] font-bold text-[#b8890a] mb-1">Catatan Putusan BOH</div>
                    <p className="text-[10.5px] text-[#7a5e10] leading-relaxed whitespace-pre-wrap">{dn.boh_notes}</p>
                  </div>
                ) : (
                  <p className="text-[10px] text-[#9ca3af] italic">Tidak ada catatan dari BOH</p>
                )}
                {/* Reject reason from BOH */}
                {dn.status === 'REJECTED' && dn.boh_id && dn.reject_reason && (
                  <div className="rounded-lg bg-[#fff0f0] border border-[#fca5a5] p-2.5 mt-2">
                    <div className="text-[9px] font-bold text-[#CC0000] mb-1">Alasan Penolakan</div>
                    <p className="text-[10.5px] text-[#7f1d1d] leading-relaxed whitespace-pre-wrap">{dn.reject_reason}</p>
                  </div>
                )}
              </div>
            )}

            {/* ADK Verification row */}
            {dn.adk_id && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#7c3aed] text-white text-[9px] font-bold flex items-center justify-center">ADK</div>
                    <span className="text-[10px] font-bold text-[#002470]">Verifikator (ADK)</span>
                  </div>
                  {dn.verified_adk_at && (
                    <span className="text-[9px] text-[#9ca3af]">
                      {new Date(dn.verified_adk_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                  {dn.rejected_at && !dn.verified_adk_at && (
                    <span className="text-[9px] text-[#9ca3af]">
                      {new Date(dn.rejected_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 text-[10.5px] mb-3">
                  <span className="text-[#9ca3af]">Nama Verifikator</span>
                  <span className="font-medium text-[#002470]">{dn.adk?.full_name ?? '—'}</span>
                  {dn.status === 'REJECTED' && dn.adk_id && (
                    <>
                      <span className="text-[#9ca3af]">Status Verifikasi</span>
                      <span className="text-[8px] font-semibold px-2 py-0.5 rounded-full bg-[#fff0f0] text-[#CC0000] inline-block w-fit">Ditolak</span>
                    </>
                  )}
                </div>
                {dn.adk_notes ? (
                  <div className="rounded-lg bg-[#f3e8ff] border border-[#d8b4fe] p-2.5">
                    <div className="text-[9px] font-bold text-[#7c3aed] mb-1">Catatan Verifikasi ADK</div>
                    <p className="text-[10.5px] text-[#4c1d95] leading-relaxed whitespace-pre-wrap">{dn.adk_notes}</p>
                  </div>
                ) : (
                  <p className="text-[10px] text-[#9ca3af] italic">Tidak ada catatan dari ADK</p>
                )}
                {/* Reject reason from ADK */}
                {dn.status === 'REJECTED' && dn.adk_id && dn.reject_reason && (
                  <div className="rounded-lg bg-[#fff0f0] border border-[#fca5a5] p-2.5 mt-2">
                    <div className="text-[9px] font-bold text-[#CC0000] mb-1">Alasan Penolakan</div>
                    <p className="text-[10.5px] text-[#7f1d1d] leading-relaxed whitespace-pre-wrap">{dn.reject_reason}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revision Request Banner */}
      {dn.status === 'NEEDS_REVISION' && (
        <div className="rounded-[10px] border border-[#f0b429] bg-[#fffbe0] p-3.5">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#f0b429] text-white flex items-center justify-center shrink-0 text-[12px] font-bold">!</div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-[#b8890a] mb-1">{t.dnDetail.revisionBanner}</div>
              <p className="text-[10.5px] text-[#7a5e10] leading-relaxed whitespace-pre-wrap">
                {dn.revision_notes || t.dnDetail.revisionNoNote}
              </p>
              <p className="text-[9px] text-[#9ca3af] mt-1">
                {dn.revision_from_status === 'DECIDED_BOH' ? t.dnDetail.revisionReturnADK : t.dnDetail.revisionReturnBOH}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Timeline */}
      <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-3.5">
        <div className="text-[10px] font-bold text-[#002470] mb-2">{t.dnDetail.progressTitle}</div>
        <StatusTimeline
          status={dn.status}
          creditAmount={dn.credit_amount}
          slikStatus={dn.slik_status}
          timestamps={{
            submitted_at:       dn.submitted_at,
            decided_manager_at: dn.decided_manager_at,
            decided_boh_at:     dn.decided_boh_at,
            verified_adk_at:    dn.verified_adk_at,
            completed_at:       dn.completed_at,
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left: Info + Conditions */}
        <div className="lg:col-span-2 space-y-3">
          {/* Info card */}
          <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
            <div className="bg-[#003087] text-white px-3.5 py-2.5 text-[10px] font-bold">
              {t.dnDetail.infoTitle}
            </div>
            <div className="p-3.5 grid grid-cols-2 gap-y-2.5 text-[11px]">
              {([
                [t.dnDetail.debtorName,     dn.debtor_name],
                [t.dnDetail.cif,            dn.debtor_cif],
                [t.dnDetail.creditType,     dn.credit_type],
                [t.dnDetail.creditAmount,   formatCurrency(dn.credit_amount)],
                [t.dnDetail.approvalDate,   formatDate(dn.approval_date)],
                [t.dnDetail.approvalNumber, dn.approval_number ?? '—'],
                [t.common.branch,           dn.branch_code],
                [t.dnDetail.dueDate,        dn.due_date ? formatDate(dn.due_date) : '—'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="contents">
                  <span className="text-[#9ca3af]">{label}</span>
                  <span className="font-medium text-[#002470]">{value}</span>
                </div>
              ))}
              <span className="text-[#9ca3af]">{t.dnDetail.priorityLabel}</span>
              <span>
                <span className={`text-[8px] px-2 py-0.5 rounded-full font-semibold ${PRIORITY_COLORS[dn.priority]}`}>
                  {dn.priority}
                </span>
              </span>
              <span className="text-[#9ca3af]">{t.dnDetail.confidLabel}</span>
              <span>
                {dn.confidentiality === 'RAHASIA' ? (
                  <span className="inline-flex items-center gap-1 text-[8px] font-semibold px-2 py-0.5 rounded-full bg-[#fff0f0] text-[#CC0000]">
                    <Lock className="w-2 h-2" /> {t.dnDetail.confidential}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[8px] font-semibold px-2 py-0.5 rounded-full bg-[#e8f5e9] text-[#16a34a]">
                    <Globe className="w-2 h-2" /> {t.dnDetail.general}
                  </span>
                )}
              </span>
              <span className="text-[#9ca3af]">Status SLIK</span>
              <span>
                {dn.slik_status && SLIK_BADGE[dn.slik_status] ? (
                  <span
                    className="inline-flex items-center gap-1 text-[8px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: SLIK_BADGE[dn.slik_status].bg, color: SLIK_BADGE[dn.slik_status].color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: SLIK_BADGE[dn.slik_status].dot }} />
                    {SLIK_BADGE[dn.slik_status].label}
                  </span>
                ) : (
                  <span className="text-[9px] text-[#9ca3af]">—</span>
                )}
              </span>
            </div>
          </div>

          {/* Conditions / Tindak Lanjut */}
          {dn.conditions && dn.conditions.length > 0 && (
            <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
              <div className="bg-[#003087] text-white px-3.5 py-2.5 text-[10px] font-bold flex items-center justify-between">
                <span>{t.dnDetail.conditionsTitle} ({dn.conditions.length})</span>
                <span className="text-[8px] font-medium text-white/70">
                  PIC: {dn.pic_type === 'BOTH' ? 'RM & ADK - POK' : dn.pic_type === 'ADK' ? 'ADK - POK' : 'RM'}
                </span>
              </div>
              <div className="p-3.5 space-y-2">
                {[...dn.conditions]
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  .map((c, i) => {
                  const meta = COND_STATUS_META[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-600' }
                  const isEvidence = c.requirement_type === 'EVIDENCE'
                  const done = c.status === 'COMPLETED'
                  return (
                    <div key={c.id} className="flex gap-2.5 p-2.5 rounded-lg bg-[#fafbfc] border border-[#e8ecf4]">
                      <span className="w-5 h-5 bg-[#003087] text-white text-[8px] rounded-full flex items-center justify-center shrink-0 font-bold">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-[#002470]">{c.condition_text}</p>
                        <div className="flex gap-2 mt-1 flex-wrap items-center">
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${meta.cls}`}>
                            {meta.label}
                          </span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${isEvidence ? 'bg-[#ffe9d6] text-[#c2410c]' : 'bg-[#e0e7ff] text-[#4338ca]'}`}>
                            {isEvidence ? '📎 Wajib Bukti' : '✓ Checklist'}
                          </span>
                          {c.due_date && (
                            <span className="text-[8px] text-[#9ca3af]">Batas: {formatDate(c.due_date)}</span>
                          )}
                        </div>
                        {/* Aksi PIC */}
                        {canExecuteConditions && !done && (
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {isEvidence && (
                              <Link
                                href={`/decision-notes/${dn.id}/upload`}
                                className="flex items-center gap-1 px-2 py-1 text-[8.5px] font-semibold text-white bg-[#c2410c] rounded-md hover:bg-[#9a3412] transition-colors"
                              >
                                <UploadCloud className="w-3 h-3" /> Upload Bukti
                              </Link>
                            )}
                            <button
                              onClick={() => setCondStatus(c.id, 'COMPLETED')}
                              className="flex items-center gap-1 px-2 py-1 text-[8.5px] font-semibold text-white bg-[#16a34a] rounded-md hover:bg-[#15803d] transition-colors"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Tandai Selesai
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-3.5">
            <div className="text-[10px] font-bold text-[#002470] mb-3">{t.dnDetail.actionsTitle}</div>
            <div className="flex flex-wrap gap-2">
              {canSubmit && (
                <button onClick={() => act(() => submitDN(dn.id))}
                  disabled={acting}
                  className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-white bg-[#003087] rounded-lg hover:bg-[#002470] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                  {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} {t.dnDetail.submitBtn}
                </button>
              )}
              {canResubmit && (
                <button onClick={() => act(() => resubmitDN(dn.id, (dn.revision_from_status as 'SUBMITTED' | 'DECIDED_MANAGER' | 'DECIDED_BOH') ?? 'SUBMITTED'))}
                  disabled={acting}
                  className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-white bg-[#f0b429] rounded-lg hover:bg-[#d4a020] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                  {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} {t.dnDetail.resubmitBtn}
                </button>
              )}
              {canDecideManager && (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={confid}
                      onChange={(e) => setConfid(e.target.value as 'UMUM' | 'RAHASIA')}
                      className="py-2 px-2 rounded-lg border border-[#e8ecf4] text-[10px] text-[#002470] bg-[#fafbfc] focus:outline-none"
                    >
                      <option value="UMUM">{t.dnDetail.general}</option>
                      <option value="RAHASIA">{t.dnDetail.confidential}</option>
                    </select>
                    <button onClick={() => act(async () => { await insertDraftConds(dn.id); await decideManager(dn.id, confid, profile!.id, bohNotes) }, { clearDraft: true })}
                      disabled={acting}
                      className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-white bg-[#00897b] rounded-lg hover:bg-[#00695c] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                      {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Putuskan (CBM / Manager)
                    </button>
                    <button onClick={() => { setRejectReason(''); setRejectRole('manager'); setShowRejectModal(true) }}
                      disabled={acting}
                      className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-white bg-[#CC0000] rounded-lg hover:bg-[#a30000] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                      <XCircle className="w-3.5 h-3.5" /> Tolak
                    </button>
                  </div>
                  <div className="rounded-lg bg-[#e0f2f1] border border-[#80cbc4]/60 px-3 py-2">
                    <p className="text-[9.5px] text-[#00695c]">
                      {requiresBOH(dn)
                        ? (dn.slik_status === 'MERAH' && dn.credit_amount <= BOH_THRESHOLD
                            ? 'SLIK Merah — setelah diputus CBM / Manager, DN lanjut ke BOH.'
                            : 'Plafond > Rp1 M — setelah diputus CBM / Manager, DN lanjut ke BOH.')
                        : 'Plafond ≤ Rp1 M & SLIK aman — setelah diputus CBM / Manager, DN langsung ke ADK.'}
                    </p>
                  </div>
                  {/* Editor Tindak Lanjut (Catatan Pemutus) */}
                  <div className="w-full rounded-lg border border-[#80cbc4]/60 bg-[#f0faf9] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-[#00695c]">Tindak Lanjut / Syarat Pemenuhan</span>
                      <button onClick={addDraftCond} type="button"
                        className="flex items-center gap-1 px-2 py-1 text-[9px] font-semibold text-white bg-[#00897b] rounded-md hover:bg-[#00695c] transition-colors">
                        <Plus className="w-3 h-3" /> Tambah
                      </button>
                    </div>
                    {draftConds.length === 0 ? (
                      <p className="text-[9px] text-[#5f7d79] italic">Belum ada tindak lanjut. Klik &quot;Tambah&quot; untuk menetapkan syarat (opsional).</p>
                    ) : (
                      <div className="space-y-2.5">
                        {draftConds.map((c, i) => (
                          <div key={i} className="rounded-lg border border-[#cfe8e4] bg-white p-2.5 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 bg-[#00897b] text-white text-[8px] rounded-full flex items-center justify-center shrink-0 font-bold">{i + 1}</span>
                              <select
                                value={c.condition_type}
                                onChange={(e) => {
                                  const opt = STD_TINDAK_LANJUT.find((o) => o.value === e.target.value)
                                  updateDraftCond(i, { condition_type: e.target.value, condition_text: opt && opt.value !== 'LAINNYA' ? opt.label : '' })
                                }}
                                className="flex-1 py-1.5 px-2 rounded-md border border-[#cfe8e4] text-[9.5px] text-[#002470] bg-white focus:outline-none"
                              >
                                {STD_TINDAK_LANJUT.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                              <button onClick={() => removeDraftCond(i)} type="button" className="p-1 text-[#CC0000] hover:bg-[#fff0f0] rounded-md">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <input
                              value={c.condition_text}
                              onChange={(e) => updateDraftCond(i, { condition_text: e.target.value })}
                              placeholder="Uraian tindak lanjut..."
                              className="w-full py-1.5 px-2 rounded-md border border-[#cfe8e4] text-[9.5px] text-[#002470] bg-white focus:outline-none"
                            />
                            <div className="flex items-center gap-2 flex-wrap">
                              <select
                                value={c.requirement_type}
                                onChange={(e) => updateDraftCond(i, { requirement_type: e.target.value as 'EVIDENCE' | 'CHECKLIST' })}
                                className="py-1.5 px-2 rounded-md border border-[#cfe8e4] text-[9px] text-[#002470] bg-white focus:outline-none"
                              >
                                <option value="CHECKLIST">Checklist (konfirmasi)</option>
                                <option value="EVIDENCE">Wajib Upload Bukti</option>
                              </select>
                              <div className="flex items-center gap-1">
                                <span className="text-[8.5px] text-[#5f7d79]">Batas:</span>
                                <input
                                  type="date"
                                  value={c.due_date}
                                  onChange={(e) => updateDraftCond(i, { due_date: e.target.value })}
                                  className="py-1.5 px-2 rounded-md border border-[#cfe8e4] text-[9px] text-[#002470] bg-white focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <label className="block text-[9px] font-semibold text-[#002470] mb-1">
                      Catatan Putusan CBM / Manager <span className="text-[#9ca3af] font-normal">(opsional)</span>
                    </label>
                    <textarea
                      value={bohNotes}
                      onChange={(e) => { setBohNotes(e.target.value); setNotesIsDirty(true) }}
                      rows={3}
                      placeholder="Catatan putusan, syarat, atau hal yang perlu diperhatikan pemutus berikutnya..."
                      className="w-full px-3 py-2 rounded-lg border border-[#e8ecf4] text-[10.5px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#00897b] focus:ring-2 focus:ring-[#00897b]/20 resize-none"
                    />
                  </div>
                </div>
              )}
              {canDecideBOH && (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={confid}
                      onChange={(e) => setConfid(e.target.value as 'UMUM' | 'RAHASIA')}
                      className="py-2 px-2 rounded-lg border border-[#e8ecf4] text-[10px] text-[#002470] bg-[#fafbfc] focus:outline-none"
                    >
                      <option value="UMUM">{t.dnDetail.general}</option>
                      <option value="RAHASIA">{t.dnDetail.confidential}</option>
                    </select>
                    <button onClick={() => act(() => decideBOH(dn.id, confid, profile!.id, bohNotes), { clearDraft: true })}
                      disabled={acting}
                      className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-[#002470] bg-[#f0b429] rounded-lg hover:bg-[#d4a020] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                      {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} {t.dnDetail.decideBOH}
                    </button>
                    <button onClick={() => { setRejectReason(''); setRejectRole('boh'); setShowRejectModal(true) }}
                      disabled={acting}
                      className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-white bg-[#CC0000] rounded-lg hover:bg-[#a30000] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                      <XCircle className="w-3.5 h-3.5" /> Tolak
                    </button>
                  </div>
                  {/* Catatan BOH untuk ADK */}
                  <div className="w-full">
                    <label className="block text-[9px] font-semibold text-[#002470] mb-1">
                      Catatan untuk ADK <span className="text-[#9ca3af] font-normal">(opsional — terlihat oleh tim ADK saat verifikasi)</span>
                    </label>
                    <textarea
                      value={bohNotes}
                      onChange={(e) => { setBohNotes(e.target.value); setNotesIsDirty(true) }}
                      rows={3}
                      placeholder="Contoh: perhatikan kondisi #2 dan #3, pastikan dokumen SKMHT sudah lengkap sebelum ADK memverifikasi..."
                      className="w-full px-3 py-2 rounded-lg border border-[#e8ecf4] text-[10.5px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#f0b429] focus:ring-2 focus:ring-[#f0b429]/20 resize-none"
                    />
                  </div>
                </div>
              )}
              {canVerifyADK && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => act(async () => { await verifyADK(dn.id, profile!.id); await completeDN(dn.id) })}
                    disabled={acting}
                    className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-white bg-[#7c3aed] rounded-lg hover:bg-[#6d28d9] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                    {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} {t.dnDetail.verifyADK}
                  </button>
                  <button onClick={() => { setRejectReason(''); setRejectRole('adk'); setShowRejectModal(true) }}
                    disabled={acting}
                    className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-white bg-[#CC0000] rounded-lg hover:bg-[#a30000] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                    <XCircle className="w-3.5 h-3.5" /> Tolak
                  </button>
                </div>
              )}
              {canComplete && (
                <button onClick={() => act(() => completeDN(dn.id))}
                  disabled={acting}
                  className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-white bg-[#22c55e] rounded-lg hover:bg-[#16a34a] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                  {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} {t.dnDetail.completeBtn}
                </button>
              )}
              <Link href={`/decision-notes/${dn.id}/upload`}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-[#003087] bg-[#e8f0fe] rounded-lg hover:bg-[#d1e3fc] transition-colors">
                <UploadCloud className="w-3.5 h-3.5" /> {t.common.uploadEvidence}
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Notes */}
        {dn.notes && (
          <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-3.5">
            <div className="text-[10px] font-bold text-[#002470] mb-2">{t.dnDetail.notesTitle}</div>
            <p className="text-[11px] text-[#4a5568] leading-relaxed">{dn.notes}</p>
          </div>
        )}
      </div>

      {/* Reject modal (BOH or ADK) */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-[12px] w-full max-w-md shadow-xl overflow-hidden">
            <div className="bg-[#CC0000] text-white px-4 py-3 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              <h3 className="text-[12px] font-bold">
                {rejectRole === 'boh' ? 'Tolak oleh BOH' : rejectRole === 'manager' ? 'Tolak oleh Manager' : 'Tolak oleh ADK'} — {dn.dn_number}
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[10.5px] text-[#4a5568]">
                Anda akan menolak DN ini. Alasan penolakan akan disimpan sebagai
                {rejectRole === 'boh' ? ' Catatan Putusan BOH' : rejectRole === 'manager' ? ' Catatan Putusan Manager' : ' Catatan Verifikasi ADK'} dan dapat dilihat oleh semua pihak terkait.
              </p>
              <div>
                <label className="block text-[10px] font-semibold text-[#002470] mb-1">
                  Alasan Penolakan <span className="text-[#CC0000]">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  placeholder="Contoh: dokumen pendukung kurang lengkap, analisa kredit perlu diperbaiki, dll."
                  className="w-full px-3 py-2 rounded-lg border border-[#e8ecf4] text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#CC0000] focus:ring-2 focus:ring-[#CC0000]/10 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 bg-[#fafbfc] border-t border-[#e8ecf4]">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-2 text-[10px] font-semibold text-[#718096] bg-white border border-[#e8ecf4] rounded-lg hover:bg-[#f0f2f7] transition-colors"
              >
                Batal
              </button>
              <button
                disabled={!rejectReason.trim()}
                onClick={async () => {
                  setShowRejectModal(false)
                  if (rejectRole === 'boh') {
                    await act(() => rejectDN(dn.id, rejectReason.trim(), { boh_id: profile!.id }))
                  } else if (rejectRole === 'manager') {
                    await act(() => rejectDN(dn.id, rejectReason.trim(), { manager_id: profile!.id }))
                  } else {
                    await act(() => rejectDN(dn.id, rejectReason.trim(), { adk_id: profile!.id }))
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold text-white bg-[#CC0000] rounded-lg hover:bg-[#a30000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" /> Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
