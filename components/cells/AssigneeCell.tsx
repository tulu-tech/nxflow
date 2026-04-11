'use client';
import { useState, useRef, useCallback } from 'react';
import { Task } from '@/lib/types';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Plus, Check } from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';

interface Props {
  task: Task;
}

export function AssigneeCell({ task }: Props) {
  const { users, updateTaskCell } = useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const cell = task.cells['assignee'];
  const assignedIds: string[] = cell?.type === 'assignee' ? cell.userIds : [];
  const assignedUsers = assignedIds.map((id) => users[id]).filter(Boolean);

  const toggle = (userId: string) => {
    const newIds = assignedIds.includes(userId)
      ? assignedIds.filter((id) => id !== userId)
      : [...assignedIds, userId];
    updateTaskCell(task.id, 'assignee', { type: 'assignee', userIds: newIds });
  };

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '0 8px', height: 38, alignItems: 'center' }}>
      <div
        ref={anchorRef}
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}
      >
        {assignedUsers.length === 0 ? (
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: '1.5px dashed var(--border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={10} color="var(--text-muted)" />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {assignedUsers.slice(0, 3).map((user, i) => (
              <div
                key={user.id}
                className="avatar-circle"
                style={{
                  background: user.avatarColor,
                  marginLeft: i === 0 ? 0 : -8,
                  zIndex: assignedUsers.length - i,
                  position: 'relative',
                  fontSize: 9,
                }}
                title={user.name}
              >
                {user.initials}
              </div>
            ))}
            {assignedUsers.length > 3 && (
              <div
                className="avatar-circle"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '2px solid var(--bg-surface)',
                  marginLeft: -8,
                  fontSize: 9,
                  color: 'var(--text-secondary)',
                  fontWeight: 700,
                }}
              >
                +{assignedUsers.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      <Dropdown anchorRef={anchorRef} open={open} onClose={handleClose} width={220}>
        <div style={{ padding: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px 6px' }}>
            Assign people
          </div>
          {Object.values(users).map((user) => {
            const selected = assignedIds.includes(user.id);
            return (
              <div
                key={user.id}
                onClick={() => toggle(user.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: selected ? 'rgba(99,102,241,0.1)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseOver={(e) => { if (!selected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseOut={(e) => { if (!selected) e.currentTarget.style.background = selected ? 'rgba(99,102,241,0.1)' : 'transparent'; }}
              >
                <div
                  className="avatar-circle"
                  style={{ background: user.avatarColor, border: 'none', width: 22, height: 22, fontSize: 9 }}
                >
                  {user.initials}
                </div>
                <span style={{ fontSize: 12.5, color: 'var(--text-primary)', flex: 1 }}>{user.name}</span>
                {selected && <Check size={12} color="var(--text-accent)" />}
              </div>
            );
          })}
        </div>
      </Dropdown>
    </div>
  );
}
