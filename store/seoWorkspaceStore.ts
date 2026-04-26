import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  SEOWorkspace,
  PlatformConfig,
  PlatformType,
  WorkspaceAsset,
  ContentEntry,
  WorkspaceKeyword,
  DiscoveredPage,
} from '../lib/seo/workspaceTypes';
import { ALL_PLATFORMS } from '../lib/seo/workspaceTypes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).substring(2, 10);

function defaultPlatforms(): PlatformConfig[] {
  return ALL_PLATFORMS.map((p) => ({ platform: p, enabled: false }));
}

// ─── Store Interface ─────────────────────────────────────────────────────────

interface WorkspaceState {
  workspaces: Record<string, SEOWorkspace>;

  createWorkspace: (data: Partial<SEOWorkspace> & { brandName: string }) => string;
  updateWorkspace: (id: string, patch: Partial<SEOWorkspace>) => void;
  deleteWorkspace: (id: string) => void;

  // Keyword management
  updateKeywordList: (id: string, keywords: WorkspaceKeyword[]) => void;
  recordKeywordUsage: (workspaceId: string, contentId: string, primaryKeywordId: string | null, secondaryKeywordIds: string[]) => void;

  // Sitemap management
  updateSitemap: (id: string, url: string, pages?: DiscoveredPage[]) => void;
  setSitemapStatus: (id: string, status: 'idle' | 'fetching' | 'success' | 'error', error?: string | null) => void;

  // Platform management
  togglePlatform: (id: string, platform: PlatformType, enabled: boolean) => void;

  // Asset management
  addAsset: (id: string, asset: Omit<WorkspaceAsset, 'id' | 'uploadedAt'>) => void;
  removeAsset: (id: string, assetId: string) => void;

  // Content operations
  addProjectToWorkspace: (workspaceId: string, projectId: string) => void;
  removeProjectFromWorkspace: (workspaceId: string, projectId: string) => void;
  updateContentEntry: (workspaceId: string, entry: ContentEntry) => void;
}

// ─── Helper to patch workspace ───────────────────────────────────────────────

