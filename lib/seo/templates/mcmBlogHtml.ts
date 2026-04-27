/**
 * MCM Blog HTML Template
 *
 * Converts markdown content into Shopify-ready HTML matching
 * the massagechairsandmore.com blog format.
 *
 * CSS class convention:
 *   .mcm-blog-wrap        — outer wrapper
 *   .mcm-intro-cta        — intro CTA box (after first few paragraphs)
 *   .mcm-cta-box           — mid/end CTA box
 *   .mcm-compare-table-wrap — comparison table wrapper
 *   .mcm-faq-item          — FAQ question/answer block
 */

// ─── CSS ─────────────────────────────────────────────────────────────────────

export const MCM_BLOG_CSS = `
<style>
  .mcm-blog-wrap {
    max-width: 760px;
    margin: 0 auto;
    color: #222;
    font-size: 17px;
    line-height: 1.85;
    text-align: left;
  }

  .mcm-blog-wrap p {
    margin: 0 0 20px;
  }

  .mcm-blog-wrap h1,
  .mcm-blog-wrap h2,
  .mcm-blog-wrap h3 {
    color: #111;
    font-weight: 700;
    letter-spacing: 0;
  }

  .mcm-blog-wrap h1 {
    font-size: 34px;
    line-height: 1.2;
    margin: 0 0 22px;
  }

  .mcm-blog-wrap h2 {
    font-size: 28px;
    line-height: 1.3;
    margin: 42px 0 16px;
  }

  .mcm-blog-wrap h3 {
    font-size: 22px;
    line-height: 1.35;
    margin: 28px 0 12px;
  }

  .mcm-blog-wrap ul,
  .mcm-blog-wrap ol {
    margin: 0 0 24px 24px;
    padding: 0;
  }

  .mcm-blog-wrap li {
    margin-bottom: 10px;
  }

  .mcm-blog-wrap a {
    color: #222;
    font-weight: 700;
  }

  .mcm-blog-wrap img {
    width: 100%;
    height: auto;
    display: block;
    margin: 32px 0;
  }

  .mcm-blog-wrap .mcm-intro-cta,
  .mcm-blog-wrap .mcm-cta-box {
    margin: 32px 0;
    padding: 22px 24px;
    border: 1px solid #e8e8e8;
    background: #fafafa;
  }

  .mcm-blog-wrap .mcm-compare-table-wrap {
    overflow-x: auto;
    margin: 28px 0 34px;
  }

  .mcm-blog-wrap table {
    width: 100%;
    border-collapse: collapse;
    font-size: 15px;
    line-height: 1.65;
  }

  .mcm-blog-wrap th,
  .mcm-blog-wrap td {
    border: 1px solid #e8e8e8;
    padding: 14px;
    text-align: left;
    vertical-align: top;
  }

  .mcm-blog-wrap th {
    background: #f8f8f8;
    font-weight: 700;
    color: #111;
  }

  .mcm-blog-wrap .mcm-faq-item {
    margin: 0 0 28px;
    padding: 0 0 20px;
    border-bottom: 1px solid #ececec;
  }

  .mcm-blog-wrap .mcm-faq-item strong {
    display: block;
    margin-bottom: 10px;
    font-size: 18px;
    line-height: 1.5;
    color: #111;
  }
</style>`;

// ─── Markdown → MCM HTML Converter ───────────────────────────────────────────

/**
 * Converts markdown content to MCM Shopify blog HTML.
 *
 * Handles:
 * - # / ## / ### headings
 * - **bold** text
 * - [anchor](url) links
 * - Unordered lists (- item)
 * - Ordered lists (1. item)
 * - Markdown tables (| col | col |)
 * - <!-- FAQ_START --> / <!-- FAQ_END --> FAQ sections
 * - CTA detection (paragraphs containing "visit" + store/showroom links)
 * - Image tags (existing <img> or markdown ![alt](url))
 */
