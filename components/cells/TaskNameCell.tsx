'use client';
import { useState } from 'react';
import { Task } from '@/lib/types';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useUIStore } from '@/store/uiStore';
import { ExternalLink, ChevronRight, ChevronDown } from 'lucide-react';

interface Props {
  task: Task;
}

export function TaskNameCell({ task }: Props) {
  const { updateTaskName } = useWorkspaceStore();
  const subtasks = useWorkspaceStore((s) =>
    Object.values(s.subtasks).filter((st) => st.taskId === task.id)
  );
  const expandedTaskIds = useUIStore((s) => s.expandedTaskIds);
  const toggleTaskExpanded = useUIStore((s) => s.toggleTaskExpanded);

  const isExpanded = expandedTaskIds.includes(task.id);
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((st) => st.completed).length;

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.name);

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
        <div style={{ width: 14, flexShrink: 0 }} />
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') {
              setValue(task.name);
              setEditing(false);
            }
          }}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 13,
            fontWeight: 400,
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            marginLeft: 6,
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
        minWidth: 0,
      }}
    >
      {/* Expand/collapse toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleTaskExpanded(task.id);
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: totalSubtasks > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          width: 14,
          flexShrink: 0,
          opacity: totalSubtasks > 0 || isExpanded ? 1 : 0,
          transition: 'opacity 0.1s',
        }}
        className={totalSubtasks === 0 && !isExpanded ? 'row-actions' : ''}
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Task name */}
      <span
        onClick={() => setEditing(true)}
        style={{
          fontSize: 13,
          color: 'var(--text-primary)',
          fontWeight: 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          cursor: 'text',
        }}
      >
        {task.name}
      </span>

      {/* Subtask count badge */}
      {totalSubtasks > 0 && (
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: completedSubtasks === totalSubtasks ? '#00c875' : 'var(--text-muted)',
            background: 'var(--bg-active)',
            padding: '1px 6px',
            borderRadius: 4,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {completedSubtasks}/{totalSubtasks}
        </span>
      )}

      <ExternalLink
        size={11}
        style={{ flexShrink: 0, color: 'var(--text-muted)', opacity: 0 }}
        className="row-actions"
      />
    </div>
  );
}
