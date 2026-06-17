'use client'

import { useDN } from '@/hooks/useDN'
import { PRIORITY_COLORS, formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Plus, Search, Lock, Globe, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/contexts/I18nContext'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Suspense } from 'react'

const STATUS_PILL: Record<string, string> = {
  ESCALATED:    'bg-[#fff0f0] text-[#CC0000]',
  COMPLETED:    'bg-[#e8f5e9] text-[#16a34a]',
  SUBMITTED:    'bg-[#e8f0fe] text-[#003087]',
  DECIDED_MANAGER: 'bg-[#e0f2f1] text-[#00897b]',
  DECIDED_BOH:  'bg-[#fffbe0] text-[#b8890a]',
  VERIFIED_ADK: 'bg-[#f3e8ff] text-[#7c3aed]',
  DRAFT:        'bg-[#f0f2f7] text-[#718096]',
  REJECTED:     'bg-[#fff0f0] text-[#CC0000]',
  NEEDS_REVISION: 'bg-[#fff7ed] text-[#c2410c]',
}

const SLIK_BADGE: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  HIJAU:  { bg: '#e8f5e9', color: '#16a34a', dot: '#16a34a', label: 'Hijau' },
  KUNING: { bg: '#fff8e1', color: '#b8890a', dot: '#f0b429', label: 'Kuning' },
  MERAH:  { bg: '#ffebee', color: '#CC0000', dot: '#CC0000', label: 'Merah' },
}

const PIPELINE_STEPS = ['DRAFT','SUBMITTED','DECIDED_BOH','COMPLETED']
const PIPELINE_IDX: Record<string, number> = { DRAFT:0, SUBMITTED:1, NEEDS_REVISION:1, DECIDED_MANAGER:2, DECIDED_BOH:2, VERIFIED_ADK:3, COMPLETED:3 }

