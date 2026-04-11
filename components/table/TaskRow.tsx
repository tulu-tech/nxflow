'use client';
import { Task, ColumnSchema } from '@/lib/types';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { CellRenderer } from '@/components/cells/CellRenderer';
import { GripVertical, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  task: Task;
  columns: ColumnSchema[];
  groupColor: string;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function TaskRow({ task, columns, groupColor, isFirst, isLast, onMoveUp, onMoveDown }: Props) {
  const { deleteTask } = useWorkspaceStore();

  return (
    <tr
      className="task-row"
      data-task-id={task.id}
    >
      {/* Reorder + actions cell */}
      <td
        style={{
          background: 'var(--bg-surface)',
          padding: '0 2px',
          borderLeft: `4px solid ${groupColor}`,
          width: 42,
        }}
      >
        <div className="row-actions" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              style={{
                background: 'none',
                border: 'none',
                cursor: isFirst ? 'default' : 'pointer',
                color: isFirst ? 'transparent' : 'var(--text-muted)',
                padding: '0 1px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: 2,
                lineHeight: 1,
              }}
              title="Move up"
            >
              <ChevronUp size={10} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              style={{
                background: 'none',
                border: 'none',
                cursor: isLast ? 'default' : 'pointer',
                color: isLast ? 'transparent' : 'var(--text-muted)',
                padding: '0 1px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: 2,
                lineHeight: 1,
              }}
              title="Move down"
            >
              <ChevronDown size={10} />
            </button>
          </div>
          <button
            onClick={() => deleteTask(task.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '2px 2px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 3,
              marginLeft: 1,
            }}
            title="Delete task"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </td>

      {/* Data cells */}
      {columns.map((col) => (
        <td
          key={col.id}
          style={{
            background: 'var(--bg-surface)',
            padding: 0,
            position: 'relative',
            overflow: 'visible',
          }}
        >
          <CellRenderer task={task} column={col} />
        </td>
      ))}

      {/* Add col spacer */}
      <td style={{ background: 'var(--bg-surface)' }} />
    </tr>
  );
}
