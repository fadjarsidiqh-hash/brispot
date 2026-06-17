import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const cookieStore = cookies()
  const all = cookieStore.getAll()
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return NextResponse.json({
    cookieCount: all.length,
    cookieNames: all.map((c) => c.name),
    user: user ? { id: user.id, email: user.email } : null,
    authError: error?.message,
  })
}
