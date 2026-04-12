import { NextRequest, NextResponse } from 'next/server';

// ─── Mock AI responses for when no OpenAI key is configured ──────────────────

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
  return {
    finalKeywords: [primaryKw, ...(data.secondaryKeywords as string[] || [])],
    searchIntentSummary: `Users searching for "${primaryKw}" are looking for comprehensive, actionable guidance they can implement immediately.`,
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
  const primaryKw = (data.writingPrompt as string)?.match(/primary keyword[:\s]*"([^"]+)"/i)?.[1] || 'topic';
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const content = `# ${title}

In today's rapidly evolving landscape, mastering **${primaryKw}** has become essential for businesses seeking sustainable growth. This comprehensive guide breaks down everything you need to know — from foundational concepts to advanced strategies used by industry leaders.

## What is ${primaryKw}?

${primaryKw} refers to the systematic approach of optimizing your business processes to achieve measurable results. Unlike traditional methods, modern ${primaryKw} leverages data-driven insights and proven frameworks to deliver consistent outcomes.

### Key Definitions and Context

Before diving into strategies, let's establish a clear understanding:

- **Core Concept**: The fundamental principles driving ${primaryKw}
- **Implementation**: Practical application in real-world scenarios
- **Measurement**: Tracking and analyzing results effectively

## Why ${primaryKw} Matters in ${new Date().getFullYear()}

Recent studies show that companies investing in ${primaryKw} see an average of **40% improvement** in key metrics within the first quarter. Here's why:

| Metric | Without Strategy | With Strategy |
|--------|-----------------|---------------|
| Efficiency | Baseline | +35% improvement |
| ROI | Variable | 3.2x average return |
| Growth | Slow, unpredictable | Consistent, measurable |

> "The most successful companies don't just adopt ${primaryKw} — they build their entire strategy around it." — Industry Expert

## Step-by-Step ${primaryKw} Strategy

### Step 1: Assessment and Planning

Start by evaluating your current position. Ask yourself:

1. What are your primary business objectives?
2. Where are the biggest gaps in your current approach?
3. What resources do you have available?

### Step 2: Implementation Framework

Follow this proven framework:

1. **Audit** your existing processes
2. **Identify** quick wins and long-term opportunities
3. **Prioritize** based on impact vs. effort
4. **Execute** with clear milestones
5. **Iterate** based on data feedback

### Step 3: Measurement and Optimization

Track these critical KPIs:

- **Primary metrics**: Direct impact indicators
- **Secondary metrics**: Supporting indicators
- **Leading indicators**: Predictive measures

## Common ${primaryKw} Mistakes to Avoid

❌ **Mistake #1**: Starting without clear goals
❌ **Mistake #2**: Ignoring data in decision-making
❌ **Mistake #3**: Trying to do everything at once
❌ **Mistake #4**: Not investing in the right tools
❌ **Mistake #5**: Neglecting continuous optimization

## Best Tools for ${primaryKw}

Here are the top tools recommended by industry professionals:

1. **Tool A** — Best for comprehensive analytics
2. **Tool B** — Best for automation and workflows
3. **Tool C** — Best for small team collaboration
4. **Tool D** — Best for enterprise-scale operations

## Expert Tips and Best Practices

💡 **Tip 1**: Start small and scale based on results
💡 **Tip 2**: Invest in team training early
💡 **Tip 3**: Build systems, not just campaigns
💡 **Tip 4**: Document everything for future optimization

## FAQ: ${primaryKw}

**Q: What is the best way to get started with ${primaryKw}?**
A: Begin with a thorough audit of your current processes, set clear objectives, and start with one high-impact area before expanding.

**Q: How long does it take to see results?**
A: Most businesses see initial results within 30-60 days, with significant improvements within 90 days.

**Q: What are the most common mistakes?**
A: The biggest mistakes are lack of clear goals, insufficient data tracking, and trying to implement too many changes simultaneously.

**Q: How much does ${primaryKw} cost?**
A: Investment varies widely based on scale, but most businesses can start with a budget of $500-2,000/month and scale up based on ROI.

## Conclusion

Mastering ${primaryKw} is not a one-time effort — it's an ongoing commitment to excellence. By following the strategies outlined in this guide, you'll be well-positioned to achieve sustainable growth and outperform your competition.

**Ready to get started?** Take the first step today by auditing your current approach and identifying your biggest opportunities for improvement.
`;

  return {
    title,
    metaTitle: `${title} | Expert Guide ${new Date().getFullYear()}`,
    metaDescription: `Discover the complete guide to ${primaryKw}. Learn proven strategies, avoid common mistakes, and get expert tips for achieving measurable results.`,
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
    { id: 'img1', description: `Professional hero image representing ${title} concept`, placement: 'Featured Image (Hero)', altText: title, fileName: `${slug}-hero.webp`, caption: null },
    { id: 'img2', description: 'Clean infographic showing the step-by-step strategy framework', placement: 'After "Step-by-Step Strategy" section', altText: 'Strategy framework infographic', fileName: `${slug}-framework.webp`, caption: 'The proven framework for success' },
    { id: 'img3', description: 'Comparison chart or data visualization showing before/after results', placement: 'After statistics section', altText: 'Results comparison chart', fileName: `${slug}-results.webp`, caption: null },
    { id: 'img4', description: 'Icon-based illustration of common mistakes to avoid', placement: 'Common Mistakes section', altText: 'Common mistakes to avoid', fileName: `${slug}-mistakes.webp`, caption: 'Avoid these critical mistakes' },
  ];
}

