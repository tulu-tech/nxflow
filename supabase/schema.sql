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
