/**
 * MCM Workspace Seed — Massage Chairs and More
 *
 * This file contains the default workspace configuration for the MCM brand.
 * All MCM-specific data (personas, topics, brand positioning) lives HERE,
 * scoped to the MCM workspace only. Nothing in this file is global.
 */

import type { SEOWorkspace, WorkspacePersona, WorkspaceContentTopic, PlatformConfig } from '../workspaceTypes';
import { ALL_PLATFORMS } from '../workspaceTypes';

// ─── MCM Workspace ID (stable so we can check if it already exists) ──────────

export const MCM_WORKSPACE_ID = 'mcm-default';

// ─── MCM Personas ────────────────────────────────────────────────────────────

export const MCM_PERSONAS: WorkspacePersona[] = [
  {
    id: 'mcm-p1',
    name: 'First-Time Massage Chair Buyer',
    description: 'Has never owned a massage chair. Overwhelmed by options, price ranges, and features. Needs confidence that they are making the right choice.',
    demographics: 'Age 35–65, homeowner, household income $100K+, California/Bay Area',
    painPoints: [
      'Overwhelmed by too many brands and models online',
      'Afraid of spending $3K–$10K on the wrong chair',
      'Uncertain about space requirements and room fit',
      'Worried about delivery, installation, and service after purchase',
    ],
    motivations: [
      'Wants to see and test chairs before committing',
      'Values expert guidance over pressure sales',
      'Needs reassurance on warranty and after-sale support',
      'Wants to match chair to their body type and wellness goals',
    ],
    searchBehavior: 'Searches comparison queries (best massage chair 2025, Osaki vs Luraco), looks for showroom near me, reads reviews',
    contentPreferences: 'Comparison guides, showroom visit tips, buyer guides, FAQ-heavy content',
    buyingStage: 'consideration',
  },
  {
    id: 'mcm-p2',
    name: 'Upgrade/Replacement Buyer',
    description: 'Already owns a massage chair (1–5+ years old). Wants a newer model with better technology. Knows the category but needs to understand what has changed.',
    demographics: 'Age 40–65, existing massage chair owner, higher budget tolerance',
    painPoints: [
      'Current chair is outdated or losing effectiveness',
      'Not sure which new features are worth the upgrade',
      'Concerned about trade-in or disposal of old chair',
      'Wants to see 4D, AI body scan, heated roller improvements in person',
    ],
    motivations: [
      'Knows the value of a good massage chair',
      'Wants the latest technology (4D, voice control, zero gravity)',
      'Ready to invest more for a premium experience',
      'Wants side-by-side comparison at a showroom',
    ],
    searchBehavior: 'Searches specific models, 4D vs 3D, best massage chair 2025 upgrade, new features',
    contentPreferences: 'Technology explainers, model comparison tables, upgrade guides',
    buyingStage: 'decision',
  },
  {
    id: 'mcm-p3',
    name: 'Gift Buyer (Spouse/Parent/Family)',
    description: 'Buying a massage chair as a gift for a loved one. Budget-conscious but wants premium quality. Needs reassurance this is a smart, thoughtful gift.',
    demographics: 'Age 30–55, buying for spouse, parent, or family member',
    painPoints: [
      'Does not know which chair fits the recipient\'s body and needs',
      'Worried about picking wrong size, style, or feature set',
      'Concerned about delivery logistics and surprise factor',
      'Price anxiety — wants to justify the investment',
    ],
    motivations: [
      'Wants to give a meaningful, lasting gift',
      'Needs expert help matching chair to recipient',
      'Values showroom demo to see/feel before purchasing',
      'Wants flexible delivery and white-glove setup',
    ],
    searchBehavior: 'Searches best massage chair gift, massage chair for parents, luxury gift ideas',
    contentPreferences: 'Gift guides, entry-level premium guides, FAQ content, emotional benefit framing',
    buyingStage: 'consideration',
  },
  {
    id: 'mcm-p4',
    name: 'Pain/Recovery Seeker',
    description: 'Exploring massage chairs for back pain, muscle tension, post-workout recovery, or daily stress relief. Needs comfort that a chair can support their wellness goals without medical overclaims.',
    demographics: 'Age 30–65, active lifestyle or desk worker, experiences chronic tension/soreness',
    painPoints: [
      'Chronic back, neck, or shoulder tension',
      'Spending money on massage appointments that only provide temporary relief',
      'Unsure if a massage chair can replicate professional massage quality',
      'Concerned about medical claims vs reality',
    ],
    motivations: [
      'Wants daily access to tension relief at home',
      'Looking for a long-term investment in comfort and recovery',
      'Values features like heat therapy, zero gravity, body scanning',
      'Wants to test pressure/intensity before buying',
    ],
    searchBehavior: 'Searches massage chair for back pain, best chair for recovery, zero gravity benefits',
    contentPreferences: 'Wellness-focused content, feature deep-dives, comparison with massage therapy costs',
    buyingStage: 'awareness',
  },
  {
    id: 'mcm-p5',
    name: 'Luxury Home / Man Cave Buyer',
    description: 'Buying a massage chair as a premium home addition — home theater, man cave, luxury living room. Aesthetics and status matter as much as function.',
    demographics: 'Age 35–60, high income, values home design and premium lifestyle products',
    painPoints: [
      'Most massage chairs look bulky and don\'t match home décor',
      'Concerned about space and room fit',
      'Wants premium materials and modern design language',
      'Status-conscious — wants a chair that impresses guests',
    ],
    motivations: [
      'Wants a showpiece that also delivers premium massage',
      'Values design, materials, and brand prestige',
      'Interested in smart home integration and modern UX',
      'Willing to pay top dollar for the right chair',
    ],
    searchBehavior: 'Searches luxury massage chair, best looking massage chair, massage chair for home theater',
    contentPreferences: 'Design-focused content, room setup guides, flagship model showcases',
    buyingStage: 'consideration',
  },
  {
    id: 'mcm-p6',
    name: 'Senior / Elderly Buyer',
    description: 'Buying for themselves or a partner. Mobility, ease of use, and gentle massage modes are priorities. Safety and accessibility features matter.',
    demographics: 'Age 60+, or adult children buying for parents, mobility considerations',
    painPoints: [
      'Difficulty getting in and out of some chair models',
      'Concerned about intensity being too strong',
      'Needs simple controls — not tech-savvy',
      'Worried about long-term reliability and service',
    ],
    motivations: [
      'Wants gentle, therapeutic daily massage at home',
      'Values easy entry/exit and simple remote controls',
      'Interested in heat therapy and gentle stretching',
      'Needs local service and responsive support',
    ],
    searchBehavior: 'Searches massage chair for elderly, easy to use massage chair, gentle massage chair',
    contentPreferences: 'Accessibility-focused guides, feature comparison for seniors, safety content',
    buyingStage: 'consideration',
  },
  {
    id: 'mcm-p7',
    name: 'Couple / Dual Chair Buyer',
    description: 'Buying two chairs or a chair that works for both partners. Needs flexibility in body scanning and intensity for different body types.',
    demographics: 'Couples, households with 2+ regular users, considering matching chairs',
    painPoints: [
      'Different body types and massage preferences between partners',
      'Budget concern when buying two chairs',
      'Space planning for two chairs in one room',
      'Wants both users to have personalized settings',
    ],
    motivations: [
      'Shared wellness routine as a couple',
      'Multiple user profiles per chair',
      'Wants to test both chairs together at showroom',
      'Values family/couple pricing or bundle deals',
    ],
    searchBehavior: 'Searches massage chair for couples, dual massage chair setup, his and hers massage chairs',
    contentPreferences: 'Couple-focused content, dual setup guides, multi-user features guides',
    buyingStage: 'decision',
  },
  {
    id: 'mcm-p8',
    name: 'Remote Worker / WFH Professional',
    description: 'Works from home and experiences desk fatigue, back strain, and posture issues. Sees a massage chair as a daily recovery tool, not just a luxury.',
    demographics: 'Age 28–50, remote/hybrid worker, sits 6–10 hours daily, tech-savvy',
    painPoints: [
      'Daily back and neck strain from desk work',
      'No separation between work and recovery at home',
      'Spending on ergonomic desk setups but still in pain',
      'Wants quick 15–20 min resets during the workday',
    ],
    motivations: [
      'Daily micro-recovery to combat desk fatigue',
      'Wants a chair that fits into a home office or nearby room',
      'Values quick-start programs and automated body scan',
      'Interested in compact or space-saving designs',
    ],
    searchBehavior: 'Searches massage chair for home office, best chair for desk workers, compact massage chair',
    contentPreferences: 'Productivity-wellness crossover content, compact chair guides, daily routine suggestions',
    buyingStage: 'awareness',
  },
];

