-- ─── SMS Logs (Delivery Receipts + Inbound SMS) ──────────────────────────────
-- Run AFTER crm_workspaces.sql

CREATE TABLE IF NOT EXISTS public.sms_logs (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid REFERENCES auth.users NOT NULL,
  workspace_id        uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  lead_id             uuid REFERENCES public.leadboard(id) ON DELETE SET NULL,
  twilio_message_sid  text UNIQUE,
  direction           text NOT NULL DEFAULT 'outbound',  -- 'outbound' | 'inbound'
  to_number           text NOT NULL,
  from_number         text NOT NULL,
  body                text,
  status              text DEFAULT 'sent',   -- sent | delivered | failed | undelivered | received
  error_code          text,
  campaign_name       text,
  sent_at             timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sms_logs"
  ON public.sms_logs
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS sms_logs_workspace_sent
  ON public.sms_logs (workspace_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS sms_logs_message_sid
  ON public.sms_logs (twilio_message_sid);
