-- ============================================================
-- NXFlow — Seed Data
-- schema.sql'den SONRA çalıştır!
-- Alba workspace'ini örnek boardlar ve tasklar ile doldurur.
-- ============================================================

DO $$
DECLARE
  ws_id uuid;
  b1_id uuid := gen_random_uuid();
  b2_id uuid := gen_random_uuid();
  b3_id uuid := gen_random_uuid();
  g1_id uuid := gen_random_uuid();
  g2_id uuid := gen_random_uuid();
  g3_id uuid := gen_random_uuid();
  cols jsonb := '[
    {"id":"assignee","type":"assignee","label":"Assignee","width":140,"sortable":false,"filterable":true},
    {"id":"status","type":"status","label":"Status","width":130,"sortable":true,"filterable":true},
    {"id":"timeline","type":"timeline","label":"Timeline","width":180,"sortable":true,"filterable":false},
    {"id":"link","type":"link","label":"Link","width":140,"sortable":false,"filterable":false}
  ]';
BEGIN
  -- Alba workspace id'sini bul
  SELECT id INTO ws_id FROM public.workspaces WHERE name = 'Alba' LIMIT 1;

  IF ws_id IS NULL THEN
    RAISE NOTICE 'Alba workspace bulunamadı. Önce schema.sql çalıştır.';
    RETURN;
  END IF;

  -- Boards
  INSERT INTO public.boards (id, workspace_id, name, description, columns) VALUES
    (b1_id, ws_id, 'Q2 Roadmap', 'Q2 inisiyatiflerini takip ediyoruz', cols),
    (b2_id, ws_id, 'Marketing Campaigns', 'Kampanya planlama ve yürütme', cols),
    (b3_id, ws_id, 'Infrastructure', 'DevOps ve platform çalışmaları', cols);

  -- Groups for b1
  INSERT INTO public.groups (id, board_id, name, color, "order") VALUES
    (g1_id, b1_id, 'Ürün Lansmanı', '#6366f1', 0),
    (g2_id, b1_id, 'Mühendislik & Altyapı', '#10b981', 1),
    (g3_id, b1_id, 'Pazarlama & Büyüme', '#f59e0b', 2);

  -- Tasks for g1 (Ürün Lansmanı)
  INSERT INTO public.tasks (group_id, board_id, name, cells, "order") VALUES
    (g1_id, b1_id, 'Ürün gereksinimleri ve PRD tanımla',
      '{"status":{"type":"status","statusId":"done"},"timeline":{"type":"timeline","start":"2024-03-01","end":"2024-03-08"},"assignee":{"type":"assignee","userIds":[]},"link":{"type":"link","url":"https://notion.so/prd","label":"PRD Doc"}}', 0),
    (g1_id, b1_id, 'Tasarım sistemi — bileşenler v2',
      '{"status":{"type":"status","statusId":"done"},"timeline":{"type":"timeline","start":"2024-03-05","end":"2024-03-18"},"assignee":{"type":"assignee","userIds":[]},"link":{"type":"link","url":"https://figma.com/design","label":"Figma"}}', 1),
    (g1_id, b1_id, 'Frontend implementasyonu — dashboard',
      '{"status":{"type":"status","statusId":"working"},"timeline":{"type":"timeline","start":"2024-03-15","end":"2024-04-05"},"assignee":{"type":"assignee","userIds":[]},"link":{"type":"link","url":"","label":""}}', 2),
    (g1_id, b1_id, 'QA ve regresyon testleri',
      '{"status":{"type":"status","statusId":"not-started"},"timeline":{"type":"timeline","start":"2024-04-06","end":"2024-04-12"},"assignee":{"type":"assignee","userIds":[]},"link":{"type":"link","url":"","label":""}}', 3),
    (g1_id, b1_id, 'Paydaş incelemesi + onay',
      '{"status":{"type":"status","statusId":"in-review"},"timeline":{"type":"timeline","start":"2024-04-10","end":"2024-04-15"},"assignee":{"type":"assignee","userIds":[]},"link":{"type":"link","url":"https://docs.google.com/review","label":"Slides"}}', 4);

  -- Tasks for g2 (Mühendislik)
  INSERT INTO public.tasks (group_id, board_id, name, cells, "order") VALUES
    (g2_id, b1_id, 'CI/CD pipeline kurulumu (GitHub Actions)',
      '{"status":{"type":"status","statusId":"done"},"timeline":{"type":"timeline","start":"2024-03-01","end":"2024-03-10"},"assignee":{"type":"assignee","userIds":[]},"link":{"type":"link","url":"https://github.com/alba/ci","label":"GitHub"}}', 0),
    (g2_id, b1_id, 'Kubernetes''e geçiş — staging ortamı',
      '{"status":{"type":"status","statusId":"working"},"timeline":{"type":"timeline","start":"2024-03-12","end":"2024-03-28"},"assignee":{"type":"assignee","userIds":[]},"link":{"type":"link","url":"","label":""}}', 1),
    (g2_id, b1_id, 'Datadog monitöring + alerting kurulumu',
      '{"status":{"type":"status","statusId":"stuck"},"timeline":{"type":"timeline","start":"2024-03-20","end":"2024-04-02"},"assignee":{"type":"assignee","userIds":[]},"link":{"type":"link","url":"https://datadoghq.com","label":"Datadog"}}', 2),
    (g2_id, b1_id, 'Yük testi — 10k eşzamanlı kullanıcı',
      '{"status":{"type":"status","statusId":"not-started"},"timeline":{"type":"timeline","start":"2024-04-05","end":"2024-04-10"},"assignee":{"type":"assignee","userIds":[]},"link":{"type":"link","url":"","label":""}}', 3);

  -- Tasks for g3 (Pazarlama)
  INSERT INTO public.tasks (group_id, board_id, name, cells, "order") VALUES
    (g3_id, b1_id, 'Blog içerik serisi — 8 makale lansmanı',
      '{"status":{"type":"status","statusId":"working"},"timeline":{"type":"timeline","start":"2024-03-05","end":"2024-04-15"},"assignee":{"type":"assignee","userIds":[]},"link":{"type":"link","url":"https://notion.so/content","label":"İçerik planı"}}', 0),
    (g3_id, b1_id, 'Google Ads kurulumu + SEM kampanyası',
      '{"status":{"type":"status","statusId":"done"},"timeline":{"type":"timeline","start":"2024-03-08","end":"2024-03-20"},"assignee":{"type":"assignee","userIds":[]},"link":{"type":"link","url":"https://ads.google.com","label":"Google Ads"}}', 1),
    (g3_id, b1_id, 'Ortaklık görüşmeleri — 5 SaaS şirketi',
      '{"status":{"type":"status","statusId":"in-review"},"timeline":{"type":"timeline","start":"2024-03-18","end":"2024-04-10"},"assignee":{"type":"assignee","userIds":[]},"link":{"type":"link","url":"","label":""}}', 2),
    (g3_id, b1_id, 'Product Hunt lansmanı hazırlığı',
      '{"status":{"type":"status","statusId":"not-started"},"timeline":{"type":"timeline","start":"2024-04-08","end":"2024-04-20"},"assignee":{"type":"assignee","userIds":[]},"link":{"type":"link","url":"https://producthunt.com","label":"PH Page"}}', 3),
    (g3_id, b1_id, 'Email dizisi — onboarding',
      '{"status":{"type":"status","statusId":"stuck"},"timeline":{"type":"timeline","start":"2024-03-25","end":"2024-04-05"},"assignee":{"type":"assignee","userIds":[]},"link":{"type":"link","url":"","label":""}}', 4);

  RAISE NOTICE 'Seed verisi başarıyla eklendi! Workspace: %', ws_id;
END;
$$;
