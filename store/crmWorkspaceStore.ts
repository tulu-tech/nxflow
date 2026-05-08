import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface CrmWorkspace {
  id: string
  name: string
  icon: string
  email_signature?: string | null
}

interface CrmWorkspaceState {
  workspaces: CrmWorkspace[]
  activeWorkspaceId: string | null
  setWorkspaces: (ws: CrmWorkspace[]) => void
  setActiveWorkspace: (id: string) => void
  updateWorkspace: (id: string, patch: Partial<CrmWorkspace>) => void
  removeWorkspace: (id: string) => void
  activeSignature: () => string | null
}

export const useCrmWorkspaceStore = create<CrmWorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: null,
      setWorkspaces: (workspaces) => set({ workspaces }),
      setActiveWorkspace: (id) => {
        set({ activeWorkspaceId: id })
        if (typeof document !== "undefined") {
          document.cookie = `crm_workspace_id=${id}; path=/; max-age=31536000; SameSite=Lax`
        }
      },
      updateWorkspace: (id, patch) =>
        set((s) => ({ workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
      activeSignature: () => {
        const { workspaces, activeWorkspaceId } = get()
        return workspaces.find((w) => w.id === activeWorkspaceId)?.email_signature ?? null
      },
      removeWorkspace: (id) => {
        const { workspaces, activeWorkspaceId } = get()
        const remaining = workspaces.filter((w) => w.id !== id)
        const nextActive =
          activeWorkspaceId === id ? (remaining[0]?.id ?? null) : activeWorkspaceId
        set({ workspaces: remaining, activeWorkspaceId: nextActive })
        if (nextActive && typeof document !== "undefined") {
          document.cookie = `crm_workspace_id=${nextActive}; path=/; max-age=31536000; SameSite=Lax`
        }
      },
    }),
    {
      name: "nxflow-crm-workspace",
    }
  )
)
