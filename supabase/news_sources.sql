-- News RSS Sources table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.news_sources (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  url        text UNIQUE NOT NULL,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS news_sources_is_active_idx ON public.news_sources (is_active);

ALTER TABLE public.news_sources ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read and manage sources
CREATE POLICY "Authenticated users can read news sources"
  ON public.news_sources FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert news sources"
  ON public.news_sources FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update news sources"
  ON public.news_sources FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete news sources"
  ON public.news_sources FOR DELETE
  USING (auth.role() = 'authenticated');
