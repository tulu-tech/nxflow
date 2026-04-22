-- News Intelligence — news_articles table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.news_articles (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title            text        NOT NULL,
  description      text,
  url              text        UNIQUE NOT NULL,
  source_name      text        NOT NULL,
  published_at     timestamptz,
  fetched_at       timestamptz DEFAULT now(),
  keywords_matched text[]      DEFAULT '{}',
  is_archived      boolean     DEFAULT false,
  image_url        text,
  ai_summary       text,
  relevance_score  integer,
  created_at       timestamptz DEFAULT now()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS news_articles_published_at_idx ON public.news_articles (published_at DESC);
CREATE INDEX IF NOT EXISTS news_articles_is_archived_idx  ON public.news_articles (is_archived);

-- RLS
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all articles
CREATE POLICY "Authenticated users can read news"
  ON public.news_articles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service role can insert/update (cron job uses service role key)
CREATE POLICY "Service role can insert news"
  ON public.news_articles FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update news"
  ON public.news_articles FOR UPDATE
  USING (auth.role() = 'service_role');

-- Allow authenticated users to archive articles
CREATE POLICY "Authenticated users can archive news"
  ON public.news_articles FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Migration: add AI columns if table was created without them
ALTER TABLE public.news_articles
  ADD COLUMN IF NOT EXISTS ai_summary      text,
  ADD COLUMN IF NOT EXISTS relevance_score integer;
