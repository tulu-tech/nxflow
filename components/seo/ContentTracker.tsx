'use client';

import { useState, useMemo } from 'react';
import type { WorkspaceContent, ContentStatus, ContentPlatformFormat } from '@/lib/seo/workspaceTypes';
import { CONTENT_FORMAT_LABELS } from '@/lib/seo/workspaceTypes';
import { useWorkspaceStore } from '@/store/seoWorkspaceStore';
import { FileText, Filter, Eye, Pencil, Calendar, CheckCircle, Archive, Copy, Link, Image, Tag, X } from 'lucide-react';

interface Props {
  workspaceId: string;
  content: WorkspaceContent[];
}

const STATUS_COLORS: Record<ContentStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: 'rgba(129,140,248,0.1)', text: '#818cf8', label: 'Draft' },
  scheduled: { bg: 'rgba(253,171,61,0.1)', text: '#fdab3d', label: 'Scheduled' },
  published: { bg: 'rgba(0,200,117,0.1)', text: '#00c875', label: 'Published' },
  archived: { bg: 'rgba(128,128,128,0.1)', text: '#888', label: 'Archived' },
};

export function ContentTracker({ workspaceId, content }: Props) {
  const { updateContentStatus, deleteGeneratedContent, addGeneratedContent } = useWorkspaceStore();
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [personaFilter, setPersonaFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const items = content ?? [];

  // Unique values for filters
  const personas = useMemo(() => [...new Set(items.map(c => c.selectedPersona).filter(Boolean))], [items]);
  const platforms = useMemo(() => [...new Set(items.map(c => c.selectedPlatformFormat).filter(Boolean))], [items]);
  const tags = useMemo(() => [...new Set(items.map(c => c.primaryKeywordTag).filter(Boolean))], [items]);

  // Filter
  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter !== 'all') list = list.filter(c => c.contentStatus === statusFilter);
    if (platformFilter !== 'all') list = list.filter(c => c.selectedPlatformFormat === platformFilter);
    if (personaFilter !== 'all') list = list.filter(c => c.selectedPersona === personaFilter);
    if (tagFilter !== 'all') list = list.filter(c => c.primaryKeywordTag === tagFilter);
    return list;
  }, [items, statusFilter, platformFilter, personaFilter, tagFilter]);

  // Counts
  const counts = useMemo(() => ({
    draft: items.filter(c => c.contentStatus === 'draft').length,
    scheduled: items.filter(c => c.contentStatus === 'scheduled').length,
    published: items.filter(c => c.contentStatus === 'published').length,
    archived: items.filter(c => c.contentStatus === 'archived').length,
  }), [items]);

  const handleDuplicate = (item: WorkspaceContent) => {
    const dup: WorkspaceContent = {
      ...item,
      contentId: Math.random().toString(36).substring(2, 10),
      contentTitle: `${item.contentTitle} (Copy)`,
      contentStatus: 'draft',
      scheduledDate: null,
      publishedDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addGeneratedContent(workspaceId, dup);
  };

  if (items.length === 0) return null;

  const clearFilters = () => { setStatusFilter('all'); setPlatformFilter('all'); setPersonaFilter('all'); setTagFilter('all'); };
  const hasActiveFilters = statusFilter !== 'all' || platformFilter !== 'all' || personaFilter !== 'all' || tagFilter !== 'all';

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          📊 Content Tracker
        </h3>
        <button className="seo-btn seo-btn-ghost seo-btn-sm" onClick={() => setShowFilters(!showFilters)} style={{ gap: 4 }}>
          <Filter size={12} /> Filters {hasActiveFilters && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 8, padding: '0 5px', fontSize: 9 }}>●</span>}
        </button>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {([['all', 'All', items.length], ['draft', 'Draft', counts.draft], ['scheduled', 'Scheduled', counts.scheduled], ['published', 'Published', counts.published], ['archived', 'Archived', counts.archived]] as const).map(([key, label, count]) => (
          <button key={key} onClick={() => setStatusFilter(key as ContentStatus | 'all')}
            style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: statusFilter === key ? '1.5px solid var(--accent)' : '1px solid var(--border-subtle)',
              background: statusFilter === key ? 'rgba(129,140,248,0.08)' : 'transparent',
              color: statusFilter === key ? 'var(--accent)' : 'var(--text-muted)',
            }}>
            {label} <span style={{ opacity: 0.6 }}>({count})</span>
          </button>
        ))}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="seo-card" style={{ marginBottom: 12, padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <div>
            <label className="seo-label" style={{ fontSize: 10 }}>Platform</label>
            <select className="seo-input" style={{ fontSize: 11, padding: '4px 6px' }} value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}>
              <option value="all">All platforms</option>
              {platforms.map(p => <option key={p} value={p}>{CONTENT_FORMAT_LABELS[p as ContentPlatformFormat] ?? p}</option>)}
            </select>
          </div>
          <div>
            <label className="seo-label" style={{ fontSize: 10 }}>Persona</label>
            <select className="seo-input" style={{ fontSize: 11, padding: '4px 6px' }} value={personaFilter} onChange={e => setPersonaFilter(e.target.value)}>
              <option value="all">All personas</option>
              {personas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="seo-label" style={{ fontSize: 10 }}>Keyword Tag</label>
            <select className="seo-input" style={{ fontSize: 11, padding: '4px 6px' }} value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
              <option value="all">All tags</option>
              {tags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'right' }}>
              <button className="seo-btn seo-btn-ghost seo-btn-sm" onClick={clearFilters} style={{ fontSize: 10 }}><X size={10} /> Clear filters</button>
            </div>
          )}
        </div>
      )}

      {/* Content list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.length === 0 ? (
          <div className="seo-card" style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
            No content matches the current filters.
          </div>
        ) : filtered.map(item => {
          const sc = STATUS_COLORS[item.contentStatus];
          const isExpanded = expandedId === item.contentId;
          return (
            <div key={item.contentId} className="seo-card" style={{ padding: '10px 14px', cursor: 'pointer', transition: 'all 0.15s' }} onClick={() => setExpandedId(isExpanded ? null : item.contentId)}>
              {/* Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.contentTitle || 'Untitled'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: sc.bg, color: sc.text, fontWeight: 600 }}>{sc.label}</span>
                    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'rgba(129,140,248,0.06)', color: 'var(--text-muted)' }}>
                      {CONTENT_FORMAT_LABELS[item.selectedPlatformFormat] ?? item.selectedPlatformFormat}
                    </span>
                    {item.selectedPersona && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>👤 {item.selectedPersona}</span>}
                    {item.primaryKeywordTag && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'rgba(253,171,61,0.08)', color: '#fdab3d' }}>{item.primaryKeywordTag}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, fontSize: 10, color: 'var(--text-muted)' }}>
                  {item.primaryKeyword && <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--text-primary)' }}>{item.primaryKeyword}</div>}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
                    {item.primaryKeywordVolume != null && <span>Vol: {item.primaryKeywordVolume.toLocaleString()}</span>}
                    {item.primaryKeywordKD != null && <span>KD: {item.primaryKeywordKD}</span>}
                    {item.primaryKeywordCPC != null && <span>CPC: ${item.primaryKeywordCPC.toFixed(2)}</span>}
                  </div>
                  <div style={{ marginTop: 2 }}>{new Date(item.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, marginBottom: 10 }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Topic:</span> {item.selectedTopicName}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Persona:</span> {item.selectedPersona}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Slug:</span> /{item.contentSlug}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Platform:</span> {item.platform || item.selectedPlatformFormat}</div>
                    {item.scheduledDate && <div><span style={{ color: 'var(--text-muted)' }}>Scheduled:</span> {new Date(item.scheduledDate).toLocaleDateString()}</div>}
                    {item.publishedDate && <div><span style={{ color: 'var(--text-muted)' }}>Published:</span> {new Date(item.publishedDate).toLocaleDateString()}</div>}
                    <div><span style={{ color: 'var(--text-muted)' }}>Internal Links:</span> {item.internalLinkPlan?.length ?? 0}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>External Links:</span> {item.externalLinkPlan?.length ?? 0}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Images:</span> {item.generatedImages?.length ?? 0}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Secondary KWs:</span> {item.secondaryKeywords?.length ?? 0}</div>
                  </div>

                  {item.contentPreview && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, padding: '6px 8px', background: 'rgba(129,140,248,0.03)', borderRadius: 4, lineHeight: 1.5 }}>
                      {item.contentPreview.slice(0, 200)}{item.contentPreview.length > 200 ? '...' : ''}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {item.contentStatus === 'draft' && (
                      <button className="seo-btn seo-btn-ghost seo-btn-sm" style={{ fontSize: 10 }} onClick={() => updateContentStatus(workspaceId, item.contentId, 'scheduled')}>
                        <Calendar size={10} /> Schedule
                      </button>
                    )}
                    {(item.contentStatus === 'draft' || item.contentStatus === 'scheduled') && (
                      <button className="seo-btn seo-btn-ghost seo-btn-sm" style={{ fontSize: 10 }} onClick={() => updateContentStatus(workspaceId, item.contentId, 'published')}>
                        <CheckCircle size={10} /> Publish
                      </button>
                    )}
                    {item.contentStatus !== 'archived' && (
                      <button className="seo-btn seo-btn-ghost seo-btn-sm" style={{ fontSize: 10 }} onClick={() => updateContentStatus(workspaceId, item.contentId, 'archived')}>
                        <Archive size={10} /> Archive
                      </button>
                    )}
                    {item.contentStatus === 'archived' && (
                      <button className="seo-btn seo-btn-ghost seo-btn-sm" style={{ fontSize: 10 }} onClick={() => updateContentStatus(workspaceId, item.contentId, 'draft')}>
                        <Pencil size={10} /> Unarchive
                      </button>
                    )}
                    <button className="seo-btn seo-btn-ghost seo-btn-sm" style={{ fontSize: 10 }} onClick={() => handleDuplicate(item)}>
                      <Copy size={10} /> Duplicate
                    </button>
                    <button className="seo-btn seo-btn-ghost seo-btn-sm" style={{ fontSize: 10, color: '#f87171' }} onClick={() => { if (confirm('Delete this content item?')) deleteGeneratedContent(workspaceId, item.contentId); }}>
                      <X size={10} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
