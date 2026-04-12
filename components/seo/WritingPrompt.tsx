'use client';

import { ContentBrief as ContentBriefType, BrandIntake } from '@/lib/seo/types';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  prompt: string | null;
  brief: ContentBriefType | null;
  brandIntake: BrandIntake;
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  onSetPrompt: (prompt: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function WritingPrompt({ prompt, brief, brandIntake, primaryKeyword, secondaryKeywords, onSetPrompt, onContinue, onBack }: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prompt', brief, brandIntake, primaryKeyword, secondaryKeywords }),
      });
      if (!res.ok) throw new Error('Failed to generate prompt');
      const data = await res.json();
      if (data.prompt) onSetPrompt(data.prompt);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
    setGenerating(false);
  };

  return (
    <div>
      <div className="seo-ai-banner">
        <span className="seo-ai-banner-icon"><Sparkles size={20} /></span>
        <div>
          <strong>Internal Writing Prompt</strong> — This is the master prompt that instructs the AI writer. It encodes all SEO strategy, structure requirements, and quality standards.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className="seo-btn seo-btn-primary" onClick={generate} disabled={generating || !brief}>
          <Sparkles size={14} />
          {generating ? 'Building…' : prompt ? 'Regenerate Prompt' : 'Generate Writing Prompt'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {generating && (
        <div className="seo-loading"><div className="seo-spinner" /><div>Building optimized writing prompt…</div></div>
      )}

      {!generating && prompt && (
        <div className="seo-card" style={{ maxHeight: 600, overflow: 'auto' }}>
          <pre style={{
            whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: 12.5, lineHeight: 1.7,
            color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', 'SF Mono', monospace', monospace",
            margin: 0,
          }}>
            {prompt}
          </pre>
        </div>
      )}

      <div className="seo-actions-bar">
        <button className="seo-btn seo-btn-secondary" onClick={onBack}>← Back</button>
        <button className="seo-btn seo-btn-primary" disabled={!prompt} onClick={onContinue}>
          Continue to Generate Article →
        </button>
      </div>
    </div>
  );
}
