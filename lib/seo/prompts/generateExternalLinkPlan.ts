/**
 * generate-external-link-plan — AI External Link Strategy
 *
 * Runs AFTER content generation. Selects external citation links
 * from neutral, authoritative sources only. Never links to
 * competitors, sellers, brands, marketplaces, or affiliate sites.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExternalSourceType =
  | 'government'
  | 'university'
  | 'medical institution'
  | 'peer-reviewed journal'
  | 'consumer safety'
  | 'research organization'
  | 'standards organization'
  | 'other';

export interface ExternalLinkPlanInput {
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
    claimRisk: string;
    claimRiskNotes: string;
  };
  mcmWorkspaceRulesIfApplicable: boolean;
}

export interface ExternalLinkItem {
  sourceType: ExternalSourceType;
  targetUrl: string;
  sourceName: string;
  anchorText: string;
  claimSupported: string;
  placementSection: string;
  reason: string;
  trustScore: number;
  commercialConflictRisk: 'Low' | 'Medium' | 'High';
}

export interface ExternalLinkPlanResult {
  externalLinkPlan: ExternalLinkItem[];
  rejectedSourceTypes: string[];
  warnings: string[];
  notes: string;
}

// ─── System Prompt ───────────────────────────────────────────────────────────

export const EXTERNAL_LINK_PLAN_SYSTEM_PROMPT = `You are an expert SEO external citation strategist focused on E-E-A-T compliance and editorial integrity.

Your task is to create an external link plan for the generated content.

ABSOLUTE EXTERNAL LINK RULES:
1. Never link to a homepage URL. Always use specific article/report/page URLs.
2. Never link to a massage chair seller or retailer.
3. Never link to a massage chair brand website (Panasonic, OHCO, Osaki, Titan, Luraco, Infinity, Daiwa, Human Touch, Positive Posture, D.Core, KOYO, or any other massage chair manufacturer).
4. Never link to a competitor of the workspace brand.
5. Never link to Amazon, Costco, Walmart, eBay, Wayfair, Best Buy, Target, or any marketplace.
6. Never link to affiliate review sites (Massage Chair Planet, Chair Institute, Modern Massage Chairs, etc.).
7. Never link to low-quality AI-generated blogs or content farms.
8. Prefer reliable, neutral authority sources:
   - Government sources (CDC, NIH, FDA, OSHA, CPSC, FTC, WHO, .gov sites)
   - University sources (.edu, research labs, faculty publications)
   - Medical institutions (Mayo Clinic, Cleveland Clinic, Johns Hopkins, WebMD for general wellness only)
   - Peer-reviewed journals (PubMed, JAMA, The Lancet, BMJ, Spine, JOSPT)
   - Consumer safety organizations (Consumer Reports, CPSC, BBB)
   - Standards organizations (ANSI, ISO, UL, BIFMA)
   - Reputable research institutions (Gartner, Forrester, Statista, Pew Research, IBISWorld)
   - Neutral industry associations
9. Use external links only where they genuinely support a factual claim, statistic, research finding, safety guidance, or consumer education point in the content.
10. Do not over-link. Recommend 2–5 external links for long-form content. 0–2 for short-form content.
11. Every external link must point to a specific page, article, or report — never a root domain.

MCM-SPECIFIC EXTERNAL LINK LOGIC (apply only when mcmWorkspaceRulesIfApplicable is true):
- For health/wellness topics: use government health sources (NIH, CDC) or major medical institutions (Mayo Clinic, Cleveland Clinic). Never cite massage chair brands as health authorities.
- For ergonomics/body fit/posture: use occupational health sources (OSHA), ergonomics research, or university studies.
- For home safety/product safety: use CPSC, UL, or consumer safety organizations.
- For consumer decision-making/price/value: use Consumer Reports, FTC consumer guides, or neutral financial literacy resources.
- For sleep/stress/relaxation claims: use government wellness resources or peer-reviewed meta-analyses. Do not use commercial wellness sites.
- For warranty/service claims: use FTC warranty guides, BBB, or state consumer protection resources.
- Do NOT cite any massage chair manufacturer, retailer, marketplace, or affiliate reviewer for ANY claim.

SCORING:
- trustScore: 1–10 based on source authority and reliability.
  - 10: Government (.gov), peer-reviewed journal
  - 8–9: Major medical institution, major university
  - 6–7: Established research org, standards body, consumer safety org
  - 4–5: Reputable media, industry association
  - 1–3: Other (should be rare)
- commercialConflictRisk: "Low" = neutral authority with no commercial interest, "Medium" = some commercial angle but generally trusted, "High" = potential conflict of interest (should be rejected).

CLAIM IDENTIFICATION:
Scan the content for:
- Statistics or data points that need citation
- Health, wellness, or safety claims
- Consumer protection or warranty law references
- Research findings or survey results
- Definitions of technical terms from authoritative sources
- Best practice recommendations

Return strict JSON matching the schema provided.`;

// ─── User Prompt Builder ─────────────────────────────────────────────────────

export function buildExternalLinkPlanUserPrompt(input: ExternalLinkPlanInput): string {
  // Truncate content for prompt efficiency
  const contentSnippet = (input.generatedContent ?? "").length > 3500
    ? (input.generatedContent ?? "").slice(0, 3500) + '\n\n[... content continues ...]'
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
Search Intent: ${(input.approvedKeywordStrategy ?? {} as any).searchIntent ?? ""}
Funnel Stage: ${input.approvedKeywordStrategy.funnelStage}
Claim Risk: ${(input.approvedKeywordStrategy ?? {} as any).claimRisk ?? "Low"}
Claim Risk Notes: ${(input.approvedKeywordStrategy ?? {} as any).claimRiskNotes ?? ""}

GENERATED CONTENT:
${contentSnippet}

REJECTED SOURCE TYPES (never use these):
- Massage chair sellers or retailers
- Massage chair brand websites
- Competitors
- Amazon, Costco, Walmart, eBay, Wayfair, marketplaces
- Affiliate review sites
- Low-quality AI-generated blogs
- Homepage URLs (root domains without specific page paths)

TASK:
Identify claims in the content that need external citation support.
Recommend 2–5 authoritative external links for long-form content, or 0–2 for short-form.
Each link must point to a specific page/article/report, not a root domain.

Return strict JSON:
{
  "externalLinkPlan": [
    {
      "sourceType": "government | university | medical institution | peer-reviewed journal | consumer safety | research organization | standards organization | other",
      "targetUrl": "",
      "sourceName": "",
      "anchorText": "",
      "claimSupported": "",
      "placementSection": "",
      "reason": "",
      "trustScore": 0,
      "commercialConflictRisk": "Low | Medium | High"
    }
  ],
  "rejectedSourceTypes": [],
  "warnings": [],
  "notes": ""
}`;
}

// ─── Mock Response ───────────────────────────────────────────────────────────

export function mockExternalLinkPlan(input: ExternalLinkPlanInput): ExternalLinkPlanResult {
  const topic = input.selectedTopic.toLowerCase();
  const isShortForm = ['text-post', 'image-post', 'instagram-story', 'linkedin-story', 'comment-engagement'].includes(input.selectedPlatformFormat);
  const isMCM = input.mcmWorkspaceRulesIfApplicable;

  // Topic-aware mock sources
  const healthSources: ExternalLinkItem[] = [
    {
      sourceType: 'government',
      targetUrl: 'https://www.nccih.nih.gov/health/massage-therapy-what-you-need-to-know',
      sourceName: 'National Center for Complementary and Integrative Health (NCCIH/NIH)',
      anchorText: 'NIH overview of massage therapy research',
      claimSupported: 'General wellness benefits of massage for relaxation and muscle tension',
      placementSection: 'Benefits or wellness discussion section',
      reason: 'Government health authority providing evidence-based overview of massage research — neutral, non-commercial',
      trustScore: 10,
      commercialConflictRisk: 'Low',
    },
    {
      sourceType: 'medical institution',
      targetUrl: 'https://www.mayoclinic.org/healthy-lifestyle/stress-management/in-depth/massage/art-20045743',
      sourceName: 'Mayo Clinic',
      anchorText: 'Mayo Clinic guide to massage and stress management',
      claimSupported: 'Massage as a component of stress management routine',
      placementSection: 'Stress relief or relaxation section',
      reason: 'Top-tier medical institution — trusted consumer health source, no commercial conflict',
      trustScore: 9,
      commercialConflictRisk: 'Low',
    },
  ];

  const consumerSources: ExternalLinkItem[] = [
    {
      sourceType: 'consumer safety',
      targetUrl: 'https://www.consumer.ftc.gov/articles/understanding-warranties',
      sourceName: 'Federal Trade Commission (FTC)',
      anchorText: 'FTC guide to understanding product warranties',
      claimSupported: 'Consumer rights regarding product warranties and service agreements',
      placementSection: 'Warranty or service discussion section',
      reason: 'Federal consumer protection authority — authoritative on warranty rights and obligations',
      trustScore: 10,
      commercialConflictRisk: 'Low',
    },
    {
      sourceType: 'consumer safety',
      targetUrl: 'https://www.consumerreports.org/cro/magazine/2015/05/how-to-buy-big-ticket-items/index.htm',
      sourceName: 'Consumer Reports',
      anchorText: 'Consumer Reports guide to high-ticket purchases',
      claimSupported: 'Best practices for evaluating and purchasing expensive consumer products',
      placementSection: 'Buying decision or value section',
      reason: 'Most trusted independent consumer testing organization — no commercial ties to sellers',
      trustScore: 8,
      commercialConflictRisk: 'Low',
    },
  ];

  const ergonomicsSources: ExternalLinkItem[] = [
    {
      sourceType: 'government',
      targetUrl: 'https://www.osha.gov/ergonomics',
      sourceName: 'OSHA — Ergonomics',
      anchorText: 'OSHA ergonomics standards and best practices',
      claimSupported: 'Ergonomic posture and body support principles',
      placementSection: 'Posture, fit, or ergonomics discussion section',
      reason: 'Federal occupational safety authority — authoritative on ergonomic standards',
      trustScore: 10,
      commercialConflictRisk: 'Low',
    },
  ];

  const researchSources: ExternalLinkItem[] = [
    {
      sourceType: 'research organization',
      targetUrl: 'https://www.statista.com/topics/1850/furniture-market-in-the-us/',
      sourceName: 'Statista — U.S. Furniture Market',
      anchorText: 'Statista market research on U.S. furniture and home comfort industry',
      claimSupported: 'Market size, consumer spending, or industry growth data',
      placementSection: 'Industry context or market overview section',
      reason: 'Leading market research database — neutral data source',
      trustScore: 7,
      commercialConflictRisk: 'Low',
    },
  ];

  // Build plan based on topic relevance
  let plan: ExternalLinkItem[] = [];

  const hasHealth = /pain|back|neck|shoulder|stress|relief|recovery|wellness|therapy|muscle|tension|circulation|sleep/i.test(topic + ' ' + (input.generatedContent ?? "").slice(0, 500));
  const hasWarranty = /warranty|service|support|repair|protect/i.test(topic);
  const hasErgonomics = /posture|ergonomic|fit|space|dimension|body|comfort|zero.gravity/i.test(topic);
  const hasBuying = /buy|price|cost|value|compare|worth|invest/i.test(topic);

  if (hasHealth) plan.push(...healthSources);
  if (hasWarranty || hasBuying) plan.push(...consumerSources);
  if (hasErgonomics) plan.push(...ergonomicsSources);
  if (plan.length < 2) plan.push(...researchSources);

  // For MCM, always include at least one health + one consumer source
  if (isMCM && plan.length < 2) {
    plan = [healthSources[0], consumerSources[0]];
  }

  // Cap based on format
  if (isShortForm) {
    plan = plan.slice(0, 1);
  } else {
    plan = plan.slice(0, 4);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  plan = plan.filter(l => {
    if (seen.has(l.targetUrl)) return false;
    seen.add(l.targetUrl);
    return true;
  });

  const warnings: string[] = [];
  if (((input.approvedKeywordStrategy ?? {} as any).claimRisk ?? 'Low') === 'High') {
    warnings.push('High claim risk detected. Ensure all health/wellness claims are supported by cited sources. Avoid unsupported therapeutic claims.');
  }
  if (isShortForm && plan.length === 0) {
    warnings.push('Short-form content — external links optional. Only include if a specific claim needs support.');
  }

  return {
    externalLinkPlan: plan,
    rejectedSourceTypes: [
      'massage chair sellers or retailers',
      'massage chair brand websites',
      'competitor websites',
      'Amazon, Costco, Walmart, eBay, Wayfair, marketplaces',
      'affiliate review sites',
      'low-quality AI-generated blogs',
      'homepage URLs (root domains)',
    ],
    warnings,
    notes: `Selected ${plan.length} external citation links from neutral authority sources. All links point to specific pages, not root domains. No commercial conflict sources included.`,
  };
}
