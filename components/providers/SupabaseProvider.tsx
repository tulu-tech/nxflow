'use client';

import { useEffect, useRef, useState } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuthStore, CRM_SHARED_EMAIL, CRM_SHARED_PASSWORD } from '@/store/authStore';
import { supabase, createClient } from '@/lib/supabase/client';
import { LoginScreen } from '@/components/auth/LoginScreen';

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.currentUser);
  const initialize = useWorkspaceStore((s) => s.initialize);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const isInitialized = useWorkspaceStore((s) => s.isInitialized);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(false);

  // Wait for Zustand persist to rehydrate from localStorage
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    // If already hydrated (e.g. sync storage), set immediately
    if (useAuthStore.persist.hasHydrated()) {
      setHasHydrated(true);
    }
    return unsub;
  }, []);

  // After rehydration: make sure the Supabase session exists. Every PIN
  // user signs in as the shared CRM identity, so the CRM module doesn't
  // redirect to /login. Rendering is blocked until this resolves.
  useEffect(() => {
    if (!hasHydrated) return;

    // No PIN user → nothing to sync. Proceed to show LoginScreen.
    if (!currentUser) {
      setSupabaseReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const supaClient = createClient();
        const { data } = await supaClient.auth.getSession();
        if (!data.session) {
          await supaClient.auth.signInWithPassword({
            email: CRM_SHARED_EMAIL,
            password: CRM_SHARED_PASSWORD,
          });
        }
      } catch {
        // Silent — nxflow workspace still works without the CRM session
      } finally {
        if (!cancelled) setSupabaseReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, currentUser]);

  // Initialize data from Supabase when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      initialize();
    }
  }, [isAuthenticated, initialize]);

  // Set up realtime subscriptions after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const channel = supabase
      .channel('nxflow-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          const store = useWorkspaceStore.getState();
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            store._applyRealtimeEvent('tasks', 'upsert', payload.new);
          } else if (payload.eventType === 'DELETE') {
            store._applyRealtimeEvent('tasks', 'delete', payload.old);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups' },
        (payload) => {
          const store = useWorkspaceStore.getState();
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            store._applyRealtimeEvent('groups', 'upsert', payload.new);
          } else if (payload.eventType === 'DELETE') {
            store._applyRealtimeEvent('groups', 'delete', payload.old);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'boards' },
        (payload) => {
          const store = useWorkspaceStore.getState();
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            store._applyRealtimeEvent('boards', 'upsert', payload.new);
          } else if (payload.eventType === 'DELETE') {
            store._applyRealtimeEvent('boards', 'delete', payload.old);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subtasks' },
        (payload) => {
          const store = useWorkspaceStore.getState();
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            store._applyRealtimeEvent('subtasks', 'upsert', payload.new);
          } else if (payload.eventType === 'DELETE') {
            store._applyRealtimeEvent('subtasks', 'delete', payload.old);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isInitialized]);

  // Waiting for persist rehydration + Supabase session sync
  if (!hasHydrated || !supabaseReady) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0f0f13',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not authenticated → Login Screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0f0f13',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(99, 102, 241, 0.2)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ color: '#9ca3af', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
            Loading workspace…
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
