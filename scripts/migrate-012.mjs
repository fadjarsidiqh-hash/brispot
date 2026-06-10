/**
 * Migration 012 — Fix dn_update RLS: izinkan MANAGER dan ADK memperbarui
 * decision_notes, serta tambahkan MANAGER ke audit policy.
 *   node scripts/migrate-012.mjs
 */
import readline from 'node:readline'

const PROJECT_REF = 'pnlwwnaxhcsmzhtjfbro'

const STATEMENTS = [
  // Perbaiki dn_update: izinkan rm_id, adk_id, boh_id, manager_id, serta
  // semua user dengan role ADMIN/BOH/MANAGER/ADK untuk update
  `DROP POLICY IF EXISTS "dn_update" ON brimos.decision_notes;`,
  `CREATE POLICY "dn_update" ON brimos.decision_notes FOR UPDATE USING (
     rm_id = auth.uid()
     OR adk_id = auth.uid()
     OR boh_id = auth.uid()
     OR manager_id = auth.uid()
     OR EXISTS (
       SELECT 1 FROM brimos.profiles
       WHERE id = auth.uid()
         AND role::text IN ('ADMIN', 'BOH', 'MANAGER', 'ADK')
     )
   );`,
  // Perbaiki audit_logs SELECT policy: sertakan MANAGER
  `DROP POLICY IF EXISTS "audit_admin" ON brimos.audit_logs;`,
  `CREATE POLICY "audit_admin" ON brimos.audit_logs FOR SELECT USING (
     EXISTS (
       SELECT 1 FROM brimos.profiles
       WHERE id = auth.uid()
         AND role::text IN ('ADMIN', 'MANAGER', 'BOH')
     )
   );`,
  // INSERT audit_logs: semua user terautentikasi bisa insert
  `DROP POLICY IF EXISTS "audit_insert" ON brimos.audit_logs;`,
  `CREATE POLICY "audit_insert" ON brimos.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);`,
]

function askToken() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question('Masukkan Supabase Personal Access Token (sbp_...): ', (a) => { rl.close(); resolve(a.trim()) })
  })
}

async function runStatement(sql, idx, token) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) {
    console.error(`X Statement ${idx + 1} gagal: ${(await res.text()).substring(0, 300)}`)
    return false
  }
  console.log(`OK Statement ${idx + 1}`)
  return true
}

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN || (await askToken())
  if (!token || !token.startsWith('sbp_')) {
    console.error('X Token tidak valid. Harus Personal Access Token (sbp_...).')
    process.exit(1)
  }
  console.log('\nMigration 012 - Fix dn_update RLS + audit policy\n')
  let allOk = true
  for (let i = 0; i < STATEMENTS.length; i++) {
    if (!(await runStatement(STATEMENTS[i], i, token))) allOk = false
  }
  console.log(allOk ? '\nMigration 012 berhasil.' : '\nAda statement gagal.')
  if (!allOk) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
