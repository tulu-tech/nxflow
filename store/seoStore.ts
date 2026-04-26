import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  SEOProject,
  BrandIntake,
  BusinessType,
  BriefSelections,
  KeywordEntry,
  ContentBrief,
  OutlineItem,
  GeneratedArticle,
  ImagePrompt,
  LinkPlan,
  RevisionNote,
  PublishPackage,
} from '../lib/seo/types';
import type { SEOWorkspace } from '../lib/seo/workspaceTypes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).substring(2, 10);

const emptyIntake = (): BrandIntake => ({
  brandName: '',
  websiteUrl: '',
  industry: '',
  products: '',
  keyProducts: '',
  targetAudience: '',
  painPoints: '',
  businessType: 'B2C',
  targetCountries: [],
  targetLanguage: 'English',
  businessGoal: '',
  competitors: '',
  toneOfVoice: '',
  articleStyle: '',
  pageType: 'blog',
  priorityTopic: '',
  internalPages: '',
  domainAuthority: '',
  specialFocus: '',
});

// ─── Store Interface ─────────────────────────────────────────────────────────

interface SEOState {
  projects: Record<string, SEOProject>;
  activeProjectId: string | null;

  createProject: (name: string, workspace?: SEOWorkspace, targetPersonaId?: string, targetTopicId?: string) => string;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;

  updateBrandIntake: (id: string, intake: Partial<BrandIntake>) => void;
  setPhase: (id: string, phase: number) => void;
  updateKeywords: (id: string, keywords: KeywordEntry[]) => void;
  setPrimaryKeyword: (id: string, keyword: string) => void;
  setSecondaryKeywords: (id: string, keywords: string[]) => void;
  setBriefSelections: (id: string, selections: BriefSelections) => void;
  setUserBriefInput: (id: string, text: string) => void;
  updateContentBrief: (id: string, brief: ContentBrief) => void;
  setArticleOutline: (id: string, outline: OutlineItem[]) => void;
  setWritingPrompt: (id: string, prompt: string) => void;
  setGeneratedArticle: (id: string, article: GeneratedArticle) => void;
  setImagePrompts: (id: string, prompts: ImagePrompt[]) => void;
  setLinkPlan: (id: string, plan: LinkPlan) => void;
  updateRevisionNotes: (id: string, notes: RevisionNote[]) => void;
  setFinalOutput: (id: string, output: PublishPackage) => void;
  updateProjectField: (id: string, field: string, value: unknown) => void;
}

// ─── Helper to update a project ──────────────────────────────────────────────

