'use client'

import { useAuth } from '@/hooks/useAuth'
import { useDN } from '@/hooks/useDN'
import { useKPI } from '@/hooks/useKPI'
import { ProgressRing } from '@/components/charts/ProgressRing'
import { BarChart } from '@/components/charts/BarChart'
import { ProgressBar } from '@/components/charts/ProgressBar'
import { STATUS_LABELS, formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Bell, Plus } from 'lucide-react'

const STAT_VARIANTS = {
  blue:  { border: 'border-t-[#003087]', num: 'text-[#003087]', badge: 'bg-[#e8f0fe] text-[#003087]' },
  red:   { border: 'border-t-[#CC0000]', num: 'text-[#CC0000]', badge: 'bg-[#fff0f0] text-[#CC0000]' },
  gold:  { border: 'border-t-[#f0b429]', num: 'text-[#c8870a]', badge: 'bg-[#fffbe0] text-[#b8890a]' },
  green: { border: 'border-t-[#22c55e]', num: 'text-[#22c55e]', badge: 'bg-[#e8f5e9] text-[#16a34a]' },
}

function StatCard({ label, value, badgeText, variant }: {
  label: string; value: number; badgeText: string; variant: keyof typeof STAT_VARIANTS
}) {
  const v = STAT_VARIANTS[variant]
  return (
    <div className={`bg-white rounded-[10px] p-3.5 border border-[#e8ecf4] border-t-4 ${v.border} shadow-[0_1px_3px_rgba(0,36,112,0.07)]`}>
      <div className="text-[9px] text-[#9ca3af] font-medium mb-0.5">{label}</div>
      <div className={`text-3xl font-extrabold leading-none mt-1 ${v.num}`}>{value}</div>
      <span className={`inline-block text-[8px] font-semibold px-1.5 py-0.5 rounded-lg mt-2 ${v.badge}`}>{badgeText}</span>
    </div>
  )
}

const DN_PILL: Record<string, string> = {
  ESCALATED:    'bg-[#fff0f0] text-[#CC0000]',
  COMPLETED:    'bg-[#e8f5e9] text-[#16a34a]',
  SUBMITTED:    'bg-[#e8f0fe] text-[#003087]',
  VERIFIED_DK:  'bg-[#fffbe0] text-[#b8890a]',
  VERIFIED_BOH: 'bg-[#f3e8ff] text-[#7c3aed]',
  DRAFT:        'bg-[#f0f2f7] text-[#718096]',
  REJECTED:     'bg-[#fff0f0] text-[#CC0000]',
}

const DN_PILL_LABEL: Record<string, string> = {
  ESCALATED:    'Overdue',
  COMPLETED:    'Closed',
  SUBMITTED:    'Diajukan',
  VERIFIED_DK:  'Terverif DK',
  VERIFIED_BOH: 'Terverif BOH',
  DRAFT:        'Draft',
  REJECTED:     'Ditolak',
}

