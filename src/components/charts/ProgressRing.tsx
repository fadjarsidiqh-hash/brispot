'use client'

import { cn } from '@/lib/utils'

interface ProgressRingProps {
  value: number      // 0-100
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
  color?: string
  className?: string
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  color = '#003087',
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(value, 100) / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-extrabold text-[#002470] leading-none">{Math.round(value)}%</p>
        {label && <p className="text-[9px] text-[#9ca3af] mt-0.5">{label}</p>}
        {sublabel && <p className="text-[8px] text-[#9ca3af]">{sublabel}</p>}
      </div>
    </div>
  )
}
