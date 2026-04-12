'use client';

import { SEOProject, PHASES } from '@/lib/seo/types';
import { Copy, Check, Download } from 'lucide-react';
import { useState } from 'react';

interface Props {
  project: SEOProject;
  onBack: () => void;
}

export function FinalOutput({ project, onBack }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const article = project.generatedArticle;
  const brief = project.contentBrief;

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button className="seo-btn seo-btn-ghost" style={{ padding: 3 }} onClick={() => copyText(text, id)}>
      {copied === id ? <Check size={12} color="#00c875" /> : <Copy size={12} />}
    </button>
  );

  const completedPhases = PHASES.filter((p) => p.id < project.currentPhase || project.currentPhase === 10);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button
            className="seo-btn seo-btn-primary"
            onClick={() => {
              if (!article) return;
              const blob = new Blob([article.content], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${article.slug || 'article'}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={!article}
          >
            <Download size={14} /> Export Markdown
          </button>
          {article && (
            <button className="seo-btn seo-btn-secondary" onClick={() => copyText(article.content, 'full')}>
              {copied === 'full' ? <Check size={14} /> : <Copy size={14} />}
              Copy Full Article
            </button>
          )}
        </div>
      </div>

      {/* Project Summary */}
      <div className="seo-card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>📊 Project Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
          <div><strong>Brand:</strong> {project.brandIntake.brandName}</div>
          <div><strong>Industry:</strong> {project.brandIntake.industry}</div>
          <div><strong>Status:</strong> {completedPhases.length}/{PHASES.length} phases</div>
          <div><strong>Primary KW:</strong> {project.primaryKeyword || '—'}</div>
          <div><strong>Secondary KWs:</strong> {project.secondaryKeywords.join(', ') || '—'}</div>
          <div><strong>Keywords Found:</strong> {project.keywords.length}</div>
        </div>
      </div>

      {/* Metadata */}
      {article && (
        <div className="seo-card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>🔍 SEO Metadata</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ color: 'var(--text-muted)', width: 100 }}>Title:</strong>
              <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{article.title}</span>
              <CopyBtn text={article.title} id="title" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ color: 'var(--text-muted)', width: 100 }}>Meta Title:</strong>
              <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{article.metaTitle}</span>
              <CopyBtn text={article.metaTitle} id="meta-title" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ color: 'var(--text-muted)', width: 100 }}>Meta Desc:</strong>
              <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{article.metaDescription}</span>
              <CopyBtn text={article.metaDescription} id="meta-desc" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong style={{ color: 'var(--text-muted)', width: 100 }}>Slug:</strong>
              <span style={{ color: '#00c875' }}>/{article.slug}</span>
              <CopyBtn text={article.slug} id="slug" />
            </div>
            <div>
              <strong style={{ color: 'var(--text-muted)' }}>Word Count:</strong>{' '}
              <span style={{ color: 'var(--text-secondary)' }}>{article.wordCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Images */}
      {project.imagePrompts.length > 0 && (
        <div className="seo-card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>🖼️ Image Plan ({project.imagePrompts.length})</h3>
          {project.imagePrompts.map((img) => (
            <div key={img.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 }}>
              <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{img.placement}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Alt: {img.altText} · File: {img.fileName}</div>
            </div>
          ))}
        </div>
      )}

      {/* Links */}
      {project.linkPlan && (
        <div className="seo-card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>🔗 Link Plan</h3>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong>{project.linkPlan.internalLinks.length}</strong> internal links ·{' '}
            <strong>{project.linkPlan.externalLinks.length}</strong> external links
          </div>
        </div>
      )}

      {/* Publish Checklist */}
      <div className="seo-card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>✅ Publish Checklist</h3>
        {[
          { label: 'Article generated', done: !!article },
          { label: 'Meta title & description set', done: !!article?.metaTitle },
          { label: 'URL slug defined', done: !!article?.slug },
          { label: 'Image plan created', done: project.imagePrompts.length > 0 },
          { label: 'Link strategy defined', done: !!project.linkPlan },
          { label: 'Content reviewed & revised', done: project.revisionNotes.length > 0 },
          { label: 'Primary keyword selected', done: !!project.primaryKeyword },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, color: item.done ? '#00c875' : 'var(--text-muted)' }}>
            <span>{item.done ? '✅' : '⬜'}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="seo-actions-bar">
        <button className="seo-btn seo-btn-secondary" onClick={onBack}>← Back</button>
      </div>
    </div>
  );
}
