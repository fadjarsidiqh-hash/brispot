'use client'

import { Check, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Threshold above which a DN must pass through BOH (in addition to Manager)
const BOH_THRESHOLD = 1_000_000_000

// Full pipeline including the BOH step (credit_amount > threshold)
const STEPS_WITH_BOH = [
  { key: 'DRAFT',           shortLabel: 'Draft' },
  { key: 'SUBMITTED',       shortLabel: 'Ke Pemutus' },
  { key: 'DECIDED_MANAGER', shortLabel: 'Putus CBM' },
  { key: 'DECIDED_BOH',     shortLabel: 'Putus BOH' },
  { key: 'VERIFIED_ADK',    shortLabel: 'Verif ADK' },
  { key: 'COMPLETED',       shortLabel: 'Closed' },
] as const

// Shorter pipeline: Manager decides then straight to ADK (credit_amount <= threshold)
const STEPS_NO_BOH = [
  { key: 'DRAFT',           shortLabel: 'Draft' },
  { key: 'SUBMITTED',       shortLabel: 'Ke Pemutus' },
  { key: 'DECIDED_MANAGER', shortLabel: 'Putus CBM' },
  { key: 'VERIFIED_ADK',    shortLabel: 'Verif ADK' },
  { key: 'COMPLETED',       shortLabel: 'Closed' },
] as const

const ORDER_WITH_BOH: Record<string, number> = {
  DRAFT: 0, SUBMITTED: 1, DECIDED_MANAGER: 2, DECIDED_BOH: 3, VERIFIED_ADK: 4, COMPLETED: 5,
  ESCALATED: 1, REJECTED: -1,
}
const ORDER_NO_BOH: Record<string, number> = {
  DRAFT: 0, SUBMITTED: 1, DECIDED_MANAGER: 2, VERIFIED_ADK: 3, COMPLETED: 4,
  ESCALATED: 1, REJECTED: -1,
}

interface StatusTimelineProps {
  status: string
  creditAmount?: number | null
  slikStatus?: string | null
  timestamps?: {
    submitted_at?: string | null
    decided_manager_at?: string | null
    decided_boh_at?: string | null
    verified_adk_at?: string | null
    completed_at?: string | null
  }
}

export function StatusTimeline({ status, creditAmount, slikStatus, timestamps }: StatusTimelineProps) {
  const requiresBoh = (creditAmount ?? 0) > BOH_THRESHOLD || slikStatus === 'MERAH'
  const STEPS       = requiresBoh ? STEPS_WITH_BOH : STEPS_NO_BOH
  const STATUS_ORDER = requiresBoh ? ORDER_WITH_BOH : ORDER_NO_BOH

  const currentIdx  = STATUS_ORDER[status] ?? 0
  const isEscalated = status === 'ESCALATED'
  const isRejected  = status === 'REJECTED'

  const stepDates = requiresBoh
    ? [
        undefined,
        timestamps?.submitted_at,
        timestamps?.decided_manager_at,
        timestamps?.decided_boh_at,
        timestamps?.verified_adk_at,
        timestamps?.completed_at,
      ]
    : [
        undefined,
        timestamps?.submitted_at,
        timestamps?.decided_manager_at,
        timestamps?.verified_adk_at,
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
