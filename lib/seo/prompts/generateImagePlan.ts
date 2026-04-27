/**
 * generate-image-plan — AI Image Plan Creation
 *
 * Creates a 5-image plan with detailed prompts before
 * image generation. References workspace sitemap pages
 * for visual grounding.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ImagePurpose =
  | 'hero'
  | 'showroom'
  | 'product'
  | 'feature-detail'
  | 'comparison'
  | 'lifestyle'
  | 'local'
  | 'service'
  | 'delivery-fit';

export type AspectRatio = '16:9' | '4:5' | '1:1' | '9:16';

export interface ImagePlanInput {
  workspace: {
    workspaceId: string;
    brandName: string;
    websiteUrl: string;
    industry: string;
    businessType: string;
  };
  selectedPersona: string;
  selectedTopic: string;
  selectedTopicId: string;
  selectedPlatformFormat: string;
  approvedKeywordStrategy: {
    primaryKeyword: string;
    secondaryKeywords: string[];
    searchIntent: string;
    brandIntent: boolean;
    localIntent: boolean;
    comparisonIntent: boolean;
    claimRisk: string;
  };
  linkedContent: string;
  imageReferencePages: Array<{
    url: string;
    pageType: string;
    relevanceReason: string;
    detectedProductOrBrand: string;
    imageUrls: string[];
  }>;
  mcmWorkspaceRulesIfApplicable: boolean;
}

export interface ImagePlanItem {
  imageNumber: number;
  imagePurpose: ImagePurpose;
  placementRecommendation: string;
  relatedKeyword: string;
  relatedSection: string;
  referencePageUrl: string;
  referenceImageUrls: string[];
  imagePrompt: string;
  negativePrompt: string;
  aspectRatio: AspectRatio;
  realismLevel: string;
  notes: string;
}

export interface ImagePlanResult {
  imagePlan: ImagePlanItem[];
  warnings: string[];
}

// ─── System Prompt ───────────────────────────────────────────────────────────

export const IMAGE_PLAN_SYSTEM_PROMPT = `You are a senior visual content strategist, ecommerce creative director, and SEO image planning expert.

Your task is to create a 5-image plan for the selected content.

Do not generate images yet. Create detailed image prompts that will later be sent to an image generation model.

GENERAL RULES:
1. Generate exactly 5 image concepts.
2. Images must be realistic, premium, and directly connected to the content topic.
3. Avoid generic AI-looking visuals — no plastic skin, uncanny faces, or surreal lighting.
4. Avoid cartoon, illustration, fantasy, surreal, or exaggerated visuals unless the platform explicitly requires it.
5. Use realistic concepts: showroom environment, product photography, customer demo, home wellness setting, feature close-up, comparison setup.
6. At least one image should connect to the primary keyword.
7. If the content is about a specific product/model, at least 2 images should feature or visually reference that product.
8. If the content is local/showroom-focused, include showroom/demo/customer guidance imagery.
9. If the content is about delivery/space/fit, include room placement, measuring, clearance, or installation imagery.
10. If the content is about warranty/service, include professional support, service confidence, or post-purchase ownership imagery.
11. If the content is about comparison, include side-by-side showroom comparison or expert-guided selection imagery.
12. If the content is about comfort/recovery/wellness, keep it wellness-oriented and strictly non-medical.
13. Do NOT create images showing medical treatment, doctors, clinics, hospital settings, injury recovery, physical therapy, or unrealistic health outcomes.
14. Do NOT include text overlays, watermarks, or UI elements unless specifically requested.
15. Do NOT use brand logos unless explicitly approved.
16. Make all images compatible with premium ecommerce and editorial use.

IMAGE PROMPT WRITING RULES:
- Be highly specific: describe lighting, camera angle, composition, materials, colors, mood, setting.
- Include the subject, environment, lighting style, and compositional details.
- Use photography terminology: "soft diffused natural light", "shallow depth of field", "eye-level shot", "wide-angle interior shot", "overhead flat lay".
- Negative prompts should list what to avoid: "no text, no logos, no cartoon, no illustration, no medical setting, no blurry, no low quality".

MCM-SPECIFIC IMAGE STRATEGY (apply only when mcmWorkspaceRulesIfApplicable is true):
- Image 1 (Hero): Premium massage chair in a lifestyle setting — modern home, wellness room, or showroom.
- Include at least one showroom image: customer speaking with a knowledgeable salesperson in a calm, well-lit showroom.
- Include at least one customer experience image: person trying a massage chair, relaxed, natural expression, modern setting.
- If content discusses a specific brand/model: include close-up feature detail (foot rollers, zero gravity recline, remote control, arm massage, calf massage, heating elements, body scan, luxury upholstery).
- If content is a comparison: include side-by-side chairs in a showroom with an expert guiding.
- All images must reinforce purchase confidence, showroom trust, expert guidance, and premium decision support.

REFERENCE IMAGE USAGE:
- Use imageReferencePages as visual grounding context.
- If imageUrls are available in reference pages, include them in referenceImageUrls.
- If no imageUrls, use the page URL as referencePageUrl for context.

ASPECT RATIO GUIDANCE:
- Blog/article hero: 16:9
- Social post: 1:1 or 4:5
- Story: 9:16
- Product detail: 4:5 or 1:1
- Infographic: 9:16

Return strict JSON matching the schema provided.`;

// ─── User Prompt Builder ─────────────────────────────────────────────────────

export function buildImagePlanUserPrompt(input: ImagePlanInput): string {
  const refPagesStr = (input.imageReferencePages ?? []).length > 0
    ? (input.imageReferencePages ?? []).map((p, i) =>
        `  ${i + 1}. [${p.pageType}] ${p.url}\n     Reason: ${p.relevanceReason}\n     Brand/Product: ${p.detectedProductOrBrand || '—'}\n     Images: ${(p.imageUrls ?? []).length > 0 ? (p.imageUrls ?? []).join(', ') : 'none extracted'}`
      ).join('\n')
    : '  (no reference pages available)';

  // Truncate content for prompt efficiency — extract headings and IMAGE_OPPORTUNITY markers
  const headings = (input.linkedContent ?? "").match(/^#{1,3}\s+.+$/gm)?.join('\n') ?? '';
  const imageMarkers = (input.linkedContent ?? "").match(/\[IMAGE_OPPORTUNITY:[^\]]+\]/g)?.join('\n') ?? '';
  const contentContext = `HEADINGS:\n${headings}\n\nIMAGE MARKERS:\n${imageMarkers || '(none)'}`;

  return `WORKSPACE: ${(input.workspace ?? {} as any).brandName ?? ""} (${(input.workspace ?? {} as any).websiteUrl ?? ""})
Industry: ${(input.workspace ?? {} as any).industry ?? ""}
Business Type: ${(input.workspace ?? {} as any).businessType ?? ""}
MCM Rules Active: ${input.mcmWorkspaceRulesIfApplicable}

CONTENT CONTEXT:
Persona: ${input.selectedPersona}
Topic: ${input.selectedTopic}
Topic ID: ${input.selectedTopicId}
Platform/Format: ${input.selectedPlatformFormat}
Primary Keyword: ${(input.approvedKeywordStrategy ?? {} as any).primaryKeyword ?? ""}
Brand Intent: ${(input.approvedKeywordStrategy ?? {} as any).brandIntent ?? false}
Local Intent: ${(input.approvedKeywordStrategy ?? {} as any).localIntent ?? false}
Comparison Intent: ${(input.approvedKeywordStrategy ?? {} as any).comparisonIntent ?? false}
Claim Risk: ${(input.approvedKeywordStrategy ?? {} as any).claimRisk ?? "Low"}

CONTENT STRUCTURE:
${contentContext}

IMAGE REFERENCE PAGES:
${refPagesStr}

TASK:
Create exactly 5 image concepts for this content.
Each must have a detailed, generation-ready imagePrompt and negativePrompt.

Return strict JSON:
{
  "imagePlan": [
    {
      "imageNumber": 1,
      "imagePurpose": "hero | showroom | product | feature-detail | comparison | lifestyle | local | service | delivery-fit",
      "placementRecommendation": "",
      "relatedKeyword": "",
      "relatedSection": "",
      "referencePageUrl": "",
      "referenceImageUrls": [],
      "imagePrompt": "",
      "negativePrompt": "",
      "aspectRatio": "16:9 | 4:5 | 1:1 | 9:16",
      "realismLevel": "High",
      "notes": ""
    }
  ],
  "warnings": []
}`;
}

// ─── Mock Response ───────────────────────────────────────────────────────────

export function mockImagePlan(input: ImagePlanInput): ImagePlanResult {
  const pk = (input.approvedKeywordStrategy ?? {} as any).primaryKeyword ?? "";
  const topic = input.selectedTopic;
  const brand = (input.workspace ?? {} as any).brandName ?? "";
  const isMCM = input.mcmWorkspaceRulesIfApplicable;
  const isBrand = (input.approvedKeywordStrategy ?? {} as any).brandIntent ?? false;
  const isLocal = (input.approvedKeywordStrategy ?? {} as any).localIntent ?? false;
  const isComparison = (input.approvedKeywordStrategy ?? {} as any).comparisonIntent ?? false;
  const isArticle = input.selectedPlatformFormat === 'article-blog';

  const defaultNeg = 'no text overlay, no logos, no watermark, no cartoon, no illustration, no fantasy, no surreal, no medical setting, no doctors, no hospital, no blurry, no low quality, no plastic skin';

  // Find best reference page
  const refPage = (input.imageReferencePages ?? [])[0];
  const refUrl = refPage?.url ?? '';
  const refImgs = refPage?.imageUrls ?? [];

  // Determine detected product/brand from references
  const detectedBrand = (input.imageReferencePages ?? []).find(p => p.detectedProductOrBrand)?.detectedProductOrBrand ?? '';

  // Build 5 images based on topic context
  const plan: ImagePlanItem[] = [];

  // Image 1 — Hero
  plan.push({
    imageNumber: 1,
    imagePurpose: 'hero',
    placementRecommendation: 'Above the fold, hero section of the article',
    relatedKeyword: pk,
    relatedSection: 'Introduction',
    referencePageUrl: refUrl,
    referenceImageUrls: refImgs.slice(0, 2),
    imagePrompt: isMCM
      ? `Premium massage chair in a modern home wellness room, warm ambient lighting, clean minimalist interior design, hardwood floors, large windows with natural light, the chair is the focal point of the room, shot from a slight low angle to emphasize premium quality, soft diffused lighting, editorial photography style, 8k, photorealistic${detectedBrand ? `, the chair resembles a ${detectedBrand} model` : ''}`
      : `Professional, premium hero image for an article about ${pk}, modern clean aesthetic, editorial quality, soft studio lighting, high-end commercial photography, photorealistic, 8k`,
    negativePrompt: defaultNeg,
    aspectRatio: isArticle ? '16:9' : '1:1',
    realismLevel: 'High',
    notes: 'Hero image — must set the premium, trustworthy tone for the entire piece.',
  });

  // Image 2 — Showroom / Expert guidance
  plan.push({
    imageNumber: 2,
    imagePurpose: isLocal ? 'local' : 'showroom',
    placementRecommendation: 'After the introduction or "why it matters" section',
    relatedKeyword: ((input.approvedKeywordStrategy ?? {} as any).secondaryKeywords ?? [])[0] ?? pk,
    relatedSection: isLocal ? 'Local/Showroom section' : 'Expert guidance section',
    referencePageUrl: (input.imageReferencePages ?? []).find(p => p.pageType === 'local')?.url ?? refUrl,
    referenceImageUrls: [],
    imagePrompt: isMCM
      ? `A knowledgeable massage chair specialist speaking with a couple in a premium showroom, multiple massage chairs visible in the background, clean modern retail environment, warm professional lighting, the salesperson is gesturing toward a chair feature, customers look engaged and comfortable, natural candid moment, editorial retail photography, photorealistic`
      : `A professional consultant helping a customer make a decision in a clean, modern retail showroom for ${(input.workspace ?? {} as any).industry ?? ""}, warm lighting, natural interaction, editorial photography`,
    negativePrompt: defaultNeg,
    aspectRatio: isArticle ? '16:9' : '4:5',
    realismLevel: 'High',
    notes: isLocal ? 'Local showroom visit experience.' : 'Expert guidance and showroom trust.',
  });

  // Image 3 — Product / Feature detail
  plan.push({
    imageNumber: 3,
    imagePurpose: isBrand ? 'product' : 'feature-detail',
    placementRecommendation: 'Within the comparison or feature breakdown section',
    relatedKeyword: ((input.approvedKeywordStrategy ?? {} as any).secondaryKeywords ?? [])[1] ?? pk,
    relatedSection: 'Features / Comparison section',
    referencePageUrl: (input.imageReferencePages ?? []).find(p => p.pageType === 'product')?.url ?? refUrl,
    referenceImageUrls: refImgs.slice(0, 1),
    imagePrompt: isMCM
      ? `Close-up detail shot of a premium massage chair feature: ${isBrand && detectedBrand ? `${detectedBrand} model showing` : ''} advanced foot roller mechanism with heating elements, smooth leather upholstery visible, soft studio lighting from the left, shallow depth of field, product photography style, clean white-gray background, 8k, photorealistic`
      : `Detailed close-up of a premium product feature related to ${pk}, product photography, studio lighting, shallow depth of field, clean background, photorealistic`,
    negativePrompt: defaultNeg,
    aspectRatio: '4:5',
    realismLevel: 'High',
    notes: 'Feature detail shot — helps buyer understand quality and craftsmanship.',
  });

  // Image 4 — Lifestyle / Customer experience
  plan.push({
    imageNumber: 4,
    imagePurpose: isComparison ? 'comparison' : 'lifestyle',
    placementRecommendation: 'Within the decision-making or lifestyle section',
    relatedKeyword: ((input.approvedKeywordStrategy ?? {} as any).secondaryKeywords ?? [])[2] ?? pk,
    relatedSection: isComparison ? 'Comparison section' : 'Lifestyle / Wellness section',
    referencePageUrl: refUrl,
    referenceImageUrls: [],
    imagePrompt: isComparison
      ? isMCM
        ? `Two premium massage chairs side by side in a well-lit showroom, a product specialist standing between them with a tablet, pointing to key differences, chairs have different designs showing variety, modern retail environment, soft warm lighting, editorial photography, photorealistic`
        : `Two premium products side by side for comparison in a clean showroom setting related to ${pk}, professional lighting, editorial style, photorealistic`
      : isMCM
        ? `A person relaxing in a premium massage chair in their modern home, zero gravity recline position, eyes closed with a serene natural expression, living room with warm evening lighting, cozy wellness atmosphere, the scene conveys relaxation and comfort, editorial lifestyle photography, photorealistic`
        : `A person enjoying the benefits of ${pk} in a modern home setting, relaxed, natural, warm lighting, lifestyle photography, photorealistic`,
    negativePrompt: defaultNeg + ', no exaggerated expressions',
    aspectRatio: isArticle ? '16:9' : '1:1',
    realismLevel: 'High',
    notes: isComparison ? 'Side-by-side comparison reinforces informed decision-making.' : 'Lifestyle image — connects the product to the reader\'s home and routine.',
  });

  // Image 5 — CTA / Confidence builder
  plan.push({
    imageNumber: 5,
    imagePurpose: 'service',
    placementRecommendation: 'Near the conclusion or CTA section',
    relatedKeyword: pk,
    relatedSection: 'Conclusion / CTA',
    referencePageUrl: (input.imageReferencePages ?? []).find(p => p.pageType === 'local' || p.pageType === 'contact')?.url ?? refUrl,
    referenceImageUrls: [],
    imagePrompt: isMCM
      ? `A white-glove delivery team carefully placing a premium massage chair in a customer's home, modern living room, the homeowner watching with a satisfied smile, professional installation setup, clean organized environment, warm natural light from windows, the scene conveys trust, professionalism, and premium service, editorial photography, photorealistic`
      : `Professional delivery and setup of a premium product in a customer's home, satisfied customer, clean modern interior, warm lighting, trust and service confidence, editorial photography, photorealistic`,
    negativePrompt: defaultNeg,
    aspectRatio: isArticle ? '16:9' : '4:5',
    realismLevel: 'High',
    notes: 'Service/delivery confidence image — reinforces post-purchase support and premium experience near the CTA.',
  });

  const warnings: string[] = [];
  if ((input.imageReferencePages ?? []).length === 0) {
    warnings.push('No image reference pages available. Image prompts are based on topic context only — no visual grounding from website.');
  }
  if (((input.approvedKeywordStrategy ?? {} as any).claimRisk ?? 'Low') === 'High') {
    warnings.push('High claim risk topic. All images avoid medical/treatment/clinical imagery. Wellness-only visuals used.');
  }

  return { imagePlan: plan, warnings };
}
