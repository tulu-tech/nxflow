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
  // Topic context for fallback image generation
  selectedTopic?: string;
  selectedPersona?: string;
  approvedKeywordStrategy?: { primaryKeyword?: string; secondaryKeywords?: string[] };
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
        model: 'gpt-image-1.5',
        prompt: fullPrompt,
        n: 1,
        size,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[GPT-Image Error] Image generation failed:`, err);
      return null;
    }

    const data = await res.json();
    // gpt-image-1.5 returns b64_json by default; also check for url
    const item = data.data?.[0];
    if (item?.url) return item.url;
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    return null;
  } catch (err) {
    console.error('[GPT-Image Error]', err);
    return null;
  }
}

// ─── Mock Response (no API key) ──────────────────────────────────────────────

export function mockContentImages(input: ContentImagesInput): ContentImagesResult {
  const ws = input.workspace ?? {} as ContentImagesInput['workspace'];
  const brand = ws.brandName ?? '';
  const topic = input.selectedTopic ?? brand;
  const pk = input.approvedKeywordStrategy?.primaryKeyword ?? topic;
  const secKws = input.approvedKeywordStrategy?.secondaryKeywords ?? [];
  const warnings: string[] = [];
  const plan = (input.approvedImagePlan ?? []).slice(0, 5);

  // Helper: pick the best real image URL from plan item references
  const pickRealImage = (item: ContentImagesInput['approvedImagePlan'][0]): string | null => {
    const refs = item.referenceImageUrls ?? [];
    if (refs.length > 0) return refs[0]; // Use first reference image from sitemap
    return null;
  };

  // Helper: Unsplash source URL (keyword-relevant stock photo, no API key needed)
  const unsplashUrl = (query: string, w = 1200, h = 800): string => {
    const q = encodeURIComponent(query.slice(0, 80));
    return `https://source.unsplash.com/${w}x${h}/?${q}`;
  };

  const generatedImages: GeneratedImage[] = plan.map((item) => {
    const kw = item.relatedKeyword || pk;
    const altText = generateAltText(item.imagePurpose, kw, brand);
    const fileName = generateFileName(item.imagePurpose, kw, item.imageNumber);

    // 1st priority: real reference image from sitemap
    const realUrl = pickRealImage(item);
    // 2nd priority: Unsplash with keyword search
    const imageUrl = realUrl ?? unsplashUrl(`${kw} ${item.imagePurpose}`, 1200, 800);

    if (realUrl) {
      warnings.push(`Image #${item.imageNumber}: Using reference image from ${item.referencePageUrl ?? 'sitemap'}`);
    }

    return {
      imageNumber: item.imageNumber,
      imagePurpose: item.imagePurpose,
      promptUsed: item.imagePrompt,
      imageUrl,
      altText,
      recommendedFileName: fileName,
      relatedKeyword: kw,
      placementRecommendation: item.placementRecommendation,
    };
  });

  // Topic-aware fallback purposes
  const fallbackPurposes = ['hero', 'product', 'feature-detail', 'showroom', 'comparison'];
  const fallbackSections = ['Hero / Above the fold', 'Product detail section', 'Feature breakdown section', 'Expert guidance section', 'Comparison / CTA section'];

  // Pad to 5 if plan had fewer — use topic context with Unsplash
  while (generatedImages.length < 5) {
    const num = generatedImages.length + 1;
    const idx = num - 1;
    const purpose = fallbackPurposes[idx] ?? 'product';
    const kw = secKws[idx] ?? pk;
    const slug = kw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    generatedImages.push({
      imageNumber: num,
      imagePurpose: purpose,
      promptUsed: `Premium ${purpose} image for ${pk} — ${brand}, editorial photography, photorealistic, 8k`,
      imageUrl: unsplashUrl(`${kw} ${purpose}`, 1200, 800),
      altText: generateAltText(purpose, kw, brand),
      recommendedFileName: `${slug}-${purpose}-${num}.webp`,
      relatedKeyword: kw,
      placementRecommendation: fallbackSections[idx] ?? 'Content section',
    });
    warnings.push(`Image #${num}: Generated from topic context (no approved plan item).`);
  }

  warnings.push('⚠️ No DALL-E API key configured. Images sourced from sitemap references or Unsplash stock. Configure OPENAI_API_KEY for AI-generated images.');

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
  const pk2 = input.approvedKeywordStrategy?.primaryKeyword ?? input.selectedTopic ?? brand;
  const fallbackPurposes2 = ['hero', 'product', 'feature-detail', 'showroom', 'comparison'];
  while (generatedImages.length < 5) {
    const num = generatedImages.length + 1;
    const purpose = fallbackPurposes2[num - 1] ?? 'product';
    generatedImages.push({
      imageNumber: num,
      imagePurpose: purpose,
      promptUsed: `Premium ${purpose} image for ${pk2} — ${brand}`,
      imageUrl: generatePlaceholderUrl(purpose, pk2, '16:9'),
      altText: generateAltText(purpose, pk2, brand),
      recommendedFileName: generateFileName(purpose, pk2, num),
      relatedKeyword: pk2,
      placementRecommendation: 'Content section',
    });
    warnings.push(`Image plan had fewer than 5 items — padded image #${num}.`);
  }

  return { generatedImages, warnings };
}
