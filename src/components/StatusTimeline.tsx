'use client'

import { Check, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { key: 'DRAFT',        shortLabel: 'Draft' },
  { key: 'SUBMITTED',    shortLabel: 'Diajukan' },
  { key: 'VERIFIED_DK',  shortLabel: 'Verif DK' },
  { key: 'VERIFIED_BOH', shortLabel: 'Verif BOH' },
  { key: 'COMPLETED',    shortLabel: 'Closed' },
] as const

const STATUS_ORDER: Record<string, number> = {
  DRAFT: 0, SUBMITTED: 1, VERIFIED_DK: 2, VERIFIED_BOH: 3, COMPLETED: 4,
  ESCALATED: 1, REJECTED: -1,
}

interface StatusTimelineProps {
  status: string
  timestamps?: {
    submitted_at?: string | null
    verified_dk_at?: string | null
    verified_boh_at?: string | null
    completed_at?: string | null
  }
}

export function StatusTimeline({ status, timestamps }: StatusTimelineProps) {
  const currentIdx  = STATUS_ORDER[status] ?? 0
  const isEscalated = status === 'ESCALATED'
  const isRejected  = status === 'REJECTED'

  const stepDates = [
    undefined,
    timestamps?.submitted_at,
    timestamps?.verified_dk_at,
    timestamps?.verified_boh_at,
    timestamps?.completed_at,
  ]

  return (
    <div className="flex items-start w-full py-2 overflow-x-auto">
      {STEPS.map((step, i) => {
        const isDone    = i < currentIdx
        const isCurrent = i === currentIdx
        const isPending = i > currentIdx

        let circleClass = 'bg-white border-[#d1d5db]'
        let lineClass   = 'bg-[#e8ecf4]'
        let labelClass  = 'text-[#9ca3af]'

        if (isDone) {
          circleClass = 'bg-[#22c55e] border-[#22c55e]'
          lineClass   = 'bg-[#22c55e]'
          labelClass  = 'text-[#22c55e] font-medium'
        } else if (isCurrent && isEscalated) {
          circleClass = 'bg-[#CC0000] border-[#CC0000]'
          labelClass  = 'text-[#CC0000] font-semibold'
        } else if (isCurrent) {
          circleClass = 'bg-[#003087] border-[#003087]'
          labelClass  = 'text-[#003087] font-semibold'
        }

        const date = stepDates[i]

        return (
          <div key={step.key} className="flex items-start flex-1 min-w-0">
            <div className="flex flex-col items-center shrink-0">
              <div className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center', circleClass)}>
                {isDone && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                {isCurrent && isEscalated && <AlertTriangle className="w-3 h-3 text-white" />}
                {isCurrent && !isEscalated && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                {isPending && <span className="text-[8px] text-[#9ca3af] font-bold">{i + 1}</span>}
              </div>
              <div className={cn('text-[9px] mt-1.5 text-center whitespace-nowrap', labelClass)}>
                {step.shortLabel}
              </div>
              {date && (
                <div className="text-[7px] text-[#9ca3af] mt-0.5 text-center">
                  {new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </div>
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('h-[2px] flex-1 mt-[13px] mx-0.5', lineClass)} />
            )}
          </div>
        )
      })}

      {isRejected && (
        <div className="ml-3 self-center text-[9px] text-[#CC0000] font-semibold whitespace-nowrap">
          ✕ Ditolak
        </div>
      )}
    </div>
  )
}
