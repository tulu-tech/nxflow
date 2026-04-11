'use client';
import { ColumnSchema } from '@/lib/types';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

interface Props {
  column: ColumnSchema;
}

export function ColumnHeader({ column }: Props) {
  const { sort, setSort } = useUIStore();
  const isActive = sort.field === column.type;

  const handleSort = () => {
    if (!column.sortable) return;
    if (isActive) {
      setSort({ field: column.type as any, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ field: column.type as any, direction: 'asc' });
    }
  };

  return (
    <th
      onClick={handleSort}
      style={{
        background: 'var(--bg-elevated)',
        padding: '7px 10px',
        textAlign: column.type === 'task-name' ? 'left' : 'center',
        fontWeight: 500,
        fontSize: 11.5,
        color: isActive ? 'var(--text-accent)' : 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        cursor: column.sortable ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'color 0.1s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          justifyContent: column.type === 'task-name' ? 'flex-start' : 'center',
        }}
      >
        {column.label}
        {isActive && (
          sort.direction === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
        )}
      </div>
    </th>
  );
}
