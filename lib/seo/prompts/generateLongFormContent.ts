/**
 * generate-long-form-seo-content — AI Long-Form Article Generation
 *
 * System prompt, user prompt builder, mock response, and types.
 * Only runs when selectedPlatformFormat is "article-blog".
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LongFormContentInput {
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
  platformFormat: string;
  contentGoal: string;
  approvedKeywordStrategy: {
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
  approvedContentBrief: {
    briefTitle: string;
    angle: string;
    readerProblem: string;
    decisionBarrierSolved: string;
    recommendedWordCount: string;
    outline: Array<{ level: string; text: string; notes?: string }>;
    faqPlan: Array<{ question: string; answerDirection: string }>;
    recommendedCTA: string;
    mustInclude: string[];
    mustAvoid: string[];
    qualityChecklist: string[];
    claimRiskGuidance: string;
  };
  mcmWorkspaceRulesIfApplicable: boolean;
}

export interface LongFormContentResult {
  article: {
    title: string;
    metaTitle: string;
    metaDescription: string;
    slug: string;
    content: string;
    wordCount: number;
    primaryKeyword: string;
    secondaryKeywordsUsed: string[];
    persona: string;
    topic: string;
    platformFormat: string;
    recommendedCTA: string;
    claimRiskNotes: string;
    generatedAt: string;
  };
}

// ─── System Prompt ───────────────────────────────────────────────────────────

export const LONG_FORM_CONTENT_SYSTEM_PROMPT = `You are an elite SEO content strategist and high-ticket conversion writer.

You write expert-level long-form content shaped by:
- target persona
- search intent
- content topic
- approved keyword strategy
- workspace brand positioning
- customer objections
- funnel stage
- conversion CTA

You must not write generic SEO filler.

MCM WORKSPACE RULES (apply only when mcmWorkspaceRulesIfApplicable is true):
- The article must help the reader make a more confident massage chair decision.
- Emphasize showroom demo, multi-brand comparison, expert guidance, service/warranty clarity, delivery/installation clarity, and matching the chair to body, home, budget, and lifestyle when relevant.
- Avoid unsupported medical claims.
- Use safe wellness language: comfort, relaxation, muscle tension relief, stress relief, recovery routine, zero gravity, full body massage chair.
- Do not over-hype products.
- Do not say one chair is best for everyone.
- Make comparison and buying guidance genuinely useful.
- Do not use cure/treatment/heal/therapeutic language unless the brief explicitly approves it with High claim risk guidance.

DYNAMIC WORD COUNT:
Use the brief's recommendedWordCount. General guidance:
- Local/service page: 900–1,500 words
- Product/model review: 1,500–2,300 words
- Comparison guide: 1,800–2,800 words
- Pillar buying guide: 2,500–3,500 words
Do not force every article to 3,000+ words.

KEYWORD RULES:
- Use primary keyword naturally in H1, intro, meta title, meta description, and at least one H2 if natural.
- Do not force exact match density.
- Use secondary keywords naturally where they fit.
- Avoid keyword stuffing.
- Optimize for semantic coverage and search intent satisfaction.

STRUCTURE REQUIREMENTS:
- H1 (must include primary keyword)
- Clear intro with no clichés ("In today's world..." is FORBIDDEN)
- Search-intent-satisfying direct answer early in the article
- H2/H3 structure from the approved brief outline
- Tables where useful (comparison, specs, feature breakdowns)
- Persona-specific objection handling
- Product/model guidance where relevant
- CTA section (aligned with brief CTA recommendation)
- FAQ section if the brief includes faqPlan

INTRODUCTION FORMULA:
1. Open with a specific, relatable question or scenario the persona faces
2. Acknowledge the difficulty or uncertainty
3. Promise clarity: "In this guide, you'll discover..."
4. Brief credibility signal

PARAGRAPH RULES:
- Maximum 4 sentences per paragraph
- Vary rhythm: short punchy sentence, then context, then develop
- Use "you" to address reader directly
- Every paragraph must end with a fact, insight, or bridge

ENGAGEMENT MECHANICS:
- Use callout boxes, tables, or numbered lists every 300–400 words
- Include at least 2 expert-perspective quotes (constructed from brand voice)
- Include at least 4 data points or specific claims with citation markers
- Include at least 2 real-world examples or scenarios

LINK RULES AT THIS STAGE:
Do not insert actual internal or external links yet.
Instead, mark natural link opportunities using:
[INTERNAL_LINK_OPPORTUNITY: anchor text | reason]
[EXTERNAL_LINK_OPPORTUNITY: claim or concept needing support | reason]

IMAGE RULES AT THIS STAGE:
Do not generate images yet.
Instead, mark image opportunities using:
[IMAGE_OPPORTUNITY: visual concept | placement rationale]

META REQUIREMENTS:
- metaTitle: 50–60 characters, primary keyword in first 40 characters
- metaDescription: 145–160 characters, include primary keyword and value proposition
- slug: primary keyword only, hyphenated, lowercase, max 5 words

FAQ SECTION:
- If the brief includes faqPlan, write each FAQ answer at 40–60 words (featured snippet length)
- Mark FAQ section with <!-- FAQ_START --> and <!-- FAQ_END -->

QUALITY GATE:
Before returning, verify:
- Word count is within the brief's recommended range
- Primary keyword appears in H1, first paragraph, and meta title
- No cliché openings
- No unsupported medical claims (if MCM)
- CTA is present and aligned with brief
- All outline sections from the brief are covered
- Content would make a practitioner nod in recognition

Return strict JSON matching the schema provided.`;

// ─── User Prompt Builder ─────────────────────────────────────────────────────

export function buildLongFormContentUserPrompt(input: LongFormContentInput): string {
  const ws = input.workspace ?? {} as LongFormContentInput['workspace'];
  const ks = input.approvedKeywordStrategy ?? {} as LongFormContentInput['approvedKeywordStrategy'];
  const cb = input.approvedContentBrief ?? {} as LongFormContentInput['approvedContentBrief'];
  const outline = cb.outline ?? [];
  const faqPlan = cb.faqPlan ?? [];

  const outlineStr = outline
    .map((o, i) => `  ${i + 1}. [${(o.level ?? 'h2').toUpperCase()}] ${o.text ?? ''}${o.notes ? ` — ${o.notes}` : ''}`)
    .join('\n');

  const faqStr = faqPlan
    .map((f, i) => `  ${i + 1}. Q: ${f.question ?? ''}\n     Direction: ${f.answerDirection ?? ''}`)
    .join('\n');

  return `WORKSPACE BRAND: ${ws.brandName ?? ''}
Website: ${ws.websiteUrl ?? ''}
Industry: ${ws.industry ?? ''}
Business Type: ${ws.businessType ?? ''}
Target Market: ${ws.targetMarket ?? ''}
Tone of Voice: ${ws.toneOfVoice ?? ''}
Core Offer: ${ws.coreOffer ?? ''}
Brand Differentiators: ${ws.brandDifferentiators ?? ''}
Compliance Notes: ${ws.complianceNotes ?? ''}
MCM Rules Active: ${input.mcmWorkspaceRulesIfApplicable ?? false}

SELECTED PERSONA: ${input.selectedPersona ?? ''}
Persona Description: ${input.selectedPersonaDescription ?? ''}

SELECTED TOPIC: ${input.selectedTopic ?? ''}
Topic ID: ${input.selectedTopicId ?? ''}
Content Goal: ${input.contentGoal ?? ''}

APPROVED KEYWORD STRATEGY:
- Primary Keyword: ${ks.primaryKeyword ?? ''}
- Secondary Keywords: ${(ks.secondaryKeywords ?? []).join(', ')}
- Search Intent: ${ks.searchIntent ?? ''}
- Funnel Stage: ${ks.funnelStage ?? ''}
- Commercial Priority: ${ks.commercialPriority ?? ''}
- Claim Risk: ${ks.claimRisk ?? ''}
- Claim Risk Notes: ${ks.claimRiskNotes ?? ''}
- Recommended CTA: ${ks.recommendedCTA ?? ''}
- Content Angle: ${ks.contentAngle ?? ''}

APPROVED CONTENT BRIEF:
Brief Title: ${cb.briefTitle ?? ''}
Angle: ${cb.angle ?? ''}
Reader Problem: ${cb.readerProblem ?? ''}
Decision Barrier Solved: ${cb.decisionBarrierSolved ?? ''}
Recommended Word Count: ${cb.recommendedWordCount ?? '2,500–3,500 words'}
Recommended CTA: ${cb.recommendedCTA ?? ''}
Claim Risk Guidance: ${cb.claimRiskGuidance ?? ''}

OUTLINE:
${outlineStr || 'No outline provided'}

FAQ PLAN:
${faqStr || 'No FAQ plan provided'}

MUST INCLUDE:
${(cb.mustInclude ?? []).map(m => `- ${m}`).join('\n') || '- None specified'}

MUST AVOID:
${(cb.mustAvoid ?? []).map(m => `- ${m}`).join('\n') || '- None specified'}

QUALITY CHECKLIST:
${(cb.qualityChecklist ?? []).map(q => `- ${q}`).join('\n') || '- None specified'}

TASK:
Write the full long-form SEO article following the approved brief and keyword strategy.
Mark link and image opportunities using the markers specified.
Do not insert actual links or images.

Return strict JSON:
{
  "article": {
    "title": "",
    "metaTitle": "",
    "metaDescription": "",
    "slug": "",
    "content": "full markdown article",
    "wordCount": 0,
    "primaryKeyword": "",
    "secondaryKeywordsUsed": [],
    "persona": "",
    "topic": "",
    "platformFormat": "Article/Blogs In-Depth Content",
    "recommendedCTA": "",
    "claimRiskNotes": "",
    "generatedAt": ""
  }
}`;
}

// ─── Mock Response ───────────────────────────────────────────────────────────

export function mockLongFormContent(input: LongFormContentInput): LongFormContentResult {
  const pk = input.approvedKeywordStrategy.primaryKeyword || input.selectedTopic;
  const brand = input.workspace.brandName;
  const year = new Date().getFullYear();
  const slug = pk.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const secKws = input.approvedKeywordStrategy.secondaryKeywords.slice(0, 5);

  const faqSection = input.approvedContentBrief.faqPlan.length > 0
    ? `\n\n<!-- FAQ_START -->\n\n## Frequently Asked Questions\n\n${input.approvedContentBrief.faqPlan.map(f =>
        `**Q: ${f.question}**\nA: ${f.answerDirection}`
      ).join('\n\n')}\n\n<!-- FAQ_END -->`
    : '';

  const outlineSections = input.approvedContentBrief.outline
    .filter(o => o.level !== 'h1')
    .map(o => {
      const heading = o.level === 'h2' ? `## ${o.text}` : `### ${o.text}`;
      const notes = o.notes ? `\n\n${o.notes}` : '';
      return `${heading}\n\nWhen considering ${pk}, understanding ${o.text.toLowerCase()} is essential for making the right decision. ${input.selectedPersona} buyers in particular need clarity here because this directly impacts their confidence in the purchase.${notes}\n\n[IMAGE_OPPORTUNITY: Visual illustrating ${o.text.toLowerCase()} | Placed after this section heading to break up text and add visual context]\n\nThe key factors to evaluate include quality, value, and long-term satisfaction. ${brand} recommends exploring options in person whenever possible — seeing, feeling, and comparing models side-by-side delivers insight that no amount of online research can replicate.\n\n[INTERNAL_LINK_OPPORTUNITY: explore our ${o.text.toLowerCase()} guide | Supports topical authority and user navigation]\n\n> **Expert Insight:** "The most important thing about ${o.text.toLowerCase()} is that every buyer's needs are different. What works perfectly for one person may not suit another — that's why personalized guidance matters." — ${brand} Product Specialist\n\n`;
    }).join('\n');

  const content = `# ${pk}: The Complete Guide for ${input.selectedPersona} (${year})

[IMAGE_OPPORTUNITY: Hero image — premium lifestyle shot representing ${pk} in a modern home setting | Hero placement above the fold]

You've been researching ${pk} for weeks — maybe months. You've read dozens of reviews, compared spec sheets, and still feel uncertain about which option is truly right for you. That uncertainty is completely normal, especially for a purchase at this level.

This guide was written specifically for buyers like you: ${input.selectedPersona.toLowerCase()} who want to make a confident, well-informed decision about ${pk} without the pressure, hype, or confusing jargon that dominates most of the content out there.

Here's what you'll discover: a clear framework for evaluating your options, the key factors that actually matter (and the ones that don't), and exactly how to move from research to a decision you'll feel great about.

[EXTERNAL_LINK_OPPORTUNITY: Consumer confidence in high-ticket purchases | Supports the claim that research-heavy purchases benefit from expert guidance]

---

${outlineSections}

## Making Your Decision: Next Steps

After reading this guide, you should have a much clearer picture of what ${pk} means for your specific situation. The best next step? **${input.approvedContentBrief.recommendedCTA || input.approvedKeywordStrategy.recommendedCTA}.**

${brand} has helped thousands of buyers navigate exactly this decision. Whether you're comparing options, narrowing down your shortlist, or ready to experience the difference in person, our team is here to help — no pressure, just expert guidance.

[INTERNAL_LINK_OPPORTUNITY: schedule a consultation or visit our showroom | Primary conversion action]
${faqSection}

---

*Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} | Reviewed by the ${brand} team*`;

  return {
    article: {
      title: `${pk}: The Complete Guide for ${input.selectedPersona} (${year})`,
      metaTitle: `${pk} | ${brand} — ${year} Expert Guide`,
      metaDescription: `Discover everything about ${pk}. Expert comparison, honest guidance, and a clear path to a confident decision. Read the guide →`,
      slug,
      content,
      wordCount: content.split(/\s+/).length,
      primaryKeyword: pk,
      secondaryKeywordsUsed: secKws,
      persona: input.selectedPersona,
      topic: input.selectedTopic,
      platformFormat: 'Article/Blogs In-Depth Content',
      recommendedCTA: input.approvedContentBrief.recommendedCTA || input.approvedKeywordStrategy.recommendedCTA,
      claimRiskNotes: input.approvedKeywordStrategy.claimRiskNotes || 'Standard compliance — no medical claims.',
      generatedAt: new Date().toISOString(),
    },
  };
}
