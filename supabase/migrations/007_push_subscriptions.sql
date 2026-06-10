-- Migration: push_subscriptions table
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS brimos.push_subscriptions (
  id         UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID         REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT         NOT NULL,
  subscription JSONB      NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE brimos.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own subscriptions
CREATE POLICY "own_push_subs" ON brimos.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);
