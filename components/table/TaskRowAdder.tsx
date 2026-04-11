'use client';
import { useState, useRef } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Plus } from 'lucide-react';

interface Props {
  groupId: string;
  columnsCount: number;
  groupColor: string;
}

export function TaskRowAdder({ groupId, columnsCount, groupColor }: Props) {
  const { addTask } = useWorkspaceStore();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (name.trim()) {
      addTask(groupId, name.trim());
    }
    setName('');
    setIsAdding(false);
  };

  if (isAdding) {
    return (
      <tr style={{ background: 'var(--bg-surface)', borderLeft: `4px solid ${groupColor}` }}>
        <td style={{ padding: '0 8px', borderLeft: `4px solid ${groupColor}` }} />
        <td colSpan={columnsCount} style={{ padding: '6px 10px', background: 'var(--bg-active)' }}>
          <input
            ref={inputRef}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setIsAdding(false); setName(''); }
            }}
            onBlur={handleAdd}
            placeholder="Task name…"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 13,
              color: 'var(--text-primary)',
              width: '100%',
              fontFamily: 'inherit',
            }}
          />
        </td>
        <td style={{ background: 'var(--bg-active)' }} />
      </tr>
    );
  }

  return (
    <tr
      className="add-task-row task-row"
      onClick={() => setIsAdding(true)}
    >
      <td
        style={{
          padding: '6px 8px',
          background: 'var(--bg-surface)',
          borderLeft: `4px solid ${groupColor}`,
        }}
      />
      <td
        colSpan={columnsCount}
        style={{
          padding: '6px 10px',
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={12} />
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>Add task</span>
        </div>
      </td>
      <td style={{ background: 'var(--bg-surface)' }} />
    </tr>
  );
}
