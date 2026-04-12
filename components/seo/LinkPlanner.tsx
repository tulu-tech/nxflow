'use client';

import { LinkPlan, GeneratedArticle, BrandIntake } from '@/lib/seo/types';
import { useState } from 'react';
import { Sparkles, Link2 } from 'lucide-react';

interface Props {
  linkPlan: LinkPlan | null;
  article: GeneratedArticle | null;
  brandIntake: BrandIntake;
  onSetPlan: (plan: LinkPlan) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function LinkPlanner({ linkPlan, article, brandIntake, onSetPlan, onContinue, onBack }: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setGenerating(true);
    setError(null);
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

  const renderLinks = (links: LinkPlan['internalLinks'], type: string) => (
    <div style={{ overflow: 'auto', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
      <table className="seo-table">
        <thead>
          <tr>
            <th>Anchor Text</th>
            <th>URL</th>
            <th>Placement</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 500, color: '#818cf8' }}>{link.anchorText}</td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.url}</td>
              <td style={{ fontSize: 12 }}>{link.placement}</td>
              <td style={{ fontSize: 12 }}>{link.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="seo-ai-banner">
        <span className="seo-ai-banner-icon"><Link2 size={20} /></span>
        <div>
          <strong>Link Strategy</strong> — AI-generated internal and external link recommendations to boost SEO and session depth.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className="seo-btn seo-btn-primary" onClick={generate} disabled={generating}>
          <Sparkles size={14} />
          {generating ? 'Planning…' : linkPlan ? 'Regenerate' : 'Generate Link Plan'}
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

      {!generating && linkPlan && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
              🔗 Internal Links ({linkPlan.internalLinks.length})
            </h4>
            {renderLinks(linkPlan.internalLinks, 'internal')}
          </div>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
              🌐 External Links ({linkPlan.externalLinks.length})
            </h4>
            {renderLinks(linkPlan.externalLinks, 'external')}
          </div>
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
