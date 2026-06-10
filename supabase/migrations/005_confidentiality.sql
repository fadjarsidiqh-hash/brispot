-- Migration 005: Add confidentiality field to decision_notes
-- UMUM  = dapat dilihat semua user
-- RAHASIA = hanya AO pembuat, DK/BOH yang di-assign, dan ADMIN

ALTER TABLE brimos.decision_notes
  ADD COLUMN IF NOT EXISTS confidentiality TEXT NOT NULL DEFAULT 'UMUM'
    CHECK (confidentiality IN ('UMUM', 'RAHASIA'));
