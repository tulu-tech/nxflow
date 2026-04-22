-- News match keywords table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.news_keywords (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword    text UNIQUE NOT NULL,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS news_keywords_is_active_idx ON public.news_keywords (is_active);

ALTER TABLE public.news_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read news keywords"
  ON public.news_keywords FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert news keywords"
  ON public.news_keywords FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update news keywords"
  ON public.news_keywords FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete news keywords"
  ON public.news_keywords FOR DELETE
  USING (auth.role() = 'authenticated');
