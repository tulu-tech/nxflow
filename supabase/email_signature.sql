-- Email signature per workspace
-- Run in Supabase SQL Editor

ALTER TABLE public.crm_workspaces
  ADD COLUMN IF NOT EXISTS email_signature text;
