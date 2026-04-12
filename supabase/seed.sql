-- ============================================================
-- NXFlow — Seed Data (v2)
-- Tüm verileri temizle ve kullanıcıları oluştur
-- ============================================================

-- 1. Önce tüm verileri temizle (sıralı silme — FK bağımlılıkları)
DELETE FROM public.subtasks;
DELETE FROM public.tasks;
DELETE FROM public.groups;
DELETE FROM public.boards;

-- 2. Status Options (yoksa ekle)
INSERT INTO public.status_options (id, label, color, text_color, position) VALUES
  ('not-started', 'Not Started', '#c4c4c4', '#323338', 0),
  ('working', 'Working on it', '#fdab3d', '#323338', 1),
  ('stuck', 'Stuck', '#e2445c', '#ffffff', 2),
  ('done', 'Done', '#00c875', '#ffffff', 3),
  ('in-review', 'In Review', '#a358df', '#ffffff', 4)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  color = EXCLUDED.color,
  text_color = EXCLUDED.text_color,
  position = EXCLUDED.position;

-- 3. Workspace (yoksa oluştur)
INSERT INTO public.workspaces (id, name, icon) VALUES
  ('ws1', 'Alba', 'A')
ON CONFLICT (id) DO NOTHING;

-- 4. Users — 6 haneli PIN ile
-- Her kullanıcıya sabit PIN atanıyor, gerekirse değiştirilebilir
INSERT INTO public.users (id, name, initials, avatar_color, email, pin) VALUES
  ('u1', 'Hazel',   'HZ', '#7c3aed', 'hazel@alba.com',   '100001'),
  ('u2', 'Batuhan', 'BT', '#0891b2', 'batuhan@alba.com', '100002'),
  ('u3', 'Omer',    'OM', '#059669', 'omer@alba.com',     '100003'),
  ('u4', 'Sera',    'SR', '#e11d48', 'sera@alba.com',     '100004'),
  ('u5', 'Berat',   'BR', '#d97706', 'berat@alba.com',    '100005'),
  ('u6', 'Tulu',    'TL', '#6366f1', 'tulu@alba.com',     '100006')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  initials = EXCLUDED.initials,
  avatar_color = EXCLUDED.avatar_color,
  email = EXCLUDED.email,
  pin = EXCLUDED.pin;
