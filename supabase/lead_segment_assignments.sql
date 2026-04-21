-- Segment → Lead junction table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.lead_segment_assignments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id    text REFERENCES public.leadboard(id) ON DELETE CASCADE,
  segment_id uuid REFERENCES public.smart_segments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (lead_id, segment_id)
);

CREATE INDEX IF NOT EXISTS lead_seg_assignments_lead_idx    ON public.lead_segment_assignments (lead_id);
CREATE INDEX IF NOT EXISTS lead_seg_assignments_segment_idx ON public.lead_segment_assignments (segment_id);

ALTER TABLE public.lead_segment_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own segment assignments"
  ON public.lead_segment_assignments
  USING (
    segment_id IN (
      SELECT id FROM public.smart_segments WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    segment_id IN (
      SELECT id FROM public.smart_segments WHERE user_id = auth.uid()
    )
  );
