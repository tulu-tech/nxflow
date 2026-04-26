/**
 * HOMC Content Topics — 64 workspace-scoped topics for House of Massage Chairs
 *
 * These topics belong ONLY to the HOMC workspace. They are NOT global.
 * They control: persona-to-topic filtering, keyword selection,
 * internal/external link selection, and image generation planning.
 */

import type {
  WorkspaceContentTopic,
  TopicCluster,
  TopicSearchIntent,
  TopicContentType,
  TopicLinkIntent,
  TopicImageIntent,
  PreferredKeywordTagLogic,
  ClaimRiskLevel,
  PlatformType,
} from '../workspaceTypes';

// ─── Cluster Defaults ────────────────────────────────────────────────────────

interface ClusterDefaults {
  defaultSearchIntent: TopicSearchIntent;
  defaultContentType: TopicContentType;
  defaultCTA: string;
  claimRiskLevel: ClaimRiskLevel;
  platforms: PlatformType[];
  linkIntent: TopicLinkIntent;
  imageIntent: TopicImageIntent;
  kwLogic: PreferredKeywordTagLogic;
}

const CLUSTER_DEFAULTS: Record<TopicCluster, ClusterDefaults> = {
  'Local / Showroom': {
    defaultSearchIntent: 'local',
    defaultContentType: 'local-page',
    defaultCTA: 'Book a showroom visit',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'landing-page', 'google-business', 'facebook'],
    linkIntent: 'showroom-page',
    imageIntent: 'local-showroom-visual',
    kwLogic: { primaryTags: ['local', 'generic', 'showroom', 'store', 'near-me', 'Pleasanton', 'San Jose', 'Bay Area'], secondaryTags: ['generic', 'showroom'] },
  },
  'Best / Buying Guide': {
    defaultSearchIntent: 'commercial',
    defaultContentType: 'guide',
    defaultCTA: 'Compare chairs at our showroom',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'landing-page', 'shopify-page', 'youtube'],
    linkIntent: 'buying-guide',
    imageIntent: 'product-realistic',
    kwLogic: { primaryTags: ['generic'], secondaryTags: ['feature', 'comparison', 'price', 'local', 'luxury', 'warranty'] },
  },
  'Comparison / VS': {
    defaultSearchIntent: 'commercial',
    defaultContentType: 'comparison-page',
    defaultCTA: 'Compare these chairs in person',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'shopify-page', 'youtube'],
    linkIntent: 'comparison-page',
    imageIntent: 'comparison-visual',
    kwLogic: { primaryTags: ['comparison', 'vs', 'compare', 'brand', 'model'], secondaryTags: ['review', 'best'] },
  },
  'Brand / Model Review': {
    defaultSearchIntent: 'commercial',
    defaultContentType: 'review-page',
    defaultCTA: 'Try this model at our showroom',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'shopify-page', 'youtube', 'instagram'],
    linkIntent: 'product-page',
    imageIntent: 'product-realistic',
    kwLogic: { primaryTags: ['brand', 'model'], secondaryTags: ['review', 'best', 'feature'] },
  },
  'Price / Value': {
    defaultSearchIntent: 'commercial',
    defaultContentType: 'guide',
    defaultCTA: 'Speak with a specialist',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'shopify-page', 'youtube'],
    linkIntent: 'buying-guide',
    imageIntent: 'infographic-style',
    kwLogic: { primaryTags: ['price', 'cost', 'budget', 'value', 'worth it', 'sale', 'deal', 'generic'], secondaryTags: ['comparison', 'best'] },
  },
  'Warranty / Service': {
    defaultSearchIntent: 'informational',
    defaultContentType: 'guide',
    defaultCTA: 'Ask about warranty options',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'google-business'],
    linkIntent: 'warranty-service-page',
    imageIntent: 'warranty-service-visual',
    kwLogic: { primaryTags: ['warranty', 'service', 'repair', 'ownership'], secondaryTags: ['generic', 'brand'] },
  },
  'Delivery / Space / Fit': {
    defaultSearchIntent: 'informational',
    defaultContentType: 'guide',
    defaultCTA: 'Check dimensions at our showroom',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'shopify-page'],
    linkIntent: 'delivery-fit-page',
    imageIntent: 'delivery-fit-visual',
    kwLogic: { primaryTags: ['delivery', 'installation', 'dimensions', 'space', 'wall hugger', 'fit'], secondaryTags: ['generic'] },
  },
  'Pain / Comfort / Relaxation': {
    defaultSearchIntent: 'informational',
    defaultContentType: 'blog-post',
    defaultCTA: 'Book a showroom visit',
    claimRiskLevel: 'medium',
    platforms: ['website-blog', 'instagram', 'youtube', 'facebook'],
    linkIntent: 'buying-guide',
    imageIntent: 'lifestyle-home-visual',
    kwLogic: {
      primaryTags: ['comfort', 'relaxation', 'back comfort', 'neck comfort', 'lower back comfort', 'tired legs', 'recovery routine', 'zero gravity', 'full body'],
      secondaryTags: ['generic', 'feature'],
      avoidTags: ['medical', 'cure', 'treatment'],
      notes: 'Avoid keywords that force medical cure/treatment claims when safer options exist.',
    },
  },
  'Feature Education': {
    defaultSearchIntent: 'informational',
    defaultContentType: 'blog-post',
    defaultCTA: 'Experience these features in person',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'youtube', 'instagram'],
    linkIntent: 'educational-page',
    imageIntent: 'feature-detail-realistic',
    kwLogic: { primaryTags: ['feature', 'technology', 'generic'], secondaryTags: ['comparison', 'best', 'brand'] },
  },
  'AI Search / Answer Engine': {
    defaultSearchIntent: 'informational',
    defaultContentType: 'faq-page',
    defaultCTA: 'Visit our showroom',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'google-business'],
    linkIntent: 'educational-page',
    imageIntent: 'product-realistic',
    kwLogic: { primaryTags: ['brand', 'model', 'generic', 'feature'], secondaryTags: ['comparison', 'review', 'best', 'local'] },
  },
  'Lifestyle / Luxury': {
    defaultSearchIntent: 'commercial',
    defaultContentType: 'blog-post',
    defaultCTA: 'Visit our showroom',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'instagram', 'youtube', 'facebook'],
    linkIntent: 'collection-page',
    imageIntent: 'lifestyle-home-visual',
    kwLogic: { primaryTags: ['luxury', 'lifestyle', 'home', 'design', 'premium', 'generic'], secondaryTags: ['brand', 'feature'] },
  },
};

