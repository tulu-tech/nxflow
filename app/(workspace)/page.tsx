'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '@/store/workspaceStore';

export default function RootPage() {
  const router = useRouter();
  const activeBoardId = useWorkspaceStore((s) => s.activeBoardId);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const boards = useWorkspaceStore((s) => s.boards);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const addBoard = useWorkspaceStore((s) => s.addBoard);

  useEffect(() => {
    if (!isLoading && activeBoardId) {
      router.replace(`/board/${activeBoardId}`);
    }
  }, [activeBoardId, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Yükleniyor…</div>
      </div>
    );
  }

  const hasBoards = Object.keys(boards).length > 0;
  if (hasBoards && activeBoardId) return null; // redirect in progress

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
          NXFlow&apos;a hoş geldin!
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Henüz hiç board yok. İlk board&apos;unu oluşturarak başla.
        </p>
        <button
          onClick={() => {
            if (activeWorkspaceId) {
              addBoard(activeWorkspaceId, 'İlk Board');
            }
          }}
          style={{
            padding: '10px 24px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 600, color: '#fff',
            cursor: 'pointer', letterSpacing: '0.2px',
            boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            fontFamily: 'inherit',
          }}
        >
          + İlk Board&apos;u Oluştur
        </button>
      </div>
    </div>
  );
}

