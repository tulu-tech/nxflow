-- Migration: allow multiple Gmail accounts per user
-- Run this in Supabase SQL Editor

-- Step 1: Remove single-account constraint
ALTER TABLE public.gmail_tokens
  DROP CONSTRAINT IF EXISTS gmail_tokens_user_id_key;

-- Step 2: Add per-account unique constraint (one row per Gmail address per user)
ALTER TABLE public.gmail_tokens
  ADD CONSTRAINT gmail_tokens_user_email_key UNIQUE (user_id, email);

-- Step 3: Add optional display label
ALTER TABLE public.gmail_tokens
  ADD COLUMN IF NOT EXISTS label text;
