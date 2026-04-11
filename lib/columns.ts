import { ColumnSchema, StatusOption } from './types';

export const DEFAULT_COLUMNS: ColumnSchema[] = [
  { id: 'task-name', type: 'task-name', label: 'Task', width: 380, sortable: true, filterable: false },
  { id: 'assignee', type: 'assignee', label: 'People', width: 120, sortable: false, filterable: true },
  { id: 'status', type: 'status', label: 'Status', width: 150, sortable: true, filterable: true },
  { id: 'timeline', type: 'timeline', label: 'Timeline', width: 170, sortable: true, filterable: false },
  { id: 'link', type: 'link', label: 'Link', width: 120, sortable: false, filterable: false },
];

export const STATUS_OPTIONS: StatusOption[] = [
  { id: 'done', label: 'Done', color: '#00c875', textColor: '#ffffff' },
  { id: 'working', label: 'Working on it', color: '#fdab3d', textColor: '#ffffff' },
  { id: 'stuck', label: 'Stuck', color: '#e2445c', textColor: '#ffffff' },
  { id: 'not-started', label: 'Not Started', color: '#c4c4c4', textColor: '#333333' },
  { id: 'in-review', label: 'In Review', color: '#a358df', textColor: '#ffffff' },
];
