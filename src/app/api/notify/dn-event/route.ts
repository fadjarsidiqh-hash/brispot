import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

/**
 * POST /api/notify/dn-event
 * Triggers WA + (optional) email notifications for DN lifecycle events.
 * Body: { dnId: string, event: 'DECIDED_BOH' | 'VERIFIED_ADK' | 'REJECTED' | 'NEEDS_REVISION' | 'COMPLETED' | 'SUBMITTED' | 'RESUBMITTED', notes?: string }
 *
 * Authenticated session required. Loads DN with all related profiles server-side
 * and sends notifications via Fonnte. Silently skips if FONNTE_API_TOKEN absent.
 */

const FONNTE_URL = 'https://api.fonnte.com/send'

interface Profile { id?: string; full_name: string; phone: string | null; email: string }
type DNRecord = {
  id: string
  dn_number: string
  debtor_name: string
  status: string
  credit_amount: number | null
  slik_status: string | null
  pic_type: string | null
  branch_code: string
  rm: Profile | null
  boh: Profile | null
  adk: Profile | null
  manager: Profile | null
}

// DN dengan limit di atas nilai ini ATAU SLIK MERAH wajib melewati BOH setelah Manager.
const BOH_THRESHOLD = 1_000_000_000
function requiresBoh(dn: DNRecord): boolean {
  return (dn.credit_amount ?? 0) > BOH_THRESHOLD || dn.slik_status === 'MERAH'
}

async function sendWA(phone: string | null, message: string): Promise<void> {
  if (!phone) return
  const token = process.env.FONNTE_API_TOKEN
  if (!token) {
    console.log('[notify/dn-event] FONNTE_API_TOKEN absent → skip WA to', phone)
    return
  }
  try {
    const res = await fetch(FONNTE_URL, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: phone, message }),
    })
    if (!res.ok) console.error('[notify/dn-event] WA send failed:', await res.text())
  } catch (e) {
    console.error('[notify/dn-event] WA exception:', e)
  }
}

function buildMessage(event: string, dn: DNRecord, notes?: string): string {
  const head = `*[BRISPOT]*\nDN: ${dn.dn_number}\nDebitur: ${dn.debtor_name}\n`
  const toBoh = requiresBoh(dn)
  switch (event) {
    case 'SUBMITTED':
      return `${head}\n📤 DN diajukan oleh RM kepada *Manager* untuk diputuskan.`
    case 'DECIDED_MANAGER':
      return toBoh
        ? `${head}\n✅ DN telah *diputuskan oleh Manager*. Selanjutnya diteruskan ke *BOH* (limit di atas Rp1 miliar / SLIK Merah).`
        : `${head}\n✅ DN telah *diputuskan oleh Manager*. Selanjutnya akan diverifikasi oleh ADK.`
    case 'DECIDED_BOH':
      return `${head}\n✅ DN telah *diputuskan oleh BOH*. Selanjutnya akan diverifikasi oleh ADK.`
    case 'VERIFIED_ADK':
      return `${head}\n✅ DN telah *diverifikasi oleh ADK*. Siap untuk diselesaikan.`
    case 'COMPLETED':
      return `${head}\n🎉 DN telah *diselesaikan (COMPLETED)*.`
    case 'REJECTED':
      return `${head}\n❌ DN *ditolak*.\nAlasan: ${notes || '(tidak ada)'}`
    case 'NEEDS_REVISION':
      return `${head}\n⚠️ DN dikembalikan ke RM karena *dokumen kurang*.\nCatatan verifikator: ${notes || '(tidak ada)'}\n\nMohon segera lengkapi dokumen di sistem BRISPOT.`
    case 'RESUBMITTED':
      return `${head}\n🔁 DN telah *dilengkapi & diajukan ulang* oleh RM. Mohon dicek kembali.`
    default:
      return `${head}\nUpdate: ${event}`
  }
}

