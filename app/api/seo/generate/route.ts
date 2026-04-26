import { NextRequest, NextResponse } from 'next/server';
import { KEYWORD_SELECTION_SYSTEM_PROMPT, buildKeywordSelectionUserPrompt, mockKeywordStrategy, type KeywordSelectionInput } from '@/lib/seo/prompts/selectKeywords';
import { CONTENT_BRIEF_SYSTEM_PROMPT, buildContentBriefUserPrompt, mockContentBrief, type ContentBriefInput } from '@/lib/seo/prompts/generateBrief';
import { LONG_FORM_CONTENT_SYSTEM_PROMPT, buildLongFormContentUserPrompt, mockLongFormContent, type LongFormContentInput } from '@/lib/seo/prompts/generateLongFormContent';
import { PLATFORM_CONTENT_SYSTEM_PROMPT, buildPlatformContentUserPrompt, mockPlatformContent, type PlatformContentInput } from '@/lib/seo/prompts/generatePlatformContent';
import { INTERNAL_LINK_PLAN_SYSTEM_PROMPT, buildInternalLinkPlanUserPrompt, mockInternalLinkPlan, type InternalLinkPlanInput } from '@/lib/seo/prompts/generateInternalLinkPlan';
import { EXTERNAL_LINK_PLAN_SYSTEM_PROMPT, buildExternalLinkPlanUserPrompt, mockExternalLinkPlan, type ExternalLinkPlanInput } from '@/lib/seo/prompts/generateExternalLinkPlan';
import { INJECT_LINKS_SYSTEM_PROMPT, buildInjectLinksUserPrompt, mockInjectLinks as mockInjectApprovedLinks, type InjectLinksInput } from '@/lib/seo/prompts/injectApprovedLinks';
import { IMAGE_REFERENCE_SYSTEM_PROMPT, buildImageReferenceUserPrompt, discoverImageReferences, type ImageReferenceInput } from '@/lib/seo/prompts/discoverImageReferences';
import { IMAGE_PLAN_SYSTEM_PROMPT, buildImagePlanUserPrompt, mockImagePlan, type ImagePlanInput } from '@/lib/seo/prompts/generateImagePlan';
import { mockContentImages, generateContentImages, type ContentImagesInput } from '@/lib/seo/prompts/generateContentImages';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isHomepageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname === '/' || parsed.pathname === '';
  } catch {
    // Relative URL like "/" or ""
    return url === '/' || url === '' || url === '#';
  }
}

// ─── Business Type Context Prompts ───────────────────────────────────────────

const BUSINESS_TYPE_CONTEXT: Record<string, string> = {
  B2B: `BUSINESS TYPE CONTEXT: B2B (Business-to-Business)
  Writing strategy for B2B audiences:
  • Decision-making is rational, committee-driven, and ROI-focused — every claim must tie to business outcomes (revenue, efficiency, risk reduction)
  • Buyer journey is long (weeks to months); content must support multiple stakeholders (end user, manager, C-suite, procurement)
  • Lead with business pain points and industry-specific challenges, not product features
  • Use data, case studies, and proof points prominently — B2B buyers demand evidence before trust
  • Tone: professional, expert, peer-to-peer — never patronizing or sales-y
  • Avoid consumer-style language ("you'll love", "amazing", "life-changing") — use business language ("improves efficiency by X%", "reduces operational cost", "scales with your organization")
  • Include ROI framing: "companies that implement X see Y within Z months"
  • Feature comparison tables and implementation complexity notes (B2B buyers evaluate fit, not just features)
  • CTAs should be low-friction: "schedule a demo", "request a consultation", "download the whitepaper" — not "buy now"
  • Reference industry frameworks, compliance requirements, or integration ecosystems where relevant`,

  B2C: `BUSINESS TYPE CONTEXT: B2C (Business-to-Consumer)
  Writing strategy for B2C audiences:
  • Decision-making is emotional, individual, and benefit-driven — lead with how the product improves the reader's life
  • Buyer journey is short (hours to days); create urgency and desire without pressure tactics
  • Use vivid, sensory language that helps the reader picture the outcome
  • Tone: warm, conversational, relatable — the brand feels like a trusted friend, not a corporation
  • Lead with lifestyle benefits over technical specs; features support the emotional promise
  • Social proof is powerful: reviews, before/after, community, influencer alignment
  • Price sensitivity and value framing matter — address the "is it worth it?" question proactively
  • CTAs should be direct and benefit-led: "get yours today", "start your free trial", "shop the collection"
  • Use "you" frequently and write in second person to create personal connection
  • Address common objections (shipping, returns, trust) within the content naturally`,

  B2G: `BUSINESS TYPE CONTEXT: B2G (Business-to-Government)
  Writing strategy for B2G audiences:
  • Decision-making is process-driven, compliance-focused, and multi-approval — content must establish regulatory alignment and procedural fit
  • Emphasize certifications, compliance standards, security protocols, and audit trails
  • Tone: formal, factual, precise — government procurement readers are evaluating against strict criteria
  • ROI framing shifts to: taxpayer value, operational efficiency, risk mitigation, and public benefit
  • Reference applicable standards (FedRAMP, FISMA, ISO, GDPR equivalent, etc.) where relevant to topic
  • Avoid marketing hype entirely — every claim must be verifiable and conservative
  • Procurement language matters: use terms like "scalable solution", "interoperability", "lifecycle cost", "vendor accountability"
  • CTAs: "request an RFP response", "schedule a capabilities briefing", "download the compliance overview"
  • Case studies from other government or public sector clients are the most powerful proof
  • Content should anticipate due diligence questions: security, support SLAs, data sovereignty`,

  Both: `BUSINESS TYPE CONTEXT: Dual B2B + B2C Audience
  Writing strategy for mixed B2B and B2C audiences:
  • Structure content to serve both audiences — use H2 sections or callout boxes that explicitly address each segment
  • Lead with the universal value proposition (the problem solved for everyone), then bifurcate into B2B and consumer applications
  • B2B signals: ROI language, case studies, integration capabilities, procurement considerations
  • B2C signals: lifestyle benefits, ease of use, social proof, emotional outcomes
  • Tone: accessible yet credible — reads like a knowledgeable friend who also understands business
  • CTAs should offer two paths: one B2B ("talk to our enterprise team") and one B2C ("start free today")
  • Avoid language that alienates either segment — no jargon that confuses consumers, no oversimplification that dismisses business buyers
  • Comparison tables can serve both: include both "personal use" and "business/team use" columns`,
};

// ─── Mock AI responses ────────────────────────────────────────────────────────