function getDNBorderColor(status: string, dueDate: string | null) {
  if (status === 'ESCALATED') return 'border-l-[#CC0000]'
  if (status === 'COMPLETED') return 'border-l-[#22c55e]'
  if (status === 'REJECTED')  return 'border-l-[#CC0000]'
  if (dueDate) {
    if (new Date(dueDate) < new Date()) return 'border-l-[#CC0000]'
    const diff = (new Date(dueDate).getTime() - Date.now()) / 864e5
    if (diff <= 3) return 'border-l-[#f0b429]'
  }
  return 'border-l-[#003087]'
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const { list: dns } = useDN()
  const { target, realization, monthlyTrend } = useKPI(profile?.branch_code ?? '')



  const totalDN   = dns.length
  const completed = dns.filter((d) => d.status === 'COMPLETED').length
  const active    = totalDN - completed
  const overdue   = dns.filter((d) => d.status === 'ESCALATED' || (
    d.due_date && new Date(d.due_date) < new Date() && !['COMPLETED','REJECTED'].includes(d.status)
  )).length
  const nearDue   = dns.filter((d) => {
    if (!d.due_date || ['COMPLETED','REJECTED','ESCALATED'].includes(d.status)) return false
    const diff = (new Date(d.due_date).getTime() - Date.now()) / 864e5
    return diff >= 0 && diff <= 3
  }).length
  const completionRate = realization?.completion_rate ?? (totalDN > 0 ? Math.round((completed / totalDN) * 100) : 0)
  const recent = dns.slice(0, 6)
  const today  = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[13px] font-bold text-[#002470]">
            Selamat Pagi, {profile?.full_name?.split(' ')[0] ?? 'User'} 👋
          </h1>
          <p className="text-[10px] text-[#9ca3af] mt-0.5">
            {profile?.branch_name ?? profile?.branch_code} · {today}
          </p>
        </div>
        <Link
          href="/decision-notes/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#003087] text-white text-[11px] font-bold rounded-lg hover:bg-[#002470] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Decision Note Baru
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <StatCard label="Total DN Aktif"         value={active}    badgeText="Berjalan"       variant="blue"  />
        <StatCard label="Outstanding / Overdue"  value={overdue}   badgeText="Perlu Aksi"     variant="red"   />
        <StatCard label="Mendekati Due Date"      value={nearDue}   badgeText="≤ 3 Hari Kerja" variant="gold"  />
        <StatCard label="Closed Bulan Ini"        value={completed} badgeText="Selesai"        variant="green" />
      </div>

      {/* Main grid: left (DN list + bar chart) · right (KPI ring + notif) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-3">

        {/* ── Left column ── */}
        <div className="space-y-3">
          {/* DN list */}
          <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-3.5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-bold text-[#002470]">Decision Notes Aktif</span>
              <Link href="/decision-notes" className="text-[9px] text-[#003087] font-medium hover:underline">
                Lihat Semua →
              </Link>
            </div>
            <div className="space-y-1.5">
              {recent.length === 0 ? (
                <p className="text-[11px] text-gray-400 text-center py-8">Belum ada DN</p>
              ) : (
                recent.map((dn) => (
                  <Link
                    key={dn.id}
                    href={`/decision-notes/${dn.id}`}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-2 border border-[#e8ecf4] border-l-4 hover:bg-[#f8fafc] transition-colors ${getDNBorderColor(dn.status, dn.due_date)}`}
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold text-[#002470] truncate">{dn.debtor_name}</div>
                      <div className="text-[8px] text-[#9ca3af] mt-0.5">
                        {dn.credit_type} · {formatCurrency(dn.credit_amount)}
                        {dn.due_date ? ` · Due: ${formatDate(dn.due_date)}` : ''}
                      </div>
                    </div>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-[10px] whitespace-nowrap ml-2 ${DN_PILL[dn.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {DN_PILL_LABEL[dn.status] ?? STATUS_LABELS[dn.status]}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-3.5">
            <BarChart
              title="Realisasi DN Bulanan"
              data={monthlyTrend.map((m) => ({ label: m.label, completed: m.completed, total: m.total }))}
            />
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-3">
          {/* KPI ring */}
          <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-3.5">
            <div className="text-[11px] font-bold text-[#002470] mb-3">KPI Realisasi</div>
            <div className="flex items-center gap-4">
              <ProgressRing
                value={completionRate}
                size={90}
                strokeWidth={9}
                label="Tercapai"
              />
              <div className="flex-1 space-y-2 min-w-0">
                <div>
                  <div className="text-[9px] text-[#9ca3af]">Realisasi Bulan Ini</div>
                  <div className="text-sm font-extrabold text-[#003087]">
                    {realization?.completed_dn ?? completed} DN
                  </div>
                  <div className="text-[8px] text-[#9ca3af]">Target: {target?.target_completed ?? '—'} DN</div>
                </div>
                <ProgressBar value={completionRate} label="Penyelesaian" color="bg-[#003087]" />
                <ProgressBar
                  value={realization ? Math.max(0, 100 - Math.round((realization.overdue_dn / Math.max(realization.total_dn, 1)) * 100)) : 100}
                  label="Ketepatan Waktu"
                  color="bg-[#22c55e]"
                />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-3.5">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#002470] mb-3">
              <Bell className="w-3.5 h-3.5" /> Notifikasi &amp; Reminder
            </div>
            {overdue === 0 && nearDue === 0 ? (
              <p className="text-[11px] text-gray-400 py-4 text-center">Tidak ada notifikasi mendesak ✓</p>
            ) : (
              <div className="space-y-0">
                {dns.filter((d) => d.status === 'ESCALATED').slice(0, 3).map((dn) => (
                  <div key={dn.id} className="flex items-start gap-2 py-2 border-b border-[#e8ecf4]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#CC0000] mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-[#4a5568] leading-snug truncate">
                        <strong>{dn.debtor_name}</strong> — overdue, perlu tindaklanjut
                      </p>
                      <p className="text-[8px] text-[#9ca3af] mt-0.5">
                        {dn.due_date ? formatDate(dn.due_date) : 'Sudah lewat deadline'}
                      </p>
                    </div>
                  </div>
                ))}
                {nearDue > 0 && (
                  <div className="flex items-start gap-2 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#f0b429] mt-1.5 shrink-0" />
                    <p className="text-[10px] text-[#4a5568]">
                      {nearDue} DN mendekati due date ≤ 3 hari kerja
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
