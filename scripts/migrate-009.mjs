/**
 * Migration 009 — Tambah kolom debitur & tanggal kredit
 * Run: node scripts/migrate-009.mjs
 */

const SUPABASE_URL = 'https://pnlwwnaxhcsmzhtjfbro.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBubHd3bmF4aGNzbXpodGpmYnJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUzMzg2MCwiZXhwIjoyMDg3MTA5ODYwfQ.1Qy-7o0l9mKySKR9D_ctV_g63Vmt-7mzI4JkApErxkU'

const SQL = `
ALTER TABLE brimos.decision_notes
  ADD COLUMN IF NOT EXISTS debtor_nik              TEXT,
  ADD COLUMN IF NOT EXISTS debtor_phone            TEXT,
  ADD COLUMN IF NOT EXISTS credit_application_date DATE;
`

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/run_sql`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey':        SERVICE_KEY,
    },
    body: JSON.stringify({ query: sql }),
  })
  // If run_sql RPC doesn't exist, fall back to Supabase Management API
  if (!res.ok) {
    const mgmtRes = await fetch(
      `https://api.supabase.com/v1/projects/pnlwwnaxhcsmzhtjfbro/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      }
    )
    if (!mgmtRes.ok) {
      const errText = await mgmtRes.text()
      console.error('❌ Migration failed via Management API:', errText)
      console.log('\n⚠️  Jalankan SQL berikut secara manual di Supabase SQL Editor:')
      console.log('─'.repeat(60))
      console.log(SQL)
      console.log('─'.repeat(60))
      process.exit(1)
    }
    const data = await mgmtRes.json()
    return data
  }
  return res.json()
}

console.log('🚀 Running migration 009 — debtor fields...')
try {
  await runSQL(SQL)
  console.log('✅ Migration 009 berhasil! Kolom baru:')
  console.log('   - debtor_nik              (NIK KTP debitur)')
  console.log('   - debtor_phone            (No HP/WA debitur)')
  console.log('   - credit_application_date (Tanggal pengajuan kredit)')
} catch (e) {
  console.error('❌ Error:', e.message)
  console.log('\n⚠️  Jalankan SQL berikut secara manual di Supabase SQL Editor:')
  console.log(SQL)
}
