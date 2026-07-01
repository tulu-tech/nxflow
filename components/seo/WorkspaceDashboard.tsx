'use client';

import type { SEOWorkspace } from '@/lib/seo/workspaceTypes';
import { PLATFORM_LABELS, PLATFORM_ICONS, PlatformType } from '@/lib/seo/workspaceTypes';
import { useWorkspaceStore } from '@/store/seoWorkspaceStore';
import { useSEOStore } from '@/store/seoStore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Globe, Tag, FileText, Plus, Settings, Map,
  Pencil, Check, X, Trash2, ExternalLink, Users, BookOpen,
  ChevronDown, ChevronRight, ArrowLeft, Sparkles,
} from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { ContentTracker } from './ContentTracker';
import { KeywordManager } from './KeywordManager';
import { BusinessType } from '@/lib/seo/types';

interface Props {
  workspace: SEOWorkspace;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WorkspaceDashboard({ workspace }: Props) {
  const router = useRouter();
  const { updateWorkspace, updateSitemap, setSitemapStatus, togglePlatform } = useWorkspaceStore();
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

  // Color helpers
  const colors = [
    { bg: 'linear-gradient(135deg, #6366f1, #818cf8)', glow: 'rgba(99,102,241,0.25)' },
    { bg: 'linear-gradient(135deg, #059669, #10b981)', glow: 'rgba(16,185,129,0.25)' },
    { bg: 'linear-gradient(135deg, #e11d48, #f43f5e)', glow: 'rgba(225,29,72,0.25)' },
    { bg: 'linear-gradient(135deg, #0891b2, #06b6d4)', glow: 'rgba(8,145,178,0.25)' },
    { bg: 'linear-gradient(135deg, #d97706, #f59e0b)', glow: 'rgba(245,158,11,0.25)' },
    { bg: 'linear-gradient(135deg, #7c3aed, #a78bfa)', glow: 'rgba(124,58,237,0.25)' },
  ];
  const colorIdx = workspace.brandName.charCodeAt(0) % colors.length;
  const color = colors[colorIdx];

  return (
    <div className="ws-dashboard">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="ws-header">
        <div className="ws-header-left">
          <button className="ws-back-btn" onClick={() => router.push('/seoagent')}>
            <ArrowLeft size={16} />
          </button>
          <div className="ws-header-avatar" style={{ background: color.bg, boxShadow: `0 6px 18px ${color.glow}` }}>
            {workspace.brandName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="ws-header-title">{workspace.brandName}</h1>
            {workspace.websiteUrl && (
              <div className="ws-header-url">
                <Globe size={11} />
                {workspace.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </div>
            )}
          </div>
        </div>
        <button className="seo-btn seo-btn-primary" onClick={handleStartCreate}>
          <Sparkles size={14} /> Create Content
        </button>
      </div>

      {/* ── Stats Grid ──────────────────────────────────────────────── */}
      <div className="ws-stats-grid">
        {[
          { icon: <Tag size={16} />, label: 'Keywords', value: workspace.keywordList.length, color: workspace.keywordList.length > 0 ? '#34d399' : 'var(--text-muted)', sub: workspace.keywordList.length > 0 ? `${new Set(workspace.keywordList.map(k => k.tag)).size} tags · ${workspace.keywordList.filter(k => k.usage.usedAsPrimaryCount > 0).length} used` : 'Not uploaded' },
          { icon: <FileText size={16} />, label: 'Content', value: (workspace.generatedContent ?? []).length, color: (workspace.generatedContent ?? []).length > 0 ? '#818cf8' : 'var(--text-muted)', sub: `${(workspace.generatedContent ?? []).filter(c => c.contentStatus === 'published').length} published · ${(workspace.generatedContent ?? []).filter(c => c.contentStatus === 'draft').length} draft` },
          { icon: <Map size={16} />, label: 'Sitemap', value: workspace.sitemapUrl ? '✓' : '—', color: workspace.sitemapUrl ? '#34d399' : 'var(--text-muted)', sub: workspace.discoveredPages?.length > 0 ? workspace.discoveredPages.length + ' pages' : workspace.sitemapUrl ? 'Not fetched' : 'Not set' },
          { icon: <Users size={16} />, label: 'Personas', value: workspace.personas.length, color: workspace.personas.length > 0 ? '#c084fc' : 'var(--text-muted)', sub: workspace.personas.length > 0 ? `${workspace.personas.filter(p => p.intentStages.includes('decision')).length} decision-stage` : 'Not configured' },
          { icon: <BookOpen size={16} />, label: 'Topics', value: workspace.contentTopics.length, color: workspace.contentTopics.length > 0 ? '#fbbf24' : 'var(--text-muted)', sub: workspace.contentTopics.length > 0 ? `${new Set(workspace.contentTopics.map(t => t.topicCluster ?? t.category)).size} clusters` : 'Not configured' },
          { icon: <Settings size={16} />, label: 'Platforms', value: workspace.platforms.filter(p => p.enabled).length, color: workspace.platforms.some(p => p.enabled) ? '#34d399' : 'var(--text-muted)', sub: 'enabled' },
        ].map((stat, i) => (
          <div key={i} className="ws-stat-card">
            <div className="ws-stat-icon" style={{ color: stat.color }}>{stat.icon}</div>
            <div className="ws-stat-value" style={{ color: stat.color }}>{stat.value}</div>
            <div className="ws-stat-label">{stat.label}</div>
            <div className="ws-stat-sub">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Two-Column Layout ───────────────────────────────────────── */}
      <div className="ws-two-col">

        {/* Brand Info Card */}
        <div className="ws-panel">
          <div className="ws-panel-header">
            <h3 className="ws-panel-title"><span className="ws-panel-icon">🏢</span> Brand Info</h3>
            <button className="seo-btn seo-btn-ghost seo-btn-sm" onClick={() => setEditingBrand(!editingBrand)}>
              {editingBrand ? <X size={12} /> : <Pencil size={12} />}
              {editingBrand ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editingBrand ? (
            <div className="ws-brand-edit-form">
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
                <div key={field} className="ws-brand-edit-field">
                  <label className="seo-label" style={{ fontSize: 11 }}>{label}</label>
                  <input
                    className="seo-input"
                    value={String(brandDraft[field] ?? '')}
                    onChange={(e) => setBrandDraft({ ...brandDraft, [field]: e.target.value })}
                    style={{ fontSize: 12, padding: '6px 10px' }}
                  />
                </div>
              ))}
              <div className="ws-brand-edit-field">
                <label className="seo-label" style={{ fontSize: 11 }}>Business Type</label>
                <div className="seo-radio-group">
                  {(['B2B', 'B2C', 'B2G', 'Both'] as BusinessType[]).map((t) => (
                    <button
                      key={t}
                      className={`seo-radio-option ${brandDraft.businessType === t ? 'selected' : ''}`}
                      onClick={() => setBrandDraft({ ...brandDraft, businessType: t })}
                      type="button"
                      style={{ fontSize: 11, padding: '4px 10px' }}
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
            <div className="ws-brand-info-list">
              {([
                ['Industry', workspace.industry],
                ['Business Type', workspace.businessType],
                ['Target Market', workspace.targetMarket],
                ['Tone', workspace.toneOfVoice],
                ['Core Offer', workspace.coreOffer],
                ['CTA', workspace.primaryCTA],
                ['Differentiators', workspace.brandDifferentiators],
              ] as [string, string][]).filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="ws-brand-info-row">
                  <span className="ws-brand-info-label">{label}</span>
                  <span className="ws-brand-info-value">{value}</span>
                </div>
              ))}
              {workspace.targetCountries.length > 0 && (
                <div className="ws-brand-info-row">
                  <span className="ws-brand-info-label">Countries</span>
                  <span className="ws-brand-info-value">{workspace.targetCountries.join(', ')}</span>
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

      {/* ── Second Row: Sitemap + Platforms ──────────────────────────── */}
      <div className="ws-two-col">
        {/* Sitemap Card */}
        <div className="ws-panel">
          <div className="ws-panel-header">
            <h3 className="ws-panel-title">
              <span className="ws-panel-icon">🗺️</span> Sitemap
              {workspace.sitemapStatus === 'fetching' && <span className="ws-status-badge ws-status-fetching">Fetching...</span>}
              {workspace.sitemapStatus === 'success' && <span className="ws-status-badge ws-status-success">✓ Active</span>}
              {workspace.sitemapStatus === 'error' && <span className="ws-status-badge ws-status-error">✗ Error</span>}
            </h3>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
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

          {workspace.sitemapError && (
            <div className="ws-error-msg">{workspace.sitemapError}</div>
          )}

          {workspace.sitemapLastCheckedAt && (
            <div className="ws-sitemap-meta">
              <span>Last checked: {new Date(workspace.sitemapLastCheckedAt).toLocaleDateString()}</span>
              <span>·</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{workspace.discoveredPages?.length ?? 0} pages</span>
              {workspace.discoveredPages?.length > 0 && (() => {
                const types: Record<string, number> = {};
                workspace.discoveredPages.forEach((p) => { types[p.pageType] = (types[p.pageType] || 0) + 1; });
                return Object.entries(types).map(([t, c]) => (
                  <span key={t} className="ws-sitemap-type-badge">{t}: {c}</span>
                ));
              })()}
            </div>
          )}

          {workspace.discoveredPages?.length > 0 && (
            <div>
              <button
                className="seo-btn seo-btn-ghost seo-btn-sm"
                onClick={() => setShowSitemapPages(!showSitemapPages)}
                style={{ fontSize: 11, marginBottom: showSitemapPages ? 8 : 0, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {showSitemapPages ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {showSitemapPages ? 'Hide' : 'View'} Discovered Pages ({workspace.discoveredPages.length})
              </button>
              {showSitemapPages && (
                <div className="ws-sitemap-pages-list">
                  {workspace.discoveredPages.map((p) => (
                    <div key={p.pageId} className="ws-sitemap-page-row">
                      <span className={`ws-sitemap-page-type ws-sitemap-page-type--${p.pageType}`}>
                        {p.pageType}
                      </span>
                      <span className="ws-sitemap-page-path">{p.path}</span>
                      {p.detectedBrand && (
                        <span className="ws-sitemap-page-brand">{p.detectedBrand}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Platforms Card */}
        <div className="ws-panel">
          <div className="ws-panel-header">
            <h3 className="ws-panel-title"><span className="ws-panel-icon">📡</span> Platforms</h3>
          </div>
          <div className="ws-platforms-grid">
            {workspace.platforms.map((p) => (
              <button
                key={p.platform}
                onClick={() => togglePlatform(workspace.id, p.platform, !p.enabled)}
                className={`ws-platform-btn ${p.enabled ? 'ws-platform-btn--active' : ''}`}
              >
                {PLATFORM_ICONS[p.platform]} {PLATFORM_LABELS[p.platform]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Persona & Content Topics ────────────────────────────────── */}
      <div className="ws-two-col">
        {/* Persona Library */}
        <div className="ws-panel">
          <div className="ws-panel-header">
            <h3 className="ws-panel-title">
              <span className="ws-panel-icon">👥</span> Persona Library
              {workspace.personas.length > 0 && (
                <span className="ws-count-badge">{workspace.personas.length}</span>
              )}
            </h3>
          </div>
          {workspace.personas.length > 0 ? (
            <div style={{ maxHeight: 420, overflow: 'auto' }}>
              <div className="ws-items-list">
                {workspace.personas.map((p) => (
                  <div key={p.id} className="ws-item-card">
                    <div className="ws-item-card-header">
                      <span className="ws-item-card-name">{p.name}</span>
                      <span className={`ws-risk-badge ws-risk-badge--${p.claimRiskLevel}`}>
                        {p.claimRiskLevel === 'high' ? '⚠️ high risk' : p.claimRiskLevel === 'medium' ? '⚡ med risk' : '✓ low risk'}
                      </span>
                    </div>
                    <div className="ws-item-card-desc">{p.shortDescription}</div>
                    <div className="ws-item-card-tags">
                      {p.intentStages.map((s) => (
                        <span key={s} className="ws-intent-tag">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="ws-panel-empty">No personas configured yet.</div>
          )}
        </div>

        {/* Content Topic Library */}
        <div className="ws-panel">
          <div className="ws-panel-header">
            <h3 className="ws-panel-title">
              <span className="ws-panel-icon">📚</span> Content Topics
              {workspace.contentTopics.length > 0 && (
                <span className="ws-count-badge">{workspace.contentTopics.length}</span>
              )}
            </h3>
          </div>
          {workspace.contentTopics.length > 0 ? (() => {
            const clusters: Record<string, typeof workspace.contentTopics> = {};
            workspace.contentTopics.forEach((t) => {
              const cluster = t.topicCluster ?? t.category ?? 'Other';
              if (!clusters[cluster]) clusters[cluster] = [];
              clusters[cluster].push(t);
            });
            return (
              <div style={{ maxHeight: 420, overflow: 'auto' }}>
                <div className="ws-cluster-pills">
                  {Object.entries(clusters).map(([cluster, topics]) => (
                    <span key={cluster} className="ws-cluster-pill">{cluster} ({topics.length})</span>
                  ))}
                </div>
                <div className="ws-items-list">
                  {workspace.contentTopics.map((t) => (
                    <div key={t.topicId ?? t.id} className="ws-item-card">
                      <div className="ws-item-card-header">
                        <span className="ws-item-card-name" style={{ flex: 1 }}>{t.topicName ?? t.topic}</span>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          {t.claimRiskLevel && (
                            <span className={`ws-risk-badge ws-risk-badge--${t.claimRiskLevel}`}>
                              {t.claimRiskLevel === 'high' ? '⚠️' : t.claimRiskLevel === 'medium' ? '⚡' : '✓'} {t.claimRiskLevel}
                            </span>
                          )}
                          <span className={`ws-funnel-badge ws-funnel-badge--${t.funnelStage}`}>{t.funnelStage}</span>
                        </div>
                      </div>
                      <div className="ws-item-card-tags">
                        <span className="ws-cluster-pill">{t.topicCluster ?? t.category}</span>
                        {t.brandOrProductSignal && (
                          <span className="ws-signal-pill">{t.brandOrProductSignal}</span>
                        )}
                        {t.defaultSearchIntent && (
                          <span className="ws-item-card-desc" style={{ fontSize: 9, margin: 0 }}>{t.defaultSearchIntent}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })() : (
            <div className="ws-panel-empty">No content topics configured yet.</div>
          )}
        </div>
      </div>

      {/* ── Content Tracker ─────────────────────────────────────────── */}
      <ContentTracker workspaceId={workspace.id} workspaceName={workspace.brandName} content={workspace.generatedContent ?? []} />

      {/* ── Content Projects ────────────────────────────────────────── */}
      <div className="ws-section">
        <div className="ws-section-header">
          <h3 className="ws-section-title"><span className="ws-panel-icon">📝</span> Content Projects</h3>
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
                <div className="ws-project-group">
                  <div className="ws-project-group-header">
                    <span className="ws-project-group-icon">📅</span>
                    <h4 className="ws-project-group-title" style={{ color: '#818cf8' }}>Scheduled ({scheduled.length})</h4>
                  </div>
                  <div className="seo-projects-grid">
                    {scheduled.map((project) => (
                      <div key={project.id} style={{ position: 'relative' }}>
                        <div className="ws-project-overlay-badges">
                          <span className="ws-project-schedule-badge">
                            📅 {project.scheduledDate ? new Date(project.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePublish(project.id); }}
                            className="ws-project-publish-btn"
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
                <div className="ws-project-group">
                  <div className="ws-project-group-header">
                    <span className="ws-project-group-icon">✅</span>
                    <h4 className="ws-project-group-title" style={{ color: '#34d399' }}>Published ({published.length})</h4>
                  </div>
                  <div className="seo-projects-grid">
                    {published.map((project) => (
                      <div key={project.id} style={{ position: 'relative' }}>
                        <div className="ws-project-published-badge">
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
                <div className="ws-project-group">
                  <div className="ws-project-group-header">
                    <span className="ws-project-group-icon">📝</span>
                    <h4 className="ws-project-group-title">Drafts ({drafts.length})</h4>
                  </div>
                  <div className="seo-projects-grid">
                    {drafts.map((project) => (
                      <ProjectCard key={project.id} project={project} workspaceId={workspace.id} />
                    ))}
                  </div>
                </div>
              ) : wsProjects.length === 0 ? (
                <div className="ws-panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.6 }}>📄</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    No content yet
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
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
