/**
 * SEO Workspace — Supabase DB Layer
 *
 * All Supabase queries for the SEO module are isolated here.
 * Uses the shared supabase client from lib/supabase/client.ts (read-only import).
 * Does NOT modify any CRM tables or configuration.
 */

import { supabase } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MemberRole = 'admin' | 'editor' | 'viewer';

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: MemberRole;
  displayName: string | null;
  email: string | null;
  createdAt: string;
}

export interface DBProduct {
  id: string;
  workspaceId: string;
  productUrl: string;
  productTitle: string;
  productSlug: string | null;
  brand: string | null;
  category: string | null;
  ogImageUrl: string | null;
  description: string | null;
  price: string | null;
  isActive: boolean;
  extractedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sb() {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  const { data: { user } } = await sb().auth.getUser();
  return user;
}

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

// ─── Workspace Members ──────────────────────────────────────────────────────

export async function getMemberRole(workspaceId: string, userId: string): Promise<MemberRole | null> {
  const { data } = await sb()
    .from('seo_workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();
  return (data?.role as MemberRole) ?? null;
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const { data } = await sb()
    .from('seo_workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });
  return (data ?? []).map(r => ({
    id: r.id,
    workspaceId: r.workspace_id,
    userId: r.user_id,
    role: r.role as MemberRole,
    displayName: r.display_name,
    email: r.email,
    createdAt: r.created_at,
  }));
}

export async function addMember(
  workspaceId: string,
  userId: string,
  role: MemberRole,
  displayName?: string,
  email?: string,
) {
  const { error } = await sb()
    .from('seo_workspace_members')
    .upsert({
      workspace_id: workspaceId,
      user_id: userId,
      role,
      display_name: displayName ?? null,
      email: email ?? null,
    }, { onConflict: 'workspace_id,user_id' });
  if (error) throw error;
}

export async function removeMember(workspaceId: string, userId: string) {
  const { error } = await sb()
    .from('seo_workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function isAdmin(workspaceId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const role = await getMemberRole(workspaceId, userId);
  return role === 'admin';
}

// ─── Workspaces ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveWorkspace(workspace: Record<string, any>) {
  const { error } = await sb()
    .from('seo_workspaces')
    .upsert({
      id: workspace.id,
      owner_id: workspace.ownerId ?? (await getCurrentUserId()),
      client_name: workspace.clientName ?? workspace.brandName,
      brand_name: workspace.brandName,
      website_url: workspace.websiteUrl ?? '',
      industry: workspace.industry ?? '',
      business_type: workspace.businessType ?? 'B2C',
      target_market: workspace.targetMarket ?? '',
      tone_of_voice: workspace.toneOfVoice ?? '',
      core_offer: workspace.coreOffer ?? '',
      primary_cta: workspace.primaryCTA ?? '',
      brand_differentiators: workspace.brandDifferentiators ?? '',
      compliance_notes: workspace.complianceNotes ?? '',
      conversion_goals: workspace.conversionGoals ?? '',
      personas: workspace.personas ?? [],
      content_topics: workspace.contentTopics ?? [],
      platforms: workspace.platforms ?? [],
      discovered_pages: workspace.discoveredPages ?? [],
      sitemap_url: workspace.sitemapUrl ?? '',
      sitemap_status: workspace.sitemapStatus ?? 'idle',
      pages_found: workspace.pagesFound ?? 0,
      keyword_list_version: workspace.keywordListVersion ?? 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) throw error;
}

export async function loadWorkspace(workspaceId: string) {
  const { data, error } = await sb()
    .from('seo_workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single();
  if (error || !data) return null;
  return mapWorkspaceRow(data);
}

export async function loadUserWorkspaces() {
  // RLS ensures we only get workspaces where user is a member
  const { data } = await sb()
    .from('seo_workspaces')
    .select('*')
    .order('updated_at', { ascending: false });
  return (data ?? []).map(mapWorkspaceRow);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWorkspaceRow(r: any) {
  return {
    id: r.id,
    ownerId: r.owner_id,
    clientName: r.client_name,
    brandName: r.brand_name,
    websiteUrl: r.website_url,
    industry: r.industry,
    businessType: r.business_type,
    targetMarket: r.target_market,
    toneOfVoice: r.tone_of_voice,
    coreOffer: r.core_offer,
    primaryCTA: r.primary_cta,
    brandDifferentiators: r.brand_differentiators,
    complianceNotes: r.compliance_notes,
    conversionGoals: r.conversion_goals,
    personas: r.personas ?? [],
    contentTopics: r.content_topics ?? [],
    platforms: r.platforms ?? [],
    discoveredPages: r.discovered_pages ?? [],
    sitemapUrl: r.sitemap_url,
    sitemapStatus: r.sitemap_status,
    pagesFound: r.pages_found,
    keywordListVersion: r.keyword_list_version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ─── Keywords ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveKeywords(workspaceId: string, keywords: any[]) {
  // Admin check is enforced by RLS
  const rows = keywords.map(k => ({
    keyword_id: k.keywordId ?? k.id,
    workspace_id: workspaceId,
    keyword: k.keyword,
    normalized_keyword: k.normalizedKeyword ?? k.keyword.toLowerCase(),
    tag: k.tag ?? 'generic',
    volume: k.volume ?? null,
    kd: k.kd ?? null,
    cpc: k.cpc ?? null,
    source_file: k.sourceFile ?? null,
    uploaded_at: k.uploadedAt ?? new Date().toISOString(),
    keyword_list_version: k.keywordListVersion ?? 1,
    status: k.status ?? 'active',
    data_completeness: k.dataCompleteness ?? 0.2,
    usage: k.usage ?? { usedAsPrimaryCount: 0, usedAsSecondaryCount: 0 },
  }));

  // Batch upsert in chunks of 500
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb()
      .from('seo_keywords')
      .upsert(rows.slice(i, i + 500), { onConflict: 'workspace_id,keyword_id' });
    if (error) throw error;
  }
}

export async function loadKeywords(workspaceId: string) {
  const { data } = await sb()
    .from('seo_keywords')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .order('volume', { ascending: false, nullsFirst: false });
  return (data ?? []).map(r => ({
    keywordId: r.keyword_id,
    workspaceId: r.workspace_id,
    keyword: r.keyword,
    normalizedKeyword: r.normalized_keyword,
    tag: r.tag,
    volume: r.volume,
    kd: r.kd,
    cpc: r.cpc,
    sourceFile: r.source_file,
    uploadedAt: r.uploaded_at,
    keywordListVersion: r.keyword_list_version,
    status: r.status,
    dataCompleteness: r.data_completeness,
    usage: r.usage,
  }));
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function saveProducts(workspaceId: string, products: Partial<DBProduct>[]) {
  const rows = products.map(p => ({
    workspace_id: workspaceId,
    product_url: p.productUrl,
    product_title: p.productTitle,
    product_slug: p.productSlug ?? null,
    brand: p.brand ?? null,
    category: p.category ?? null,
    og_image_url: p.ogImageUrl ?? null,
    description: p.description ?? null,
    price: p.price ?? null,
    source_page_type: 'product',
    is_active: true,
    extracted_at: new Date().toISOString(),
  }));

  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await sb()
      .from('seo_products')
      .upsert(rows.slice(i, i + 100), { onConflict: 'workspace_id,product_url' });
    if (error) throw error;
  }
}

export async function loadProducts(workspaceId: string): Promise<DBProduct[]> {
  const { data } = await sb()
    .from('seo_products')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('product_title', { ascending: true });
  return (data ?? []).map(r => ({
    id: r.id,
    workspaceId: r.workspace_id,
    productUrl: r.product_url,
    productTitle: r.product_title,
    productSlug: r.product_slug,
    brand: r.brand,
    category: r.category,
    ogImageUrl: r.og_image_url,
    description: r.description,
    price: r.price,
    isActive: r.is_active,
    extractedAt: r.extracted_at,
  }));
}

// ─── Projects ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveProject(workspaceId: string, project: Record<string, any>) {
  const userId = await getCurrentUserId();
  const { error } = await sb()
    .from('seo_projects')
    .upsert({
      id: project.id,
      workspace_id: workspaceId,
      created_by: project.createdBy ?? userId,
      created_by_name: project.createdByName ?? null,
      title: project.name ?? project.title,
      status: project.status ?? 'draft',
      current_phase: project.currentPhase ?? 1,
      persona_id: project.personaId ?? null,
      topic_id: project.topicId ?? null,
      platform_format: project.platformFormat ?? null,
      content_goal: project.contentGoal ?? null,
      keyword_strategy: project.keywordStrategy ?? null,
      content_brief: project.contentBrief ?? null,
      raw_content: project.rawContent ?? null,
      linked_content: project.linkedContent ?? null,
      internal_link_plan: project.internalLinkPlan ?? null,
      external_link_plan: project.externalLinkPlan ?? null,
      image_plan: project.imagePlan ?? null,
      generated_images: project.generatedImages ?? null,
      scheduled_date: project.scheduledDate ?? null,
      published_date: project.publishedDate ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) throw error;
}

export async function loadProjects(workspaceId: string) {
  const { data } = await sb()
    .from('seo_projects')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });
  return (data ?? []).map(r => ({
    id: r.id,
    workspaceId: r.workspace_id,
    createdBy: r.created_by,
    createdByName: r.created_by_name,
    title: r.title,
    status: r.status,
    currentPhase: r.current_phase,
    personaId: r.persona_id,
    topicId: r.topic_id,
    platformFormat: r.platform_format,
    contentGoal: r.content_goal,
    keywordStrategy: r.keyword_strategy,
    contentBrief: r.content_brief,
    rawContent: r.raw_content,
    linkedContent: r.linked_content,
    internalLinkPlan: r.internal_link_plan,
    externalLinkPlan: r.external_link_plan,
    imagePlan: r.image_plan,
    generatedImages: r.generated_images,
    scheduledDate: r.scheduled_date,
    publishedDate: r.published_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function updateProjectStatus(
  projectId: string,
  status: string,
  dateField?: 'scheduled_date' | 'published_date',
  dateValue?: string,
) {
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (dateField && dateValue) update[dateField] = dateValue;
  const { error } = await sb()
    .from('seo_projects')
    .update(update)
    .eq('id', projectId);
  if (error) throw error;
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

export async function savePrompt(
  workspaceId: string,
  promptType: string,
  promptName: string,
  promptContent: string,
) {
  const userId = await getCurrentUserId();
  const { error } = await sb()
    .from('seo_prompts')
    .insert({
      workspace_id: workspaceId,
      prompt_type: promptType,
      prompt_name: promptName,
      prompt_content: promptContent,
      created_by: userId,
    });
  if (error) throw error;
}

export async function loadPrompts(workspaceId: string) {
  const { data } = await sb()
    .from('seo_prompts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(r => ({
    id: r.id,
    workspaceId: r.workspace_id,
    promptType: r.prompt_type,
    promptName: r.prompt_name,
    promptContent: r.prompt_content,
    isDefault: r.is_default,
    createdBy: r.created_by,
    createdAt: r.created_at,
  }));
}
