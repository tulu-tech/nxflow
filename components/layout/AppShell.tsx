'use client';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { useWorkspaceStore } from '@/store/workspaceStore';

export function AppShell({ children }: { children: React.ReactNode }) {
  const loadWorkspace = useWorkspaceStore((s) => s.loadWorkspace);
  const isLoading = useWorkspaceStore((s) => s.isLoading);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-base)',
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          position: 'relative',
        }}
      >
        {isLoading ? (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-surface)',
            zIndex: 10,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>NXFlow yükleniyor…</div>
            </div>
          </div>
        ) : children}
      </main>
    </div>
  );
}