function mockLinkPlan(data: Record<string, unknown>) {
  const brand = data.brandIntake as Record<string, unknown> | null;
  const url = (brand?.websiteUrl as string) || 'https://example.com';

  return {
    internalLinks: [
      { type: 'internal', url: `${url}/blog`, anchorText: 'our blog', context: 'Introduction section', placement: 'Paragraph 2', reason: 'Drive readers to related content' },
      { type: 'internal', url: `${url}/services`, anchorText: 'our services', context: 'CTA section', placement: 'Conclusion', reason: 'Convert interested readers' },
      { type: 'internal', url: `${url}/case-studies`, anchorText: 'case studies', context: 'Proof section', placement: 'Results section', reason: 'Build credibility with real examples' },
    ],
    externalLinks: [
      { type: 'external', url: 'https://www.statista.com', anchorText: 'recent industry data', context: 'Statistics reference', placement: 'Why it matters section', reason: 'Authoritative data source' },
      { type: 'external', url: 'https://hbr.org', anchorText: 'Harvard Business Review research', context: 'Expert opinion', placement: 'Best practices section', reason: 'Academic credibility' },
    ],
  };
}

function mockWritingPrompt(data: Record<string, unknown>) {
  const brief = data.brief as Record<string, unknown> | null;
  const brand = data.brandIntake as Record<string, unknown> | null;
  const primaryKw = data.primaryKeyword as string || 'topic';

  return `=== INTERNAL SEO WRITING PROMPT ===

CONTENT BRIEF:
- Primary Keyword: "${primaryKw}"
- Secondary Keywords: ${(data.secondaryKeywords as string[])?.join(', ') || 'N/A'}
- Target Audience: ${brand?.targetAudience || 'Business professionals'}
- Search Intent: ${brief?.searchIntentSummary || 'Informational'}
- Content Goal: ${brief?.contentGoal || 'Authority building'}
- Tone: ${brand?.toneOfVoice || 'Professional yet approachable'}
- Page Type: ${brief?.pageType || 'blog'}

TITLE: ${brief?.h1 || `Complete Guide to ${primaryKw}`}

STRUCTURE REQUIREMENTS:
1. Compelling introduction with hook (open loop)
2. Clear H2/H3 hierarchy following the outline
3. FAQ section with schema-friendly formatting
4. Strong conclusion with CTA
5. Natural keyword placement (avoid stuffing)

ENGAGEMENT ELEMENTS TO INCLUDE:
- Tables for comparisons/data
- Numbered frameworks/steps
- Expert tips/quotes
- Common mistakes section
- Statistics and data points
- Actionable checklists
- Visual placeholders

SEO REQUIREMENTS:
- Use primary keyword in H1, first paragraph, and naturally throughout
- Include semantic variations
- Optimize for featured snippet (paragraph/list/table)
- FAQ schema opportunity
- Target 1,500-3,000 words
- Readability: Grade 8-10

QUALITY STANDARDS:
- No generic filler content
- No robotic/AI-sounding language
- Every section must provide unique value
- Transitions should build curiosity
- Content should satisfy search intent completely
`;
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Check for OpenAI key
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Use mock responses
      switch (action) {
        case 'keywords':
          return NextResponse.json({ keywords: mockKeywords(body.brandIntake || {}) });
        case 'brief':
          return NextResponse.json({ brief: mockBrief(body) });
        case 'prompt':
          return NextResponse.json({ prompt: mockWritingPrompt(body) });
        case 'article':
          return NextResponse.json({ article: mockArticle(body) });
        case 'images':
          return NextResponse.json({ imagePrompts: mockImagePrompts(body) });
        case 'links':
          return NextResponse.json({ linkPlan: mockLinkPlan(body) });
        default:
          return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
      }
    }

    // ── OpenAI Integration ──────────────────────────────────────────────────
    // When API key is available, use OpenAI for real generation

    const systemPrompt = buildSystemPrompt(action, body);

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
        temperature: 0.7,
        max_tokens: action === 'article' ? 8000 : 4000,
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

