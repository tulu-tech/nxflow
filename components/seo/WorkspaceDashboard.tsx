'use client';

import type { SEOWorkspace, WorkspaceKeyword } from '@/lib/seo/workspaceTypes';
import { PLATFORM_LABELS, PLATFORM_ICONS, PlatformType } from '@/lib/seo/workspaceTypes';
import { useWorkspaceStore } from '@/store/seoWorkspaceStore';
import { useSEOStore } from '@/store/seoStore';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import {
  Globe, Tag, FileText, Upload, Plus, Settings, Map,
  Pencil, Check, X, Trash2, ExternalLink, Users, BookOpen,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ProjectCard } from './ProjectCard';
import { ContentTracker } from './ContentTracker';
import { KeywordManager } from './KeywordManager';
import { BusinessType } from '@/lib/seo/types';



interface Props {
  workspace: SEOWorkspace;
}

// ─── Keyword Upload Helper ───────────────────────────────────────────────────

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeKeyword(kw: string): string {
  return kw.toLowerCase().trim().replace(/\s+/g, ' ');
}

function parseKeywordFile(
  buffer: ArrayBuffer,
  workspaceId: string,
  version: number,
  fileName: string,
): { keywords: WorkspaceKeyword[]; errors: string[] } {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  if (raw.length === 0) return { keywords: [], errors: ['File is empty.'] };

  const headers = Object.keys(raw[0]);
  const colMap: Record<string, string> = {};
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (norm.includes('keyword') && !norm.includes('diff')) colMap.keyword = h;
    else if (norm === 'tag' || norm === 'tags' || norm === 'label' || norm === 'category') colMap.tag = h;
    else if (norm.includes('volume') || norm === 'searchvolume' || norm === 'sv') colMap.volume = h;
    else if (norm.includes('difficulty') || norm === 'kd' || norm === 'keyworddiff') colMap.kd = h;
    else if (norm.includes('cpc') || norm.includes('cost')) colMap.cpc = h;
  }
  if (!colMap.keyword) colMap.keyword = headers[0];

  const errors: string[] = [];
  const now = new Date().toISOString();
  const seen = new Set<string>();

  const keywords: WorkspaceKeyword[] = [];

  for (let idx = 0; idx < raw.length; idx++) {
    const row = raw[idx];
    const kwRaw = row[colMap.keyword];
    if (!kwRaw || !String(kwRaw).trim()) {
      errors.push(`Row ${idx + 2}: Missing keyword — skipped.`);
      continue;
    }
    const kw = String(kwRaw).trim();
    const normalized = normalizeKeyword(kw);

    // Deduplicate
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const tagRaw = colMap.tag ? String(row[colMap.tag] ?? '').trim() : '';
    if (!tagRaw) {
      errors.push(`Row ${idx + 2}: "${kw}" has no tag — defaulting to "untagged".`);
    }

    const volumeRaw = colMap.volume ? row[colMap.volume] : null;
    const kdRaw = colMap.kd ? row[colMap.kd] : null;
    const cpcRaw = colMap.cpc ? row[colMap.cpc] : null;

    const volVal = volumeRaw !== null && volumeRaw !== '' && !isNaN(Number(volumeRaw)) ? Number(volumeRaw) : null;
    const kdVal = kdRaw !== null && kdRaw !== '' && !isNaN(Number(kdRaw)) ? Number(kdRaw) : null;
    const cpcVal = cpcRaw !== null && cpcRaw !== '' && !isNaN(Number(cpcRaw)) ? Number(cpcRaw) : null;
    const tagVal = tagRaw || 'untagged';

    // dataCompleteness: keyword always present=1, tag, kd, cpc, volume each add 0.2
    let completeness = 0.2; // keyword present
    if (tagVal !== 'untagged') completeness += 0.2;
    if (kdVal !== null) completeness += 0.2;
    if (cpcVal !== null) completeness += 0.2;
    if (volVal !== null) completeness += 0.2;

    keywords.push({
      keywordId: `wk-${version}-${idx}`,
      workspaceId,
      keyword: kw,
      normalizedKeyword: normalized,
      tag: tagVal,
      kd: kdVal,
      cpc: cpcVal,
      volume: volVal,
      sourceFile: fileName,
      uploadedAt: now,
      keywordListVersion: version,
      status: 'active',
      dataCompleteness: Math.round(completeness * 100) / 100,
      usage: {
        usedAsPrimaryCount: 0,
        usedAsSecondaryCount: 0,
        lastUsedAsPrimaryAt: null,
        lastUsedAsSecondaryAt: null,
        usedInContentIds: [],
      },
    });
  }

  return { keywords, errors };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WorkspaceDashboard({ workspace }: Props) {
  const router = useRouter();
  const { updateWorkspace, updateKeywordList, updateSitemap, setSitemapStatus, togglePlatform } = useWorkspaceStore();
  const { createProject, projects, updateProjectField } = useSEOStore();
  const { addProjectToWorkspace } = useWorkspaceStore();

  const [editingBrand, setEditingBrand] = useState(false);
  const [brandDraft, setBrandDraft] = useState({
    brandName: workspace.brandName,
    websiteUrl: workspace.websiteUrl,
    industry: workspace.industry,
    businessType: workspace.businessType,
    targetMarket: workspace.targetMarket,
    toneOfVoice: workspace.toneOfVoice,
    coreOffer: workspace.coreOffer,
    conversionGoals: workspace.conversionGoals,
    primaryCTA: workspace.primaryCTA,
    brandDifferentiators: workspace.brandDifferentiators,
  });
  const [sitemapInput, setSitemapInput] = useState(workspace.sitemapUrl);
  const [kwUploading, setKwUploading] = useState(false);
  const [kwError, setKwError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showSitemapPages, setShowSitemapPages] = useState(false);






  // Projects in this workspace
  const wsProjects = workspace.projectIds
    .map((pid) => projects[pid])
    .filter(Boolean)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // ── Brand save
  const saveBrand = () => {
    updateWorkspace(workspace.id, brandDraft);
    setEditingBrand(false);
  };

  // ── Keyword upload
  const handleKwUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setKwUploading(true);
    setKwError(null);
    try {
      const buffer = await file.arrayBuffer();
      const nextVersion = workspace.keywordListVersion + 1;
      const { keywords, errors } = parseKeywordFile(buffer, workspace.id, nextVersion, file.name);
      if (keywords.length === 0) {
        setKwError(errors.length > 0 ? errors.join(' ') : 'No keywords found in file.');
      } else {
        updateKeywordList(workspace.id, keywords);
        if (errors.length > 0) {
          setKwError(`Imported ${keywords.length} keywords. Warnings: ${errors.slice(0, 3).join(' ')}${errors.length > 3 ? ` +${errors.length - 3} more` : ''}`);
        }
      }
    } catch {
      setKwError('Failed to parse file.');
    }
    setKwUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Create content project — go straight to wizard
  const handleStartCreate = () => {
    const name = `${workspace.brandName} — New Article`;
    const pid = createProject(name, workspace);
    addProjectToWorkspace(workspace.id, pid);
    router.push(`/seoagent/workspace/${workspace.id}/project/${pid}`);
  };

  // ── Sitemap fetch & parse
  const handleSitemapFetch = async () => {
    const url = sitemapInput.trim();
    if (!url) return;
    setSitemapStatus(workspace.id, 'fetching');
    try {
      const res = await fetch('/api/seo/sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitemapUrl: url, workspaceId: workspace.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSitemapStatus(workspace.id, 'error', data.error || 'Failed to fetch sitemap');
        return;
      }
      updateSitemap(workspace.id, url, data.pages);
    } catch (err) {
      setSitemapStatus(workspace.id, 'error', (err as Error).message);
    }
  };

  const handleSitemapSave = () => {
    handleSitemapFetch();
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="seo-btn seo-btn-ghost" onClick={() => router.push('/seoagent')} style={{ padding: '6px 8px' }}>
          ←
        </button>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {workspace.brandName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {workspace.brandName}
          </h2>
          {workspace.websiteUrl && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Globe size={11} />
              {workspace.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </div>
          )}
        </div>
        <button className="seo-btn seo-btn-primary" onClick={handleStartCreate}>
          <Plus size={14} /> Create Content
        </button>
      </div>

      {/* Overview stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
        {[
          { icon: <Tag size={16} />, label: 'Keywords', value: workspace.keywordList.length, color: workspace.keywordList.length > 0 ? '#00c875' : 'var(--text-muted)', sub: workspace.keywordList.length > 0 ? `${new Set(workspace.keywordList.map(k => k.tag)).size} tags · ${workspace.keywordList.filter(k => k.usage.usedAsPrimaryCount > 0).length} used` : 'Not uploaded' },
          { icon: <FileText size={16} />, label: 'Content', value: (workspace.generatedContent ?? []).length, color: (workspace.generatedContent ?? []).length > 0 ? '#818cf8' : 'var(--text-muted)', sub: `${(workspace.generatedContent ?? []).filter(c => c.contentStatus === 'published').length} published · ${(workspace.generatedContent ?? []).filter(c => c.contentStatus === 'draft').length} draft` },
          { icon: <Map size={16} />, label: 'Sitemap', value: workspace.sitemapUrl ? '✓' : '—', color: workspace.sitemapUrl ? '#00c875' : 'var(--text-muted)', sub: workspace.discoveredPages?.length > 0 ? workspace.discoveredPages.length + ' pages' : workspace.sitemapUrl ? 'Not fetched' : 'Not set' },
        ].map((stat, i) => (
          <div key={i} className="seo-card" style={{ textAlign: 'center', padding: '16px 12px' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{stat.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stat.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { icon: <Users size={16} />, label: 'Personas', value: workspace.personas.length, color: workspace.personas.length > 0 ? '#e78bfa' : 'var(--text-muted)', sub: workspace.personas.length > 0 ? `${workspace.personas.filter(p => p.intentStages.includes('decision')).length} decision-stage` : 'Not configured' },
          { icon: <BookOpen size={16} />, label: 'Topics', value: workspace.contentTopics.length, color: workspace.contentTopics.length > 0 ? '#fdab3d' : 'var(--text-muted)', sub: workspace.contentTopics.length > 0 ? `${new Set(workspace.contentTopics.map(t => t.topicCluster ?? t.category)).size} clusters` : 'Not configured' },
          { icon: <Settings size={16} />, label: 'Platforms', value: workspace.platforms.filter(p => p.enabled).length, color: workspace.platforms.some(p => p.enabled) ? '#00c875' : 'var(--text-muted)', sub: 'enabled' },
        ].map((stat, i) => (
          <div key={i} className="seo-card" style={{ textAlign: 'center', padding: '16px 12px' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{stat.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Brand Info Card */}
        <div className="seo-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>🏢 Brand Info</h3>
            <button className="seo-btn seo-btn-ghost seo-btn-sm" onClick={() => setEditingBrand(!editingBrand)}>
              {editingBrand ? <X size={12} /> : <Pencil size={12} />}
              {editingBrand ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editingBrand ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              {([
                ['brandName', 'Brand Name'],
                ['websiteUrl', 'Website'],
                ['industry', 'Industry'],
                ['targetMarket', 'Target Market'],
                ['toneOfVoice', 'Tone of Voice'],
                ['coreOffer', 'Core Offer'],
                ['conversionGoals', 'Conversion Goals'],
                ['primaryCTA', 'Primary CTA'],
                ['brandDifferentiators', 'Differentiators'],
              ] as [keyof typeof brandDraft, string][]).map(([field, label]) => (
                <div key={field}>
                  <label className="seo-label" style={{ fontSize: 11 }}>{label}</label>
                  <input
                    className="seo-input"
                    value={String(brandDraft[field] ?? '')}
                    onChange={(e) => setBrandDraft({ ...brandDraft, [field]: e.target.value })}
                    style={{ fontSize: 12, padding: '5px 8px' }}
                  />
                </div>
              ))}
              <div>
                <label className="seo-label" style={{ fontSize: 11 }}>Business Type</label>
                <div className="seo-radio-group">
                  {(['B2B', 'B2C', 'B2G', 'Both'] as BusinessType[]).map((t) => (
                    <button
                      key={t}
                      className={`seo-radio-option ${brandDraft.businessType === t ? 'selected' : ''}`}
                      onClick={() => setBrandDraft({ ...brandDraft, businessType: t })}
                      type="button"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <button className="seo-btn seo-btn-primary seo-btn-sm" onClick={saveBrand} style={{ marginTop: 4 }}>
                <Check size={12} /> Save Changes
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              {([
                ['Industry', workspace.industry],
                ['Business Type', workspace.businessType],
                ['Target Market', workspace.targetMarket],
                ['Tone', workspace.toneOfVoice],
                ['Core Offer', workspace.coreOffer],
                ['CTA', workspace.primaryCTA],
                ['Differentiators', workspace.brandDifferentiators],
              ] as [string, string][]).filter(([, v]) => v).map(([label, value]) => (
                <div key={label}>
                  <strong style={{ color: 'var(--text-muted)', fontSize: 11 }}>{label}:</strong>{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
                </div>
              ))}
              {workspace.targetCountries.length > 0 && (
                <div>
                  <strong style={{ color: 'var(--text-muted)', fontSize: 11 }}>Countries:</strong>{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>{workspace.targetCountries.join(', ')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Keyword Library */}
        <KeywordManager
          workspaceId={workspace.id}
          keywords={workspace.keywordList}
          versions={workspace.keywordVersions ?? []}
          currentVersion={workspace.keywordListVersion}
          lastUploadedAt={workspace.keywordListUploadedAt}
        />
      </div>

      {/* Second row: Sitemap + Platforms */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Sitemap Card */}
        <div className="seo-card">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
            🗺️ Sitemap
            {workspace.sitemapStatus === 'fetching' && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--accent)', marginLeft: 8 }}>Fetching...</span>}
            {workspace.sitemapStatus === 'success' && <span style={{ fontSize: 11, fontWeight: 400, color: '#00c875', marginLeft: 8 }}>✓ Active</span>}
            {workspace.sitemapStatus === 'error' && <span style={{ fontSize: 11, fontWeight: 400, color: '#f87171', marginLeft: 8 }}>✗ Error</span>}
          </h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              className="seo-input"
              value={sitemapInput}
              onChange={(e) => setSitemapInput(e.target.value)}
              placeholder="https://example.com/sitemap.xml"
              style={{ flex: 1, fontSize: 12 }}
            />
            <button
              className="seo-btn seo-btn-primary seo-btn-sm"
              onClick={handleSitemapFetch}
              disabled={!sitemapInput.trim() || workspace.sitemapStatus === 'fetching'}
            >
              {workspace.sitemapStatus === 'fetching' ? '⏳' : workspace.discoveredPages?.length > 0 ? '🔄 Refresh' : '📥 Fetch'}
            </button>
          </div>

          {/* Error */}
          {workspace.sitemapError && (
            <div style={{ fontSize: 11, color: '#f87171', padding: '6px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.06)', marginBottom: 8 }}>
              {workspace.sitemapError}
            </div>
          )}

          {/* Stats row */}
          {workspace.sitemapLastCheckedAt && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
              <span>Last checked: {new Date(workspace.sitemapLastCheckedAt).toLocaleDateString()}</span>
              <span>·</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{workspace.discoveredPages?.length ?? 0} pages</span>
              {workspace.discoveredPages?.length > 0 && (() => {
                const types: Record<string, number> = {};
                workspace.discoveredPages.forEach((p) => { types[p.pageType] = (types[p.pageType] || 0) + 1; });
                return Object.entries(types).map(([t, c]) => (
                  <span key={t} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'rgba(129,140,248,0.08)' }}>{t}: {c}</span>
                ));
              })()}
            </div>
          )}

          {/* Toggle pages list */}
          {workspace.discoveredPages?.length > 0 && (
            <div>
              <button
                className="seo-btn seo-btn-ghost seo-btn-sm"
                onClick={() => setShowSitemapPages(!showSitemapPages)}
                style={{ fontSize: 11, marginBottom: showSitemapPages ? 8 : 0 }}
              >
                {showSitemapPages ? '▼ Hide' : '▶ View'} Discovered Pages ({workspace.discoveredPages.length})
              </button>
              {showSitemapPages && (
                <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: 4 }}>
                  {workspace.discoveredPages.map((p) => (
                    <div key={p.pageId} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px',
                      fontSize: 11, borderBottom: '1px solid var(--border-subtle)',
                    }}>
                      <span style={{
                        fontSize: 9, padding: '1px 5px', borderRadius: 3, flexShrink: 0, minWidth: 52, textAlign: 'center',
                        background: p.pageType === 'product' ? 'rgba(0,200,117,0.1)' : p.pageType === 'blog' ? 'rgba(129,140,248,0.1)' : p.pageType === 'collection' ? 'rgba(253,171,61,0.1)' : 'rgba(129,140,248,0.04)',
                        color: p.pageType === 'product' ? '#00c875' : p.pageType === 'blog' ? 'var(--accent)' : p.pageType === 'collection' ? '#fdab3d' : 'var(--text-muted)',
                      }}>
                        {p.pageType}
                      </span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                        {p.path}
                      </span>
                      {p.detectedBrand && (
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(253,171,61,0.08)', color: '#fdab3d', flexShrink: 0 }}>
                          {p.detectedBrand}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Platforms Card */}
        <div className="seo-card">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
            📡 Platforms
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {workspace.platforms.map((p) => (
              <button
                key={p.platform}
                onClick={() => togglePlatform(workspace.id, p.platform, !p.enabled)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: p.enabled ? 'none' : '1px solid var(--border)',
                  background: p.enabled ? '#6366f1' : 'transparent',
                  color: p.enabled ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {PLATFORM_ICONS[p.platform]} {PLATFORM_LABELS[p.platform]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Persona Library + Content Topics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Persona Library */}
        <div className="seo-card">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
            👥 Persona Library
            {workspace.personas.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                {workspace.personas.length} personas
              </span>
            )}
          </h3>
          {workspace.personas.length > 0 ? (
            <div style={{ maxHeight: 420, overflow: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {workspace.personas.map((p) => (
                  <div key={p.id} style={{
                    padding: '8px 10px', borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    fontSize: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 3,
                        background: p.claimRiskLevel === 'high' ? 'rgba(239,68,68,0.12)' : p.claimRiskLevel === 'medium' ? 'rgba(253,171,61,0.12)' : 'rgba(0,200,117,0.12)',
                        color: p.claimRiskLevel === 'high' ? '#f87171' : p.claimRiskLevel === 'medium' ? '#fdab3d' : '#00c875',
                      }}>
                        {p.claimRiskLevel === 'high' ? '⚠️ high risk' : p.claimRiskLevel === 'medium' ? '⚡ med risk' : '✓ low risk'}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.4, marginBottom: 4 }}>
                      {p.shortDescription}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {p.intentStages.map((s) => (
                        <span key={s} style={{
                          fontSize: 10, padding: '2px 7px', borderRadius: 3,
                          background: '#3730a3', color: '#c7d2fe',
                          textTransform: 'capitalize', fontWeight: 500,
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
              No personas configured yet.
            </div>
          )}
        </div>

        {/* Content Topic Library */}
        <div className="seo-card">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
            📚 Content Topics
            {workspace.contentTopics.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                {workspace.contentTopics.length} topics
              </span>
            )}
          </h3>
          {workspace.contentTopics.length > 0 ? (() => {
            // Group by cluster
            const clusters: Record<string, typeof workspace.contentTopics> = {};
            workspace.contentTopics.forEach((t) => {
              const cluster = t.topicCluster ?? t.category ?? 'Other';
              if (!clusters[cluster]) clusters[cluster] = [];
              clusters[cluster].push(t);
            });
            return (
              <div style={{ maxHeight: 420, overflow: 'auto' }}>
                {/* Cluster pill summary */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                  {Object.entries(clusters).map(([cluster, topics]) => (
                    <span key={cluster} style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 3,
                      background: 'rgba(129,140,248,0.08)', color: 'var(--text-muted)',
                    }}>
                      {cluster} ({topics.length})
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {workspace.contentTopics.map((t) => (
                    <div key={t.topicId ?? t.id} style={{
                      padding: '8px 10px', borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      fontSize: 12,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{t.topicName ?? t.topic}</span>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          {t.claimRiskLevel && (
                            <span style={{
                              fontSize: 9, padding: '1px 5px', borderRadius: 3,
                              background: t.claimRiskLevel === 'high' ? 'rgba(239,68,68,0.12)' : t.claimRiskLevel === 'medium' ? 'rgba(253,171,61,0.12)' : 'rgba(0,200,117,0.08)',
                              color: t.claimRiskLevel === 'high' ? '#f87171' : t.claimRiskLevel === 'medium' ? '#fdab3d' : '#00c875',
                            }}>
                              {t.claimRiskLevel === 'high' ? '⚠️' : t.claimRiskLevel === 'medium' ? '⚡' : '✓'} {t.claimRiskLevel}
                            </span>
                          )}
                          <span style={{
                            fontSize: 10, padding: '2px 7px', borderRadius: 3,
                            background: t.funnelStage === 'bottom' ? '#065f46' : t.funnelStage === 'middle' ? '#3730a3' : '#78350f',
                            color: t.funnelStage === 'bottom' ? '#6ee7b7' : t.funnelStage === 'middle' ? '#c7d2fe' : '#fcd34d',
                            fontWeight: 500,
                          }}>
                            {t.funnelStage}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: '#1e293b', color: '#94a3b8' }}>
                          {t.topicCluster ?? t.category}
                        </span>
                        {t.brandOrProductSignal && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'rgba(253,171,61,0.08)', color: '#fdab3d' }}>
                            {t.brandOrProductSignal}
                          </span>
                        )}
                        {t.defaultSearchIntent && (
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                            {t.defaultSearchIntent}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })() : (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
              No content topics configured yet.
            </div>
          )}
        </div>
      </div>

      {/* Content Tracker */}
      <ContentTracker workspaceId={workspace.id} workspaceName={workspace.brandName} content={workspace.generatedContent ?? []} />

      {/* Content Projects */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            📝 Content Projects
          </h3>
          <button className="seo-btn seo-btn-primary seo-btn-sm" onClick={handleStartCreate}>
            <Plus size={12} /> New Content
          </button>
        </div>


        {(() => {
          const scheduled = wsProjects.filter(p => p.status === 'scheduled');
          const published = wsProjects.filter(p => p.status === 'published');
          const drafts = wsProjects.filter(p => !['scheduled', 'published'].includes(p.status));

          const handlePublish = (projectId: string) => {
            updateProjectField(projectId, 'status', 'published');
            updateProjectField(projectId, 'publishedDate', new Date().toISOString());
          };

          return (
            <>
              {/* Scheduled Posts */}
              {scheduled.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 14 }}>📅</span>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#818cf8', margin: 0 }}>Scheduled ({scheduled.length})</h4>
                  </div>
                  <div className="seo-projects-grid">
                    {scheduled.map((project) => (
                      <div key={project.id} style={{ position: 'relative' }}>
                        <div style={{
                          position: 'absolute', top: 8, right: 8, zIndex: 2,
                          display: 'flex', gap: 4, alignItems: 'center',
                        }}>
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 4,
                            background: '#3730a3', color: '#c7d2fe', fontWeight: 600,
                          }}>
                            📅 {project.scheduledDate ? new Date(project.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePublish(project.id); }}
                            style={{
                              fontSize: 10, padding: '2px 8px', borderRadius: 4,
                              background: '#065f46', color: '#6ee7b7', fontWeight: 700,
                              border: '1px solid #00c875', cursor: 'pointer',
                            }}
                          >
                            ✅ Publish
                          </button>
                        </div>
                        <ProjectCard project={project} workspaceId={workspace.id} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Published Posts */}
              {published.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 14 }}>✅</span>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#00c875', margin: 0 }}>Published ({published.length})</h4>
                  </div>
                  <div className="seo-projects-grid">
                    {published.map((project) => (
                      <div key={project.id} style={{ position: 'relative' }}>
                        <div style={{
                          position: 'absolute', top: 8, right: 8, zIndex: 2,
                          fontSize: 10, padding: '2px 8px', borderRadius: 4,
                          background: '#065f46', color: '#6ee7b7', fontWeight: 600,
                        }}>
                          ✅ Published {project.publishedDate ? new Date(project.publishedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                        </div>
                        <ProjectCard project={project} workspaceId={workspace.id} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Draft / In-Progress */}
              {drafts.length > 0 ? (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 14 }}>📝</span>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Drafts ({drafts.length})</h4>
                  </div>
                  <div className="seo-projects-grid">
                    {drafts.map((project) => (
                      <ProjectCard key={project.id} project={project} workspaceId={workspace.id} />
                    ))}
                  </div>
                </div>
              ) : wsProjects.length === 0 ? (
                <div className="seo-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    No content yet
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                    Create your first SEO content project for {workspace.brandName}
                  </div>
                  <button className="seo-btn seo-btn-primary" onClick={handleStartCreate}>
                    <Plus size={14} /> Create Content
                  </button>
                </div>
              ) : null}
            </>
          );
        })()}
      </div>
    </div>
  );
}