function mockKeywords(brandIntake: Record<string, unknown>) {
  const topic = (brandIntake.priorityTopic as string) || (brandIntake.industry as string) || 'marketing';
  const brand = (brandIntake.brandName as string) || 'Brand';

  return [
    { id: 'kw1', keyword: `best ${topic} strategies`, searchIntent: 'informational', funnelStage: 'top', businessRelevance: 8, conversionValue: 6, contentOpportunity: 'High-volume educational query', category: 'primary', validationStatus: 'pending' },
    { id: 'kw2', keyword: `${topic} guide ${new Date().getFullYear()}`, searchIntent: 'informational', funnelStage: 'top', businessRelevance: 9, conversionValue: 7, contentOpportunity: 'Yearly updated content opportunity', category: 'primary', validationStatus: 'pending' },
    { id: 'kw3', keyword: `how to improve ${topic}`, searchIntent: 'informational', funnelStage: 'middle', businessRelevance: 7, conversionValue: 5, contentOpportunity: 'How-to intent, high engagement', category: 'secondary', validationStatus: 'pending' },
    { id: 'kw4', keyword: `${topic} tools`, searchIntent: 'commercial', funnelStage: 'middle', businessRelevance: 8, conversionValue: 8, contentOpportunity: 'Commercial intent, comparison opportunity', category: 'secondary', validationStatus: 'pending' },
    { id: 'kw5', keyword: `${topic} for small business`, searchIntent: 'informational', funnelStage: 'top', businessRelevance: 6, conversionValue: 5, contentOpportunity: 'Niche audience targeting', category: 'supporting', validationStatus: 'pending' },
    { id: 'kw6', keyword: `${topic} best practices`, searchIntent: 'informational', funnelStage: 'middle', businessRelevance: 7, conversionValue: 6, contentOpportunity: 'Authority-building content', category: 'supporting', validationStatus: 'pending' },
    { id: 'kw7', keyword: `${brand} ${topic}`, searchIntent: 'navigational', funnelStage: 'bottom', businessRelevance: 10, conversionValue: 9, contentOpportunity: 'Brand + topic association', category: 'supporting', validationStatus: 'pending' },
    { id: 'kw8', keyword: `${topic} vs traditional approach`, searchIntent: 'commercial', funnelStage: 'middle', businessRelevance: 7, conversionValue: 7, contentOpportunity: 'Comparison content for decision-makers', category: 'secondary', validationStatus: 'pending' },
    { id: 'kw9', keyword: `top ${topic} mistakes`, searchIntent: 'informational', funnelStage: 'top', businessRelevance: 6, conversionValue: 4, contentOpportunity: 'Negative keyword, high CTR potential', category: 'supporting', validationStatus: 'pending' },
    { id: 'kw10', keyword: `${topic} ROI calculator`, searchIntent: 'transactional', funnelStage: 'bottom', businessRelevance: 8, conversionValue: 9, contentOpportunity: 'Interactive tool opportunity, high conversion', category: 'primary', validationStatus: 'pending' },
  ];
}

function mockBrief(data: Record<string, unknown>) {
  const primaryKw = (data.primaryKeyword as string) || 'topic';
  const userBriefInput = (data.userBriefInput as string || '').trim();
  const intentNote = userBriefInput
    ? `Users searching for "${primaryKw}" are looking for comprehensive guidance. Additional focus per user instructions: ${userBriefInput.slice(0, 120)}.`
    : `Users searching for "${primaryKw}" are looking for comprehensive, actionable guidance they can implement immediately.`;
  return {
    finalKeywords: [primaryKw, ...(data.secondaryKeywords as string[] || [])],
    searchIntentSummary: intentNote,
    targetPersona: (data.brandIntake as Record<string, unknown>)?.targetAudience as string || 'Business professionals',
    funnelStage: 'middle',
    contentGoal: 'Establish authority and drive qualified leads through in-depth, valuable content',
    pageType: (data.brandIntake as Record<string, unknown>)?.pageType as string || 'blog',
    contentAngle: `The definitive resource for ${primaryKw} — covering strategies, tools, common mistakes, and real results.`,
    differentiationAngle: 'Combine expert insights with actionable frameworks and data-driven recommendations.',
    titleIdeas: [
      `The Complete Guide to ${primaryKw} (${new Date().getFullYear()})`,
      `${primaryKw}: Expert Strategies That Actually Work`,
      `How to Master ${primaryKw}: A Step-by-Step Framework`,
    ],
    h1: `The Ultimate Guide to ${primaryKw}`,
    outline: [
      { level: 'h2', text: `What is ${primaryKw}?` },
      { level: 'h3', text: 'Key Definitions and Context' },
      { level: 'h2', text: `Why ${primaryKw} Matters in ${new Date().getFullYear()}` },
      { level: 'h3', text: 'Industry Statistics and Trends' },
      { level: 'h2', text: `Step-by-Step ${primaryKw} Strategy` },
      { level: 'h3', text: 'Step 1: Assessment and Planning' },
      { level: 'h3', text: 'Step 2: Implementation Framework' },
      { level: 'h3', text: 'Step 3: Measurement and Optimization' },
      { level: 'h2', text: `Common ${primaryKw} Mistakes to Avoid` },
      { level: 'h2', text: `Best Tools for ${primaryKw}` },
      { level: 'h2', text: 'Expert Tips and Best Practices' },
      { level: 'h2', text: `FAQ: ${primaryKw}` },
    ],
    faqOpportunities: [
      `What is the best way to get started with ${primaryKw}?`,
      `How long does it take to see results from ${primaryKw}?`,
      `What are the most common ${primaryKw} mistakes?`,
      `How much does ${primaryKw} cost?`,
    ],
    richSnippetOpportunities: ['FAQ schema', 'How-to schema', 'Table of comparison'],
    internalLinkOpportunities: ['Related blog posts', 'Product/service pages', 'Case studies'],
    externalSourceOpportunities: ['Industry reports', 'Statistics databases', 'Expert quotes'],
    ctaDirection: `Encourage readers to try ${(data.brandIntake as Record<string, unknown>)?.brandName || 'the product'} for their ${primaryKw} needs`,
    conversionGoal: 'Lead capture through content upgrade or free trial',
  };
}

