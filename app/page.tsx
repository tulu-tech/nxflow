'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '@/store/workspaceStore';

export default function RootPage() {
  const router = useRouter();
  const activeBoardId = useWorkspaceStore((s) => s.activeBoardId);

  useEffect(() => {
    if (activeBoardId) {
      router.replace(`/board/${activeBoardId}`);
    }
  }, [activeBoardId, router]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-[var(--text-muted)] text-sm">Loading workspace…</div>
    </div>
  );
}
