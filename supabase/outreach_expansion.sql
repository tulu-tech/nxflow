-- Outreach Expansion Migration
-- Run in Supabase SQL Editor

-- 1. email_logs: link to campaign + A/B variant tracking
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS campaign_id      uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subject_variant  char(1);
CREATE INDEX IF NOT EXISTS email_logs_campaign_id_idx ON public.email_logs (campaign_id);

-- 2. email_campaigns: scheduled send + A/B subject + stored recipients + sender + format
ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS scheduled_for   timestamptz,
  ADD COLUMN IF NOT EXISTS subject_b       text,
  ADD COLUMN IF NOT EXISTS from_email      text,
  ADD COLUMN IF NOT EXISTS recipient_ids   uuid[],
  ADD COLUMN IF NOT EXISTS is_html         boolean DEFAULT false;

-- 3. sequence_enrollments: store last sent Gmail message ID for reply threading
ALTER TABLE public.sequence_enrollments
  ADD COLUMN IF NOT EXISTS last_gmail_message_id text;

-- 4. Email templates library
CREATE TABLE IF NOT EXISTS public.email_templates (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users NOT NULL,
  workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  name         text NOT NULL,
  subject      text NOT NULL DEFAULT '',
  body         text NOT NULL DEFAULT '',
  is_html      boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own email_templates"
  ON public.email_templates USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. Unsubscribe blocklist
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id    uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  email           text NOT NULL,
  unsubscribed_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, email)
);
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own unsubscribes"
  ON public.email_unsubscribes FOR SELECT USING (
    workspace_id IN (SELECT id FROM public.crm_workspaces WHERE user_id = auth.uid())
  );

-- 6. Update engagement scoring functions (extend existing SECURITY DEFINER functions)
CREATE OR REPLACE FUNCTION public.increment_email_open(log_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.email_logs
    SET open_count = open_count + 1, opened_at = COALESCE(opened_at, now())
    WHERE id = log_id;
  UPDATE public.leadboard SET relevance_score = LEAST(relevance_score + 2, 100)
    WHERE id IN (SELECT lead_id FROM public.email_logs WHERE id = log_id AND lead_id IS NOT NULL);
$$;

CREATE OR REPLACE FUNCTION public.increment_email_click(log_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.email_logs
    SET click_count = click_count + 1, first_clicked_at = COALESCE(first_clicked_at, now())
    WHERE id = log_id;
  UPDATE public.leadboard SET relevance_score = LEAST(relevance_score + 5, 100)
    WHERE id IN (SELECT lead_id FROM public.email_logs WHERE id = log_id AND lead_id IS NOT NULL);
$$;
