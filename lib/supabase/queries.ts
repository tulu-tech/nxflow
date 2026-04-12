import { supabase } from './client';
import {
  AppState,
  Board,
  Group,
  Task,
  Subtask,
  User,
  Workspace,
  StatusOption,
  CellValue,
  ColumnSchema,
} from '../types';

// ─── DB → TypeScript Mappers ────────────────────────────────────────────────

export function mapUser(db: Record<string, unknown>): User {
  return {
    id: db.id as string,
    name: db.name as string,
    initials: db.initials as string,
    avatarColor: (db.avatar_color as string) || '#6366f1',
    email: db.email as string | undefined,
  };
}

export function mapBoard(db: Record<string, unknown>): Board {
  return {
    id: db.id as string,
    workspaceId: db.workspace_id as string,
    name: db.name as string,
    description: db.description as string | undefined,
    groupIds: (db.group_order as string[]) || [],
    columns: (db.columns as ColumnSchema[]) || [],
    createdAt: db.created_at as string,
  };
}

export function mapGroup(db: Record<string, unknown>): Group {
  return {
    id: db.id as string,
    boardId: db.board_id as string,
    name: db.name as string,
    color: (db.color as string) || '#6366f1',
    taskIds: (db.task_order as string[]) || [],
    collapsed: (db.collapsed as boolean) || false,
  };
}

export function mapTask(db: Record<string, unknown>): Task {
  return {
    id: db.id as string,
    groupId: db.group_id as string,
    boardId: db.board_id as string,
    name: db.name as string,
    cells: (db.cells as Record<string, CellValue>) || {},
    order: (db.order as number) || 0,
    createdAt: db.created_at as string,
    updatedAt: db.updated_at as string,
  };
}

export function mapSubtask(db: Record<string, unknown>): Subtask {
  return {
    id: db.id as string,
    taskId: db.task_id as string,
    name: db.name as string,
    completed: (db.completed as boolean) || false,
    position: (db.position as number) || 0,
    createdAt: db.created_at as string,
  };
}

