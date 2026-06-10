import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@brimos.app'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  /** Send only to these user IDs. If omitted, sends to all. */
  userIds?: string[]
}

export async function POST(req: NextRequest) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return NextResponse.json({ error: 'VAPID not configured' }, { status: 503 })
  }

  // Verify this is an internal call (same server or cron secret)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload: PushPayload = await req.json()
  const { title, body, url = '/dashboard', userIds } = payload

  const supabase = createClient()
  let query = supabase.schema('brimos').from('push_subscriptions').select('subscription')
  if (userIds && userIds.length > 0) {
    query = query.in('user_id', userIds)
  }

  const { data: rows, error } = await query
  if (error) {
    console.error('push send query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const message = JSON.stringify({ title, body, url })
  const results = await Promise.allSettled(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (rows as any[] ?? []).map((row: { subscription: webpush.PushSubscription }) =>
      webpush.sendNotification(row.subscription, message)
    )
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length
  return NextResponse.json({ sent, failed })
}
