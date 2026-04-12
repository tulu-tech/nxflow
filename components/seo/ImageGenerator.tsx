'use client';

import { ImagePrompt, GeneratedArticle, BrandIntake } from '@/lib/seo/types';
import { useState } from 'react';
import { Sparkles, Image } from 'lucide-react';

interface Props {
  prompts: ImagePrompt[];
  article: GeneratedArticle | null;
  brandIntake: BrandIntake;
  onSetPrompts: (prompts: ImagePrompt[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function ImageGenerator({ prompts, article, brandIntake, onSetPrompts, onContinue, onBack }: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'images', article, brandIntake }),
      });
      if (!res.ok) throw new Error('Failed to generate image prompts');
      const data = await res.json();
      if (data.imagePrompts) onSetPrompts(data.imagePrompts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
    setGenerating(false);
  };

  return (
    <div>
      <div className="seo-ai-banner">
        <span className="seo-ai-banner-icon"><Image size={20} /></span>
        <div>
          <strong>Image Planning</strong> — Generate image concepts for you article including alt text, placement, and file names. Actual image generation coming soon.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className="seo-btn seo-btn-primary" onClick={generate} disabled={generating || !article}>
          <Sparkles size={14} />
          {generating ? 'Planning…' : prompts.length ? 'Regenerate' : 'Generate Image Plans'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {generating && (
        <div className="seo-loading"><div className="seo-spinner" /><div>Planning visual assets…</div></div>
      )}

      {!generating && prompts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {prompts.map((img) => (
            <div key={img.id} className="seo-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>🖼️</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{img.placement}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.5 }}>{img.description}</p>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div><strong>Alt:</strong> {img.altText}</div>
                <div><strong>File:</strong> {img.fileName}</div>
                {img.caption && <div><strong>Caption:</strong> {img.caption}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!generating && prompts.length === 0 && !error && (
        <div className="seo-empty-state">
          <div className="seo-empty-state-icon">🖼️</div>
          <div className="seo-empty-state-title">No images planned yet</div>
          <div className="seo-empty-state-desc">Generate image concepts based on your article content.</div>
        </div>
      )}

      <div className="seo-actions-bar">
        <button className="seo-btn seo-btn-secondary" onClick={onBack}>← Back</button>
        <button className="seo-btn seo-btn-primary" onClick={onContinue}>
          Continue to Links →
        </button>
      </div>
    </div>
  );
}
