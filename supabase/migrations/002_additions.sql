-- ============================================================
-- BRIMOS Additions Migration
-- Auto-create profile, missing RLS, Realtime, audit insert
-- All tables use the 'brimos' schema
-- ============================================================

-- ============================================================
-- 1. AUTO-CREATE PROFILE ON NEW USER SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION brimos.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO brimos.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::brimos.user_role, 'AO')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION brimos.handle_new_user();

-- ============================================================
-- 2. MISSING RLS: dn_evidences
-- ============================================================

CREATE POLICY "evidences_select" ON brimos.dn_evidences FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM brimos.decision_notes dn
    WHERE dn.id = dn_id AND (
      dn.ao_id = auth.uid() OR dn.dk_id = auth.uid() OR dn.boh_id = auth.uid()
      OR EXISTS (SELECT 1 FROM brimos.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH'))
    )
  )
);

CREATE POLICY "evidences_insert" ON brimos.dn_evidences FOR INSERT WITH CHECK (
  uploaded_by = auth.uid()
);

CREATE POLICY "evidences_delete" ON brimos.dn_evidences FOR DELETE USING (
  uploaded_by = auth.uid()
  OR EXISTS (SELECT 1 FROM brimos.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- ============================================================
-- 3. MISSING RLS: followup_actions
-- ============================================================

CREATE POLICY "followup_select" ON brimos.followup_actions FOR SELECT USING (
  assigned_to = auth.uid() OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM brimos.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH', 'DK'))
);

CREATE POLICY "followup_insert" ON brimos.followup_actions FOR INSERT WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "followup_update" ON brimos.followup_actions FOR UPDATE USING (
  assigned_to = auth.uid() OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM brimos.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH'))
);

-- ============================================================
-- 4. KPI: allow ADMIN/BOH to insert and update targets
-- ============================================================

CREATE POLICY "kpi_insert" ON brimos.kpi_targets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM brimos.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH'))
);

CREATE POLICY "kpi_update" ON brimos.kpi_targets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM brimos.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH'))
);

-- ============================================================
-- 5. AUDIT LOGS: allow authenticated users to write their own trail
-- ============================================================

CREATE POLICY "audit_insert" ON brimos.audit_logs FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- ============================================================
-- 6. NOTIFICATIONS: allow authenticated users to insert
-- ============================================================

CREATE POLICY "notif_insert" ON brimos.notifications FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- ============================================================
-- 7. ENABLE SUPABASE REALTIME on brimos tables
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE brimos.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE brimos.decision_notes;

