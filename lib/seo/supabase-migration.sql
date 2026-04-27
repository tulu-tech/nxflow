-- ═══════════════════════════════════════════════════════════════════════════════
-- NxFlow SEO — Supabase Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Workspace Members (Roles: admin, editor, viewer)
CREATE TABLE IF NOT EXISTS seo_workspace_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'viewer')),
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE seo_workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_members_select" ON seo_workspace_members FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM seo_workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "seo_members_admin" ON seo_workspace_members FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM seo_workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

-- 2. Workspaces
CREATE TABLE IF NOT EXISTS seo_workspaces (
  id TEXT PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  client_name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  website_url TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  business_type TEXT DEFAULT 'B2C',
  target_market TEXT DEFAULT '',
  tone_of_voice TEXT DEFAULT '',
  core_offer TEXT DEFAULT '',
  primary_cta TEXT DEFAULT '',
  brand_differentiators TEXT DEFAULT '',
  compliance_notes TEXT DEFAULT '',
  conversion_goals TEXT DEFAULT '',
  personas JSONB DEFAULT '[]',
  content_topics JSONB DEFAULT '[]',
  platforms JSONB DEFAULT '[]',
  discovered_pages JSONB DEFAULT '[]',
  sitemap_url TEXT DEFAULT '',
  sitemap_status TEXT DEFAULT 'idle',
  sitemap_error TEXT,
  sitemap_fetched_at TIMESTAMPTZ,
  pages_found INT DEFAULT 0,
  keyword_list_version INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE seo_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_ws_select" ON seo_workspaces FOR SELECT
  USING (id IN (SELECT workspace_id FROM seo_workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "seo_ws_admin" ON seo_workspaces FOR ALL
  USING (id IN (SELECT workspace_id FROM seo_workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

-- 3. Products (extracted from sitemap, stays permanent)
CREATE TABLE IF NOT EXISTS seo_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id TEXT REFERENCES seo_workspaces(id) ON DELETE CASCADE,
  product_url TEXT NOT NULL,
  product_title TEXT NOT NULL,
  product_slug TEXT,
  brand TEXT,
  category TEXT,
  og_image_url TEXT,
  description TEXT,
  price TEXT,
  source_page_type TEXT DEFAULT 'product',
  is_active BOOLEAN DEFAULT TRUE,
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, product_url)
);

ALTER TABLE seo_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_products_select" ON seo_products FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM seo_workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "seo_products_admin" ON seo_products FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM seo_workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

-- 4. Keywords (only admin can modify)
CREATE TABLE IF NOT EXISTS seo_keywords (
  keyword_id TEXT NOT NULL,
  workspace_id TEXT REFERENCES seo_workspaces(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  normalized_keyword TEXT NOT NULL,
  tag TEXT DEFAULT 'generic',
  volume INT,
  kd INT,
  cpc NUMERIC(10,2),
  source_file TEXT,
  uploaded_at TIMESTAMPTZ,
  keyword_list_version INT DEFAULT 1,
  status TEXT DEFAULT 'active',
  data_completeness NUMERIC(3,2) DEFAULT 0.2,
  usage JSONB DEFAULT '{"usedAsPrimaryCount":0,"usedAsSecondaryCount":0}',
  PRIMARY KEY (workspace_id, keyword_id)
);

ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_kw_select" ON seo_keywords FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM seo_workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "seo_kw_admin" ON seo_keywords FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM seo_workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "seo_kw_admin_update" ON seo_keywords FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM seo_workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "seo_kw_admin_delete" ON seo_keywords FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM seo_workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

-- 5. Projects
CREATE TABLE IF NOT EXISTS seo_projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES seo_workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_by_name TEXT,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','in-progress','completed','scheduled','published')),
  current_phase INT DEFAULT 1,
  persona_id TEXT,
  topic_id TEXT,
  platform_format TEXT,
  content_goal TEXT,
  keyword_strategy JSONB,
  content_brief JSONB,
  raw_content TEXT,
  linked_content TEXT,
  internal_link_plan JSONB,
  external_link_plan JSONB,
  image_plan JSONB,
  generated_images JSONB,
  scheduled_date TIMESTAMPTZ,
  published_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE seo_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_proj_select" ON seo_projects FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM seo_workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "seo_proj_create" ON seo_projects FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM seo_workspace_members WHERE user_id = auth.uid() AND role IN ('admin','editor')));

CREATE POLICY "seo_proj_update" ON seo_projects FOR UPDATE
  USING (created_by = auth.uid() OR workspace_id IN (
    SELECT workspace_id FROM seo_workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

-- 6. Prompts (reusable templates per workspace)
CREATE TABLE IF NOT EXISTS seo_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id TEXT REFERENCES seo_workspaces(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL,
  prompt_name TEXT NOT NULL,
  prompt_content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE seo_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_prompts_select" ON seo_prompts FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM seo_workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "seo_prompts_admin" ON seo_prompts FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM seo_workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

-- Done! ✅
