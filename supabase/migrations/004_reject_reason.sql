-- Migration 004: Add reject_reason and rejected_at columns to decision_notes
-- These columns support the DN rejection workflow (DK/BOH can reject a DN with a reason)

ALTER TABLE brimos.decision_notes
  ADD COLUMN IF NOT EXISTS reject_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
