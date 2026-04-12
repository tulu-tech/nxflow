'use client';

import { useState } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Plus } from 'lucide-react';

interface Props {
  taskId: string;
  groupColor: string;
  colSpan: number;
}

export function SubtaskAdder({ taskId, groupColor, colSpan }: Props) {
  const { addSubtask } = useWorkspaceStore();
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');

  const save = () => {
    const trimmed = value.trim();
    if (trimmed) {
      addSubtask(taskId, trimmed);
    }
    setValue('');
    setAdding(false);
  };

  if (adding) {
    return (
      <tr style={{ height: 30 }}>
        <td
          style={{
            background: 'var(--bg-elevated)',
            borderLeft: `4px solid ${groupColor}`,
            padding: 0,
          }}
        />
        <td
          colSpan={colSpan}
          style={{
            background: 'var(--bg-elevated)',
            padding: '0 10px 0 44px',
          }}
        >
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const trimmed = value.trim();
                if (trimmed) {
                  addSubtask(taskId, trimmed);
                  setValue('');
                  // Stay in adding mode
                }
              }
              if (e.key === 'Escape') {
                setValue('');
                setAdding(false);
              }
            }}
            placeholder="Subtask name…"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 12.5,
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              padding: '2px 0',
            }}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ height: 28 }}>
      <td
        style={{
          background: 'var(--bg-elevated)',
          borderLeft: `4px solid ${groupColor}`,
          padding: 0,
        }}
      />
      <td
        colSpan={colSpan}
        style={{
          background: 'var(--bg-elevated)',
          padding: '0 10px 0 32px',
        }}
      >
        <button
          onClick={() => setAdding(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 11.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 0',
            fontFamily: 'inherit',
            transition: 'color 0.1s',
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          <Plus size={12} />
          Add subtask
        </button>
      </td>
    </tr>
  );
}
