'use client';

import { ContentBrief as ContentBriefType, BrandIntake, KeywordEntry } from '@/lib/seo/types';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  brief: ContentBriefType | null;
  brandIntake: BrandIntake;
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  keywords: KeywordEntry[];
  userBriefInput: string;
  onSetUserBriefInput: (v: string) => void;
  onUpdateBrief: (brief: ContentBriefType) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function ContentBrief({ brief, brandIntake, primaryKeyword, secondaryKeywords, keywords, userBriefInput, onSetUserBriefInput, onUpdateBrief, onContinue, onBack }: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'brief', brandIntake, primaryKeyword, secondaryKeywords, keywords, userBriefInput }),
      });
      if (!res.ok) throw new Error('Failed to generate brief');
      const data = await res.json();
      if (data.brief) onUpdateBrief(data.brief);
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
          <strong>AI Content Brief</strong> — Add your custom instructions below, then generate a strategic content brief based on your brand context and validated keywords.
        </div>
      </div>

      {/* User Instructions */}
      <div className="seo-card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          📝 Your Instructions
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>optional</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
          Tell the AI how to angle this article — e.g. tone, specific topics to cover, audience nuance, competitor differentiation, what to avoid, or any custom direction.
        </div>
        <textarea
          className="seo-input"
          rows={4}
          value={userBriefInput}
          onChange={(e) => onSetUserBriefInput(e.target.value)}
          placeholder="e.g. Focus on mid-market B2B SaaS companies. Emphasize ROI over features. Avoid mentioning pricing. Include a section on implementation timeline. Tone: direct and data-driven."
          style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className="seo-btn seo-btn-primary" onClick={generate} disabled={generating || !primaryKeyword}>
          <Sparkles size={14} />
          {generating ? 'Generating…' : brief ? 'Regenerate Brief' : 'Generate Brief'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {generating && (
        <div className="seo-loading">
          <div className="seo-spinner" />
          <div>Building content strategy…</div>
        </div>
      )}

      {!generating && brief && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="seo-card">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>📋 Strategy Overview</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div><strong style={{ color: 'var(--text-muted)' }}>Content Goal:</strong> <span style={{ color: 'var(--text-secondary)' }}>{brief.contentGoal}</span></div>
              <div><strong style={{ color: 'var(--text-muted)' }}>Page Type:</strong> <span style={{ color: 'var(--text-secondary)' }}>{brief.pageType}</span></div>
              <div><strong style={{ color: 'var(--text-muted)' }}>Funnel Stage:</strong> <span style={{ color: 'var(--text-secondary)' }}>{brief.funnelStage}</span></div>
              <div><strong style={{ color: 'var(--text-muted)' }}>Target Persona:</strong> <span style={{ color: 'var(--text-secondary)' }}>{brief.targetPersona}</span></div>
            </div>
            <div style={{ marginTop: 12, fontSize: 13 }}>
              <strong style={{ color: 'var(--text-muted)' }}>Intent Summary:</strong>
              <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>{brief.searchIntentSummary}</p>
            </div>
          </div>

          <div className="seo-card">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>💡 Content Angle</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.5 }}>{brief.contentAngle}</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}><strong>Differentiation:</strong> {brief.differentiationAngle}</p>
          </div>

          <div className="seo-card">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>📑 H1 & Title Ideas</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#818cf8', marginBottom: 10 }}>{brief.h1}</div>
            <ul style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 16, margin: 0 }}>
              {brief.titleIdeas.map((t, i) => <li key={i} style={{ marginBottom: 4 }}>{t}</li>)}
            </ul>
          </div>

          <div className="seo-card">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>📐 Content Outline</div>
            {brief.outline.map((item, i) => (
              <div key={i} style={{ paddingLeft: item.level === 'h3' ? 20 : 0, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: item.level === 'h2' ? '#818cf8' : 'var(--text-muted)', marginRight: 6 }}>
                  {item.level.toUpperCase()}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.text}</span>
              </div>
            ))}
          </div>

          <div className="seo-card">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>❓ FAQ & Snippets</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>FAQ Opportunities</div>
            <ul style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 16, margin: '0 0 12px' }}>
              {brief.faqOpportunities.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            {brief.richSnippetOpportunities.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Rich Snippet Opportunities</div>
                <ul style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 16, margin: 0 }}>
                  {brief.richSnippetOpportunities.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </>
            )}
          </div>

          <div className="seo-card">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>🎯 CTA & Conversion</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong>CTA:</strong> {brief.ctaDirection}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}><strong>Goal:</strong> {brief.conversionGoal}</div>
          </div>
        </div>
      )}

      <div className="seo-actions-bar">
        <button className="seo-btn seo-btn-secondary" onClick={onBack}>← Back</button>
        <button className="seo-btn seo-btn-primary" disabled={!brief} onClick={onContinue}>
          Continue to Writing Prompt →
        </button>
      </div>
    </div>
  );
}
