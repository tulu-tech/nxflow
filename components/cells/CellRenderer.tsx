'use client';
import { Task, ColumnSchema } from '@/lib/types';
import { TaskNameCell } from './TaskNameCell';
import { AssigneeCell } from './AssigneeCell';
import { StatusCell } from './StatusCell';
import { TimelineCell } from './TimelineCell';
import { LinkCell } from './LinkCell';

interface Props {
  task: Task;
  column: ColumnSchema;
}

export function CellRenderer({ task, column }: Props) {
  switch (column.type) {
    case 'task-name':
      return <TaskNameCell task={task} />;
    case 'assignee':
      return <AssigneeCell task={task} />;
    case 'status':
      return <StatusCell task={task} />;
    case 'timeline':
      return <TimelineCell task={task} />;
    case 'link':
      return <LinkCell task={task} />;
    default:
      return (
        <div style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 12 }}>
          —
        </div>
      );
  }
}
