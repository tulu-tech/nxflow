-- ─── Lead Groups Migration ────────────────────────────────────────────────────
-- Run AFTER crm_workspaces.sql

CREATE TABLE IF NOT EXISTS public.lead_groups (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users NOT NULL,
  workspace_id uuid REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  name         text NOT NULL,
  color        text DEFAULT '#6366f1',
  position     integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.lead_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own lead_groups"
  ON public.lead_groups
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Add group_id column to leads
ALTER TABLE public.leadboard
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.lead_groups(id) ON DELETE SET NULL;

-- Default group for the existing workspace
INSERT INTO public.lead_groups (id, user_id, workspace_id, name, color, position)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  (SELECT id FROM auth.users WHERE email = 'berat@alba.com' LIMIT 1),
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Default',
  '#6366f1',
  0
) ON CONFLICT DO NOTHING;

-- Backfill existing leads into the default group
UPDATE public.leadboard
  SET group_id = 'bbbbbbbb-0000-0000-0000-000000000001'
  WHERE group_id IS NULL
    AND workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001';
