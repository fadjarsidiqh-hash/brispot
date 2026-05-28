-- ============================================================
-- BRIMOS Initial Schema — isolated in 'brimos' schema
-- Keeps tables separate from other apps sharing this Supabase project
-- ============================================================

-- Create dedicated schema
CREATE SCHEMA IF NOT EXISTS brimos;

-- Grant PostgREST access
GRANT USAGE ON SCHEMA brimos TO anon, authenticated, service_role;
GRANT ALL   ON ALL TABLES    IN SCHEMA brimos TO anon, authenticated, service_role;
GRANT ALL   ON ALL SEQUENCES IN SCHEMA brimos TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA brimos GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA brimos GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES (scoped to brimos schema)
-- ============================================================

CREATE TYPE brimos.user_role AS ENUM ('AO', 'DK', 'BOH', 'ADMIN');
CREATE TYPE brimos.dn_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'VERIFIED_DK',
  'VERIFIED_BOH',
  'COMPLETED',
  'ESCALATED',
  'REJECTED'
);
CREATE TYPE brimos.condition_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'WAIVED');
CREATE TYPE brimos.priority_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE brimos.notification_channel AS ENUM ('EMAIL', 'WHATSAPP', 'IN_APP');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE brimos.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  nip           TEXT UNIQUE,
  role          brimos.user_role NOT NULL DEFAULT 'AO',
  branch_code   TEXT,
  branch_name   TEXT,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DECISION NOTES (DN)
-- ============================================================

CREATE TABLE brimos.decision_notes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dn_number           TEXT UNIQUE NOT NULL,
  title               TEXT NOT NULL,
  debtor_name         TEXT NOT NULL,
  debtor_cif          TEXT NOT NULL,
  credit_amount       NUMERIC(20, 2) NOT NULL,
  credit_type         TEXT NOT NULL,
  approval_date       DATE NOT NULL,
  approval_number     TEXT,
  approver_id         UUID REFERENCES brimos.profiles(id),
  ao_id               UUID NOT NULL REFERENCES brimos.profiles(id),
  dk_id               UUID REFERENCES brimos.profiles(id),
  boh_id              UUID REFERENCES brimos.profiles(id),
  status              brimos.dn_status NOT NULL DEFAULT 'DRAFT',
  priority            brimos.priority_level NOT NULL DEFAULT 'MEDIUM',
  notes               TEXT,
  branch_code         TEXT NOT NULL,
  due_date            DATE,
  escalation_date     DATE,
  submitted_at        TIMESTAMPTZ,
  verified_dk_at      TIMESTAMPTZ,
  verified_boh_at     TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DN CONDITIONS (post-approval conditions/syarat)
-- ============================================================

CREATE TABLE brimos.dn_conditions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dn_id           UUID NOT NULL REFERENCES brimos.decision_notes(id) ON DELETE CASCADE,
  condition_text  TEXT NOT NULL,
  condition_type  TEXT NOT NULL DEFAULT 'STANDARD',
  due_date        DATE,
  status          brimos.condition_status NOT NULL DEFAULT 'PENDING',
  assigned_to     UUID REFERENCES brimos.profiles(id),
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EVIDENCE / DOCUMENTS
-- ============================================================

CREATE TABLE brimos.dn_evidences (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dn_id           UUID NOT NULL REFERENCES brimos.decision_notes(id) ON DELETE CASCADE,
  condition_id    UUID REFERENCES brimos.dn_conditions(id) ON DELETE SET NULL,
  file_name       TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  file_size       INT,
  mime_type       TEXT,
  uploaded_by     UUID NOT NULL REFERENCES brimos.profiles(id),
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FOLLOW-UP ACTIONS
-- ============================================================

CREATE TABLE brimos.followup_actions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dn_id           UUID NOT NULL REFERENCES brimos.decision_notes(id) ON DELETE CASCADE,
  condition_id    UUID REFERENCES brimos.dn_conditions(id) ON DELETE SET NULL,
  action_text     TEXT NOT NULL,
  due_date        DATE NOT NULL,
  status          brimos.condition_status NOT NULL DEFAULT 'PENDING',
  assigned_to     UUID NOT NULL REFERENCES brimos.profiles(id),
  created_by      UUID NOT NULL REFERENCES brimos.profiles(id),
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- KPI TARGETS
-- ============================================================

CREATE TABLE brimos.kpi_targets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_year     INT NOT NULL,
  period_month    INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  branch_code     TEXT NOT NULL,
  target_dn       INT NOT NULL DEFAULT 0,
  target_completed INT NOT NULL DEFAULT 0,
  target_overdue_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  created_by      UUID REFERENCES brimos.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period_year, period_month, branch_code)
);

-- ============================================================
-- KPI REALIZATIONS
-- ============================================================

CREATE TABLE brimos.kpi_realizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_id       UUID NOT NULL REFERENCES brimos.kpi_targets(id) ON DELETE CASCADE,
  total_dn        INT NOT NULL DEFAULT 0,
  completed_dn    INT NOT NULL DEFAULT 0,
  overdue_dn      INT NOT NULL DEFAULT 0,
  escalated_dn    INT NOT NULL DEFAULT 0,
  completion_rate NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_dn > 0 THEN (completed_dn::NUMERIC / total_dn * 100) ELSE 0 END
  ) STORED,
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT TRAIL
-- ============================================================

