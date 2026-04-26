/**
 * discover-image-references — Image Reference Discovery from Sitemap
 *
 * Runs after content generation, before image generation.
 * Identifies relevant workspace pages that may contain
 * product/showroom/brand images useful as visual references.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ImageReferenceInput {
  workspace: {
    workspaceId: string;
    brandName: string;
    websiteUrl: string;
    industry: string;
  };
  selectedTopic: string;
  selectedTopicId: string;
  selectedPersona: string;
  keywordStrategy: {
    primaryKeyword: string;
    secondaryKeywords: string[];
    searchIntent: string;
    brandIntent: boolean;
    localIntent: boolean;
  };
  sitemapPages: Array<{
    url: string;
    path: string;
    pageType: string;
    title: string;
    slug: string;
    detectedBrand: string | null;
    detectedProduct: string | null;
  }>;
  linkedContent: string;
  mcmWorkspaceRulesIfApplicable: boolean;
}

export interface ImageReferencePage {
  url: string;
  pageType: string;
  relevanceReason: string;
  detectedProductOrBrand: string;
  imageUrls: string[];
}

export interface ImageReferenceResult {
  imageReferencePages: ImageReferencePage[];
  notes: string;
  warnings: string[];
}

// ─── System Prompt ───────────────────────────────────────────────────────────

export const IMAGE_REFERENCE_SYSTEM_PROMPT = `You are an expert visual content strategist and image reference curator.

Your task is to identify the most relevant website pages from the workspace sitemap that may contain product, showroom, or brand images useful as reference for AI image generation.

RULES:
1. Use ONLY pages from the provided sitemapPages list. Never invent URLs.
2. If the topic is about a specific product or model, prioritize that product's page.
3. If the topic is about a brand, prioritize brand collection and brand-specific pages.
4. If the topic is local/showroom-related, prioritize showroom, location, or store pages if available.
5. If the topic is generic (buying guide, comparison), prioritize collection/category pages, showroom pages, and high-traffic product pages.
6. Prefer pages classified as: product > collection > brand > local > blog > other.
7. Return 3–8 reference pages sorted by relevance.
8. For each page, explain WHY it's relevant as an image reference source.
9. If the page likely contains product photography, note that in the reason.
10. If no relevant pages exist, return an empty array with a warning.

MCM-SPECIFIC RULES (apply only when mcmWorkspaceRulesIfApplicable is true):
- For brand-specific topics (OHCO, Panasonic, Positive Posture, D.Core, KOYO), prioritize pages from that brand's product or collection section.
- For showroom/local topics, prioritize any /showroom, /location, /store, /visit, or /about pages.
- For comparison topics, include pages from each compared brand.
- For generic massage chair topics, include the main collection/category page plus 2–3 flagship product pages.

Return strict JSON matching the schema provided.`;

// ─── User Prompt Builder ─────────────────────────────────────────────────────

export function buildImageReferenceUserPrompt(input: ImageReferenceInput): string {
  const pagesStr = input.sitemapPages.length > 0
    ? input.sitemapPages
        .slice(0, 80)
        .map(p => `  - [${p.pageType}] ${p.url} | title="${p.title}"${p.detectedBrand ? ` | brand=${p.detectedBrand}` : ''}${p.detectedProduct ? ` | product=${p.detectedProduct}` : ''}`)
        .join('\n')
    : '  (no sitemap pages available)';

  return `WORKSPACE: ${input.workspace.brandName} (${input.workspace.websiteUrl})
Industry: ${input.workspace.industry}
MCM Rules Active: ${input.mcmWorkspaceRulesIfApplicable}

CONTENT CONTEXT:
Topic: ${input.selectedTopic}
Topic ID: ${input.selectedTopicId}
Persona: ${input.selectedPersona}
Primary Keyword: ${input.keywordStrategy.primaryKeyword}
Brand Intent: ${input.keywordStrategy.brandIntent}
Local Intent: ${input.keywordStrategy.localIntent}

AVAILABLE SITEMAP PAGES:
${pagesStr}

TASK:
Identify 3–8 pages that are most likely to contain useful product, showroom, or brand images for this topic.

Return strict JSON:
{
  "imageReferencePages": [
    {
      "url": "",
      "pageType": "",
      "relevanceReason": "",
      "detectedProductOrBrand": "",
      "imageUrls": []
    }
  ],
  "notes": "",
  "warnings": []
}`;
}

// ─── Deterministic Discovery (no AI needed) ──────────────────────────────────

export function discoverImageReferences(input: ImageReferenceInput): ImageReferenceResult {
  const pages = input.sitemapPages;

  if (pages.length === 0) {
    return {
      imageReferencePages: [],
      notes: 'No sitemap pages available. Fetch sitemap first.',
      warnings: ['Sitemap is empty — cannot discover image references.'],
    };
  }

  const topic = input.selectedTopic.toLowerCase();
  const pk = input.keywordStrategy.primaryKeyword.toLowerCase();
  const isBrandTopic = input.keywordStrategy.brandIntent;
  const isLocalTopic = input.keywordStrategy.localIntent;

  // Score each page
  const scored = pages.map(p => {
    let score = 0;
    const pLow = (p.path + ' ' + p.title + ' ' + (p.slug || '')).toLowerCase();
    const brandLow = (p.detectedBrand || '').toLowerCase();
    const productLow = (p.detectedProduct || '').toLowerCase();

    // Page type base score
    const typeScores: Record<string, number> = {
      product: 5,
      collection: 4,
      brand: 4,
      local: 3,
      blog: 1,
      guide: 1,
      homepage: 0,
      policy: 0,
      contact: 0,
      other: 1,
    };
    score += typeScores[p.pageType] ?? 0;

    // Topic keyword match
    const topicWords = topic.split(/\s+/).filter(w => w.length > 3);
    for (const w of topicWords) {
      if (pLow.includes(w)) score += 3;
    }

    // Primary keyword match
    const pkWords = pk.split(/\s+/).filter(w => w.length > 3);
    for (const w of pkWords) {
      if (pLow.includes(w)) score += 2;
    }

    // Brand match boost
    if (isBrandTopic && brandLow) {
      const topicBrands = ['ohco', 'panasonic', 'positive posture', 'd.core', 'dcore', 'koyo', 'osaki', 'titan', 'luraco', 'infinity', 'daiwa'];
      for (const b of topicBrands) {
        if (topic.includes(b) && brandLow.includes(b)) score += 5;
      }
    }

    // Product in topic
    if (productLow && topic.includes(productLow)) score += 4;

    // Local intent boost
    if (isLocalTopic) {
      if (/showroom|store|location|visit|local|near/i.test(pLow)) score += 4;
    }

    // Product pages with images are highest value
    if (p.pageType === 'product') score += 2;

    // Deprioritize policy/contact/homepage
    if (p.pageType === 'policy' || p.pageType === 'contact') score -= 5;
    if (p.path === '/' || p.path === '') score -= 3;

    return { ...p, score };
  });

  // Sort by score descending and take top results
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter(p => p.score > 0).slice(0, 8);

  if (top.length === 0) {
    return {
      imageReferencePages: [],
      notes: 'No sufficiently relevant pages found for image references.',
      warnings: ['No pages in the sitemap matched the topic context for image reference discovery.'],
    };
  }

  const referencePages: ImageReferencePage[] = top.map(p => {
    // Build relevance reason
    let reason = '';
    if (p.pageType === 'product') {
      reason = `Product page likely contains product photography${p.detectedBrand ? ` for ${p.detectedBrand}` : ''}`;
    } else if (p.pageType === 'collection') {
      reason = `Collection page likely contains multiple product images and category visuals`;
    } else if (p.pageType === 'brand') {
      reason = `Brand page may contain brand-specific lifestyle and product imagery`;
    } else if (p.pageType === 'local') {
      reason = `Location/showroom page may contain showroom photos, store imagery, or team photos`;
    } else if (p.pageType === 'blog') {
      reason = `Blog/article page may contain editorial images relevant to this topic`;
    } else {
      reason = `Page may contain relevant visual content for this topic`;
    }

    if (p.detectedBrand && topic.toLowerCase().includes(p.detectedBrand.toLowerCase())) {
      reason += ` — brand match for topic "${input.selectedTopic}"`;
    }

    return {
      url: p.url,
      pageType: p.pageType,
      relevanceReason: reason,
      detectedProductOrBrand: p.detectedBrand || p.detectedProduct || '',
      imageUrls: [], // Actual image extraction requires page scraping — deferred to a future step
    };
  });

  const warnings: string[] = [];
  if (referencePages.every(p => p.imageUrls.length === 0)) {
    warnings.push('Image URLs not extracted — pages returned as visual reference sources. Actual product images can be found by visiting these pages.');
  }

  return {
    imageReferencePages: referencePages,
    notes: `Discovered ${referencePages.length} relevant reference pages from ${pages.length} sitemap entries. Pages are sorted by topic relevance, page type, and brand/product match. Image URLs are not yet extracted — pages serve as visual reference sources for the image generation step.`,
    warnings,
  };
}
