import { BusinessType } from './types';

// ─── Platform Types ──────────────────────────────────────────────────────────

export type PlatformType =
  | 'website-blog'
  | 'landing-page'
  | 'shopify-page'
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'youtube'
  | 'tiktok'
  | 'google-business'
  | 'email-newsletter'
  | 'pdf-carousel'
  | 'other';

export interface PlatformConfig {
  platform: PlatformType;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export const PLATFORM_LABELS: Record<PlatformType, string> = {
  'website-blog': 'Website Blog',
  'landing-page': 'Landing Page',
  'shopify-page': 'Shopify Page',
  'instagram': 'Instagram',
  'facebook': 'Facebook',
  'linkedin': 'LinkedIn',
  'youtube': 'YouTube',
  'tiktok': 'TikTok',
  'google-business': 'Google Business Profile',
  'email-newsletter': 'Email / Newsletter',
  'pdf-carousel': 'PDF / Carousel',
  'other': 'Other',
};

export const PLATFORM_ICONS: Record<PlatformType, string> = {
  'website-blog': '📝',
  'landing-page': '🚀',
  'shopify-page': '🛍️',
  'instagram': '📸',
  'facebook': '👤',
  'linkedin': '💼',
  'youtube': '▶️',
  'tiktok': '🎵',
  'google-business': '📍',
  'email-newsletter': '✉️',
  'pdf-carousel': '📄',
  'other': '📌',
};

export const ALL_PLATFORMS: PlatformType[] = [
  'website-blog', 'landing-page', 'shopify-page',
  'instagram', 'facebook', 'linkedin',
  'youtube', 'tiktok', 'google-business',
  'email-newsletter', 'pdf-carousel', 'other',
];

// ─── Workspace Asset ─────────────────────────────────────────────────────────

export interface WorkspaceAsset {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  metadata?: Record<string, unknown>;
}

// ─── Content Status ──────────────────────────────────────────────────────────

export type ContentStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface ContentEntry {
  projectId: string;
  title: string;
  status: ContentStatus;
  platform?: PlatformType;
  scheduledAt?: string;
  publishedAt?: string;
  // Tracking fields for dashboard display
  targetPersonaId?: string;
  targetPersonaName?: string;
  targetTopicId?: string;
  targetTopicName?: string;
  primaryKeyword?: string;
  primaryKeywordTag?: string;
  primaryKeywordVolume?: number | null;
  primaryKeywordKD?: number | null;
  primaryKeywordCPC?: number | null;
  generatedAt?: string;
}

// ─── Generated Content Tracking ─────────────────────────────────────────────

export type ContentPlatformFormat =
  | 'article-blog'
  | 'text-post'
  | 'image-post'
  | 'short-video'
  | 'long-video'
  | 'instagram-story'
  | 'linkedin-story'
  | 'static-infographic'
  | 'multi-image-carousel'
  | 'pdf-carousel'
  | 'poll-quiz'
  | 'qa-session'
  | 'comment-engagement';

export const CONTENT_FORMAT_LABELS: Record<ContentPlatformFormat, string> = {
  'article-blog': 'Article / Blog',
  'text-post': 'Text Post',
  'image-post': 'Image Post',
  'short-video': 'Short Video',
  'long-video': 'Long-Form Video',
  'instagram-story': 'Instagram Story',
  'linkedin-story': 'LinkedIn Story',
  'static-infographic': 'Infographic',
  'multi-image-carousel': 'Image Carousel',
  'pdf-carousel': 'PDF Carousel',
  'poll-quiz': 'Poll / Quiz',
  'qa-session': 'Q&A Session',
  'comment-engagement': 'Comment Engagement',
};

export interface WorkspaceContent {
  contentId: string;
  workspaceId: string;

  // Persona & Topic
  selectedPersona: string;
  selectedTopicId: string;
  selectedTopicName: string;
  selectedPlatformFormat: ContentPlatformFormat;

  // Keyword Strategy
  primaryKeyword: string;
  primaryKeywordId: string;
  primaryKeywordTag: string;
  primaryKeywordVolume: number | null;
  primaryKeywordKD: number | null;
  primaryKeywordCPC: number | null;
  secondaryKeywords: string[];
  secondaryKeywordIds: string[];
  keywordSelectionReason: string;
  keywordSelectionMetadata: Record<string, unknown>;

  // Status & Scheduling
  contentStatus: ContentStatus;
  scheduledDate: string | null;
  publishedDate: string | null;
  platform: string;

