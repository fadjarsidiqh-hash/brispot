-- ============================================================
-- Migration 011: Pilihan PIC, Upload SLIK, tipe pemenuhan tindak lanjut
-- Workflow sesuai flowchart BRISPOT.
-- Dijalankan via scripts/migrate-011.mjs (Supabase Management API).
-- ============================================================

-- PIC penanggung jawab pelaksanaan (RM / ADK / BOTH) + path file SLIK opsional
ALTER TABLE brimos.decision_notes
  ADD COLUMN IF NOT EXISTS pic_type       TEXT NOT NULL DEFAULT 'RM',
  ADD COLUMN IF NOT EXISTS slik_file_path TEXT;

-- Tipe pemenuhan tiap tindak lanjut: EVIDENCE (wajib upload) / CHECKLIST (cukup konfirmasi)
ALTER TABLE brimos.dn_conditions
  ADD COLUMN IF NOT EXISTS requirement_type TEXT NOT NULL DEFAULT 'CHECKLIST';

-- RLS dn_conditions: select untuk semua staf terkait
DROP POLICY IF EXISTS "dn_conditions: select" ON brimos.dn_conditions;
DROP POLICY IF EXISTS "dnc_select" ON brimos.dn_conditions;
CREATE POLICY "dnc_select" ON brimos.dn_conditions FOR SELECT USING (
  EXISTS (SELECT 1 FROM brimos.decision_notes dn WHERE dn.id = dn_conditions.dn_id AND (
    dn.rm_id = auth.uid() OR dn.adk_id = auth.uid() OR dn.boh_id = auth.uid() OR dn.manager_id = auth.uid()
    OR EXISTS (SELECT 1 FROM brimos.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('ADMIN','BOH','MANAGER','RM','ADK'))
  ))
);

-- RLS dn_conditions: hanya pemutus (Manager/BOH/Admin) yang boleh menambah tindak lanjut
DROP POLICY IF EXISTS "dn_conditions: insert" ON brimos.dn_conditions;
DROP POLICY IF EXISTS "dnc_insert" ON brimos.dn_conditions;
CREATE POLICY "dnc_insert" ON brimos.dn_conditions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM brimos.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('ADMIN','BOH','MANAGER'))
);

-- RLS dn_conditions: PIC (RM/ADK) & pemutus boleh update status pelaksanaan
DROP POLICY IF EXISTS "dn_conditions: update" ON brimos.dn_conditions;
DROP POLICY IF EXISTS "dnc_update" ON brimos.dn_conditions;
CREATE POLICY "dnc_update" ON brimos.dn_conditions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM brimos.decision_notes dn WHERE dn.id = dn_conditions.dn_id AND (
    dn.rm_id = auth.uid() OR dn.adk_id = auth.uid() OR dn.boh_id = auth.uid() OR dn.manager_id = auth.uid()
    OR EXISTS (SELECT 1 FROM brimos.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('ADMIN'))
  ))
);
