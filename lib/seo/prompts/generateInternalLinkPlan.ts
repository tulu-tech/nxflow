/**
 * generate-internal-link-plan — AI Internal Link Strategy
 *
 * Runs AFTER content generation. Selects internal links
 * ONLY from the active workspace sitemap pages.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InternalLinkPlanInput {
  workspace: {
    workspaceId: string;
    brandName: string;
    websiteUrl: string;
    industry: string;
  };
  generatedContent: string;
  selectedPersona: string;
  selectedTopic: string;
  selectedTopicId: string;
  selectedPlatformFormat: string;
  approvedKeywordStrategy: {
    primaryKeyword: string;
    secondaryKeywords: string[];
    searchIntent: string;
    funnelStage: string;
  };
  sitemapPages: Array<{
    url: string;
    path: string;
    pageType: string;
    title: string;
    detectedBrand: string | null;
    detectedProduct: string | null;
  }>;
  mcmWorkspaceRulesIfApplicable: boolean;
}

export interface InternalLinkItem {
  targetUrl: string;
  pageTitle: string;
  pageType: string;
  anchorText: string;
  placementSection: string;
  placementReason: string;
  relevanceScore: number;
  priority: 'High' | 'Medium' | 'Low';
}

export interface InternalLinkPlanResult {
  internalLinkPlan: InternalLinkItem[];
  warnings: string[];
  notes: string;
}

// ─── System Prompt ───────────────────────────────────────────────────────────

export const INTERNAL_LINK_PLAN_SYSTEM_PROMPT = `You are an expert SEO internal linking strategist.

Your task is to create an internal link plan for the generated content.

ABSOLUTE RULES:
1. Use ONLY URLs from the provided sitemapPages list. Never invent URLs.
2. Never link to the homepage unless there is absolutely no other relevant page, and even then mark it as "not recommended" in the warnings.
3. Prefer specific pages:
   - product pages
   - collection pages
   - brand pages
   - comparison pages
   - buying guides
   - local showroom pages
   - warranty/service pages
   - delivery/installation pages
4. Internal links must be contextually relevant to the section where they are placed.
5. Do not over-link. Recommend 3–8 internal links depending on content length and format.
6. Do not use the same URL more than once.
7. Use natural anchor text — do not use exact-match keyword spam.
8. Anchor text should read naturally within a sentence.
9. Prioritize links that help the reader make a decision or find more specific information.
10. For short-form content (social posts, stories, comments), recommend 0–2 links maximum.

MCM-SPECIFIC INTERNAL LINK LOGIC (apply only when mcmWorkspaceRulesIfApplicable is true):
- Brand/model article → link to matching product page or brand collection if available in sitemap.
- Comparison article → link to both compared product/brand pages if available.
- Local article → link to relevant local showroom page if available.
- Price/value article → link to relevant product/category pages, not only premium models.
- Warranty/service article → link to service/warranty/support page if available.
- Delivery/space article → link to relevant product pages with dimensions if available.
- Generic buying guide → link to massage chair collection/category page and key brand/model pages if available.

SCORING:
- relevanceScore: 1–10 based on how relevant the target page is to the content section.
- priority: "High" = critical for user journey, "Medium" = helpful, "Low" = nice to have.

Return strict JSON matching the schema provided.`;

// ─── User Prompt Builder ─────────────────────────────────────────────────────

export function buildInternalLinkPlanUserPrompt(input: InternalLinkPlanInput): string {
  const pagesStr = (input.sitemapPages ?? []).length > 0
    ? input.sitemapPages
        .filter(p => p.path !== '/' && p.path !== '')
        .slice(0, 100)
        .map(p => `  - [${p.pageType}] ${p.url} | title="${p.title}"${p.detectedBrand ? ` | brand=${p.detectedBrand}` : ''}${p.detectedProduct ? ` | product=${p.detectedProduct}` : ''}`)
        .join('\n')
    : '  (no sitemap pages available)';

  // Truncate content to first 3000 chars for prompt efficiency
  const contentSnippet = (input.generatedContent ?? "").length > 3000
    ? (input.generatedContent ?? "").slice(0, 3000) + '\n\n[... content continues ...]'
    : input.generatedContent;

  return `WORKSPACE: ${(input.workspace ?? {} as any).brandName ?? ""} (${(input.workspace ?? {} as any).websiteUrl ?? ""})
Industry: ${(input.workspace ?? {} as any).industry ?? ""}
MCM Rules Active: ${input.mcmWorkspaceRulesIfApplicable}

CONTENT CONTEXT:
Persona: ${input.selectedPersona}
Topic: ${input.selectedTopic}
Topic ID: ${input.selectedTopicId}
Platform/Format: ${input.selectedPlatformFormat}
Primary Keyword: ${(input.approvedKeywordStrategy ?? {} as any).primaryKeyword ?? ""}
Secondary Keywords: ${((input.approvedKeywordStrategy ?? {} as any).secondaryKeywords ?? []).join(', ')}
Search Intent: ${(input.approvedKeywordStrategy ?? {} as any).searchIntent ?? ""}
Funnel Stage: ${input.approvedKeywordStrategy.funnelStage}

GENERATED CONTENT:
${contentSnippet}

AVAILABLE SITEMAP PAGES (link targets — use ONLY these URLs):
${pagesStr}

TASK:
Analyze the content and select 3–8 internal links from the sitemap pages above.
Each link must be contextually relevant and placed in a specific section.

Return strict JSON:
{
  "internalLinkPlan": [
    {
      "targetUrl": "",
      "pageTitle": "",
      "pageType": "",
      "anchorText": "",
      "placementSection": "",
      "placementReason": "",
      "relevanceScore": 0,
      "priority": "High | Medium | Low"
    }
  ],
  "warnings": [],
  "notes": ""
}`;
}

// ─── Mock Response ───────────────────────────────────────────────────────────

export function mockInternalLinkPlan(input: InternalLinkPlanInput): InternalLinkPlanResult {
  const pages = (input.sitemapPages ?? []).filter(p => p.path !== '/' && p.path !== '');

  if (pages.length === 0) {
    return {
      internalLinkPlan: [],
      warnings: ['No sitemap pages available. Fetch sitemap first.'],
      notes: 'Internal link plan cannot be generated without sitemap data.',
    };
  }

  const topic = input.selectedTopic.toLowerCase();
  const pk = (input.approvedKeywordStrategy ?? {} as any).primaryKeyword ?? "".toLowerCase();

  // Score and sort pages by relevance
  const scored = pages.map(p => {
    let score = 1;
    const pLow = (p.path + ' ' + p.title).toLowerCase();

    // Page type boost
    if (p.pageType === 'product') score += 3;
    if (p.pageType === 'collection') score += 2;
    if (p.pageType === 'blog') score += 1;
    if (p.pageType === 'brand') score += 2;

    // Topic/keyword match
    const topicWords = topic.split(/\s+/).filter(w => w.length > 3);
    const pkWords = pk.split(/\s+/).filter(w => w.length > 3);
    for (const w of topicWords) { if (pLow.includes(w)) score += 2; }
    for (const w of pkWords) { if (pLow.includes(w)) score += 2; }

    // Brand match
    if (p.detectedBrand && topic.includes(p.detectedBrand.toLowerCase())) score += 3;

    return { ...p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Pick top 5 unique
  const selected = scored.slice(0, 5);

  const plan: InternalLinkItem[] = selected.map((p, i) => ({
    targetUrl: p.url,
    pageTitle: p.title,
    pageType: p.pageType,
    anchorText: p.pageType === 'product'
      ? `explore the ${p.title}`
      : p.pageType === 'collection'
      ? `browse our ${p.title} collection`
      : p.pageType === 'blog'
      ? `read more about ${p.title.toLowerCase()}`
      : `learn more about ${p.title.toLowerCase()}`,
    placementSection: i === 0 ? 'Introduction or first mention' : i === selected.length - 1 ? 'Conclusion / CTA section' : `Body section ${i + 1}`,
    placementReason: p.score >= 7
      ? 'Highly relevant to content topic — strong contextual match'
      : p.score >= 4
      ? 'Relevant supporting page — helps reader explore further'
      : 'Supplementary link — adds navigation depth',
    relevanceScore: Math.min(10, p.score),
    priority: p.score >= 7 ? 'High' as const : p.score >= 4 ? 'Medium' as const : 'Low' as const,
  }));

  const warnings: string[] = [];
  if (pages.length < 5) warnings.push(`Only ${pages.length} non-homepage pages available. Link plan may be limited.`);
  if (plan.every(l => l.relevanceScore < 5)) warnings.push('No highly relevant pages found in sitemap. Consider adding more content pages.');

  return {
    internalLinkPlan: plan,
    warnings,
    notes: `Selected ${plan.length} internal links from ${pages.length} available sitemap pages. Links prioritized by topic relevance, page type, and brand match.`,
  };
}
