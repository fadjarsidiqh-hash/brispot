'use client'

import { useAuth } from '@/hooks/useAuth'
import { useKPI } from '@/hooks/useKPI'
import { TargetForm } from '@/components/forms/TargetForm'
import { ProgressRing } from '@/components/charts/ProgressRing'
import { BarChart } from '@/components/charts/BarChart'
import { ProgressBar } from '@/components/charts/ProgressBar'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const TABS = ['Bulanan', 'Triwulan', 'Tahunan'] as const
type Tab = typeof TABS[number]

const RING_CONFIG = [
  { label: 'Bulanan',   sublabel: 'Progres bulan ini',    color: '#003087', track: '#e8f0fe' },
  { label: 'Triwulan',  sublabel: 'Progres 3 bulan',      color: '#f0b429', track: '#fffbe0' },
  { label: 'Tahunan',   sublabel: 'Progres 12 bulan',     color: '#22c55e', track: '#e8f5e9' },
]

export default function KPIPage() {
  const { profile } = useAuth()
  const { target, realization, monthlyTrend, loading } = useKPI(profile?.branch_code ?? '')
  const [activeTab, setActiveTab] = useState<Tab>('Bulanan')

  const completionRate = realization?.completion_rate ?? 0
  const overdueRate = realization && realization.total_dn > 0
    ? Math.round((realization.overdue_dn / realization.total_dn) * 100)
    : 0

  // Simulated values for quarterly and annual (to be replaced with real data)
  const ringValues = [completionRate, Math.round(completionRate * 0.85), Math.round(completionRate * 0.90)]

  const canSetTarget = profile?.role === 'BOH' || profile?.role === 'ADMIN'

  return (
    <div className="space-y-3.5">
      {/* Header + Tab filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[13px] font-bold text-[#002470]">KPI &amp; Target</h1>
          <p className="text-[9px] text-[#9ca3af]">Pengelolaan target dan realisasi KPI cabang</p>
        </div>
        <div className="flex gap-1 bg-white border border-[#e8ecf4] rounded-lg p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1.5 text-[10px] font-medium rounded transition-colors',
                activeTab === tab
                  ? 'bg-[#003087] text-white font-semibold'
                  : 'text-[#718096] hover:text-[#002470]'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Progress Rings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {RING_CONFIG.map((ring, i) => (
          <div key={ring.label} className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-4 flex flex-col items-center gap-2">
            <div className="text-[10px] font-bold text-[#002470]">{ring.label}</div>
            <ProgressRing
              value={loading ? 0 : ringValues[i]}
              size={90}
              strokeWidth={9}
              label={`${loading ? '—' : ringValues[i]}%`}
              color={ring.color}
            />
            <div className="text-[8px] text-[#9ca3af] text-center">{ring.sublabel}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3">
        {/* Left: chart + detail metrics */}
        <div className="space-y-3">
          <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-3.5">
            <BarChart
              title="Tren Realisasi DN"
              data={monthlyTrend.map((m) => ({ label: m.label, completed: m.completed, total: m.total }))}
            />
          </div>

          {/* Metrics */}
          <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
            <div className="bg-[#003087] text-white px-3.5 py-2 text-[10px] font-bold">Indikator Kinerja</div>
            <div className="p-3.5 space-y-2.5">
              {loading ? (
                <p className="text-[11px] text-[#9ca3af]">Memuat...</p>
              ) : (
                <>
                  <ProgressBar value={completionRate}          label="Penyelesaian DN"        color="bg-[#003087]" />
                  <ProgressBar value={100 - overdueRate}       label="Ketepatan Waktu"        color="bg-[#22c55e]" />
                  <ProgressBar value={Math.max(0, 100 - overdueRate * 2)} label="Eskalasi Dihindari" color="bg-[#f0b429]" />
                </>
              )}
              {target && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    ['Target DN Selesai',    `${target.target_completed} DN`],
                    ['Maks. Keterlambatan',  `${target.target_overdue_pct}%`],
                    ['Realisasi',            `${realization?.completed_dn ?? 0} DN`],
                    ['Overdue',              `${realization?.overdue_dn ?? 0} DN`],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-[#fafbfc] border border-[#e8ecf4] rounded-lg p-2.5">
                      <div className="text-[8px] text-[#9ca3af]">{label}</div>
                      <div className="text-sm font-extrabold text-[#002470]">{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Set Target */}
        {canSetTarget ? (
          <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] overflow-hidden">
            <div className="bg-[#003087] text-white px-3.5 py-2 text-[10px] font-bold">Setting Target KPI</div>
            <div className="p-3.5">
              <TargetForm />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[10px] border border-[#e8ecf4] shadow-[0_1px_3px_rgba(0,36,112,0.07)] p-4">
            <div className="text-[10px] font-bold text-[#002470] mb-3">Ringkasan KPI Saya</div>
            {loading ? (
              <p className="text-[11px] text-[#9ca3af]">Memuat...</p>
            ) : (
              <div className="space-y-2">
                <ProgressBar value={completionRate}    label="Penyelesaian"    color="bg-[#003087]" />
                <ProgressBar value={100 - overdueRate} label="Tepat Waktu"     color="bg-[#22c55e]" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

