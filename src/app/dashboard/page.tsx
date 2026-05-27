'use client'

import { useAuth } from '@/hooks/useAuth'
import { useDN } from '@/hooks/useDN'
import { useKPI } from '@/hooks/useKPI'
import { ProgressRing } from '@/components/charts/ProgressRing'
import { BarChart } from '@/components/charts/BarChart'
import { ProgressBar } from '@/components/charts/ProgressBar'
import { STATUS_LABELS, STATUS_COLORS, formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { FileText, Clock, CheckCircle2, AlertTriangle, Plus } from 'lucide-react'

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const { list: dns } = useDN()
  const { target, realization, monthlyTrend } = useKPI(profile?.branch_code ?? '')

  const totalDN = dns.length
  const completed = dns.filter((d) => d.status === 'COMPLETED').length
  const overdue = dns.filter((d) => d.status === 'ESCALATED').length
  const pending = dns.filter((d) => ['SUBMITTED', 'VERIFIED_DK', 'VERIFIED_BOH'].includes(d.status)).length
  const completionRate = totalDN > 0 ? Math.round((completed / totalDN) * 100) : 0

  const recent = dns.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Selamat datang, {profile?.full_name}</p>
        </div>
        <Link href="/decision-notes/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#002D62] text-white text-sm font-semibold rounded-xl hover:bg-[#003f8a] transition-colors">
          <Plus className="w-4 h-4" /> Buat DN Baru
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total DN" value={totalDN} icon={FileText} color="bg-[#002D62]" />
        <StatCard label="Menunggu" value={pending} icon={Clock} color="bg-yellow-500" />
        <StatCard label="Selesai" value={completed} icon={CheckCircle2} color="bg-green-500" />
        <StatCard label="Eskalasi" value={overdue} icon={AlertTriangle} color="bg-red-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI Ring */}
        <div className="bg-white rounded-2xl border p-6 flex flex-col items-center justify-center gap-4">
          <h3 className="font-semibold text-gray-700 self-start">Realisasi KPI Bulan Ini</h3>
          <ProgressRing
            value={realization?.completion_rate ?? completionRate}
            label="Penyelesaian"
            sublabel={`${realization?.completed_dn ?? completed} / ${realization?.total_dn ?? totalDN} DN`}
            size={140}
          />
          {target && (
            <div className="w-full space-y-2">
              <ProgressBar
                value={target.target_dn > 0 ? ((realization?.total_dn ?? totalDN) / target.target_dn) * 100 : 0}
                label="Total DN vs Target"
              />
              <ProgressBar
                value={100 - (realization ? (realization.overdue_dn / Math.max(realization.total_dn, 1)) * 100 : 0)}
                label="Ketepatan Waktu"
                color="bg-green-500"
              />
            </div>
          )}
        </div>

        {/* Monthly bar chart */}
        <div className="bg-white rounded-2xl border p-6 lg:col-span-2">
          <BarChart
            title="Realisasi DN Bulanan"
            data={monthlyTrend.map((m) => ({ label: m.label, completed: m.completed, total: m.total }))}
          />
        </div>
      </div>

      {/* Recent DNs */}
      <div className="bg-white rounded-2xl border">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-800">Decision Notes Terbaru</h3>
          <Link href="/decision-notes" className="text-sm text-[#002D62] hover:underline">Lihat semua</Link>
        </div>
        <div className="divide-y">
          {recent.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Belum ada DN</p>
          ) : (
            recent.map((dn) => (
              <Link key={dn.id} href={`/decision-notes/${dn.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{dn.dn_number}</p>
                  <p className="text-xs text-gray-500">{dn.debtor_name} · {formatCurrency(dn.credit_amount)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {dn.due_date && <p className="text-xs text-gray-400">{formatDate(dn.due_date)}</p>}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[dn.status]}`}>
                    {STATUS_LABELS[dn.status]}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