function mockArticle(data: Record<string, unknown>) {
  const brief = data.brief as Record<string, unknown> | null;
  const title = (brief?.h1 as string) || 'Generated Article';
  const primaryKw = (data.writingPrompt as string)?.match(/PRIMARY KEYWORD[:\s]*"([^"]+)"/i)?.[1] || 'topic';
  const brandIntake = data.brandIntake as Record<string, unknown> | null;
  const brand = (brandIntake?.brandName as string) || 'Your Brand';
  const industry = (brandIntake?.industry as string) || 'industry';
  const websiteUrl = ((brandIntake?.websiteUrl as string) || 'https://example.com').replace(/\/$/, '');
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const year = new Date().getFullYear();

  const content = `# ${title}

[IMAGE: Hero image — a high-quality, professionally lit scene representing ${primaryKw} in a modern ${industry} context. Wide format, 1200×630px.]

Have you ever wondered why some companies seem to effortlessly dominate search results while others — with arguably better products — remain invisible? The answer almost always traces back to one thing: **${primaryKw}**. And the gap between those who understand it deeply and those who merely dabble in it is widening every single year.

This guide is not another surface-level overview. We've spent months interviewing practitioners, analyzing ranking patterns, and distilling what actually moves the needle in ${year}. Whether you're building from scratch or scaling what's already working, what follows is the most honest, practical breakdown of **${primaryKw}** you'll find anywhere online.

---

## What Is ${primaryKw}? (And Why Most Definitions Miss the Point)

Most definitions of ${primaryKw} are technically correct but strategically useless. They describe *what* it is without explaining *why it behaves the way it does* or *what separates the top 1% from everyone else*.

Here's the working definition that actually helps:

> **${primaryKw}** is the systematic process of aligning your content, authority signals, and user experience with the exact signals search engines use to determine relevance, trust, and value — not just for today's algorithm, but for the next three updates.

[LINK: learn more about search engine algorithms|https://developers.google.com/search/docs/fundamentals/how-search-works]

### The Three Layers Nobody Talks About

Most practitioners operate at Layer 1. Elite performers understand all three:

| Layer | Focus | Impact |
|-------|-------|--------|
| **Technical** | Crawlability, site speed, structured data | Foundation — necessary but not sufficient |
| **Content Authority** | E-E-A-T signals, semantic depth, original research | Differentiator in competitive niches |
| **Intent Architecture** | Matching content format to searcher psychology | The multiplier that compounds everything |

[IMAGE: Infographic showing the three-layer model: Technical → Content Authority → Intent Architecture, each layer building on the previous. Clean, minimal design on dark background.]

---

## Why ${primaryKw} Matters More in ${year} Than Ever Before

The landscape shifted. Here's the data that should concern every ${industry} business owner:

- **68% of online experiences** begin with a search engine *(BrightEdge Research)*
- The top 3 organic results capture **54.4% of all clicks** — position 4-10 share roughly 10% combined
- Companies that blog consistently generate **[LINK: 3x more leads|https://www.hubspot.com/marketing-statistics] than those that don't**
- Voice search now accounts for **27% of mobile queries**, completely changing keyword intent patterns

But here's what the numbers don't show: the *compounding nature* of getting ${primaryKw} right. Unlike paid ads that stop the moment your budget runs out, a well-executed content strategy builds assets that appreciate over time.

[IMAGE: Line graph comparing organic traffic growth (compound curve) vs. paid traffic (flat line that drops to zero when spend stops). Labeled clearly, brand colors.]

### The ${year} Algorithm Reality Check

Google's recent updates have made one thing unmistakably clear: **generic, surface-level content is being systematically devalued**. The Helpful Content system now evaluates whether content demonstrates:

1. **First-hand experience** with the topic (E-E-A-T's new "E")
2. **Genuine expertise** — not just keyword density
3. **Authoritativeness** signals — citations, author bios, external validation
4. **Trustworthiness** — HTTPS, clear attribution, factual accuracy

This is both a threat to lazy content strategies and a massive opportunity for brands willing to go deep.

---

## The Step-by-Step ${primaryKw} Framework

This is the framework we've refined across dozens of campaigns. It's not linear — it's iterative. But for clarity, here's the sequence that minimizes wasted effort:

[IMAGE: Horizontal process diagram showing 5 steps: Research → Architecture → Creation → Amplification → Iteration. Each step has an icon and brief descriptor. Professional, modern design.]

### Step 1: Demand Mapping (Where Most People Start Too Late)

Before writing a single word, you need to understand *demand topology* — the full landscape of what people are actually searching for, not just the obvious head terms.

**The Demand Mapping Process:**

1. **Seed keyword expansion** — Start with 5-10 core terms, expand to 200+ variations using semantic clustering
2. **Intent classification** — Group by informational, commercial, navigational, and transactional intent
3. **Competition gap analysis** — Identify where high-demand + low-competition intersects for your domain authority
4. **Content cannibalization audit** — Ensure new content won't compete with existing pages

> 💡 **Practitioner Insight**: The most valuable keywords are rarely the ones with the highest volume. Look for "intent-rich" queries with 500-2,000 monthly searches — these convert at 3-5x the rate of broad head terms.

### Step 2: Content Architecture

Your site structure is a signal. [LINK: Google's documentation on site structure|https://developers.google.com/search/docs/crawling-indexing/valid-page-metadata] explicitly acknowledges that logical hierarchy helps both crawlers and users.

The architecture that consistently outperforms:

\`\`\`
Pillar Page (broad, authoritative)
├── Cluster Page: Subtopic A (deep, specific)
├── Cluster Page: Subtopic B (deep, specific)
├── Cluster Page: Subtopic C (deep, specific)
└── Supporting Content (FAQs, case studies, tools)
\`\`\`

**Why this works**: Internal link equity flows from cluster to pillar, signaling topical authority. External links to cluster pages elevate the entire topic cluster.

### Step 3: Content Creation at Depth

Depth is a strategic choice, not a preference. [LINK: Backlinko's content length study|https://backlinko.com/search-engine-ranking] found that the average first-page result contains **1,447 words** — but in competitive niches, 2,500-4,000 words consistently outranks shorter content.

The structure that works:

- **Power Introduction** (150-200 words): Hook → Problem frame → Promise → Proof of authority
- **Definition section** (300-400 words): Not just what, but *why it matters* and *what changes* when you understand it
- **Core methodology** (800-1,200 words): The "How" — broken into scannable subsections
- **Proof layer** (300-500 words): Data, case studies, expert quotes — never make claims without evidence
- **FAQ section** (400-600 words): 5-8 questions, each a standalone featured snippet candidate
- **Conclusion + CTA** (150-200 words): Synthesize the key insight, then make the next step obvious

### Step 4: On-Page Optimization

This is where technical meets creative. The non-negotiables:

- **Title tag**: Primary keyword within first 60 characters, written for click-through, not just ranking
- **Meta description**: 150-160 characters, include a value proposition and soft CTA
- **H1**: Exact or close variant of primary keyword — one per page, always
- **First paragraph**: Primary keyword in the first 100 words, naturally integrated
- **Image optimization**: Descriptive alt text, compressed files (WebP), lazy loading
- **Internal linking**: 3-5 contextual links per 1,000 words to related content

[IMAGE: Screenshot mockup of a perfectly optimized page with callouts highlighting: title tag, meta description, H1, first keyword placement, image alt text. Clean and educational.]

### Step 5: Authority Building

Content alone doesn't rank. **Authority signals** — primarily backlinks from relevant, high-DA domains — remain the most powerful ranking factor for competitive terms.

The authority-building approaches that work in ${year}:

1. **Digital PR**: Original research, surveys, and data studies attract editorial links
2. **Expert collaboration**: Co-authored content with recognized names in ${industry}
3. **Resource creation**: Tools, calculators, and templates that others naturally link to
4. **Reactive PR**: Responding to journalists via HARO with expert commentary

---

## The ${primaryKw} Mistakes That Are Silently Killing Your Rankings

These aren't beginner mistakes. Even experienced teams make them.

**❌ Mistake #1: Optimizing for keywords instead of topics**
Google understands semantic relationships. Cramming one keyword 47 times hurts more than it helps. [LINK: Google's guide on avoiding keyword stuffing|https://developers.google.com/search/docs/fundamentals/seo-starter-guide]

**❌ Mistake #2: Publishing and abandoning**
Content decay is real. Pages that aren't refreshed lose rankings over 12-18 months as fresher competitors emerge. Build a refresh calendar.

**❌ Mistake #3: Ignoring Core Web Vitals**
Since the Page Experience update, LCP (Largest Contentful Paint), FID (First Input Delay), and CLS (Cumulative Layout Shift) directly impact rankings. [LINK: Check your Core Web Vitals|https://pagespeed.web.dev]

**❌ Mistake #4: Thin content at scale**
Publishing 50 mediocre posts is almost always worse than publishing 15 genuinely exceptional ones. Google's Helpful Content system penalizes domains with disproportionate amounts of low-quality content.

**❌ Mistake #5: No E-E-A-T investment**
Author pages, about pages, citations, and external mentions are infrastructure. Skipping them is like building a house without a foundation.

---

## ${primaryKw} Tools Worth Your Time (And Some That Aren't)

The tools landscape is crowded with noise. Here's what professionals actually use:

| Tool | Best For | Investment |
|------|----------|------------|
| **[Semrush](https://www.semrush.com)** | Comprehensive keyword research + competitive analysis | $$$ |
| **[Ahrefs](https://ahrefs.com)** | Backlink analysis + content gap identification | $$$ |
| **[Google Search Console](https://search.google.com/search-console)** | Real performance data, CTR optimization | Free |
| **[Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/)** | Technical audits, crawl analysis | $$ |
| **[Surfer SEO](https://surferseo.com)** | On-page NLP optimization, content scoring | $$ |
| **[PageSpeed Insights](https://pagespeed.web.dev)** | Core Web Vitals monitoring | Free |

> **${brand}'s take**: Start with the free tools and genuinely master them before investing in paid platforms. 80% of wins come from consistent execution of fundamentals, not premium tooling.

---

## Advanced ${primaryKw} Tactics for ${year}

Once your foundation is solid, these tactics compound your results significantly:

### Topical Authority Clusters
Rather than treating each article as standalone, build interconnected topic hubs. A pillar page supported by 8-12 cluster pages signals to Google that your domain is the authoritative source on a subject.

### Featured Snippet Seizure
Structure specific sections as direct answers to questions: 40-60 word paragraphs that stand alone, bulleted lists with exactly 5-8 items, and tables comparing 3-5 options. [LINK: How featured snippets work|https://support.google.com/websearch/answer/9351707]

### Schema Markup Deployment
FAQ schema, HowTo schema, and Article schema help search engines understand your content structure — and increase the chance of rich results that boost CTR by 20-30%.

### Passage-Level Optimization
Google can now rank individual passages within long articles. This means a 3,000-word guide has roughly 8-12 "ranking opportunities" — each H2 section is a micro-optimization target.

---

## Expert Perspectives on ${primaryKw}

We reached out to practitioners across the ${industry} space. The consensus was striking:

> *"The brands winning in organic search right now aren't the ones with the biggest budgets — they're the ones publishing content that genuinely changes how their readers think about a topic. That depth is almost impossible to replicate at scale."*
> — **Senior SEO Strategist, 12 years experience**

> *"${primaryKw} in ${year} is fundamentally about trust signals at every level: technical trust (site health), content trust (E-E-A-T), and user trust (experience quality). Any strategy that ignores one of these legs will underperform."*
> — **Digital Marketing Director, Enterprise B2B**

---

## FAQ: Your ${primaryKw} Questions Answered

**Q: How long before I see results from ${primaryKw}?**
A: For new domains, expect 6-12 months before significant organic traction. Established domains targeting medium-competition keywords often see movement in 3-6 months. The variables are: domain authority, content quality, link building velocity, and competition intensity.

**Q: Is ${primaryKw} still worth investing in with AI-generated content everywhere?**
A: More than ever. AI has flooded the web with generic content, making original, experience-based, deeply researched content more differentiated — and more rewarded — than any previous era.

**Q: Can ${primaryKw} work for small businesses without large budgets?**
A: Absolutely. The most powerful counter-strategy for smaller budgets is hyper-specificity: target longer-tail, intent-rich keywords in your local market or niche. [LINK: Local SEO guide for small businesses|https://moz.com/learn/seo/local] The competition is dramatically lower, and the conversion rates are often higher.

**Q: How does ${primaryKw} interact with paid search?**
A: They're complementary, not competitive. Paid search provides immediate visibility and conversion data; organic search provides compounding returns and credibility. The data from PPC campaigns (which keywords convert, what ad copy resonates) is invaluable for informing your organic strategy.

**Q: What's the single most impactful ${primaryKw} action most businesses aren't taking?**
A: Publishing original research. A survey of 500 customers, an industry benchmark report, a proprietary dataset analysis — these attract backlinks, media mentions, and social sharing at a rate that regular blog posts simply cannot match.

---

## Conclusion: The Compound Advantage of Getting ${primaryKw} Right

Here's the uncomfortable truth about ${primaryKw}: the best time to start was 12 months ago. The second-best time is now.

Every piece of high-quality content you publish is an asset that works for you 24/7 without incremental cost. Every authoritative link you earn increases the effectiveness of every future page you publish. Every technical improvement you make compounds across your entire domain.

The brands that dominate ${industry} search in three years are placing their bets today. Not with spray-and-pray content factories, but with deliberate, expert-level execution of the principles outlined in this guide.

**${brand} helps ${industry} businesses build exactly this kind of compounding content advantage.** If you're ready to move from reactive content creation to a systematic ${primaryKw} strategy, [LINK: explore what we offer|${websiteUrl}/services] — or reach out to our team directly.

The gap between where you are and where you want to be in organic search is closeable. But it requires starting.

---

*Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} | Reviewed by the ${brand} SEO team*
`;

  return {
    title,
    metaTitle: `${title} | ${brand} — ${year} Expert Guide`,
    metaDescription: `Discover the complete, expert-backed guide to ${primaryKw}. Learn proven strategies, avoid costly mistakes, and build a compounding content advantage in ${year}.`,
    slug,
    content,
    wordCount: content.split(/\s+/).length,
    generatedAt: new Date().toISOString(),
  };
}

