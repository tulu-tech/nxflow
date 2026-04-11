'use client';
import { useState, useCallback } from 'react';
import { Group, Task, ColumnSchema } from '@/lib/types';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { GroupHeader } from './GroupHeader';
import { TaskRow } from './TaskRow';
import { TaskRowAdder } from './TaskRowAdder';
import { ColumnHeader } from './ColumnHeader';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  group: Group;
  columns: ColumnSchema[];
  tasks: Task[];
  allTasks: Task[];
}

export function GroupSection({ group, columns, tasks, allTasks }: Props) {
  const { reorderTasks } = useWorkspaceStore();
  const [dragId, setDragId] = useState<string | null>(null);

  const moveTask = useCallback(
    (taskId: string, direction: 'up' | 'down') => {
      const idx = tasks.findIndex((t) => t.id === taskId);
      if (idx === -1) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= tasks.length) return;
      reorderTasks(group.id, taskId, tasks[swapIdx].id);
    },
    [tasks, group.id, reorderTasks]
  );

  // Status summary for bottom bar
  const statusCounts: Record<string, { color: string; count: number }> = {};
  allTasks.forEach((t) => {
    const cell = t.cells['status'];
    if (cell?.type === 'status') {
      const sid = cell.statusId;
      if (!statusCounts[sid]) {
        // Look up color from known statuses
        const colors: Record<string, string> = {
          done: '#00c875',
          working: '#fdab3d',
          stuck: '#e2445c',
          'not-started': '#c4c4c4',
          'in-review': '#a358df',
        };
        statusCounts[sid] = { color: colors[sid] || '#666', count: 0 };
      }
      statusCounts[sid].count++;
    }
  });
  const total = allTasks.length || 1;

  return (
    <div style={{ marginBottom: 8, padding: '0 16px' }}>
      <GroupHeader group={group} tasks={allTasks} />

      {!group.collapsed && (
        <div style={{ overflow: 'auto', borderRadius: '0 0 8px 8px' }}>
          <table className="board-table" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 42 }} />
              {columns.map((col) => (
                <col key={col.id} style={{ width: col.width }} />
              ))}
              <col style={{ width: 36 }} />
            </colgroup>

            <thead>
              <tr style={{ borderLeft: `4px solid ${group.color}` }}>
                <th
                  style={{
                    background: 'var(--bg-elevated)',
                    borderBottom: '1px solid var(--border-subtle)',
                    padding: '0 8px',
                  }}
                />
                {columns.map((col) => (
                  <ColumnHeader key={col.id} column={col} />
                ))}
                <th
                  style={{
                    background: 'var(--bg-elevated)',
                    borderBottom: '1px solid var(--border-subtle)',
                    textAlign: 'center',
                    padding: 0,
                  }}
                >
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: 18,
                      lineHeight: 1,
                      width: '100%',
                      padding: '4px 0',
                    }}
                    title="Add column"
                  >
                    +
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              {tasks.map((task, idx) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  columns={columns}
                  groupColor={group.color}
                  isFirst={idx === 0}
                  isLast={idx === tasks.length - 1}
                  onMoveUp={() => moveTask(task.id, 'up')}
                  onMoveDown={() => moveTask(task.id, 'down')}
                />
              ))}

              {tasks.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    style={{
                      padding: '14px 16px',
                      color: 'var(--text-muted)',
                      fontSize: 12.5,
                      fontStyle: 'italic',
                      background: 'var(--bg-surface)',
                      borderLeft: `4px solid ${group.color}`,
                      textAlign: 'center',
                    }}
                  >
                    No tasks match your current filters
                  </td>
                </tr>
              )}

              <TaskRowAdder groupId={group.id} columnsCount={columns.length} groupColor={group.color} />

              {/* Status summary row */}
              <tr style={{ borderLeft: `4px solid ${group.color}` }}>
                <td style={{ padding: 0, background: 'var(--bg-base)', borderBottom: 'none' }} />
                {columns.map((col, ci) => (
                  <td
                    key={col.id}
                    style={{
                      padding: ci === 0 ? '0' : '4px 8px',
                      background: 'var(--bg-base)',
                      borderBottom: 'none',
                    }}
                  >
                    {col.type === 'status' && allTasks.length > 0 && (
                      <div
                        style={{
                          height: 6,
                          borderRadius: 3,
                          overflow: 'hidden',
                          display: 'flex',
                          gap: 1,
                        }}
                      >
                        {Object.entries(statusCounts).map(([sid, { color, count }]) => (
                          <div
                            key={sid}
                            style={{
                              flex: count,
                              background: color,
                              borderRadius: 2,
                              transition: 'flex 0.3s ease',
                            }}
                            title={`${count} tasks`}
                          />
                        ))}
                      </div>
                    )}
                    {col.type === 'timeline' && allTasks.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div
                          className="timeline-pill"
                          style={{
                            height: 20,
                            fontSize: 10,
                            padding: '0 8px',
                            opacity: 0.6,
                            cursor: 'default',
                          }}
                        >
                          {(() => {
                            let earliest = '9999';
                            let latest = '0000';
                            allTasks.forEach((t) => {
                              const tc = t.cells['timeline'];
                              if (tc?.type === 'timeline') {
                                if (tc.start && tc.start < earliest) earliest = tc.start;
                                if (tc.end && tc.end > latest) latest = tc.end;
                              }
                            });
                            if (earliest === '9999') return '—';
                            const fmtShort = (d: string) => {
                              const parts = d.split('-');
                              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                              return `${months[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}`;
                            };
                            return `${fmtShort(earliest)} — ${fmtShort(latest)}`;
                          })()}
                        </div>
                      </div>
                    )}
                  </td>
                ))}
                <td style={{ background: 'var(--bg-base)', borderBottom: 'none' }} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
