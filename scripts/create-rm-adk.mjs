/**
 * Langkah 2/3 — Create RM & ADK test accounts + patch BOH/ADMIN with NIP & phone.
 * Jalankan SETELAH migration 006 + 007 dieksekusi di Supabase SQL Editor.
 * Run: node scripts/create-rm-adk.mjs
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY env vars before running this script.')
  process.exit(1)
}

const PHONE = '6281617543660'

const headers = {
  'Content-Type':  'application/json',
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey':        SERVICE_KEY,
}

const NEW_ACCOUNTS = [
  { email: 'rm.test@brimos.id',  password: 'BrimosRM@2025',  full_name: 'Test RM User',  role: 'RM',  branch_code: 'KCP001', branch_name: 'KCP Test Cabang', nip: '10000001', phone: PHONE },
  { email: 'adk.test@brimos.id', password: 'BrimosADK@2025', full_name: 'Test ADK User', role: 'ADK', branch_code: 'KCP001', branch_name: 'KCP Test Cabang', nip: '30000003', phone: PHONE },
]

const PATCH_EXISTING = [
  { id: 'dd60ccba-15f4-4a9f-9b11-6ef71a69573c', email: 'boh.test@brimos.id', nip: '20000002', phone: PHONE },
  { id: 'b5b33bff-c0b1-491a-97c7-e5924d305570', email: 'admin@brimos.id',    nip: '90000000', phone: PHONE },
]

async function createUser(acc) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email:         acc.email,
      password:      acc.password,
      email_confirm: true,
      user_metadata: { full_name: acc.full_name, role: acc.role },
    }),
  })
  const data = await res.json()
  let userId = data?.id
  if (!res.ok) {
    if ((data?.msg || data?.error_description || '').toLowerCase().includes('already')) {
      console.log(`ℹ Auth user already exists, fetching: ${acc.email}`)
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(acc.email)}`, { headers })
      const listData = await listRes.json()
      userId = listData?.users?.[0]?.id
      if (!userId) { console.error(`✗ Cannot resolve existing user id for ${acc.email}`); return null }
    } else {
      console.error(`✗ Auth failed for ${acc.email}:`, data); return null
    }
  } else {
    console.log(`✓ Auth user: ${acc.email} (${userId})`)
  }

  const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Profile': 'brimos',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      id: userId, full_name: acc.full_name, email: acc.email,
      role: acc.role, branch_code: acc.branch_code, branch_name: acc.branch_name,
      nip: acc.nip, phone: acc.phone, is_active: true,
    }),
  })
  if (profRes.ok || profRes.status === 201 || profRes.status === 204) {
    console.log(`✓ Profile upserted: ${acc.email} [${acc.role}] NIP=${acc.nip}`)
  } else {
    console.warn(`⚠ Profile upsert issue for ${acc.email}: ${(await profRes.text()).substring(0, 160)}`)
  }
  return userId
}

async function patchProfile(p) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${p.id}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Profile': 'brimos', 'Prefer': 'return=minimal' },
    body: JSON.stringify({ nip: p.nip, phone: p.phone }),
  })
  if (res.ok || res.status === 204) {
    console.log(`✓ Patched ${p.email}: NIP=${p.nip}, phone=${p.phone}`)
  } else {
    console.warn(`⚠ Patch failed for ${p.email}: ${(await res.text()).substring(0, 160)}`)
  }
}

async function main() {
  console.log('\n🚀 Create RM/ADK + Patch BOH/ADMIN (NIP + phone)\n')

  console.log('— Patch existing accounts —')
  for (const p of PATCH_EXISTING) await patchProfile(p)

  console.log('\n— Create new RM & ADK —')
  for (const acc of NEW_ACCOUNTS) {
    console.log(`\n→ ${acc.role}: ${acc.email}`)
    await createUser(acc)
  }

  console.log('\n✅ Selesai!\n')
  console.log('Akun test (login pakai NIP):')
  console.log('  RM     NIP 10000001 / BrimosRM@2025')
  console.log('  BOH    NIP 20000002 / BrimosBOH@2025')
  console.log('  ADK    NIP 30000003 / BrimosADK@2025')
  console.log('  ADMIN  NIP 90000000 / BrimosAdmin@2025')
  console.log(`  Semua WhatsApp: ${PHONE}\n`)
}

main().catch(console.error)