function mockImagePrompts(data: Record<string, unknown>) {
  const article = data.article as Record<string, unknown> | null;
  const title = (article?.title as string) || 'Article';
  const slug = (article?.slug as string) || 'article';

  return [
    {
      id: 'img1',
      description: `Professional hero image representing ${title} concept — wide format 1200x630, modern ${title.split(' ').slice(-2).join(' ')} theme, premium stock-quality, clean background`,
      placement: 'Featured Image (Hero)',
      altText: title,
      fileName: `${slug}-hero.webp`,
      caption: null,
      imageUrl: null,
    },
    {
      id: 'img2',
      description: 'Clean, modern infographic showing a three-layer model (Technical → Content Authority → Intent Architecture) with icons per layer, dark background, gradient accents',
      placement: 'After "What Is" section',
      altText: 'Three-layer SEO model infographic',
      fileName: `${slug}-framework.webp`,
      caption: 'The three-layer model that separates top performers from the rest',
      imageUrl: null,
    },
    {
      id: 'img3',
      description: 'Line graph comparing organic traffic growth (compound curve, green) vs paid traffic (flat line that drops to zero when spend stops, red). White background, clean minimal design',
      placement: 'After statistics section',
      altText: 'Organic vs paid traffic growth comparison chart',
      fileName: `${slug}-traffic-comparison.webp`,
      caption: 'Organic traffic compounds. Paid traffic stops when your budget does.',
      imageUrl: null,
    },
    {
      id: 'img4',
      description: 'Horizontal process diagram showing 5 steps: Research → Architecture → Creation → Amplification → Iteration. Each step has a minimal icon, connected by arrows, modern SaaS style design',
      placement: 'After "Step-by-Step Framework" heading',
      altText: 'Five-step SEO content framework diagram',
      fileName: `${slug}-process.webp`,
      caption: null,
      imageUrl: null,
    },
    {
      id: 'img5',
      description: 'Screenshot mockup of a perfectly optimized web page with annotated callout boxes highlighting: blue callout = title tag, green = meta description, orange = H1, purple = first keyword placement. Educational, clean design',
      placement: 'Step 4: On-Page Optimization section',
      altText: 'Annotated on-page SEO optimization example',
      fileName: `${slug}-onpage-example.webp`,
      caption: 'A perfectly optimized page — what each element contributes',
      imageUrl: null,
    },
  ];
}

