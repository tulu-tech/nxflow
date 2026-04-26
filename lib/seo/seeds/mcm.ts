/**
 * MCM Workspace Seed — Massage Chairs and More
 *
 * This file contains the default workspace configuration for the MCM brand.
 * All MCM-specific data (personas, topics, brand positioning) lives HERE,
 * scoped to the MCM workspace only. Nothing in this file is global.
 */

import type { SEOWorkspace, WorkspacePersona, WorkspaceContentTopic, PlatformConfig } from '../workspaceTypes';
import { ALL_PLATFORMS } from '../workspaceTypes';
import { MCM_CONTENT_TOPICS_V2 } from './mcmTopics';

// ─── MCM Workspace ID (stable so we can check if it already exists) ──────────

export const MCM_WORKSPACE_ID = 'mcm-default';

// ─── MCM Personas ────────────────────────────────────────────────────────────

export const MCM_PERSONAS: WorkspacePersona[] = [
  {
    id: 'mcm-p01',
    name: 'Local Demo Seeker',
    shortDescription: 'Actively searching for a nearby showroom to test massage chairs in person before buying.',
    intentStages: ['consideration', 'decision'],
    defaultCTA: 'Book a demo',
    claimRiskLevel: 'low',
    recommendedTone: 'Welcoming, informative, low-pressure',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p02',
    name: 'Final-Decision Comparer',
    shortDescription: 'Has narrowed down to 2–3 models. Needs side-by-side comparison and expert validation to commit.',
    intentStages: ['decision'],
    defaultCTA: 'Compare chairs in person',
    claimRiskLevel: 'low',
    recommendedTone: 'Expert, precise, data-driven',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p03',
    name: 'Online-Price Cross-Shopper',
    shortDescription: 'Comparing prices across Amazon, Costco, and brand sites. Needs to understand why showroom value justifies the price.',
    intentStages: ['consideration', 'decision'],
    defaultCTA: 'Call for expert guidance',
    claimRiskLevel: 'low',
    recommendedTone: 'Transparent, value-focused, non-defensive',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p04',
    name: 'Fit & Space Certainty Buyer',
    shortDescription: 'Worried about chair dimensions, room fit, doorway clearance, and wall clearance. Needs spatial confidence.',
    intentStages: ['consideration', 'decision'],
    defaultCTA: 'Check delivery/space fit',
    claimRiskLevel: 'low',
    recommendedTone: 'Practical, detail-oriented, reassuring',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p05',
    name: 'Warranty & Service Confidence Buyer',
    shortDescription: 'Concerned about what happens after purchase — warranty coverage, parts, labor, local service availability.',
    intentStages: ['decision'],
    defaultCTA: 'Ask about warranty/service',
    claimRiskLevel: 'low',
    recommendedTone: 'Trust-building, transparent, specific',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p06',
    name: 'Spouse / Household Approval Buyer',
    shortDescription: 'Interested but needs to justify the purchase to a partner or household. Needs ROI and lifestyle framing.',
    intentStages: ['consideration'],
    defaultCTA: 'Visit showroom together',
    claimRiskLevel: 'low',
    recommendedTone: 'Relatable, practical, value-proving',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p07',
    name: 'Pain & Tension Comfort Seeker',
    shortDescription: 'Motivated by back pain, neck tension, or daily stress. Seeking relief at home without ongoing massage appointments.',
    intentStages: ['awareness', 'consideration'],
    defaultCTA: 'Book a demo',
    claimRiskLevel: 'high',
    recommendedTone: 'Empathetic, wellness-focused, compliance-safe',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p08',
    name: 'Practical Premium Value Buyer',
    shortDescription: 'Wants the best value in the $3K–$6K range. Quality matters but not interested in paying flagship prices.',
    intentStages: ['consideration', 'decision'],
    defaultCTA: 'Compare models',
    claimRiskLevel: 'low',
    recommendedTone: 'Honest, value-driven, comparison-focused',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p09',
    name: 'Premium Wellness Executive',
    shortDescription: 'High-income professional investing in personal wellness. Sees a massage chair as part of a premium self-care routine.',
    intentStages: ['consideration', 'decision'],
    defaultCTA: 'Visit showroom',
    claimRiskLevel: 'medium',
    recommendedTone: 'Premium, refined, results-oriented',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p10',
    name: 'Luxury Home Design Buyer',
    shortDescription: 'Buying a massage chair as a design piece for a home theater, living room, or dedicated wellness space. Aesthetics are critical.',
    intentStages: ['consideration'],
    defaultCTA: 'Visit showroom',
    claimRiskLevel: 'low',
    recommendedTone: 'Design-forward, aspirational, curated',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p11',
    name: 'High-Income Empty Nester',
    shortDescription: 'Kids have left home. Investing in comfort and lifestyle upgrades. Has the budget and space for a premium chair.',
    intentStages: ['awareness', 'consideration'],
    defaultCTA: 'Book a demo',
    claimRiskLevel: 'medium',
    recommendedTone: 'Warm, lifestyle-focused, premium',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p12',
    name: 'Home Office Decompression Buyer',
    shortDescription: 'Remote/hybrid worker dealing with desk fatigue. Wants a daily recovery tool, not a luxury splurge.',
    intentStages: ['awareness', 'consideration'],
    defaultCTA: 'Compare models',
    claimRiskLevel: 'medium',
    recommendedTone: 'Practical, productivity-aware, relatable',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p13',
    name: 'Panasonic Engineering Trust Buyer',
    shortDescription: 'Specifically interested in Panasonic/Japanese-engineered chairs. Values precision engineering, brand heritage, and reliability.',
    intentStages: ['consideration', 'decision'],
    defaultCTA: 'Visit showroom',
    claimRiskLevel: 'low',
    recommendedTone: 'Technical, brand-respectful, heritage-aware',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p14',
    name: 'OHCO Craftsmanship & Escape Buyer',
    shortDescription: 'Drawn to OHCO\'s artisan design, immersive experience, and escape-pod aesthetic. Willing to invest at flagship level.',
    intentStages: ['consideration', 'decision'],
    defaultCTA: 'Visit showroom',
    claimRiskLevel: 'low',
    recommendedTone: 'Artisan, experiential, premium storytelling',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p15',
    name: 'Positive Posture Feature-Value Buyer',
    shortDescription: 'Exploring Positive Posture chairs for their clinical focus, customizable programs, and mid-to-high value positioning.',
    intentStages: ['consideration'],
    defaultCTA: 'Compare models',
    claimRiskLevel: 'medium',
    recommendedTone: 'Feature-focused, practical, wellness-aware',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p16',
    name: 'D.Core Quiet Luxury Buyer',
    shortDescription: 'Attracted to D.Core\'s modern design language, quiet operation, and understated luxury positioning.',
    intentStages: ['consideration'],
    defaultCTA: 'Visit showroom',
    claimRiskLevel: 'low',
    recommendedTone: 'Minimal, design-conscious, modern',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p17',
    name: 'KOYO Japanese Value-Premium Buyer',
    shortDescription: 'Interested in KOYO for Japanese quality at a more accessible premium price point. Values craftsmanship without flagship pricing.',
    intentStages: ['consideration', 'decision'],
    defaultCTA: 'Compare models',
    claimRiskLevel: 'low',
    recommendedTone: 'Heritage-aware, value-conscious, quality-focused',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p18',
    name: 'Recovery-Focused Athlete',
    shortDescription: 'Uses massage for post-workout recovery, muscle soreness, and performance optimization. Interested in deep tissue and stretching features.',
    intentStages: ['awareness', 'consideration'],
    defaultCTA: 'Book a demo',
    claimRiskLevel: 'high',
    recommendedTone: 'Performance-oriented, evidence-aware, compliance-safe',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p19',
    name: 'Senior Comfort & Safety Planner',
    shortDescription: 'Buying for a senior family member or themselves. Prioritizes ease of use, gentle modes, safe entry/exit, and simple controls.',
    intentStages: ['consideration', 'decision'],
    defaultCTA: 'Call for expert guidance',
    claimRiskLevel: 'high',
    recommendedTone: 'Caring, accessibility-focused, patient',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p20',
    name: 'Gift-for-Parent / Family Wellness Buyer',
    shortDescription: 'Buying a massage chair as a gift for a parent, spouse, or family member. Needs help choosing without the recipient testing.',
    intentStages: ['consideration'],
    defaultCTA: 'Call for expert guidance',
    claimRiskLevel: 'low',
    recommendedTone: 'Warm, helpful, gift-framing',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p21',
    name: 'AI / Advanced Technology Explorer',
    shortDescription: 'Excited by AI body scanning, voice control, app integration, and cutting-edge massage technology. Early adopter mindset.',
    intentStages: ['awareness', 'consideration'],
    defaultCTA: 'Visit showroom',
    claimRiskLevel: 'low',
    recommendedTone: 'Tech-forward, innovative, feature-rich',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p22',
    name: 'First-Time Massage Chair Buyer',
    shortDescription: 'Has never owned a massage chair. Overwhelmed by options and price ranges. Needs confidence and education.',
    intentStages: ['awareness', 'consideration'],
    defaultCTA: 'Visit showroom',
    claimRiskLevel: 'low',
    recommendedTone: 'Educational, patient, trust-building',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p23',
    name: 'Foot / Calf Relief Seeker',
    shortDescription: 'Specifically interested in foot and calf massage features — foot rollers, air compression, reflexology. May also consider standalone foot massagers.',
    intentStages: ['awareness', 'consideration'],
    defaultCTA: 'Compare models',
    claimRiskLevel: 'medium',
    recommendedTone: 'Specific, feature-focused, comfort-framing',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p24',
    name: 'Compact Home / Apartment Buyer',
    shortDescription: 'Lives in a smaller home, apartment, or condo. Needs a space-efficient chair that doesn\'t dominate the room.',
    intentStages: ['consideration'],
    defaultCTA: 'Check delivery/space fit',
    claimRiskLevel: 'low',
    recommendedTone: 'Practical, space-aware, solution-oriented',
    allowedTopicIds: [],
  },
  {
    id: 'mcm-p25',
    name: 'Post-Demo Follow-Up Buyer',
    shortDescription: 'Has already visited the showroom and tested chairs. Now researching online before making a final decision.',
    intentStages: ['decision'],
    defaultCTA: 'Call for expert guidance',
    claimRiskLevel: 'low',
    recommendedTone: 'Confident, closing-ready, recap-focused',
    allowedTopicIds: [],
  },
];

