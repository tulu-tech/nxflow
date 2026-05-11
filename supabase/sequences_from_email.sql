-- Sequences: add from_email column
-- Run in Supabase SQL Editor

ALTER TABLE public.sequences
  ADD COLUMN IF NOT EXISTS from_email text;