// ─── Topic Builder ───────────────────────────────────────────────────────────

interface TopicInput {
  num: number;
  name: string;
  cluster: TopicCluster;
  brand?: string;
  // Overrides (optional)
  intent?: TopicSearchIntent;
  contentType?: TopicContentType;
  cta?: string;
  risk?: ClaimRiskLevel;
  link?: TopicLinkIntent;
  image?: TopicImageIntent;
  kwPrimary?: string[];
  kwSecondary?: string[];
  kwAvoid?: string[];
  kwNotes?: string;
  platforms?: PlatformType[];
}

function buildTopic(t: TopicInput): WorkspaceContentTopic {
  const d = CLUSTER_DEFAULTS[t.cluster];
  const kwLogic: PreferredKeywordTagLogic = {
    primaryTags: t.kwPrimary ?? d.kwLogic.primaryTags,
    secondaryTags: t.kwSecondary ?? d.kwLogic.secondaryTags,
    avoidTags: t.kwAvoid ?? d.kwLogic.avoidTags,
    notes: t.kwNotes ?? d.kwLogic.notes,
  };
  const id = `homc-t${String(t.num).padStart(2, '0')}`;
  return {
    topicId: id,
    topicName: t.name,
    topicCluster: t.cluster,
    defaultSearchIntent: t.intent ?? d.defaultSearchIntent,
    defaultContentType: t.contentType ?? d.defaultContentType,
    defaultCTA: t.cta ?? d.defaultCTA,
    claimRiskLevel: t.risk ?? d.claimRiskLevel,
    recommendedPlatformFit: t.platforms ?? d.platforms,
    brandOrProductSignal: t.brand ?? '',
    preferredKeywordTagLogic: kwLogic,
    linkIntent: t.link ?? d.linkIntent,
    imageIntent: t.image ?? d.imageIntent,
    // Legacy fields
    id,
    topic: t.name,
    category: t.cluster,
    description: '',
    targetPersonaIds: [],
    suggestedKeywords: [],
    contentFormats: [],
    funnelStage: t.cluster === 'Feature Education' || t.cluster === 'Pain / Comfort / Relaxation' ? 'top'
      : t.cluster === 'Local / Showroom' || t.cluster === 'Warranty / Service' || t.cluster === 'Delivery / Space / Fit' ? 'bottom'
      : 'middle',
    priority: 'medium',
    status: 'planned',
  };
}

