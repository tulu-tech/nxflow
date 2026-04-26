/**
 * select-keywords-for-content — AI Keyword Strategy Selection
 *
 * System prompt, user prompt builder, and mock response
 * for the keyword selection step of the content creation wizard.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KeywordSelectionInput {
  workspace: {
    workspaceId: string;
    brandName: string;
    websiteUrl: string;
    industry: string;
    businessType: string;
    targetMarket: string;
    targetCountries: string[];
    brandDifferentiators: string;
    complianceNotes: string;
  };
  keywordList: Array<{
    keywordId: string;
    keyword: string;
    normalizedKeyword: string;
    tag: string;
    kd: number | null;
    cpc: number | null;
    volume: number | null;
    usage: {
      usedAsPrimaryCount: number;
      usedAsSecondaryCount: number;
      lastUsedAsPrimaryAt: string | null;
      lastUsedAsSecondaryAt: string | null;
      usedInContentIds: string[];
    };
  }>;
  selectedPersona: string;
  selectedTopic: string;
  selectedTopicId: string;
  selectedPlatformFormat: string;
  sitemapPages: string[];
  priorPublishedContent: string[];
  priorDraftContent: string[];
  mcmWorkspaceRulesIfApplicable: boolean;
  allowPrimaryKeywordReuse: boolean;
}

export interface KeywordStrategyResult {
  primaryKeyword: {
    keywordId: string;
    keyword: string;
    tag: string;
    source: 'keyword_list' | 'suggested_variant';
    suggested_variant: boolean;
    volume: number | null;
    kd: number | null;
    cpc: number | null;
    usedAsPrimaryCount: number;
    reason: string;
    scoreExplanation: {
      topicRelevance: string;
      personaRelevance: string;
      tagMatch: string;
      intentMatch: string;
      volumeRationale: string;
      kdRationale: string;
      cpcRationale: string;
      usageRationale: string;
      commercialRationale: string;
    };
  };
  secondaryKeywords: Array<{
    keywordId: string;
    keyword: string;
    tag: string;
    source: 'keyword_list' | 'suggested_variant';
    suggested_variant: boolean;
    volume: number | null;
    kd: number | null;
    cpc: number | null;
    usedAsSecondaryCount: number;
    reason: string;
  }>;
  semanticKeywords: string[];
  aiSearchQuestionsToAnswer: string[];
  searchIntent: string;
  funnelStage: string;
  commercialPriority: 'High' | 'Medium' | 'Low';
  localIntent: boolean;
  brandIntent: boolean;
  comparisonIntent: boolean;
  claimRisk: 'High' | 'Medium' | 'Low';
  claimRiskNotes: string;
  recommendedCTA: string;
  contentAngle: string;
  avoidKeywordsOrAngles: string[];
  cannibalizationWarning: string;
  keywordDiversityNotes: string;
  reuseWarning: string;
  confidenceScore: number;
}

// ─── System Prompt ───────────────────────────────────────────────────────────

export const KEYWORD_SELECTION_SYSTEM_PROMPT = `You are a senior SEO strategist, keyword researcher, customer intent analyst, and high-ticket retail growth consultant.

Your task is to select a keyword strategy for ONE content item.

You must not write content yet.

You must choose the strongest primary keyword and secondary keywords using:
- selected target persona
- selected content topic
- selected platform/format
- workspace keyword list
- keyword tags
- keyword volume
- keyword difficulty / KD
- CPC
- prior keyword usage
- prior generated content
- search intent
- commercial value
- brand/model relevance
- local intent
- AI-search relevance
- cannibalization avoidance

ABSOLUTE RULES:
1. Prefer keywords from the active workspace keyword list.
2. Do not reuse a keyword as primary if usedAsPrimaryCount > 0, unless allowPrimaryKeywordReuse is true.
3. If no suitable unused primary keyword exists, return a warning and recommend the best alternative.
4. Select exactly 1 primary keyword.
5. Select at least 10 secondary keywords when at least 10 relevant secondary keywords exist.
6. If fewer than 10 relevant secondary keywords exist, select the maximum relevant amount and explain why.
7. Do not choose irrelevant keywords just to hit a number.
8. Do not repeatedly choose the same generic keywords across multiple content items.
9. Secondary keywords may repeat across content, but avoid repeating the same secondary keyword set.
10. Keyword usage is workspace-scoped only.

TAG MATCHING RULES:
If the selected topic is brand/model-specific:
- The primary keyword must come from the matching brand/model tag if available and unused.
- If multiple matching brand/model tags exist, choose the best one based on intent + volume + KD + CPC.
- Secondary keywords should include a mix of: same brand/model tag, broader brand tag, relevant generic tag, comparison/value/feature tags when applicable.

If the selected topic is generic:
- The primary keyword must come from the generic tag if available and unused.
- Secondary keywords should include a diverse mix of generic, feature, local, price, comparison, and relevant broad category terms depending on topic.
- Do not always select the highest-volume generic keyword.
- Rotate generic keyword usage across different content pieces.

If the selected topic is local:
- Prefer keywords tagged local, generic, city, near-me, showroom, store, Bay Area, NorCal if available.
- Primary keyword should reflect local/demo intent.

If the selected topic is comparison:
- Prefer keywords with tags or terms such as comparison, vs, compare, best, review, brand/model names.
- Primary keyword should match the comparison topic as closely as possible.

If the selected topic is price/value:
- Prefer tags or terms such as price, cost, budget, value, worth it, sale, deal, Costco, online vs store.
- Primary keyword should match commercial objection intent.

If the selected topic is warranty/service/delivery/fit:
- Prefer tags or terms that match warranty, service, repair, delivery, installation, dimensions, space, showroom support.

SCORING LOGIC:
Score each candidate primary keyword using:
- Topic relevance
- Persona relevance
- Tag match
- Search intent match
- Prior primary usage
- Volume
- KD
- CPC
- Commercial conversion value
- Cannibalization risk
- Keyword diversity across workspace

Do not use "highest volume wins."

MCM WORKSPACE RULES (apply only when mcmWorkspaceRulesIfApplicable is true):
MCM sells decision confidence for a high-ticket massage chair purchase, not just massage chairs.

Keyword selection should support: showroom demo, multi-brand comparison, expert guidance, high-ticket purchase confidence, warranty/service clarity, delivery/installation clarity, fit/space certainty, brand/model comparison, local California/Bay Area/NorCal intent when relevant.

For MCM brand/model topics:
- Panasonic content must prioritize Panasonic / MAN1 / MAF1 / MAK1 tags when available.
- OHCO content must prioritize OHCO / M8 / M8 NEO / M8 NEO LE / R6 tags when available.
- Positive Posture content must prioritize Positive Posture / DualTech / Brio / Solara tags when available.
- D.Core content must prioritize D.Core / Dcore / D.Core 2 / Cirrus / Stratus tags when available.
- KOYO content must prioritize KOYO / 303TS tags when available.
- Generic massage chair content must prioritize generic tags when available.
- Local showroom content should prioritize local, near-me, showroom, store, city, Bay Area, NorCal, or generic local-intent keywords when available.

MCM medical claim safety:
For topics related to pain, back, neck, shoulders, lower back, recovery, senior comfort, circulation, therapy:
- Do not select keywords that force medical cure/treatment claims if safer alternatives are available.
- Prefer safer terms such as comfort, relaxation, muscle tension, stress relief, recovery routine, zero gravity, full body massage chair.
- If a risky keyword is selected because it is strategically important, mark claimRisk as High and provide strict claim guidance.

VALIDATION RULES:
- Return strict JSON only.
- Select exactly 1 primary keyword.
- Select at least 10 secondary keywords if enough relevant keywords exist.
- Exclude used primary keywords by default.
- Do not select irrelevant keywords.
- Do not choose a primary keyword from the wrong brand tag for brand-specific content.
- Do not choose a brand keyword as primary for a generic topic unless no generic keyword is available and explain why.
- Do not over-select the same generic keyword family repeatedly.

Return strict JSON matching the schema provided in the user prompt.`;

// ─── User Prompt Builder ─────────────────────────────────────────────────────

export function buildKeywordSelectionUserPrompt(input: KeywordSelectionInput): string {
  const kwListStr = input.keywordList.length > 0
    ? input.keywordList.map((k) =>
        `  - [${k.keywordId}] "${k.keyword}" tag=${k.tag} vol=${k.volume ?? '?'} kd=${k.kd ?? '?'} cpc=${k.cpc ?? '?'} primaryUses=${k.usage.usedAsPrimaryCount} secondaryUses=${k.usage.usedAsSecondaryCount}`
      ).join('\n')
    : '  (no keywords in list)';

  return `Workspace Brand: ${input.workspace.brandName}
Website: ${input.workspace.websiteUrl}
Target Market: ${input.workspace.targetMarket}
Industry: ${input.workspace.industry}
Business Type: ${input.workspace.businessType}
Brand Differentiators: ${input.workspace.brandDifferentiators}
Compliance Notes: ${input.workspace.complianceNotes}

Selected Persona: ${input.selectedPersona}
Selected Topic: ${input.selectedTopic}
Selected Topic ID: ${input.selectedTopicId}
Selected Platform/Format: ${input.selectedPlatformFormat}
MCM Rules Active: ${input.mcmWorkspaceRulesIfApplicable}
Allow Primary Keyword Reuse: ${input.allowPrimaryKeywordReuse}

Active Keyword List:
${kwListStr}

Prior Published Content: ${input.priorPublishedContent.length > 0 ? input.priorPublishedContent.join('; ') : 'None'}
Prior Draft Content: ${input.priorDraftContent.length > 0 ? input.priorDraftContent.join('; ') : 'None'}
Sitemap Pages: ${input.sitemapPages.length > 0 ? input.sitemapPages.join('; ') : 'None'}

TASK:
Select the strongest keyword strategy for this content.

Return strict JSON only:
{
  "primaryKeyword": {
    "keywordId": "", "keyword": "", "tag": "", "source": "keyword_list | suggested_variant", "suggested_variant": false,
    "volume": null, "kd": null, "cpc": null, "usedAsPrimaryCount": 0, "reason": "",
    "scoreExplanation": { "topicRelevance": "", "personaRelevance": "", "tagMatch": "", "intentMatch": "", "volumeRationale": "", "kdRationale": "", "cpcRationale": "", "usageRationale": "", "commercialRationale": "" }
  },
  "secondaryKeywords": [
    { "keywordId": "", "keyword": "", "tag": "", "source": "keyword_list | suggested_variant", "suggested_variant": false, "volume": null, "kd": null, "cpc": null, "usedAsSecondaryCount": 0, "reason": "" }
  ],
  "semanticKeywords": [],
  "aiSearchQuestionsToAnswer": [],
  "searchIntent": "", "funnelStage": "", "commercialPriority": "High | Medium | Low",
  "localIntent": false, "brandIntent": false, "comparisonIntent": false,
  "claimRisk": "Low", "claimRiskNotes": "", "recommendedCTA": "", "contentAngle": "",
  "avoidKeywordsOrAngles": [], "cannibalizationWarning": "", "keywordDiversityNotes": "", "reuseWarning": "", "confidenceScore": 0
}`;
}

// ─── Mock Response ───────────────────────────────────────────────────────────

export function mockKeywordStrategy(input: KeywordSelectionInput): KeywordStrategyResult {
  // Find best unused primary from keyword list
  const unused = input.keywordList.filter((k) => k.usage.usedAsPrimaryCount === 0);
  const pool = unused.length > 0 ? unused : input.keywordList;
  const primary = pool[0] ?? { keywordId: 'mock-kw', keyword: input.selectedTopic.toLowerCase(), tag: 'generic', volume: 1200, kd: 35, cpc: 2.5, usage: { usedAsPrimaryCount: 0, usedAsSecondaryCount: 0, lastUsedAsPrimaryAt: null, lastUsedAsSecondaryAt: null, usedInContentIds: [] } };
  const isReuse = primary.usage.usedAsPrimaryCount > 0;

  // Pick up to 10 secondary
  const secondaryCandidates = input.keywordList.filter((k) => k.keywordId !== primary.keywordId).slice(0, 10);

  return {
    primaryKeyword: {
      keywordId: primary.keywordId,
      keyword: primary.keyword,
      tag: primary.tag,
      source: 'keyword_list',
      suggested_variant: false,
      volume: primary.volume,
      kd: primary.kd,
      cpc: primary.cpc,
      usedAsPrimaryCount: primary.usage.usedAsPrimaryCount,
      reason: `Best match for topic "${input.selectedTopic}" based on tag relevance, volume, and prior usage.`,
      scoreExplanation: {
        topicRelevance: 'High — keyword directly matches topic intent',
        personaRelevance: `Aligns with ${input.selectedPersona} search behavior`,
        tagMatch: `Tag "${primary.tag}" matches topic cluster`,
        intentMatch: 'Commercial/informational intent aligns with content goal',
        volumeRationale: `Volume ${primary.volume ?? '?'} provides sufficient traffic potential`,
        kdRationale: `KD ${primary.kd ?? '?'} is achievable for this domain`,
        cpcRationale: `CPC ${primary.cpc ?? '?'} indicates commercial value`,
        usageRationale: isReuse ? 'WARNING: This keyword has been used as primary before' : 'Not previously used as primary — good for diversity',
        commercialRationale: 'Supports purchase-intent content strategy',
      },
    },
    secondaryKeywords: secondaryCandidates.map((k) => ({
      keywordId: k.keywordId,
      keyword: k.keyword,
      tag: k.tag,
      source: 'keyword_list' as const,
      suggested_variant: false,
      volume: k.volume,
      kd: k.kd,
      cpc: k.cpc,
      usedAsSecondaryCount: k.usage.usedAsSecondaryCount,
      reason: `Relevant secondary term with tag "${k.tag}" supporting primary keyword.`,
    })),
    semanticKeywords: [input.selectedTopic.toLowerCase(), 'massage chair', 'best massage chair'],
    aiSearchQuestionsToAnswer: [`What is the best ${input.selectedTopic.toLowerCase()}?`, `Where can I find ${input.selectedTopic.toLowerCase()}?`],
    searchIntent: 'commercial',
    funnelStage: 'middle',
    commercialPriority: 'High',
    localIntent: input.selectedTopic.toLowerCase().includes('near') || input.selectedTopic.toLowerCase().includes('store'),
    brandIntent: input.selectedTopic.toLowerCase().includes('ohco') || input.selectedTopic.toLowerCase().includes('panasonic'),
    comparisonIntent: input.selectedTopic.toLowerCase().includes('vs') || input.selectedTopic.toLowerCase().includes('compare'),
    claimRisk: 'Low',
    claimRiskNotes: '',
    recommendedCTA: 'Visit showroom for a personalized demo',
    contentAngle: `Comprehensive guide to ${input.selectedTopic} for informed buyers`,
    avoidKeywordsOrAngles: [],
    cannibalizationWarning: '',
    keywordDiversityNotes: secondaryCandidates.length < 10 ? `Only ${secondaryCandidates.length} relevant secondary keywords available.` : '',
    reuseWarning: isReuse ? `"${primary.keyword}" has been used as primary ${primary.usage.usedAsPrimaryCount} time(s) before. Reusing may create cannibalization risk.` : '',
    confidenceScore: isReuse ? 65 : 85,
  };
}
