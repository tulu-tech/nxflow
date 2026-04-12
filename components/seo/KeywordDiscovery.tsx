'use client';

import { KeywordEntry, BrandIntake } from '@/lib/seo/types';
import { KeywordTable } from './KeywordTable';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  brandIntake: BrandIntake;
  keywords: KeywordEntry[];
  onUpdateKeywords: (keywords: KeywordEntry[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function KeywordDiscovery({ brandIntake, keywords, onUpdateKeywords, onContinue, onBack }: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateKeywords = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'keywords', brandIntake }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Generation failed' }));
        throw new Error(err.error || 'Failed to generate keywords');
      }
      const data = await res.json();
      if (data.keywords) {
        onUpdateKeywords(data.keywords);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    }
    setGenerating(false);
  };

  const removeKeyword = (id: string) => {
    onUpdateKeywords(keywords.filter((k) => k.id !== id));
  };

  const updateKeyword = (id: string, field: keyof KeywordEntry, value: unknown) => {
    onUpdateKeywords(
      keywords.map((k) => (k.id === id ? { ...k, [field]: value } : k))
    );
  };

  return (
    <div>
      <div className="seo-ai-banner">
        <span className="seo-ai-banner-icon"><Sparkles size={20} /></span>
        <div>
          <strong>AI-Powered Discovery</strong> — Generate keyword suggestions based on your brand context.
          Keywords are prioritized by intent fit, business relevance, conversion potential, and content opportunity.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button
          className="seo-btn seo-btn-primary"
          onClick={generateKeywords}
          disabled={generating}
        >
          <Sparkles size={14} />
          {generating ? 'Generating…' : keywords.length ? 'Regenerate Keywords' : 'Generate Keywords'}
        </button>
        {keywords.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            {keywords.length} keywords found
          </span>
        )}
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 16
        }}>
          {error}
        </div>
      )}

      {generating && (
        <div className="seo-loading">
          <div className="seo-spinner" />
          <div>Discovering keywords from brand context…</div>
        </div>
      )}

      {!generating && keywords.length > 0 && (
        <KeywordTable
          keywords={keywords}
          onRemove={removeKeyword}
          onUpdate={updateKeyword}
        />
      )}

      {!generating && keywords.length === 0 && !error && (
        <div className="seo-empty-state">
          <div className="seo-empty-state-icon">🔍</div>
          <div className="seo-empty-state-title">Ready for Keyword Discovery</div>
          <div className="seo-empty-state-desc">
            Click &quot;Generate Keywords&quot; to discover high-value keyword opportunities based on your brand intake.
          </div>
        </div>
      )}

      <div className="seo-actions-bar">
        <button className="seo-btn seo-btn-secondary" onClick={onBack}>← Back</button>
        <button
          className="seo-btn seo-btn-primary"
          disabled={keywords.length === 0}
          onClick={onContinue}
        >
          Continue to Validation →
        </button>
      </div>
    </div>
  );
}