// ─── MCM Content Topics ──────────────────────────────────────────────────────

export const MCM_CONTENT_TOPICS: WorkspaceContentTopic[] = [
  {
    id: 'mcm-t1',
    topic: 'Best Massage Chairs of 2025 — Comparison Guide',
    category: 'Comparison',
    description: 'Comprehensive comparison of top massage chair brands and models available in 2025. Compare Osaki, Luraco, Titan, OHCO, Infinity, Daiwa, and more.',
    targetPersonaIds: ['mcm-p1', 'mcm-p2'],
    suggestedKeywords: ['best massage chairs 2025', 'massage chair comparison', 'top massage chair brands'],
    contentFormats: ['blog', 'guide'],
    funnelStage: 'middle',
    priority: 'high',
    status: 'planned',
  },
  {
    id: 'mcm-t2',
    topic: 'How to Choose the Right Massage Chair for Your Body',
    category: 'Buyer Guide',
    description: 'Guide on matching chair features (track type, roller width, body scan, intensity) to different body types — height, weight, build.',
    targetPersonaIds: ['mcm-p1', 'mcm-p4', 'mcm-p6'],
    suggestedKeywords: ['how to choose massage chair', 'massage chair for tall person', 'massage chair body type guide'],
    contentFormats: ['blog', 'guide'],
    funnelStage: 'middle',
    priority: 'high',
    status: 'planned',
  },
  {
    id: 'mcm-t3',
    topic: 'Your First Showroom Visit — What to Expect',
    category: 'Showroom Experience',
    description: 'Walk potential customers through what happens at an MCM showroom visit. Reduce anxiety, build trust, explain the demo process.',
    targetPersonaIds: ['mcm-p1', 'mcm-p3', 'mcm-p6'],
    suggestedKeywords: ['massage chair showroom near me', 'massage chair demo', 'try massage chair before buying'],
    contentFormats: ['blog', 'landing-page'],
    funnelStage: 'bottom',
    priority: 'high',
    status: 'planned',
  },
  {
    id: 'mcm-t4',
    topic: '4D vs 3D vs 2D Massage Chairs — What\'s the Difference?',
    category: 'Technology Explainer',
    description: 'Explain the differences between 2D, 3D, and 4D massage technology in plain language. Help buyers understand what they\'re paying for.',
    targetPersonaIds: ['mcm-p1', 'mcm-p2', 'mcm-p8'],
    suggestedKeywords: ['4D massage chair', '3D vs 4D massage chair', 'massage chair technology explained'],
    contentFormats: ['blog'],
    funnelStage: 'top',
    priority: 'medium',
    status: 'planned',
  },
  {
    id: 'mcm-t5',
    topic: 'Zero Gravity Massage Chairs — Benefits and Best Models',
    category: 'Feature Deep-Dive',
    description: 'Explain zero gravity positioning, its benefits for spinal decompression and circulation, and which MCM-carried models offer the best zero gravity experience.',
    targetPersonaIds: ['mcm-p1', 'mcm-p4', 'mcm-p6'],
    suggestedKeywords: ['zero gravity massage chair', 'zero gravity recliner benefits', 'best zero gravity massage chair'],
    contentFormats: ['blog', 'guide'],
    funnelStage: 'top',
    priority: 'medium',
    status: 'planned',
  },
  {
    id: 'mcm-t6',
    topic: 'Massage Chair Delivery, Installation, and Space Planning',
    category: 'Purchase Logistics',
    description: 'Address common delivery anxieties: room dimensions, doorway width, electrical requirements, white-glove delivery vs self-setup.',
    targetPersonaIds: ['mcm-p1', 'mcm-p5', 'mcm-p7'],
    suggestedKeywords: ['massage chair delivery', 'massage chair room size', 'massage chair installation'],
    contentFormats: ['blog'],
    funnelStage: 'bottom',
    priority: 'medium',
    status: 'planned',
  },
  {
    id: 'mcm-t7',
    topic: 'Massage Chair Warranty and Service — What to Look For',
    category: 'Trust Building',
    description: 'Explain warranty tiers, parts vs labor coverage, service network, and why local service matters for a $3K–$10K purchase.',
    targetPersonaIds: ['mcm-p1', 'mcm-p2', 'mcm-p6'],
    suggestedKeywords: ['massage chair warranty', 'massage chair service', 'massage chair extended warranty'],
    contentFormats: ['blog'],
    funnelStage: 'bottom',
    priority: 'medium',
    status: 'planned',
  },
  {
    id: 'mcm-t8',
    topic: 'Massage Chair Gift Guide — How to Buy for Someone Else',
    category: 'Gift Buying',
    description: 'Guide for gift buyers on how to choose the right chair for a spouse, parent, or family member without them being present to test.',
    targetPersonaIds: ['mcm-p3'],
    suggestedKeywords: ['massage chair gift', 'massage chair for parents', 'luxury gift ideas'],
    contentFormats: ['blog', 'guide'],
    funnelStage: 'middle',
    priority: 'medium',
    status: 'planned',
  },
  {
    id: 'mcm-t9',
    topic: 'Massage Chair vs Massage Therapist — Cost and Convenience',
    category: 'Value Proposition',
    description: 'Compare the long-term cost of regular massage therapy appointments vs a one-time massage chair investment. Frame the ROI argument.',
    targetPersonaIds: ['mcm-p4', 'mcm-p8'],
    suggestedKeywords: ['massage chair vs therapist', 'massage chair cost comparison', 'massage chair ROI'],
    contentFormats: ['blog'],
    funnelStage: 'top',
    priority: 'high',
    status: 'planned',
  },
  {
    id: 'mcm-t10',
    topic: 'Setting Up a Massage Chair in Your Home Office',
    category: 'Lifestyle',
    description: 'Guide for remote workers on incorporating a massage chair into a home office or adjacent recovery space. Focus on compact models and daily micro-recovery.',
    targetPersonaIds: ['mcm-p8'],
    suggestedKeywords: ['massage chair home office', 'compact massage chair', 'massage chair for remote workers'],
    contentFormats: ['blog'],
    funnelStage: 'middle',
    priority: 'low',
    status: 'planned',
  },
  {
    id: 'mcm-t11',
    topic: 'Best Massage Chairs for Couples — Dual Setup Guide',
    category: 'Lifestyle',
    description: 'Guide for couples considering two chairs: room planning, matching vs different models, multi-user profiles, and shared wellness routines.',
    targetPersonaIds: ['mcm-p7'],
    suggestedKeywords: ['massage chair for couples', 'dual massage chair setup', 'his and hers massage chairs'],
    contentFormats: ['blog', 'guide'],
    funnelStage: 'middle',
    priority: 'low',
    status: 'planned',
  },
  {
    id: 'mcm-t12',
    topic: 'Premium vs Mid-Range Massage Chairs — Is Flagship Worth It?',
    category: 'Comparison',
    description: 'Help buyers decide between a $3K–$5K mid-range chair and a $7K–$12K flagship. What do you actually get for the extra money?',
    targetPersonaIds: ['mcm-p1', 'mcm-p2', 'mcm-p5'],
    suggestedKeywords: ['expensive massage chair worth it', 'luxury massage chair', 'premium vs budget massage chair'],
    contentFormats: ['blog', 'comparison-page'],
    funnelStage: 'middle',
    priority: 'high',
    status: 'planned',
  },
  {
    id: 'mcm-t13',
    topic: 'Massage Chairs for Seniors — Accessibility and Comfort Guide',
    category: 'Audience-Specific',
    description: 'Guide specifically for elderly users or their adult children. Focus on easy entry/exit, gentle modes, simple controls, and safety features.',
    targetPersonaIds: ['mcm-p6'],
    suggestedKeywords: ['massage chair for elderly', 'easy to use massage chair', 'gentle massage chair for seniors'],
    contentFormats: ['blog', 'guide'],
    funnelStage: 'middle',
    priority: 'medium',
    status: 'planned',
  },
  {
    id: 'mcm-t14',
    topic: 'Heated Massage Chairs — How Heat Therapy Enhances Your Massage',
    category: 'Feature Deep-Dive',
    description: 'Explain how heat therapy works in massage chairs, which models have the best heat features, and how heated rollers differ from heated pads.',
    targetPersonaIds: ['mcm-p4', 'mcm-p6'],
    suggestedKeywords: ['heated massage chair', 'massage chair with heat', 'heat therapy massage chair'],
    contentFormats: ['blog'],
    funnelStage: 'top',
    priority: 'low',
    status: 'planned',
  },
  {
    id: 'mcm-t15',
    topic: 'Brand Spotlight — Osaki, Luraco, OHCO, Titan, Infinity, Daiwa',
    category: 'Brand Guide',
    description: 'Individual brand profile pages explaining each brand\'s strengths, price range, signature models, and who each brand is best suited for.',
    targetPersonaIds: ['mcm-p1', 'mcm-p2'],
    suggestedKeywords: ['Osaki massage chair review', 'Luraco massage chair', 'best Titan massage chair'],
    contentFormats: ['blog', 'landing-page'],
    funnelStage: 'middle',
    priority: 'high',
    status: 'planned',
  },
];

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
    sitemapLastCheckedAt: null,
    sitemapPages: [],

    // Assets
    assets: [],

    // Platforms
    platforms: mcmPlatforms(),

    // Libraries
    personas: MCM_PERSONAS,
    contentTopics: MCM_CONTENT_TOPICS,

    // Content
    projectIds: [],
    contentEntries: [],
  };
}
