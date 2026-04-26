/**
 * generate-content-images — Batch Image Generation from Approved Plan
 *
 * Generates exactly 5 images using the approved image plan.
 * Uses DALL-E 3 when API key is available, falls back to
 * premium placeholder images otherwise.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContentImagesInput {
  approvedImagePlan: Array<{
    imageNumber: number;
    imagePurpose: string;
    placementRecommendation: string;
    relatedKeyword: string;
    relatedSection: string;
    referencePageUrl: string;
    referenceImageUrls: string[];
    imagePrompt: string;
    negativePrompt: string;
    aspectRatio: string;
    realismLevel: string;
    notes: string;
  }>;
  workspace: {
    workspaceId: string;
    brandName: string;
    websiteUrl: string;
    industry: string;
  };
}

export interface GeneratedImage {
  imageNumber: number;
  imagePurpose: string;
  promptUsed: string;
  imageUrl: string;
  altText: string;
  recommendedFileName: string;
  relatedKeyword: string;
  placementRecommendation: string;
}

export interface ContentImagesResult {
  generatedImages: GeneratedImage[];
  warnings: string[];
}

// ─── DALL-E Size Mapping ─────────────────────────────────────────────────────

function getDalleSize(aspectRatio: string): string {
  switch (aspectRatio) {
    case '16:9': return '1792x1024';
    case '9:16': return '1024x1792';
    case '4:5': return '1024x1792';  // Closest vertical
    case '1:1': return '1024x1024';
    default: return '1792x1024';
  }
}

// ─── Alt Text Generator ──────────────────────────────────────────────────────

function generateAltText(purpose: string, keyword: string, brand: string): string {
  const purposeDescriptions: Record<string, string> = {
    hero: `Premium ${keyword} in a modern setting`,
    showroom: `${brand} showroom with expert consultation for ${keyword}`,
    product: `${keyword} product detail and design`,
    'feature-detail': `Close-up of ${keyword} features and craftsmanship`,
    comparison: `Side-by-side ${keyword} comparison in showroom`,
    lifestyle: `Customer enjoying ${keyword} in a modern home`,
    local: `${brand} local showroom experience`,
    service: `Professional delivery and setup of ${keyword}`,
    'delivery-fit': `${keyword} installation and home fit guidance`,
  };
  return purposeDescriptions[purpose] || `${keyword} - ${brand}`;
}

// ─── File Name Generator ─────────────────────────────────────────────────────

function generateFileName(purpose: string, keyword: string, num: number): string {
  const slug = keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${slug}-${purpose}-${num}.webp`;
}

// ─── Placeholder Image Generator ─────────────────────────────────────────────

function generatePlaceholderUrl(purpose: string, keyword: string, aspectRatio: string): string {
  // Use picsum for realistic placeholders with consistent seeds
  const seed = `${purpose}-${keyword}`.replace(/[^a-zA-Z0-9]/g, '-');
  const dimensions: Record<string, string> = {
    '16:9': '1792/1024',
    '9:16': '1024/1792',
    '4:5': '1024/1280',
    '1:1': '1024/1024',
  };
  const dim = dimensions[aspectRatio] || '1792/1024';
  return `https://picsum.photos/seed/${seed}/${dim}`;
}

// ─── DALL-E Image Generator ──────────────────────────────────────────────────

export async function generateWithDalle(
  apiKey: string,
  imagePrompt: string,
  negativePrompt: string,
  aspectRatio: string,
): Promise<string | null> {
  const fullPrompt = `${imagePrompt}. IMPORTANT: ${negativePrompt}. Style: photorealistic, premium editorial quality, high resolution.`;
  const size = getDalleSize(aspectRatio);

  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: fullPrompt,
        n: 1,
        size,
        quality: 'standard',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[DALL-E Error] Image generation failed:`, err);
      return null;
    }

    const data = await res.json();
    return data.data?.[0]?.url || null;
  } catch (err) {
    console.error('[DALL-E Error]', err);
    return null;
  }
}

// ─── Mock Response (no API key) ──────────────────────────────────────────────

export function mockContentImages(input: ContentImagesInput): ContentImagesResult {
  const brand = input.workspace.brandName;
  const warnings: string[] = [];

  const generatedImages: GeneratedImage[] = input.approvedImagePlan.slice(0, 5).map((item) => {
    const altText = generateAltText(item.imagePurpose, item.relatedKeyword, brand);
    const fileName = generateFileName(item.imagePurpose, item.relatedKeyword, item.imageNumber);
    const imageUrl = generatePlaceholderUrl(item.imagePurpose, item.relatedKeyword, item.aspectRatio);

    return {
      imageNumber: item.imageNumber,
      imagePurpose: item.imagePurpose,
      promptUsed: item.imagePrompt,
      imageUrl,
      altText,
      recommendedFileName: fileName,
      relatedKeyword: item.relatedKeyword,
      placementRecommendation: item.placementRecommendation,
    };
  });

  // Pad to 5 if plan had fewer
  while (generatedImages.length < 5) {
    const num = generatedImages.length + 1;
    generatedImages.push({
      imageNumber: num,
      imagePurpose: 'lifestyle',
      promptUsed: `Premium ${brand} lifestyle image #${num}`,
      imageUrl: generatePlaceholderUrl('extra', `${brand}-${num}`, '16:9'),
      altText: `${brand} premium experience`,
      recommendedFileName: `${brand.toLowerCase().replace(/\s+/g, '-')}-image-${num}.webp`,
      relatedKeyword: brand,
      placementRecommendation: 'Supplementary image',
    });
    warnings.push(`Image plan had fewer than 5 items — padded image #${num} with generic lifestyle concept.`);
  }

  warnings.push('Images generated as placeholders (no DALL-E API key). Replace with DALL-E generated images when API key is configured.');

  return { generatedImages, warnings };
}

// ─── Full Generation (with API key) ──────────────────────────────────────────

export async function generateContentImages(
  input: ContentImagesInput,
  apiKey: string,
): Promise<ContentImagesResult> {
  const brand = input.workspace.brandName;
  const warnings: string[] = [];
  const generatedImages: GeneratedImage[] = [];

  const plan = input.approvedImagePlan.slice(0, 5);

  // Generate images sequentially to avoid rate limits
  for (const item of plan) {
    const altText = generateAltText(item.imagePurpose, item.relatedKeyword, brand);
    const fileName = generateFileName(item.imagePurpose, item.relatedKeyword, item.imageNumber);

    const imageUrl = await generateWithDalle(
      apiKey,
      item.imagePrompt,
      item.negativePrompt,
      item.aspectRatio,
    );

    if (imageUrl) {
      generatedImages.push({
        imageNumber: item.imageNumber,
        imagePurpose: item.imagePurpose,
        promptUsed: item.imagePrompt,
        imageUrl,
        altText,
        recommendedFileName: fileName,
        relatedKeyword: item.relatedKeyword,
        placementRecommendation: item.placementRecommendation,
      });
    } else {
      // Fallback to placeholder on individual image failure
      const placeholderUrl = generatePlaceholderUrl(item.imagePurpose, item.relatedKeyword, item.aspectRatio);
      generatedImages.push({
        imageNumber: item.imageNumber,
        imagePurpose: item.imagePurpose,
        promptUsed: item.imagePrompt,
        imageUrl: placeholderUrl,
        altText,
        recommendedFileName: fileName,
        relatedKeyword: item.relatedKeyword,
        placementRecommendation: item.placementRecommendation,
      });
      warnings.push(`Image #${item.imageNumber} (${item.imagePurpose}) failed DALL-E generation — using placeholder.`);
    }
  }

  // Pad if needed
  while (generatedImages.length < 5) {
    const num = generatedImages.length + 1;
    generatedImages.push({
      imageNumber: num,
      imagePurpose: 'lifestyle',
      promptUsed: `Premium ${brand} lifestyle image #${num}`,
      imageUrl: generatePlaceholderUrl('extra', `${brand}-${num}`, '16:9'),
      altText: `${brand} premium experience`,
      recommendedFileName: `${brand.toLowerCase().replace(/\s+/g, '-')}-image-${num}.webp`,
      relatedKeyword: brand,
      placementRecommendation: 'Supplementary image',
    });
    warnings.push(`Image plan had fewer than 5 items — padded image #${num}.`);
  }

  return { generatedImages, warnings };
}
