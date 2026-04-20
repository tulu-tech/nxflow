'use client';

import { GeneratedArticle, BrandIntake, ContentBrief as ContentBriefType, OutlineItem } from '@/lib/seo/types';
import { useState } from 'react';
import { Sparkles, FileText, Copy, Check, List, ChevronRight, Pencil } from 'lucide-react';

interface Props {
  article: GeneratedArticle | null;
  articleOutline: OutlineItem[] | null;
  writingPrompt: string | null;
  brief: ContentBriefType | null;
  brandIntake: BrandIntake;
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  userBriefInput: string;
  onSetArticle: (article: GeneratedArticle) => void;
  onSetOutline: (outline: OutlineItem[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function ContentGenerator({
  article, articleOutline, writingPrompt, brief, brandIntake,
  primaryKeyword, secondaryKeywords, userBriefInput,
  onSetArticle, onSetOutline, onContinue, onBack,
}: Props) {
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'preview' | 'markdown'>('preview');
  const [editingOutline, setEditingOutline] = useState(false);
  const [localOutline, setLocalOutline] = useState<OutlineItem[] | null>(null);
  const [localH1, setLocalH1] = useState<string>('');

  const displayOutline = localOutline ?? articleOutline;

  const generateOutline = async () => {
    setGeneratingOutline(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'outline', brief, brandIntake, primaryKeyword, secondaryKeywords, userBriefInput }),
      });
      if (!res.ok) throw new Error('Failed to generate outline');
      const data = await res.json();
      if (data.outline) {
        onSetOutline(data.outline);
        setLocalOutline(data.outline);
        setLocalH1(data.h1 || brief?.h1 || '');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
    setGeneratingOutline(false);
  };

  const generateArticle = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'article', writingPrompt, brief, brandIntake }),
      });
      if (!res.ok) throw new Error('Failed to generate article');
      const data = await res.json();
      if (data.article) onSetArticle(data.article);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
    setGenerating(false);
  };

  const updateOutlineItem = (index: number, text: string) => {
    if (!displayOutline) return;
    const updated = displayOutline.map((item, i) => i === index ? { ...item, text } : item);
    setLocalOutline(updated);
    onSetOutline(updated);
  };

  const copyMarkdown = () => {
    if (!article) return;
    navigator.clipboard.writeText(article.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMarkdown = (md: string) => {
    let html = md
      .replace(/\[IMAGE:\s*([^\]]+)\]/g, (_: string, desc: string) => {
        const d = desc.length > 80 ? desc.slice(0, 80) + '…' : desc;
        return `<div class="seo-image-placeholder"><span class="seo-image-placeholder-icon">🖼️</span><span class="seo-image-placeholder-text">${d}</span></div>`;
      })
      .replace(/\[LINK:\s*([^|]+)\|([^\]]+)\]/g, (_: string, anchor: string, url: string) => {
        return `<a href="${url.trim()}" target="_blank" rel="noopener noreferrer" class="seo-article-link">${anchor.trim()}</a>`;
      })
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_: string, alt: string, src: string) => {
        return `<figure class="seo-article-figure"><img src="${src}" alt="${alt}" loading="lazy" class="seo-article-img" />${alt ? `<figcaption>${alt}</figcaption>` : ''}</figure>`;
      })
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_: string, text: string, url: string) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="seo-article-link">${text}</a>`;
      })
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
      .replace(/^---$/gm, '<hr />')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p><h([1-3])>/g, '<h$1>').replace(/<\/h([1-3])><\/p>/g, '</h$1>');
    html = html.replace(/<p><li>/g, '<ul><li>').replace(/<\/li><\/p>/g, '</li></ul>');
    html = html.replace(/<p><blockquote>/g, '<blockquote>').replace(/<\/blockquote><\/p>/g, '</blockquote>');
    html = html.replace(/<p><hr \/><\/p>/g, '<hr />');
    html = html.replace(/<p>(<figure)/g, '$1').replace(/(<\/figure>)<\/p>/g, '$1');
    html = html.replace(/<p>(<div class="seo-image-placeholder)/g, '$1').replace(/(<\/div>)<\/p>/g, '$1');
    return html;
  };

  return (
    <div>
      <div className="seo-ai-banner">
        <span className="seo-ai-banner-icon"><Sparkles size={20} /></span>
        <div>
          <strong>AI Article Generation</strong> — First generate and review the outline, then produce the full publish-ready article.
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Step 1: Outline */}
      <div className="seo-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: displayOutline ? 'var(--accent-green, #00c875)' : 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {displayOutline ? '✓' : '1'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Generate Outline
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              AI proposes the article structure — review and edit before generating the full article
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {displayOutline && (
              <button
                className="seo-btn seo-btn-ghost seo-btn-sm"
                onClick={() => setEditingOutline(!editingOutline)}
                style={{ fontSize: 11 }}
              >
                <Pencil size={11} /> {editingOutline ? 'Done Editing' : 'Edit'}
              </button>
            )}
            <button
              className="seo-btn seo-btn-primary"
              onClick={generateOutline}
              disabled={generatingOutline || !brief}
            >
              <List size={14} />
              {generatingOutline ? 'Planning…' : displayOutline ? 'Regenerate Outline' : 'Generate Outline'}
            </button>
          </div>
        </div>

        {generatingOutline && (
          <div className="seo-loading"><div className="seo-spinner" /><div>Building article structure…</div></div>
        )}

        {!generatingOutline && displayOutline && (
          <div style={{ marginTop: 4 }}>
            {localH1 && (
              <div style={{ fontSize: 14, fontWeight: 700, color: '#818cf8', marginBottom: 10, padding: '8px 10px', background: 'rgba(129,140,248,0.08)', borderRadius: 6 }}>
                H1: {localH1}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {displayOutline.map((item, i) => (
                <div key={i} style={{ paddingLeft: item.level === 'h3' ? 24 : 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: item.level === 'h2' ? '#818cf8' : 'var(--text-muted)', width: 22, flexShrink: 0 }}>
                    {item.level.toUpperCase()}
                  </span>
                  {editingOutline ? (
                    <input
                      className="seo-input"
                      value={item.text}
                      onChange={(e) => updateOutlineItem(i, e.target.value)}
                      style={{ fontSize: 13, padding: '4px 8px', flex: 1 }}
                    />
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {item.level === 'h2' && <ChevronRight size={12} color="var(--accent)" />}
                      {item.text}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Full Article */}
      <div className="seo-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: article ? 'var(--accent-green, #00c875)' : (displayOutline ? 'var(--accent)' : 'rgba(129,140,248,0.2)'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: article ? '#fff' : (displayOutline ? '#fff' : 'var(--text-muted)'), flexShrink: 0,
          }}>
            {article ? '✓' : '2'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: displayOutline ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              Generate Full Article
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {displayOutline ? 'Outline approved — generate the complete 2,800–3,500 word article' : 'Generate outline first to unlock this step'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {article && (
              <button className="seo-btn seo-btn-secondary seo-btn-sm" onClick={copyMarkdown}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
            <button
              className="seo-btn seo-btn-primary"
              onClick={generateArticle}
              disabled={generating || !writingPrompt || !displayOutline}
            >
              <Sparkles size={14} />
              {generating ? 'Writing…' : article ? 'Regenerate Article' : 'Generate Article'}
            </button>
          </div>
        </div>

        {generating && (
          <div className="seo-loading"><div className="seo-spinner" /><div>Generating publish-ready article… This may take a minute.</div></div>
        )}

        {!generating && article && (
          <>
            {/* Meta preview */}
            <div className="seo-meta-preview">
              <div className="seo-meta-title">{article.metaTitle}</div>
              <div className="seo-meta-url">nxflow.app/{article.slug}</div>
              <div className="seo-meta-desc">{article.metaDescription}</div>
            </div>

            {/* View tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              <button
                className={`seo-btn seo-btn-sm ${view === 'preview' ? 'seo-btn-primary' : 'seo-btn-secondary'}`}
                onClick={() => setView('preview')}
              >
                <FileText size={13} /> Preview
              </button>
              <button
                className={`seo-btn seo-btn-sm ${view === 'markdown' ? 'seo-btn-primary' : 'seo-btn-secondary'}`}
                onClick={() => setView('markdown')}
              >
                Markdown
              </button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                {article.wordCount} words
              </span>
            </div>

            {view === 'preview' ? (
              <div
                className="seo-article-preview"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
              />
            ) : (
              <div className="seo-card" style={{ maxHeight: 600, overflow: 'auto' }}>
                <pre style={{
                  whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: 12.5, lineHeight: 1.7,
                  color: 'var(--text-secondary)', fontFamily: 'monospace', margin: 0,
                }}>
                  {article.content}
                </pre>
              </div>
            )}
          </>
        )}
      </div>

      <div className="seo-actions-bar">
        <button className="seo-btn seo-btn-secondary" onClick={onBack}>← Back</button>
        <button className="seo-btn seo-btn-primary" disabled={!article} onClick={onContinue}>
          Continue to Images →
        </button>
      </div>
    </div>
  );
}
