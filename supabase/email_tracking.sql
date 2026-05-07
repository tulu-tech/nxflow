-- Email open & click tracking columns
-- Run in Supabase SQL Editor

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS opened_at         timestamptz,
  ADD COLUMN IF NOT EXISTS open_count        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_clicked_at  timestamptz,
  ADD COLUMN IF NOT EXISTS click_count       integer NOT NULL DEFAULT 0;

-- Atomic increment functions (SECURITY DEFINER so service-role calls work without RLS issues)
CREATE OR REPLACE FUNCTION public.increment_email_open(log_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.email_logs
  SET open_count = open_count + 1,
      opened_at  = COALESCE(opened_at, now())
  WHERE id = log_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_email_click(log_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.email_logs
  SET click_count       = click_count + 1,
      first_clicked_at  = COALESCE(first_clicked_at, now())
  WHERE id = log_id;
$$;
