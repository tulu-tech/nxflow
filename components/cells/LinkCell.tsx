'use client';
import { useState, useRef } from 'react';
import { Task } from '@/lib/types';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Link2, ExternalLink, X } from 'lucide-react';

interface Props {
  task: Task;
}

export function LinkCell({ task }: Props) {
  const { updateTaskCell } = useWorkspaceStore();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  const cell = task.cells['link'];
  const url = cell?.type === 'link' ? cell.url : '';
  const label = cell?.type === 'link' ? (cell.label ?? '') : '';

  const save = () => {
    updateTaskCell(task.id, 'link', { type: 'link', url: value.trim() });
    setEditing(false);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTaskCell(task.id, 'link', { type: 'link', url: '' });
  };

  if (editing) {
    return (
      <div style={{ padding: '0 8px', display: 'flex', alignItems: 'center', height: 38 }}>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          placeholder="https://…"
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 12.5,
            color: '#7eb4ff',
            width: '100%',
            fontFamily: 'inherit',
          }}
        />
      </div>
    );
  }

  if (url) {
    return (
      <div style={{ padding: '0 8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, height: 38 }}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: '#7eb4ff',
            textDecoration: 'none',
            fontSize: 12,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <ExternalLink size={11} style={{ flexShrink: 0 }} />
          {label || new URL(url).hostname.replace('www.', '')}
        </a>
        <button
          onClick={clear}
          className="row-actions"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 3,
            flexShrink: 0,
          }}
        >
          <X size={10} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{ padding: '0 8px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: 38, cursor: 'pointer' }}
      onClick={() => { setValue(''); setEditing(true); }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          borderRadius: 4,
          border: '1px dashed var(--border-strong)',
          color: 'var(--text-muted)',
        }}
      >
        <Link2 size={11} />
      </div>
    </div>
  );
}