function mockLinkPlan(data: Record<string, unknown>) {
  const brand = data.brandIntake as Record<string, unknown> | null;
  const article = data.article as Record<string, unknown> | null;
  const rawUrl = (brand?.websiteUrl as string) || 'https://example.com';
  const baseUrl = rawUrl.replace(/\/$/, '');
  const industry = (brand?.industry as string) || 'industry';
  const primaryKw = (article?.title as string) || (data.primaryKeyword as string) || 'topic';

  const internalLinks = [
    {
      type: 'internal',
      url: `${baseUrl}/blog`,
      anchorText: 'our resource library',
      context: 'Introduction — after establishing the stakes',
      placement: 'Paragraph 3 of introduction',
      reason: 'Drive readers to related content hub, reduces bounce rate',
    },
    {
      type: 'internal',
      url: `${baseUrl}/services`,
      anchorText: 'explore what we offer',
      context: 'Conclusion CTA — ready-to-convert readers',
      placement: 'Final paragraph before closing',
      reason: 'Highest-intent placement — reader has consumed full article',
    },
    {
      type: 'internal',
      url: `${baseUrl}/case-studies`,
      anchorText: 'real-world case studies',
      context: 'Proof section — after statistics',
      placement: 'Why It Matters section',
      reason: 'Social proof for skeptical readers mid-funnel',
    },
    {
      type: 'internal',
      url: `${baseUrl}/about`,
      anchorText: `the ${brand?.brandName || 'our'} team`,
      context: 'Author credibility / E-E-A-T section',
      placement: 'Expert Perspectives section',
      reason: 'Builds author authority signal for E-E-A-T',
    },
  ].filter(link => !isHomepageUrl(link.url));

  // External links are generated based on the actual article topic/industry
  // rather than hardcoded SEO-generic URLs
  const topicSlug = primaryKw.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  const industrySlug = industry.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);

  const externalLinks = [
    {
      type: 'external',
      url: `https://www.statista.com/topics/${industrySlug}/`,
      anchorText: `${industry} industry statistics`,
      context: 'Statistics section — data citation',
      placement: 'Why It Matters section, after key stat',
      reason: 'Statista is a tier-1 data source; adds authority to statistics claims',
    },
    {
      type: 'external',
      url: `https://hbr.org/search?term=${encodeURIComponent(topicSlug)}`,
      anchorText: 'research-backed insights',
      context: 'Expert perspectives section',
      placement: 'After practitioner insight callout',
      reason: 'Harvard Business Review lends academic authority',
    },
    {
      type: 'external',
      url: `https://www.mckinsey.com/search?q=${encodeURIComponent(topicSlug)}`,
      anchorText: 'industry analysis',
      context: 'Why It Matters — supporting major claim',
      placement: 'Statistics bullet 2',
      reason: 'McKinsey is highly trusted for business/industry data',
    },
    {
      type: 'external',
      url: `https://www.gartner.com/en/search?q=${encodeURIComponent(topicSlug)}`,
      anchorText: 'analyst report',
      context: 'Tools section or advanced tactics',
      placement: 'Paragraph after tools table',
      reason: 'Gartner Magic Quadrant citations are trusted in B2B/enterprise contexts',
    },
    {
      type: 'external',
      url: `https://www.forrester.com/search/?N=10001&range=504005&D=10001&q=${encodeURIComponent(topicSlug)}`,
      anchorText: 'market research',
      context: 'FAQ answer — ROI or timeline question',
      placement: 'FAQ section, relevant answer',
      reason: 'Forrester research adds credibility to ROI and adoption claims',
    },
  ];

  return { internalLinks, externalLinks };
}

function mockOutline(data: Record<string, unknown>) {
  const brief = data.brief as Record<string, unknown> | null;
  const primaryKw = (data.primaryKeyword as string) || 'topic';
  const year = new Date().getFullYear();

  const h1 = (brief?.h1 as string) || `The Ultimate Guide to ${primaryKw} (${year})`;
  const outline = (brief?.outline as Array<{ level: string; text: string }>) || [
    { level: 'h2', text: `What Is ${primaryKw}?` },
    { level: 'h3', text: 'Key Definitions and Context' },
    { level: 'h2', text: `Why ${primaryKw} Matters in ${year}` },
    { level: 'h3', text: 'Industry Statistics and Trends' },
    { level: 'h2', text: `Step-by-Step ${primaryKw} Strategy` },
    { level: 'h3', text: 'Step 1: Research and Planning' },
    { level: 'h3', text: 'Step 2: Implementation' },
    { level: 'h3', text: 'Step 3: Measurement and Optimization' },
    { level: 'h2', text: `Common ${primaryKw} Mistakes to Avoid` },
    { level: 'h2', text: `Best Tools for ${primaryKw} in ${year}` },
    { level: 'h2', text: `FAQ: ${primaryKw}` },
  ];

  return { h1, outline };
}

// ─── MASTER WRITING PROMPT ────────────────────────────────────────────────────

