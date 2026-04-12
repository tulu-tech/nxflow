-- ============================================================
-- NXFlow — Supabase Database Schema
-- Supabase SQL Editor'e yapıştır ve çalıştır
-- ============================================================

-- 1. Profiles (auth.users'ı extend eder)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  initials text not null,
  avatar_color text not null default '#6366f1',
  email text unique not null,
  created_at timestamptz default now() not null
);

-- 2. Workspaces
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Alba',
  icon text not null default 'A',
  created_at timestamptz default now() not null
);

-- Alba workspace'i oluştur
insert into public.workspaces (name, icon) values ('Alba', 'A')
on conflict do nothing;

-- 3. Workspace Members
create table if not exists public.workspace_members (
  workspace_id uuid references public.workspaces on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  role text not null default 'member', -- 'admin' | 'member'
  joined_at timestamptz default now() not null,
  primary key (workspace_id, user_id)
);

-- 4. Boards
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces on delete cascade not null,
  name text not null,
  description text,
  columns jsonb not null default '[]',
  created_at timestamptz default now() not null
);

-- 5. Groups
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references public.boards on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  collapsed boolean not null default false,
  "order" integer not null default 0,
  created_at timestamptz default now() not null
);

-- 6. Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups on delete cascade not null,
  board_id uuid references public.boards on delete cascade not null,
  name text not null,
  cells jsonb not null default '{}',
  "order" integer not null default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.boards enable row level security;
alter table public.groups enable row level security;
alter table public.tasks enable row level security;

-- Profiles: herkes kendi profilini okuyabilir/güncelleyebilir
create policy "profiles: own read" on public.profiles for select using (true);
create policy "profiles: own update" on public.profiles for update using (auth.uid() = id);
create policy "profiles: own insert" on public.profiles for insert with check (auth.uid() = id);

-- Workspace members helper
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

-- Workspaces
create policy "workspaces: member read" on public.workspaces
  for select using (is_workspace_member(id));

-- Workspace members
create policy "workspace_members: member read" on public.workspace_members
  for select using (is_workspace_member(workspace_id));
create policy "workspace_members: self insert" on public.workspace_members
  for insert with check (user_id = auth.uid());

-- Boards
create policy "boards: member read" on public.boards
  for select using (is_workspace_member(workspace_id));
create policy "boards: member insert" on public.boards
  for insert with check (is_workspace_member(workspace_id));
create policy "boards: member update" on public.boards
  for update using (is_workspace_member(workspace_id));
create policy "boards: member delete" on public.boards
  for delete using (is_workspace_member(workspace_id));

-- Groups
create policy "groups: member read" on public.groups
  for select using (
    exists (select 1 from public.boards b where b.id = board_id and is_workspace_member(b.workspace_id))
  );
create policy "groups: member write" on public.groups
  for all using (
    exists (select 1 from public.boards b where b.id = board_id and is_workspace_member(b.workspace_id))
  );

-- Tasks
create policy "tasks: member read" on public.tasks
  for select using (
    exists (select 1 from public.boards b where b.id = board_id and is_workspace_member(b.workspace_id))
  );
create policy "tasks: member write" on public.tasks
  for all using (
    exists (select 1 from public.boards b where b.id = board_id and is_workspace_member(b.workspace_id))
  );

-- ============================================================
-- Auto-update updated_at on tasks
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ws_id uuid;
begin
  insert into public.profiles (id, name, initials, avatar_color, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'initials', upper(left(split_part(new.email, '@', 1), 2))),
    coalesce(new.raw_user_meta_data->>'avatar_color', '#6366f1'),
    new.email
  )
  on conflict (id) do nothing;

  -- Alba workspace'e ekle
  select id into ws_id from public.workspaces where name = 'Alba' limit 1;
  if ws_id is not null then
    insert into public.workspace_members (workspace_id, user_id)
    values (ws_id, new.id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Realtime: board, groups, tasks değişikliklerini dinle
-- ============================================================
alter publication supabase_realtime add table public.boards;
alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.tasks;
