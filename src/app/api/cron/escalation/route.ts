import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { runEscalationCheck, runConditionReminders } from '@/lib/escalation'

/**
 * Cron endpoint for auto-escalation.
 * Protect with a secret header. Call from Vercel Cron or external scheduler.
 * Example cron schedule: every weekday at 08:00 WIB.
 */
export async function GET(request: NextRequest) {
  // Accept either Vercel Cron's built-in Authorization header or our custom secret
  const authHeader = request.headers.get('authorization')
  const customSecret = request.headers.get('x-cron-secret')
  const cronSecret = process.env.CRON_SECRET

  const validVercelCron = authHeader === `Bearer ${cronSecret}`
  const validCustom = customSecret === cronSecret

  if (!validVercelCron && !validCustom) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await runEscalationCheck()
  await runConditionReminders()
  return NextResponse.json({ ok: true, ran_at: new Date().toISOString() })
}