function buildMasterWritingPrompt(data: Record<string, unknown>): string {
  const brief = data.brief as Record<string, unknown> | null;
  const brand = data.brandIntake as Record<string, unknown> | null;
  const primaryKw = (data.primaryKeyword as string) || 'topic';
  const secondaryKws = (data.secondaryKeywords as string[]) || [];
  const year = new Date().getFullYear();

  const outline = (brief?.outline as Array<{ level: string; text: string }> || [])
    .map((item, i) => `  ${i + 1}. [${item.level.toUpperCase()}] ${item.text}`)
    .join('\n');

  return `╔══════════════════════════════════════════════════════════════════╗
║              MASTER SEO CONTENT PRODUCTION BRIEF                 ║
║         Tier-1 Agency Standard | E-E-A-T Optimized              ║
╚══════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1 — ASSET CLASSIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Brand:              ${brand?.brandName || 'Client Brand'}
  Website:            ${brand?.websiteUrl || 'N/A'}
  Industry:           ${brand?.industry || 'N/A'}
  Business Type:      ${brand?.businessType || 'B2B/B2C'}
  Target Countries:   ${(brand?.targetCountries as string[])?.join(', ') || 'N/A'}
  Content Type:       ${brief?.pageType || 'blog article'}
  Funnel Stage:       ${brief?.funnelStage || 'middle-of-funnel'}
  Content Goal:       ${brief?.contentGoal || 'Authority + lead generation'}
  Conversion Goal:    ${brief?.conversionGoal || 'Lead capture / trial signup'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2 — KEYWORD INTELLIGENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  PRIMARY KEYWORD: "${primaryKw}"
  ┌─ Placement Rules:
  │  • Must appear verbatim in H1 (within first 6 words if possible)
  │  • Must appear in the first 100 words of body text
  │  • Must appear in the meta title (within first 55 characters)
  │  • Must appear in the meta description (naturally integrated)
  │  • Must appear in at least 1 H2 heading
  │  • Natural density target: 1.0–1.5% of total word count
  │  • NEVER use in consecutive sentences — distribute evenly

  SECONDARY KEYWORDS: ${secondaryKws.length > 0 ? secondaryKws.join(' | ') : 'Use semantic variations of primary keyword'}
  ┌─ Placement Rules:
  │  • Each secondary keyword should appear 2–4 times
  │  • Use in H2/H3 headings where topically natural
  │  • Integrate as semantic context, not forced repetition

  SEMANTIC / NLP KEYWORDS (include all of these naturally):
  • Variations: ${primaryKw.toLowerCase()}, ${primaryKw.toLowerCase()} strategy, ${primaryKw.toLowerCase()} best practices
  • Related concepts: optimization, performance, ROI, framework, implementation
  • LSI terms: process, methodology, approach, system, technique, audit
  • Question-form: how to ${primaryKw.toLowerCase()}, what is ${primaryKw.toLowerCase()}, why ${primaryKw.toLowerCase()} matters
  • Year-stamped variants: "${primaryKw} ${year}", "best ${primaryKw} in ${year}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3 — READER PSYCHOLOGY & PERSONA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Target Persona:     ${brief?.targetPersona || brand?.targetAudience || 'Business decision-maker'}
  Pain Points:        ${brand?.painPoints || 'Efficiency, growth, competitive pressure'}
  Tone of Voice:      ${brand?.toneOfVoice || 'Expert, direct, warm — never condescending'}
  Article Style:      ${brand?.articleStyle || 'Authoritative yet accessible; practitioner-level depth'}
  Reading Level:      Grade 8–10 (Flesch-Kincaid) — sophisticated but never academic

  EMOTIONAL JOURNEY THIS ARTICLE MUST CREATE:
  ① Curiosity spike   → Hook them with a counter-intuitive insight in intro
  ② Tension           → Reveal the gap between what they're doing and what works
  ③ Hope              → Show that the solution is learnable and achievable
  ④ Competence        → Make them feel smarter after each section they read
  ⑤ Urgency           → At least one moment where delay feels costly
  ⑥ Trust             → Multiple proof points (data, quotes, examples)
  ⑦ Action            → Clear, low-friction next step in conclusion

  SEARCH INTENT CONTEXT:
  ${brief?.searchIntentSummary || `Readers searching "${primaryKw}" want comprehensive, actionable guidance they can implement immediately. They are likely comparing options or trying to improve an existing approach.`}

  ${BUSINESS_TYPE_CONTEXT[(brand?.businessType as string) || 'B2C'] || BUSINESS_TYPE_CONTEXT['B2C']}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4 — CONTENT ARCHITECTURE & STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  H1 (EXACT): "${brief?.h1 || `The Ultimate Guide to ${primaryKw}`}"

  TARGET WORD COUNT: 2,800–3,500 words
  ┌─ Section Allocation:
  │  • Introduction (hook + promise): 180–220 words
  │  • Definition / What Is: 280–350 words
  │  • Why It Matters (with data): 320–400 words
  │  • Core methodology / step-by-step: 900–1,100 words
  │  • Advanced tactics: 300–400 words
  │  • Common Mistakes: 280–350 words
  │  • Tools/Resources: 200–280 words
  │  • Expert perspectives / social proof: 200–280 words
  │  • FAQ section (5–7 questions): 400–500 words
  │  • Conclusion + CTA: 150–200 words

  APPROVED OUTLINE:
${outline || `  1. [H2] What is ${primaryKw}?
  2. [H2] Why ${primaryKw} Matters in ${year}
  3. [H2] Step-by-Step Framework
  4. [H2] Common Mistakes to Avoid
  5. [H2] Best Tools
  6. [H2] FAQ`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5 — WRITING QUALITY DIRECTIVES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  INTRODUCTION FORMULA — follow this exact structure:
  1. Open with a counter-intuitive question or provocative observation
     (NOT "In today's world..." — this is forbidden)
  2. Establish the stakes: who wins vs. who loses and why
  3. Make an explicit promise: "In this guide, you'll discover..."
  4. Brief credibility signal: why this source / brand is worth trusting

  PARAGRAPH RULES:
  • Maximum 4 sentences per paragraph in body text
  • Vary rhythm: short punchy sentence. Then a slightly longer one with context. Then develop the idea.
  • Never use passive voice when active voice is possible
  • Use "you" to address the reader directly throughout
  • Every paragraph must end with either a fact, insight, or bridge to the next

  ENGAGEMENT MECHANICS (distribute throughout article):
  ✦ Open loops:       Tease a finding early, deliver it 2–3 sections later
  ✦ Pattern breaks:   Use callout boxes, tables, or numbered lists every 300–400 words
  ✦ Expert quotes:    Minimum 2 credible quotes (can be constructed from persona types)
  ✦ Data points:      Minimum 6 statistics with citation format "[stat] *(Source)*"
  ✦ Real examples:    Minimum 3 concrete examples (companies, scenarios, or hypotheticals)
  ✦ Micro-CTAs:       Soft prompts like "Ask yourself..." or "Try this..." before key frameworks
  ✦ Curiosity gaps:   "Here's what most [practitioners] miss..." or "The data reveals something surprising..."

  FORBIDDEN PATTERNS (these will disqualify the content):
  ✗ "In today's fast-paced world..." / "In the digital age..."
  ✗ "It is important to note that..."
  ✗ "As we all know..."
  ✗ Bullet points with single-word items (minimum 8-word bullets)
  ✗ Conclusions that just summarize without adding new insight
  ✗ Any claim without a data point, example, or logical argument
  ✗ Consecutive H3s without at least 200 words of body text between them

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6 — E-E-A-T IMPLEMENTATION REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  EXPERIENCE signals (new "E" in E-E-A-T):
  • Include at least 2 first-person practitioner insights or case observations
  • Use language like "In practice...", "What we've observed...", "After analyzing..."
  • Include one specific scenario or scenario-based example

  EXPERTISE signals:
  • Use precise technical vocabulary correctly
  • Define jargon when first introduced
  • Reference specific frameworks, methodologies, or named concepts
  • Include at least one statement that would only be known by a genuine practitioner

  AUTHORITATIVENESS signals:
  • Cite minimum 4 external authoritative sources (Google, HubSpot, Semrush, Backlinko, etc.)
  • Reference industry-standard tools by name
  • Include comparison tables that demonstrate domain knowledge

  TRUSTWORTHINESS signals:
  • Present balanced perspective — acknowledge what this approach doesn't solve
  • Include one "honest caveat" per major recommendation
  • Never make ROI or timeline guarantees — use ranges and conditionals

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7 — TECHNICAL SEO IMPLEMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  FEATURED SNIPPET OPTIMIZATION:
  • Include at least 1 definition paragraph (40–60 words) starting with "${primaryKw} is..."
  • Include at least 1 numbered list with 5–7 actionable steps
  • Include at least 1 comparison table with 3+ rows
  • FAQ section: each answer must be 40–60 words for paragraph snippet eligibility

  IMAGE PLACEMENT MARKERS:
  Insert the following markers at the specified locations in the article.
  The system will replace these with actual generated images after your content is complete.
  Format: [IMAGE: detailed visual description | placement rationale]
  • Place a hero image marker in the first 50 words (before body text begins)
  • Place at least 3 more image markers at data points, framework diagrams, or process illustrations
  • Each image description must be detailed enough to prompt a DALL-E 3 generation

  LINK PLACEMENT MARKERS:
  Insert contextual link markers where external sources or internal pages should appear.
  Format: [LINK: anchor text|target URL]
  • 3–5 external links to authoritative sources (Google, industry publications, research)
  • 2–4 internal links to brand pages (use ${brand?.websiteUrl || 'https://[brand-website]'}/[page-path])
  • NEVER link to the homepage root (/) or generic placeholder URLs

  SCHEMA MARKUP NOTES (for developer handoff):
  • This article qualifies for: Article schema, FAQ schema, HowTo schema (if step-by-step)
  • Mark FAQ section with <!-- FAQ_START --> and <!-- FAQ_END --> HTML comments
  • Mark primary step-by-step sections with <!-- HOWTO_START --> and <!-- HOWTO_END -->

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8 — CTA & CONVERSION ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  PRIMARY CTA DIRECTION: ${brief?.ctaDirection || `Encourage readers to engage with ${brand?.brandName || 'the brand'}'s services`}
  CTA PLACEMENT:
  • Soft CTA woven into middle of article (not a button — contextual sentence)
  • Strong CTA in conclusion paragraph (2–3 sentences, benefit-first framing)
  • Link CTA to: ${brand?.websiteUrl ? `${(brand.websiteUrl as string).replace(/\/$/, '')}/services` : '[internal service page]'}

  CONVERSION PSYCHOLOGY:
  • CTA must acknowledge the effort the reader just made: "You've now got the map..."
  • Remove friction: "No commitment required" or equivalent reassurance
  • Create forward momentum: "The next step is simpler than you think..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 9 — META OUTPUT REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  META TITLE (50–60 chars):
  • Include primary keyword within first 40 characters
  • Add year ${year} or brand name after separator (|)
  • Power words: Ultimate, Complete, Expert, Proven, Step-by-Step

  META DESCRIPTION (145–160 chars):
  • Include primary keyword naturally in first half
  • Include a clear value proposition (what reader will learn/get)
  • End with a soft action phrase: "Read the guide →" or "Discover how →"
  • No keyword stuffing — reads like a compelling ad copy

  URL SLUG:
  • Primary keyword only, hyphenated, lowercase, no stop words
  • Maximum 5 words: e.g., ${primaryKw.toLowerCase().split(' ').slice(0, 4).join('-')}-guide

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 10 — FINAL QUALITY GATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before finalizing, verify:
  □ Word count is between 2,800–3,500 words
  □ Primary keyword appears in H1, first paragraph, and meta title
  □ Minimum 6 statistics with sources cited
  □ Minimum 2 comparison tables
  □ Minimum 5 FAQ entries (40–60 words each)
  □ Minimum 4 [IMAGE:] markers placed
  □ Minimum 5 [LINK:] markers with real, working URLs (NO homepage-only links)
  □ No consecutive identical sentence structures in any paragraph
  □ Introduction does not start with a generic phrase
  □ Conclusion contains explicit CTA with internal link
  □ <!-- FAQ_START --> and <!-- FAQ_END --> markers flank FAQ section
  □ Content would make a practitioner in this field nod in recognition

══════════════════════════════════════════════════════════════════
END OF MASTER BRIEF — BEGIN ARTICLE PRODUCTION
══════════════════════════════════════════════════════════════════`;
}

// ─── Mock image generation (returns placeholder) ──────────────────────────────

function mockGeneratedImage(data: Record<string, unknown>) {
  const prompt = data.imagePrompt as Record<string, unknown> | null;
  const description = (prompt?.description as string) || 'SEO article image';
  const slug = (prompt?.fileName as string)?.replace(/\.[^.]+$/, '') || 'image';

  // Use picsum for realistic placeholder photos, or placehold.co for diagrams/infographics
  const isInfographic = /infograph|diagram|chart|graph|process|framework|comparison/i.test(description);
  const imageUrl = isInfographic
    ? `https://placehold.co/1200x630/1a1a2e/818cf8?text=${encodeURIComponent(slug.replace(/-/g, '+'))}`
    : `https://picsum.photos/seed/${slug}/1200/630`;

  return { imageUrl };
}

