'use client';
import { useState, useRef } from 'react';
import { Task } from '@/lib/types';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ExternalLink } from 'lucide-react';

interface Props {
  task: Task;
}

export function TaskNameCell({ task }: Props) {
  const { updateTaskName } = useWorkspaceStore();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const save = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== task.name) {
      updateTaskName(task.id, trimmed);
    } else {
      setValue(task.name);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ padding: '4px 10px', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') { setValue(task.name); setEditing(false); }
          }}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 13,
            fontWeight: 400,
            color: 'var(--text-primary)',
            width: '100%',
            fontFamily: 'inherit',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '0 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        height: 38,
        cursor: 'text',
        minWidth: 0,
      }}
      onClick={() => setEditing(true)}
    >
      <span
        style={{
          fontSize: 13,
          color: 'var(--text-primary)',
          fontWeight: 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
      >
        {task.name}
      </span>
      <ExternalLink
        size={11}
        style={{ flexShrink: 0, color: 'var(--text-muted)', opacity: 0 }}
        className="row-actions"
      />
    </div>
  );
}
