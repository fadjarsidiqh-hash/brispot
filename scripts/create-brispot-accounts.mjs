/**
 * Buat 4 akun BRISPOT (data nyata) + nonaktifkan akun test lama.
 *
 * PENTING: Jalankan SETELAH migration 010_manager_slik.sql dieksekusi di
 * Supabase SQL Editor (role MANAGER harus sudah ada di enum brimos.user_role).
 *
 * Run: node scripts/create-brispot-accounts.mjs
 *
 * Login memakai NIP. Password awal seragam = Brispot@2025
 * Setiap user disarankan mengganti password sendiri lewat halaman Profil.
 */

const SUPABASE_URL = 'https://pnlwwnaxhcsmzhtjfbro.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBubHd3bmF4aGNzbXpodGpmYnJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUzMzg2MCwiZXhwIjoyMDg3MTA5ODYwfQ.1Qy-7o0l9mKySKR9D_ctV_g63Vmt-7mzI4JkApErxkU'

const DEFAULT_PASSWORD = 'Brispot@2025'
const BRANCH_CODE = 'KC001'
const BRANCH_NAME = 'Kantor Cabang BRI'

const headers = {
  'Content-Type':  'application/json',
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey':        SERVICE_KEY,
}

// 4 akun nyata. Email memakai placeholder; user dapat memperbarui email sendiri.
const NEW_ACCOUNTS = [
  { full_name: 'Rustiadi',                nip: '00151742', role: 'RM',      email: '00151742@brispot.id' },
  { full_name: 'Millati Amalia',          nip: '00152892', role: 'MANAGER', email: '00152892@brispot.id' },
  { full_name: 'Ahmad Sudiyana Suwandi',  nip: '00065585', role: 'BOH',     email: '00065585@brispot.id' },
  { full_name: 'Ervi Rosdianah',          nip: '00277551', role: 'ADK',     email: '00277551@brispot.id' },
]

// Akun test lama yang dinonaktifkan (tidak dihapus agar histori DN tetap aman).
const DEACTIVATE_NIPS = ['10000001', '20000002', '30000003']

async function createUser(acc) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email:         acc.email,
      password:      DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: acc.full_name, role: acc.role },
    }),
  })
  const data = await res.json()
  let userId = data?.id

  if (!res.ok) {
    if ((data?.msg || data?.error_description || '').toLowerCase().includes('already')) {
      console.log(`ℹ Auth user sudah ada, mengambil id: ${acc.email}`)
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(acc.email)}`, { headers })
      const listData = await listRes.json()
      userId = listData?.users?.[0]?.id
      if (!userId) { console.error(`✗ Tidak bisa resolve user id untuk ${acc.email}`); return null }
      // reset password agar seragam
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ password: DEFAULT_PASSWORD }),
      })
    } else {
      console.error(`✗ Auth gagal untuk ${acc.email}:`, data); return null
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
      role: acc.role, branch_code: BRANCH_CODE, branch_name: BRANCH_NAME,
      nip: acc.nip, is_active: true,
    }),
  })
  if (profRes.ok || profRes.status === 201 || profRes.status === 204) {
    console.log(`✓ Profile tersimpan: ${acc.full_name} [${acc.role}] NIP=${acc.nip}`)
  } else {
    console.warn(`⚠ Profile gagal untuk ${acc.email}: ${(await profRes.text()).substring(0, 200)}`)
  }
  return userId
}

async function deactivate(nip) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?nip=eq.${nip}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Profile': 'brimos', 'Prefer': 'return=minimal' },
    body: JSON.stringify({ is_active: false }),
  })
  if (res.ok || res.status === 204) {
    console.log(`✓ Akun test NIP ${nip} dinonaktifkan`)
  } else {
    console.warn(`⚠ Gagal menonaktifkan NIP ${nip}: ${(await res.text()).substring(0, 160)}`)
  }
}

async function main() {
  console.log('\n🚀 Buat 4 akun BRISPOT (data nyata)\n')

  for (const acc of NEW_ACCOUNTS) {
    console.log(`\n→ ${acc.role}: ${acc.full_name}`)
    await createUser(acc)
  }

  console.log('\n— Nonaktifkan akun test lama —')
  for (const nip of DEACTIVATE_NIPS) await deactivate(nip)

  console.log('\n✅ Selesai!\n')
  console.log('Akun BRISPOT (login pakai NIP, password awal: Brispot@2025):')
  console.log('  RM       Rustiadi               NIP 00151742')
  console.log('  MANAGER  Millati Amalia         NIP 00152892')
  console.log('  BOH      Ahmad Sudiyana Suwandi NIP 00065585')
  console.log('  ADK      Ervi Rosdianah         NIP 00277551')
  console.log('\nSetiap user dapat mengganti password sendiri di menu Profil.\n')
}

main().catch(console.error)
