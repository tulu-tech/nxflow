'use client';

import { GeneratedArticle, BrandIntake, ContentBrief as ContentBriefType } from '@/lib/seo/types';
import { useState } from 'react';
import { Sparkles, FileText, Copy, Check } from 'lucide-react';

interface Props {
  article: GeneratedArticle | null;
  writingPrompt: string | null;
  brief: ContentBriefType | null;
  brandIntake: BrandIntake;
  onSetArticle: (article: GeneratedArticle) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function ContentGenerator({ article, writingPrompt, brief, brandIntake, onSetArticle, onContinue, onBack }: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'preview' | 'markdown'>('preview');

  const generate = async () => {
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

  const copyMarkdown = () => {
    if (!article) return;
    navigator.clipboard.writeText(article.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Enhanced markdown to HTML renderer
  const renderMarkdown = (md: string) => {
    let html = md
      // [IMAGE: description] markers → styled placeholder
      .replace(/\[IMAGE:\s*([^\]]+)\]/g, (_: string, desc: string) => {
        const d = desc.length > 80 ? desc.slice(0, 80) + '…' : desc;
        return `<div class="seo-image-placeholder"><span class="seo-image-placeholder-icon">🖼️</span><span class="seo-image-placeholder-text">${d}</span></div>`;
      })
      // [LINK: anchor|url] markers → real links
      .replace(/\[LINK:\s*([^|]+)\|([^\]]+)\]/g, (_: string, anchor: string, url: string) => {
        return `<a href="${url.trim()}" target="_blank" rel="noopener noreferrer" class="seo-article-link">${anchor.trim()}</a>`;
      })
      // ![alt](src) → figure
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_: string, alt: string, src: string) => {
        return `<figure class="seo-article-figure"><img src="${src}" alt="${alt}" loading="lazy" class="seo-article-img" />${alt ? `<figcaption>${alt}</figcaption>` : ''}</figure>`;
      })
      // [text](url) → link
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
          <strong>AI Article Generation</strong> — Full-length, publish-ready SEO article based on your content brief and writing prompt.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className="seo-btn seo-btn-primary" onClick={generate} disabled={generating || !writingPrompt}>
          <Sparkles size={14} />
          {generating ? 'Writing article…' : article ? 'Regenerate Article' : 'Generate Article'}
        </button>
        {article && (
          <button className="seo-btn seo-btn-secondary" onClick={copyMarkdown}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Markdown'}
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

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
                color: 'var(--text-secondary)', fontFamily: "monospace", margin: 0,
              }}>
                {article.content}
              </pre>
            </div>
          )}
        </>
      )}

      <div className="seo-actions-bar">
        <button className="seo-btn seo-btn-secondary" onClick={onBack}>← Back</button>
        <button className="seo-btn seo-btn-primary" disabled={!article} onClick={onContinue}>
          Continue to Images →
        </button>
      </div>
    </div>
  );
}
