/**
 * Migration 011 — Pilihan PIC, Upload SLIK, Tipe pemenuhan tindak lanjut.
 *   node scripts/migrate-011.mjs
 *
 * Memakai SUPABASE_ACCESS_TOKEN dari environment bila ada, atau meminta
 * Personal Access Token (sbp_...) lewat prompt terminal.
 */

import readline from 'node:readline'

const PROJECT_REF = 'pnlwwnaxhcsmzhtjfbro'

const STATEMENTS = [
  // PIC penanggung jawab pelaksanaan + path file SLIK opsional
  `ALTER TABLE brimos.decision_notes
     ADD COLUMN IF NOT EXISTS pic_type       TEXT NOT NULL DEFAULT 'RM',
     ADD COLUMN IF NOT EXISTS slik_file_path TEXT;`,
  // Tipe pemenuhan tiap tindak lanjut: EVIDENCE (wajib upload) / CHECKLIST (cukup konfirmasi)
  `ALTER TABLE brimos.dn_conditions
     ADD COLUMN IF NOT EXISTS requirement_type TEXT NOT NULL DEFAULT 'CHECKLIST';`,
  // RLS dn_conditions: select untuk semua staf terkait
  `DROP POLICY IF EXISTS "dn_conditions: select" ON brimos.dn_conditions;`,
  `DROP POLICY IF EXISTS "dnc_select" ON brimos.dn_conditions;`,
  `CREATE POLICY "dnc_select" ON brimos.dn_conditions FOR SELECT USING (
     EXISTS (SELECT 1 FROM brimos.decision_notes dn WHERE dn.id = dn_conditions.dn_id AND (
       dn.rm_id = auth.uid() OR dn.adk_id = auth.uid() OR dn.boh_id = auth.uid() OR dn.manager_id = auth.uid()
       OR EXISTS (SELECT 1 FROM brimos.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('ADMIN','BOH','MANAGER','RM','ADK'))
     ))
   );`,
  // RLS dn_conditions: hanya pemutus (Manager/BOH/Admin) yang boleh menambah tindak lanjut
  `DROP POLICY IF EXISTS "dn_conditions: insert" ON brimos.dn_conditions;`,
  `DROP POLICY IF EXISTS "dnc_insert" ON brimos.dn_conditions;`,
  `CREATE POLICY "dnc_insert" ON brimos.dn_conditions FOR INSERT WITH CHECK (
     EXISTS (SELECT 1 FROM brimos.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('ADMIN','BOH','MANAGER'))
   );`,
  // RLS dn_conditions: PIC (RM/ADK) & pemutus boleh update status pelaksanaan
  `DROP POLICY IF EXISTS "dn_conditions: update" ON brimos.dn_conditions;`,
  `DROP POLICY IF EXISTS "dnc_update" ON brimos.dn_conditions;`,
  `CREATE POLICY "dnc_update" ON brimos.dn_conditions FOR UPDATE USING (
     EXISTS (SELECT 1 FROM brimos.decision_notes dn WHERE dn.id = dn_conditions.dn_id AND (
       dn.rm_id = auth.uid() OR dn.adk_id = auth.uid() OR dn.boh_id = auth.uid() OR dn.manager_id = auth.uid()
       OR EXISTS (SELECT 1 FROM brimos.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('ADMIN'))
     ))
   );`,
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
  console.log('\nMigration 011 - PIC + SLIK upload + requirement_type\n')
  let allOk = true
  for (let i = 0; i < STATEMENTS.length; i++) {
    if (!(await runStatement(STATEMENTS[i], i, token))) allOk = false
  }
  console.log(allOk ? '\nMigration 011 berhasil.' : '\nAda statement gagal.')
  if (!allOk) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
