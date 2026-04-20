'use client';

import { ImagePrompt, GeneratedArticle, BrandIntake } from '@/lib/seo/types';
import { useState } from 'react';
import { Sparkles, Image, Loader2, CheckCircle2, Zap, Pencil, Download, ExternalLink } from 'lucide-react';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

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

  const embedImageInArticle = (content: string, prompt: ImagePrompt, imageUrl: string): string => {
    const imgMarkupMd = `![${prompt.altText}](${imageUrl})${prompt.caption ? `\n*${prompt.caption}*` : ''}`;
    const imageMarkerRegex = /\[IMAGE:[^\]]*\]/;
    if (imageMarkerRegex.test(content)) {
      return content.replace(imageMarkerRegex, imgMarkupMd);
    }
    return content;
  };

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

  const startEdit = (img: ImagePrompt) => {
    setEditingId(img.id);
    setEditDraft(img.description);
  };

  const saveEdit = (id: string) => {
    const updated = prompts.map((p) =>
      p.id === id ? { ...p, description: editDraft, imageUrl: undefined } : p
    );
    onSetPrompts(updated);
    setEditingId(null);
    setEditDraft('');
  };

  const downloadImage = async (img: ImagePrompt) => {
    if (!img.imageUrl) return;
    try {
      // Try fetch→blob for same-origin or CORS-enabled URLs
      const res = await fetch(img.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = img.fileName || `${img.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab (DALL-E URLs may block cross-origin fetch)
      window.open(img.imageUrl, '_blank');
    }
  };

  const generatedCount = prompts.filter((p) => p.imageUrl).length;
  const anyGenerating = generatingIds.size > 0 || generatingAll;

  return (
    <div>
      <div className="seo-ai-banner">
        <span className="seo-ai-banner-icon"><Image size={20} /></span>
        <div>
          <strong>Image Generation</strong> — AI suggests image concepts. Edit any description before generating, then download your images.
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
              AI proposes image concepts — you can edit any description before generating
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
                  Edit descriptions first if needed, then generate individually or all at once
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
                  {generatingAll ? `Generating…` : 'Generate All'}
                </button>
              )}
            </div>

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
              const isEditing = editingId === img.id;

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

                  {/* Info + controls */}
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {img.placement}
                      </span>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {!isDone && !isEditing && (
                          <button
                            className="seo-btn seo-btn-ghost seo-btn-sm"
                            onClick={() => startEdit(img)}
                            style={{ fontSize: 11, padding: '3px 7px' }}
                            title="Edit prompt"
                          >
                            <Pencil size={11} />
                          </button>
                        )}
                        {!isDone && !isEditing && (
                          <button
                            className="seo-btn seo-btn-secondary seo-btn-sm"
                            onClick={() => generateImage(img)}
                            disabled={isGenerating || generatingAll}
                            style={{ fontSize: 11 }}
                          >
                            {isGenerating ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={11} />}
                            {isGenerating ? 'Generating…' : 'Generate'}
                          </button>
                        )}
                        {isDone && (
                          <button
                            className="seo-btn seo-btn-secondary seo-btn-sm"
                            onClick={() => downloadImage(img)}
                            style={{ fontSize: 11 }}
                            title="Download image"
                          >
                            <Download size={11} /> PNG
                          </button>
                        )}
                        {isDone && img.imageUrl && (
                          <button
                            className="seo-btn seo-btn-ghost seo-btn-sm"
                            onClick={() => window.open(img.imageUrl!, '_blank')}
                            style={{ fontSize: 11, padding: '3px 7px' }}
                            title="Open in new tab"
                          >
                            <ExternalLink size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Editable description */}
                    {isEditing ? (
                      <div style={{ marginBottom: 8 }}>
                        <textarea
                          className="seo-input"
                          rows={3}
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          style={{ fontSize: 12, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                          placeholder="Describe the image you want — style, subject, colors, mood…"
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <button className="seo-btn seo-btn-primary seo-btn-sm" onClick={() => saveEdit(img.id)} style={{ fontSize: 11 }}>
                            Save
                          </button>
                          <button className="seo-btn seo-btn-ghost seo-btn-sm" onClick={() => setEditingId(null)} style={{ fontSize: 11 }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.5 }}>
                        {img.description.length > 120 ? img.description.slice(0, 120) + '…' : img.description}
                      </p>
                    )}

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
            Generate image concepts — then edit descriptions to match your exact vision before generating.
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
