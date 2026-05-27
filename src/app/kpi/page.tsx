'use client'

import { useAuth } from '@/hooks/useAuth'
import { useKPI } from '@/hooks/useKPI'
import { TargetForm } from '@/components/forms/TargetForm'
import { ProgressRing } from '@/components/charts/ProgressRing'
import { BarChart } from '@/components/charts/BarChart'
import { ProgressBar } from '@/components/charts/ProgressBar'

export default function KPIPage() {
  const { profile } = useAuth()
  const { target, realization, monthlyTrend, loading } = useKPI(profile?.branch_code ?? '')

  const completionRate = realization?.completion_rate ?? 0
  const overdueRate = realization && realization.total_dn > 0
    ? (realization.overdue_dn / realization.total_dn) * 100
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">KPI &amp; Target</h1>
        <p className="text-sm text-gray-500">Pengelolaan target dan realisasi KPI cabang</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Realization summary */}
        <div className="bg-white rounded-2xl border p-6 space-y-5">
          <h3 className="font-semibold text-gray-800">Realisasi Bulan Ini</h3>
          {loading ? (
            <p className="text-sm text-gray-400">Memuat...</p>
          ) : (
            <div className="flex flex-col items-center gap-5">
              <ProgressRing
                value={completionRate}
                size={150}
                label="Penyelesaian DN"
                sublabel={`${realization?.completed_dn ?? 0} / ${realization?.total_dn ?? 0}`}
              />
              <div className="w-full space-y-3">
                <ProgressBar
                  value={target ? ((realization?.total_dn ?? 0) / Math.max(target.target_dn, 1)) * 100 : 0}
                  label="Total DN vs Target"
                />
                <ProgressBar
                  value={100 - overdueRate}
                  label="Ketepatan Waktu"
                  color="bg-green-500"
                />
                <ProgressBar
                  value={overdueRate}
                  label="Tingkat Keterlambatan"
                  color="bg-red-400"
                />
              </div>
              {target && (
                <div className="w-full grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-500 text-xs">Target DN Selesai</p>
                    <p className="font-bold text-lg">{target.target_completed}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-500 text-xs">Maks. Keterlambatan</p>
                    <p className="font-bold text-lg">{target.target_overdue_pct}%</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Target setting */}
        {(profile?.role === 'BOH' || profile?.role === 'ADMIN') && (
          <div className="bg-white rounded-2xl border p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Set Target KPI</h3>
            <TargetForm />
          </div>
        )}
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-2xl border p-6">
        <BarChart
          title="Tren Realisasi DN Tahunan"
          data={monthlyTrend.map((m) => ({ label: m.label, completed: m.completed, total: m.total }))}
        />
      </div>
    </div>
  )
}
