'use client';

import { ImagePrompt, GeneratedArticle, BrandIntake } from '@/lib/seo/types';
import { useState } from 'react';
import { Sparkles, Image, Loader2, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

interface Props {
  prompts: ImagePrompt[];
  article: GeneratedArticle | null;
  brandIntake: BrandIntake;
  onSetPrompts: (prompts: ImagePrompt[]) => void;
  onSetArticle?: (article: GeneratedArticle) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function ImageGenerator({ prompts, article, brandIntake, onSetPrompts, onSetArticle, onContinue, onBack }: Props) {
  const [planGenerating, setPlanGenerating] = useState(false);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [generatingAll, setGeneratingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Generate image plans (prompts)
  const generatePlans = async () => {
    setPlanGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'images', article, brandIntake }),
      });
      if (!res.ok) throw new Error('Failed to generate image plans');
      const data = await res.json();
      if (data.imagePrompts) onSetPrompts(data.imagePrompts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
    setPlanGenerating(false);
  };

  // Step 2: Generate a single image
  const generateImage = async (prompt: ImagePrompt) => {
    setGeneratingIds((prev) => new Set(prev).add(prompt.id));
    try {
      const res = await fetch('/api/seo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'image-generate', imagePrompt: prompt, brandIntake }),
      });
      if (!res.ok) throw new Error('Image generation failed');
      const data = await res.json();

      if (data.imageUrl) {
        const updatedPrompts = prompts.map((p) =>
          p.id === prompt.id ? { ...p, imageUrl: data.imageUrl } : p
        );
        onSetPrompts(updatedPrompts);

        // Embed image into article content: replace [IMAGE: ...] marker with actual image
        if (article && onSetArticle) {
          const updatedContent = embedImageInArticle(article.content, prompt, data.imageUrl);
          if (updatedContent !== article.content) {
            onSetArticle({ ...article, content: updatedContent });
          }
        }
      }
    } catch (e) {
      console.error('Image gen error:', e);
    }
    setGeneratingIds((prev) => {
      const next = new Set(prev);
      next.delete(prompt.id);
      return next;
    });
  };

  // Replace [IMAGE: ...] marker in article with actual img tag
  const embedImageInArticle = (content: string, prompt: ImagePrompt, imageUrl: string): string => {
    // Try to find [IMAGE: ...] marker matching this prompt's placement/description
    const imgMarkupMd = `![${prompt.altText}](${imageUrl})${prompt.caption ? `\n*${prompt.caption}*` : ''}`;

    // Match any [IMAGE: ...] lines (take first one if multiple)
    const imageMarkerRegex = /\[IMAGE:[^\]]*\]/;
    if (imageMarkerRegex.test(content)) {
      // Replace first unresolved marker
      return content.replace(imageMarkerRegex, imgMarkupMd);
    }
    return content;
  };

  // Generate all images sequentially
  const generateAll = async () => {
    const pending = prompts.filter((p) => !p.imageUrl);
    if (pending.length === 0) return;
    setGeneratingAll(true);
    setError(null);
    for (const prompt of pending) {
      await generateImage(prompt);
    }
    setGeneratingAll(false);
  };

  const generatedCount = prompts.filter((p) => p.imageUrl).length;
  const anyGenerating = generatingIds.size > 0 || generatingAll;

  return (
    <div>
      <div className="seo-ai-banner">
        <span className="seo-ai-banner-icon"><Image size={20} /></span>
        <div>
          <strong>Image Generation</strong> — Plan visual assets, then generate actual images for your article. Generated images are automatically embedded into the article.
        </div>
      </div>

      {/* Step 1: Plan */}
      <div className="seo-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: prompts.length > 0 ? 'var(--accent-green, #00c875)' : 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {prompts.length > 0 ? '✓' : '1'}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Plan Image Concepts
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              AI analyzes your article and proposes visual assets with placement, alt text, and DALL-E prompt
            </div>
          </div>
        </div>
        <button
          className="seo-btn seo-btn-primary"
          onClick={generatePlans}
          disabled={planGenerating || !article}
        >
          <Sparkles size={14} />
          {planGenerating ? 'Planning…' : prompts.length ? 'Regenerate Plans' : 'Generate Image Plans'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {planGenerating && (
        <div className="seo-loading"><div className="seo-spinner" /><div>Planning visual assets…</div></div>
      )}

      {/* Step 2: Generate */}
      {!planGenerating && prompts.length > 0 && (
        <>
          <div className="seo-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: generatedCount === prompts.length ? 'var(--accent-green, #00c875)' : 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {generatedCount === prompts.length ? '✓' : '2'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Generate Images
                  <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
                    {generatedCount}/{prompts.length} generated
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Generate individual images or all at once — they'll be embedded into your article automatically
                </div>
              </div>
              {prompts.some((p) => !p.imageUrl) && (
                <button
                  className="seo-btn seo-btn-primary"
                  onClick={generateAll}
                  disabled={anyGenerating}
                  style={{ flexShrink: 0 }}
                >
                  <Zap size={14} />
                  {generatingAll ? `Generating ${generatingIds.size}/${prompts.length - generatedCount}…` : 'Generate All'}
                </button>
              )}
            </div>

            {/* Progress bar */}
            {prompts.length > 0 && (
              <div style={{ height: 4, background: 'var(--border-subtle)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{
                  height: '100%',
                  width: `${(generatedCount / prompts.length) * 100}%`,
                  background: 'linear-gradient(90deg, var(--accent), #818cf8)',
                  borderRadius: 99,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            )}
          </div>

          {/* Image cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {prompts.map((img) => {
              const isGenerating = generatingIds.has(img.id);
              const isDone = !!img.imageUrl;

              return (
                <div key={img.id} className="seo-card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Image preview area */}
                  <div style={{
                    height: 180,
                    background: isDone ? 'transparent' : 'rgba(129,140,248,0.06)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {isDone && img.imageUrl ? (
                      <img
                        src={img.imageUrl}
                        alt={img.altText}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : isGenerating ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <Loader2 size={32} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Generating…</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: 0.5 }}>
                        <Image size={32} color="var(--text-muted)" />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Not generated yet</span>
                      </div>
                    )}

                    {/* Status badge */}
                    {isDone && (
                      <div style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(0,200,117,0.15)', border: '1px solid rgba(0,200,117,0.3)',
                        borderRadius: 20, padding: '3px 8px',
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 11, color: '#00c875', fontWeight: 600,
                      }}>
                        <CheckCircle2 size={11} /> Generated
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {img.placement}
                      </span>
                      {!isDone && (
                        <button
                          className="seo-btn seo-btn-secondary seo-btn-sm"
                          onClick={() => generateImage(img)}
                          disabled={isGenerating || generatingAll}
                          style={{ flexShrink: 0, fontSize: 11 }}
                        >
                          {isGenerating ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={11} />}
                          {isGenerating ? 'Generating…' : 'Generate'}
                        </button>
                      )}
                    </div>

                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.5 }}>
                      {img.description.length > 100 ? img.description.slice(0, 100) + '…' : img.description}
                    </p>

                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div><strong>Alt:</strong> {img.altText}</div>
                      <div><strong>File:</strong> {img.fileName}</div>
                      {img.caption && <div><strong>Caption:</strong> {img.caption}</div>}
                      {isDone && (
                        <div style={{ color: '#00c875', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={11} /> Embedded in article
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!planGenerating && prompts.length === 0 && !error && (
        <div className="seo-empty-state">
          <div className="seo-empty-state-icon">🖼️</div>
          <div className="seo-empty-state-title">No images planned yet</div>
          <div className="seo-empty-state-desc">
            Generate image concepts based on your article content, then generate the actual images.
          </div>
        </div>
      )}

      <div className="seo-actions-bar">
        <button className="seo-btn seo-btn-secondary" onClick={onBack}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {generatedCount > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {generatedCount}/{prompts.length} images ready
            </span>
          )}
          <button className="seo-btn seo-btn-primary" onClick={onContinue}>
            Continue to Links →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