CREATE TABLE brimos.audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  action          TEXT NOT NULL,
  old_values      JSONB,
  new_values      JSONB,
  performed_by    UUID REFERENCES brimos.profiles(id),
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE brimos.notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id    UUID NOT NULL REFERENCES brimos.profiles(id) ON DELETE CASCADE,
  dn_id           UUID REFERENCES brimos.decision_notes(id) ON DELETE SET NULL,
  channel         brimos.notification_channel NOT NULL DEFAULT 'IN_APP',
  subject         TEXT NOT NULL,
  body            TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at         TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HOLIDAYS (for working day calculation)
-- ============================================================

CREATE TABLE brimos.holidays (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date        DATE UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  is_national BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_dn_ao ON brimos.decision_notes(ao_id);
CREATE INDEX idx_dn_dk ON brimos.decision_notes(dk_id);
CREATE INDEX idx_dn_status ON brimos.decision_notes(status);
CREATE INDEX idx_dn_branch ON brimos.decision_notes(branch_code);
CREATE INDEX idx_dn_due_date ON brimos.decision_notes(due_date);
CREATE INDEX idx_conditions_dn ON brimos.dn_conditions(dn_id);
CREATE INDEX idx_conditions_status ON brimos.dn_conditions(status);
CREATE INDEX idx_evidence_dn ON brimos.dn_evidences(dn_id);
CREATE INDEX idx_followup_dn ON brimos.followup_actions(dn_id);
CREATE INDEX idx_followup_assigned ON brimos.followup_actions(assigned_to);
CREATE INDEX idx_audit_entity ON brimos.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_performed ON brimos.audit_logs(performed_by);
CREATE INDEX idx_notifications_recipient ON brimos.notifications(recipient_id, is_read);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION brimos.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON brimos.profiles FOR EACH ROW EXECUTE FUNCTION brimos.update_updated_at();
CREATE TRIGGER trg_dn_updated BEFORE UPDATE ON brimos.decision_notes FOR EACH ROW EXECUTE FUNCTION brimos.update_updated_at();
CREATE TRIGGER trg_conditions_updated BEFORE UPDATE ON brimos.dn_conditions FOR EACH ROW EXECUTE FUNCTION brimos.update_updated_at();
CREATE TRIGGER trg_followup_updated BEFORE UPDATE ON brimos.followup_actions FOR EACH ROW EXECUTE FUNCTION brimos.update_updated_at();
CREATE TRIGGER trg_kpi_targets_updated BEFORE UPDATE ON brimos.kpi_targets FOR EACH ROW EXECUTE FUNCTION brimos.update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE brimos.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brimos.decision_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE brimos.dn_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brimos.dn_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE brimos.followup_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brimos.kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE brimos.kpi_realizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE brimos.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brimos.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE brimos.holidays ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "profiles_select" ON brimos.profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_update_own" ON brimos.profiles FOR UPDATE USING (auth.uid() = id);

-- Decision Notes: users see their branch or own
CREATE POLICY "dn_select" ON brimos.decision_notes FOR SELECT USING (
  ao_id = auth.uid() OR dk_id = auth.uid() OR boh_id = auth.uid()
  OR EXISTS (SELECT 1 FROM brimos.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH'))
);
CREATE POLICY "dn_insert" ON brimos.decision_notes FOR INSERT WITH CHECK (ao_id = auth.uid());
CREATE POLICY "dn_update" ON brimos.decision_notes FOR UPDATE USING (
  ao_id = auth.uid() OR dk_id = auth.uid() OR boh_id = auth.uid()
  OR EXISTS (SELECT 1 FROM brimos.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH'))
);

-- Conditions: same as DN
CREATE POLICY "conditions_select" ON brimos.dn_conditions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM brimos.decision_notes dn
    WHERE dn.id = dn_id AND (dn.ao_id = auth.uid() OR dn.dk_id = auth.uid() OR dn.boh_id = auth.uid()
      OR EXISTS (SELECT 1 FROM brimos.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH')))
  )
);
CREATE POLICY "conditions_modify" ON brimos.dn_conditions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM brimos.decision_notes dn
    WHERE dn.id = dn_id AND (dn.ao_id = auth.uid() OR dn.dk_id = auth.uid() OR dn.boh_id = auth.uid()
      OR EXISTS (SELECT 1 FROM brimos.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH')))
  )
);

-- Notifications: users see own
CREATE POLICY "notif_select" ON brimos.notifications FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "notif_update" ON brimos.notifications FOR UPDATE USING (recipient_id = auth.uid());

-- Holidays: read-only for all
CREATE POLICY "holidays_select" ON brimos.holidays FOR SELECT USING (TRUE);

-- Audit logs: ADMIN only
CREATE POLICY "audit_admin" ON brimos.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM brimos.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- KPI: all authenticated
CREATE POLICY "kpi_select" ON brimos.kpi_targets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "kpi_realizations_select" ON brimos.kpi_realizations FOR SELECT USING (auth.uid() IS NOT NULL);
