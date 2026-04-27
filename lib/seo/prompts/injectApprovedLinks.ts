/**
 * inject-approved-links — AI Link Injection into Content
 *
 * Inserts approved internal and external links into generated
 * content naturally. Does not invent URLs or change meaning.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApprovedLink {
  targetUrl: string;
  anchorText: string;
  placementSection: string;
}

export interface InjectLinksInput {
  generatedContent: string;
  approvedInternalLinkPlan: ApprovedLink[];
  approvedExternalLinkPlan: ApprovedLink[];
}

export interface InsertedLink {
  targetUrl: string;
  anchorText: string;
  section: string;
}

export interface InjectLinksResult {
  linkedContent: string;
  linksInserted: {
    internal: InsertedLink[];
    external: InsertedLink[];
  };
  warnings: string[];
}

// ─── System Prompt ───────────────────────────────────────────────────────────

export const INJECT_LINKS_SYSTEM_PROMPT = `You are an expert SEO editor.

Your task is to insert approved internal and external links into the content naturally.

RULES:
1. Do not change the meaning of the content.
2. Do not rewrite large sections unless absolutely necessary for natural link placement.
3. Place links where they are most contextually useful — near the claim, product mention, or topic they support.
4. Use natural anchor text. If the approved anchor text doesn't appear verbatim in the content, find the closest natural phrase and adjust the anchor slightly to fit naturally.
5. Avoid over-optimized exact-match anchor text spam.
6. Do not put multiple links in the same sentence unless absolutely necessary.
7. Do not add links inside headings (H1, H2, H3, etc.).
8. Do not link every mention of a keyword — link only the first or most relevant occurrence.
9. Keep the content readable and flowing naturally.
10. Internal links should help readers continue their buying journey — place them where a reader would naturally want more information.
11. External links should support factual or educational claims — place them immediately after the claim they support.
12. Preserve all existing markdown formatting, headings, lists, tables, image markers, and FAQ markers.

IMPORTANT CONSTRAINTS:
- Use ONLY the approved link plans provided. Do not invent new internal or external URLs.
- Do not link to the homepage unless explicitly included in the approved plan.
- Do not link to massage chair sellers, brands, competitors, or marketplaces.
- If an approved link's anchor text cannot be naturally placed in the content, skip it and add a warning.
- If content already contains a markdown link to the same URL, do not duplicate it.

LINK FORMAT:
Insert links as standard markdown: [anchor text](url)

PLACEMENT PRIORITY:
1. First, replace any [INTERNAL_LINK_OPPORTUNITY: ...] or [EXTERNAL_LINK_OPPORTUNITY: ...] markers with actual approved links if a matching link exists.
2. Then, for remaining approved links without markers, find the best natural placement in the content.
3. If a link cannot be placed naturally, skip it and report in warnings.

MANDATORY CLEANUP (do this AFTER all link insertion):
- Remove ALL remaining [INTERNAL_LINK_OPPORTUNITY: ...] markers. If no matching link, keep only the anchor text portion.
- Remove ALL remaining [EXTERNAL_LINK_OPPORTUNITY: ...] markers. If no matching link, keep only the claim text portion.
- Remove ALL [IMAGE_OPPORTUNITY: ...] markers completely — images are handled in a separate step.
- Remove ALL [IMAGE: ...] markers completely.
- Convert any remaining [LINK: anchor|url] markers to proper markdown links [anchor](url).
- Clean up excessive blank lines (3+ consecutive newlines → 2).

Return strict JSON matching the schema provided.`;

// ─── User Prompt Builder ─────────────────────────────────────────────────────

export function buildInjectLinksUserPrompt(input: InjectLinksInput): string {
  const internalStr = (input.approvedInternalLinkPlan ?? []).length > 0
    ? (input.approvedInternalLinkPlan ?? []).map((l, i) =>
        `  ${i + 1}. URL: ${l.targetUrl}\n     Anchor: "${l.anchorText}"\n     Section: ${l.placementSection}`
      ).join('\n')
    : '  (none)';

  const externalStr = (input.approvedExternalLinkPlan ?? []).length > 0
    ? (input.approvedExternalLinkPlan ?? []).map((l, i) =>
        `  ${i + 1}. URL: ${l.targetUrl}\n     Anchor: "${l.anchorText}"\n     Section: ${l.placementSection}`
      ).join('\n')
    : '  (none)';

  return `CONTENT TO EDIT:
${input.generatedContent}

APPROVED INTERNAL LINKS (insert these):
${internalStr}

APPROVED EXTERNAL LINKS (insert these):
${externalStr}

TASK:
Insert all approved links into the content naturally.
Replace [INTERNAL_LINK_OPPORTUNITY: ...] and [EXTERNAL_LINK_OPPORTUNITY: ...] markers first.
Then place remaining links at the most contextually appropriate positions.
Do not change the content's meaning. Do not invent new URLs.

Return strict JSON:
{
  "linkedContent": "full content with links inserted as markdown",
  "linksInserted": {
    "internal": [{ "targetUrl": "", "anchorText": "", "section": "" }],
    "external": [{ "targetUrl": "", "anchorText": "", "section": "" }]
  },
  "warnings": []
}`;
}

// ─── Mock Response ───────────────────────────────────────────────────────────

export function mockInjectLinks(input: InjectLinksInput): InjectLinksResult {
  let content = input.generatedContent;
  const insertedInternal: InsertedLink[] = [];
  const insertedExternal: InsertedLink[] = [];
  const warnings: string[] = [];

  // 1. Replace [INTERNAL_LINK_OPPORTUNITY: anchor | reason] markers
  const internalMarkerRegex = /\[INTERNAL_LINK_OPPORTUNITY:\s*([^|]+)\|([^\]]+)\]/g;
  let internalMarkerIdx = 0;
  content = content.replace(internalMarkerRegex, (match, anchor) => {
    const cleanAnchor = anchor.trim();
    if (internalMarkerIdx < (input.approvedInternalLinkPlan ?? []).length) {
      const link = input.approvedInternalLinkPlan[internalMarkerIdx];
      internalMarkerIdx++;
      insertedInternal.push({
        targetUrl: link.targetUrl,
        anchorText: link.anchorText || cleanAnchor,
        section: link.placementSection || 'marker replacement',
      });
      return `[${link.anchorText || cleanAnchor}](${link.targetUrl})`;
    }
    // No more approved links — remove marker, keep anchor text
    return cleanAnchor;
  });

  // 2. Replace [EXTERNAL_LINK_OPPORTUNITY: claim | reason] markers
  const externalMarkerRegex = /\[EXTERNAL_LINK_OPPORTUNITY:\s*([^|]+)\|([^\]]+)\]/g;
  let externalMarkerIdx = 0;
  content = content.replace(externalMarkerRegex, (match, claim) => {
    const cleanClaim = claim.trim();
    if (externalMarkerIdx < (input.approvedExternalLinkPlan ?? []).length) {
      const link = input.approvedExternalLinkPlan[externalMarkerIdx];
      externalMarkerIdx++;
      insertedExternal.push({
        targetUrl: link.targetUrl,
        anchorText: link.anchorText || cleanClaim,
        section: link.placementSection || 'marker replacement',
      });
      return `[${link.anchorText || cleanClaim}](${link.targetUrl})`;
    }
    return cleanClaim;
  });

  // 3. Place remaining approved internal links by matching anchor text
  for (let i = internalMarkerIdx; i < (input.approvedInternalLinkPlan ?? []).length; i++) {
    const link = input.approvedInternalLinkPlan[i];
    const anchor = link.anchorText;
    const escapedAnchor = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Only match if not already inside a markdown link
    const regex = new RegExp(`(?<!\\[)(?<!\\]\\()${escapedAnchor}(?!\\])(?!\\))`, 'i');
    if (regex.test(content)) {
      content = content.replace(regex, `[${anchor}](${link.targetUrl})`);
      insertedInternal.push({
        targetUrl: link.targetUrl,
        anchorText: anchor,
        section: link.placementSection || 'body',
      });
    } else {
      warnings.push(`Internal link skipped: could not find natural placement for "${anchor}" → ${link.targetUrl}`);
    }
  }

  // 4. Place remaining approved external links by matching anchor text
  for (let i = externalMarkerIdx; i < (input.approvedExternalLinkPlan ?? []).length; i++) {
    const link = input.approvedExternalLinkPlan[i];
    const anchor = link.anchorText;
    const escapedAnchor = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<!\\[)(?<!\\]\\()${escapedAnchor}(?!\\])(?!\\))`, 'i');
    if (regex.test(content)) {
      content = content.replace(regex, `[${anchor}](${link.targetUrl})`);
      insertedExternal.push({
        targetUrl: link.targetUrl,
        anchorText: anchor,
        section: link.placementSection || 'body',
      });
    } else {
      warnings.push(`External link skipped: could not find natural placement for "${anchor}" → ${link.targetUrl}`);
    }
  }

  // 5. Clean up any remaining opportunity markers that weren't matched
  content = content.replace(/\[INTERNAL_LINK_OPPORTUNITY:\s*([^|]+)\|[^\]]+\]/g, '$1');
  content = content.replace(/\[EXTERNAL_LINK_OPPORTUNITY:\s*([^|]+)\|[^\]]+\]/g, '$1');
  // 6. Clean [IMAGE_OPPORTUNITY: ...] markers — they've been consumed by image plan step
  content = content.replace(/\[IMAGE_OPPORTUNITY:\s*[^\]]*\]/g, '');
  // 7. Clean [IMAGE: ...] markers from legacy mock content
  content = content.replace(/\[IMAGE:\s*[^\]]*\]/g, '');
  // 8. Convert any remaining [LINK: anchor|url] markers to markdown links
  content = content.replace(/\[LINK:\s*([^|]+)\|([^\]]+)\]/g, '[$1]($2)');
  // 9. Clean excessive blank lines left by removed markers
  content = content.replace(/\n{3,}/g, '\n\n');

  return {
    linkedContent: content,
    linksInserted: {
      internal: insertedInternal,
      external: insertedExternal,
    },
    warnings,
  };
}
