-- ============================================================
-- BRIMOS Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('AO', 'DK', 'BOH', 'ADMIN');
CREATE TYPE dn_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'VERIFIED_DK',
  'VERIFIED_BOH',
  'COMPLETED',
  'ESCALATED',
  'REJECTED'
);
CREATE TYPE condition_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'WAIVED');
CREATE TYPE priority_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE notification_channel AS ENUM ('EMAIL', 'WHATSAPP', 'IN_APP');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  nip           TEXT UNIQUE,
  role          user_role NOT NULL DEFAULT 'AO',
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

CREATE TABLE decision_notes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dn_number           TEXT UNIQUE NOT NULL,
  title               TEXT NOT NULL,
  debtor_name         TEXT NOT NULL,
  debtor_cif          TEXT NOT NULL,
  credit_amount       NUMERIC(20, 2) NOT NULL,
  credit_type         TEXT NOT NULL,
  approval_date       DATE NOT NULL,
  approval_number     TEXT,
  approver_id         UUID REFERENCES profiles(id),
  ao_id               UUID NOT NULL REFERENCES profiles(id),
  dk_id               UUID REFERENCES profiles(id),
  boh_id              UUID REFERENCES profiles(id),
  status              dn_status NOT NULL DEFAULT 'DRAFT',
  priority            priority_level NOT NULL DEFAULT 'MEDIUM',
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

CREATE TABLE dn_conditions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dn_id           UUID NOT NULL REFERENCES decision_notes(id) ON DELETE CASCADE,
  condition_text  TEXT NOT NULL,
  condition_type  TEXT NOT NULL DEFAULT 'STANDARD',
  due_date        DATE,
  status          condition_status NOT NULL DEFAULT 'PENDING',
  assigned_to     UUID REFERENCES profiles(id),
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EVIDENCE / DOCUMENTS
-- ============================================================

CREATE TABLE dn_evidences (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dn_id           UUID NOT NULL REFERENCES decision_notes(id) ON DELETE CASCADE,
  condition_id    UUID REFERENCES dn_conditions(id) ON DELETE SET NULL,
  file_name       TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  file_size       INT,
  mime_type       TEXT,
  uploaded_by     UUID NOT NULL REFERENCES profiles(id),
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FOLLOW-UP ACTIONS
-- ============================================================

CREATE TABLE followup_actions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dn_id           UUID NOT NULL REFERENCES decision_notes(id) ON DELETE CASCADE,
  condition_id    UUID REFERENCES dn_conditions(id) ON DELETE SET NULL,
  action_text     TEXT NOT NULL,
  due_date        DATE NOT NULL,
  status          condition_status NOT NULL DEFAULT 'PENDING',
  assigned_to     UUID NOT NULL REFERENCES profiles(id),
  created_by      UUID NOT NULL REFERENCES profiles(id),
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- KPI TARGETS
-- ============================================================

CREATE TABLE kpi_targets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_year     INT NOT NULL,
  period_month    INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  branch_code     TEXT NOT NULL,
  target_dn       INT NOT NULL DEFAULT 0,
  target_completed INT NOT NULL DEFAULT 0,
  target_overdue_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period_year, period_month, branch_code)
);

-- ============================================================
-- KPI REALIZATIONS
-- ============================================================

CREATE TABLE kpi_realizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_id       UUID NOT NULL REFERENCES kpi_targets(id) ON DELETE CASCADE,
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

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  action          TEXT NOT NULL,
  old_values      JSONB,
  new_values      JSONB,
  performed_by    UUID REFERENCES profiles(id),
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dn_id           UUID REFERENCES decision_notes(id) ON DELETE SET NULL,
  channel         notification_channel NOT NULL DEFAULT 'IN_APP',
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

CREATE TABLE holidays (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date        DATE UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  is_national BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_dn_ao ON decision_notes(ao_id);
CREATE INDEX idx_dn_dk ON decision_notes(dk_id);
CREATE INDEX idx_dn_status ON decision_notes(status);
CREATE INDEX idx_dn_branch ON decision_notes(branch_code);
CREATE INDEX idx_dn_due_date ON decision_notes(due_date);
CREATE INDEX idx_conditions_dn ON dn_conditions(dn_id);
CREATE INDEX idx_conditions_status ON dn_conditions(status);
CREATE INDEX idx_evidence_dn ON dn_evidences(dn_id);
CREATE INDEX idx_followup_dn ON followup_actions(dn_id);
CREATE INDEX idx_followup_assigned ON followup_actions(assigned_to);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_performed ON audit_logs(performed_by);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_dn_updated BEFORE UPDATE ON decision_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_conditions_updated BEFORE UPDATE ON dn_conditions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_followup_updated BEFORE UPDATE ON followup_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_kpi_targets_updated BEFORE UPDATE ON kpi_targets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dn_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dn_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_realizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Decision Notes: users see their branch or own
CREATE POLICY "dn_select" ON decision_notes FOR SELECT USING (
  ao_id = auth.uid() OR dk_id = auth.uid() OR boh_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH'))
);
CREATE POLICY "dn_insert" ON decision_notes FOR INSERT WITH CHECK (ao_id = auth.uid());
CREATE POLICY "dn_update" ON decision_notes FOR UPDATE USING (
  ao_id = auth.uid() OR dk_id = auth.uid() OR boh_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH'))
);

-- Conditions: same as DN
CREATE POLICY "conditions_select" ON dn_conditions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM decision_notes dn
    WHERE dn.id = dn_id AND (dn.ao_id = auth.uid() OR dn.dk_id = auth.uid() OR dn.boh_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH')))
  )
);
CREATE POLICY "conditions_modify" ON dn_conditions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM decision_notes dn
    WHERE dn.id = dn_id AND (dn.ao_id = auth.uid() OR dn.dk_id = auth.uid() OR dn.boh_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH')))
  )
);

-- Notifications: users see own
CREATE POLICY "notif_select" ON notifications FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (recipient_id = auth.uid());

-- Holidays: read-only for all
CREATE POLICY "holidays_select" ON holidays FOR SELECT USING (TRUE);

-- Audit logs: ADMIN only
CREATE POLICY "audit_admin" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- KPI: all authenticated
CREATE POLICY "kpi_select" ON kpi_targets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "kpi_realizations_select" ON kpi_realizations FOR SELECT USING (auth.uid() IS NOT NULL);
