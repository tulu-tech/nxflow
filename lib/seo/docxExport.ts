import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  ExternalHyperlink, Table, TableRow, TableCell, WidthType,
  BorderStyle, AlignmentType,
} from 'docx';
import type { WorkspaceContent } from './workspaceTypes';

// ─── Markdown → DOCX Paragraph Conversion ──────────────────────────────────

interface ParsedRun { text: string; bold?: boolean; italic?: boolean; underline?: boolean; link?: string; }

function parseInlineFormatting(text: string): ParsedRun[] {
  const runs: ParsedRun[] = [];
  // Simple inline parser: **bold**, *italic*, __underline__, [text](url)
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIdx = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) runs.push({ text: text.slice(lastIdx, match.index) });
    if (match[1]) runs.push({ text: match[1], bold: true });
    else if (match[2]) runs.push({ text: match[2], italic: true });
    else if (match[3]) runs.push({ text: match[3], underline: true });
    else if (match[4] && match[5]) runs.push({ text: match[4], link: match[5] });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) runs.push({ text: text.slice(lastIdx) });
  if (runs.length === 0) runs.push({ text });
  return runs;
}

function runsToDocxChildren(runs: ParsedRun[]): (TextRun | ExternalHyperlink)[] {
  return runs.map(r => {
    if (r.link) {
      return new ExternalHyperlink({
        children: [new TextRun({ text: r.text, style: 'Hyperlink', color: '4472C4', underline: { type: 'single' } })],
        link: r.link,
      });
    }
    return new TextRun({
      text: r.text,
      bold: r.bold,
      italics: r.italic,
      underline: r.underline ? { type: 'single' } : undefined,
    });
  });
}

function markdownToParagraphs(md: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = md.split('\n');
  let inList = false;
  let listNumber = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { inList = false; listNumber = 0; continue; }

    // Headings
    if (trimmed.startsWith('# ')) {
      paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: runsToDocxChildren(parseInlineFormatting(trimmed.slice(2))) }));
      continue;
    }
    if (trimmed.startsWith('## ')) {
      paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: runsToDocxChildren(parseInlineFormatting(trimmed.slice(3))), spacing: { before: 240, after: 120 } }));
      continue;
    }
    if (trimmed.startsWith('### ')) {
      paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: runsToDocxChildren(parseInlineFormatting(trimmed.slice(4))), spacing: { before: 200, after: 80 } }));
      continue;
    }

    // Bullet list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      paragraphs.push(new Paragraph({
        children: runsToDocxChildren(parseInlineFormatting(trimmed.slice(2))),
        bullet: { level: 0 },
        spacing: { after: 40 },
      }));
      continue;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      listNumber++;
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: `${listNumber}. ` }), ...runsToDocxChildren(parseInlineFormatting(numMatch[2]))],
        spacing: { after: 40 },
        indent: { left: 360 },
      }));
      continue;
    }

    // Image placeholder
    if (trimmed.startsWith('![')) {
      const altMatch = trimmed.match(/!\[([^\]]*)\]/);
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: `[IMAGE: ${altMatch?.[1] ?? 'image'}]`, italics: true, color: '888888' })],
        spacing: { before: 120, after: 120 },
      }));
      continue;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: '────────────────────────────', color: 'CCCCCC' })] }));
      continue;
    }

    // Normal paragraph
    inList = false;
    listNumber = 0;
    paragraphs.push(new Paragraph({
      children: runsToDocxChildren(parseInlineFormatting(trimmed)),
      spacing: { after: 120 },
    }));
  }
  return paragraphs;
}

// ─── Metadata Table Builder ──────────────────────────────────────────────────

function metaRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({ width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })] }),
      new TableCell({ width: { size: 7200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: value, size: 20 })] })] }),
    ],
  });
}

// ─── Main Export Function ────────────────────────────────────────────────────