  // Content Data
  contentTitle: string;
  contentSlug: string;
  contentPreview: string;
  contentBrief: Record<string, unknown> | null;
  rawContent: string;
  internalLinkPlan: Array<Record<string, unknown>>;
  externalLinkPlan: Array<Record<string, unknown>>;
  linkedContent: string;
  imagePlan: Array<Record<string, unknown>>;
  generatedImages: Array<Record<string, unknown>>;
  finalContent: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ─── Workspace Keyword System ────────────────────────────────────────────────

export type WorkspaceKeywordStatus = 'active' | 'archived';

export interface WorkspaceKeywordUsage {
  usedAsPrimaryCount: number;
  usedAsSecondaryCount: number;
  lastUsedAsPrimaryAt: string | null;
  lastUsedAsSecondaryAt: string | null;
  usedInContentIds: string[];
}

export interface WorkspaceKeyword {
  keywordId: string;
  workspaceId: string;
  keyword: string;
  normalizedKeyword: string;
  tag: string;
  kd: number | null;
  cpc: number | null;
  volume: number | null;
  sourceFile: string;
  uploadedAt: string;
  keywordListVersion: number;
  status: WorkspaceKeywordStatus;
  usage: WorkspaceKeywordUsage;
}

// ─── Persona Library ─────────────────────────────────────────────────────────

export type ClaimRiskLevel = 'low' | 'medium' | 'high';

export interface WorkspacePersona {
  id: string;
  name: string;
  shortDescription: string;
  intentStages: string[];
  defaultCTA: string;
  claimRiskLevel: ClaimRiskLevel;
  recommendedTone: string;
  allowedTopicIds: string[];
}

// ─── Content Topic Library ───────────────────────────────────────────────────

export type TopicCluster =
  | 'Local / Showroom'
  | 'Best / Buying Guide'
  | 'Comparison / VS'
  | 'Brand / Model Review'
  | 'Price / Value'
  | 'Warranty / Service'
  | 'Delivery / Space / Fit'
  | 'Pain / Comfort / Relaxation'
  | 'Feature Education'
  | 'AI Search / Answer Engine'
  | 'Lifestyle / Luxury';

export type TopicSearchIntent =
  | 'informational'
  | 'navigational'
  | 'commercial'
  | 'transactional'
  | 'local';

export type TopicContentType =
  | 'blog-post'
  | 'landing-page'
  | 'comparison-page'
  | 'review-page'
  | 'guide'
  | 'faq-page'
  | 'local-page'
  | 'product-page';

export type TopicLinkIntent =
  | 'product-page'
  | 'collection-page'
  | 'showroom-page'
  | 'buying-guide'
  | 'comparison-page'
  | 'warranty-service-page'
  | 'delivery-fit-page'
  | 'local-page'
  | 'educational-page';

export type TopicImageIntent =
  | 'product-realistic'
  | 'showroom-realistic'
  | 'customer-demo-realistic'
  | 'feature-detail-realistic'
  | 'comparison-visual'
  | 'local-showroom-visual'
  | 'lifestyle-home-visual'
  | 'infographic-style'
  | 'warranty-service-visual'
  | 'delivery-fit-visual';

export interface PreferredKeywordTagLogic {
  primaryTags: string[];
  secondaryTags: string[];
  avoidTags?: string[];
  notes?: string;
}

export interface WorkspaceContentTopic {
  topicId: string;
  topicName: string;
  topicCluster: TopicCluster;
  defaultSearchIntent: TopicSearchIntent;
  defaultContentType: TopicContentType;
  defaultCTA: string;
  claimRiskLevel: ClaimRiskLevel;
  recommendedPlatformFit: PlatformType[];
  brandOrProductSignal: string;
  preferredKeywordTagLogic: PreferredKeywordTagLogic;
  linkIntent: TopicLinkIntent;
  imageIntent: TopicImageIntent;

  // Legacy / backward-compatible fields (kept for dashboard display)
  /** @deprecated use topicId */
  id: string;
  /** @deprecated use topicName */
  topic: string;
  /** @deprecated use topicCluster */
  category: string;
  description: string;
  targetPersonaIds: string[];
  suggestedKeywords: string[];
  contentFormats: string[];
  funnelStage: 'top' | 'middle' | 'bottom';
  priority: 'high' | 'medium' | 'low';
  status: 'planned' | 'in-progress' | 'published' | 'archived';
}

// ─── Discovered Sitemap Page ─────────────────────────────────────────────────

export type SitemapPageType =
  | 'homepage'
  | 'product'
  | 'collection'
  | 'blog'
  | 'guide'
  | 'local'
  | 'brand'
  | 'policy'
  | 'contact'
  | 'other';

export interface DiscoveredPage {
  pageId: string;
  workspaceId: string;
  url: string;
  normalizedUrl: string;
  title: string;
  slug: string;
  path: string;
  pageType: SitemapPageType;
  detectedBrand: string | null;
  detectedProduct: string | null;
  detectedTopic: string | null;
  lastmod: string | null;
  priority: number | null;
  source: 'sitemap' | 'manual';
  status: 'active' | 'removed';
}

// ─── Workspace ───────────────────────────────────────────────────────────────

export interface SEOWorkspace {
  id: string;

  // Client / Brand Information
  clientName: string;
  brandName: string;
  websiteUrl: string;
  industry: string;
  businessType: BusinessType;
  targetCountries: string[];
  targetMarket: string;
  toneOfVoice: string;
  articleStyle: string;
  coreOffer: string;
  conversionGoals: string;
  primaryCTA: string;
  brandDifferentiators: string;
  complianceNotes: string;

  // SEO Assets — Keywords
  keywordList: WorkspaceKeyword[];
  keywordListUploadedAt: string | null;
  keywordListVersion: number;

  // SEO Assets — Sitemap
  sitemapUrl: string;
  sitemapStatus: 'idle' | 'fetching' | 'success' | 'error';
  sitemapLastCheckedAt: string | null;
  sitemapError: string | null;
  discoveredPages: DiscoveredPage[];
  /** @deprecated use discoveredPages.length */
  sitemapPages: string[];

  // Assets
  assets: WorkspaceAsset[];

  // Platform Configuration
  platforms: PlatformConfig[];

  // Persona & Topic Libraries
  personas: WorkspacePersona[];
  contentTopics: WorkspaceContentTopic[];

  // Content Operations
  projectIds: string[];
  contentEntries: ContentEntry[];

  // Generated Content Tracking
  generatedContent: WorkspaceContent[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
