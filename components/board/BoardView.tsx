'use client';
import { useMemo } from 'react';
import { Board, Task, FilterState, SortState } from '@/lib/types';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useUIStore } from '@/store/uiStore';
import { GroupSection } from '@/components/table/GroupSection';
import { Plus } from 'lucide-react';

interface Props {
  board: Board;
}

function applyFiltersAndSort(tasks: Task[], filter: FilterState, sort: SortState): Task[] {
  let result = [...tasks];

  // Search
  if (filter.searchQuery) {
    const q = filter.searchQuery.toLowerCase();
    result = result.filter((t) => t.name.toLowerCase().includes(q));
  }

  // Assignee filter
  if (filter.assigneeIds.length > 0) {
    result = result.filter((t) => {
      const cell = t.cells['assignee'];
      if (!cell || cell.type !== 'assignee') return false;
      return cell.userIds.some((id) => filter.assigneeIds.includes(id));
    });
  }

  // Status filter
  if (filter.statusIds.length > 0) {
    result = result.filter((t) => {
      const cell = t.cells['status'];
      if (!cell || cell.type !== 'status') return false;
      return filter.statusIds.includes(cell.statusId);
    });
  }

  // Sort
  if (sort.field) {
    result.sort((a, b) => {
      const dir = sort.direction === 'asc' ? 1 : -1;

      if (sort.field === 'name') {
        return a.name.localeCompare(b.name) * dir;
      }

      if (sort.field === 'status') {
        const aCell = a.cells['status'];
        const bCell = b.cells['status'];
        const aStatus = aCell?.type === 'status' ? aCell.statusId : '';
        const bStatus = bCell?.type === 'status' ? bCell.statusId : '';
        return aStatus.localeCompare(bStatus) * dir;
      }

      if (sort.field === 'timeline') {
        const aCell = a.cells['timeline'];
        const bCell = b.cells['timeline'];
        const aStart = aCell?.type === 'timeline' ? (aCell.start ?? '') : '';
        const bStart = bCell?.type === 'timeline' ? (bCell.start ?? '') : '';
        return aStart.localeCompare(bStart) * dir;
      }

      return 0;
    });
  }

  return result;
}

export function BoardView({ board }: Props) {
  const { groups, tasks, addGroup } = useWorkspaceStore();
  const { filter, sort } = useUIStore();

  const boardGroups = useMemo(
    () => board.groupIds.map((id) => groups[id]).filter(Boolean),
    [board.groupIds, groups]
  );

  const filteredTasksByGroup = useMemo(() => {
    const map: Record<string, Task[]> = {};
    boardGroups.forEach((group) => {
      const groupTasks = group.taskIds.map((id) => tasks[id]).filter(Boolean);
      map[group.id] = applyFiltersAndSort(groupTasks, filter, sort);
    });
    return map;
  }, [boardGroups, tasks, filter, sort]);

  const hasActiveFilters = filter.assigneeIds.length > 0 || filter.statusIds.length > 0 || filter.searchQuery;

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px 0 40px',
      }}
    >
      {boardGroups.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60%',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 40 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>No groups yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Create your first group to get started</div>
          <button
            onClick={() => addGroup(board.id, 'New Group')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--accent-primary)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            <Plus size={14} />
            Add group
          </button>
        </div>
      ) : (
        <>
          {boardGroups.map((group) => (
            <GroupSection
              key={group.id}
              group={group}
              columns={board.columns}
              tasks={filteredTasksByGroup[group.id] ?? []}
              allTasks={group.taskIds.map((id) => tasks[id]).filter(Boolean)}
            />
          ))}

          {/* Add group button */}
          <div style={{ padding: '8px 24px' }}>
            <button
              onClick={() => addGroup(board.id, 'New Group')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px dashed var(--border-default)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: 12.5,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'color 0.1s, border-color 0.1s',
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
              }}
            >
              <Plus size={13} />
              Add group
            </button>
          </div>
        </>
      )}
    </div>
  );
}
