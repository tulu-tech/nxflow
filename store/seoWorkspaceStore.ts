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
  WorkspaceContent,
  ContentStatus,
  KeywordListVersion,
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
  updateKeywordList: (id: string, keywords: WorkspaceKeyword[], fileName?: string) => void;
  replaceKeywordList: (id: string, keywords: WorkspaceKeyword[], fileName: string) => void;
  mergeKeywordList: (id: string, keywords: WorkspaceKeyword[], fileName: string) => void;
  archiveKeywordVersion: (id: string, versionId: string) => void;
  activateKeywordVersion: (id: string, versionId: string) => void;
  archiveKeyword: (workspaceId: string, keywordId: string) => void;
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

  // Generated content tracking
  addGeneratedContent: (workspaceId: string, content: WorkspaceContent) => void;
  updateGeneratedContent: (workspaceId: string, contentId: string, patch: Partial<WorkspaceContent>) => void;
  updateContentStatus: (workspaceId: string, contentId: string, status: ContentStatus, date?: string) => void;
  deleteGeneratedContent: (workspaceId: string, contentId: string) => void;
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
          keywordVersions: [],
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
          generatedContent: [],
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

      updateKeywordList: (id, keywords, fileName) =>
        set((s) => {
          const ws = s.workspaces[id];
          if (!ws) return s;
          const nextVersion = ws.keywordListVersion + 1;
          const version: KeywordListVersion = {
            versionId: genId(),
            workspaceId: id,
            fileName: fileName ?? 'upload',
            uploadedAt: new Date().toISOString(),
            keywordCount: keywords.length,
            activeKeywordCount: keywords.filter(k => k.status === 'active').length,
            archivedKeywordCount: keywords.filter(k => k.status === 'archived').length,
            status: 'active',
          };
          // Archive prior active versions
          const versions = (ws.keywordVersions ?? []).map(v => v.status === 'active' ? { ...v, status: 'archived' as const } : v);
          return patchWorkspace(s, id, {
            keywordList: keywords,
            keywordListUploadedAt: new Date().toISOString(),
            keywordListVersion: nextVersion,
            keywordVersions: [...versions, version],
          });
        }),

      replaceKeywordList: (id, keywords, fileName) =>
        set((s) => {
          const ws = s.workspaces[id];
          if (!ws) return s;
          const nextVersion = ws.keywordListVersion + 1;
          const version: KeywordListVersion = {
            versionId: genId(),
            workspaceId: id,
            fileName,
            uploadedAt: new Date().toISOString(),
            keywordCount: keywords.length,
            activeKeywordCount: keywords.length,
            archivedKeywordCount: 0,
            status: 'active',
          };
          const versions = (ws.keywordVersions ?? []).map(v => v.status === 'active' ? { ...v, status: 'archived' as const } : v);
          return patchWorkspace(s, id, {
            keywordList: keywords.map(k => ({ ...k, keywordListVersion: nextVersion })),
            keywordListUploadedAt: new Date().toISOString(),
            keywordListVersion: nextVersion,
            keywordVersions: [...versions, version],
          });
        }),

      mergeKeywordList: (id, newKeywords, fileName) =>
        set((s) => {
          const ws = s.workspaces[id];
          if (!ws) return s;
          const nextVersion = ws.keywordListVersion + 1;
          const existingNorms = new Set(ws.keywordList.map(k => k.normalizedKeyword));
          const toAdd = newKeywords.filter(k => !existingNorms.has(k.normalizedKeyword));
          const merged = [...ws.keywordList, ...toAdd.map(k => ({ ...k, keywordListVersion: nextVersion }))];
          const version: KeywordListVersion = {
            versionId: genId(),
            workspaceId: id,
            fileName,
            uploadedAt: new Date().toISOString(),
            keywordCount: merged.length,
            activeKeywordCount: merged.filter(k => k.status === 'active').length,
            archivedKeywordCount: merged.filter(k => k.status === 'archived').length,
            status: 'active',
          };
          const versions = (ws.keywordVersions ?? []).map(v => v.status === 'active' ? { ...v, status: 'archived' as const } : v);
          return patchWorkspace(s, id, {
            keywordList: merged,
            keywordListUploadedAt: new Date().toISOString(),
            keywordListVersion: nextVersion,
            keywordVersions: [...versions, version],
          });
        }),

      archiveKeywordVersion: (id, versionId) =>
        set((s) => {
          const ws = s.workspaces[id];
          if (!ws) return s;
          const versions = (ws.keywordVersions ?? []).map(v => v.versionId === versionId ? { ...v, status: 'archived' as const } : v);
          return patchWorkspace(s, id, { keywordVersions: versions });
        }),

      activateKeywordVersion: (id, versionId) =>
        set((s) => {
          const ws = s.workspaces[id];
          if (!ws) return s;
          const versions = (ws.keywordVersions ?? []).map(v => ({
            ...v,
            status: v.versionId === versionId ? 'active' as const : 'archived' as const,
          }));
          return patchWorkspace(s, id, { keywordVersions: versions });
        }),

      archiveKeyword: (workspaceId, keywordId) =>
        set((s) => {
          const ws = s.workspaces[workspaceId];
          if (!ws) return s;
          const keywordList = ws.keywordList.map(k =>
            k.keywordId === keywordId ? { ...k, status: 'archived' as const } : k
          );
          return patchWorkspace(s, workspaceId, { keywordList });
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

      addGeneratedContent: (workspaceId, content) =>
        set((s) => {
          const ws = s.workspaces[workspaceId];
          if (!ws) return s;
          const existing = ws.generatedContent ?? [];
          return patchWorkspace(s, workspaceId, {
            generatedContent: [content, ...existing],
          });
        }),

      updateGeneratedContent: (workspaceId, contentId, patch) =>
        set((s) => {
          const ws = s.workspaces[workspaceId];
          if (!ws) return s;
          const content = (ws.generatedContent ?? []).map((c) =>
            c.contentId === contentId
              ? { ...c, ...patch, updatedAt: new Date().toISOString() }
              : c
          );
          return patchWorkspace(s, workspaceId, { generatedContent: content });
        }),

      updateContentStatus: (workspaceId, contentId, status, date) =>
        set((s) => {
          const ws = s.workspaces[workspaceId];
          if (!ws) return s;
          const now = new Date().toISOString();
          const content = (ws.generatedContent ?? []).map((c) => {
            if (c.contentId !== contentId) return c;
            return {
              ...c,
              contentStatus: status,
              scheduledDate: status === 'scheduled' ? (date ?? now) : c.scheduledDate,
              publishedDate: status === 'published' ? (date ?? now) : c.publishedDate,
              updatedAt: now,
            };
          });
          return patchWorkspace(s, workspaceId, { generatedContent: content });
        }),

      deleteGeneratedContent: (workspaceId, contentId) =>
        set((s) => {
          const ws = s.workspaces[workspaceId];
          if (!ws) return s;
          return patchWorkspace(s, workspaceId, {
            generatedContent: (ws.generatedContent ?? []).filter((c) => c.contentId !== contentId),
          });
        }),
    }),
    { name: 'nxflow-seo-workspaces', version: 2 }
  )
);
