'use client';

import { LinkPlan, LinkSuggestion, GeneratedArticle, BrandIntake } from '@/lib/seo/types';
import { useState } from 'react';
import { Sparkles, Link2, CheckCircle2, AlertTriangle, ArrowRight, Plus, Trash2, Pencil, Check, X } from 'lucide-react';

interface Props {
  linkPlan: LinkPlan | null;
  article: GeneratedArticle | null;
  brandIntake: BrandIntake;
  onSetPlan: (plan: LinkPlan) => void;
  onSetArticle?: (article: GeneratedArticle) => void;
  onContinue: () => void;
  onBack: () => void;
}

function isHomepageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname === '/' || parsed.pathname === '';
  } catch {
    return url === '/' || url === '' || url === '#';
  }
}

type EditState = { section: 'internal' | 'external'; index: number; field: 'url' | 'anchorText' } | null;

export function LinkPlanner({ linkPlan, article, brandIntake, onSetPlan, onSetArticle, onContinue, onBack }: Props) {
  const [generating, setGenerating] = useState(false);
  const [injecting, setInjecting] = useState(false);
  const [injected, setInjected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>(null);
  const [editValue, setEditValue] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [newLink, setNewLink] = useState<Partial<LinkSuggestion> & { type: 'internal' | 'external' }>({
    type: 'external', url: '', anchorText: '', context: '', placement: '', reason: '',
  });

  const generate = async () => {
    setGenerating(true);
    setError(null);
    setInjected(false);
    try {
      const res = await fetch('/api/seo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'links', article, brandIntake }),
      });
      if (!res.ok) throw new Error('Failed to generate link plan');
      const data = await res.json();
      if (data.linkPlan) onSetPlan(data.linkPlan);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
    setGenerating(false);
  };

  const injectLinks = async () => {
    if (!linkPlan || !article) return;
    setInjecting(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'inject-links', article, linkPlan }),
      });
      if (!res.ok) throw new Error('Failed to inject links');
      const data = await res.json();
      if (data.content && onSetArticle) {
        onSetArticle({ ...article, content: data.content });
        setInjected(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
    setInjecting(false);
  };

  const startEdit = (section: 'internal' | 'external', index: number, field: 'url' | 'anchorText') => {
    if (!linkPlan) return;
    const links = section === 'internal' ? linkPlan.internalLinks : linkPlan.externalLinks;
    setEditState({ section, index, field });
    setEditValue(links[index][field]);
  };

  const saveEdit = () => {
    if (!editState || !linkPlan) return;
    const { section, index, field } = editState;
    const updated = { ...linkPlan };
    if (section === 'internal') {
      updated.internalLinks = linkPlan.internalLinks.map((l, i) =>
        i === index ? { ...l, [field]: editValue } : l
      );
    } else {
      updated.externalLinks = linkPlan.externalLinks.map((l, i) =>
        i === index ? { ...l, [field]: editValue } : l
      );
    }
    onSetPlan(updated);
    setEditState(null);
    setEditValue('');
    setInjected(false);
  };

  const deleteLink = (section: 'internal' | 'external', index: number) => {
    if (!linkPlan) return;
    const updated = { ...linkPlan };
    if (section === 'internal') {
      updated.internalLinks = linkPlan.internalLinks.filter((_, i) => i !== index);
    } else {
      updated.externalLinks = linkPlan.externalLinks.filter((_, i) => i !== index);
    }
    onSetPlan(updated);
    setInjected(false);
  };

  const addLink = () => {
    if (!linkPlan || !newLink.url || !newLink.anchorText) return;
    const link: LinkSuggestion = {
      type: newLink.type,
      url: newLink.url,
      anchorText: newLink.anchorText,
      context: newLink.context || 'Manually added',
      placement: newLink.placement || 'Manual',
      reason: newLink.reason || 'Added by user',
    };
    const updated = { ...linkPlan };
    if (newLink.type === 'internal') {
      updated.internalLinks = [...linkPlan.internalLinks, link];
    } else {
      updated.externalLinks = [...linkPlan.externalLinks, link];
    }
    onSetPlan(updated);
    setAddingLink(false);
    setNewLink({ type: 'external', url: '', anchorText: '', context: '', placement: '', reason: '' });
    setInjected(false);
  };

  const homepageWarnings = linkPlan
    ? [...linkPlan.internalLinks, ...linkPlan.externalLinks].filter(l => isHomepageUrl(l.url))
    : [];

  const renderLinks = (links: LinkSuggestion[], section: 'internal' | 'external') => (
    <div style={{ overflow: 'auto', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
      <table className="seo-table">
        <thead>
          <tr>
            <th>Anchor Text</th>
            <th>URL</th>
            <th>Placement</th>
            <th>Reason</th>
            <th style={{ width: 80 }}>Status</th>
            <th style={{ width: 64 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link, i) => {
            const isHomepage = isHomepageUrl(link.url);
            const isEditingUrl = editState?.section === section && editState?.index === i && editState?.field === 'url';
            const isEditingAnchor = editState?.section === section && editState?.index === i && editState?.field === 'anchorText';

            return (
              <tr key={i} style={{ opacity: isHomepage ? 0.4 : 1 }}>
                <td style={{ fontWeight: 500, color: '#818cf8', minWidth: 120 }}>
                  {isEditingAnchor ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        className="seo-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        style={{ fontSize: 12, padding: '3px 6px', flex: 1 }}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditState(null); }}
                      />
                      <button className="seo-btn seo-btn-ghost" style={{ padding: 3 }} onClick={saveEdit}><Check size={12} color="#00c875" /></button>
                      <button className="seo-btn seo-btn-ghost" style={{ padding: 3 }} onClick={() => setEditState(null)}><X size={12} /></button>
                    </div>
                  ) : (
                    <span style={{ cursor: 'pointer', borderBottom: '1px dashed rgba(129,140,248,0.3)' }} onClick={() => startEdit(section, i, 'anchorText')}>
                      {link.anchorText}
                    </span>
                  )}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200 }}>
                  {isHomepage ? (
                    <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={11} /> {link.url}
                    </span>
                  ) : isEditingUrl ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        className="seo-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        style={{ fontSize: 12, padding: '3px 6px', flex: 1 }}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditState(null); }}
                      />
                      <button className="seo-btn seo-btn-ghost" style={{ padding: 3 }} onClick={saveEdit}><Check size={12} color="#00c875" /></button>
                      <button className="seo-btn seo-btn-ghost" style={{ padding: 3 }} onClick={() => setEditState(null)}><X size={12} /></button>
                    </div>
                  ) : (
                    <span
                      style={{ cursor: 'pointer', borderBottom: '1px dashed rgba(129,140,248,0.2)', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 200 }}
                      onClick={() => startEdit(section, i, 'url')}
                      title={link.url}
                    >
                      {link.url}
                    </span>
                  )}
                </td>
                <td style={{ fontSize: 12 }}>{link.placement}</td>
                <td style={{ fontSize: 12 }}>{link.reason}</td>
                <td style={{ fontSize: 11 }}>
                  {isHomepage ? (
                    <span style={{ color: '#f87171', fontWeight: 600 }}>⚠ Skipped</span>
                  ) : (
                    <span style={{ color: '#00c875', fontWeight: 600 }}>✓ Valid</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button
                      className="seo-btn seo-btn-ghost"
                      style={{ padding: 3 }}
                      onClick={() => startEdit(section, i, 'url')}
                      title="Edit URL"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      className="seo-btn seo-btn-ghost"
                      style={{ padding: 3, color: '#f87171' }}
                      onClick={() => deleteLink(section, i)}
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="seo-ai-banner">
        <span className="seo-ai-banner-icon"><Link2 size={20} /></span>
        <div>
          <strong>Link Strategy</strong> — AI generates a topic-relevant link plan. Edit URLs, add your own links, then inject into the article.
        </div>
      </div>

      {/* Step 1: Generate Plan */}
      <div className="seo-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: linkPlan ? 'var(--accent-green, #00c875)' : 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {linkPlan ? '✓' : '1'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Generate Link Plan</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              AI proposes topic-specific internal and external links — you can edit or add your own
            </div>
          </div>
        </div>
        <button className="seo-btn seo-btn-primary" onClick={generate} disabled={generating}>
          <Sparkles size={14} />
          {generating ? 'Planning…' : linkPlan ? 'Regenerate Plan' : 'Generate Link Plan'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {generating && (
        <div className="seo-loading"><div className="seo-spinner" /><div>Planning link strategy…</div></div>
      )}

      {homepageWarnings.length > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', fontSize: 12, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} />
          {homepageWarnings.length} homepage-only link{homepageWarnings.length > 1 ? 's' : ''} detected and will be skipped during injection.
        </div>
      )}

      {!generating && linkPlan && (
        <>
          {/* Link tables */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  🔗 Internal Links
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
                    ({linkPlan.internalLinks.filter(l => !isHomepageUrl(l.url)).length} valid)
                  </span>
                </h4>
              </div>
              {renderLinks(linkPlan.internalLinks, 'internal')}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  🌐 External Links
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
                    ({linkPlan.externalLinks.filter(l => !isHomepageUrl(l.url)).length} valid)
                  </span>
                </h4>
              </div>
              {renderLinks(linkPlan.externalLinks, 'external')}
            </div>
          </div>

          {/* Add custom link */}
          {!addingLink ? (
            <button
              className="seo-btn seo-btn-secondary"
              onClick={() => setAddingLink(true)}
              style={{ marginBottom: 20, fontSize: 12 }}
            >
              <Plus size={13} /> Add Custom Link
            </button>
          ) : (
            <div className="seo-card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                + Add Custom Link
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label className="seo-label">Type</label>
                  <select
                    className="seo-select"
                    value={newLink.type}
                    onChange={(e) => setNewLink({ ...newLink, type: e.target.value as 'internal' | 'external' })}
                  >
                    <option value="external">External</option>
                    <option value="internal">Internal</option>
                  </select>
                </div>
                <div>
                  <label className="seo-label">Anchor Text *</label>
                  <input
                    className="seo-input"
                    value={newLink.anchorText}
                    onChange={(e) => setNewLink({ ...newLink, anchorText: e.target.value })}
                    placeholder="e.g. industry report"
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="seo-label">URL *</label>
                  <input
                    className="seo-input"
                    value={newLink.url}
                    onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="seo-label">Placement</label>
                  <input
                    className="seo-input"
                    value={newLink.placement}
                    onChange={(e) => setNewLink({ ...newLink, placement: e.target.value })}
                    placeholder="e.g. Introduction section"
                  />
                </div>
                <div>
                  <label className="seo-label">Reason</label>
                  <input
                    className="seo-input"
                    value={newLink.reason}
                    onChange={(e) => setNewLink({ ...newLink, reason: e.target.value })}
                    placeholder="Why this link?"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="seo-btn seo-btn-primary"
                  onClick={addLink}
                  disabled={!newLink.url || !newLink.anchorText}
                  style={{ fontSize: 12 }}
                >
                  Add Link
                </button>
                <button
                  className="seo-btn seo-btn-secondary"
                  onClick={() => setAddingLink(false)}
                  style={{ fontSize: 12 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Inject */}
          <div className="seo-card" style={{ marginBottom: 16, borderColor: injected ? 'rgba(0,200,117,0.3)' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: injected ? 0 : 12 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: injected ? '#00c875' : 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {injected ? '✓' : '2'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Inject Links into Article
                  {injected && (
                    <span style={{ fontSize: 11, background: 'rgba(0,200,117,0.1)', color: '#00c875', border: '1px solid rgba(0,200,117,0.2)', borderRadius: 20, padding: '2px 8px' }}>
                      ✓ Done
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Weaves links into article markdown at contextually natural positions. Homepage links are excluded.
                </div>
              </div>
              {injected && <CheckCircle2 size={20} color="#00c875" />}
            </div>

            {!injected && (
              <button
                className="seo-btn seo-btn-primary"
                onClick={injectLinks}
                disabled={injecting || !article}
              >
                <ArrowRight size={14} />
                {injecting ? 'Injecting links…' : 'Inject Links into Article'}
              </button>
            )}

            {injecting && (
              <div className="seo-loading" style={{ marginTop: 12 }}>
                <div className="seo-spinner" />
                <div>Weaving links into article…</div>
              </div>
            )}

            {injected && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#00c875', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={13} />
                {linkPlan.internalLinks.filter(l => !isHomepageUrl(l.url)).length + linkPlan.externalLinks.filter(l => !isHomepageUrl(l.url)).length} links injected into article
              </div>
            )}
          </div>
        </>
      )}

      {!generating && !linkPlan && !error && (
        <div className="seo-empty-state">
          <div className="seo-empty-state-icon">🔗</div>
          <div className="seo-empty-state-title">No links planned yet</div>
          <div className="seo-empty-state-desc">Generate a topic-specific link strategy based on your article content.</div>
        </div>
      )}

      <div className="seo-actions-bar">
        <button className="seo-btn seo-btn-secondary" onClick={onBack}>← Back</button>
        <button className="seo-btn seo-btn-primary" onClick={onContinue}>
          Continue to Revision →
        </button>
      </div>
    </div>
  );
}
