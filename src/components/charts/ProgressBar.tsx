'use client'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number   // 0-100
  label?: string
  color?: string
  showValue?: boolean
  className?: string
}

export function ProgressBar({ value, label, color = 'bg-[#002D62]', showValue = true, className }: ProgressBarProps) {
  const pct = Math.min(Math.max(value, 0), 100)
  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          {label && <span>{label}</span>}
          {showValue && <span className="font-semibold">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
