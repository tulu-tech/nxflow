-- ============================================================
-- NXFlow — Supabase Database Schema (v2)
-- PIN tabanlı kimlik doğrulama sistemi
-- ============================================================

-- 1. Users (PIN-based auth, no auth.users dependency)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#6366f1',
  email TEXT,
  pin TEXT NOT NULL DEFAULT lpad(floor(random() * 1000000)::text, 6, '0'),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL DEFAULT 'Alba',
  icon TEXT NOT NULL DEFAULT 'A',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Boards
CREATE TABLE IF NOT EXISTS public.boards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  columns JSONB NOT NULL DEFAULT '[]',
  group_order JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Groups
CREATE TABLE IF NOT EXISTS public.groups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  board_id TEXT REFERENCES public.boards(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  collapsed BOOLEAN NOT NULL DEFAULT false,
  task_order JSONB DEFAULT '[]',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id TEXT REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  board_id TEXT REFERENCES public.boards(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cells JSONB NOT NULL DEFAULT '{}',
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. Subtasks
CREATE TABLE IF NOT EXISTS public.subtasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id TEXT REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. Status Options
CREATE TABLE IF NOT EXISTS public.status_options (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  position INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- Row Level Security (Public access — PIN auth is client-side)
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_options ENABLE ROW LEVEL SECURITY;

-- Allow all operations via anon key (PIN auth handled client-side)
CREATE POLICY "users: public access" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "workspaces: public access" ON public.workspaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "boards: public access" ON public.boards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "groups: public access" ON public.groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "tasks: public access" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "subtasks: public access" ON public.subtasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "status_options: public access" ON public.status_options FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Auto-update updated_at on tasks
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================
-- Realtime: board, groups, tasks, subtasks değişikliklerini dinle
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.boards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subtasks;

-- ============================================================
-- ============================================================
-- CRM (alba-collective) — Supabase Auth tabanlı
-- Kaynak: alba-collective-crm-main/supabase/migrations/{001_init,002_features}.sql
-- Yukarıdaki PIN-tabanlı public.users'tan ayrı: bu bölüm auth.users kullanır.
-- ============================================================
-- ============================================================

-- ── Profiles (extends auth.users) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  theme text DEFAULT 'light',
  lusha_api_key text,
  mailchimp_api_key text,
  mailchimp_server_prefix text,
  updated_at timestamptz DEFAULT now()
);

-- ── Prospects (Lusha search results) ────────────────────────
CREATE TABLE IF NOT EXISTS public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  lusha_id text,
  full_name text NOT NULL,
  company text,
  position text,
  industry text,
  location text,
  linkedin_url text,
  email text,
  email_fetched_at timestamptz,
  credits_used int DEFAULT 0,
  added_to_leadboard boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ── Leadboard ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leadboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  company text,
  position text,
  email text NOT NULL,
  relevance_score int DEFAULT 0,
  scoring_reason text,
  status text DEFAULT 'new',
  notes text,
  last_contacted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ── Scoring Rules (AI directive) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  directive text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── Credit Usage Tracking ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  type text NOT NULL,
  amount int DEFAULT 1,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ── Email Campaigns (Mailchimp) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  subject text,
  body text,
  mailchimp_campaign_id text,
  status text DEFAULT 'draft',
  recipient_count int DEFAULT 0,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ── Response Rules (Gmail keyword → Claude) ──────────────────
CREATE TABLE IF NOT EXISTS public.response_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  rule_name text NOT NULL,
  keywords text[] NOT NULL,
  claude_prompt text NOT NULL,
  auto_send boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── Gmail OAuth Tokens ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gmail_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  email text,
  updated_at timestamptz DEFAULT now()
);

-- ── Lead Tags ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS public.lead_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leadboard(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES public.lead_tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, tag_id)
);

