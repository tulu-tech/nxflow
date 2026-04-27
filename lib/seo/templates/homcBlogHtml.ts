/**
 * HOMC Blog HTML Template
 *
 * Converts markdown content into Shopify-ready HTML matching
 * the houseofmassagechairs.com blog format.
 *
 * CSS class convention:
 *   .homc-blog    — outer wrapper
 *   .faq-item     — FAQ question/answer block
 *
 * Key differences from MCM template:
 *   - System font stack (no serif)
 *   - No CTA box classes — store links appear inline in paragraphs
 *   - No table wrapper div — table sits directly in flow
 *   - Links inherit color, bold, no underline (hover underline)
 *   - Responsive @media breakpoint for mobile
 *   - FAQ uses <p><strong>Q</strong></p><p>A</p> pattern
 */

// ─── CSS ─────────────────────────────────────────────────────────────────────

export const HOMC_BLOG_CSS = `
<style>
  .homc-blog {
    max-width: 760px;
    margin: 0 auto;
    padding: 0 16px;
    color: #222;
    text-align: left;
    line-height: 1.75;
    font-size: 17px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  }

  .homc-blog h1 {
    font-size: 34px;
    line-height: 1.25;
    font-weight: 700;
    color: #111;
    margin: 0 0 26px 0;
  }

  .homc-blog h2 {
    font-size: 26px;
    line-height: 1.35;
    font-weight: 700;
    color: #111;
    margin: 42px 0 16px 0;
  }

  .homc-blog h3 {
    font-size: 21px;
    line-height: 1.4;
    font-weight: 700;
    color: #111;
    margin: 28px 0 12px 0;
  }

  .homc-blog p {
    margin: 0 0 20px 0;
  }

  .homc-blog ul,
  .homc-blog ol {
    margin: 0 0 22px 24px;
    padding: 0;
  }

  .homc-blog li {
    margin: 0 0 10px 0;
  }

  .homc-blog a {
    color: inherit;
    font-weight: 700;
    text-decoration: none;
  }

  .homc-blog a:hover {
    text-decoration: underline;
  }

  .homc-blog img {
    width: 100%;
    height: auto;
    display: block;
    margin: 32px 0;
  }

  .homc-blog table {
    width: 100%;
    border-collapse: collapse;
    margin: 28px 0;
    font-size: 15px;
    line-height: 1.6;
  }

  .homc-blog th,
  .homc-blog td {
    border: 1px solid #e8e8e8;
    padding: 12px 14px;
    text-align: left;
    vertical-align: top;
  }

  .homc-blog th {
    font-weight: 700;
    background: #fafafa;
  }

  .homc-blog .faq-item {
    margin: 0 0 28px 0;
  }

  .homc-blog .faq-item p {
    margin-bottom: 10px;
  }

  @media (max-width: 767px) {
    .homc-blog {
      font-size: 16px;
      line-height: 1.7;
      padding: 0 14px;
    }

    .homc-blog h1 {
      font-size: 28px;
    }

    .homc-blog h2 {
      font-size: 23px;
    }

    .homc-blog h3 {
      font-size: 19px;
    }

    .homc-blog table {
      font-size: 14px;
    }
  }
</style>`;

// ─── Markdown → HOMC HTML Converter ──────────────────────────────────────────

/**
 * Converts markdown content to HOMC Shopify blog HTML.
 *
 * Handles:
 * - # / ## / ### headings
 * - **bold** text
 * - [anchor](url) links
 * - Unordered lists (- item)
 * - Ordered lists (1. item)
 * - Markdown tables (| col | col |)
 * - FAQ sections (auto-detected from heading or markers)
 * - Images (markdown ![alt](url) or raw <img>)
 */
