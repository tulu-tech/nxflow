'use client';
import { useState } from 'react';
import { Group, Task } from '@/lib/types';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, Trash2 } from 'lucide-react';

interface Props {
  group: Group;
  tasks: Task[];
}

export function GroupHeader({ group, tasks }: Props) {
  const { toggleGroupCollapsed, updateGroupName, deleteGroup, addGroup } = useWorkspaceStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [showMenu, setShowMenu] = useState(false);

  const doneCount = tasks.filter((t) => {
    const cell = t.cells['status'];
    return cell?.type === 'status' && cell.statusId === 'done';
  }).length;

  const save = () => {
    updateGroupName(group.id, name.trim() || group.name);
    setEditing(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 4px',
        marginBottom: 2,
        position: 'relative',
      }}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => toggleGroupCollapsed(group.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: group.color,
          display: 'flex',
          alignItems: 'center',
          padding: 2,
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        {group.collapsed ? (
          <ChevronRight size={16} />
        ) : (
          <ChevronDown size={16} />
        )}
      </button>

      {/* Color accent bar */}
      <div
        style={{
          width: 12,
          height: 20,
          borderRadius: 3,
          background: group.color,
          flexShrink: 0,
        }}
      />

      {/* Group name */}
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setName(group.name); setEditing(false); } }}
          style={{
            background: 'var(--bg-elevated)',
            border: `1px solid ${group.color}`,
            borderRadius: 5,
            padding: '2px 8px',
            fontSize: 14,
            fontWeight: 700,
            color: group.color,
            outline: 'none',
            minWidth: 180,
          }}
        />
      ) : (
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: group.color,
            cursor: 'pointer',
            letterSpacing: '-0.2px',
          }}
          onClick={() => setEditing(true)}
        >
          {group.name}
        </span>
      )}

      {/* Task count badge */}
      <span
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 600,
          padding: '1px 7px',
          flexShrink: 0,
        }}
      >
        {tasks.length}
      </span>

      {doneCount > 0 && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          · {doneCount} done
        </span>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', opacity: 0, transition: 'opacity 0.15s' }}
        className="group-header-actions"
      >
        <button
          onClick={() => {}}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            borderRadius: 4,
            padding: '3px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11.5,
          }}
        >
          <Plus size={12} />
          Task
        </button>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              borderRadius: 4,
              padding: '3px 4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <MoreHorizontal size={14} />
          </button>
          {showMenu && (
            <div
              className="animate-fade-in"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 4px)',
                zIndex: 100,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                minWidth: 160,
                overflow: 'hidden',
              }}
            >
              <div
                onClick={() => { deleteGroup(group.id); setShowMenu(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 12.5,
                  color: '#f87171',
                }}
              >
                <Trash2 size={13} />
                Delete group
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .group-header-actions { opacity: 0; }
        div:hover > .group-header-actions { opacity: 1; }
      `}</style>
    </div>
  );
}