function patchProject(
  state: SEOState,
  id: string,
  patch: Partial<SEOProject>
): Partial<SEOState> {
  const p = state.projects[id];
  if (!p) return {};
  return {
    projects: {
      ...state.projects,
      [id]: { ...p, ...patch, updatedAt: new Date().toISOString() },
    },
  };
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useSEOStore = create<SEOState>()(
  persist(
    (set, get) => ({
      projects: {},
      activeProjectId: null,

      createProject: (name, workspace?, targetPersonaId?, targetTopicId?) => {
        const id = genId();
        const now = new Date().toISOString();

        // Build brandIntake from workspace if provided
        const intake: BrandIntake = workspace
          ? {
              brandName: workspace.brandName,
              websiteUrl: workspace.websiteUrl,
              industry: workspace.industry,
              products: workspace.coreOffer,
              keyProducts: '',
              targetAudience: workspace.targetMarket,
              painPoints: '',
              businessType: workspace.businessType as BusinessType,
              targetCountries: workspace.targetCountries,
              targetLanguage: 'English',
              businessGoal: workspace.conversionGoals,
              competitors: '',
              toneOfVoice: workspace.toneOfVoice,
              articleStyle: workspace.articleStyle,
              pageType: 'blog',
              priorityTopic: '',
              internalPages: '',
              domainAuthority: '',
              specialFocus: workspace.brandDifferentiators,
            }
          : emptyIntake();

        // Map workspace keywords (WorkspaceKeyword) to project-level KeywordEntry
        const projectKeywords: KeywordEntry[] = workspace?.keywordList
          ? workspace.keywordList
              .filter((wk) => wk.status === 'active')
              .map((wk, idx) => ({
                id: wk.keywordId,
                keyword: wk.keyword,
                searchIntent: 'informational' as const,
                funnelStage: 'top' as const,
                businessRelevance: 7,
                conversionValue: wk.cpc && wk.cpc > 2 ? 8 : 5,
                contentOpportunity: '',
                category: idx === 0 ? 'primary' as const : idx < 5 ? 'secondary' as const : 'supporting' as const,
                searchVolume: wk.volume ?? undefined,
                keywordDifficulty: wk.kd ?? undefined,
                cpc: wk.cpc ?? undefined,
                validationStatus: 'approved' as const,
              }))
          : [];

        const project: SEOProject = {
          id,
          workspaceId: workspace?.id ?? null,
          targetPersonaId: targetPersonaId ?? null,
          targetTopicId: targetTopicId ?? null,
          selectedPlatformFormat: null,
          contentGoal: null,
          keywordStrategy: null,
          rawContent: null,
          internalLinkPlan: null,
          externalLinkPlan: null,
          linkedContent: null,
          imagePlan: null,
          name,
          createdBy: null,
          createdByName: null,
          currentPhase: workspace ? 2 : 1,  // skip Brand Discovery if workspace provided
          status: workspace ? 'in-progress' : 'draft',
          brandIntake: intake,
          keywords: projectKeywords,
          keywordClusters: [],
          primaryKeyword: null,
          secondaryKeywords: [],
          contentKeywordRecord: null,
          briefSelections: { contentTopics: [], targetOrganizations: [], targetJobTitles: [], contentFormat: [] },
          userBriefInput: '',
          contentBrief: null,
          articleOutline: null,
          writingPrompt: null,
          generatedArticle: null,
          imagePrompts: [],
          linkPlan: null,
          revisionNotes: [],
          finalOutput: null,
          scheduledDate: null,
          publishedDate: null,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          projects: { ...s.projects, [id]: project },
          activeProjectId: id,
        }));
        return id;
      },

      deleteProject: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.projects;
          return {
            projects: rest,
            activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
          };
        }),

      setActiveProject: (id) => set({ activeProjectId: id }),

      updateBrandIntake: (id, intake) =>
        set((s) => {
          const p = s.projects[id];
          if (!p) return s;
          return patchProject(s, id, {
            brandIntake: { ...p.brandIntake, ...intake },
          });
        }),

      setPhase: (id, phase) =>
        set((s) =>
          patchProject(s, id, {
            currentPhase: phase,
            status: phase > 1 ? 'in-progress' : s.projects[id]?.status,
          })
        ),

      updateKeywords: (id, keywords) =>
        set((s) => patchProject(s, id, { keywords })),

      setPrimaryKeyword: (id, keyword) =>
        set((s) => patchProject(s, id, { primaryKeyword: keyword })),

      setSecondaryKeywords: (id, keywords) =>
        set((s) => patchProject(s, id, { secondaryKeywords: keywords })),

      setBriefSelections: (id, selections) =>
        set((s) => patchProject(s, id, { briefSelections: selections })),

      setUserBriefInput: (id, text) =>
        set((s) => patchProject(s, id, { userBriefInput: text })),

      updateContentBrief: (id, brief) =>
        set((s) => patchProject(s, id, { contentBrief: brief })),

      setArticleOutline: (id, outline) =>
        set((s) => patchProject(s, id, { articleOutline: outline })),

      setWritingPrompt: (id, prompt) =>
        set((s) => patchProject(s, id, { writingPrompt: prompt })),

      setGeneratedArticle: (id, article) =>
        set((s) => patchProject(s, id, { generatedArticle: article })),

      setImagePrompts: (id, prompts) =>
        set((s) => patchProject(s, id, { imagePrompts: prompts })),

      setLinkPlan: (id, plan) =>
        set((s) => patchProject(s, id, { linkPlan: plan })),

      updateRevisionNotes: (id, notes) =>
        set((s) => patchProject(s, id, { revisionNotes: notes })),

      setFinalOutput: (id, output) =>
        set((s) => patchProject(s, id, { finalOutput: output, status: 'completed' })),

      updateProjectField: (id, field, value) =>
        set((s) => patchProject(s, id, { [field]: value } as Partial<SEOProject>)),
    }),
    { name: 'nxflow-seo', version: 1 }
  )
);
