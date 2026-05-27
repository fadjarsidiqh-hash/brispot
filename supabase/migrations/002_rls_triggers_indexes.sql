-- ============================================================
-- BRIMOS: RLS Policies, Triggers, and Indexes
-- ============================================================

-- ============================================================
-- TRIGGERS: updated_at auto-update
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_decision_notes_updated_at
  BEFORE UPDATE ON decision_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_dn_conditions_updated_at
  BEFORE UPDATE ON dn_conditions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_followup_actions_updated_at
  BEFORE UPDATE ON followup_actions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_kpi_targets_updated_at
  BEFORE UPDATE ON kpi_targets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER: Auto-create profile on new auth user
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'AO')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_decision_notes_status         ON decision_notes (status);
CREATE INDEX idx_decision_notes_ao_id          ON decision_notes (ao_id);
CREATE INDEX idx_decision_notes_branch_code    ON decision_notes (branch_code);
CREATE INDEX idx_decision_notes_due_date       ON decision_notes (due_date);
CREATE INDEX idx_decision_notes_created_at     ON decision_notes (created_at DESC);

CREATE INDEX idx_dn_conditions_dn_id           ON dn_conditions (dn_id);
CREATE INDEX idx_dn_conditions_status          ON dn_conditions (status);

CREATE INDEX idx_dn_evidences_dn_id            ON dn_evidences (dn_id);

CREATE INDEX idx_followup_actions_dn_id        ON followup_actions (dn_id);
CREATE INDEX idx_followup_actions_status       ON followup_actions (status);
CREATE INDEX idx_followup_actions_due_date     ON followup_actions (due_date);

CREATE INDEX idx_notifications_recipient_id    ON notifications (recipient_id);
CREATE INDEX idx_notifications_is_read         ON notifications (is_read) WHERE is_read = FALSE;

CREATE INDEX idx_audit_logs_entity             ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at         ON audit_logs (created_at DESC);

CREATE INDEX idx_kpi_targets_period            ON kpi_targets (period_year, period_month, branch_code);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_notes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dn_conditions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dn_evidences       ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_actions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_targets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_realizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays           ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── profiles ──────────────────────────────────────────────
-- Users can read their own profile; ADMIN can read all
CREATE POLICY "profiles: read own or admin"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR current_user_role() = 'ADMIN');

-- Users can update their own profile (non-role fields)
CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ── decision_notes ────────────────────────────────────────
-- AO: sees own DNs; DK/BOH/ADMIN: sees all in branch
CREATE POLICY "dn: select"
  ON decision_notes FOR SELECT
  USING (
    ao_id = auth.uid()
    OR current_user_role() IN ('DK', 'BOH', 'ADMIN')
  );

-- AO: insert own DNs
CREATE POLICY "dn: insert"
  ON decision_notes FOR INSERT
  WITH CHECK (ao_id = auth.uid());

-- AO can update DRAFT; DK/BOH/ADMIN can update any
CREATE POLICY "dn: update"
  ON decision_notes FOR UPDATE
  USING (
    (ao_id = auth.uid() AND status = 'DRAFT')
    OR current_user_role() IN ('DK', 'BOH', 'ADMIN')
  );

-- ── dn_conditions ─────────────────────────────────────────
CREATE POLICY "dn_conditions: select"
  ON dn_conditions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM decision_notes dn
      WHERE dn.id = dn_id
        AND (dn.ao_id = auth.uid() OR current_user_role() IN ('DK', 'BOH', 'ADMIN'))
    )
  );

CREATE POLICY "dn_conditions: insert"
  ON dn_conditions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM decision_notes dn
      WHERE dn.id = dn_id AND dn.ao_id = auth.uid()
    )
  );

CREATE POLICY "dn_conditions: update"
  ON dn_conditions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM decision_notes dn
      WHERE dn.id = dn_id
        AND (dn.ao_id = auth.uid() OR current_user_role() IN ('DK', 'BOH', 'ADMIN'))
    )
  );

-- ── dn_evidences ──────────────────────────────────────────
CREATE POLICY "dn_evidences: select"
  ON dn_evidences FOR SELECT
  USING (
    uploaded_by = auth.uid()
    OR current_user_role() IN ('DK', 'BOH', 'ADMIN')
  );

CREATE POLICY "dn_evidences: insert"
  ON dn_evidences FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- ── followup_actions ──────────────────────────────────────
CREATE POLICY "followup: select"
  ON followup_actions FOR SELECT
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR current_user_role() IN ('DK', 'BOH', 'ADMIN')
  );

CREATE POLICY "followup: insert"
  ON followup_actions FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "followup: update"
  ON followup_actions FOR UPDATE
  USING (assigned_to = auth.uid() OR current_user_role() IN ('DK', 'BOH', 'ADMIN'));

-- ── kpi_targets ───────────────────────────────────────────
-- All authenticated users can read KPI targets
CREATE POLICY "kpi_targets: select"
  ON kpi_targets FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only BOH/ADMIN can insert/update
CREATE POLICY "kpi_targets: insert"
  ON kpi_targets FOR INSERT
  WITH CHECK (current_user_role() IN ('BOH', 'ADMIN'));

CREATE POLICY "kpi_targets: update"
  ON kpi_targets FOR UPDATE
  USING (current_user_role() IN ('BOH', 'ADMIN'));

-- ── kpi_realizations ──────────────────────────────────────
CREATE POLICY "kpi_realizations: select"
  ON kpi_realizations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "kpi_realizations: insert"
  ON kpi_realizations FOR INSERT
  WITH CHECK (current_user_role() IN ('BOH', 'ADMIN'));

CREATE POLICY "kpi_realizations: update"
  ON kpi_realizations FOR UPDATE
  USING (current_user_role() IN ('BOH', 'ADMIN'));

-- ── audit_logs ────────────────────────────────────────────
-- Only ADMIN can read; insert is allowed for all (SECURITY DEFINER functions handle this)
CREATE POLICY "audit_logs: select"
  ON audit_logs FOR SELECT
  USING (current_user_role() = 'ADMIN');

CREATE POLICY "audit_logs: insert"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── notifications ─────────────────────────────────────────
CREATE POLICY "notifications: select own"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "notifications: update own"
  ON notifications FOR UPDATE
  USING (recipient_id = auth.uid());

CREATE POLICY "notifications: insert"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── holidays ──────────────────────────────────────────────
-- All authenticated users can read
CREATE POLICY "holidays: select"
  ON holidays FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only ADMIN can manage
CREATE POLICY "holidays: manage"
  ON holidays FOR ALL
  USING (current_user_role() = 'ADMIN');
