-- ============================================================
-- BRIMOS Migration 009 — Tambah kolom debitur & tanggal kredit
-- Kolom baru di decision_notes:
--   debtor_nik              : NIK KTP debitur
--   debtor_phone            : No HP/WA debitur
--   credit_application_date : Tanggal pengajuan kredit debitur
-- ============================================================

ALTER TABLE brimos.decision_notes
  ADD COLUMN IF NOT EXISTS debtor_nik              TEXT,
  ADD COLUMN IF NOT EXISTS debtor_phone            TEXT,
  ADD COLUMN IF NOT EXISTS credit_application_date DATE;

-- Rename credit_amount semantic: tidak perlu rename kolom DB,
-- perubahan hanya di label UI ("Plafond Kredit").
