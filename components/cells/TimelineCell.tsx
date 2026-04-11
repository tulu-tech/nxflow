'use client';
import { useState, useRef, useCallback } from 'react';
import { Task } from '@/lib/types';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar, X } from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';

interface Props {
  task: Task;
}

function formatDate(d: string | null): string {
  if (!d) return '';
  try {
    const date = parseISO(d);
    if (!isValid(date)) return '';
    return format(date, 'MMM d');
  } catch {
    return '';
  }
}

export function TimelineCell({ task }: Props) {
  const { updateTaskCell } = useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const cell = task.cells['timeline'];
  const start = cell?.type === 'timeline' ? cell.start : null;
  const end = cell?.type === 'timeline' ? cell.end : null;

  const [localStart, setLocalStart] = useState(start ?? '');
  const [localEnd, setLocalEnd] = useState(end ?? '');

  // Sync local state when opening
  const handleOpen = () => {
    setLocalStart(start ?? '');
    setLocalEnd(end ?? '');
    setOpen(true);
  };

  const startFormatted = formatDate(start);
  const endFormatted = formatDate(end);
  const hasTimeline = start || end;

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTaskCell(task.id, 'timeline', { type: 'timeline', start: null, end: null });
  };

  const handleClose = useCallback(() => setOpen(false), []);

  const handleApply = () => {
    updateTaskCell(task.id, 'timeline', {
      type: 'timeline',
      start: localStart || null,
      end: localEnd || null,
    });
    setOpen(false);
  };

  return (
    <div
      ref={anchorRef}
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 8px', height: 38 }}
    >
      {hasTimeline ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={handleOpen} className="timeline-pill">
            <Calendar size={10} />
            {startFormatted}
            {endFormatted && startFormatted !== endFormatted && (
              <> — {endFormatted}</>
            )}
          </button>
          <button
            onClick={clear}
            className="row-actions"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 2, display: 'flex',
              alignItems: 'center', borderRadius: 3,
            }}
          >
            <X size={10} />
          </button>
        </div>
      ) : (
        <button
          onClick={handleOpen}
          style={{
            background: 'none',
            border: '1px dashed var(--border-strong)',
            borderRadius: 100,
            padding: '3px 10px',
            fontSize: 11,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Calendar size={10} />
          Set date
        </button>
      )}

      <Dropdown anchorRef={anchorRef} open={open} onClose={handleClose} width={260}>
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Set timeline
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 4 }}>Start date</div>
              <input
                type="date"
                value={localStart}
                onChange={(e) => setLocalStart(e.target.value)}
                style={{
                  width: '100%', background: 'var(--bg-active)',
                  border: '1px solid var(--border-default)', borderRadius: 6,
                  padding: '6px 10px', fontSize: 12.5, color: 'var(--text-primary)',
                  outline: 'none', colorScheme: 'dark', fontFamily: 'inherit',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 4 }}>End date</div>
              <input
                type="date"
                value={localEnd}
                onChange={(e) => setLocalEnd(e.target.value)}
                style={{
                  width: '100%', background: 'var(--bg-active)',
                  border: '1px solid var(--border-default)', borderRadius: 6,
                  padding: '6px 10px', fontSize: 12.5, color: 'var(--text-primary)',
                  outline: 'none', colorScheme: 'dark', fontFamily: 'inherit',
                }}
              />
            </div>
          </div>
          <button
            onClick={handleApply}
            style={{
              marginTop: 12, width: '100%', padding: '7px',
              background: 'var(--accent-primary)', border: 'none',
              borderRadius: 6, color: '#fff', fontWeight: 600,
              fontSize: 12.5, cursor: 'pointer',
            }}
          >
            Apply
          </button>
        </div>
      </Dropdown>
    </div>
  );
}
