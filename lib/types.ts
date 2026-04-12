// ─── Core Entities ──────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  icon: string;
  boardIds: string[];
}

export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  groupIds: string[];
  columns: ColumnSchema[];
  createdAt: string;
}

export interface Group {
  id: string;
  boardId: string;
  name: string;
  color: string; // hex or tailwind var
  taskIds: string[];
  collapsed: boolean;
}

export interface Task {
  id: string;
  groupId: string;
  boardId: string;
  name: string;
  cells: Record<string, CellValue>;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  name: string;
  completed: boolean;
  position: number;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  email?: string;
}

// ─── Column System ───────────────────────────────────────────────────────────

export type ColumnType =
  | 'task-name'
  | 'assignee'
  | 'status'
  | 'timeline'
  | 'link'
  | 'text'
  | 'number'
  | 'date';

export interface ColumnSchema {
  id: string;
  type: ColumnType;
  label: string;
  width: number;
  sortable: boolean;
  filterable: boolean;
}

// ─── Cell Values ─────────────────────────────────────────────────────────────

export type TaskNameCell = { type: 'task-name'; value: string };
export type AssigneeCell = { type: 'assignee'; userIds: string[] };
export type StatusCell = { type: 'status'; statusId: string };
export type TimelineCell = { type: 'timeline'; start: string | null; end: string | null };
export type LinkCell = { type: 'link'; url: string; label?: string };
export type TextCell = { type: 'text'; value: string };
export type NumberCell = { type: 'number'; value: number | null };
export type DateCellValue = { type: 'date'; value: string | null };

export type CellValue =
  | TaskNameCell
  | AssigneeCell
  | StatusCell
  | TimelineCell
  | LinkCell
  | TextCell
  | NumberCell
  | DateCellValue;

// ─── Status Options ───────────────────────────────────────────────────────────

export interface StatusOption {
  id: string;
  label: string;
  color: string;
  textColor: string;
}

// ─── UI State ────────────────────────────────────────────────────────────────

export type SortField = 'status' | 'timeline' | 'name' | null;
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  assigneeIds: string[];
  statusIds: string[];
  searchQuery: string;
}

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

// ─── Store Shape ─────────────────────────────────────────────────────────────

export interface AppState {
  workspaces: Record<string, Workspace>;
  boards: Record<string, Board>;
  groups: Record<string, Group>;
  tasks: Record<string, Task>;
  subtasks: Record<string, Subtask>;
  users: Record<string, User>;
  statusOptions: StatusOption[];
  activeWorkspaceId: string | null;
  activeBoardId: string | null;
}
