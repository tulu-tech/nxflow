// ─── Enums & Literals ────────────────────────────────────────────────────────

export type BusinessType = 'B2B' | 'B2C' | 'B2G' | 'Both';
export type ProjectStatus = 'draft' | 'in-progress' | 'completed';
export type SearchIntent = 'informational' | 'navigational' | 'commercial' | 'transactional';
export type FunnelStage = 'top' | 'middle' | 'bottom';
export type KeywordCategory = 'primary' | 'secondary' | 'supporting';
export type KeywordValidationStatus = 'pending' | 'approved' | 'rejected';
export type PageType =
  | 'blog'
  | 'landing-page'
  | 'service-page'
  | 'category-page'
  | 'comparison-page'
  | 'guide'
  | 'other';

// ─── Brand Intake ────────────────────────────────────────────────────────────

export interface BrandIntake {
  brandName: string;
  websiteUrl: string;
  industry: string;
  products: string;
  keyProducts: string;
  targetAudience: string;
  painPoints: string;
  businessType: BusinessType;
  targetCountries: string[];
  targetLanguage: string;
  businessGoal: string;
  competitors: string;
  toneOfVoice: string;
  articleStyle: string;
  pageType: PageType;
  priorityTopic: string;
  internalPages: string;
  domainAuthority: string;
  specialFocus: string;
}

// ─── Keywords ────────────────────────────────────────────────────────────────

export interface KeywordEntry {
  id: string;
  keyword: string;
  searchIntent: SearchIntent;
  funnelStage: FunnelStage;
  businessRelevance: number;
  conversionValue: number;
  contentOpportunity: string;
  category: KeywordCategory;
  clusterId?: string;
  // Semrush data (manual for MVP)
  searchVolume?: number;
  keywordDifficulty?: number;
  cpc?: number;
  trend?: string;
  validationStatus: KeywordValidationStatus;
  validationNote?: string;
}

export interface KeywordCluster {
  id: string;
  name: string;
  keywordIds: string[];
}

// ─── Content Brief ───────────────────────────────────────────────────────────

export interface OutlineItem {
  level: 'h2' | 'h3';
  text: string;
  notes?: string;
}

export interface ContentBrief {
  finalKeywords: string[];
  searchIntentSummary: string;
  targetPersona: string;
  funnelStage: FunnelStage;
  contentGoal: string;
  pageType: PageType;
  contentAngle: string;
  differentiationAngle: string;
  titleIdeas: string[];
  h1: string;
  outline: OutlineItem[];
  faqOpportunities: string[];
  richSnippetOpportunities: string[];
  internalLinkOpportunities: string[];
  externalSourceOpportunities: string[];
  ctaDirection: string;
  conversionGoal: string;
}

// ─── Generated Content ───────────────────────────────────────────────────────

export interface GeneratedArticle {
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  content: string;
  wordCount: number;
  generatedAt: string;
}

// ─── Images ──────────────────────────────────────────────────────────────────

export interface ImagePrompt {
  id: string;
  description: string;
  placement: string;
  altText: string;
  fileName: string;
  caption?: string;
  imageUrl?: string;
}

// ─── Links ───────────────────────────────────────────────────────────────────

export interface LinkSuggestion {
  type: 'internal' | 'external';
  url: string;
  anchorText: string;
  context: string;
  placement: string;
  reason: string;
}

export interface LinkPlan {
  internalLinks: LinkSuggestion[];
  externalLinks: LinkSuggestion[];
}

// ─── Revision ────────────────────────────────────────────────────────────────

export interface RevisionNote {
  id: string;
  category: 'seo' | 'readability' | 'tone' | 'originality';
  suggestion: string;
  status: 'pending' | 'accepted' | 'rejected';
  reason?: string;
}

// ─── Final Output ────────────────────────────────────────────────────────────

export interface ChecklistItem {
  label: string;
  checked: boolean;
}

export interface PublishPackage {
  projectSummary: string;
  brandSummary: string;
  keywordStrategy: string;
  article: GeneratedArticle;
  imagePrompts: ImagePrompt[];
  linkPlan: LinkPlan;
  revisionNotes: RevisionNote[];
  publishChecklist: ChecklistItem[];
  exportedAt: string;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export interface SEOProject {
  id: string;
  name: string;
  currentPhase: number;
  status: ProjectStatus;
  brandIntake: BrandIntake;
  keywords: KeywordEntry[];
  keywordClusters: KeywordCluster[];
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  contentBrief: ContentBrief | null;
  writingPrompt: string | null;
  generatedArticle: GeneratedArticle | null;
  imagePrompts: ImagePrompt[];
  linkPlan: LinkPlan | null;
  revisionNotes: RevisionNote[];
  finalOutput: PublishPackage | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Phase Config ────────────────────────────────────────────────────────────

export interface PhaseConfig {
  id: number;
  label: string;
  shortLabel: string;
  icon: string;
}

export const PHASES: PhaseConfig[] = [
  { id: 1, label: 'Brand Discovery', shortLabel: 'Brand', icon: '🏢' },
  { id: 2, label: 'Keyword Upload', shortLabel: 'Upload', icon: '📁' },
  { id: 3, label: 'Keyword Review', shortLabel: 'Review', icon: '✅' },
  { id: 4, label: 'Content Brief', shortLabel: 'Brief', icon: '📋' },
  { id: 5, label: 'Writing Prompt', shortLabel: 'Prompt', icon: '✍️' },
  { id: 6, label: 'Content Generation', shortLabel: 'Generate', icon: '📝' },
  { id: 7, label: 'Image Generation', shortLabel: 'Images', icon: '🖼️' },
  { id: 8, label: 'Link Planning', shortLabel: 'Links', icon: '🔗' },
  { id: 9, label: 'Revision', shortLabel: 'Revise', icon: '🔄' },
  { id: 10, label: 'Final Output', shortLabel: 'Export', icon: '🚀' },
];
