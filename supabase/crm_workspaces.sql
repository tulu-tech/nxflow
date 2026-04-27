-- ─── CRM Workspace Multi-Tenancy Migration ───────────────────────────────────
-- Run this in the Supabase SQL Editor.

-- 1. New workspaces table
CREATE TABLE IF NOT EXISTS public.crm_workspaces (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  name        text NOT NULL,
  icon        text DEFAULT '🏢',
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.crm_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own crm_workspaces"
  ON public.crm_workspaces
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. Insert a default workspace for the existing shared user
INSERT INTO public.crm_workspaces (id, user_id, name, icon)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  (SELECT id FROM auth.users WHERE email = 'berat@alba.com' LIMIT 1),
  'Default Workspace',
  '🏢'
) ON CONFLICT DO NOTHING;

-- 3. Add workspace_id to every CRM data table
ALTER TABLE public.leadboard            ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.prospects            ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.smart_segments       ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.lead_tags            ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.sequences            ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.email_campaigns      ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.lead_activities      ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.email_logs           ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.credit_usage         ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.response_rules       ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.saved_searches       ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.follow_up_reminders  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.scoring_rules        ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.gmail_tokens         ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.twilio_config        ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.news_sources         ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.news_keywords        ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE;

-- 4. Back-fill all existing rows to the default workspace
UPDATE public.leadboard           SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.prospects           SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.smart_segments      SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.lead_tags           SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.sequences           SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.email_campaigns     SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.lead_activities     SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.email_logs          SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.credit_usage        SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.response_rules      SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.saved_searches      SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.follow_up_reminders SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.scoring_rules       SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.gmail_tokens        SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.twilio_config       SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.news_sources        SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;
UPDATE public.news_keywords       SET workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE workspace_id IS NULL;

-- 5. Tighten twilio_config uniqueness to per-workspace
ALTER TABLE public.twilio_config DROP CONSTRAINT IF EXISTS twilio_config_user_id_key;
ALTER TABLE public.twilio_config ADD CONSTRAINT twilio_config_user_workspace_key UNIQUE (user_id, workspace_id);
