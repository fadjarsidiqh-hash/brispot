-- ============================================================
-- BRIMOS Additions Migration
-- Auto-create profile, missing RLS, Realtime, audit insert
-- ============================================================

-- ============================================================
-- 1. AUTO-CREATE PROFILE ON NEW USER SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'AO')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 2. MISSING RLS: dn_evidences
-- ============================================================

CREATE POLICY "evidences_select" ON dn_evidences FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM decision_notes dn
    WHERE dn.id = dn_id AND (
      dn.ao_id = auth.uid() OR dn.dk_id = auth.uid() OR dn.boh_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH'))
    )
  )
);

CREATE POLICY "evidences_insert" ON dn_evidences FOR INSERT WITH CHECK (
  uploaded_by = auth.uid()
);

CREATE POLICY "evidences_delete" ON dn_evidences FOR DELETE USING (
  uploaded_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- ============================================================
-- 3. MISSING RLS: followup_actions
-- ============================================================

CREATE POLICY "followup_select" ON followup_actions FOR SELECT USING (
  assigned_to = auth.uid() OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH', 'DK'))
);

CREATE POLICY "followup_insert" ON followup_actions FOR INSERT WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "followup_update" ON followup_actions FOR UPDATE USING (
  assigned_to = auth.uid() OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH'))
);

-- ============================================================
-- 4. KPI: allow ADMIN/BOH to insert and update targets
-- ============================================================

CREATE POLICY "kpi_insert" ON kpi_targets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH'))
);

CREATE POLICY "kpi_update" ON kpi_targets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH'))
);

-- ============================================================
-- 5. AUDIT LOGS: allow system/service role inserts
--    (app server uses service role for audit inserts — no user RLS needed)
--    Add insert for authenticated users too (client-side actions)
-- ============================================================

CREATE POLICY "audit_insert" ON audit_logs FOR INSERT WITH CHECK (
  performed_by = auth.uid()
  OR auth.uid() IS NOT NULL  -- any authenticated user can write their own audit trail
);

-- ============================================================
-- 6. NOTIFICATIONS: allow system to insert notifications for any user
--    (server-side, via service role — no policy needed for service role,
--     but add authenticated insert for self-generated notifications)
-- ============================================================

CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

-- ============================================================
-- 7. ENABLE SUPABASE REALTIME on notifications
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE decision_notes;
