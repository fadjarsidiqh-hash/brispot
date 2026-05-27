import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { runEscalationCheck } from '@/lib/escalation'

/**
 * Cron endpoint for auto-escalation.
 * Protect with a secret header. Call from Vercel Cron or external scheduler.
 * Example cron schedule: every weekday at 08:00 WIB.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await runEscalationCheck()
  return NextResponse.json({ ok: true, ran_at: new Date().toISOString() })
}