// ─── HOMC 64 Content Topics ─────────────────────────────────────────────────

const TOPIC_INPUTS: TopicInput[] = [
  // ── Persona 1: Bay Area Try-Before-Buy Showroom Shopper (T01–T06) ──
  { num: 1, name: 'Massage Chair Showroom in Pleasanton', cluster: 'Local / Showroom', kwPrimary: ['local', 'Pleasanton', 'showroom', 'store'], cta: 'Book a showroom visit' },
  { num: 2, name: 'Massage Chair Showroom in San Jose', cluster: 'Local / Showroom', kwPrimary: ['local', 'San Jose', 'showroom', 'store'], cta: 'Book a showroom visit' },
  { num: 3, name: 'Where to Try Massage Chairs in the Bay Area', cluster: 'Local / Showroom', intent: 'informational', kwPrimary: ['local', 'Bay Area', 'showroom', 'try', 'near-me'], contentType: 'blog-post' },
  { num: 4, name: 'Osaki Massage Chair Showroom Near Me', cluster: 'Local / Showroom', brand: 'Osaki', kwPrimary: ['Osaki', 'local', 'showroom', 'near-me'] },
  { num: 5, name: 'Massage Chair Store Near Me: What to Look For Before Visiting', cluster: 'Local / Showroom', intent: 'informational', contentType: 'blog-post', kwPrimary: ['local', 'store', 'near-me', 'showroom'], link: 'educational-page' },
  { num: 6, name: 'What to Expect at a Massage Chair Showroom', cluster: 'Local / Showroom', intent: 'informational', contentType: 'blog-post', link: 'educational-page', image: 'showroom-realistic' },

  // ── Persona 2: AI Best Massage Chair Recommendation Seeker (T07–T12) ──
  { num: 7, name: 'Best Massage Chairs: Expert Buying Guide by Use Case', cluster: 'Best / Buying Guide', contentType: 'guide', link: 'buying-guide', image: 'comparison-visual' },
  { num: 8, name: 'Which Massage Chair Should I Buy? Decision Guide', cluster: 'Best / Buying Guide', intent: 'informational', contentType: 'guide', link: 'buying-guide' },
  { num: 9, name: 'Best Massage Chairs for Home', cluster: 'Best / Buying Guide', image: 'lifestyle-home-visual' },
  { num: 10, name: 'Best Place to Buy a Massage Chair: Online, Brand Site, or Showroom?', cluster: 'Best / Buying Guide', intent: 'commercial', contentType: 'guide', link: 'showroom-page', image: 'showroom-realistic' },
  { num: 11, name: 'Best Massage Chairs by Use Case', cluster: 'Best / Buying Guide', contentType: 'guide', link: 'buying-guide', image: 'comparison-visual' },
  { num: 12, name: 'Best Premium Massage Chairs', cluster: 'Best / Buying Guide', kwPrimary: ['generic', 'luxury', 'premium'], kwSecondary: ['brand', 'comparison', 'price'], image: 'lifestyle-home-visual' },

  // ── Persona 3: Brand Comparison Researcher (T13–T19) ──
  { num: 13, name: 'Best Massage Chair Brands Compared', cluster: 'Comparison / VS', contentType: 'guide', link: 'collection-page', image: 'comparison-visual' },
  { num: 14, name: 'Osaki vs Ogawa Massage Chairs', cluster: 'Comparison / VS', brand: 'Osaki, Ogawa', kwPrimary: ['Osaki', 'Ogawa', 'vs', 'comparison'], kwSecondary: ['review', 'best', 'brand'] },
  { num: 15, name: 'Cozzia vs Infinity Massage Chairs', cluster: 'Comparison / VS', brand: 'Cozzia, Infinity', kwPrimary: ['Cozzia', 'Infinity', 'vs', 'comparison'], kwSecondary: ['review', 'best'] },
  { num: 16, name: 'Kyota vs Osaki Massage Chairs', cluster: 'Comparison / VS', brand: 'Kyota, Osaki', kwPrimary: ['Kyota', 'Osaki', 'vs', 'comparison'], kwSecondary: ['review', 'best'] },
  { num: 17, name: 'Bodyfriend vs Osaki Massage Chairs', cluster: 'Comparison / VS', brand: 'Bodyfriend, Osaki', kwPrimary: ['Bodyfriend', 'Osaki', 'vs', 'comparison'], kwSecondary: ['review', 'best', 'brand'] },
  { num: 18, name: 'Japanese vs Korean Massage Chair Brands', cluster: 'Comparison / VS', intent: 'informational', kwPrimary: ['Japanese', 'Korean', 'brand', 'comparison'], kwSecondary: ['best', 'review', 'quality'] },
  { num: 19, name: 'Massage Chair Brands by Price and Quality Tier', cluster: 'Comparison / VS', contentType: 'guide', kwPrimary: ['brand', 'price', 'quality', 'comparison'], kwSecondary: ['best', 'value'], image: 'infographic-style' },

  // ── Persona 4: Osaki High-Intent Buyer (T20–T25) ──
  { num: 20, name: 'Best Osaki Massage Chairs Compared', cluster: 'Brand / Model Review', brand: 'Osaki', kwPrimary: ['Osaki', 'best', 'brand'], kwSecondary: ['comparison', 'review'], contentType: 'guide', link: 'collection-page', image: 'comparison-visual' },
  { num: 21, name: 'Osaki Massage Chair Review Guide', cluster: 'Brand / Model Review', brand: 'Osaki', kwPrimary: ['Osaki', 'review'], kwSecondary: ['best', 'feature', 'model'] },
  { num: 22, name: 'Osaki Massage Chair Price Guide', cluster: 'Price / Value', brand: 'Osaki', kwPrimary: ['Osaki', 'price', 'cost', 'value'], kwSecondary: ['best', 'comparison'], link: 'product-page' },
  { num: 23, name: 'Osaki Atlas XL Massage Chair Review', cluster: 'Brand / Model Review', brand: 'Osaki Atlas XL', kwPrimary: ['Osaki', 'Atlas XL'], kwSecondary: ['review', 'feature', 'best'] },
  { num: 24, name: 'Osaki OS-Pro 4D DuoMax Review', cluster: 'Brand / Model Review', brand: 'Osaki OS-Pro 4D DuoMax', kwPrimary: ['Osaki', 'DuoMax', '4D'], kwSecondary: ['review', 'feature'] },
  { num: 25, name: 'Osaki Platinum Escape Duo 4D Review', cluster: 'Brand / Model Review', brand: 'Osaki Platinum Escape Duo 4D', kwPrimary: ['Osaki', 'Platinum', 'Escape', '4D'], kwSecondary: ['review', 'feature'] },

  // ── Persona 5: High-Intent Brand & Model Review Buyer (T26–T34) ──
  { num: 26, name: 'Bodyfriend Falcon Massage Chair Review', cluster: 'Brand / Model Review', brand: 'Bodyfriend Falcon', kwPrimary: ['Bodyfriend', 'Falcon'], kwSecondary: ['review', 'feature', 'best'] },
  { num: 27, name: 'Kyota Nokori M980 Review', cluster: 'Brand / Model Review', brand: 'Kyota Nokori M980', kwPrimary: ['Kyota', 'Nokori', 'M980'], kwSecondary: ['review', 'feature'] },
  { num: 28, name: 'Ogawa Active XL 3D Massage Chair Review', cluster: 'Brand / Model Review', brand: 'Ogawa Active XL 3D', kwPrimary: ['Ogawa', 'Active XL', '3D'], kwSecondary: ['review', 'feature'] },
  { num: 29, name: 'Infinity Massage Chair Buying Guide', cluster: 'Brand / Model Review', brand: 'Infinity', kwPrimary: ['Infinity', 'brand'], kwSecondary: ['review', 'best', 'comparison'], contentType: 'guide', link: 'buying-guide' },
  { num: 30, name: 'Cozzia Massage Chair Review & Buying Guide', cluster: 'Brand / Model Review', brand: 'Cozzia', kwPrimary: ['Cozzia', 'brand'], kwSecondary: ['review', 'best', 'comparison'], contentType: 'guide', link: 'buying-guide' },
  { num: 31, name: 'Bodyfriend Massage Chairs Buying Guide', cluster: 'Brand / Model Review', brand: 'Bodyfriend', kwPrimary: ['Bodyfriend', 'brand'], kwSecondary: ['review', 'best'], contentType: 'guide', link: 'buying-guide' },
  { num: 32, name: 'Kyota Genki M380 Massage Chair Review', cluster: 'Brand / Model Review', brand: 'Kyota Genki M380', kwPrimary: ['Kyota', 'Genki', 'M380'], kwSecondary: ['review', 'feature'] },
  { num: 33, name: 'Kyota Yugana M780 4D Review', cluster: 'Brand / Model Review', brand: 'Kyota Yugana M780', kwPrimary: ['Kyota', 'Yugana', 'M780', '4D'], kwSecondary: ['review', 'feature'] },
  { num: 34, name: 'Fujiiryoki Cyber Relax Massage Chair Review', cluster: 'Brand / Model Review', brand: 'Fujiiryoki Cyber Relax', kwPrimary: ['Fujiiryoki', 'Cyber Relax'], kwSecondary: ['review', 'feature', 'Japanese'] },

  // ── Persona 6: Price, Value & Financing Evaluator (T35–T40) ──
  { num: 35, name: 'Massage Chair Price Guide: What You Get at Each Budget', cluster: 'Price / Value' },
  { num: 36, name: 'Best Massage Chairs Under $5,000', cluster: 'Price / Value', kwPrimary: ['price', 'budget', 'value', 'under 5000', 'generic'], kwSecondary: ['best', 'comparison'], contentType: 'guide', link: 'collection-page', image: 'comparison-visual' },
  { num: 37, name: 'Is a Massage Chair Worth It?', cluster: 'Price / Value', intent: 'informational', kwPrimary: ['value', 'worth it', 'generic'], kwSecondary: ['price', 'comparison'] },
  { num: 38, name: 'Cheap vs Premium Massage Chairs: What Actually Changes?', cluster: 'Price / Value', intent: 'informational', kwPrimary: ['price', 'budget', 'premium', 'cheap', 'generic'], kwSecondary: ['comparison', 'feature'], image: 'comparison-visual' },
  { num: 39, name: 'Massage Chair Financing Guide', cluster: 'Price / Value', intent: 'informational', kwPrimary: ['financing', 'payment', 'price', 'generic'], kwSecondary: ['value'] },
  { num: 40, name: 'Massage Chair Sale: How to Evaluate a Deal', cluster: 'Price / Value', intent: 'commercial', kwPrimary: ['sale', 'deal', 'price', 'generic'], kwSecondary: ['value', 'comparison'] },

  // ── Persona 7: Zero Gravity & Full-Body Feature Shopper (T41–T46) ──
  { num: 41, name: 'Best Zero Gravity Massage Chairs', cluster: 'Feature Education', intent: 'commercial', kwPrimary: ['zero gravity', 'feature', 'generic'], kwSecondary: ['best', 'comparison'], contentType: 'guide', link: 'buying-guide' },
  { num: 42, name: 'Full Body Massage Chair Buying Guide', cluster: 'Feature Education', intent: 'commercial', kwPrimary: ['full body', 'feature', 'generic'], kwSecondary: ['best', 'comparison'], contentType: 'guide', link: 'buying-guide' },
  { num: 43, name: 'Zero Gravity Massage Chair vs Zero Gravity Recliner', cluster: 'Comparison / VS', kwPrimary: ['zero gravity', 'recliner', 'comparison', 'generic'], kwSecondary: ['feature', 'best'] },
  { num: 44, name: '3D vs 4D Massage Chairs: What Is the Difference?', cluster: 'Feature Education', kwPrimary: ['3D', '4D', 'feature', 'technology', 'generic'], kwNotes: 'Focus on factual feature differences, avoid brand favoritism.' },
  { num: 45, name: 'SL Track vs L Track vs S Track Massage Chairs', cluster: 'Feature Education', kwPrimary: ['SL track', 'L track', 'S track', 'feature', 'technology', 'generic'] },
  { num: 46, name: 'Massage Chairs with Heat: What to Know Before Buying', cluster: 'Feature Education', kwPrimary: ['heat', 'heated', 'feature', 'generic'] },

  // ── Persona 8: Back, Neck & Daily Comfort Seeker (T47–T52) ──
  { num: 47, name: 'Best Massage Chairs for Back and Neck Comfort', cluster: 'Pain / Comfort / Relaxation', intent: 'commercial', kwPrimary: ['back comfort', 'neck comfort', 'comfort', 'generic'], image: 'customer-demo-realistic' },
  { num: 48, name: 'Best Massage Chairs for Daily Relaxation', cluster: 'Pain / Comfort / Relaxation', intent: 'commercial', kwPrimary: ['relaxation', 'daily use', 'comfort', 'generic'], image: 'lifestyle-home-visual' },
  { num: 49, name: 'How to Choose a Massage Chair for Daily Use', cluster: 'Pain / Comfort / Relaxation', intent: 'informational', kwPrimary: ['daily use', 'comfort', 'generic'], contentType: 'guide', link: 'buying-guide' },
  { num: 50, name: 'Best Massage Chairs for Lower Back Comfort', cluster: 'Pain / Comfort / Relaxation', intent: 'commercial', kwPrimary: ['lower back comfort', 'comfort', 'generic'], image: 'customer-demo-realistic' },
  { num: 51, name: 'Best Massage Chairs for Neck and Shoulder Comfort', cluster: 'Pain / Comfort / Relaxation', intent: 'commercial', kwPrimary: ['neck comfort', 'shoulder', 'comfort', 'generic'], image: 'customer-demo-realistic' },
  { num: 52, name: 'Massage Chair Features for Muscle Tension Relief', cluster: 'Pain / Comfort / Relaxation', intent: 'informational', kwPrimary: ['comfort', 'relaxation', 'recovery routine', 'feature', 'generic'], risk: 'medium', link: 'educational-page', image: 'feature-detail-realistic' },

  // ── Persona 9: Online vs Showroom Risk-Reduction Buyer (T53–T58) ──
  { num: 53, name: 'Should You Buy a Massage Chair Online or From a Showroom?', cluster: 'Price / Value', intent: 'informational', kwPrimary: ['online', 'showroom', 'value', 'generic'], kwSecondary: ['comparison', 'local'], link: 'showroom-page', image: 'showroom-realistic' },
  { num: 54, name: 'How to Avoid Buying the Wrong Massage Chair', cluster: 'Best / Buying Guide', intent: 'informational', kwPrimary: ['generic', 'buying guide'], kwSecondary: ['comparison', 'feature'], contentType: 'guide', link: 'buying-guide' },
  { num: 55, name: 'Questions to Ask Before Buying a Massage Chair', cluster: 'Best / Buying Guide', intent: 'informational', kwPrimary: ['generic', 'buying guide'], contentType: 'guide' },
  { num: 56, name: 'Massage Chair Warranty Guide', cluster: 'Warranty / Service' },
  { num: 57, name: 'Massage Chair Delivery and Installation Guide', cluster: 'Delivery / Space / Fit' },
  { num: 58, name: 'Massage Chair Size and Space Guide', cluster: 'Delivery / Space / Fit', kwPrimary: ['dimensions', 'space', 'fit', 'generic'] },

  // ── Persona 10: Premium Home Wellness / Executive Self-Care Buyer (T59–T64) ──
  { num: 59, name: 'Best Luxury Massage Chairs for Home', cluster: 'Lifestyle / Luxury', kwPrimary: ['luxury', 'premium', 'home', 'generic'], kwSecondary: ['brand', 'design', 'lifestyle'] },
  { num: 60, name: 'Are High-End Massage Chairs Worth It?', cluster: 'Lifestyle / Luxury', intent: 'informational', kwPrimary: ['luxury', 'premium', 'value', 'worth it', 'generic'], kwSecondary: ['price', 'comparison'] },
  { num: 61, name: 'Best Premium Massage Chair Brands', cluster: 'Lifestyle / Luxury', kwPrimary: ['premium', 'luxury', 'brand', 'generic'], kwSecondary: ['comparison', 'best'], contentType: 'guide', link: 'collection-page' },
  { num: 62, name: 'Massage Chairs for Home Wellness Rooms', cluster: 'Lifestyle / Luxury', kwPrimary: ['home', 'wellness', 'design', 'lifestyle', 'generic'], kwSecondary: ['luxury', 'premium'] },
  { num: 63, name: 'Best Massage Chairs for Executives and Busy Professionals', cluster: 'Lifestyle / Luxury', kwPrimary: ['executive', 'professional', 'premium', 'generic'], kwSecondary: ['luxury', 'lifestyle', 'comfort'] },
  { num: 64, name: 'Premium Zero Gravity Massage Chairs', cluster: 'Lifestyle / Luxury', kwPrimary: ['premium', 'luxury', 'zero gravity', 'generic'], kwSecondary: ['feature', 'best'] },
];

export const HOMC_CONTENT_TOPICS_V2: WorkspaceContentTopic[] = TOPIC_INPUTS.map(buildTopic);
