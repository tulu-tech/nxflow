/**
 * generate-platform-content — AI Platform-Native Content Generation
 *
 * Handles ALL non-blog content formats: social posts, videos, stories,
 * carousels, infographics, polls, Q&A, and comment engagement.
 * Does NOT handle article-blog — that uses generate-long-form-seo-content.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlatformContentInput {
  workspace: {
    workspaceId: string;
    brandName: string;
    websiteUrl: string;
    industry: string;
    businessType: string;
    targetMarket: string;
    brandDifferentiators: string;
    complianceNotes: string;
    toneOfVoice: string;
    coreOffer: string;
    primaryCTA: string;
  };
  selectedPersona: string;
  selectedPersonaDescription: string;
  selectedTopic: string;
  selectedTopicId: string;
  selectedPlatformFormat: string;
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
    recommendedCTA: string;
    platformSpecificStructure: Record<string, unknown>;
    mustInclude: string[];
    mustAvoid: string[];
  };
  mcmWorkspaceRulesIfApplicable: boolean;
}

export interface PlatformContentResult {
  contentOutput: {
    platformFormat: string;
    persona: string;
    topic: string;
    primaryKeyword: string;
    contentGoal: string;
    recommendedCTA: string;
    items: Array<Record<string, unknown>>;
    notes: string;
    claimRiskNotes: string;
  };
}

// ─── System Prompt ───────────────────────────────────────────────────────────

export const PLATFORM_CONTENT_SYSTEM_PROMPT = `You are a senior platform-native content strategist and conversion copywriter.

Your task is to generate content for the selected platform/format only.

Do not write a blog article. This action is only for non-blog formats.

MCM WORKSPACE RULES (apply only when mcmWorkspaceRulesIfApplicable is true):
- Keep content grounded in decision confidence, showroom demo, multi-brand comparison, expert guidance, warranty/service clarity, delivery/installation clarity, and premium high-ticket purchase confidence.
- Avoid medical treatment/cure claims.
- Use safe wellness language: comfort, relaxation, muscle tension relief, stress relief, recovery routine, zero gravity, full body massage.
- Match the selected target persona's psychology and objections.
- Use the approved primary keyword only when natural.
- Do not keyword-stuff social content.
- Do not use pressure-selling language.

FORMAT OUTPUT RULES:

"text-post" (Text Posts):
Return 3 post variations. Each item in "items" must have:
{ "variation": 1, "hook": "", "body": "", "cta": "", "hashtags": [] }

"image-post" (Image Posts):
Return 2–3 variations. Each item:
{ "variation": 1, "caption": "", "visualConcept": "", "onImageText": "", "cta": "" }
Do not generate the image.

"short-video" (Short Videos):
Return 1 script. Item:
{ "title": "", "duration": "30–60s", "hook": "", "scenes": [{ "sceneNumber": 1, "visual": "", "voiceover": "", "onScreenText": "", "duration": "" }], "cta": "", "musicMood": "" }

"long-video" (Long-Form Videos):
Return 1 YouTube-style outline. Item:
{ "title": "", "duration": "5–15 min", "introHook": "", "chapters": [{ "timestamp": "", "title": "", "talkingPoints": [] }], "cta": "", "thumbnailConcept": "" }

"instagram-story" or "linkedin-story" (Stories):
Return 3–7 frames. Each item:
{ "frameNumber": 1, "frameType": "text|image|poll|question", "text": "", "visualDirection": "", "stickerIdea": "", "cta": "" }
For LinkedIn: use professional tone, buyer insight, executive framing.

"static-infographic" (Static Infographics):
Return 1 infographic structure. Item:
{ "title": "", "subtitle": "", "sections": [{ "sectionTitle": "", "copyBlock": "", "visualElement": "" }], "cta": "", "colorScheme": "" }

"multi-image-carousel" (Multi-Image Carousels):
Return 5–10 slides. Each item:
{ "slideNumber": 1, "slideTitle": "", "bodyCopy": "", "visualDirection": "", "cta": "" }

"pdf-carousel" (Multi-Page PDF Carousels):
Return 6–12 pages. Each item:
{ "pageNumber": 1, "pageTitle": "", "bodyCopy": "", "visualDirection": "", "designNotes": "" }
Last page must be CTA page.

"poll-quiz" (Polls and Quizzes):
Return 1 poll/quiz. Item:
{ "title": "", "type": "poll|quiz", "questions": [{ "question": "", "options": [], "correctAnswer": "", "explanation": "" }], "cta": "" }

"qa-session" (Q&A Sessions):
Return 8–15 Q&A prompts. Each item:
{ "questionNumber": 1, "question": "", "expertAnswer": "", "source": "" }

"comment-engagement" (Comments on Target Posts):
Return 5–8 comment options. Each item:
{ "commentNumber": 1, "targetPostType": "", "comment": "", "tone": "", "softCta": "" }
Must be natural, non-spammy. Do not sound promotional. Use helpful insight only.

GENERAL RULES:
- Every output must connect to the approved persona and topic.
- Every output must use the approved content angle.
- CTA must match the brief's recommendedCTA.
- Claim risk guidance from the keyword strategy must be respected.
- Do not force the primary keyword into every piece — use it naturally or not at all.
- Content must feel native to the platform, not like repurposed blog copy.

Return strict JSON matching the schema provided.`;

// ─── User Prompt Builder ─────────────────────────────────────────────────────

export function buildPlatformContentUserPrompt(input: PlatformContentInput): string {
  return `WORKSPACE BRAND: ${input.workspace.brandName}
Website: ${input.workspace.websiteUrl}
Industry: ${input.workspace.industry}
Business Type: ${input.workspace.businessType}
Target Market: ${input.workspace.targetMarket}
Tone of Voice: ${input.workspace.toneOfVoice}
Core Offer: ${input.workspace.coreOffer}
Brand Differentiators: ${input.workspace.brandDifferentiators}
Compliance Notes: ${input.workspace.complianceNotes}
MCM Rules Active: ${input.mcmWorkspaceRulesIfApplicable}

SELECTED PERSONA: ${input.selectedPersona}
Persona Description: ${input.selectedPersonaDescription}

SELECTED TOPIC: ${input.selectedTopic}
Topic ID: ${input.selectedTopicId}
Content Goal: ${input.contentGoal}

SELECTED PLATFORM/FORMAT: ${input.selectedPlatformFormat}

APPROVED KEYWORD STRATEGY:
- Primary Keyword: ${input.approvedKeywordStrategy.primaryKeyword}
- Secondary Keywords: ${input.approvedKeywordStrategy.secondaryKeywords.join(', ')}
- Search Intent: ${input.approvedKeywordStrategy.searchIntent}
- Funnel Stage: ${input.approvedKeywordStrategy.funnelStage}
- Commercial Priority: ${input.approvedKeywordStrategy.commercialPriority}
- Claim Risk: ${input.approvedKeywordStrategy.claimRisk}
- Claim Risk Notes: ${input.approvedKeywordStrategy.claimRiskNotes}
- Recommended CTA: ${input.approvedKeywordStrategy.recommendedCTA}
- Content Angle: ${input.approvedKeywordStrategy.contentAngle}

APPROVED CONTENT BRIEF:
Brief Title: ${input.approvedContentBrief.briefTitle}
Angle: ${input.approvedContentBrief.angle}
Reader Problem: ${input.approvedContentBrief.readerProblem}
Decision Barrier Solved: ${input.approvedContentBrief.decisionBarrierSolved}
Recommended CTA: ${input.approvedContentBrief.recommendedCTA}
Platform Structure: ${JSON.stringify(input.approvedContentBrief.platformSpecificStructure)}

MUST INCLUDE:
${input.approvedContentBrief.mustInclude.map(m => '- ' + m).join('\n')}

MUST AVOID:
${input.approvedContentBrief.mustAvoid.map(m => '- ' + m).join('\n')}

TASK:
Generate platform-native content for format "${input.selectedPlatformFormat}".
Follow the format output rules for this specific format.

Return strict JSON:
{
  "contentOutput": {
    "platformFormat": "${input.selectedPlatformFormat}",
    "persona": "",
    "topic": "",
    "primaryKeyword": "",
    "contentGoal": "",
    "recommendedCTA": "",
    "items": [],
    "notes": "",
    "claimRiskNotes": ""
  }
}`;
}

// ─── Mock Response ───────────────────────────────────────────────────────────

export function mockPlatformContent(input: PlatformContentInput): PlatformContentResult {
  const pk = input.approvedKeywordStrategy.primaryKeyword || input.selectedTopic;
  const cta = input.approvedContentBrief.recommendedCTA || input.approvedKeywordStrategy.recommendedCTA;
  const brand = input.workspace.brandName;
  const fmt = input.selectedPlatformFormat;

  const base = {
    platformFormat: fmt,
    persona: input.selectedPersona,
    topic: input.selectedTopic,
    primaryKeyword: pk,
    contentGoal: input.contentGoal,
    recommendedCTA: cta,
    claimRiskNotes: input.approvedKeywordStrategy.claimRiskNotes || '',
  };

  // Generate format-specific mock items
  let items: Array<Record<string, unknown>> = [];
  let notes = '';

  switch (fmt) {
    case 'text-post':
      items = [1, 2, 3].map(v => ({
        variation: v,
        hook: `${v === 1 ? 'Stop scrolling if' : v === 2 ? 'Most people don\'t realize' : 'Here\'s what nobody tells you about'} ${pk.toLowerCase()}...`,
        body: `${input.approvedContentBrief.angle}. ${input.approvedContentBrief.decisionBarrierSolved}`,
        cta: cta,
        hashtags: ['#' + pk.replace(/\s+/g, ''), `#${brand.replace(/\s+/g, '')}`, '#ExpertAdvice'],
      }));
      notes = '3 variations provided. Test hooks A/B to find best performer.';
      break;

    case 'image-post':
      items = [1, 2].map(v => ({
        variation: v,
        caption: `${v === 1 ? '🪑' : '✨'} ${input.approvedContentBrief.angle}\n\n${input.approvedContentBrief.decisionBarrierSolved}\n\n${cta}`,
        visualConcept: v === 1 ? `Premium showroom setting with ${pk} as focal point — warm lighting, clean background` : `Close-up detail shot highlighting key feature — lifestyle context`,
        onImageText: v === 1 ? pk : `${brand} — ${input.selectedTopic}`,
        cta: cta,
      }));
      notes = 'Image not generated — visual concepts provided for design team.';
      break;

    case 'short-video':
      items = [{
        title: `${pk} in 60 Seconds`,
        duration: '30–60s',
        hook: `You've been researching ${pk.toLowerCase()} for weeks — here's what actually matters.`,
        scenes: [
          { sceneNumber: 1, visual: 'Host on camera, showroom background', voiceover: `If you're looking at ${pk.toLowerCase()}, here's what most people miss.`, onScreenText: pk, duration: '0:00–0:08' },
          { sceneNumber: 2, visual: 'Product detail shots / comparison setup', voiceover: input.approvedContentBrief.angle, onScreenText: 'Key insight', duration: '0:08–0:25' },
          { sceneNumber: 3, visual: 'Demo / lifestyle shot', voiceover: input.approvedContentBrief.decisionBarrierSolved, onScreenText: 'The difference', duration: '0:25–0:45' },
          { sceneNumber: 4, visual: 'Host direct to camera + CTA card', voiceover: cta, onScreenText: cta, duration: '0:45–0:60' },
        ],
        cta: cta,
        musicMood: 'Upbeat, confident, modern',
      }];
      notes = 'Script optimized for Reels/Shorts/TikTok format.';
      break;

    case 'long-video':
      items = [{
        title: `${pk}: Everything You Need to Know (${new Date().getFullYear()})`,
        duration: '8–12 min',
        introHook: `If you've been researching ${pk.toLowerCase()} and feeling overwhelmed by options, this video will give you the clarity you need.`,
        chapters: [
          { timestamp: '0:00', title: 'Introduction', talkingPoints: ['Hook', 'What this video covers', 'Why this matters'] },
          { timestamp: '1:30', title: `What Is ${pk}?`, talkingPoints: ['Definition', 'Key features', 'Why it exists'] },
          { timestamp: '3:00', title: 'How to Choose', talkingPoints: ['Decision criteria', 'Common mistakes', 'What to prioritize'] },
          { timestamp: '5:00', title: 'Comparison', talkingPoints: ['Top options side by side', 'Pros/cons', 'Best for whom'] },
          { timestamp: '7:00', title: 'Expert Recommendation', talkingPoints: ['Our guidance', 'Next steps', cta] },
          { timestamp: '9:00', title: 'FAQ', talkingPoints: ['Top 3 viewer questions', 'Quick answers'] },
        ],
        cta: cta,
        thumbnailConcept: `Split image: confused buyer on left, confident buyer on right. Text overlay: "${pk}"`,
      }];
      notes = 'YouTube-optimized with chapter timestamps for retention.';
      break;

    case 'instagram-story':
    case 'linkedin-story':
      items = Array.from({ length: 5 }, (_, i) => ({
        frameNumber: i + 1,
        frameType: i === 0 ? 'text' : i === 3 ? 'poll' : i === 4 ? 'text' : 'image',
        text: i === 0 ? `Did you know this about ${pk.toLowerCase()}? 👇`
          : i === 1 ? input.approvedContentBrief.angle
          : i === 2 ? input.approvedContentBrief.decisionBarrierSolved
          : i === 3 ? `What matters most to you?`
          : `${cta} — Link in bio ☝️`,
        visualDirection: i === 0 ? 'Bold text on brand-color background' : i === 3 ? 'Poll sticker overlay' : 'Product/lifestyle imagery',
        stickerIdea: i === 3 ? 'Poll: Quality vs Price' : i === 4 ? 'Link sticker to website' : '',
        cta: i === 4 ? cta : '',
      }));
      notes = fmt === 'linkedin-story' ? 'Professional tone with buyer insight framing.' : 'Optimized for Instagram story flow.';
      break;

    case 'static-infographic':
      items = [{
        title: pk,
        subtitle: input.approvedContentBrief.angle,
        sections: [
          { sectionTitle: 'The Problem', copyBlock: input.approvedContentBrief.readerProblem, visualElement: 'Icon + stat' },
          { sectionTitle: 'Key Factors', copyBlock: 'Top 3–5 decision criteria', visualElement: 'Numbered list with icons' },
          { sectionTitle: 'Comparison', copyBlock: 'Side-by-side breakdown', visualElement: 'Comparison chart' },
          { sectionTitle: 'Expert Tip', copyBlock: input.approvedContentBrief.decisionBarrierSolved, visualElement: 'Quote bubble' },
          { sectionTitle: 'Next Step', copyBlock: cta, visualElement: 'CTA button design' },
        ],
        cta: cta,
        colorScheme: 'Brand colors — dark background, accent highlights',
      }];
      notes = 'Structure ready for designer. Vertical format recommended for social.';
      break;

    case 'multi-image-carousel':
      items = Array.from({ length: 7 }, (_, i) => ({
        slideNumber: i + 1,
        slideTitle: i === 0 ? pk : i === 6 ? 'Ready to Decide?' : `Point ${i}`,
        bodyCopy: i === 0 ? `Swipe to learn what ${input.selectedPersona.toLowerCase()} buyers need to know →`
          : i === 6 ? cta
          : `Key insight #${i} about ${pk.toLowerCase()} — ${input.approvedContentBrief.angle}.`,
        visualDirection: i === 0 ? 'Bold title card, brand colors' : i === 6 ? 'CTA card with website/link' : 'Supporting visual with text overlay',
        cta: i === 6 ? cta : '',
      }));
      notes = 'Optimized for Instagram/LinkedIn carousel. First slide = hook, last slide = CTA.';
      break;

    case 'pdf-carousel':
      items = Array.from({ length: 8 }, (_, i) => ({
        pageNumber: i + 1,
        pageTitle: i === 0 ? pk : i === 7 ? 'Get Expert Help' : `Section ${i}`,
        bodyCopy: i === 0 ? `A guide for ${input.selectedPersona.toLowerCase()} buyers`
          : i === 7 ? `${cta}\n\n${input.workspace.websiteUrl}`
          : `Detailed insight #${i} about ${pk.toLowerCase()}.`,
        visualDirection: i === 0 ? 'Cover page — premium design' : i === 7 ? 'CTA page with contact info' : 'Content page with supporting graphic',
        designNotes: i === 0 ? 'Use brand logo and colors' : '',
      }));
      notes = 'PDF carousel for LinkedIn document post. Downloadable format.';
      break;

    case 'poll-quiz':
      items = [{
        title: `How Much Do You Know About ${pk}?`,
        type: 'quiz',
        questions: [
          { question: `What is the most important factor when choosing ${pk.toLowerCase()}?`, options: ['Price only', 'Features + comfort fit', 'Brand name', 'Color'], correctAnswer: 'Features + comfort fit', explanation: 'The best choice balances features with how well it fits your specific needs.' },
          { question: 'True or false: Trying in person before buying makes no difference.', options: ['True', 'False'], correctAnswer: 'False', explanation: `In-person demos reveal comfort and fit differences that specs can't capture.` },
          { question: `What should you compare first?`, options: ['Price tags', 'Core features for your needs', 'Online reviews only', 'Brand popularity'], correctAnswer: 'Core features for your needs', explanation: 'Start with what matters to YOUR body and lifestyle, then compare options.' },
        ],
        cta: cta,
      }];
      notes = 'Interactive quiz for social engagement. Can be adapted for email or website.';
      break;

    case 'qa-session':
      items = Array.from({ length: 10 }, (_, i) => ({
        questionNumber: i + 1,
        question: [
          `What should I look for in ${pk.toLowerCase()}?`,
          `How do I know if ${pk.toLowerCase()} is right for me?`,
          `What's the price range?`,
          `Can I try before I buy?`,
          `What's the warranty like?`,
          `How does delivery and setup work?`,
          `How long will it last?`,
          `What do other buyers say?`,
          `Is it worth the investment?`,
          `Where should I start?`,
        ][i],
        expertAnswer: `Great question. ${input.approvedContentBrief.decisionBarrierSolved} The best approach is to ${cta.toLowerCase()}.`,
        source: `${brand} product specialist`,
      }));
      notes = 'Q&A bank for live sessions, story Q&A stickers, or community posts.';
      break;

    case 'comment-engagement':
      items = Array.from({ length: 6 }, (_, i) => ({
        commentNumber: i + 1,
        targetPostType: ['competitor review', 'buyer question post', 'industry discussion', 'buyer complaint', 'recommendation request', 'comparison thread'][i],
        comment: [
          `Really good breakdown! One thing worth adding — trying in person makes a huge difference for ${pk.toLowerCase()}. The specs don't always tell the full story.`,
          `Great question! The answer depends a lot on your specific needs. If you want a personalized rec, happy to share what I've seen work for different situations.`,
          `This is spot on. The ${input.workspace.industry} space has changed a lot — expert guidance matters more than ever for high-ticket decisions.`,
          `Totally understand the frustration. The key is making sure you get the right fit from the start — that's where in-person guidance really helps.`,
          `A few things to consider: your budget, space, and what features actually matter for YOUR needs. Generic "best of" lists miss the personal fit factor.`,
          `Good comparison! Worth noting that specs only tell part of the story — comfort and build quality are things you really need to experience.`,
        ][i],
        tone: ['helpful', 'advisory', 'agreeable', 'empathetic', 'educational', 'supportive'][i],
        softCta: i % 3 === 0 ? 'Happy to share more if you have specific questions.' : '',
      }));
      notes = 'Natural, non-promotional comments. Adapt tone to each target post context. Never paste identical comments.';
      break;

    default:
      items = [{ note: `Format "${fmt}" not specifically handled — returning generic structure.` }];
      notes = 'Unrecognized format. Content may need manual adjustment.';
  }

  return { contentOutput: { ...base, items, notes } };
}
