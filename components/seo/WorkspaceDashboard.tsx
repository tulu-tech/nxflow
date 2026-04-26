'use client';

import type { SEOWorkspace } from '@/lib/seo/workspaceTypes';
import { PLATFORM_LABELS, PLATFORM_ICONS, PlatformType } from '@/lib/seo/workspaceTypes';
import { KeywordEntry } from '@/lib/seo/types';
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

function parseKeywordFile(buffer: ArrayBuffer): KeywordEntry[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  if (raw.length === 0) return [];

  const headers = Object.keys(raw[0]);
  const colMap: Record<string, string> = {};
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (norm.includes('keyword') && !norm.includes('diff')) colMap.keyword = h;
    else if (norm.includes('volume') || norm === 'searchvolume' || norm === 'sv') colMap.volume = h;
    else if (norm.includes('difficulty') || norm === 'kd' || norm === 'keyworddiff') colMap.kd = h;
    else if (norm.includes('cpc') || norm.includes('cost')) colMap.cpc = h;
    else if (norm.includes('intent') || norm === 'searchintent') colMap.intent = h;
  }
  if (!colMap.keyword) colMap.keyword = headers[0];

  return raw
    .filter((row) => row[colMap.keyword])
    .map((row, idx) => {
      const kw = String(row[colMap.keyword]).trim();
      const volume = colMap.volume ? Number(row[colMap.volume]) || 0 : undefined;
      const kd = colMap.kd ? Number(row[colMap.kd]) || 0 : undefined;
      const cpc = colMap.cpc ? Number(row[colMap.cpc]) || 0 : undefined;
      const intentRaw = colMap.intent ? String(row[colMap.intent] || '') : '';
      const v = intentRaw.toLowerCase().trim();
      const intent =
        v.startsWith('info') || v === 'i' ? 'informational' as const :
        v.startsWith('nav') || v === 'n' ? 'navigational' as const :
        v.startsWith('comm') || v === 'c' ? 'commercial' as const :
        v.startsWith('trans') || v === 't' ? 'transactional' as const :
        'informational' as const;

      return {
        id: `kw-${idx}`,
        keyword: kw,
        searchIntent: intent,
        funnelStage: intent === 'transactional' ? 'bottom' as const : intent === 'commercial' || intent === 'navigational' ? 'middle' as const : 'top' as const,
        businessRelevance: 7,
        conversionValue: intent === 'transactional' ? 9 : intent === 'commercial' ? 7 : 5,
        contentOpportunity: '',
        category: idx === 0 ? 'primary' as const : idx < 5 ? 'secondary' as const : 'supporting' as const,
        searchVolume: volume,
        keywordDifficulty: kd,
        cpc: cpc,
        validationStatus: 'approved' as const,
      };
    });
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
      const parsed = parseKeywordFile(buffer);
      if (parsed.length === 0) {
        setKwError('No keywords found in file.');
      } else {
        updateKeywordList(workspace.id, parsed);
      }
    } catch {
      setKwError('Failed to parse file.');
    }
    setKwUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Create content project
  const handleCreateContent = () => {
    const name = prompt('Content project name:', `${workspace.brandName} — New Article`);
    if (!name?.trim()) return;
    const pid = createProject(name.trim(), workspace);
    addProjectToWorkspace(workspace.id, pid);
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
        <button className="seo-btn seo-btn-primary" onClick={handleCreateContent}>
          <Plus size={14} /> Create Content
        </button>
      </div>

      {/* Overview stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
        {[
          { icon: <Tag size={16} />, label: 'Keywords', value: workspace.keywordList.length, color: workspace.keywordList.length > 0 ? '#00c875' : 'var(--text-muted)', sub: workspace.keywordListUploadedAt ? `v${workspace.keywordListVersion}` : 'Not uploaded' },
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
          { icon: <Users size={16} />, label: 'Personas', value: workspace.personas.length, color: workspace.personas.length > 0 ? '#e78bfa' : 'var(--text-muted)', sub: workspace.personas.length > 0 ? `${workspace.personas.filter(p => p.buyingStage === 'decision').length} decision-stage` : 'Not configured' },
          { icon: <BookOpen size={16} />, label: 'Topics', value: workspace.contentTopics.length, color: workspace.contentTopics.length > 0 ? '#fdab3d' : 'var(--text-muted)', sub: workspace.contentTopics.length > 0 ? `${workspace.contentTopics.filter(t => t.priority === 'high').length} high priority` : 'Not configured' },
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
            <div style={{ maxHeight: 220, overflow: 'auto', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <table className="seo-table">
                <thead>
                  <tr>
                    <th>Keyword</th>
                    <th style={{ width: 70 }}>Vol</th>
                    <th style={{ width: 50 }}>KD</th>
                    <th style={{ width: 80 }}>Intent</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.keywordList.slice(0, 15).map((kw) => (
                    <tr key={kw.id}>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 12 }}>{kw.keyword}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{kw.searchVolume?.toLocaleString() ?? '—'}</td>
                      <td style={{ fontSize: 11, fontWeight: 600, color: (kw.keywordDifficulty || 0) > 70 ? '#e2445c' : (kw.keywordDifficulty || 0) > 40 ? '#fdab3d' : '#00c875' }}>
                        {kw.keywordDifficulty ?? '—'}
                      </td>
                      <td>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'rgba(129,140,248,0.12)', color: 'var(--accent)', textTransform: 'capitalize' }}>
                          {kw.searchIntent}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {workspace.keywordList.length > 15 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', padding: 8 }}>
                        +{workspace.keywordList.length - 15} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
              No keywords uploaded yet. Upload a .xlsx or .csv file.
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
                      background: p.buyingStage === 'decision' ? 'rgba(0,200,117,0.12)' : p.buyingStage === 'consideration' ? 'rgba(129,140,248,0.12)' : 'rgba(253,171,61,0.12)',
                      color: p.buyingStage === 'decision' ? '#00c875' : p.buyingStage === 'consideration' ? 'var(--accent)' : '#fdab3d',
                      textTransform: 'capitalize',
                    }}>
                      {p.buyingStage}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.4 }}>
                    {p.description.length > 100 ? p.description.slice(0, 100) + '…' : p.description}
                  </div>
                </div>
              ))}
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
          {workspace.contentTopics.length > 0 ? (
            <div style={{ maxHeight: 360, overflow: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {workspace.contentTopics.map((t) => (
                  <div key={t.id} style={{
                    padding: '8px 10px', borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    fontSize: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{t.topic}</span>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <span style={{
                          fontSize: 10, padding: '1px 6px', borderRadius: 3,
                          background: t.priority === 'high' ? 'rgba(239,68,68,0.12)' : t.priority === 'medium' ? 'rgba(253,171,61,0.12)' : 'rgba(129,140,248,0.06)',
                          color: t.priority === 'high' ? '#f87171' : t.priority === 'medium' ? '#fdab3d' : 'var(--text-muted)',
                        }}>
                          {t.priority}
                        </span>
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
                        {t.category}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
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
          <button className="seo-btn seo-btn-primary seo-btn-sm" onClick={handleCreateContent}>
            <Plus size={12} /> New Content
          </button>
        </div>

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
            <button className="seo-btn seo-btn-primary" onClick={handleCreateContent}>
              <Plus size={14} /> Create Content
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
