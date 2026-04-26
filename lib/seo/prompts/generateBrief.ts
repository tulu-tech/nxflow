/**
 * generate-content-brief — AI Content Brief Generation
 *
 * System prompt, user prompt builder, mock response, and types
 * for the content brief step of the content creation wizard.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContentBriefInput {
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
    toneOfVoice: string;
    coreOffer: string;
    conversionGoals: string;
    primaryCTA: string;
  };
  selectedPersona: string;
  selectedPersonaDescription: string;
  selectedTopic: string;
  selectedTopicId: string;
  selectedPlatformFormat: string;
  contentGoal: string;
  keywordStrategy: {
    primaryKeyword: string;
    secondaryKeywords: string[];
    searchIntent: string;
    funnelStage: string;
    commercialPriority: string;
    claimRisk: string;
    claimRiskNotes: string;
    recommendedCTA: string;
    contentAngle: string;
  };
  sitemapPages: string[];
  priorContent: string[];
  mcmWorkspaceRulesIfApplicable: boolean;
}

export interface ContentBriefResult {
  briefTitle: string;
  selectedPersona: string;
  selectedTopic: string;
  platformFormat: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchIntent: string;
  funnelStage: string;
  contentGoal: string;
  recommendedCTA: string;
  angle: string;
  readerProblem: string;
  decisionBarrierSolved: string;
  recommendedWordCount: string;
  outline: Array<{ level: string; text: string; notes?: string }>;
  faqPlan: Array<{ question: string; answerDirection: string }>;
  platformSpecificStructure: Record<string, unknown>;
  internalLinkNeeds: string[];
  externalCitationNeeds: string[];
  imageOpportunities: string[];
  claimRisk: string;
  claimRiskGuidance: string;
  mustInclude: string[];
  mustAvoid: string[];
  qualityChecklist: string[];
}

// ─── System Prompt ───────────────────────────────────────────────────────────

export const CONTENT_BRIEF_SYSTEM_PROMPT = `You are a senior SEO strategist, content architect, customer research analyst, and high-ticket retail conversion strategist.

Your task is to create a platform-specific content brief.

You must use:
- workspace brand data
- selected target persona
- selected content topic
- selected platform/format
- approved primary keyword
- approved secondary keywords
- search intent
- funnel stage
- commercial priority
- claim risk
- CTA goal
- sitemap page context when relevant

For MCM workspace only (when mcmWorkspaceRulesIfApplicable is true):
MCM is not simply selling massage chairs. MCM sells decision confidence for a high-ticket purchase through expert guidance, showroom demos, multi-brand comparison, delivery/installation clarity, warranty/service confidence, and matching the right chair to the customer's body, home, budget, and wellness goals.

MCM content must:
- Reduce purchase risk
- Clarify comparison decisions
- Encourage showroom/demo when relevant
- Avoid pressure-selling language
- Avoid unsupported medical claims
- Use compliant wellness language
- Connect content to the selected persona's buying psychology

PLATFORM FORMAT RULES:

If format is "article-blog" (Article/Blogs In-Depth Content):
- Create SEO article brief
- Include H1, meta title, meta description, slug
- Include H2/H3 outline (8–14 items)
- Include FAQ plan (5–7 questions)
- Include CTA plan
- Include recommended word count based on topic complexity (typically 2,000–4,000 words)
- Include internal link targets needed conceptually, but do not choose actual links yet
- Include external citation needs conceptually, but do not choose actual links yet
- Include image opportunities conceptually, but do not generate images yet

If format is "text-post" (Text Posts):
- Create short-form social post brief
- Hook, body, CTA
- 1–3 variations in platformSpecificStructure

If format is "image-post" (Image Posts):
- Create caption brief and visual concept note in platformSpecificStructure
- Do not generate image yet

If format is "short-video" (Short Videos):
- Create script outline for 30–60 seconds
- Hook, scenes, talking points, CTA in platformSpecificStructure

If format is "long-video" (Long-Form Videos):
- Create YouTube-style outline
- Hook, sections, talking points, CTA in platformSpecificStructure

If format is "instagram-story" or "linkedin-story" (Stories):
- Create 3–7 frame story sequence in platformSpecificStructure

If format is "static-infographic" (Static Infographics):
- Create infographic structure in platformSpecificStructure

If format is "multi-image-carousel" (Multi-Image Carousels):
- Create 5–10 slide carousel brief in platformSpecificStructure

If format is "pdf-carousel" (Multi-Page PDF Carousels):
- Create 6–12 page PDF carousel outline in platformSpecificStructure

If format is "poll-quiz" (Polls and Quizzes):
- Create poll/quiz concept and questions in platformSpecificStructure

If format is "qa-session" (Q&A Sessions):
- Create Q&A topic bank in platformSpecificStructure

If format is "comment-engagement" (Comments on Target Posts):
- Create comment strategy and natural sample comments in platformSpecificStructure

OUTLINE STRUCTURE:
Each outline item must have:
- level: "h1" | "h2" | "h3"
- text: heading text
- notes: optional writing direction for this section

FAQ PLAN:
Each FAQ must have:
- question: the FAQ question (optimized for featured snippet)
- answerDirection: guidance on how to answer (40–60 words target per answer)

QUALITY CHECKLIST:
Include 8–12 specific quality checks the writer must pass before content is final.

Return strict JSON matching the schema provided.`;

// ─── User Prompt Builder ─────────────────────────────────────────────────────

export function buildContentBriefUserPrompt(input: ContentBriefInput): string {
  return `Workspace Brand: ${input.workspace.brandName}
Website: ${input.workspace.websiteUrl}
Industry: ${input.workspace.industry}
Business Type: ${input.workspace.businessType}
Target Market: ${input.workspace.targetMarket}
Tone of Voice: ${input.workspace.toneOfVoice}
Core Offer: ${input.workspace.coreOffer}
Conversion Goals: ${input.workspace.conversionGoals}
Primary CTA: ${input.workspace.primaryCTA}
Brand Differentiators: ${input.workspace.brandDifferentiators}
Compliance Notes: ${input.workspace.complianceNotes}

Selected Persona: ${input.selectedPersona}
Persona Description: ${input.selectedPersonaDescription}
Selected Topic: ${input.selectedTopic}
Selected Topic ID: ${input.selectedTopicId}
Selected Platform/Format: ${input.selectedPlatformFormat}
Content Goal: ${input.contentGoal}
MCM Rules Active: ${input.mcmWorkspaceRulesIfApplicable}

Approved Keyword Strategy:
- Primary Keyword: ${input.keywordStrategy.primaryKeyword}
- Secondary Keywords: ${input.keywordStrategy.secondaryKeywords.join(', ')}
- Search Intent: ${input.keywordStrategy.searchIntent}
- Funnel Stage: ${input.keywordStrategy.funnelStage}
- Commercial Priority: ${input.keywordStrategy.commercialPriority}
- Claim Risk: ${input.keywordStrategy.claimRisk}
- Claim Risk Notes: ${input.keywordStrategy.claimRiskNotes}
- Recommended CTA: ${input.keywordStrategy.recommendedCTA}
- Content Angle: ${input.keywordStrategy.contentAngle}

Sitemap Pages (for internal link context): ${input.sitemapPages.length > 0 ? input.sitemapPages.slice(0, 50).join('; ') : 'None'}
Prior Content: ${input.priorContent.length > 0 ? input.priorContent.join('; ') : 'None'}

TASK:
Create a platform-specific content brief for format "${input.selectedPlatformFormat}".

Return strict JSON:
{
  "briefTitle": "",
  "selectedPersona": "",
  "selectedTopic": "",
  "platformFormat": "",
  "primaryKeyword": "",
  "secondaryKeywords": [],
  "searchIntent": "",
  "funnelStage": "",
  "contentGoal": "",
  "recommendedCTA": "",
  "angle": "",
  "readerProblem": "",
  "decisionBarrierSolved": "",
  "recommendedWordCount": "",
  "outline": [{ "level": "h2", "text": "", "notes": "" }],
  "faqPlan": [{ "question": "", "answerDirection": "" }],
  "platformSpecificStructure": {},
  "internalLinkNeeds": [],
  "externalCitationNeeds": [],
  "imageOpportunities": [],
  "claimRisk": "",
  "claimRiskGuidance": "",
  "mustInclude": [],
  "mustAvoid": [],
  "qualityChecklist": []
}`;
}

// ─── Mock Response ───────────────────────────────────────────────────────────

export function mockContentBrief(input: ContentBriefInput): ContentBriefResult {
  const pk = input.keywordStrategy.primaryKeyword || input.selectedTopic;
  const isArticle = input.selectedPlatformFormat === 'article-blog';
  const year = new Date().getFullYear();

  return {
    briefTitle: `${pk} — ${input.selectedPlatformFormat} Brief`,
    selectedPersona: input.selectedPersona,
    selectedTopic: input.selectedTopic,
    platformFormat: input.selectedPlatformFormat,
    primaryKeyword: pk,
    secondaryKeywords: input.keywordStrategy.secondaryKeywords,
    searchIntent: input.keywordStrategy.searchIntent || 'commercial',
    funnelStage: input.keywordStrategy.funnelStage || 'middle',
    contentGoal: input.contentGoal || input.keywordStrategy.recommendedCTA || 'Educate and convert',
    recommendedCTA: input.keywordStrategy.recommendedCTA || 'Visit showroom for a personalized demo',
    angle: input.keywordStrategy.contentAngle || `Comprehensive guide to ${pk} for informed buyers`,
    readerProblem: `The reader is uncertain about ${pk} and needs clarity to make a confident decision.`,
    decisionBarrierSolved: `Provides clear, expert-backed information about ${pk} to remove purchase hesitation.`,
    recommendedWordCount: isArticle ? '2,500–3,500 words' : '150–300 words',
    outline: isArticle ? [
      { level: 'h1', text: `The Complete Guide to ${pk} (${year})`, notes: 'Primary keyword in H1' },
      { level: 'h2', text: `What Is ${pk}?`, notes: 'Definition section — 250–350 words' },
      { level: 'h3', text: 'Key Features and Benefits', notes: 'Feature-benefit pairs' },
      { level: 'h2', text: `Why ${pk} Matters for ${input.selectedPersona}`, notes: 'Persona-specific value proposition' },
      { level: 'h2', text: `How to Choose the Right ${pk}`, notes: 'Decision framework — 3–5 criteria' },
      { level: 'h3', text: 'Budget Considerations', notes: 'Address price objection' },
      { level: 'h3', text: 'Space and Fit Requirements', notes: 'Practical guidance' },
      { level: 'h2', text: `${pk}: Expert Comparison`, notes: 'Comparison table with 3–5 options' },
      { level: 'h2', text: 'What to Expect: Delivery, Setup, and Support', notes: 'Reduce post-purchase anxiety' },
      { level: 'h2', text: `FAQ: ${pk}`, notes: '5–7 questions, featured snippet optimized' },
      { level: 'h2', text: 'Conclusion: Making Your Decision', notes: 'CTA + confidence builder' },
    ] : [
      { level: 'h1', text: pk, notes: 'Main hook' },
      { level: 'h2', text: 'Key Point', notes: 'Core message' },
    ],
    faqPlan: [
      { question: `What is the best ${pk}?`, answerDirection: 'Compare top options with specific criteria. 40–60 words.' },
      { question: `How much does ${pk} cost?`, answerDirection: 'Price range with value framing. 40–60 words.' },
      { question: `Is ${pk} worth it?`, answerDirection: 'ROI perspective with specific benefits. 40–60 words.' },
      { question: `Where can I try ${pk} before buying?`, answerDirection: 'Showroom visit CTA with location info. 40–60 words.' },
      { question: `What should I look for in ${pk}?`, answerDirection: 'Top 3–5 evaluation criteria. 40–60 words.' },
    ],
    platformSpecificStructure: isArticle
      ? { metaTitle: `${pk} | ${input.workspace.brandName} — ${year} Guide`, metaDescription: `Discover everything about ${pk}. Expert comparison, pricing, and buying guide.`, slug: pk.toLowerCase().replace(/[^a-z0-9]+/g, '-') }
      : { hookLine: `Did you know about ${pk}?`, bodyDirection: 'Key insight + social proof', ctaLine: input.keywordStrategy.recommendedCTA },
    internalLinkNeeds: ['Product page for primary model', 'Related blog post', 'Showroom/location page', 'Brand collection page'],
    externalCitationNeeds: ['Industry research on topic', 'Consumer reports or reviews', 'Health/wellness authority source'],
    imageOpportunities: ['Hero image — product/lifestyle', 'Comparison table visual', 'Feature detail close-up', 'Showroom/demo setting', 'Infographic — decision framework'],
    claimRisk: input.keywordStrategy.claimRisk || 'Low',
    claimRiskGuidance: input.keywordStrategy.claimRiskNotes || 'Standard compliance — no medical claims.',
    mustInclude: [
      'Primary keyword in H1 and first 100 words',
      'At least 3 secondary keywords naturally placed',
      'Comparison or evaluation framework',
      'Clear CTA aligned with persona intent',
      'Social proof or expert perspective',
    ],
    mustAvoid: [
      'Medical cure/treatment claims',
      'Pressure-selling language',
      'Unsubstantiated superlatives',
      'Competitor bashing',
      'Generic filler content',
    ],
    qualityChecklist: [
      'Primary keyword appears in H1, first paragraph, and meta title',
      'Content directly addresses the selected persona\'s buying psychology',
      'Decision barrier is explicitly addressed and resolved',
      'CTA is clear, specific, and low-friction',
      'All claims are supported with evidence or expert framing',
      'FAQ answers are 40–60 words each (featured snippet length)',
      'Tone matches workspace brand voice',
      'Content would pass E-E-A-T evaluation',
      'No unsupported medical or therapeutic claims',
      'Word count meets recommended range',
    ],
  };
}
