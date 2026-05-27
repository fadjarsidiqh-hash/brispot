'use client'

import { useEffect, useState } from 'react'
import { differenceInSeconds, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { AlertTriangle, Clock } from 'lucide-react'

interface EscalationCountdownProps {
  escalationDate: string
  className?: string
}

export function EscalationCountdown({ escalationDate, className }: EscalationCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0)

  useEffect(() => {
    const target = parseISO(escalationDate)
    const update = () => setSecondsLeft(differenceInSeconds(target, new Date()))
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [escalationDate])

  const isOverdue = secondsLeft <= 0

  const days = Math.floor(Math.abs(secondsLeft) / 86400)
  const hours = Math.floor((Math.abs(secondsLeft) % 86400) / 3600)
  const minutes = Math.floor((Math.abs(secondsLeft) % 3600) / 60)
  const secs = Math.abs(secondsLeft) % 60

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
        isOverdue
          ? 'bg-red-100 text-red-700'
          : secondsLeft < 86400
          ? 'bg-orange-100 text-orange-700'
          : 'bg-yellow-50 text-yellow-700',
        className
      )}
    >
      {isOverdue ? (
        <AlertTriangle className="w-4 h-4 shrink-0" />
      ) : (
        <Clock className="w-4 h-4 shrink-0" />
      )}
      {isOverdue ? (
        <span>Eskalasi melewati batas ({days}h {hours}j)</span>
      ) : (
        <span>
          Eskalasi dalam:{' '}
          <span className="font-mono">
            {days}h {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
        </span>
      )}
    </div>
  )
}
