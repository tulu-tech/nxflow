'use client';

import { LinkPlan, GeneratedArticle, BrandIntake } from '@/lib/seo/types';
import { useState } from 'react';
import { Sparkles, Link2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

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

export function LinkPlanner({ linkPlan, article, brandIntake, onSetPlan, onSetArticle, onContinue, onBack }: Props) {
  const [generating, setGenerating] = useState(false);
  const [injecting, setInjecting] = useState(false);
  const [injected, setInjected] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const homepageWarnings = linkPlan
    ? [...linkPlan.internalLinks, ...linkPlan.externalLinks].filter(l => isHomepageUrl(l.url))
    : [];

  const renderLinks = (links: LinkPlan['internalLinks']) => (
    <div style={{ overflow: 'auto', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
      <table className="seo-table">
        <thead>
          <tr>
            <th>Anchor Text</th>
            <th>URL</th>
            <th>Placement</th>
            <th>Reason</th>
            <th style={{ width: 64 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link, i) => {
            const isHomepage = isHomepageUrl(link.url);
            return (
              <tr key={i} style={{ opacity: isHomepage ? 0.4 : 1 }}>
                <td style={{ fontWeight: 500, color: '#818cf8' }}>{link.anchorText}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isHomepage ? (
                    <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={11} /> {link.url}
                    </span>
                  ) : (
                    <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                      {link.url}
                    </a>
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
          <strong>Link Strategy</strong> — AI generates an internal + external link plan, then injects the links directly into the article. Homepage or broken links are automatically skipped.
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
              AI proposes contextual internal and external links based on your article content and domain
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

      {/* Homepage warnings */}
      {homepageWarnings.length > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', fontSize: 12, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} />
          {homepageWarnings.length} homepage-only link{homepageWarnings.length > 1 ? 's' : ''} detected and will be skipped during injection (homepage links carry no SEO value).
        </div>
      )}

      {!generating && linkPlan && (
        <>
          {/* Link tables */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 }}>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                🔗 Internal Links
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
                  ({linkPlan.internalLinks.filter(l => !isHomepageUrl(l.url)).length} valid)
                </span>
              </h4>
              {renderLinks(linkPlan.internalLinks)}
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                🌐 External Links
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
                  ({linkPlan.externalLinks.filter(l => !isHomepageUrl(l.url)).length} valid)
                </span>
              </h4>
              {renderLinks(linkPlan.externalLinks)}
            </div>
          </div>

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
                  Weaves links into article markdown at contextually natural positions. Homepage links are automatically excluded.
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
                {linkPlan.internalLinks.filter(l => !isHomepageUrl(l.url)).length + linkPlan.externalLinks.filter(l => !isHomepageUrl(l.url)).length} links successfully injected into article content
              </div>
            )}
          </div>
        </>
      )}

      {!generating && !linkPlan && !error && (
        <div className="seo-empty-state">
          <div className="seo-empty-state-icon">🔗</div>
          <div className="seo-empty-state-title">No links planned yet</div>
          <div className="seo-empty-state-desc">Generate a link strategy based on your article content and brand domain.</div>
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