function MiniTracker({ status }: { status: string }) {
  const cur = PIPELINE_IDX[status] ?? 0
  const isRejected = status === 'REJECTED'
  const isRevision = status === 'NEEDS_REVISION'
  return (
    <div className="flex items-center gap-0.5">
      {PIPELINE_STEPS.map((_, i) => {
        const done = cur > i
        const active = cur === i
        const color = isRejected
          ? (i <= 1 ? 'bg-[#CC0000]' : 'bg-[#e8ecf4]')
          : done ? 'bg-[#003087]' : active ? (isRevision ? 'bg-[#f0b429]' : 'bg-[#003087]') : 'bg-[#e8ecf4]'
        return (
          <div key={i} className={`h-1.5 w-5 rounded-full ${color} transition-colors`} />
        )
      })}
    </div>
  )
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

// Inner component — must be separate so the Suspense boundary sits ABOVE the
// useSearchParams() call, as required by Next.js 14 App Router.
function DecisionNotesContent() {
  const { list, loading, error, fetchList } = useDN()
  const { profile } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const canCreate = profile?.role === 'RM' || profile?.role === 'ADMIN'

  // Filters are stored in the URL so they survive page refresh and can be shared/bookmarked
  const search         = searchParams.get('q')        ?? ''
  const statusFilter   = searchParams.get('status')   ?? ''
  const priorityFilter = searchParams.get('priority') ?? ''
  const confidFilter   = searchParams.get('confid')   ?? ''

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) { params.set(key, value) } else { params.delete(key) }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const filtered = list.filter((dn) => {
    const matchSearch = !search ||
      dn.debtor_name.toLowerCase().includes(search.toLowerCase()) ||
      dn.dn_number.toLowerCase().includes(search.toLowerCase()) ||
      dn.debtor_cif.toLowerCase().includes(search.toLowerCase())
    const matchStatus   = statusFilter   ? dn.status === statusFilter     : true
    const matchPriority = priorityFilter ? dn.priority === priorityFilter  : true
    const matchConfid   = confidFilter   ? dn.confidentiality === confidFilter : true
    return matchSearch && matchStatus && matchPriority && matchConfid
  })

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[13px] font-bold text-[#002470]">{t.dnList.title}</h1>
        {canCreate && (
          <Link
            href="/decision-notes/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#003087] text-white text-[11px] font-bold rounded-lg hover:bg-[#002470] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> {t.dnList.newDN}
          </Link>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#9ca3af]" />
            <input
              name="dn-search"
              value={search}
              onChange={(e) => setFilter('q', e.target.value)}
              placeholder={t.dnList.searchPlaceholder}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#e8ecf4] text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/10 transition-colors"
            />
          </div>
          <select
            name="dn-status-filter"
            value={statusFilter}
            onChange={(e) => setFilter('status', e.target.value)}
            className="py-2 px-2.5 rounded-lg border border-[#e8ecf4] text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#003087] transition-colors"
          >
            <option value="">{t.common.allStatus}</option>
            {(['DRAFT','SUBMITTED','NEEDS_REVISION','DECIDED_BOH','VERIFIED_ADK','COMPLETED','ESCALATED','REJECTED'] as const).map((k) => (
              <option key={k} value={k}>{t.status[k]}</option>
            ))}
          </select>
          <select
            name="dn-priority-filter"
            value={priorityFilter}
            onChange={(e) => setFilter('priority', e.target.value)}
            className="py-2 px-2.5 rounded-lg border border-[#e8ecf4] text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#003087] transition-colors"
          >
            <option value="">{t.common.allPriority}</option>
            <option value="LOW">{t.common.no === 'No' ? 'Low' : 'Rendah'}</option>
            <option value="MEDIUM">{t.common.no === 'No' ? 'Medium' : 'Sedang'}</option>
            <option value="HIGH">{t.common.no === 'No' ? 'High' : 'Tinggi'}</option>
            <option value="CRITICAL">{t.common.no === 'No' ? 'Critical' : 'Kritis'}</option>
          </select>
          <select
            name="dn-confid-filter"
            value={confidFilter}
            onChange={(e) => setFilter('confid', e.target.value)}
            className="py-2 px-2.5 rounded-lg border border-[#e8ecf4] text-[11px] text-[#002470] bg-[#fafbfc] focus:outline-none focus:border-[#003087] transition-colors"
          >
            <option value="">{t.common.no === 'No' ? 'All Confidentiality' : 'Semua Kerahasiaan'}</option>
            <option value="UMUM">{t.dnList.umum}</option>
            <option value="RAHASIA">{t.dnList.confidential}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <div className="w-5 h-5 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px] text-[#9ca3af]">{t.common.loading}</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <AlertCircle className="w-6 h-6 text-[#CC0000]" />
            <p className="text-[11px] text-[#CC0000] font-medium text-center max-w-xs">{error}</p>
            <button
              onClick={() => fetchList()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold bg-[#003087] text-white rounded-lg hover:bg-[#002470] transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Coba Lagi
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-[11px] text-[#9ca3af]">{t.dnList.emptyState}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#003087] text-left">
                  {[
                    t.common.no === 'No' ? 'DN Number' : 'Nomor DN',
                    t.dnList.debitur,
                    t.dnList.creditAmount,
                    t.dnList.creditType,
                    t.common.priority,
                    t.common.no === 'No' ? 'Confidentiality' : 'Kerahasiaan',
                    t.dnList.dueDate,
                    t.common.status,
                    'Progress',
                  ].map((h) => (
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
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[8px] text-[#9ca3af]">{dn.debtor_cif}</p>
                        {dn.slik_status && SLIK_BADGE[dn.slik_status] && (
                          <span
                            className="inline-flex items-center gap-1 text-[7.5px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: SLIK_BADGE[dn.slik_status].bg, color: SLIK_BADGE[dn.slik_status].color }}
                            title={`SLIK ${SLIK_BADGE[dn.slik_status].label}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: SLIK_BADGE[dn.slik_status].dot }} />
                            SLIK
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-[#4a5568]">{formatCurrency(dn.credit_amount)}</td>
                    <td className="px-3 py-2.5 text-[10px] text-[#4a5568]">{dn.credit_type}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${PRIORITY_COLORS[dn.priority]}`}>
                        {dn.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {dn.confidentiality === 'RAHASIA' ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#fff0f0] text-[#CC0000]">
                          <Lock className="w-2.5 h-2.5" /> {t.dnList.confidential}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#e8f5e9] text-[#16a34a]">
                          <Globe className="w-2.5 h-2.5" /> {t.dnList.umum}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-[#9ca3af]">
                      {dn.due_date ? formatDate(dn.due_date) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${STATUS_PILL[dn.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {(t.status as Record<string, string>)[dn.status] ?? dn.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <MiniTracker status={dn.status} />
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

export default function DecisionNotesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-40 gap-2">
        <div className="w-5 h-5 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px] text-[#9ca3af]">Memuat...</span>
      </div>
    }>
      <DecisionNotesContent />
    </Suspense>
  )
}

