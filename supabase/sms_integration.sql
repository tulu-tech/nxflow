-- ─── SMS Integration Migration ──────────────────────────────────────────────
-- Run this in the Supabase SQL Editor.

-- 1. Add phone number to leads
ALTER TABLE public.leadboard
  ADD COLUMN IF NOT EXISTS phone text;

-- 2. Add API Key SID support to Twilio config
--    (Allows API Key auth: SK... SID + API Key Secret in auth_token)
ALTER TABLE public.twilio_config
  ADD COLUMN IF NOT EXISTS api_key_sid text;
