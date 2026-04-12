'use client';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { BoardHeader } from '@/components/board/BoardHeader';
import { BoardControls } from '@/components/board/BoardControls';
import { BoardView } from '@/components/board/BoardView';

export default function BoardPage() {
  const params = useParams();
  const boardId = params.boardId as string;
  const { boards, setActiveBoard } = useWorkspaceStore();

  useEffect(() => {
    setActiveBoard(boardId);
  }, [boardId, setActiveBoard]);

  const board = boards[boardId];

  if (!board) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔭</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Board not found</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <BoardHeader board={board} />
      <BoardControls />
      <BoardView board={board} />
    </div>
  );
}
