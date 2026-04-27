import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface CrmWorkspace {
  id: string
  name: string
  icon: string
}

interface CrmWorkspaceState {
  workspaces: CrmWorkspace[]
  activeWorkspaceId: string | null
  setWorkspaces: (ws: CrmWorkspace[]) => void
  setActiveWorkspace: (id: string) => void
}

export const useCrmWorkspaceStore = create<CrmWorkspaceState>()(
  persist(
    (set) => ({
      workspaces: [],
      activeWorkspaceId: null,
      setWorkspaces: (workspaces) => set({ workspaces }),
      setActiveWorkspace: (id) => {
        set({ activeWorkspaceId: id })
        // Write to cookie so server components can read it
        if (typeof document !== "undefined") {
          document.cookie = `crm_workspace_id=${id}; path=/; max-age=31536000; SameSite=Lax`
        }
      },
    }),
    {
      name: "nxflow-crm-workspace",
    }
  )
)
