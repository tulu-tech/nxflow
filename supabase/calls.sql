-- ─── Click-to-Call Migration ─────────────────────────────────────────────────
-- Run this in the Supabase SQL Editor AFTER crm_workspaces.sql

-- 1. Add "my phone" (user's personal number) to Twilio config
ALTER TABLE public.twilio_config
  ADD COLUMN IF NOT EXISTS my_number text;

-- 2. Call log table
CREATE TABLE IF NOT EXISTS public.call_logs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users NOT NULL,
  workspace_id  uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  lead_id       uuid REFERENCES public.leadboard(id) ON DELETE SET NULL,
  twilio_call_sid text,
  to_number     text NOT NULL,   -- lead's phone number
  from_number   text,            -- Twilio sender number (for callerId)
  my_number     text,            -- user's personal number (first leg)
  twiml_fetched boolean DEFAULT false,
  status        text DEFAULT 'initiated',
  duration      integer,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own call_logs"
  ON public.call_logs
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