function patchWorkspace(
  state: WorkspaceState,
  id: string,
  patch: Partial<SEOWorkspace>
): Partial<WorkspaceState> {
  const ws = state.workspaces[id];
  if (!ws) return {};
  return {
    workspaces: {
      ...state.workspaces,
      [id]: { ...ws, ...patch, updatedAt: new Date().toISOString() },
    },
  };
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspaces: {},

      createWorkspace: (data) => {
        const id = data.id || genId();
        const now = new Date().toISOString();
        const workspace: SEOWorkspace = {
          id,
          clientName: data.clientName ?? data.brandName,
          brandName: data.brandName,
          websiteUrl: data.websiteUrl ?? '',
          industry: data.industry ?? '',
          businessType: data.businessType ?? 'B2C',
          targetCountries: data.targetCountries ?? [],
          targetMarket: data.targetMarket ?? '',
          toneOfVoice: data.toneOfVoice ?? '',
          articleStyle: data.articleStyle ?? '',
          coreOffer: data.coreOffer ?? '',
          conversionGoals: data.conversionGoals ?? '',
          primaryCTA: data.primaryCTA ?? '',
          brandDifferentiators: data.brandDifferentiators ?? '',
          complianceNotes: data.complianceNotes ?? '',
          keywordList: data.keywordList ?? [],
          keywordListUploadedAt: null,
          keywordListVersion: 0,
          sitemapUrl: data.sitemapUrl ?? '',
          sitemapStatus: 'idle' as const,
          sitemapLastCheckedAt: null,
          sitemapError: null,
          discoveredPages: [],
          sitemapPages: [],
          assets: [],
          platforms: data.platforms ?? defaultPlatforms(),
          personas: data.personas ?? [],
          contentTopics: data.contentTopics ?? [],
          projectIds: [],
          contentEntries: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          workspaces: { ...s.workspaces, [id]: workspace },
        }));
        return id;
      },

      updateWorkspace: (id, patch) =>
        set((s) => patchWorkspace(s, id, patch)),

      deleteWorkspace: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.workspaces;
          return { workspaces: rest };
        }),

      updateKeywordList: (id, keywords) =>
        set((s) => {
          const ws = s.workspaces[id];
          if (!ws) return s;
          return patchWorkspace(s, id, {
            keywordList: keywords,
            keywordListUploadedAt: new Date().toISOString(),
            keywordListVersion: ws.keywordListVersion + 1,
          });
        }),

      recordKeywordUsage: (workspaceId, contentId, primaryKeywordId, secondaryKeywordIds) =>
        set((s) => {
          const ws = s.workspaces[workspaceId];
          if (!ws) return s;
          const now = new Date().toISOString();
          const updatedList = ws.keywordList.map((kw) => {
            const isPrimary = kw.keywordId === primaryKeywordId;
            const isSecondary = secondaryKeywordIds.includes(kw.keywordId);
            if (!isPrimary && !isSecondary) return kw;
            const usedInContentIds = kw.usage.usedInContentIds.includes(contentId)
              ? kw.usage.usedInContentIds
              : [...kw.usage.usedInContentIds, contentId];
            return {
              ...kw,
              usage: {
                ...kw.usage,
                usedAsPrimaryCount: kw.usage.usedAsPrimaryCount + (isPrimary ? 1 : 0),
                usedAsSecondaryCount: kw.usage.usedAsSecondaryCount + (isSecondary ? 1 : 0),
                lastUsedAsPrimaryAt: isPrimary ? now : kw.usage.lastUsedAsPrimaryAt,
                lastUsedAsSecondaryAt: isSecondary ? now : kw.usage.lastUsedAsSecondaryAt,
                usedInContentIds,
              },
            };
          });
          return patchWorkspace(s, workspaceId, { keywordList: updatedList });
        }),

      updateSitemap: (id, url, pages) =>
        set((s) =>
          patchWorkspace(s, id, {
            sitemapUrl: url,
            sitemapStatus: 'success' as const,
            sitemapLastCheckedAt: new Date().toISOString(),
            sitemapError: null,
            discoveredPages: pages ?? s.workspaces[id]?.discoveredPages ?? [],
            sitemapPages: (pages ?? s.workspaces[id]?.discoveredPages ?? []).map((p) => p.url),
          })
        ),

      setSitemapStatus: (id, status, error) =>
        set((s) =>
          patchWorkspace(s, id, {
            sitemapStatus: status,
            sitemapError: error ?? null,
          })
        ),

      togglePlatform: (id, platform, enabled) =>
        set((s) => {
          const ws = s.workspaces[id];
          if (!ws) return s;
          const platforms = ws.platforms.map((p) =>
            p.platform === platform ? { ...p, enabled } : p
          );
          return patchWorkspace(s, id, { platforms });
        }),

      addAsset: (id, asset) =>
        set((s) => {
          const ws = s.workspaces[id];
          if (!ws) return s;
          const newAsset: WorkspaceAsset = {
            ...asset,
            id: genId(),
            uploadedAt: new Date().toISOString(),
          };
          return patchWorkspace(s, id, { assets: [...ws.assets, newAsset] });
        }),

      removeAsset: (id, assetId) =>
        set((s) => {
          const ws = s.workspaces[id];
          if (!ws) return s;
          return patchWorkspace(s, id, {
            assets: ws.assets.filter((a) => a.id !== assetId),
          });
        }),

      addProjectToWorkspace: (workspaceId, projectId) =>
        set((s) => {
          const ws = s.workspaces[workspaceId];
          if (!ws || ws.projectIds.includes(projectId)) return s;
          return patchWorkspace(s, workspaceId, {
            projectIds: [...ws.projectIds, projectId],
          });
        }),

      removeProjectFromWorkspace: (workspaceId, projectId) =>
        set((s) => {
          const ws = s.workspaces[workspaceId];
          if (!ws) return s;
          return patchWorkspace(s, workspaceId, {
            projectIds: ws.projectIds.filter((p) => p !== projectId),
            contentEntries: ws.contentEntries.filter((e) => e.projectId !== projectId),
          });
        }),

      updateContentEntry: (workspaceId, entry) =>
        set((s) => {
          const ws = s.workspaces[workspaceId];
          if (!ws) return s;
          const existing = ws.contentEntries.findIndex((e) => e.projectId === entry.projectId);
          const entries = [...ws.contentEntries];
          if (existing >= 0) {
            entries[existing] = entry;
          } else {
            entries.push(entry);
          }
          return patchWorkspace(s, workspaceId, { contentEntries: entries });
        }),
    }),
    { name: 'nxflow-seo-workspaces', version: 2 }
  )
);
