'use client';
import { useState, useRef, useCallback } from 'react';
import { Task } from '@/lib/types';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { STATUS_OPTIONS } from '@/lib/columns';
import { Dropdown } from '@/components/ui/Dropdown';

interface Props {
  task: Task;
}

export function StatusCell({ task }: Props) {
  const { updateTaskCell } = useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const cell = task.cells['status'];
  const statusId = cell?.type === 'status' ? cell.statusId : 'not-started';
  const status = STATUS_OPTIONS.find((s) => s.id === statusId) ?? STATUS_OPTIONS[3];

  const select = (id: string) => {
    updateTaskCell(task.id, 'status', { type: 'status', statusId: id });
    setOpen(false);
  };

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <div style={{ padding: '0 8px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: 38 }}>
      <button
        ref={anchorRef}
        onClick={() => setOpen(!open)}
        className="status-pill"
        style={{
          background: status.color,
          color: status.textColor,
        }}
      >
        {status.label}
      </button>

      <Dropdown anchorRef={anchorRef} open={open} onClose={handleClose} width={180}>
        <div style={{ padding: '8px 10px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Set status
        </div>
        {STATUS_OPTIONS.map((opt) => (
          <div
            key={opt.id}
            onClick={() => select(opt.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 10px',
              cursor: 'pointer',
              background: opt.id === statusId ? 'rgba(255,255,255,0.05)' : 'transparent',
              transition: 'background 0.1s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseOut={(e) => (e.currentTarget.style.background = opt.id === statusId ? 'rgba(255,255,255,0.05)' : 'transparent')}
          >
            <div
              style={{
                width: 32,
                height: 20,
                borderRadius: 4,
                background: opt.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: opt.id === statusId ? 600 : 400 }}>
              {opt.label}
            </span>
            {opt.id === statusId && (
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>✓</span>
            )}
          </div>
        ))}
      </Dropdown>
    </div>
  );
}