export async function generateContentDocx(content: WorkspaceContent, workspaceName: string): Promise<Blob> {
  const body = content.finalContent || content.linkedContent || content.rawContent || '';

  // Build CMS Copy Notes section
  const cmsNotes = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: '📋 CMS Copy Notes', bold: true })] }),
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: 'Use these values when publishing to your CMS:', italics: true, color: '666666', size: 20 })] }),
  ];

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' },
    },
    rows: [
      metaRow('Title / H1', content.contentTitle || '—'),
      metaRow('Meta Title', (content as unknown as Record<string, unknown>).metaTitle as string || content.contentTitle || '—'),
      metaRow('Meta Description', (content as unknown as Record<string, unknown>).metaDescription as string || content.contentPreview || '—'),
      metaRow('Slug', content.contentSlug || '—'),
      metaRow('Primary Keyword', content.primaryKeyword || '—'),
      metaRow('Keyword Tag', content.primaryKeywordTag || '—'),
      metaRow('Volume', content.primaryKeywordVolume != null ? String(content.primaryKeywordVolume) : '—'),
      metaRow('KD', content.primaryKeywordKD != null ? String(content.primaryKeywordKD) : '—'),
      metaRow('CPC', content.primaryKeywordCPC != null ? `$${content.primaryKeywordCPC}` : '—'),
      metaRow('Secondary Keywords', (content.secondaryKeywords ?? []).join(', ') || '—'),
      metaRow('Persona', content.selectedPersona || '—'),
      metaRow('Topic', content.selectedTopicName || '—'),
      metaRow('Platform / Format', content.selectedPlatformFormat || '—'),
      metaRow('Recommended CTA', (content as unknown as Record<string, unknown>).recommendedCTA as string || '—'),
      metaRow('Publish Platform', content.platform || '—'),
    ],
  });

  // Content body paragraphs
  const separator = [
    new Paragraph({ children: [] }),
    new Paragraph({ children: [new TextRun({ text: '════════════════════════════════════════', color: 'CCCCCC' })] }),
    new Paragraph({ children: [] }),
  ];

  const contentParagraphs = markdownToParagraphs(body);

  // Link plans section
  const linkSection: Paragraph[] = [];
  if (content.internalLinkPlan?.length > 0 || content.externalLinkPlan?.length > 0) {
    linkSection.push(
      ...separator,
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: '🔗 Link Plan Summary' })] }),
    );
    if (content.internalLinkPlan?.length > 0) {
      linkSection.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: 'Internal Links' })] }));
      for (const link of content.internalLinkPlan) {
        const url = (link as Record<string, string>).url || (link as Record<string, string>).targetUrl || '';
        const anchor = (link as Record<string, string>).anchorText || (link as Record<string, string>).anchor || url;
        linkSection.push(new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: `${anchor} → `, bold: true, size: 20 }),
            ...(url ? [new ExternalHyperlink({ children: [new TextRun({ text: url, color: '4472C4', underline: { type: 'single' }, size: 20 })], link: url })] : [new TextRun({ text: '(no URL)', size: 20 })]),
          ],
        }));
      }
    }
    if (content.externalLinkPlan?.length > 0) {
      linkSection.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: 'External Links' })] }));
      for (const link of content.externalLinkPlan) {
        const url = (link as Record<string, string>).url || (link as Record<string, string>).targetUrl || '';
        const anchor = (link as Record<string, string>).anchorText || (link as Record<string, string>).anchor || url;
        linkSection.push(new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({ text: `${anchor} → `, bold: true, size: 20 }),
            ...(url ? [new ExternalHyperlink({ children: [new TextRun({ text: url, color: '4472C4', underline: { type: 'single' }, size: 20 })], link: url })] : []),
          ],
        }));
      }
    }
  }

  // Image plan section
  const imageSection: Paragraph[] = [];
  if (content.imagePlan?.length > 0) {
    imageSection.push(
      ...separator,
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: '🖼️ Image Plan' })] }),
    );
    for (let i = 0; i < content.imagePlan.length; i++) {
      const img = content.imagePlan[i] as Record<string, string>;
      imageSection.push(new Paragraph({
        children: [
          new TextRun({ text: `Image ${i + 1}: `, bold: true }),
          new TextRun({ text: img.description || img.altText || img.placement || '—' }),
        ],
        spacing: { after: 40 },
      }));
      if (img.altText && img.altText !== img.description) {
        imageSection.push(new Paragraph({ children: [new TextRun({ text: `Alt: ${img.altText}`, italics: true, color: '888888', size: 18 })], spacing: { after: 80 } }));
      }
    }
  }

  // Generated images
  if (content.generatedImages?.length > 0) {
    imageSection.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: 'Generated Image URLs' })] }));
    for (const img of content.generatedImages) {
      const url = (img as Record<string, string>).imageUrl || (img as Record<string, string>).url || '';
      if (url) {
        imageSection.push(new Paragraph({
          bullet: { level: 0 },
          children: [new ExternalHyperlink({ children: [new TextRun({ text: url, color: '4472C4', underline: { type: 'single' }, size: 18 })], link: url })],
        }));
      }
    }
  }

  const doc = new Document({
    creator: workspaceName,
    title: content.contentTitle || 'Content Export',
    description: content.contentPreview || '',
    sections: [{
      children: [
        ...cmsNotes,
        metaTable,
        ...separator,
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: content.contentTitle || 'Content' })] }),
        ...contentParagraphs,
        ...linkSection,
        ...imageSection,
      ],
    }],
  });

  return await Packer.toBlob(doc);
}

// ─── File Name Builder ───────────────────────────────────────────────────────

export function buildDocxFileName(workspaceName: string, topicSlug: string): string {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  const date = new Date().toISOString().slice(0, 10);
  return `${slug(workspaceName)}-${slug(topicSlug || 'content')}-${date}.docx`;
}
