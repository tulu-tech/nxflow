/**
 * MCM Content Topics — 60 workspace-scoped topics for Massage Chairs and More
 *
 * These topics belong ONLY to the MCM workspace. They are NOT global.
 * They will control: persona-to-topic filtering, keyword selection,
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
    defaultCTA: 'Visit showroom',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'landing-page', 'google-business', 'facebook'],
    linkIntent: 'showroom-page',
    imageIntent: 'local-showroom-visual',
    kwLogic: { primaryTags: ['local', 'generic', 'showroom', 'store', 'near-me', 'city', 'Bay Area', 'NorCal'], secondaryTags: ['generic', 'showroom'] },
  },
  'Best / Buying Guide': {
    defaultSearchIntent: 'commercial',
    defaultContentType: 'guide',
    defaultCTA: 'Compare chairs in person',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'landing-page', 'shopify-page', 'youtube'],
    linkIntent: 'buying-guide',
    imageIntent: 'product-realistic',
    kwLogic: { primaryTags: ['generic'], secondaryTags: ['feature', 'comparison', 'price', 'local', 'luxury', 'warranty'] },
  },
  'Comparison / VS': {
    defaultSearchIntent: 'commercial',
    defaultContentType: 'comparison-page',
    defaultCTA: 'Compare chairs in person',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'shopify-page', 'youtube'],
    linkIntent: 'comparison-page',
    imageIntent: 'comparison-visual',
    kwLogic: { primaryTags: ['comparison', 'vs', 'compare', 'brand', 'model'], secondaryTags: ['review', 'best'] },
  },
  'Brand / Model Review': {
    defaultSearchIntent: 'commercial',
    defaultContentType: 'review-page',
    defaultCTA: 'Visit showroom',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'shopify-page', 'youtube', 'instagram'],
    linkIntent: 'product-page',
    imageIntent: 'product-realistic',
    kwLogic: { primaryTags: ['brand', 'model'], secondaryTags: ['review', 'best', 'feature'] },
  },
  'Price / Value': {
    defaultSearchIntent: 'commercial',
    defaultContentType: 'guide',
    defaultCTA: 'Call for expert guidance',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'shopify-page', 'youtube'],
    linkIntent: 'buying-guide',
    imageIntent: 'infographic-style',
    kwLogic: { primaryTags: ['price', 'cost', 'budget', 'value', 'worth it', 'sale', 'deal', 'generic'], secondaryTags: ['comparison', 'best'] },
  },
  'Warranty / Service': {
    defaultSearchIntent: 'informational',
    defaultContentType: 'guide',
    defaultCTA: 'Ask about warranty/service',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'google-business'],
    linkIntent: 'warranty-service-page',
    imageIntent: 'warranty-service-visual',
    kwLogic: { primaryTags: ['warranty', 'service', 'repair', 'ownership', 'authorized retailer'], secondaryTags: ['generic', 'brand'] },
  },
  'Delivery / Space / Fit': {
    defaultSearchIntent: 'informational',
    defaultContentType: 'guide',
    defaultCTA: 'Check delivery/space fit',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'shopify-page'],
    linkIntent: 'delivery-fit-page',
    imageIntent: 'delivery-fit-visual',
    kwLogic: { primaryTags: ['delivery', 'installation', 'dimensions', 'space', 'wall hugger', 'fit'], secondaryTags: ['generic'] },
  },
  'Pain / Comfort / Relaxation': {
    defaultSearchIntent: 'informational',
    defaultContentType: 'blog-post',
    defaultCTA: 'Book a demo',
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
    defaultCTA: 'Visit showroom',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'youtube', 'instagram'],
    linkIntent: 'educational-page',
    imageIntent: 'feature-detail-realistic',
    kwLogic: { primaryTags: ['feature', 'technology', 'generic'], secondaryTags: ['comparison', 'best', 'brand'] },
  },
  'AI Search / Answer Engine': {
    defaultSearchIntent: 'informational',
    defaultContentType: 'faq-page',
    defaultCTA: 'Visit showroom',
    claimRiskLevel: 'low',
    platforms: ['website-blog', 'google-business'],
    linkIntent: 'educational-page',
    imageIntent: 'product-realistic',
    kwLogic: { primaryTags: ['brand', 'model', 'generic', 'feature'], secondaryTags: ['comparison', 'review', 'best', 'local'] },
  },
  'Lifestyle / Luxury': {
    defaultSearchIntent: 'commercial',
    defaultContentType: 'blog-post',
    defaultCTA: 'Visit showroom',
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
  const id = `mcm-t${String(t.num).padStart(2, '0')}`;
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

// ─── MCM 60 Content Topics ───────────────────────────────────────────────────

const TOPIC_INPUTS: TopicInput[] = [
  // ── Local / Showroom (T01–T08) ──
  { num: 1, name: 'Massage Chair Store Near Me', cluster: 'Local / Showroom' },
  { num: 2, name: 'Massage Chair Showroom Near Me', cluster: 'Local / Showroom' },
  { num: 3, name: 'Where to Try Massage Chairs Before Buying', cluster: 'Local / Showroom', intent: 'informational' },
  { num: 4, name: 'Best Massage Chair Store in the Bay Area', cluster: 'Local / Showroom', kwPrimary: ['local', 'Bay Area', 'showroom', 'store', 'best'] },
  { num: 5, name: 'Massage Chair Store in Santa Clara', cluster: 'Local / Showroom', kwPrimary: ['local', 'city', 'Santa Clara', 'showroom', 'store'] },
  { num: 6, name: 'Massage Chair Store in Walnut Creek', cluster: 'Local / Showroom', kwPrimary: ['local', 'city', 'Walnut Creek', 'showroom', 'store'] },
  { num: 7, name: 'Massage Chair Store in Roseville / NorCal', cluster: 'Local / Showroom', kwPrimary: ['local', 'city', 'Roseville', 'NorCal', 'showroom', 'store'] },
  { num: 8, name: 'Why Buy From a Massage Chair Showroom Instead of Online?', cluster: 'Local / Showroom', intent: 'informational', contentType: 'blog-post', link: 'showroom-page', image: 'showroom-realistic' },

  // ── Best / Buying Guide (T09–T13) ──
  { num: 9, name: 'Best Massage Chairs Compared', cluster: 'Best / Buying Guide', contentType: 'comparison-page', link: 'collection-page', image: 'comparison-visual' },
  { num: 10, name: 'Best Massage Chair for Home Use', cluster: 'Best / Buying Guide', image: 'lifestyle-home-visual' },
  { num: 11, name: 'Best Full Body Massage Chair', cluster: 'Best / Buying Guide' },
  { num: 12, name: 'Best Zero Gravity Massage Chair', cluster: 'Best / Buying Guide', kwPrimary: ['generic', 'zero gravity'], kwSecondary: ['feature', 'comparison', 'best'] },
  { num: 13, name: 'Best Luxury Massage Chair', cluster: 'Best / Buying Guide', kwPrimary: ['generic', 'luxury'], kwSecondary: ['brand', 'comparison', 'price', 'premium'], image: 'lifestyle-home-visual' },

  // ── Brand / Model Review: Brand comparison label (T14) ──
  { num: 14, name: 'Best Massage Chair Brands', cluster: 'Best / Buying Guide', contentType: 'guide', link: 'collection-page' },

  // ── Comparison / VS (T15–T20) ──
  { num: 15, name: 'OHCO vs Panasonic Massage Chairs', cluster: 'Comparison / VS', brand: 'OHCO, Panasonic', kwPrimary: ['OHCO', 'Panasonic', 'vs', 'comparison'], kwSecondary: ['review', 'best', 'brand'] },
  { num: 16, name: 'Panasonic MAN1 vs OHCO M8 NEO', cluster: 'Comparison / VS', brand: 'Panasonic MAN1, OHCO M8 NEO', kwPrimary: ['Panasonic', 'MAN1', 'OHCO', 'M8 NEO', 'vs'], kwSecondary: ['review', 'comparison'] },
  { num: 17, name: 'Positive Posture vs Panasonic Massage Chairs', cluster: 'Comparison / VS', brand: 'Positive Posture, Panasonic', kwPrimary: ['Positive Posture', 'Panasonic', 'vs', 'comparison'], kwSecondary: ['review', 'best'] },
  { num: 18, name: 'Positive Posture DualTech Pro AI vs DualTech 4D Dual', cluster: 'Comparison / VS', brand: 'Positive Posture DualTech Pro AI, Positive Posture DualTech 4D Dual', kwPrimary: ['Positive Posture', 'DualTech', 'vs', 'comparison'], kwSecondary: ['review', 'feature'] },
  { num: 19, name: 'Panasonic MAN1 vs Panasonic MAF1', cluster: 'Comparison / VS', brand: 'Panasonic MAN1, Panasonic MAF1', kwPrimary: ['Panasonic', 'MAN1', 'MAF1', 'vs'], kwSecondary: ['review', 'comparison'] },
  { num: 20, name: 'D.Core vs OHCO Massage Chairs', cluster: 'Comparison / VS', brand: 'D.Core, OHCO', kwPrimary: ['D.Core', 'OHCO', 'vs', 'comparison'], kwSecondary: ['review', 'best', 'brand'] },

  // ── Brand / Model Review (T21–T29) ──
  { num: 21, name: 'OHCO M8 NEO Review', cluster: 'Brand / Model Review', brand: 'OHCO M8 NEO', kwPrimary: ['OHCO', 'M8 NEO', 'M8'], kwSecondary: ['review', 'best', 'feature'] },
  { num: 22, name: 'OHCO M8 NEO LE Review', cluster: 'Brand / Model Review', brand: 'OHCO M8 NEO LE', kwPrimary: ['OHCO', 'M8 NEO LE', 'M8'], kwSecondary: ['review', 'best', 'feature'] },
  { num: 23, name: 'Panasonic MAN1 Review', cluster: 'Brand / Model Review', brand: 'Panasonic MAN1', kwPrimary: ['Panasonic', 'MAN1'], kwSecondary: ['review', 'feature', 'best'] },
  { num: 24, name: 'Panasonic MAF1 Review', cluster: 'Brand / Model Review', brand: 'Panasonic MAF1', kwPrimary: ['Panasonic', 'MAF1'], kwSecondary: ['review', 'feature', 'best'] },
  { num: 25, name: 'Positive Posture DualTech Pro AI Review', cluster: 'Brand / Model Review', brand: 'Positive Posture DualTech Pro AI', kwPrimary: ['Positive Posture', 'DualTech'], kwSecondary: ['review', 'feature', 'best'] },
  { num: 26, name: 'Positive Posture DualTech 4D Dual Review', cluster: 'Brand / Model Review', brand: 'Positive Posture DualTech 4D Dual', kwPrimary: ['Positive Posture', 'DualTech', '4D'], kwSecondary: ['review', 'feature'] },
  { num: 27, name: 'Positive Posture Brio+ Review', cluster: 'Brand / Model Review', brand: 'Positive Posture Brio+', kwPrimary: ['Positive Posture', 'Brio+', 'Brio'], kwSecondary: ['review', 'feature'] },
  { num: 28, name: 'D.Core 2 Review', cluster: 'Brand / Model Review', brand: 'D.Core 2', kwPrimary: ['D.Core'], kwSecondary: ['review', 'feature', 'best'] },
  { num: 29, name: 'KOYO 303TS Review', cluster: 'Brand / Model Review', brand: 'KOYO 303TS', kwPrimary: ['KOYO', '303TS'], kwSecondary: ['review', 'feature', 'best'] },

  // ── Price / Value (T30–T35) ──
  { num: 30, name: 'Massage Chair Price Guide', cluster: 'Price / Value' },
  { num: 31, name: 'How Much Does a Massage Chair Cost?', cluster: 'Price / Value', intent: 'informational' },
  { num: 32, name: 'Best Massage Chairs by Budget', cluster: 'Price / Value', contentType: 'comparison-page', link: 'collection-page', image: 'comparison-visual' },
  { num: 33, name: 'Are Expensive Massage Chairs Worth It?', cluster: 'Price / Value', intent: 'informational' },
  { num: 34, name: 'Online vs Showroom Massage Chair Purchase', cluster: 'Price / Value', kwPrimary: ['price', 'value', 'online', 'showroom', 'generic'], kwSecondary: ['comparison', 'local'], link: 'showroom-page', image: 'showroom-realistic' },
  { num: 35, name: 'Costco Massage Chair vs Specialty Showroom', cluster: 'Price / Value', kwPrimary: ['price', 'value', 'Costco', 'showroom', 'generic'], kwSecondary: ['comparison'], image: 'comparison-visual' },

  // ── Warranty / Service (T36–T38) ──
  { num: 36, name: 'Massage Chair Warranty Guide', cluster: 'Warranty / Service' },
  { num: 37, name: 'Massage Chair Service and Repair Guide', cluster: 'Warranty / Service' },
  { num: 38, name: 'What Happens After You Buy a Massage Chair?', cluster: 'Warranty / Service', intent: 'informational', contentType: 'blog-post' },

  // ── Delivery / Space / Fit (T39–T41) ──
  { num: 39, name: 'Massage Chair Dimensions Guide', cluster: 'Delivery / Space / Fit' },
  { num: 40, name: 'How Much Space Does a Massage Chair Need?', cluster: 'Delivery / Space / Fit', intent: 'informational' },
  { num: 41, name: 'Massage Chair Delivery and Installation Guide', cluster: 'Delivery / Space / Fit' },

  // ── Pain / Comfort / Relaxation (T42–T45) ──
  { num: 42, name: 'Best Massage Chair for Back Comfort', cluster: 'Pain / Comfort / Relaxation', intent: 'commercial', kwPrimary: ['back comfort', 'comfort', 'relaxation', 'generic'], image: 'customer-demo-realistic' },
  { num: 43, name: 'Best Massage Chair for Neck and Shoulders', cluster: 'Pain / Comfort / Relaxation', intent: 'commercial', kwPrimary: ['neck comfort', 'comfort', 'relaxation', 'generic'], image: 'customer-demo-realistic' },
  { num: 44, name: 'Best Massage Chair for Lower Back Comfort', cluster: 'Pain / Comfort / Relaxation', intent: 'commercial', kwPrimary: ['lower back comfort', 'comfort', 'relaxation', 'generic'], image: 'customer-demo-realistic' },
  { num: 45, name: 'Best Massage Chair for Tired Legs and Feet', cluster: 'Pain / Comfort / Relaxation', intent: 'commercial', kwPrimary: ['tired legs', 'comfort', 'recovery routine', 'full body', 'generic'], image: 'customer-demo-realistic' },

  // ── Feature Education (T46–T49) ──
  { num: 46, name: 'Zero Gravity Massage Chairs Explained', cluster: 'Feature Education', kwPrimary: ['zero gravity', 'feature', 'technology', 'generic'] },
  { num: 47, name: '4D Massage Chairs Explained', cluster: 'Feature Education', kwPrimary: ['4D', 'feature', 'technology', 'generic'] },
  { num: 48, name: 'AI Massage Chairs Explained Without the Hype', cluster: 'Feature Education', kwPrimary: ['AI', 'feature', 'technology', 'generic'], kwNotes: 'Focus on factual features, avoid overpromising AI capabilities.' },
  { num: 49, name: 'Full Body Massage Chairs Explained', cluster: 'Feature Education', kwPrimary: ['full body', 'feature', 'technology', 'generic'] },

  // ── AI Search / Answer Engine (T50–T57) ──
  { num: 50, name: 'Where Can I Buy Authentic D.Core Massage Chairs?', cluster: 'AI Search / Answer Engine', brand: 'D.Core', kwPrimary: ['D.Core', 'brand', 'generic'], kwSecondary: ['local', 'showroom', 'authorized retailer'], link: 'product-page', cta: 'Visit showroom' },
  { num: 51, name: 'Where Is the Best Place to Buy Panasonic Massage Chairs?', cluster: 'AI Search / Answer Engine', brand: 'Panasonic', kwPrimary: ['Panasonic', 'brand', 'generic'], kwSecondary: ['local', 'showroom', 'authorized retailer'], link: 'product-page', cta: 'Visit showroom' },
  { num: 52, name: 'Where Can I Buy OHCO M8 Massage Chairs?', cluster: 'AI Search / Answer Engine', brand: 'OHCO', kwPrimary: ['OHCO', 'M8', 'brand', 'generic'], kwSecondary: ['local', 'showroom', 'authorized retailer'], link: 'product-page', cta: 'Visit showroom' },
  { num: 53, name: 'What Should I Consider Before Buying a KOYO Massage Chair?', cluster: 'AI Search / Answer Engine', brand: 'KOYO', kwPrimary: ['KOYO', 'brand', 'generic'], kwSecondary: ['feature', 'review', 'comparison'], link: 'buying-guide' },
  { num: 54, name: 'Are OHCO Massage Chairs Good?', cluster: 'AI Search / Answer Engine', brand: 'OHCO', kwPrimary: ['OHCO', 'brand', 'review'], kwSecondary: ['best', 'comparison', 'feature'] },
  { num: 55, name: 'How Do D.Core Massage Chairs Compare to Other Brands?', cluster: 'AI Search / Answer Engine', brand: 'D.Core', kwPrimary: ['D.Core', 'comparison', 'brand'], kwSecondary: ['review', 'best', 'vs'], link: 'comparison-page', image: 'comparison-visual' },
  { num: 56, name: 'What Are the Main Features of Panasonic MAN1?', cluster: 'AI Search / Answer Engine', brand: 'Panasonic MAN1', kwPrimary: ['Panasonic', 'MAN1', 'feature', 'model'], kwSecondary: ['review'], link: 'product-page', image: 'feature-detail-realistic' },
  { num: 57, name: 'What Are the Main Features of OHCO M8 NEO?', cluster: 'AI Search / Answer Engine', brand: 'OHCO M8 NEO', kwPrimary: ['OHCO', 'M8 NEO', 'M8', 'feature', 'model'], kwSecondary: ['review'], link: 'product-page', image: 'feature-detail-realistic' },

  // ── Lifestyle / Luxury (T58–T60) ──
  { num: 58, name: 'Japanese Luxury Massage Chairs Explained', cluster: 'Lifestyle / Luxury', kwPrimary: ['luxury', 'Japanese', 'premium', 'generic'], kwSecondary: ['brand', 'feature', 'quality'] },
  { num: 59, name: 'Best Luxury Massage Chairs for Modern Homes', cluster: 'Lifestyle / Luxury', kwPrimary: ['luxury', 'home', 'design', 'premium', 'generic'], kwSecondary: ['brand', 'lifestyle'] },
  { num: 60, name: 'Is a Massage Chair a Good Home Wellness Investment?', cluster: 'Lifestyle / Luxury', intent: 'informational', kwPrimary: ['generic', 'value', 'wellness', 'investment', 'lifestyle'], kwSecondary: ['price', 'comfort'] },
];

export const MCM_CONTENT_TOPICS_V2: WorkspaceContentTopic[] = TOPIC_INPUTS.map(buildTopic);
