'use client';

import { useState } from 'react';
import type { SEOProject } from '@/lib/seo/types';
import type { SEOWorkspace, WorkspaceContentTopic, WorkspacePersona } from '@/lib/seo/workspaceTypes';
import { useSEOStore } from '@/store/seoStore';
import { CONTENT_PHASES, CONTENT_FORMATS, CONTENT_GOALS, type ContentFormatType } from '@/lib/seo/contentFlowTypes';
import { MCM_WORKSPACE_ID } from '@/lib/seo/seeds/mcm';
import { HOMC_WORKSPACE_ID } from '@/lib/seo/seeds/homc';
import { MCM_PERSONA_TOPIC_MAP } from '@/lib/seo/seeds/mcmPersonaTopics';
import { HOMC_PERSONA_TOPIC_MAP } from '@/lib/seo/seeds/homcPersonaTopics';
import { buildMCMBlogHtml } from '@/lib/seo/templates/mcmBlogHtml';
import { buildHOMCBlogHtml } from '@/lib/seo/templates/homcBlogHtml';
import { AIStep } from './AIStep';
import { ChevronLeft, ChevronRight, Check, RotateCcw, Download, FileText } from 'lucide-react';
// ─── Inline Formatting Parser for DOCX ───────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseInlineFormatting(text: string, TextRun: any, ExternalHyperlink: any): any[] {
  const result: unknown[] = [];
  // Split by **bold** and [link](url) patterns
  const pattern = /(\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add plain text before match
    if (match.index > lastIndex) {
      result.push(new TextRun({ text: text.slice(lastIndex, match.index) }));
    }
    if (match[2]) {
      // **bold**
      result.push(new TextRun({ text: match[2], bold: true }));
    } else if (match[3] && match[4]) {
      // [link text](url)
      result.push(new ExternalHyperlink({
        link: match[4],
        children: [new TextRun({ text: match[3], color: '2563EB', underline: {} })],
      }));
    }
    lastIndex = match.index + match[0].length;
  }
  // Remaining text
  if (lastIndex < text.length) {
    result.push(new TextRun({ text: text.slice(lastIndex) }));
  }
  if (result.length === 0) {
    result.push(new TextRun({ text }));
  }
  return result;
}

// ─── Content Marker Cleanup ──────────────────────────────────────────────────
// Strips leftover AI pipeline markers that sometimes persist into final content.

function cleanContentMarkers(raw: string): string {
  let c = raw;
  // Remove [IMAGE_OPPORTUNITY: ...] markers entirely (images handled separately)
  c = c.replace(/\[IMAGE_OPPORTUNITY:\s*[^\]]*\]/g, '');
  // Remove [INTERNAL_LINK_OPPORTUNITY: anchor | reason] — keep anchor text
  c = c.replace(/\[INTERNAL_LINK_OPPORTUNITY:\s*([^|\]]+)(?:\|[^\]]*)?\]/g, '$1');
  // Remove [EXTERNAL_LINK_OPPORTUNITY: claim | reason] — keep claim text
  c = c.replace(/\[EXTERNAL_LINK_OPPORTUNITY:\s*([^|\]]+)(?:\|[^\]]*)?\]/g, '$1');
  // Remove [IMAGE: ...] markers from mock content generation
  c = c.replace(/\[IMAGE:\s*[^\]]*\]/g, '');
  // Remove [LINK: anchor|url] markers not yet converted to markdown links
  c = c.replace(/\[LINK:\s*([^|\]]+)\|([^\]]+)\]/g, '[$1]($2)');
  // Clean up excessive blank lines left by removed markers
  c = c.replace(/\n{3,}/g, '\n\n');
  return c.trim();
}

// ─── Final Preview & Export (Step 13) ────────────────────────────────────────

