/**
 * HOMC Workspace Seed — House of Massage Chairs
 *
 * This file contains the default workspace configuration for the HOMC brand.
 * All HOMC-specific data (personas, topics, brand positioning) lives HERE,
 * scoped to the HOMC workspace only. Nothing in this file is global.
 */

import type { SEOWorkspace, WorkspacePersona, WorkspaceContentTopic, PlatformConfig } from '../workspaceTypes';
import { ALL_PLATFORMS } from '../workspaceTypes';
import { HOMC_SEED_KEYWORDS } from './homcKeywords.gen';
import { HOMC_CONTENT_TOPICS_V2 } from './homcTopics';

// ─── HOMC Workspace ID (stable so we can check if it already exists) ──────────

export const HOMC_WORKSPACE_ID = 'homc-default';

// ─── HOMC Personas ────────────────────────────────────────────────────────────

export const HOMC_PERSONAS: WorkspacePersona[] = [
  {
    id: 'homc-p01',
    name: 'Bay Area Try-Before-Buy Showroom Shopper',
    shortDescription: 'Actively searching for a nearby showroom to test massage chairs in person before buying. Prioritizes Pleasanton and San Jose locations.',
    intentStages: ['consideration', 'decision'],
    defaultCTA: 'Book a showroom visit',
    claimRiskLevel: 'low',
    recommendedTone: 'Welcoming, local-focused, confidence-building',
    allowedTopicIds: [],
  },
  {
    id: 'homc-p02',
    name: 'AI Best Massage Chair Recommendation Seeker',
    shortDescription: 'Searching "best massage chair" or "which massage chair should I buy" queries. Expects curated, expert-level recommendation content.',
    intentStages: ['awareness', 'consideration'],
    defaultCTA: 'Compare chairs at our showroom',
    claimRiskLevel: 'low',
    recommendedTone: 'Expert, authoritative, recommendation-focused',
    allowedTopicIds: [],
  },
  {
    id: 'homc-p03',
    name: 'Brand Comparison Researcher',
    shortDescription: 'Actively comparing brands (Osaki vs Ogawa, Cozzia vs Infinity, etc.). Wants clear side-by-side differences and expert validation.',
    intentStages: ['consideration', 'decision'],
    defaultCTA: 'Compare these chairs in person',
    claimRiskLevel: 'low',
    recommendedTone: 'Objective, comparison-driven, data-informed',
    allowedTopicIds: [],
  },
  {
    id: 'homc-p04',
    name: 'Osaki High-Intent Buyer',
    shortDescription: 'Specifically interested in Osaki massage chairs. Looking for model reviews, price comparisons, and showroom availability.',
    intentStages: ['consideration', 'decision'],
    defaultCTA: 'Try Osaki models at our showroom',
    claimRiskLevel: 'low',
    recommendedTone: 'Brand-aware, feature-focused, showroom-oriented',
    allowedTopicIds: [],
  },
  {
    id: 'homc-p05',
    name: 'High-Intent Brand & Model Review Buyer',
    shortDescription: 'Researching specific brands and models (Bodyfriend, Kyota, Ogawa, Infinity, Cozzia, Fujiiryoki). Close to purchase, needs expert validation.',
    intentStages: ['consideration', 'decision'],
    defaultCTA: 'Try this model at our showroom',
    claimRiskLevel: 'low',
    recommendedTone: 'Expert, review-focused, brand-respectful',
    allowedTopicIds: [],
  },
  {
    id: 'homc-p06',
    name: 'Price, Value & Financing Evaluator',
    shortDescription: 'Evaluating price, value, and financing options. Not looking for cheap — looking to avoid making the wrong investment.',
    intentStages: ['consideration', 'decision'],
    defaultCTA: 'Speak with a specialist',
    claimRiskLevel: 'low',
    recommendedTone: 'Transparent, value-focused, non-defensive',
    allowedTopicIds: [],
  },
  {
    id: 'homc-p07',
    name: 'Zero Gravity & Full-Body Feature Shopper',
    shortDescription: 'Searching by feature: zero gravity, full body, 3D/4D, track type, heat. Wants to understand which features matter for their needs.',
    intentStages: ['awareness', 'consideration'],
    defaultCTA: 'Experience these features in person',
    claimRiskLevel: 'low',
    recommendedTone: 'Educational, feature-focused, practical',
    allowedTopicIds: [],
  },
  {
    id: 'homc-p08',
    name: 'Back, Neck & Daily Comfort Seeker',
    shortDescription: 'Motivated by back comfort, neck tension, or daily relaxation needs. Seeking a daily-use wellness tool for home.',
    intentStages: ['awareness', 'consideration'],
    defaultCTA: 'Book a showroom visit',
    claimRiskLevel: 'medium',
    recommendedTone: 'Empathetic, wellness-focused, compliance-safe',
    allowedTopicIds: [],
  },
  {
    id: 'homc-p09',
    name: 'Online vs Showroom Risk-Reduction Buyer',
    shortDescription: 'Concerned about buying the wrong chair. Evaluating online vs showroom, warranty, delivery, and overall purchase risk.',
    intentStages: ['consideration', 'decision'],
    defaultCTA: 'Visit our showroom for clarity',
    claimRiskLevel: 'low',
    recommendedTone: 'Trust-building, transparent, risk-reducing',
    allowedTopicIds: [],
  },
  {
    id: 'homc-p10',
    name: 'Premium Home Wellness / Executive Self-Care Buyer',
    shortDescription: 'High-income professional investing in premium home wellness. Sees a massage chair as part of a curated self-care routine.',
    intentStages: ['consideration', 'decision'],
    defaultCTA: 'Visit our showroom',
    claimRiskLevel: 'low',
    recommendedTone: 'Premium, refined, lifestyle-oriented',
    allowedTopicIds: [],
  },
];