// ─── Mock link injection ──────────────────────────────────────────────────────

function mockInjectLinks(data: Record<string, unknown>) {
  const article = data.article as Record<string, unknown> | null;
  let content = (article?.content as string) || '';
  const linkPlan = data.linkPlan as { internalLinks: Array<{ anchorText: string; url: string }>; externalLinks: Array<{ anchorText: string; url: string }> } | null;

  if (!linkPlan) return { content };

  const allLinks = [
    ...(linkPlan.internalLinks || []),
    ...(linkPlan.externalLinks || []),
  ].filter(l => !isHomepageUrl(l.url));

  // Replace [LINK: anchorText|url] markers first
  content = content.replace(/\[LINK:\s*([^\|]+)\|([^\]]+)\]/g, (_, anchor, url) => {
    const cleanUrl = url.trim();
    const cleanAnchor = anchor.trim();
    if (isHomepageUrl(cleanUrl)) return cleanAnchor; // strip homepage links
    return `[${cleanAnchor}](${cleanUrl})`;
  });

  // Then try to match any remaining anchor texts from the link plan
  for (const link of allLinks) {
    if (isHomepageUrl(link.url)) continue;
    const anchor = link.anchorText;
    // Only replace the first occurrence that isn't already linked
    const escapedAnchor = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<!\\[)(?<!\\]\\()${escapedAnchor}(?!\\])(?!\\))`, 'i');
    if (regex.test(content)) {
      content = content.replace(regex, `[${anchor}](${link.url})`);
    }
  }

  return { content };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Mock responses
      switch (action) {
        case 'keywords':
          return NextResponse.json({ keywords: mockKeywords(body.brandIntake || {}) });
        case 'brief':
          return NextResponse.json({ brief: mockBrief(body) });
        case 'prompt':
          return NextResponse.json({ prompt: buildMasterWritingPrompt(body) });
        case 'article':
          return NextResponse.json({ article: mockArticle(body) });
        case 'images':
          return NextResponse.json({ imagePrompts: mockImagePrompts(body) });
        case 'image-generate':
          return NextResponse.json(mockGeneratedImage(body));
        case 'outline':
          return NextResponse.json(mockOutline(body));
        case 'links':
          return NextResponse.json({ linkPlan: mockLinkPlan(body) });
        case 'inject-links':
          return NextResponse.json(mockInjectLinks(body));
        case 'select-keywords-for-content':
          return NextResponse.json(mockKeywordStrategy(body as KeywordSelectionInput));
        case 'generate-content-brief':
          return NextResponse.json(mockContentBrief(body as ContentBriefInput));
        case 'generate-long-form-seo-content':
          return NextResponse.json(mockLongFormContent(body as LongFormContentInput));
        case 'generate-platform-content':
          return NextResponse.json(mockPlatformContent(body as PlatformContentInput));
        case 'generate-internal-link-plan':
          return NextResponse.json(mockInternalLinkPlan(body as InternalLinkPlanInput));
        case 'generate-external-link-plan':
          return NextResponse.json(mockExternalLinkPlan(body as ExternalLinkPlanInput));
        case 'inject-approved-links':
          return NextResponse.json(mockInjectApprovedLinks(body as InjectLinksInput));
        case 'discover-image-references':
          return NextResponse.json(discoverImageReferences(body as ImageReferenceInput));
        case 'generate-image-plan':
          return NextResponse.json(mockImagePlan(body as ImagePlanInput));
        case 'generate-content-images':
          return NextResponse.json(mockContentImages(body as ContentImagesInput));
        default:
          return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
      }
    }

    // ── OpenAI Integration ───────────────────────────────────────────────────

    // Special case: image generation via DALL-E 3
    if (action === 'image-generate') {
      const imgPrompt = body.imagePrompt as { description: string; placement: string; altText: string } | null;
      if (!imgPrompt) {
        return NextResponse.json({ error: 'Missing imagePrompt' }, { status: 400 });
      }

      const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `Professional, high-quality image for an SEO article: ${imgPrompt.description}. Style: clean, modern, premium. No text overlays. Photorealistic or clean vector illustration.`,
          n: 1,
          size: '1792x1024',
          quality: 'standard',
        }),
      });

      if (!dalleRes.ok) {
        const err = await dalleRes.text();
        console.error('[DALL-E Error]', err);
        // Fall back to placeholder on error
        return NextResponse.json(mockGeneratedImage(body));
      }

      const dalleData = await dalleRes.json();
      const imageUrl = dalleData.data?.[0]?.url || null;
      return NextResponse.json({ imageUrl });
    }

    // Special case: batch image generation via DALL-E 3 (5 images)
    if (action === 'generate-content-images') {
      const result = await generateContentImages(body as ContentImagesInput, apiKey);
      return NextResponse.json(result);
    }

    // Special case: link injection (no AI needed — deterministic)
    if (action === 'inject-links') {
      // Use AI to intelligently inject links
      const systemPrompt = `You are an expert SEO editor. You will receive article content (markdown) and a link plan. 
Your task: inject the links from the link plan into the article content at the most natural, contextually appropriate positions.
Rules:
- Replace [LINK: anchor|url] markers with proper markdown links: [anchor](url)
- For any remaining links in the plan, find the best natural anchor text in the article and wrap it with the markdown link
- NEVER link to homepage URLs (just "/" or root domain with no path)
- Preserve all article formatting, headings, and structure exactly
- Return JSON: { "content": "updated markdown content" }`;

      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(body) },
          ],
          temperature: 0.3,
          max_tokens: 8000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!openaiRes.ok) {
        console.error('[OpenAI inject-links Error]', await openaiRes.text());
        return NextResponse.json(mockInjectLinks(body));
      }

      const aiData = await openaiRes.json();
      const content = JSON.parse(aiData.choices[0].message.content);
      return NextResponse.json(content);
    }

    // Standard AI generation
    const systemPrompt = buildSystemPrompt(action, body);

    // Use structured user prompt for keyword selection
    const userContent = action === 'select-keywords-for-content'
      ? buildKeywordSelectionUserPrompt(body as KeywordSelectionInput)
      : action === 'generate-content-brief'
      ? buildContentBriefUserPrompt(body as ContentBriefInput)
      : action === 'generate-long-form-seo-content'
      ? buildLongFormContentUserPrompt(body as LongFormContentInput)
      : action === 'generate-platform-content'
      ? buildPlatformContentUserPrompt(body as PlatformContentInput)
      : action === 'generate-internal-link-plan'
      ? buildInternalLinkPlanUserPrompt(body as InternalLinkPlanInput)
      : action === 'generate-external-link-plan'
      ? buildExternalLinkPlanUserPrompt(body as ExternalLinkPlanInput)
      : action === 'inject-approved-links'
      ? buildInjectLinksUserPrompt(body as InjectLinksInput)
      : action === 'discover-image-references'
      ? buildImageReferenceUserPrompt(body as ImageReferenceInput)
      : action === 'generate-image-plan'
      ? buildImagePlanUserPrompt(body as ImagePlanInput)
      : JSON.stringify(body);

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: action === 'article' || action === 'generate-long-form-seo-content' ? 0.8 : action === 'select-keywords-for-content' ? 0.5 : action === 'generate-content-brief' ? 0.6 : 0.7,
        max_tokens: action === 'article' || action === 'generate-long-form-seo-content' ? 8000 : action === 'select-keywords-for-content' ? 6000 : action === 'generate-content-brief' ? 5000 : 4000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      console.error('[OpenAI Error]', err);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
    }

    const aiData = await openaiRes.json();
    const content = JSON.parse(aiData.choices[0].message.content);
    return NextResponse.json(content);

  } catch (err) {
    console.error('[SEO Generate Error]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── System Prompts (OpenAI mode) ─────────────────────────────────────────────

function buildSystemPrompt(action: string, body: Record<string, unknown>): string {
  switch (action) {
    case 'keywords':
      return `You are an expert SEO keyword researcher with 15+ years of experience. Based on the brand intake data, generate 12–15 high-value keyword suggestions that balance search demand, competition level, and business relevance.
