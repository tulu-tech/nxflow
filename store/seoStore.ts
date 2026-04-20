import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  SEOProject,
  BrandIntake,
  KeywordEntry,
  ContentBrief,
  OutlineItem,
  GeneratedArticle,
  ImagePrompt,
  LinkPlan,
  RevisionNote,
  PublishPackage,
} from '../lib/seo/types';

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

  createProject: (name: string) => string;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;

  updateBrandIntake: (id: string, intake: Partial<BrandIntake>) => void;
  setPhase: (id: string, phase: number) => void;
  updateKeywords: (id: string, keywords: KeywordEntry[]) => void;
  setPrimaryKeyword: (id: string, keyword: string) => void;
  setSecondaryKeywords: (id: string, keywords: string[]) => void;
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

      createProject: (name) => {
        const id = genId();
        const now = new Date().toISOString();
        const project: SEOProject = {
          id,
          name,
          currentPhase: 1,
          status: 'draft',
          brandIntake: emptyIntake(),
          keywords: [],
          keywordClusters: [],
          primaryKeyword: null,
          secondaryKeywords: [],
          userBriefInput: '',
          contentBrief: null,
          articleOutline: null,
          writingPrompt: null,
          generatedArticle: null,
          imagePrompts: [],
          linkPlan: null,
          revisionNotes: [],
          finalOutput: null,
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