export function mapStatusOption(db: Record<string, unknown>): StatusOption {
  return {
    id: db.id as string,
    label: db.label as string,
    color: db.color as string,
    textColor: (db.text_color as string) || '#ffffff',
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function arrayToRecord<T extends { id: string }>(items: T[]): Record<string, T> {
  const record: Record<string, T> = {};
  for (const item of items) {
    record[item.id] = item;
  }
  return record;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function loginWithPin(name: string, pin: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('name', name)
    .eq('pin', pin)
    .maybeSingle();

  if (error || !data) return null;
  return mapUser(data);
}

// ─── Fetch All Data ──────────────────────────────────────────────────────────

export async function fetchAllData(): Promise<AppState> {
  const [usersRes, workspacesRes, boardsRes, groupsRes, tasksRes, subtasksRes, statusRes] =
    await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('workspaces').select('*'),
      supabase.from('boards').select('*').order('created_at'),
      supabase.from('groups').select('*').order('position'),
      supabase.from('tasks').select('*').order('order'),
      supabase.from('subtasks').select('*').order('position'),
      supabase.from('status_options').select('*').order('position'),
    ]);

  const dbUsers = usersRes.data || [];
  const dbWorkspaces = workspacesRes.data || [];
  const dbBoards = boardsRes.data || [];
  const dbGroups = groupsRes.data || [];
  const dbTasks = tasksRes.data || [];
  const dbSubtasks = subtasksRes.data || [];
  const dbStatusOptions = statusRes.data || [];

  // Build boardIds per workspace
  const boardIdsByWorkspace: Record<string, string[]> = {};
  for (const b of dbBoards) {
    const wsId = b.workspace_id as string;
    if (!boardIdsByWorkspace[wsId]) boardIdsByWorkspace[wsId] = [];
    boardIdsByWorkspace[wsId].push(b.id as string);
  }

  const users = arrayToRecord(dbUsers.map(mapUser));
  const workspaces = arrayToRecord(
    dbWorkspaces.map((ws) => ({
      id: ws.id as string,
      name: ws.name as string,
      icon: (ws.icon as string) || 'W',
      boardIds: boardIdsByWorkspace[ws.id as string] || [],
    }))
  );
  const boards = arrayToRecord(dbBoards.map(mapBoard));
  const groups = arrayToRecord(dbGroups.map(mapGroup));
  const tasks = arrayToRecord(dbTasks.map(mapTask));
  const subtasks = arrayToRecord(dbSubtasks.map(mapSubtask));
  const statusOptions = dbStatusOptions.map(mapStatusOption);

  const firstWorkspaceId = dbWorkspaces[0]?.id as string | null;
  const firstBoardId = firstWorkspaceId
    ? boardIdsByWorkspace[firstWorkspaceId]?.[0] || null
    : null;

  return {
    users,
    workspaces,
    boards,
    groups,
    tasks,
    subtasks,
    statusOptions,
    activeWorkspaceId: firstWorkspaceId,
    activeBoardId: firstBoardId,
  };
}

// ─── Board CRUD ──────────────────────────────────────────────────────────────

export async function insertBoard(board: Board) {
  const { error } = await supabase.from('boards').insert({
    id: board.id,
    workspace_id: board.workspaceId,
    name: board.name,
    description: board.description || null,
    columns: board.columns,
    group_order: board.groupIds,
    created_at: board.createdAt,
  });
  if (error) console.error('[Supabase] insertBoard:', error);
}

export async function updateBoardDb(id: string, updates: Record<string, unknown>) {
  const { error } = await supabase.from('boards').update(updates).eq('id', id);
  if (error) console.error('[Supabase] updateBoard:', error);
}

export async function deleteBoardDb(id: string) {
  const { error } = await supabase.from('boards').delete().eq('id', id);
  if (error) console.error('[Supabase] deleteBoard:', error);
}

// ─── Group CRUD ──────────────────────────────────────────────────────────────

export async function insertGroup(group: Group, position: number) {
  const { error } = await supabase.from('groups').insert({
    id: group.id,
    board_id: group.boardId,
    name: group.name,
    color: group.color,
    task_order: group.taskIds,
    collapsed: group.collapsed,
    position,
  });
  if (error) console.error('[Supabase] insertGroup:', error);
}

export async function updateGroupDb(id: string, updates: Record<string, unknown>) {
  const { error } = await supabase.from('groups').update(updates).eq('id', id);
  if (error) console.error('[Supabase] updateGroup:', error);
}

export async function deleteGroupDb(id: string) {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) console.error('[Supabase] deleteGroup:', error);
}

// ─── Task CRUD ───────────────────────────────────────────────────────────────

export async function insertTask(task: Task) {
  const { error } = await supabase.from('tasks').insert({
    id: task.id,
    group_id: task.groupId,
    board_id: task.boardId,
    name: task.name,
    cells: task.cells,
    order: task.order,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  });
  if (error) console.error('[Supabase] insertTask:', error);
}

export async function updateTaskDb(id: string, updates: Record<string, unknown>) {
  const dbUpdates: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id);
  if (error) console.error('[Supabase] updateTask:', error);
}

export async function deleteTaskDb(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) console.error('[Supabase] deleteTask:', error);
}

// ─── Subtask CRUD ────────────────────────────────────────────────────────────

export async function insertSubtask(subtask: Subtask) {
  const { error } = await supabase.from('subtasks').insert({
    id: subtask.id,
    task_id: subtask.taskId,
    name: subtask.name,
    completed: subtask.completed,
    position: subtask.position,
    created_at: subtask.createdAt,
  });
  if (error) console.error('[Supabase] insertSubtask:', error);
}

export async function updateSubtaskDb(id: string, updates: Record<string, unknown>) {
  const { error } = await supabase.from('subtasks').update(updates).eq('id', id);
  if (error) console.error('[Supabase] updateSubtask:', error);
}

export async function deleteSubtaskDb(id: string) {
  const { error } = await supabase.from('subtasks').delete().eq('id', id);
  if (error) console.error('[Supabase] deleteSubtask:', error);
}
