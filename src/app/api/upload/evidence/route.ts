import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'brimos' } }
)

export async function POST(req: NextRequest) {
  // Verify the user is authenticated
  const serverClient = createServerClient()
  const { data: { user }, error: authErr } = await serverClient.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const dnId = formData.get('dnId') as string | null
  const conditionId = formData.get('conditionId') as string | null
  const pathPrefix = (formData.get('pathPrefix') as string | null) ?? 'evidences'
  const saveRecord = formData.get('saveRecord') !== 'false'

  if (!file || !dnId) {
    return NextResponse.json({ error: 'Missing file or dnId' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const safeName = file.name.replace(/\s+/g, '_')
  const path = `${pathPrefix}/${dnId}/${Date.now()}_${safeName}`

  const { data: storageData, error: storageErr } = await serviceSupabase.storage
    .from('brimos-evidence')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (storageErr) {
    return NextResponse.json({ error: storageErr.message }, { status: 500 })
  }

  const { data: { publicUrl } } = serviceSupabase.storage
    .from('brimos-evidence')
    .getPublicUrl(storageData.path)

  // Save record to DB using service role (only for evidence uploads, not SLIK)
  if (saveRecord) {
    const { error: dbErr } = await serviceSupabase.from('dn_evidences').insert({
      dn_id: dnId,
      condition_id: conditionId ?? null,
      file_name: file.name,
      file_path: storageData.path,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    })

    if (dbErr) {
      console.error('dn_evidences insert error:', dbErr.message)
    }
  }

  return NextResponse.json({ publicUrl, path: storageData.path })
}