/** Determine which recipients to notify based on event */
async function getRecipients(event: string, dn: DNRecord, supabase: ReturnType<typeof createClient>): Promise<Profile[]> {
  const toBoh = requiresBoh(dn)

  // Helper: fetch all profiles in same branch with given role
  const branchUsers = async (role: string): Promise<Profile[]> => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone, email')
      .eq('branch_code', dn.branch_code)
      .eq('role', role as UserRole)
      .eq('is_active', true)
    return (data ?? []) as Profile[]
  }

  // PIC list based on pic_type
  const picRecipients = (): Profile[] => {
    const pic = dn.pic_type ?? 'RM'
    if (pic === 'BOTH') return [dn.rm, dn.adk].filter(Boolean) as Profile[]
    if (pic === 'ADK') return [dn.adk].filter(Boolean) as Profile[]
    return [dn.rm].filter(Boolean) as Profile[]
  }

  switch (event) {
    case 'SUBMITTED':
      // RM submitted → notify Manager (pemutus pertama).
      // manager_id belum diset saat submit, cari semua MANAGER di cabang.
      if (dn.manager) return [dn.manager]
      return await branchUsers('MANAGER')
    case 'DECIDED_MANAGER':
      // Manager decided → notify BOH (jika > 1M / SLIK Merah) atau PIC (ADK/RM)
      if (toBoh) {
        const boh = dn.boh ? [dn.boh] : await branchUsers('BOH')
        return boh
      }
      return picRecipients()
    case 'DECIDED_BOH':
      // BOH decided → notify PIC (RM/ADK sesuai pic_type)
      return picRecipients()
    case 'VERIFIED_ADK':
      // ADK verified → notify RM + BOH + Manager
      return [dn.rm, dn.boh, dn.manager].filter(Boolean) as Profile[]
    case 'COMPLETED':
      return [dn.rm, dn.boh, dn.adk, dn.manager].filter(Boolean) as Profile[]
    case 'REJECTED':
    case 'NEEDS_REVISION':
      return [dn.rm].filter(Boolean) as Profile[]
    case 'RESUBMITTED':
      return [dn.manager, dn.boh, dn.adk].filter(Boolean) as Profile[]
    default:
      return []
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dnId, event, notes } = (await request.json()) as {
    dnId: string
    event: string
    notes?: string
  }
  if (!dnId || !event) return NextResponse.json({ error: 'Missing dnId or event' }, { status: 400 })

  const { data: dnData, error } = await supabase
    .from('decision_notes')
    .select(`
      id, dn_number, debtor_name, status, credit_amount, slik_status, pic_type, branch_code,
      rm:rm_id(id, full_name, phone, email),
      boh:boh_id(id, full_name, phone, email),
      adk:adk_id(id, full_name, phone, email),
      manager:manager_id(id, full_name, phone, email)
    `)
    .eq('id', dnId)
    .single()

  if (error || !dnData) {
    return NextResponse.json({ error: error?.message ?? 'DN not found' }, { status: 404 })
  }

  const dn = dnData as unknown as DNRecord
  const message = buildMessage(event, dn, notes)
  const recipients = await getRecipients(event, dn, supabase)

  await Promise.all(recipients.map((r) => sendWA(r.phone, message)))

  // --- Browser Push Notifications ---
  // Use recipient id if already available (branch lookup path), else lookup by email
  try {
    const existingIds = recipients.map((r) => r.id).filter(Boolean) as string[]
    let userIds: string[] = existingIds
    if (existingIds.length !== recipients.length) {
      const emails = recipients.map((r) => r.email).filter(Boolean)
      if (emails.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('email', emails)
        userIds = (profiles ?? []).map((p: { id: string }) => p.id)
      }
    }
    if (userIds.length > 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      await fetch(`${appUrl}/api/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({
          title: 'BRISPOT',
          body: message.replace(/\*/g, '').split('\n').slice(2).join(' ').substring(0, 100),
          url: `/decision-notes/${dn.id}`,
          userIds,
        }),
      })
    }
  } catch (e) {
    console.error('[notify/dn-event] push send error:', e)
  }

  return NextResponse.json({ ok: true, notified: recipients.length })
}
