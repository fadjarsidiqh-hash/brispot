'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, Clock } from 'lucide-react'

type Step = {
  label: string
  description?: string
  date?: string
  status: 'completed' | 'current' | 'pending'
}

const DN_STEPS: Step[] = [
  { label: 'Draft', description: 'DN dibuat' },
  { label: 'Diajukan', description: 'Menunggu verifikasi DK' },
  { label: 'Terverifikasi DK', description: 'Menunggu verifikasi BOH' },
  { label: 'Terverifikasi BOH', description: 'Dalam pelaksanaan kondisi' },
  { label: 'Selesai', description: 'Semua kondisi terpenuhi' },
]

const STATUS_STEP_MAP: Record<string, number> = {
  DRAFT: 0,
  SUBMITTED: 1,
  VERIFIED_DK: 2,
  VERIFIED_BOH: 3,
  COMPLETED: 4,
  ESCALATED: 1,
  REJECTED: 1,
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
  const currentStep = STATUS_STEP_MAP[status] ?? 0
  const dates = [
    undefined,
    timestamps?.submitted_at,
    timestamps?.verified_dk_at,
    timestamps?.verified_boh_at,
    timestamps?.completed_at,
  ]

  const steps: Step[] = DN_STEPS.map((s, i) => ({
    ...s,
    date: dates[i] ?? undefined,
    status: i < currentStep ? 'completed' : i === currentStep ? 'current' : 'pending',
  }))

  return (
    <ol className="relative border-l border-gray-200 ml-3 space-y-6">
      {steps.map((step, i) => (
        <li key={i} className="ml-6">
          <span className={cn(
            'absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white',
            step.status === 'completed' ? 'bg-green-500' : step.status === 'current' ? 'bg-blue-500' : 'bg-gray-200'
          )}>
            {step.status === 'completed' ? (
              <CheckCircle2 className="w-4 h-4 text-white" />
            ) : step.status === 'current' ? (
              <Clock className="w-4 h-4 text-white" />
            ) : (
              <Circle className="w-4 h-4 text-gray-400" />
            )}
          </span>
          <div>
            <p className={cn('text-sm font-semibold', step.status === 'pending' ? 'text-gray-400' : 'text-gray-800')}>
              {step.label}
            </p>
            <p className="text-xs text-gray-500">{step.description}</p>
            {step.date && (
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(step.date).toLocaleString('id-ID')}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
