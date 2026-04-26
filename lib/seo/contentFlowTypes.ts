/**
 * Content Creation Flow — Types & Config
 *
 * Defines the 12-step content creation wizard phases,
 * content format options, and content goal presets.
 */

// ─── Content Creation Phases ─────────────────────────────────────────────────

export interface ContentPhaseConfig {
  step: number;
  label: string;
  shortLabel: string;
  icon: string;
}

export const CONTENT_PHASES: ContentPhaseConfig[] = [
  { step: 1,  label: 'Select Persona',        shortLabel: 'Persona',   icon: '👤' },
  { step: 2,  label: 'Select Topic',          shortLabel: 'Topic',     icon: '📚' },
  { step: 3,  label: 'Platform / Format',     shortLabel: 'Platform',  icon: '📡' },
  { step: 4,  label: 'Content Goal',          shortLabel: 'Goal',      icon: '🎯' },
  { step: 5,  label: 'AI Keyword Selection',  shortLabel: 'Keywords',  icon: '🔑' },
  { step: 6,  label: 'Content Brief',         shortLabel: 'Brief',     icon: '📋' },
  { step: 7,  label: 'Generate Content',      shortLabel: 'Content',   icon: '📝' },
  { step: 8,  label: 'Internal Link Plan',    shortLabel: 'Int Links', icon: '🔗' },
  { step: 9,  label: 'External Link Plan',    shortLabel: 'Ext Links', icon: '🌐' },
  { step: 10, label: 'Link Injection',        shortLabel: 'Inject',    icon: '💉' },
  { step: 11, label: 'Image Plan',            shortLabel: 'Img Plan',  icon: '🖼️' },
  { step: 12, label: 'Image Generation',      shortLabel: 'Images',    icon: '📸' },
];

// ─── Content Format Options ──────────────────────────────────────────────────

export type ContentFormatType =
  | 'text-post'
  | 'image-post'
  | 'short-video'
  | 'long-video'
  | 'instagram-story'
  | 'linkedin-story'
  | 'static-infographic'
  | 'multi-image-carousel'
  | 'pdf-carousel'
  | 'article-blog'
  | 'poll-quiz'
  | 'qa-session'
  | 'comment-engagement';

export interface ContentFormatOption {
  id: ContentFormatType;
  label: string;
  icon: string;
  description: string;
}

export const CONTENT_FORMATS: ContentFormatOption[] = [
  { id: 'text-post',            label: 'Text Posts',                 icon: '💬',  description: 'Social media text-based posts' },
  { id: 'image-post',           label: 'Image Posts',                icon: '📸',  description: 'Visual posts with image + caption' },
  { id: 'short-video',          label: 'Short Videos',               icon: '🎬',  description: 'Reels, Shorts, TikTok (< 60s)' },
  { id: 'long-video',           label: 'Long-Form Videos',           icon: '▶️',  description: 'YouTube reviews, tutorials (5–15 min)' },
  { id: 'instagram-story',      label: 'Instagram/Facebook Stories', icon: '📱',  description: 'Ephemeral vertical stories' },
  { id: 'linkedin-story',       label: 'LinkedIn Stories',           icon: '💼',  description: 'Professional audience stories' },
  { id: 'static-infographic',   label: 'Static Infographics',        icon: '📊',  description: 'Data-driven visual graphics' },
  { id: 'multi-image-carousel', label: 'Multi-Image Carousels',      icon: '🎠',  description: 'Swipeable multi-slide posts' },
  { id: 'pdf-carousel',         label: 'Multi-Page PDF Carousels',   icon: '📄',  description: 'Downloadable PDF slide decks' },
  { id: 'article-blog',         label: 'Article / Blog In-Depth',    icon: '📝',  description: 'Long-form SEO blog articles' },
  { id: 'poll-quiz',            label: 'Polls and Quizzes',          icon: '📊',  description: 'Interactive engagement content' },
  { id: 'qa-session',           label: 'Q&A Sessions',               icon: '❓',  description: 'Community Q&A / AMA format' },
  { id: 'comment-engagement',   label: 'Comments on Target Posts',   icon: '💭',  description: 'Strategic engagement comments' },
];

// ─── Content Goal Presets ────────────────────────────────────────────────────

export const CONTENT_GOALS = [
  'Drive showroom visit',
  'Book demo',
  'Compare models',
  'Educate buyer',
  'Handle price objection',
  'Explain warranty/service',
  'Build brand awareness',
  'Generate local SEO traffic',
  'Reduce purchase risk',
  'Encourage expert consultation',
] as const;

export type ContentGoal = typeof CONTENT_GOALS[number] | string;

// ─── Keyword Strategy (AI-recommended) ──────────────────────────────────────

export interface KeywordRecommendation {
  keyword: string;
  keywordId: string | null;
  tag: string;
  volume: number | null;
  kd: number | null;
  cpc: number | null;
  usedAsPrimaryBefore: boolean;
  usedAsPrimaryCount: number;
  reason: string;
}

export interface SecondaryKeywordRecommendation {
  keyword: string;
  keywordId: string | null;
  tag: string;
  volume: number | null;
  kd: number | null;
  cpc: number | null;
}

export interface KeywordStrategy {
  primaryKeyword: KeywordRecommendation;
  secondaryKeywords: SecondaryKeywordRecommendation[];
  searchIntent: string;
  funnelStage: string;
  commercialPriority: 'high' | 'medium' | 'low';
  ctaRecommendation: string;
  claimRisk: string;
  cannibalizationWarning: string | null;
  approved: boolean;
  approvedAt: string | null;
}

// ─── Image Plan ──────────────────────────────────────────────────────────────

export interface ImagePlanItem {
  id: string;
  placement: string;
  description: string;
  style: string;
  altText: string;
  imageUrl?: string;
  generated: boolean;
}