Return JSON: { "keywords": [{ "id": "kw1", "keyword": "...", "searchIntent": "informational|navigational|commercial|transactional", "funnelStage": "top|middle|bottom", "businessRelevance": 1-10, "conversionValue": 1-10, "contentOpportunity": "specific brief description", "category": "primary|secondary|supporting", "validationStatus": "pending" }] }
Prioritize by: intent fit × business relevance × achievability × commercial value × content opportunity.`;

    case 'brief': {
      const userBriefInput = (body.userBriefInput as string || '').trim();
      const userInstructions = userBriefInput
        ? `\n\nUSER INSTRUCTIONS (must be honored):\n${userBriefInput}`
        : '';
      return `You are a senior SEO content strategist at a Tier-1 digital marketing agency. Generate a comprehensive, actionable content brief based on the brand data and keywords provided.${userInstructions}
Return JSON: { "brief": { "finalKeywords": [], "searchIntentSummary": "", "targetPersona": "", "funnelStage": "top|middle|bottom", "contentGoal": "", "pageType": "", "contentAngle": "", "differentiationAngle": "", "titleIdeas": [], "h1": "", "outline": [{"level": "h2|h3", "text": ""}], "faqOpportunities": [], "richSnippetOpportunities": [], "internalLinkOpportunities": [], "externalSourceOpportunities": [], "ctaDirection": "", "conversionGoal": "" } }`;
    }

    case 'prompt':
      return `You are a master-level SEO writing prompt architect. Build the most comprehensive, detailed internal writing prompt possible. It must encode: E-E-A-T requirements, semantic keyword strategy, content architecture, tone directives, engagement mechanics, featured snippet optimization, image placement markers [IMAGE:], link placement markers [LINK: anchor|url], schema markup notes, and quality gates.
Return JSON: { "prompt": "full master prompt text" }`;

    case 'article': {
      const writingPrompt = body.writingPrompt as string || '';
      return `You are an elite SEO content writer producing Tier-1 agency-quality articles. Follow the master writing prompt with absolute precision.

CRITICAL REQUIREMENTS:
1. Output 2,800–3,500 words of substantive, expert-level content
2. Place [IMAGE: detailed visual description] markers at 4–5 strategic locations
3. Place [LINK: anchor text|full URL] markers for all external citations and internal links
4. NEVER link to a homepage URL — always link to specific pages
5. Include <!-- FAQ_START --> and <!-- FAQ_END --> around the FAQ section
6. Every statistic must have a source citation
7. Introduction must NOT start with "In today's..." or similar clichés
8. The article must make a genuine practitioner nod in recognition

MASTER BRIEF:
${writingPrompt}

Return JSON: { "article": { "title": "", "metaTitle": "", "metaDescription": "", "slug": "", "content": "full markdown with [IMAGE:] and [LINK:] markers", "wordCount": number, "generatedAt": "ISO date" } }`;
    }

    case 'images':
      return `You are an expert visual content strategist for SEO articles. Generate 4–5 highly specific image concepts that would genuinely enhance this article's value and engagement.
For each image, provide a DALL-E 3 ready description (specific, detailed, professional, no text overlays unless it's a mockup screenshot).
Return JSON: { "imagePrompts": [{ "id": "img1", "description": "detailed DALL-E 3 ready description", "placement": "exact section name and position", "altText": "SEO-optimized alt text", "fileName": "kebab-case-filename.webp", "caption": "optional caption or null", "imageUrl": null }] }`;

    case 'links': {
      const articleContent = (body.article as Record<string, unknown>)?.content as string || '';
      const articleSnippet = articleContent.slice(0, 2000);
      return `You are an expert SEO link strategist. Generate a comprehensive internal and external link plan that is SPECIFIC to the article topic and industry provided.
CRITICAL RULES:
- Never recommend linking to a homepage (root URL with no path). Every internal link must point to a specific page path.
- External links must be DIRECTLY relevant to the article topic and industry — do NOT use generic SEO tool links (Backlinko, HubSpot, Moz, Semrush) unless the article is specifically about SEO/marketing.
- Choose external sources based on the article's subject matter: medical articles → PubMed/NIH/Mayo Clinic; finance → Forbes/Bloomberg/SEC; tech → official docs/IEEE; industry research → Statista/Gartner/Forrester/IBISWorld; legal → government sites.
- Each external link should cite actual data, research, or authoritative reference USED in the article content.

ARTICLE CONTENT SNIPPET (for context):
${articleSnippet}

Return JSON: { "linkPlan": { "internalLinks": [{ "type": "internal", "url": "full URL with path", "anchorText": "", "context": "", "placement": "", "reason": "" }], "externalLinks": [...same format...] } }`;
    }

    case 'outline': {
      const userBriefInput = (body.userBriefInput as string || '').trim();
      const userInstructions = userBriefInput
        ? `\n\nUSER CUSTOM INSTRUCTIONS (must be honored in outline structure):\n${userBriefInput}`
        : '';
      return `You are a senior SEO content strategist. Generate an article outline (H1 + H2/H3 structure) based on the brand profile, primary keyword, content brief, and any user instructions.
The outline should be publication-ready and reflect the correct information architecture for this topic and business type.${userInstructions}
Return JSON: { "h1": "exact H1 title", "outline": [{ "level": "h2|h3", "text": "section heading" }] }
Generate 8-14 outline items. Mix H2 (main sections) and H3 (subsections). The outline should cover: intro hook, definition, why it matters, core methodology/how-to (3-4 H3s), common mistakes, tools/resources, FAQ, conclusion.`;
    }

    case 'select-keywords-for-content':
      return KEYWORD_SELECTION_SYSTEM_PROMPT;

    case 'generate-content-brief':
      return CONTENT_BRIEF_SYSTEM_PROMPT;

    case 'generate-long-form-seo-content':
      return LONG_FORM_CONTENT_SYSTEM_PROMPT;

    case 'generate-platform-content':
      return PLATFORM_CONTENT_SYSTEM_PROMPT;

    case 'generate-internal-link-plan':
      return INTERNAL_LINK_PLAN_SYSTEM_PROMPT;

    case 'generate-external-link-plan':
      return EXTERNAL_LINK_PLAN_SYSTEM_PROMPT;

    case 'inject-approved-links':
      return INJECT_LINKS_SYSTEM_PROMPT;

    case 'discover-image-references':
      return IMAGE_REFERENCE_SYSTEM_PROMPT;

    case 'generate-image-plan':
      return IMAGE_PLAN_SYSTEM_PROMPT;

    default:
      return 'You are an SEO expert assistant. Return valid JSON.';
  }
}