-- ── Activity Timeline ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  lead_id uuid REFERENCES public.leadboard(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  -- 'status_change' | 'email_sent' | 'email_received' | 'note_added'
  -- 'tag_added' | 'tag_removed' | 'score_updated' | 'manual' | 'added'
  description text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ── Smart Segments (saved filter presets) ────────────────────
CREATE TABLE IF NOT EXISTS public.smart_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}',
  -- { status, minScore, maxScore, tagIds, search, sortBy }
  color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

-- ── Follow-up Reminders ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.follow_up_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  lead_id uuid REFERENCES public.leadboard(id) ON DELETE CASCADE NOT NULL,
  remind_at timestamptz NOT NULL,
  note text,
  is_done boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ── Outreach Sequences ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid REFERENCES public.sequences(id) ON DELETE CASCADE NOT NULL,
  step_number int NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  delay_days int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sequence_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  lead_id uuid REFERENCES public.leadboard(id) ON DELETE CASCADE NOT NULL,
  sequence_id uuid REFERENCES public.sequences(id) ON DELETE CASCADE NOT NULL,
  current_step int DEFAULT 0,
  status text DEFAULT 'active', -- 'active' | 'paused' | 'completed' | 'replied'
  next_send_at timestamptz,
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, sequence_id)
);

-- ── Auto-create profile on signup ────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── Row Level Security (auth.uid() bazlı) ────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own prospects" ON public.prospects;
CREATE POLICY "Users manage own prospects" ON public.prospects FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.leadboard ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own leadboard" ON public.leadboard;
CREATE POLICY "Users manage own leadboard" ON public.leadboard FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own scoring_rules" ON public.scoring_rules;
CREATE POLICY "Users manage own scoring_rules" ON public.scoring_rules FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own credit_usage" ON public.credit_usage;
CREATE POLICY "Users manage own credit_usage" ON public.credit_usage FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own email_campaigns" ON public.email_campaigns;
CREATE POLICY "Users manage own email_campaigns" ON public.email_campaigns FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.response_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own response_rules" ON public.response_rules;
CREATE POLICY "Users manage own response_rules" ON public.response_rules FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.gmail_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own gmail_tokens" ON public.gmail_tokens;
CREATE POLICY "Users manage own gmail_tokens" ON public.gmail_tokens FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own lead_tags" ON public.lead_tags;
CREATE POLICY "Users manage own lead_tags" ON public.lead_tags FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.lead_tag_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own tag assignments" ON public.lead_tag_assignments;
CREATE POLICY "Users manage own tag assignments" ON public.lead_tag_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.leadboard l WHERE l.id = lead_id AND l.user_id = auth.uid())
  );

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own lead_activities" ON public.lead_activities;
CREATE POLICY "Users manage own lead_activities" ON public.lead_activities FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.smart_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own smart_segments" ON public.smart_segments;
CREATE POLICY "Users manage own smart_segments" ON public.smart_segments FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own reminders" ON public.follow_up_reminders;
CREATE POLICY "Users manage own reminders" ON public.follow_up_reminders FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own sequences" ON public.sequences;
CREATE POLICY "Users manage own sequences" ON public.sequences FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own sequence_steps" ON public.sequence_steps;
CREATE POLICY "Users manage own sequence_steps" ON public.sequence_steps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sequences s WHERE s.id = sequence_id AND s.user_id = auth.uid())
  );

ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own sequence_enrollments" ON public.sequence_enrollments;
CREATE POLICY "Users manage own sequence_enrollments" ON public.sequence_enrollments FOR ALL USING (auth.uid() = user_id);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_prospects_user_created     ON public.prospects(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leadboard_user_score       ON public.leadboard(user_id, relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_leadboard_prospect         ON public.leadboard(prospect_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_user_type     ON public.credit_usage(user_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_response_rules_user_active ON public.response_rules(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_lead_tag_assignments_lead  ON public.lead_tag_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tag_assignments_tag   ON public.lead_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead       ON public.lead_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_user_date        ON public.follow_up_reminders(user_id, remind_at) WHERE is_done = false;
CREATE INDEX IF NOT EXISTS idx_enrollments_lead           ON public.sequence_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_next_send      ON public.sequence_enrollments(next_send_at) WHERE status = 'active';