// ─── MCM Content Topics ──────────────────────────────────────────────────────
// All 60 topics are defined in ./mcmTopics.ts with full operations metadata.
// Re-exported here for backward compatibility.

export const MCM_CONTENT_TOPICS: WorkspaceContentTopic[] = MCM_CONTENT_TOPICS_V2;

// ─── MCM Platform Configuration ──────────────────────────────────────────────

function mcmPlatforms(): PlatformConfig[] {
  const enabled = new Set(['website-blog', 'landing-page', 'shopify-page', 'instagram', 'facebook', 'youtube', 'google-business']);
  return ALL_PLATFORMS.map((p) => ({ platform: p, enabled: enabled.has(p) }));
}

// ─── MCM Workspace Seed ──────────────────────────────────────────────────────

export function buildMCMWorkspace(): Omit<SEOWorkspace, 'createdAt' | 'updatedAt'> {
  return {
    id: MCM_WORKSPACE_ID,

    // Brand Identity
    clientName: 'Massage Chairs and More',
    brandName: 'Massage Chairs and More',
    websiteUrl: 'https://www.massagechairsandmore.com/',
    industry: 'Premium massage chairs, home wellness, luxury relaxation, recovery, showroom retail',
    businessType: 'B2C',
    targetCountries: ['United States'],
    targetMarket: 'California / Bay Area / NorCal high-ticket buyers researching massage chairs, local showroom demos, premium massage chair comparisons, luxury home wellness, recovery, comfort, and purchase-risk reduction.',

    // Voice & Style
    toneOfVoice: 'Clear, premium, expert, calm, practical, trust-building, non-pushy',
    articleStyle: 'Expert guide style — structured, scannable, comparison-heavy, FAQ-rich, showroom-action-oriented',

    // Business
    coreOffer: 'Premium massage chairs from multiple top brands, in-person showroom comparison and demo experience, expert guidance for high-ticket purchase decisions',
    conversionGoals: 'Showroom visits, demo bookings, phone consultations, direct purchases',
    primaryCTA: 'Visit showroom | Book a demo | Compare chairs in person | Call for expert guidance | Check delivery/space fit | Ask about warranty/service | Compare models',
    brandDifferentiators: [
      'Multi-brand comparison under one roof',
      'Premium in-person showroom experience',
      'Expert guidance instead of pressure selling',
      'Ability to test/demo chairs before buying',
      'Risk reduction around fit, space, delivery, installation, service, and warranty',
      'Strong local showroom presence in California / Bay Area / NorCal',
      'High-ticket purchase confidence',
      'Matching the right chair to the customer\'s body, home, budget, and wellness goals',
    ].join(' · '),
    complianceNotes: [
      'Avoid medical claims — do not say massage chairs cure, treat, fix, heal, or eliminate medical conditions.',
      'Use safer wording: relaxation, comfort, daily recovery routine, stress reset, muscle tension relief, better rest routine, wellness support, purchase confidence.',
      'For health-sensitive content, suggest consulting a physician where appropriate.',
    ].join('\n'),

    // Keywords — empty until uploaded
    keywordList: [],
    keywordListUploadedAt: null,
    keywordListVersion: 0,

    // Sitemap
    sitemapUrl: 'https://www.massagechairsandmore.com/sitemap.xml',
    sitemapStatus: 'idle',
    sitemapLastCheckedAt: null,
    sitemapError: null,
    discoveredPages: [],
    sitemapPages: [],

    // Assets
    assets: [],

    // Platforms
    platforms: mcmPlatforms(),

    // Libraries
    personas: MCM_PERSONAS,
    contentTopics: MCM_CONTENT_TOPICS_V2,

    // Content
    projectIds: [],
    contentEntries: [],
  };
}
