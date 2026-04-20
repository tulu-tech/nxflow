'use client';

import { SEOProject, PHASES, GeneratedArticle, ImagePrompt } from '@/lib/seo/types';
import { Copy, Check, Download, FileText, Image } from 'lucide-react';
import { useState } from 'react';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle,
} from 'docx';

interface Props {
  project: SEOProject;
  onBack: () => void;
}

// ─── Markdown → DOCX ────────────────────────────────────────────────────────

function markdownToDocxParagraphs(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip image/link markers (not renderable in docx easily)
    if (/^\[IMAGE:/.test(line) || /^\[LINK:/.test(line)) { i++; continue; }
    // Skip HTML comments
    if (/^<!--/.test(line)) { i++; continue; }

    if (/^### (.+)/.test(line)) {
      const text = line.replace(/^### /, '');
      paragraphs.push(new Paragraph({ text: cleanInline(text), heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 80 } }));
    } else if (/^## (.+)/.test(line)) {
      const text = line.replace(/^## /, '');
      paragraphs.push(new Paragraph({ text: cleanInline(text), heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }));
    } else if (/^# (.+)/.test(line)) {
      const text = line.replace(/^# /, '');
      paragraphs.push(new Paragraph({ text: cleanInline(text), heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }));
    } else if (/^---/.test(line)) {
      paragraphs.push(new Paragraph({ text: '', spacing: { before: 120, after: 120 } }));
    } else if (/^> (.+)/.test(line)) {
      const text = line.replace(/^> /, '');
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: cleanInline(text), italics: true, color: '555555' })],
        indent: { left: 720 },
        spacing: { before: 120, after: 120 },
      }));
    } else if (/^- (.+)/.test(line) || /^\d+\. (.+)/.test(line)) {
      const text = line.replace(/^- /, '').replace(/^\d+\. /, '');
      const isOrdered = /^\d+\./.test(line);
      paragraphs.push(new Paragraph({
        children: inlineRuns(text),
        bullet: isOrdered ? undefined : { level: 0 },
        numbering: isOrdered ? { reference: 'default-numbering', level: 0 } : undefined,
        spacing: { before: 60, after: 60 },
      }));
    } else if (line.trim()) {
      paragraphs.push(new Paragraph({
        children: inlineRuns(line),
        spacing: { before: 80, after: 80 },
      }));
    } else {
      paragraphs.push(new Paragraph({ text: '', spacing: { before: 40, after: 40 } }));
    }
    i++;
  }

  return paragraphs;
}

function cleanInline(text: string): string {
  return text
    .replace(/\[LINK:\s*([^|]+)\|[^\]]+\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

function inlineRuns(text: string): TextRun[] {
  // Strip link markers
  const cleaned = text
    .replace(/\[LINK:\s*([^|]+)\|[^\]]+\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  const runs: TextRun[] = [];
  const parts = cleaned.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  for (const part of parts) {
    if (/^\*\*(.+)\*\*$/.test(part)) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
    } else if (/^\*(.+)\*$/.test(part)) {
      runs.push(new TextRun({ text: part.slice(1, -1), italics: true }));
    } else if (/^`(.+)`$/.test(part)) {
      runs.push(new TextRun({ text: part.slice(1, -1), font: 'Courier New', size: 18 }));
    } else if (part) {
      runs.push(new TextRun({ text: part }));
    }
  }
  return runs.length ? runs : [new TextRun({ text: cleaned })];
}

async function exportDocx(article: GeneratedArticle) {
  const bodyParagraphs = markdownToDocxParagraphs(article.content);

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'default-numbering',
        levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }],
      }],
    },
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'SEO Metadata', bold: true, size: 22, color: '666666' })],
          spacing: { before: 0, after: 80 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Meta Title', bold: true })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
              new TableCell({ children: [new Paragraph({ text: article.metaTitle })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Meta Description', bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ text: article.metaDescription })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'URL Slug', bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ text: `/${article.slug}` })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Word Count', bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ text: String(article.wordCount) })] }),
            ]}),
          ],
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
          },
        }),
        new Paragraph({ text: '', spacing: { before: 300, after: 0 } }),
        ...bodyParagraphs,
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${article.slug || 'article'}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadImage(img: ImagePrompt) {
  if (!img.imageUrl) return;
  try {
    const res = await fetch(img.imageUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = img.fileName || `${img.id}.png`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    window.open(img.imageUrl, '_blank');
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FinalOutput({ project, onBack }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [exportingDocx, setExportingDocx] = useState(false);
  const article = project.generatedArticle;
  const brief = project.contentBrief;

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleExportDocx = async () => {
    if (!article) return;
    setExportingDocx(true);
    try {
      await exportDocx(article);
    } catch (e) {
      console.error('DOCX export error:', e);
    }
    setExportingDocx(false);
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button className="seo-btn seo-btn-ghost" style={{ padding: 3 }} onClick={() => copyText(text, id)}>
      {copied === id ? <Check size={12} color="#00c875" /> : <Copy size={12} />}
    </button>
  );

  const completedPhases = PHASES.filter((p) => p.id < project.currentPhase || project.currentPhase === 10);

  return (
    <div>
      {/* Export buttons */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <button
            className="seo-btn seo-btn-primary"
            onClick={handleExportDocx}
            disabled={!article || exportingDocx}
          >
            <FileText size={14} /> {exportingDocx ? 'Exporting…' : 'Export DOCX'}
          </button>
          <button
            className="seo-btn seo-btn-secondary"
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
            {[
              { label: 'Title', value: article.title, id: 'title' },
              { label: 'Meta Title', value: article.metaTitle, id: 'meta-title' },
              { label: 'Meta Desc', value: article.metaDescription, id: 'meta-desc' },
            ].map(({ label, value, id }) => (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ color: 'var(--text-muted)', width: 100 }}>{label}:</strong>
                <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{value}</span>
                <CopyBtn text={value} id={id} />
              </div>
            ))}
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

      {/* Images with download */}
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
                  {img.imageUrl ? (
                    <button
                      className="seo-btn seo-btn-secondary"
                      style={{ marginTop: 6, fontSize: 10, padding: '3px 8px', width: '100%' }}
                      onClick={() => downloadImage(img)}
                    >
                      <Image size={10} /> Download PNG
                    </button>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', marginTop: 2, fontSize: 10 }}>Not generated</div>
                  )}
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