// ─── HOMC Content Topics ──────────────────────────────────────────────────────
// All 64 topics are defined in ./homcTopics.ts with full operations metadata.
// Re-exported here for backward compatibility.

export const HOMC_CONTENT_TOPICS: WorkspaceContentTopic[] = HOMC_CONTENT_TOPICS_V2;

// ─── HOMC Platform Configuration ──────────────────────────────────────────────

function homcPlatforms(): PlatformConfig[] {
  const enabled = new Set(['website-blog', 'landing-page', 'shopify-page', 'instagram', 'facebook', 'youtube', 'google-business']);
  return ALL_PLATFORMS.map((p) => ({ platform: p, enabled: enabled.has(p) }));
}

// ─── HOMC Workspace Seed ──────────────────────────────────────────────────────

export function buildHOMCWorkspace(): Omit<SEOWorkspace, 'createdAt' | 'updatedAt'> {
  return {
    id: HOMC_WORKSPACE_ID,

    // Brand Identity
    clientName: 'House of Massage Chairs',
    brandName: 'House of Massage Chairs',
    websiteUrl: 'https://houseofmassagechairs.com/',
    industry: 'Premium massage chairs, home wellness, luxury relaxation, showroom retail, multi-brand authorized dealer',
    businessType: 'B2C',
    targetCountries: ['United States'],
    targetMarket: 'San Jose / Pleasanton / Bay Area / Northern California high-ticket buyers researching premium massage chairs, in-person showroom comparison, multi-brand demos, and purchase-confidence-driven buying.',

    // Voice & Style
    toneOfVoice: 'Clear, premium, expert, calm, practical, trust-building, non-pushy',
    articleStyle: 'Expert guide style — structured, scannable, comparison-heavy, FAQ-rich, showroom-action-oriented',

    // Business
    coreOffer: 'Premium massage chairs from 9+ global brands (Osaki, Bodyfriend, Kyota, Ogawa, Infinity, Cozzia, Fujiiryoki, JP Medics, Svago), in-person showroom comparison at Pleasanton and San Jose locations, expert guidance for high-ticket purchase decisions',
    conversionGoals: 'Showroom visits, demo bookings, phone consultations, direct purchases',
    primaryCTA: 'Book a showroom visit | Compare chairs in person | Speak with a specialist | Try before you buy | Get directions to showroom',
    brandDifferentiators: [
      'Largest massage chair showroom in the Bay Area — 35+ models on display',
      'Authorized dealer for 9 world-class massage chair brands',
      'Two convenient showroom locations: Pleasanton and San Jose (Westfield Oakridge Mall)',
      'Expert-guided, zero-pressure showroom experience',
      'Side-by-side brand and model comparison under one roof',
      'Body-fit matching — finding the right chair for your body, space, and preferences',
      'Premium ownership support: white-glove delivery, setup, warranty, and in-house service',
      'Risk reduction through in-person testing — feel the difference before you commit',
      'Curated selection focused on quality over quantity',
      'Bay Area\'s trusted local massage chair destination',
    ].join(' · '),
    complianceNotes: [
      'Avoid medical claims — do not say massage chairs cure, treat, fix, heal, or eliminate medical conditions.',
      'Use safer wording: relaxation, comfort, daily recovery routine, stress reset, muscle tension relief, better rest routine, wellness support, purchase confidence.',
      'For health-sensitive content, suggest consulting a physician where appropriate.',
    ].join('\n'),

    // Keywords — pre-loaded from HCM Keywords List CSV (1003 keywords)
    keywordList: HOMC_SEED_KEYWORDS,
    keywordListUploadedAt: '2026-04-26T00:00:00Z',
    keywordListVersion: 1,
    keywordVersions: [{ versionId: '1', workspaceId: 'homc-workspace', fileName: 'HCM Keywords List.csv', keywordCount: HOMC_SEED_KEYWORDS.length, activeKeywordCount: HOMC_SEED_KEYWORDS.length, archivedKeywordCount: 0, uploadedAt: '2026-04-26T00:00:00Z', status: 'active' as const }],

    // Sitemap
    sitemapUrl: 'https://houseofmassagechairs.com/sitemap.xml',
    sitemapStatus: 'idle',
    sitemapLastCheckedAt: null,
    sitemapError: null,
    discoveredPages: [],
    sitemapPages: [],

    // Assets
    assets: [],

    // Platforms
    platforms: homcPlatforms(),

    // Libraries
    personas: HOMC_PERSONAS,
    contentTopics: HOMC_CONTENT_TOPICS_V2,

    // Content
    projectIds: [],
    contentEntries: [],
    generatedContent: [],
  };
}
