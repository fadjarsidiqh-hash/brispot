-- ============================================================
-- Migration 010: Tambah role MANAGER, status DECIDED_MANAGER,
-- kolom SLIK, dan kolom keputusan Manager.
-- Workflow baru: RM -> MANAGER -> (jika plafond > 1 M: BOH) -> ADK
-- ============================================================
-- CATATAN: Jalankan seluruh skrip ini sekali di Supabase SQL Editor.
-- ALTER TYPE ... ADD VALUE aman dijalankan di sini karena nilai enum
-- baru TIDAK dipakai sebagai literal di transaksi yang sama.
-- ============================================================

-- 1. Role baru: MANAGER (setara pemutus tingkat manager)
ALTER TYPE brimos.user_role ADD VALUE IF NOT EXISTS 'MANAGER';

-- 2. Status baru: keputusan oleh Manager
ALTER TYPE brimos.dn_status ADD VALUE IF NOT EXISTS 'DECIDED_MANAGER';

-- 3. Enum status SLIK (warna)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'slik_status' AND n.nspname = 'brimos'
  ) THEN
    CREATE TYPE brimos.slik_status AS ENUM ('HIJAU', 'KUNING', 'MERAH');
  END IF;
END$$;

-- 4. Kolom baru di decision_notes
ALTER TABLE brimos.decision_notes
  ADD COLUMN IF NOT EXISTS slik_status        brimos.slik_status,
  ADD COLUMN IF NOT EXISTS manager_id         UUID REFERENCES brimos.profiles(id),
  ADD COLUMN IF NOT EXISTS decided_manager_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manager_notes      TEXT;

-- 5. Perbarui RLS SELECT agar MANAGER & manager_id ikut terbaca.
--    Memakai role::text agar tidak butuh literal enum baru di transaksi ini.
DROP POLICY IF EXISTS "dn_select" ON brimos.decision_notes;
CREATE POLICY "dn_select" ON brimos.decision_notes FOR SELECT USING (
  rm_id = auth.uid()
  OR adk_id = auth.uid()
  OR boh_id = auth.uid()
  OR manager_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM brimos.profiles
    WHERE id = auth.uid()
      AND role::text IN ('ADMIN', 'BOH', 'MANAGER', 'RM', 'ADK')
  )
);