export function markdownToMCMHtml(
  markdown: string,
  title: string,
  images?: Array<{ imageUrl: string; altText: string; placementRecommendation?: string }>,
): string {
  const lines = markdown.split('\n');
  const htmlParts: string[] = [];
  let inFaq = false;
  let inUl = false;
  let inOl = false;
  let inTable = false;
  let tableHeaders: string[] = [];
  let ctaCount = 0; // track CTA boxes: first = mcm-intro-cta, rest = mcm-cta-box
  let h2Count = 0;
  let imageIdx = 0;

  const closeLists = () => {
    if (inUl) { htmlParts.push('</ul>'); inUl = false; }
    if (inOl) { htmlParts.push('</ol>'); inOl = false; }
  };

  const closeTable = () => {
    if (inTable) { htmlParts.push('</tbody></table></div>'); inTable = false; tableHeaders = []; }
  };

  // Inline formatting: bold, links
  const inlineFormat = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  };

  // Detect CTA-like paragraphs (contain store/showroom visit links)
  const isCTAParagraph = (text: string): boolean => {
    const lower = text.toLowerCase();
    return (
      (lower.includes('visit') || lower.includes('showroom') || lower.includes('schedule') || lower.includes('book')) &&
      (lower.includes('store') || lower.includes('our-stores') || lower.includes('showroom') || lower.includes('contact') || lower.includes('appointment'))
    );
  };

  // Should we insert an image after this h2?
  const shouldInsertImage = (): boolean => {
    if (!images || images.length === 0) return false;
    // Insert images after h2 #2 and #5 (or every 3rd h2)
    return h2Count === 2 || h2Count === 5;
  };

  const insertImage = (): string => {
    if (!images || imageIdx >= images.length) return '';
    const img = images[imageIdx++];
    if (!img.imageUrl) return '';
    return `<img src="${img.imageUrl}" alt="${img.altText || ''}">`;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Skip empty lines (they're handled by paragraph breaks)
    if (!trimmed) {
      closeLists();
      closeTable();
      continue;
    }

    // FAQ markers
    if (trimmed === '<!-- FAQ_START -->') { closeLists(); closeTable(); inFaq = true; continue; }
    if (trimmed === '<!-- FAQ_END -->') { inFaq = false; continue; }
    // HOWTO markers — just skip
    if (trimmed === '<!-- HOWTO_START -->' || trimmed === '<!-- HOWTO_END -->') continue;

    // Horizontal rules
    if (/^---+$/.test(trimmed)) { closeLists(); closeTable(); continue; }

    // H1
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      closeLists(); closeTable();
      // Skip H1 if it matches the title (already placed)
      const h1Text = inlineFormat(trimmed.slice(2));
      if (h1Text.replace(/<[^>]+>/g, '').trim().toLowerCase() !== title.toLowerCase()) {
        htmlParts.push(`<h1>${h1Text}</h1>`);
      }
      continue;
    }

    // H2
    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      closeLists(); closeTable();
      h2Count++;
      const h2Text = inlineFormat(trimmed.slice(3));

      // Check if this is the FAQ heading
      if (h2Text.toLowerCase().includes('faq') || h2Text.toLowerCase().includes('frequently asked')) {
        htmlParts.push(`<h2>${h2Text}</h2>`);
        inFaq = true;
        continue;
      }

      // Insert image before certain h2s
      if (shouldInsertImage()) {
        const imgHtml = insertImage();
        if (imgHtml) htmlParts.push(imgHtml);
      }

      htmlParts.push(`<h2>${h2Text}</h2>`);
      continue;
    }

    // H3
    if (trimmed.startsWith('### ')) {
      closeLists(); closeTable();
      htmlParts.push(`<h3>${inlineFormat(trimmed.slice(4))}</h3>`);
      continue;
    }

    // Table detection (markdown table: | col | col |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      closeLists();
      const cells = trimmed.split('|').filter(c => c.trim()).map(c => inlineFormat(c.trim()));

      // Check if next line is separator (|---|---|)
      const nextLine = (lines[i + 1] || '').trim();
      const isSeparator = /^\|[\s-:|]+\|$/.test(nextLine);

      if (!inTable && isSeparator) {
        // This is the header row
        tableHeaders = cells;
        htmlParts.push('<div class="mcm-compare-table-wrap"><table><thead><tr>');
        for (const cell of cells) htmlParts.push(`<th>${cell}</th>`);
        htmlParts.push('</tr></thead><tbody>');
        inTable = true;
        i++; // skip separator line
        continue;
      }

      if (inTable) {
        // Data row
        htmlParts.push('<tr>');
        for (const cell of cells) htmlParts.push(`<td>${cell}</td>`);
        htmlParts.push('</tr>');
        continue;
      }
    } else if (inTable) {
      closeTable();
    }

    // Unordered list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      closeTable();
      if (!inUl) { if (inOl) { htmlParts.push('</ol>'); inOl = false; } htmlParts.push('<ul>'); inUl = true; }
      htmlParts.push(`<li>${inlineFormat(trimmed.slice(2))}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      closeTable();
      if (!inOl) { if (inUl) { htmlParts.push('</ul>'); inUl = false; } htmlParts.push('<ol>'); inOl = true; }
      htmlParts.push(`<li>${inlineFormat(olMatch[2])}</li>`);
      continue;
    }

    // Close lists for any other content
    closeLists();

    // Blockquote (> text) — render as CTA box or paragraph
    if (trimmed.startsWith('> ')) {
      const quoteText = inlineFormat(trimmed.slice(2));
      if (isCTAParagraph(quoteText)) {
        const cls = ctaCount === 0 ? 'mcm-intro-cta' : 'mcm-cta-box';
        ctaCount++;
        htmlParts.push(`<div class="${cls}"><p>${quoteText}</p></div>`);
      } else {
        htmlParts.push(`<p><em>${quoteText}</em></p>`);
      }
      continue;
    }

    // FAQ item detection (in FAQ mode)
    if (inFaq) {
      // Q: or **Q:** or bold question
      const qMatch = trimmed.match(/^(?:\*\*)?Q:\s*(.+?)(?:\*\*)?$/);
      const boldQMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
      if (qMatch || boldQMatch) {
        const question = qMatch ? qMatch[1] : boldQMatch![1];
        // Collect the answer (next non-empty lines until next Q or end)
        const answerLines: string[] = [];
        while (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (!nextLine) { i++; continue; }
          if (/^(?:\*\*)?Q:/.test(nextLine) || /^\*\*.+\*\*$/.test(nextLine)) break;
          // A: prefix
          const aMatch = nextLine.match(/^A:\s*(.+)$/);
          answerLines.push(inlineFormat(aMatch ? aMatch[1] : nextLine));
          i++;
        }
        htmlParts.push(`<div class="mcm-faq-item">`);
        htmlParts.push(`<strong>${inlineFormat(question)}</strong>`);
        htmlParts.push(`<p>${answerLines.join(' ')}</p>`);
        htmlParts.push(`</div>`);
        continue;
      }
    }

    // Markdown image: ![alt](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      htmlParts.push(`<img src="${imgMatch[2]}" alt="${imgMatch[1]}">`);
      continue;
    }

    // Existing HTML image tag — pass through
    if (trimmed.startsWith('<img ')) {
      htmlParts.push(trimmed);
      continue;
    }

    // Regular paragraph
    const formatted = inlineFormat(trimmed);

    // Check if this paragraph is a CTA (mentions store/showroom visit)
    if (isCTAParagraph(formatted)) {
      const cls = ctaCount === 0 ? 'mcm-intro-cta' : 'mcm-cta-box';
      ctaCount++;
      htmlParts.push(`<div class="${cls}"><p>${formatted}</p></div>`);
      continue;
    }

    htmlParts.push(`<p>${formatted}</p>`);
  }

  // Close any open elements
  closeLists();
  closeTable();

  return htmlParts.join('\n');
}

// ─── Full HTML Document Builder ──────────────────────────────────────────────

export function buildMCMBlogHtml(
  markdown: string,
  title: string,
  images?: Array<{ imageUrl: string; altText: string; placementRecommendation?: string }>,
): string {
  const bodyHtml = markdownToMCMHtml(markdown, title, images);

  return `${MCM_BLOG_CSS}
<div class="mcm-blog-wrap">
<h1>${title}</h1>
${bodyHtml}
</div>`;
}
