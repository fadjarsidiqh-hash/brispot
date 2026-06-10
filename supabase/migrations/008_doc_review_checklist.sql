-- Migration 008: Document Review Checklist for ADK
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS brimos.doc_review_checklist (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dn_id      UUID NOT NULL,
  adk_id     UUID,
  items      JSONB NOT NULL DEFAULT '{}',
  opini      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dn_id)
);

ALTER TABLE brimos.doc_review_checklist ENABLE ROW LEVEL SECURITY;

-- ADK can manage their own checklists; BOH and ADMIN can read all
CREATE POLICY "checklist_rls" ON brimos.doc_review_checklist
  FOR ALL USING (
    auth.uid() = adk_id
    OR EXISTS (
      SELECT 1 FROM brimos.profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'BOH')
    )
  );

-- Allow ADK to insert new checklists
CREATE POLICY "checklist_insert" ON brimos.doc_review_checklist
  FOR INSERT WITH CHECK (auth.uid() = adk_id);