export function markdownToHOMCHtml(
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
  let h2Count = 0;
  let imageIdx = 0;

  const closeLists = () => {
    if (inUl) { htmlParts.push('</ul>'); inUl = false; }
    if (inOl) { htmlParts.push('</ol>'); inOl = false; }
  };

  const closeTable = () => {
    if (inTable) { htmlParts.push('</tbody></table>'); inTable = false; }
  };

  // Inline formatting: bold, links, strip contentReference markers
  const inlineFormat = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Clean contentReference markers that sometimes appear in AI output
      .replace(/\s*:contentReference\[[^\]]*\]\{[^}]*\}/g, '')
      // Clean citation markers like ([source](url))
      .replace(/\s*\(\[([^\]]+)\]\(([^)]+)\)\)/g, '');
  };

  // Should we insert an image after this h2?
  const shouldInsertImage = (): boolean => {
    if (!images || images.length === 0) return false;
    return h2Count === 2 || h2Count === 5;
  };

  const insertImage = (): string => {
    if (!images || imageIdx >= images.length) return '';
    const img = images[imageIdx++];
    if (!img.imageUrl) return '';
    return `<p><img src="${img.imageUrl}" alt="${img.altText || ''}"></p>`;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Skip empty lines
    if (!trimmed) {
      closeLists();
      closeTable();
      continue;
    }

    // FAQ markers
    if (trimmed === '<!-- FAQ_START -->') { closeLists(); closeTable(); inFaq = true; continue; }
    if (trimmed === '<!-- FAQ_END -->') { inFaq = false; continue; }
    if (trimmed === '<!-- HOWTO_START -->' || trimmed === '<!-- HOWTO_END -->') continue;

    // Horizontal rules — skip
    if (/^---+$/.test(trimmed)) { closeLists(); closeTable(); continue; }

    // H1 — skip if matches title
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      closeLists(); closeTable();
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

      // Detect FAQ heading
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

    // Table detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      closeLists();
      const cells = trimmed.split('|').filter(c => c.trim()).map(c => inlineFormat(c.trim()));

      const nextLine = (lines[i + 1] || '').trim();
      const isSeparator = /^\|[\s-:|]+\|$/.test(nextLine);

      if (!inTable && isSeparator) {
        htmlParts.push('<table><thead><tr>');
        for (const cell of cells) htmlParts.push(`<th>${cell}</th>`);
        htmlParts.push('</tr></thead><tbody>');
        inTable = true;
        i++; // skip separator
        continue;
      }

      if (inTable) {
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

    closeLists();

    // Blockquote — render as regular paragraph (HOMC has no CTA box styling)
    if (trimmed.startsWith('> ')) {
      htmlParts.push(`<p>${inlineFormat(trimmed.slice(2))}</p>`);
      continue;
    }

    // FAQ item detection (in FAQ mode)
    if (inFaq) {
      const boldQMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
      const qMatch = trimmed.match(/^(?:\*\*)?Q:\s*(.+?)(?:\*\*)?$/);
      if (boldQMatch || qMatch) {
        const question = boldQMatch ? boldQMatch[1] : qMatch![1];
        // Collect the answer lines
        const answerLines: string[] = [];
        while (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (!nextLine) { i++; continue; }
          if (/^(?:\*\*)?Q:/.test(nextLine) || /^\*\*.+\*\*$/.test(nextLine)) break;
          const aMatch = nextLine.match(/^A:\s*(.+)$/);
          answerLines.push(inlineFormat(aMatch ? aMatch[1] : nextLine));
          i++;
        }
        htmlParts.push(`<div class="faq-item">`);
        htmlParts.push(`<p><strong>${inlineFormat(question)}</strong></p>`);
        htmlParts.push(`<p>${answerLines.join(' ')}</p>`);
        htmlParts.push(`</div>`);
        continue;
      }
    }

    // Markdown image
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      htmlParts.push(`<p><img src="${imgMatch[2]}" alt="${imgMatch[1]}"></p>`);
      continue;
    }

    // Existing HTML image tag — pass through
    if (trimmed.startsWith('<img ')) {
      htmlParts.push(`<p>${trimmed}</p>`);
      continue;
    }

    // Regular paragraph
    htmlParts.push(`<p>${inlineFormat(trimmed)}</p>`);
  }

  closeLists();
  closeTable();

  return htmlParts.join('\n');
}

// ─── Full HTML Document Builder ──────────────────────────────────────────────

export function buildHOMCBlogHtml(
  markdown: string,
  title: string,
  images?: Array<{ imageUrl: string; altText: string; placementRecommendation?: string }>,
): string {
  const bodyHtml = markdownToHOMCHtml(markdown, title, images);

  return `${HOMC_BLOG_CSS}
<div class="homc-blog">
<h1>${title}</h1>
${bodyHtml}
</div>`;
}
