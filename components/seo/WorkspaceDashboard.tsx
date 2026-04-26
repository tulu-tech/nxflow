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

    keywords.push({
      keywordId: `wk-${version}-${idx}`,
      workspaceId,
      keyword: kw,
      normalizedKeyword: normalized,
      tag: tagRaw || 'untagged',
      kd: kdRaw !== null && kdRaw !== '' && !isNaN(Number(kdRaw)) ? Number(kdRaw) : null,
      cpc: cpcRaw !== null && cpcRaw !== '' && !isNaN(Number(cpcRaw)) ? Number(cpcRaw) : null,
      volume: volumeRaw !== null && volumeRaw !== '' && !isNaN(Number(volumeRaw)) ? Number(volumeRaw) : null,
      sourceFile: fileName,
      uploadedAt: now,
      keywordListVersion: version,
      status: 'active',
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
  const { updateWorkspace, updateKeywordList, updateSitemap, togglePlatform } = useWorkspaceStore();
  const { createProject, projects } = useSEOStore();
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

  // Create content panel state
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [contentName, setContentName] = useState(`${workspace.brandName} — New Article`);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);

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

  // ── Create content project
  const handleStartCreate = () => {
    setContentName(`${workspace.brandName} — New Article`);
    setSelectedPersonaId(null);
    setShowCreatePanel(true);
  };

  const handleConfirmCreate = () => {
    if (!contentName.trim()) return;
    // If workspace has personas but none selected, don't proceed
    if (workspace.personas.length > 0 && !selectedPersonaId) return;
    const pid = createProject(contentName.trim(), workspace, selectedPersonaId ?? undefined);
    addProjectToWorkspace(workspace.id, pid);
    setShowCreatePanel(false);
    router.push(`/seoagent/workspace/${workspace.id}/project/${pid}`);
  };

  // ── Sitemap save
  const handleSitemapSave = () => {
    updateSitemap(workspace.id, sitemapInput.trim());
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
          { icon: <FileText size={16} />, label: 'Projects', value: wsProjects.length, color: wsProjects.length > 0 ? '#818cf8' : 'var(--text-muted)', sub: `${wsProjects.filter(p => p.status === 'completed').length} completed` },
          { icon: <Map size={16} />, label: 'Sitemap', value: workspace.sitemapUrl ? '✓' : '—', color: workspace.sitemapUrl ? '#00c875' : 'var(--text-muted)', sub: workspace.sitemapUrl ? workspace.sitemapPages.length + ' pages' : 'Not set' },
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

        {/* Keyword List Card */}
        <div className="seo-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              📊 Keyword List
              {workspace.keywordList.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                  v{workspace.keywordListVersion} · {workspace.keywordList.length} keywords
                </span>
              )}
            </h3>
            <div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleKwUpload} style={{ display: 'none' }} />
              <button
                className="seo-btn seo-btn-secondary seo-btn-sm"
                onClick={() => fileRef.current?.click()}
                disabled={kwUploading}
              >
                <Upload size={12} />
                {kwUploading ? 'Uploading…' : workspace.keywordList.length > 0 ? 'Replace' : 'Upload'}
              </button>
            </div>
          </div>

          {kwError && (
            <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 12, marginBottom: 10 }}>
              {kwError}
            </div>
          )}

          {workspace.keywordList.length > 0 ? (
            <div>
              {/* Tag summary */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {(() => {
                  const tags: Record<string, number> = {};
                  workspace.keywordList.forEach((kw) => { tags[kw.tag] = (tags[kw.tag] || 0) + 1; });
                  return Object.entries(tags).sort((a, b) => b[1] - a[1]).map(([tag, count]) => (
                    <span key={tag} style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 3,
                      background: 'rgba(129,140,248,0.08)', color: 'var(--text-muted)',
                    }}>
                      {tag} ({count})
                    </span>
                  ));
                })()}
              </div>
              <div style={{ maxHeight: 260, overflow: 'auto', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <table className="seo-table">
                  <thead>
                    <tr>
                      <th>Keyword</th>
                      <th style={{ width: 80 }}>Tag</th>
                      <th style={{ width: 60 }}>Vol</th>
                      <th style={{ width: 40 }}>KD</th>
                      <th style={{ width: 50 }}>CPC</th>
                      <th style={{ width: 50 }}>Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.keywordList.slice(0, 20).map((kw) => (
                      <tr key={kw.keywordId} style={{ opacity: kw.usage.usedAsPrimaryCount > 0 ? 0.65 : 1 }}>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 12 }}>
                          {kw.keyword}
                          {kw.usage.usedAsPrimaryCount > 0 && (
                            <span style={{ fontSize: 9, color: '#fdab3d', marginLeft: 4 }}>⚡ primary</span>
                          )}
                        </td>
                        <td>
                          <span style={{
                            fontSize: 10, padding: '1px 5px', borderRadius: 3,
                            background: 'rgba(129,140,248,0.10)', color: 'var(--accent)',
                          }}>
                            {kw.tag}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {kw.volume?.toLocaleString() ?? '—'}
                        </td>
                        <td style={{
                          fontSize: 11, fontWeight: 600,
                          color: (kw.kd || 0) > 70 ? '#e2445c' : (kw.kd || 0) > 40 ? '#fdab3d' : '#00c875',
                        }}>
                          {kw.kd ?? '—'}
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {kw.cpc != null ? `$${kw.cpc.toFixed(2)}` : '—'}
                        </td>
                        <td style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                          {kw.usage.usedAsPrimaryCount + kw.usage.usedAsSecondaryCount > 0
                            ? `${kw.usage.usedAsPrimaryCount}p/${kw.usage.usedAsSecondaryCount}s`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                    {workspace.keywordList.length > 20 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: 8 }}>
                          +{workspace.keywordList.length - 20} more keywords
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
              No keywords uploaded yet. Upload a .xlsx or .csv file with columns: keyword, tag, volume, kd, cpc
            </div>
          )}
        </div>
      </div>

      {/* Second row: Sitemap + Platforms */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Sitemap Card */}
        <div className="seo-card">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
            🗺️ Sitemap
          </h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              className="seo-input"
              value={sitemapInput}
              onChange={(e) => setSitemapInput(e.target.value)}
              placeholder="https://example.com/sitemap.xml"
              style={{ flex: 1, fontSize: 12 }}
            />
            <button className="seo-btn seo-btn-secondary seo-btn-sm" onClick={handleSitemapSave} disabled={!sitemapInput.trim()}>
              Save
            </button>
          </div>
          {workspace.sitemapLastCheckedAt && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Last checked: {new Date(workspace.sitemapLastCheckedAt).toLocaleDateString()}
              {workspace.sitemapPages.length > 0 && ` · ${workspace.sitemapPages.length} pages found`}
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
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: p.enabled ? 600 : 400,
                  border: `1px solid ${p.enabled ? 'var(--accent)' : 'var(--border)'}`,
                  background: p.enabled ? 'rgba(129,140,248,0.12)' : 'transparent',
                  color: p.enabled ? 'var(--accent)' : 'var(--text-muted)',
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
                          fontSize: 9, padding: '1px 5px', borderRadius: 3,
                          background: 'rgba(129,140,248,0.08)', color: 'var(--accent)',
                          textTransform: 'capitalize',
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
                            fontSize: 10, padding: '1px 6px', borderRadius: 3,
                            background: t.funnelStage === 'bottom' ? 'rgba(0,200,117,0.12)' : t.funnelStage === 'middle' ? 'rgba(129,140,248,0.12)' : 'rgba(253,171,61,0.12)',
                            color: t.funnelStage === 'bottom' ? '#00c875' : t.funnelStage === 'middle' ? 'var(--accent)' : '#fdab3d',
                          }}>
                            {t.funnelStage}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'rgba(129,140,248,0.08)', color: 'var(--text-muted)' }}>
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

        {/* Inline Create Content Panel */}
        {showCreatePanel && (
          <div className="seo-card" style={{ marginBottom: 16, border: '1px solid var(--accent)', background: 'rgba(129,140,248,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                ✨ Create New Content
              </h4>
              <button className="seo-btn seo-btn-ghost seo-btn-sm" onClick={() => setShowCreatePanel(false)}>
                <X size={12} /> Cancel
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="seo-label" style={{ fontSize: 11 }}>Content Name</label>
              <input
                className="seo-input"
                value={contentName}
                onChange={(e) => setContentName(e.target.value)}
                placeholder="e.g. Best Massage Chairs 2025 — Comparison Guide"
                autoFocus
                style={{ fontSize: 13 }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmCreate(); }}
              />
            </div>

            {/* Persona Selection — only if workspace has personas */}
            {workspace.personas.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label className="seo-label" style={{ fontSize: 11 }}>
                  Target Persona *
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
                    Select who this content is for
                  </span>
                </label>
                <div style={{ maxHeight: 240, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  {workspace.personas.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPersonaId(p.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', borderRadius: 6, fontSize: 12, textAlign: 'left',
                        border: selectedPersonaId === p.id ? '1.5px solid var(--accent)' : '1px solid var(--border-subtle)',
                        background: selectedPersonaId === p.id ? 'rgba(129,140,248,0.08)' : 'transparent',
                        color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.12s',
                        width: '100%',
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 8, flexShrink: 0,
                        border: selectedPersonaId === p.id ? '5px solid var(--accent)' : '2px solid var(--border)',
                        background: selectedPersonaId === p.id ? '#fff' : 'transparent',
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>{p.shortDescription}</div>
                      </div>
                      <span style={{
                        fontSize: 9, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                        background: p.claimRiskLevel === 'high' ? 'rgba(239,68,68,0.12)' : p.claimRiskLevel === 'medium' ? 'rgba(253,171,61,0.12)' : 'rgba(0,200,117,0.08)',
                        color: p.claimRiskLevel === 'high' ? '#f87171' : p.claimRiskLevel === 'medium' ? '#fdab3d' : '#00c875',
                      }}>
                        {p.claimRiskLevel}
                      </span>
                    </button>
                  ))}
                </div>
                {!selectedPersonaId && (
                  <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>
                    Please select a target persona to continue.
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="seo-btn seo-btn-secondary" onClick={() => setShowCreatePanel(false)}>
                Cancel
              </button>
              <button
                className="seo-btn seo-btn-primary"
                onClick={handleConfirmCreate}
                disabled={!contentName.trim() || (workspace.personas.length > 0 && !selectedPersonaId)}
              >
                Create Content →
              </button>
            </div>
          </div>
        )}

        {wsProjects.length > 0 ? (
          <div className="seo-projects-grid">
            {wsProjects.map((project) => (
              <ProjectCard key={project.id} project={project} workspaceId={workspace.id} />
            ))}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
