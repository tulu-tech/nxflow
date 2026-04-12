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
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>
            🖼️ Images
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
              {project.imagePrompts.filter(i => i.imageUrl).length}/{project.imagePrompts.length} generated
            </span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {project.imagePrompts.map((img) => (
              <div key={img.id} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                {img.imageUrl ? (
                  <img
                    src={img.imageUrl}
                    alt={img.altText}
                    style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: 100, background: 'rgba(129,140,248,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    🖼️
                  </div>
                )}
                <div style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 2 }}>{img.placement}</div>
                  <div>Alt: {img.altText}</div>
                  {img.imageUrl && <div style={{ color: '#00c875', marginTop: 2 }}>✓ Generated</div>}
                </div>
              </div>
            ))}
          </div>
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
          { label: `Image plans created (${project.imagePrompts.length})`, done: project.imagePrompts.length > 0 },
          {
            label: `Images generated (${project.imagePrompts.filter(i => i.imageUrl).length}/${project.imagePrompts.length})`,
            done: project.imagePrompts.length > 0 && project.imagePrompts.every(i => i.imageUrl),
          },
          { label: 'Link strategy defined', done: !!project.linkPlan },
          { label: 'Links injected into article', done: !!project.linkPlan && !!article && !article.content.includes('[LINK:') },
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
