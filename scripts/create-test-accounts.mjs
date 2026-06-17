/**
 * Langkah 2 — Create test accounts for BRIMOS
 * Run: node scripts/create-test-accounts.mjs
 */

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || process.env.SUPABASE_URL
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY env vars before running this script.')
  process.exit(1)
}

const TEST_ACCOUNTS = [
  {
    email:       'rm.test@brimos.id',
    password:    'BrimosRM@2025',
    full_name:   'Test RM User',
    role:        'RM',
    branch_code: 'KCP001',
    branch_name: 'KCP Test Cabang',
    nip:         '10000001',
  },
  {
    email:       'boh.test@brimos.id',
    password:    'BrimosBOH@2025',
    full_name:   'Test BOH User',
    role:        'BOH',
    branch_code: 'KCP001',
    branch_name: 'KCP Test Cabang',
    nip:         '10000002',
  },
  {
    email:       'adk.test@brimos.id',
    password:    'BrimosADK@2025',
    full_name:   'Test ADK User',
    role:        'ADK',
    branch_code: 'KCP001',
    branch_name: 'KCP Test Cabang',
    nip:         '10000003',
  },
  {
    email:       'admin@brimos.id',
    password:    'BrimosAdmin@2025',
    full_name:   'Administrator BRIMOS',
    role:        'ADMIN',
    branch_code: 'KP001',
    branch_name: 'Kantor Pusat',
    nip:         '10000000',
  },
]

const headers = {
  'Content-Type':  'application/json',
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey':        SERVICE_KEY,
}

async function createUser(account) {
  // 1. Create auth user
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method:  'POST',
    headers,
    body: JSON.stringify({
      email:            account.email,
      password:         account.password,
      email_confirm:    true,
      user_metadata: {
        full_name: account.full_name,
        role:      account.role,
      },
    }),
  })

  const authData = await authRes.json()
  if (!authRes.ok) {
    if (authData?.msg?.includes('already been registered') || authData?.error?.includes('already been registered')) {
      console.log(`  ⚠  ${account.email} sudah ada — skip auth create`)
      // Try to get existing user
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(account.email)}`, { headers })
      const listData = await listRes.json()
      const existing = listData?.users?.[0]
      if (!existing) { console.log(`  ✗  Gagal mendapatkan user existing`); return null }
      return existing.id
    }
    console.error(`  ✗  Gagal buat auth user ${account.email}:`, authData)
    return null
  }

  const userId = authData.id
  console.log(`  ✓  Auth user dibuat: ${account.email} (${userId})`)

  // 2. Upsert profile in brimos.profiles
  const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method:  'GET',
    headers: { ...headers, 'Accept-Profile': 'brimos' },
  })
  const existingProfiles = await profRes.json()

  const profilePayload = {
    id:          userId,
    full_name:   account.full_name,
    email:       account.email,
    role:        account.role,
    branch_code: account.branch_code,
    branch_name: account.branch_name,
    nip:         account.nip,
    is_active:   true,
  }

  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method:  existingProfiles.length > 0 ? 'PATCH' : 'POST',
    headers: {
      ...headers,
      'Content-Profile': 'brimos',
      'Prefer': 'return=representation,resolution=merge-duplicates',
    },
    ...(existingProfiles.length > 0
      ? { body: JSON.stringify({ role: account.role, branch_code: account.branch_code, branch_name: account.branch_name, is_active: true }) }
      : { body: JSON.stringify(profilePayload) }
    ),
    ...(existingProfiles.length > 0 ? { } : {}),
  })

  // Use upsert via POST with on-conflict for cleaner approach
  const upsertRes2 = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method:  'POST',
    headers: {
      ...headers,
      'Content-Profile': 'brimos',
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(profilePayload),
  })

  if (!upsertRes2.ok && upsertRes2.status !== 201 && upsertRes2.status !== 200) {
    const errText = await upsertRes2.text()
    console.warn(`  ⚠  Profile upsert warning for ${account.email}: ${errText.substring(0, 100)}`)
  } else {
    console.log(`  ✓  Profile upserted: ${account.email} [${account.role}]`)
  }

  return userId
}

async function main() {
  console.log('\n🚀 BRIMOS — Create Test Accounts\n')
  console.log('='.repeat(50))

  for (const account of TEST_ACCOUNTS) {
    console.log(`\n→ ${account.role}: ${account.email}`)
    const userId = await createUser(account)
    if (userId) {
      console.log(`  ✅ Selesai — ID: ${userId}`)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('\n📋 RINGKASAN AKUN TEST:\n')
  console.log('┌─────────┬───────────────────────────────┬──────────────────┐')
  console.log('│ Role    │ Email                         │ Password         │')
  console.log('├─────────┼───────────────────────────────┼──────────────────┤')
  for (const a of TEST_ACCOUNTS) {
    const role = a.role.padEnd(7)
    const email = a.email.padEnd(29)
    const pwd = a.password.padEnd(16)
    console.log(`│ ${role} │ ${email} │ ${pwd} │`)
  }
  console.log('└─────────┴───────────────────────────────┴──────────────────┘')
  console.log('\n⚠  Pastikan migration 006 sudah dijalankan di Supabase sebelum login!\n')
}

main().catch(console.error)