function FinalPreview({ project, workspace, persona, topic }: {
  project: SEOProject;
  workspace: SEOWorkspace;
  persona: WorkspacePersona | undefined;
  topic: WorkspaceContentTopic | undefined;
}) {
  const { updateProjectField } = useSEOStore();
  const pid = project.id;
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [isScheduled, setIsScheduled] = useState(project.status === 'scheduled');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = project as any;
  const article = p.generatedArticle?.article ?? p.generatedArticle ?? {};
  const rawContent = p.linkedContent ?? article?.content ?? p.rawContent ?? '';
  const content = typeof rawContent === 'string' ? cleanContentMarkers(rawContent) : rawContent;
  const title = article?.title ?? article?.metaTitle ?? p.name ?? '';
  const metaDesc = article?.metaDescription ?? '';
  const slug = article?.slug ?? '';
  const wordCount = article?.wordCount ?? (typeof content === 'string' ? content.split(/\s+/).length : 0);

  // Images
  const imgs = p.generatedImages?.generatedImages ?? p.finalOutput?.generatedImages ?? [];
  // Links
  const intLinks = p.internalLinkPlan?.internalLinkPlan ?? [];
  const extLinks = p.externalLinkPlan?.externalLinkPlan ?? [];
  // Keyword
  const kw = p.keywordStrategy?.primaryKeyword;
  const pkName = typeof kw === 'string' ? kw : kw?.keyword ?? '';

  const handleSchedule = () => {
    if (!scheduleDate) return;
    updateProjectField(pid, 'scheduledDate', scheduleDate);
    updateProjectField(pid, 'status', 'scheduled');
    setIsScheduled(true);
    setShowScheduler(false);
  };

  const exportDocx = async () => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, ExternalHyperlink, AlignmentType, BorderStyle } = await import('docx');

    // Parse content into paragraphs with formatting
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    const contentParagraphs: InstanceType<typeof Paragraph>[] = [];

    for (const line of contentStr.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) { contentParagraphs.push(new Paragraph({ text: '' })); continue; }

      // Headings
      if (trimmed.startsWith('### ')) {
        contentParagraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: parseInlineFormatting(trimmed.slice(4), TextRun, ExternalHyperlink) }));
      } else if (trimmed.startsWith('## ')) {
        contentParagraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: parseInlineFormatting(trimmed.slice(3), TextRun, ExternalHyperlink) }));
      } else if (trimmed.startsWith('# ')) {
        contentParagraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: parseInlineFormatting(trimmed.slice(2), TextRun, ExternalHyperlink) }));
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        contentParagraphs.push(new Paragraph({ bullet: { level: 0 }, children: parseInlineFormatting(trimmed.slice(2), TextRun, ExternalHyperlink) }));
      } else {
        contentParagraphs.push(new Paragraph({ children: parseInlineFormatting(trimmed, TextRun, ExternalHyperlink), spacing: { after: 120 } }));
      }
    }

    // SEO Meta section
    const metaSection = [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: title, bold: true, size: 56 })] }),
      new Paragraph({ children: [new TextRun({ text: `Slug: /${slug}`, color: '666666', size: 20 })], spacing: { after: 40 } }),
      metaDesc ? new Paragraph({ children: [new TextRun({ text: `Meta Description: ${metaDesc}`, italics: true, color: '666666', size: 20 })], spacing: { after: 40 } }) : null,
      new Paragraph({ children: [
        new TextRun({ text: `${wordCount} words`, size: 20, color: '666666' }),
        new TextRun({ text: ` · Primary Keyword: ${pkName}`, size: 20, color: '2563EB', bold: true }),
        persona ? new TextRun({ text: ` · Persona: ${persona.name}`, size: 20, color: '666666' }) : null,
      ].filter(Boolean) as InstanceType<typeof TextRun>[], spacing: { after: 80 } }),
      new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' } }, spacing: { after: 200 } }),
    ].filter(Boolean) as InstanceType<typeof Paragraph>[];

    // Internal links section
    const intLinkSection: InstanceType<typeof Paragraph>[] = [];
    if (Array.isArray(intLinks) && intLinks.length > 0) {
      intLinkSection.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: `🔗 Internal Links (${intLinks.length})`, bold: true })] }));
      for (const l of intLinks as Record<string, string>[]) {
        intLinkSection.push(new Paragraph({ bullet: { level: 0 }, children: [
          new ExternalHyperlink({ link: l.targetUrl, children: [new TextRun({ text: l.anchorText, color: '2563EB', underline: {} })] }),
          new TextRun({ text: ` → ${l.targetUrl}`, color: '999999', size: 18 }),
          l.placementSection ? new TextRun({ text: ` (${l.placementSection})`, italics: true, color: '999999', size: 18 }) : null,
        ].filter(Boolean) as (InstanceType<typeof TextRun> | InstanceType<typeof ExternalHyperlink>)[] }));
      }
      intLinkSection.push(new Paragraph({ text: '' }));
    }

    // External links section
    const extLinkSection: InstanceType<typeof Paragraph>[] = [];
    if (Array.isArray(extLinks) && extLinks.length > 0) {
      extLinkSection.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: `🌐 External Links (${extLinks.length})`, bold: true })] }));
      for (const l of extLinks as Record<string, string>[]) {
        extLinkSection.push(new Paragraph({ bullet: { level: 0 }, children: [
          new ExternalHyperlink({ link: l.targetUrl, children: [new TextRun({ text: l.anchorText, color: '2563EB', underline: {} })] }),
          new TextRun({ text: ` → ${l.targetUrl}`, color: '999999', size: 18 }),
        ] }));
      }
      extLinkSection.push(new Paragraph({ text: '' }));
    }

    // Images section
    const imgSection: InstanceType<typeof Paragraph>[] = [];
    if (Array.isArray(imgs) && imgs.length > 0) {
      imgSection.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: `🖼️ Images (${imgs.length})`, bold: true })] }));
      for (const img of imgs as Record<string, string>[]) {
        imgSection.push(new Paragraph({ children: [
          new TextRun({ text: `[${img.imagePurpose}] `, bold: true }),
          new TextRun({ text: img.altText }),
        ], spacing: { after: 40 } }));
        imgSection.push(new Paragraph({ children: [
          new TextRun({ text: `URL: ${img.imageUrl}`, color: '2563EB', size: 18 }),
          new TextRun({ text: ` | File: ${img.recommendedFileName}`, color: '999999', size: 18 }),
        ], spacing: { after: 120 } }));
      }
    }

    const doc = new Document({
      creator: 'NxFlow SEO',
      title: title,
      description: metaDesc,
      sections: [{
        properties: {},
        children: [...metaSection, ...contentParagraphs, ...intLinkSection, ...extLinkSection, ...imgSection],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug || 'content'}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportHtml = () => {
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

    // MCM workspace — use branded Shopify blog template
    if (workspace.id === MCM_WORKSPACE_ID || workspace.id === 'mcm-ws-001') {
      const imageList = Array.isArray(imgs) ? imgs.map((img: Record<string, string>) => ({
        imageUrl: img.imageUrl ?? '',
        altText: img.altText ?? '',
        placementRecommendation: img.placementRecommendation ?? '',
      })) : [];

      const html = buildMCMBlogHtml(contentStr, title, imageList);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug || 'content'}.html`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // HOMC workspace — use HOMC branded Shopify blog template
    if (workspace.id === HOMC_WORKSPACE_ID || workspace.id === 'homc-default') {
      const imageList = Array.isArray(imgs) ? imgs.map((img: Record<string, string>) => ({
        imageUrl: img.imageUrl ?? '',
        altText: img.altText ?? '',
        placementRecommendation: img.placementRecommendation ?? '',
      })) : [];

      const html = buildHOMCBlogHtml(contentStr, title, imageList);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug || 'content'}.html`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // Generic export for other workspaces
    let htmlContent = contentStr
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;line-height:1.8;color:#222;}
      h1{font-size:28px;} h2{font-size:22px;color:#444;border-bottom:1px solid #ddd;padding-bottom:4px;}
      a{color:#2563eb;} strong{font-weight:700;}
      .meta{color:#888;font-size:14px;margin-bottom:20px;}</style></head><body>
      <h1>${title}</h1><p>${htmlContent}</p></body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug || 'content'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="seo-card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#00c875', margin: '0 0 4px' }}>📦 Final Content Preview</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Review your complete content with links and images before export.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="seo-btn seo-btn-ghost" onClick={exportHtml} style={{ fontSize: 11 }}>
            <FileText size={12} /> HTML
          </button>
          <button className="seo-btn seo-btn-primary" onClick={exportDocx} style={{ fontSize: 11 }}>
            <Download size={12} /> Export .DOC
          </button>
        </div>
      </div>

      {/* Meta info */}
      <div style={{ padding: 10, borderRadius: 6, background: '#1e293b', marginBottom: 12, fontSize: 11 }}>
        {title && <div style={{ fontWeight: 700, fontSize: 16, color: '#00c875', marginBottom: 4 }}>{title}</div>}
        {slug && <div style={{ color: '#60a5fa' }}>/{slug}</div>}
        {metaDesc && <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>{metaDesc}</div>}
        <div style={{ color: '#94a3b8', marginTop: 4 }}>📝 {wordCount} words · 🔑 {pkName} {persona ? `· 👤 ${persona.name}` : ''}</div>
      </div>


      {/* Content — rendered as formatted article */}
      <div
        className="final-content-preview"
        style={{
          maxHeight: 600, overflow: 'auto', lineHeight: 1.9, padding: '24px 28px',
          background: '#0f172a', borderRadius: 10, fontSize: 15, marginBottom: 16,
          color: '#e2e8f0', fontFamily: 'Georgia, "Times New Roman", serif',
          border: '1px solid #1e293b',
        }}
        dangerouslySetInnerHTML={{
          __html: (typeof content === 'string' ? content : JSON.stringify(content, null, 2))
            .replace(/^### (.+)$/gm, '<h3 style="font-size:18px;font-weight:700;color:#f1f5f9;margin:20px 0 8px;font-family:Inter,system-ui,sans-serif;">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 style="font-size:22px;font-weight:700;color:#f1f5f9;margin:28px 0 10px;font-family:Inter,system-ui,sans-serif;border-bottom:1px solid #334155;padding-bottom:6px;">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 style="font-size:28px;font-weight:800;color:#fff;margin:32px 0 12px;font-family:Inter,system-ui,sans-serif;">$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f1f5f9;font-weight:700;">$1</strong>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#60a5fa;text-decoration:underline;" target="_blank">$1</a>')
            .replace(/^- (.+)$/gm, '<li style="margin:4px 0;padding-left:4px;">$1</li>')
            .replace(/(<li.*<\/li>\n?)+/g, (m) => `<ul style="margin:8px 0 8px 16px;padding-left:16px;">${m}</ul>`)
            .replace(/\n\n/g, '</p><p style="margin:12px 0;">')
            .replace(/\n/g, '<br/>')
        }}
      />

      {/* Images grid */}
      {Array.isArray(imgs) && imgs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--text-primary)' }}>🖼️ Generated Images ({imgs.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {imgs.map((img: Record<string, string>, i: number) => (
              <div key={i} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.04)' }}>
                <img src={img.imageUrl} alt={img.altText} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                <div style={{ padding: 6, fontSize: 10 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{img.imagePurpose}</div>
                  <div style={{ color: '#94a3b8' }}>{img.altText}</div>
                  <div style={{ color: '#60a5fa', fontSize: 9 }}>{img.recommendedFileName}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Links summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {Array.isArray(intLinks) && intLinks.length > 0 && (
          <div style={{ padding: 10, borderRadius: 6, background: 'rgba(0,200,117,0.04)', border: '1px solid rgba(0,200,117,0.15)' }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: '#00c875', marginBottom: 6 }}>🔗 {intLinks.length} Internal Links</div>
            {intLinks.slice(0, 6).map((l: Record<string, string>, i: number) => (
              <div key={i} style={{ fontSize: 10, marginBottom: 3 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.anchorText}</span>
                <span style={{ color: '#60a5fa', marginLeft: 4 }}>{l.targetUrl}</span>
              </div>
            ))}
          </div>
        )}
        {Array.isArray(extLinks) && extLinks.length > 0 && (
          <div style={{ padding: 10, borderRadius: 6, background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.15)' }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: '#60a5fa', marginBottom: 6 }}>🌐 {extLinks.length} External Links</div>
            {extLinks.slice(0, 6).map((l: Record<string, string>, i: number) => (
              <div key={i} style={{ fontSize: 10, marginBottom: 3 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.anchorText}</span>
                <span style={{ color: '#60a5fa', marginLeft: 4 }}>{l.targetUrl}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action bar */}
      {isScheduled ? (
        <div style={{ padding: 16, borderRadius: 8, background: '#065f46', border: '1px solid #00c875', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#00c875', marginBottom: 4 }}>✅ Scheduled!</div>
          <div style={{ fontSize: 12, color: '#6ee7b7' }}>
            This content is scheduled for <strong>{new Date(project.scheduledDate ?? '').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Return to workspace to manage scheduled posts.</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
            <button className="seo-btn seo-btn-ghost" onClick={exportDocx} style={{ fontSize: 11 }}>
              <Download size={12} /> Download .DOCX
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Schedule section */}
          {showScheduler ? (
            <div style={{ padding: 14, borderRadius: 8, background: '#1e293b', border: '1px solid #3730a3' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#818cf8', marginBottom: 8 }}>📅 Schedule This Post</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13 }}
                />
                <button
                  className="seo-btn seo-btn-primary"
                  onClick={handleSchedule}
                  disabled={!scheduleDate}
                  style={{ background: scheduleDate ? '#6366f1' : '#334155', border: 'none', fontWeight: 700, opacity: scheduleDate ? 1 : 0.5 }}
                >
                  <Check size={14} /> Confirm Schedule
                </button>
                <button className="seo-btn seo-btn-ghost" onClick={() => setShowScheduler(false)} style={{ fontSize: 11 }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: 12, borderRadius: 8, background: '#1e1e2e', border: '1px solid var(--border-subtle)' }}>
              <button className="seo-btn seo-btn-primary" onClick={exportDocx} style={{ background: '#00c875', border: 'none', fontWeight: 700 }}>
                <Download size={14} /> Download .DOCX
              </button>
              <button className="seo-btn seo-btn-primary" onClick={() => setShowScheduler(true)} style={{ background: '#6366f1', border: 'none', fontWeight: 700 }}>
                📅 Schedule This Post
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  project: SEOProject;
  workspace: SEOWorkspace;
  onBack: () => void;
}

// ─── Phase Nav (horizontal stepper) ──────────────────────────────────────────

function WizardNav({ step, maxStep }: { step: number; maxStep: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
      {CONTENT_PHASES.map((p) => {
        const done = p.step < step;
        const active = p.step === step;
        const locked = p.step > maxStep;
        return (
          <div key={p.step} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
            borderRadius: 6, fontSize: 11, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap',
            background: active ? '#3730a3' : done ? 'rgba(0,200,117,0.08)' : 'transparent',
            color: active ? '#c7d2fe' : done ? '#00c875' : locked ? 'var(--text-muted)' : 'var(--text-secondary)',
            border: active ? '1px solid #6366f1' : '1px solid transparent',
            opacity: locked ? 0.4 : 1,
          }}>
            <span style={{ fontSize: 13 }}>{done ? '✓' : p.icon}</span>
            <span>{p.shortLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Step Wrapper ────────────────────────────────────────────────────────────

function StepCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="seo-card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>{title}</h3>
      {subtitle && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>{subtitle}</p>}
      {children}
    </div>
  );
}

// ─── Radio Option ────────────────────────────────────────────────────────────

function RadioOption({ selected, label, sub, badge, badgeColor, onClick }: {
  selected: boolean; label: string; sub?: string; badge?: string; badgeColor?: string; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6,
      fontSize: 12, textAlign: 'left', width: '100%', cursor: 'pointer', transition: 'all 0.12s',
      border: selected ? '1.5px solid var(--accent)' : '1px solid var(--border-subtle)',
      background: selected ? 'rgba(129,140,248,0.08)' : 'transparent', color: 'var(--text-primary)',
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: 8, flexShrink: 0,
        border: selected ? '5px solid var(--accent)' : '2px solid var(--border)',
        background: selected ? '#fff' : 'transparent',
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 12 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>{sub}</div>}
      </div>
      {badge && (
        <span style={{
          fontSize: 9, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
          background: badgeColor === 'red' ? 'rgba(239,68,68,0.12)' : badgeColor === 'yellow' ? 'rgba(253,171,61,0.12)' : 'rgba(0,200,117,0.08)',
          color: badgeColor === 'red' ? '#f87171' : badgeColor === 'yellow' ? '#fdab3d' : '#00c875',
        }}>{badge}</span>
      )}
    </button>
  );
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

export function ContentCreationWizard({ project, workspace, onBack }: Props) {
  const { updateProjectField } = useSEOStore();
  const pid = project.id;

  // Calculate initial step — skip steps already completed during project creation
  const initialStep = (() => {
    if (project.targetPersonaId && project.targetTopicId && project.selectedPlatformFormat) return 4;
    if (project.targetPersonaId && project.targetTopicId) return 3;
    if (project.targetPersonaId) return 2;
    return 1;
  })();

  const [step, setStep] = useState(initialStep);
  const [maxStep, setMaxStep] = useState(initialStep);

  // Local selections (persisted to store on advance)
  const [personaId, setPersonaId] = useState<string | null>(project.targetPersonaId);
  const [topicId, setTopicId] = useState<string | null>(project.targetTopicId);
  const [platformFormat, setPlatformFormat] = useState<string | null>(project.selectedPlatformFormat);
  const [contentGoal, setContentGoal] = useState<string>(project.contentGoal ?? '');
  const [customGoal, setCustomGoal] = useState('');

  // Derived
  const isMCM = workspace.id === MCM_WORKSPACE_ID;
  const isHOMC = workspace.id === HOMC_WORKSPACE_ID;
  const isSeedWorkspace = isMCM || isHOMC;
  const persona: WorkspacePersona | undefined = workspace.personas.find((p) => p.id === personaId);
  const topic: WorkspaceContentTopic | undefined = workspace.contentTopics.find((t) => (t.topicId ?? t.id) === topicId);

  const getPersonaTopicMap = (): Record<string, string[]> => {
    if (isMCM) return MCM_PERSONA_TOPIC_MAP;
    if (isHOMC) return HOMC_PERSONA_TOPIC_MAP;
    return {};
  };

  const personaTopicMap = getPersonaTopicMap();
  const allowedTopicIds = isSeedWorkspace && personaId ? (personaTopicMap[personaId] ?? []) : [];
  const filteredTopics = isSeedWorkspace && personaId
    ? workspace.contentTopics.filter((t) => allowedTopicIds.includes(t.topicId ?? t.id))
    : workspace.contentTopics;

  // Navigation
  const canAdvance = (): boolean => {
    if (step === 1) return !!personaId;
    if (step === 2) return !!topicId;
    if (step === 3) return !!platformFormat;
    if (step === 4) return true; // optional
    return true;
  };

  const goNext = () => {
    if (!canAdvance()) return;
    // Persist to store
    if (step === 1) updateProjectField(pid, 'targetPersonaId', personaId);
    if (step === 2) updateProjectField(pid, 'targetTopicId', topicId);
    if (step === 3) updateProjectField(pid, 'selectedPlatformFormat', platformFormat);
    if (step === 4) updateProjectField(pid, 'contentGoal', contentGoal || customGoal || null);
    const next = step + 1;
    setStep(next);
    setMaxStep(Math.max(maxStep, next));
  };

  const goBack2 = () => { if (step > 1) setStep(step - 1); else onBack(); };

  const phase = CONTENT_PHASES[step - 1];

  // Smart goal defaults
  const getDefaultGoals = (): string[] => {
    const goals: string[] = [];
    if (topic) {
      const cluster = topic.topicCluster ?? topic.category;
      if (cluster?.includes('Local')) goals.push('Drive showroom visit', 'Generate local SEO traffic');
      if (cluster?.includes('Comparison') || cluster?.includes('Best')) goals.push('Compare models', 'Educate buyer');
      if (cluster?.includes('Price')) goals.push('Handle price objection', 'Reduce purchase risk');
      if (cluster?.includes('Warranty')) goals.push('Explain warranty/service', 'Reduce purchase risk');
      if (cluster?.includes('Brand') || cluster?.includes('Review')) goals.push('Build brand awareness', 'Book demo');
      if (cluster?.includes('Comfort') || cluster?.includes('Pain')) goals.push('Book demo', 'Educate buyer');
      if (cluster?.includes('Feature')) goals.push('Educate buyer', 'Compare models');
      if (cluster?.includes('Lifestyle') || cluster?.includes('Luxury')) goals.push('Build brand awareness', 'Drive showroom visit');
      if (cluster?.includes('AI Search')) goals.push('Generate local SEO traffic', 'Build brand awareness');
      if (cluster?.includes('Delivery') || cluster?.includes('Space')) goals.push('Reduce purchase risk');
    }
    // Fill with defaults
    for (const g of CONTENT_GOALS) { if (!goals.includes(g)) goals.push(g); }
    return goals.slice(0, 10);
  };



  return (
    <div>
      <WizardNav step={step} maxStep={maxStep} />

      {/* Step header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>{phase?.icon}</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            Step {step}: {phase?.label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Step {step} of {CONTENT_PHASES.length}
          </div>
        </div>
      </div>

      {/* ── STEP 1: Persona ── */}
      {step === 1 && (
        <StepCard title="Who is this content for?" subtitle="Select the target persona for this content piece.">
          <div style={{ maxHeight: 400, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {workspace.personas.length > 0 ? workspace.personas.map((p) => (
              <RadioOption
                key={p.id}
                selected={personaId === p.id}
                label={p.name}
                sub={p.shortDescription}
                badge={p.claimRiskLevel}
                badgeColor={p.claimRiskLevel === 'high' ? 'red' : p.claimRiskLevel === 'medium' ? 'yellow' : 'green'}
                onClick={() => { setPersonaId(p.id); setTopicId(null); }}
              />
            )) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No personas configured in this workspace.
              </div>
            )}
          </div>
        </StepCard>
      )}

      {/* ── STEP 2: Topic ── */}
      {step === 2 && (
        <StepCard title="What topic should this content cover?" subtitle={`Showing primary topics for ${persona?.name ?? 'selected persona'}.`}>
          {filteredTopics.length > 0 ? (
            <div style={{ maxHeight: 400, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filteredTopics.map((t) => (
                <RadioOption
                  key={t.topicId ?? t.id}
                  selected={topicId === (t.topicId ?? t.id)}
                  label={t.topicName ?? t.topic}
                  sub={[t.topicCluster ?? t.category, t.brandOrProductSignal, t.defaultSearchIntent].filter(Boolean).join(' · ')}
                  badge={t.claimRiskLevel}
                  badgeColor={t.claimRiskLevel === 'high' ? 'red' : t.claimRiskLevel === 'medium' ? 'yellow' : 'green'}
                  onClick={() => setTopicId(t.topicId ?? t.id)}
                />
              ))}
            </div>
          ) : (
            <div style={{
              padding: '12px 16px', borderRadius: 6, background: 'rgba(253,171,61,0.06)',
              border: '1px solid rgba(253,171,61,0.15)', color: '#fdab3d', fontSize: 12,
            }}>
              No primary topics configured for this persona.
            </div>
          )}
        </StepCard>
      )}

      {/* ── STEP 3: Platform / Format ── */}
      {step === 3 && (
        <StepCard title="Where will this content be published?" subtitle="Select the platform and format for this content.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            {CONTENT_FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPlatformFormat(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                  borderRadius: 6, fontSize: 12, textAlign: 'left', cursor: 'pointer',
                  border: platformFormat === f.id ? '1.5px solid var(--accent)' : '1px solid var(--border-subtle)',
                  background: platformFormat === f.id ? 'rgba(129,140,248,0.08)' : 'transparent',
                  color: 'var(--text-primary)', transition: 'all 0.12s',
                }}
              >
                <span style={{ fontSize: 18 }}>{f.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{f.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f.description}</div>
                </div>
              </button>
            ))}
          </div>
        </StepCard>
      )}

      {/* ── STEP 4: Content Goal ── */}
      {step === 4 && (
        <StepCard title="What is the goal of this content?" subtitle="Optional — smart defaults based on your selections. You can also type a custom goal.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            {getDefaultGoals().map((g) => (
              <RadioOption
                key={g}
                selected={contentGoal === g}
                label={g}
                onClick={() => { setContentGoal(g); setCustomGoal(''); }}
              />
            ))}
          </div>
          <div>
            <label className="seo-label" style={{ fontSize: 11 }}>Custom Goal (optional)</label>
            <input
              className="seo-input"
              value={customGoal}
              onChange={(e) => { setCustomGoal(e.target.value); setContentGoal(''); }}
              placeholder="Type a custom content goal..."
              style={{ fontSize: 12 }}
            />
          </div>
        </StepCard>
      )}

      {/* ── STEPS 5–12: Live AI Steps ── */}
      {step >= 5 && step <= 12 && (
        <AIStep
          key={step}
          step={step}
          phase={phase}
          workspace={workspace}
          project={project}
          persona={persona}
          topic={topic}
          platformFormat={platformFormat}
          contentGoal={contentGoal || customGoal}
          onApprove={(data) => {
            // Persist to project store
            if (step === 5) updateProjectField(pid, 'keywordStrategy', data);
            if (step === 6) updateProjectField(pid, 'contentBrief', data);
            if (step === 7) { updateProjectField(pid, 'rawContent', data?.content ?? data); updateProjectField(pid, 'generatedArticle', data); }
            if (step === 8) updateProjectField(pid, 'internalLinkPlan', data);
            if (step === 9) updateProjectField(pid, 'externalLinkPlan', data);
            if (step === 10) updateProjectField(pid, 'linkedContent', data?.content ?? data);
            if (step === 11) updateProjectField(pid, 'imagePlan', data);
            if (step === 12) { updateProjectField(pid, 'generatedImages', data); updateProjectField(pid, 'finalOutput', data); }
            goNext();
          }}
        />
      )}

      {/* ── STEP 13: Final Preview & DOCX Export ── */}
      {step === 13 && (
        <FinalPreview project={project} workspace={workspace} persona={persona} topic={topic} />
      )}

      {/* ── Navigation Footer ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <button className="seo-btn seo-btn-ghost" onClick={goBack2}>
          <ChevronLeft size={14} /> {step === 1 ? 'Back to Workspace' : 'Previous'}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {step <= 4 && (
            <button
              className="seo-btn seo-btn-primary"
              onClick={goNext}
              disabled={!canAdvance()}
            >
              Continue <ChevronRight size={14} />
            </button>
          )}
          {step > 4 && step < 13 && (
            <button className="seo-btn seo-btn-primary" onClick={goNext}>
              Next Step <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
