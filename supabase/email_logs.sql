-- Email send history per lead
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.email_logs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  lead_id     uuid REFERENCES public.leadboard(id) ON DELETE CASCADE,
  from_email  text NOT NULL,
  to_email    text NOT NULL,
  subject     text,
  body        text,
  is_html     boolean DEFAULT false,
  sent_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_logs_lead_id_idx ON public.email_logs (lead_id);
CREATE INDEX IF NOT EXISTS email_logs_user_id_idx ON public.email_logs (user_id);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own email_logs"
  ON public.email_logs
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