// ─── System Prompts ──────────────────────────────────────────────────────────

function buildSystemPrompt(action: string, body: Record<string, unknown>): string {
  switch (action) {
    case 'keywords':
      return `You are an expert SEO keyword researcher. Based on the brand intake data, generate 12-15 high-value keyword suggestions.
Return JSON format: { "keywords": [{ "id": "kw1", "keyword": "...", "searchIntent": "informational|navigational|commercial|transactional", "funnelStage": "top|middle|bottom", "businessRelevance": 1-10, "conversionValue": 1-10, "contentOpportunity": "brief description", "category": "primary|secondary|supporting", "validationStatus": "pending" }] }
Prioritize keywords by: intent fit + business relevance + achievability + commercial value + content opportunity + conversion potential.`;

    case 'brief':
      return `You are an expert SEO content strategist. Generate a comprehensive content brief based on the brand and keyword data.
Return JSON: { "brief": { "finalKeywords": [], "searchIntentSummary": "", "targetPersona": "", "funnelStage": "top|middle|bottom", "contentGoal": "", "pageType": "", "contentAngle": "", "differentiationAngle": "", "titleIdeas": [], "h1": "", "outline": [{"level": "h2|h3", "text": ""}], "faqOpportunities": [], "richSnippetOpportunities": [], "internalLinkOpportunities": [], "externalSourceOpportunities": [], "ctaDirection": "", "conversionGoal": "" } }`;

    case 'prompt':
      return `You are an expert SEO writing prompt engineer. Build an extremely detailed internal writing prompt that will produce high-ranking, engaging, publish-ready SEO content.
Return JSON: { "prompt": "full writing prompt text" }`;

    case 'article':
      return `You are an expert SEO content writer. Generate a full-length, publish-ready article in Markdown format. Follow the writing prompt exactly.
Return JSON: { "article": { "title": "", "metaTitle": "", "metaDescription": "", "slug": "", "content": "full markdown article", "wordCount": number, "generatedAt": "ISO date" } }`;

    case 'images':
      return `You are an expert visual content planner. Generate image concepts for an SEO article.
Return JSON: { "imagePrompts": [{ "id": "img1", "description": "", "placement": "", "altText": "", "fileName": "", "caption": "" }] }`;

    case 'links':
      return `You are an expert SEO link strategist. Generate internal and external link recommendations.
Return JSON: { "linkPlan": { "internalLinks": [{ "type": "internal", "url": "", "anchorText": "", "context": "", "placement": "", "reason": "" }], "externalLinks": [...] } }`;

    default:
      return 'You are an SEO expert assistant. Return valid JSON.';
  }
}
