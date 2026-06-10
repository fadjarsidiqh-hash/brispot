import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const subscription = await req.json()
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .schema('brimos' as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('push_subscriptions' as any)
      .upsert(
        { user_id: user.id, endpoint: subscription.endpoint, subscription },
        { onConflict: 'user_id,endpoint' }
      )

    if (error) {
      // Table might not exist yet — gracefully ignore
      console.error('push_subscriptions upsert error:', error.message)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json()
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .schema('brimos' as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('push_subscriptions' as any)
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
