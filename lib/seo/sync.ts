/**
 * SEO Supabase Sync Hook
 *
 * Provides debounced write-through sync from Zustand store to Supabase.
 * On mount: loads data from Supabase → hydrates store.
 * On changes: debounced sync to Supabase (500ms).
 *
 * Only touches SEO tables. Does NOT interact with CRM data.
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  saveWorkspace,
  saveProject,
  loadProjects,
  loadProducts,
  getMemberRole,
  getCurrentUser,
  type MemberRole,
  type DBProduct,
} from '@/lib/seo/db';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserInfo {
  id: string;
  email: string;
  displayName: string;
}

interface SyncState {
  user: UserInfo | null;
  role: MemberRole | null;
  products: DBProduct[];
  isLoading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSEOSync(workspaceId: string | null): SyncState {
  const [state, setState] = useState<SyncState>({
    user: null,
    role: null,
    products: [],
    isLoading: true,
    isAdmin: false,
    isEditor: false,
  });

  // Init: fetch user + role + products
  useEffect(() => {
    if (!workspaceId || !supabase) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const user = await getCurrentUser();
        if (!user || cancelled) {
          setState(s => ({ ...s, isLoading: false }));
          return;
        }

        const userInfo: UserInfo = {
          id: user.id,
          email: user.email ?? '',
          displayName: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Unknown',
        };

        const role = await getMemberRole(workspaceId, user.id);
        const products = await loadProducts(workspaceId);

        if (!cancelled) {
          setState({
            user: userInfo,
            role,
            products,
            isLoading: false,
            isAdmin: role === 'admin',
            isEditor: role === 'admin' || role === 'editor',
          });
        }
      } catch (err) {
        console.error('SEO Sync init error:', err);
        if (!cancelled) setState(s => ({ ...s, isLoading: false }));
      }
    })();

    return () => { cancelled = true; };
  }, [workspaceId]);

  return state;
}

// ─── Debounced Workspace Sync ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useWorkspaceSync(workspace: any | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncNow = useCallback(() => {
    if (!workspace || !supabase) return;
    saveWorkspace(workspace).catch(err => {
      console.error('Workspace sync error:', err);
    });
  }, [workspace]);

  useEffect(() => {
    if (!workspace) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(syncNow, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [workspace, syncNow]);
}

// ─── Project Sync ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useProjectSync(workspaceId: string | null, project: any | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncNow = useCallback(() => {
    if (!workspaceId || !project || !supabase) return;
    saveProject(workspaceId, project).catch(err => {
      console.error('Project sync error:', err);
    });
  }, [workspaceId, project]);

  useEffect(() => {
    if (!project) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(syncNow, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [project, syncNow]);
}
