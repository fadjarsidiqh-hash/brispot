-- Migration 006: Rename roles AO→RM, DK→ADK + rename columns for consistency
-- Workflow baru: RM (input) → BOH (putuskan + set kerahasiaan) → ADK (verifikasi)

-- 1. Rename user_role enum values
ALTER TYPE brimos.user_role RENAME VALUE 'AO' TO 'RM';
ALTER TYPE brimos.user_role RENAME VALUE 'DK' TO 'ADK';

-- 2. Rename dn_status enum values
ALTER TYPE brimos.dn_status RENAME VALUE 'VERIFIED_DK'  TO 'DECIDED_BOH';
ALTER TYPE brimos.dn_status RENAME VALUE 'VERIFIED_BOH' TO 'VERIFIED_ADK';

-- 3. Rename columns in decision_notes for clarity
ALTER TABLE brimos.decision_notes RENAME COLUMN ao_id          TO rm_id;
ALTER TABLE brimos.decision_notes RENAME COLUMN dk_id          TO adk_id;
ALTER TABLE brimos.decision_notes RENAME COLUMN verified_dk_at TO decided_boh_at;
ALTER TABLE brimos.decision_notes RENAME COLUMN verified_boh_at TO verified_adk_at;
