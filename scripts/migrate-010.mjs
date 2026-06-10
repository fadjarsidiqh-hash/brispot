/**
 * Migration 010 — role MANAGER (CBM/Manager), status DECIDED_MANAGER,
 * kolom SLIK + keputusan Manager.
 *
 * Token TIDAK disimpan di file. Script meminta Supabase Personal Access Token
 * (sbp_...) lewat prompt terminal saat dijalankan:
 *
 *   node scripts/migrate-010.mjs
 *
 * Ambil token di: https://supabase.com/dashboard/account/tokens
 * Setiap statement dijalankan terpisah lewat Supabase Management API
 * (commit per-statement) agar ALTER TYPE ... ADD VALUE aman.
 */

import readline from 'node:readline'

const PROJECT_REF = 'pnlwwnaxhcsmzhtjfbro'

const STATEMENTS = [
  `ALTER TYPE brimos.user_role ADD VALUE IF NOT EXISTS 'MANAGER';`,
  `ALTER TYPE brimos.dn_status ADD VALUE IF NOT EXISTS 'DECIDED_MANAGER';`,
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_type t
       JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE t.typname = 'slik_status' AND n.nspname = 'brimos'
     ) THEN
       CREATE TYPE brimos.slik_status AS ENUM ('HIJAU', 'KUNING', 'MERAH');
     END IF;
   END$$;`,
  `ALTER TABLE brimos.decision_notes
     ADD COLUMN IF NOT EXISTS slik_status        brimos.slik_status,
     ADD COLUMN IF NOT EXISTS manager_id         UUID REFERENCES brimos.profiles(id),
     ADD COLUMN IF NOT EXISTS decided_manager_at TIMESTAMPTZ,
     ADD COLUMN IF NOT EXISTS manager_notes      TEXT;`,
  `DROP POLICY IF EXISTS "dn_select" ON brimos.decision_notes;`,
  `CREATE POLICY "dn_select" ON brimos.decision_notes FOR SELECT USING (
     rm_id = auth.uid()
     OR adk_id = auth.uid()
     OR boh_id = auth.uid()
     OR manager_id = auth.uid()
     OR EXISTS (
       SELECT 1 FROM brimos.profiles
       WHERE id = auth.uid()
         AND role::text IN ('ADMIN', 'BOH', 'MANAGER', 'RM', 'ADK')
     )
   );`,
]

function askToken() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question('Masukkan Supabase Personal Access Token (sbp_...): ', (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function runStatement(sql, idx, token) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: sql }),
    }
  )
  if (!res.ok) {
    const txt = await res.text()
    console.error(`X Statement ${idx + 1} gagal: ${txt.substring(0, 300)}`)
    return false
  }
  console.log(`OK Statement ${idx + 1}`)
  return true
}

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN || (await askToken())
  if (!token || !token.startsWith('sbp_')) {
    console.error('X Token tidak valid. Harus berupa Personal Access Token (sbp_...).')
    process.exit(1)
  }

  console.log('\nMigration 010 - MANAGER + SLIK\n')
  let allOk = true
  for (let i = 0; i < STATEMENTS.length; i++) {
    const ok = await runStatement(STATEMENTS[i], i, token)
    if (!ok) allOk = false
  }
  if (allOk) {
    console.log('\nMigration 010 berhasil dijalankan.')
  } else {
    console.log('\nAda statement yang gagal. Periksa pesan di atas.')
    process.exit(1)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
