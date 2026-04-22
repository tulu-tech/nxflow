-- Twilio configuration per user
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.twilio_config (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users NOT NULL UNIQUE,
  account_sid  text,
  auth_token   text,
  phone_number text,
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.twilio_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own twilio config"
  ON public.twilio_config
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
