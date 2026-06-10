-- Migration 007: Dokumen kurang flow + NIP login support
-- Tambah status NEEDS_REVISION, kolom revision tracking, RPC NIP→email lookup.

-- 1. Tambah status NEEDS_REVISION ke enum dn_status
ALTER TYPE brimos.dn_status ADD VALUE IF NOT EXISTS 'NEEDS_REVISION';

-- 2. Tambah kolom revision tracking ke decision_notes
ALTER TABLE brimos.decision_notes
  ADD COLUMN IF NOT EXISTS revision_requested_by  uuid REFERENCES brimos.profiles(id),
  ADD COLUMN IF NOT EXISTS revision_requested_at  timestamptz,
  ADD COLUMN IF NOT EXISTS revision_notes         text,
  ADD COLUMN IF NOT EXISTS revision_from_status   brimos.dn_status;
  -- revision_from_status menyimpan status sebelum minta revisi (SUBMITTED atau DECIDED_BOH)
  -- Setelah RM lengkapi & resubmit, status DN dikembalikan ke nilai ini → langsung naik ke verifikator yg sama

-- 3. RPC: lookup email by NIP untuk login
-- Dipanggil dari halaman login dengan anon key. SECURITY DEFINER agar bisa baca tabel profiles
-- tanpa membuka SELECT publik ke semua kolom.
CREATE OR REPLACE FUNCTION brimos.get_email_by_nip(p_nip text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = brimos, public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email
  FROM brimos.profiles
  WHERE nip = p_nip AND is_active = true
  LIMIT 1;
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION brimos.get_email_by_nip(text) TO anon, authenticated;
