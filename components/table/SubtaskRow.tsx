'use client';

import { useState } from 'react';
import { Subtask } from '@/lib/types';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Check, Trash2 } from 'lucide-react';

interface Props {
  subtask: Subtask;
  groupColor: string;
  colSpan: number;
}

export function SubtaskRow({ subtask, groupColor, colSpan }: Props) {
  const { toggleSubtask, deleteSubtask, updateSubtaskName } = useWorkspaceStore();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(subtask.name);

  const save = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== subtask.name) {
      updateSubtaskName(subtask.id, trimmed);
    } else {
      setValue(subtask.name);
    }
    setEditing(false);
  };

  return (
    <tr className="subtask-row" style={{ height: 32 }}>
      {/* Checkbox cell */}
      <td
        style={{
          background: 'var(--bg-elevated)',
          padding: '0 4px',
          borderLeft: `4px solid ${groupColor}`,
        }}
      >
        <button
          onClick={() => toggleSubtask(subtask.id)}
          style={{
            width: 16,
            height: 16,
            borderRadius: 3,
            border: `1.5px solid ${subtask.completed ? '#00c875' : 'var(--border-strong)'}`,
            background: subtask.completed ? '#00c875' : 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 10,
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          {subtask.completed && <Check size={10} color="#fff" strokeWidth={3} />}
        </button>
      </td>

      {/* Name + actions */}
      <td
        colSpan={colSpan}
        style={{
          background: 'var(--bg-elevated)',
          padding: '0 10px 0 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Tree line indicator */}
          <div
            style={{
              width: 10,
              borderLeft: '1px solid var(--border-default)',
              borderBottom: '1px solid var(--border-default)',
              height: 10,
              marginTop: -5,
              flexShrink: 0,
            }}
          />

          {editing ? (
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
                if (e.key === 'Escape') {
                  setValue(subtask.name);
                  setEditing(false);
                }
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 12.5,
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                padding: '2px 0',
              }}
            />
          ) : (
            <span
              onClick={() => setEditing(true)}
              style={{
                flex: 1,
                fontSize: 12.5,
                color: subtask.completed ? 'var(--text-muted)' : 'var(--text-secondary)',
                textDecoration: subtask.completed ? 'line-through' : 'none',
                cursor: 'text',
                padding: '2px 0',
              }}
            >
              {subtask.name}
            </span>
          )}

          <button
            onClick={() => {
              if (confirm(`Delete subtask "${subtask.name}"?`)) {
                deleteSubtask(subtask.id);
              }
            }}
            title="Delete subtask"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 3,
              opacity: 0.4,
              transition: 'opacity 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.color = '#e2445c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.4';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
}
