'use client';
import { create } from 'zustand';
import { AppState, Board, Group, Task, CellValue, User, Workspace } from '../lib/types';
import { DEFAULT_COLUMNS } from '../lib/columns';
import { createClient } from '@/lib/supabase/client';

// ─── Helpers ────────────────────────────────────────────────────────────────

function genId() {
  return crypto.randomUUID();
}

const DEFAULT_STATUS_OPTIONS = [
  { id: 'not-started', label: 'Not Started', color: '#4b5563', textColor: '#f9fafb' },
  { id: 'working', label: 'Working on it', color: '#f59e0b', textColor: '#1a1a1a' },
  { id: 'stuck', label: 'Stuck', color: '#e11d48', textColor: '#fff' },
  { id: 'in-review', label: 'In Review', color: '#0891b2', textColor: '#fff' },
  { id: 'done', label: 'Done', color: '#10b981', textColor: '#fff' },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkspaceActions {
  loadWorkspace: () => Promise<void>;
  setActiveWorkspace: (id: string) => void;
  setActiveBoard: (id: string) => void;
  addBoard: (workspaceId: string, name: string) => Promise<void>;
  addGroup: (boardId: string, name: string) => Promise<void>;
  addTask: (groupId: string, name: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  updateTaskCell: (taskId: string, columnId: string, value: CellValue) => Promise<void>;
  updateTaskName: (taskId: string, name: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  toggleGroupCollapsed: (groupId: string) => Promise<void>;
  updateGroupName: (groupId: string, name: string) => Promise<void>;
  reorderTasks: (groupId: string, activeId: string, overId: string) => void;
  updateBoardName: (boardId: string, name: string) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;
}

type WorkspaceStore = AppState & WorkspaceActions;

// ─── Store ───────────────────────────────────────────────────────────────────

export const useWorkspaceStore = create<WorkspaceStore>()((set, get) => ({
  // ── Initial State ────────────────────────────────────────────────────────
  workspaces: {},
  boards: {},
  groups: {},
  tasks: {},
  users: {},
  statusOptions: DEFAULT_STATUS_OPTIONS,
  activeWorkspaceId: null,
  activeBoardId: null,
  currentUser: null,
  isLoading: false,

  setCurrentUser: (user) => set({ currentUser: user }),
  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
  setActiveBoard: (id) => set({ activeBoardId: id }),

  // ── Load workspace data from Supabase ─────────────────────────────────────
  loadWorkspace: async () => {
    const supabase = createClient();
    set({ isLoading: true });

    // Current user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { set({ isLoading: false }); return; }

    // Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    const currentUser: User | null = profile
      ? { id: profile.id, name: profile.name, initials: profile.initials, avatarColor: profile.avatar_color, email: profile.email }
      : null;

    // Workspace (member of)
    const { data: memberRows } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(id, name, icon)')
      .eq('user_id', authUser.id);

    if (!memberRows || memberRows.length === 0) {
      set({ currentUser, isLoading: false });
      return;
    }

    const wsRow = (memberRows[0] as any).workspaces;
    const workspaceId: string = wsRow.id;

    // All members → users
    const { data: allMembers } = await supabase
      .from('workspace_members')
      .select('profiles(id, name, initials, avatar_color, email)')
      .eq('workspace_id', workspaceId);

    const users: Record<string, User> = {};
    (allMembers || []).forEach((m: any) => {
      const p = m.profiles;
      if (p) users[p.id] = { id: p.id, name: p.name, initials: p.initials, avatarColor: p.avatar_color, email: p.email };
    });

    // Boards
    const { data: boardRows } = await supabase
      .from('boards')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    const boards: Record<string, Board> = {};
    const boardIds: string[] = [];

    for (const b of boardRows || []) {
      boardIds.push(b.id);
      boards[b.id] = {
        id: b.id,
        workspaceId: b.workspace_id,
        name: b.name,
        description: b.description,
        groupIds: [],
        columns: b.columns?.length ? b.columns : DEFAULT_COLUMNS,
        createdAt: b.created_at,
      };
    }

    // Groups
    const { data: groupRows } = await supabase
      .from('groups')
      .select('*')
      .in('board_id', boardIds)
      .order('"order"', { ascending: true });

    const groups: Record<string, Group> = {};
    for (const g of groupRows || []) {
      groups[g.id] = { id: g.id, boardId: g.board_id, name: g.name, color: g.color, taskIds: [], collapsed: g.collapsed };
      if (boards[g.board_id]) boards[g.board_id].groupIds.push(g.id);
    }

    // Tasks
    const groupIds = Object.keys(groups);
    const { data: taskRows } = await supabase
      .from('tasks')
      .select('*')
      .in('group_id', groupIds.length > 0 ? groupIds : ['none'])
      .order('"order"', { ascending: true });

    const tasks: Record<string, Task> = {};
    for (const t of taskRows || []) {
      tasks[t.id] = { id: t.id, groupId: t.group_id, boardId: t.board_id, name: t.name, cells: t.cells || {}, order: t.order, createdAt: t.created_at, updatedAt: t.updated_at };
      if (groups[t.group_id]) groups[t.group_id].taskIds.push(t.id);
    }

    const workspace: Workspace = { id: wsRow.id, name: wsRow.name, icon: wsRow.icon, boardIds };
    const workspaces = { [workspaceId]: workspace };

    set({
      currentUser,
      workspaces,
      boards,
      groups,
      tasks,
      users,
      activeWorkspaceId: workspaceId,
      activeBoardId: boardIds[0] ?? null,
      isLoading: false,
    });
  },

  // ── Boards ───────────────────────────────────────────────────────────────
  addBoard: async (workspaceId, name) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('boards')
      .insert({ workspace_id: workspaceId, name, columns: DEFAULT_COLUMNS })
      .select()
      .single();
    if (!data) return;
    const board: Board = { id: data.id, workspaceId, name, groupIds: [], columns: DEFAULT_COLUMNS, createdAt: data.created_at };
    set((s) => ({
      boards: { ...s.boards, [data.id]: board },
      workspaces: { ...s.workspaces, [workspaceId]: { ...s.workspaces[workspaceId], boardIds: [...s.workspaces[workspaceId].boardIds, data.id] } },
      activeBoardId: data.id,
    }));
  },

  updateBoardName: async (boardId, name) => {
    const supabase = createClient();
    await supabase.from('boards').update({ name }).eq('id', boardId);
    set((s) => ({ boards: { ...s.boards, [boardId]: { ...s.boards[boardId], name } } }));
  },

  deleteBoard: async (boardId) => {
    const supabase = createClient();
    const board = get().boards[boardId];
    if (!board) return;
    await supabase.from('boards').delete().eq('id', boardId);
    const { [boardId]: _, ...restBoards } = get().boards;
    const restGroups = { ...get().groups };
    const restTasks = { ...get().tasks };
    board.groupIds.forEach((gid) => {
      const g = restGroups[gid];
      if (g) { g.taskIds.forEach((tid) => delete restTasks[tid]); delete restGroups[gid]; }
    });
    set((s) => ({
      boards: restBoards,
      groups: restGroups,
      tasks: restTasks,
      workspaces: { ...s.workspaces, [board.workspaceId]: { ...s.workspaces[board.workspaceId], boardIds: s.workspaces[board.workspaceId].boardIds.filter((id) => id !== boardId) } },
      activeBoardId: s.activeBoardId === boardId ? (Object.keys(restBoards)[0] ?? null) : s.activeBoardId,
    }));
  },

  // ── Groups ───────────────────────────────────────────────────────────────
  addGroup: async (boardId, name) => {
    const supabase = createClient();
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#e11d48', '#0ea5e9', '#8b5cf6'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const order = get().boards[boardId]?.groupIds.length ?? 0;
    const { data } = await supabase.from('groups').insert({ board_id: boardId, name, color, order }).select().single();
    if (!data) return;
    const group: Group = { id: data.id, boardId, name, color, taskIds: [], collapsed: false };
    set((s) => ({
      groups: { ...s.groups, [data.id]: group },
      boards: { ...s.boards, [boardId]: { ...s.boards[boardId], groupIds: [...s.boards[boardId].groupIds, data.id] } },
    }));
  },

  updateGroupName: async (groupId, name) => {
    const supabase = createClient();
    await supabase.from('groups').update({ name }).eq('id', groupId);
    set((s) => ({ groups: { ...s.groups, [groupId]: { ...s.groups[groupId], name } } }));
  },

  toggleGroupCollapsed: async (groupId) => {
    const supabase = createClient();
    const collapsed = !get().groups[groupId]?.collapsed;
    await supabase.from('groups').update({ collapsed }).eq('id', groupId);
    set((s) => ({ groups: { ...s.groups, [groupId]: { ...s.groups[groupId], collapsed } } }));
  },

  deleteGroup: async (groupId) => {
    const supabase = createClient();
    const group = get().groups[groupId];
    if (!group) return;
    await supabase.from('groups').delete().eq('id', groupId);
    const { [groupId]: _, ...restGroups } = get().groups;
    const restTasks = { ...get().tasks };
    group.taskIds.forEach((tid) => delete restTasks[tid]);
    set((s) => ({
      groups: restGroups,
      tasks: restTasks,
      boards: { ...s.boards, [group.boardId]: { ...s.boards[group.boardId], groupIds: s.boards[group.boardId].groupIds.filter((id) => id !== groupId) } },
    }));
  },

  // ── Tasks ────────────────────────────────────────────────────────────────
  addTask: async (groupId, name) => {
    const supabase = createClient();
    const group = get().groups[groupId];
    if (!group) return;
    const cells = {
      assignee: { type: 'assignee', userIds: [] },
      status: { type: 'status', statusId: 'not-started' },
      timeline: { type: 'timeline', start: null, end: null },
      link: { type: 'link', url: '' },
    };
    const order = group.taskIds.length;
    const { data } = await supabase.from('tasks').insert({ group_id: groupId, board_id: group.boardId, name, cells, order }).select().single();
    if (!data) return;
    const task: Task = { id: data.id, groupId, boardId: group.boardId, name, cells: data.cells, order, createdAt: data.created_at, updatedAt: data.updated_at };
    set((s) => ({
      tasks: { ...s.tasks, [data.id]: task },
      groups: { ...s.groups, [groupId]: { ...s.groups[groupId], taskIds: [...s.groups[groupId].taskIds, data.id] } },
    }));
  },

  updateTask: async (taskId, updates) => {
    const supabase = createClient();
    await supabase.from('tasks').update(updates).eq('id', taskId);
    set((s) => ({ tasks: { ...s.tasks, [taskId]: { ...s.tasks[taskId], ...updates, updatedAt: new Date().toISOString() } } }));
  },

  updateTaskCell: async (taskId, columnId, value) => {
    const supabase = createClient();
    const task = get().tasks[taskId];
    const cells = { ...task.cells, [columnId]: value };
    await supabase.from('tasks').update({ cells }).eq('id', taskId);
    set((s) => ({ tasks: { ...s.tasks, [taskId]: { ...s.tasks[taskId], cells, updatedAt: new Date().toISOString() } } }));
  },

  updateTaskName: async (taskId, name) => {
    const supabase = createClient();
    await supabase.from('tasks').update({ name }).eq('id', taskId);
    set((s) => ({ tasks: { ...s.tasks, [taskId]: { ...s.tasks[taskId], name, updatedAt: new Date().toISOString() } } }));
  },

  deleteTask: async (taskId) => {
    const supabase = createClient();
    const task = get().tasks[taskId];
    if (!task) return;
    await supabase.from('tasks').delete().eq('id', taskId);
    const { [taskId]: _, ...rest } = get().tasks;
    set((s) => ({
      tasks: rest,
      groups: { ...s.groups, [task.groupId]: { ...s.groups[task.groupId], taskIds: s.groups[task.groupId].taskIds.filter((id) => id !== taskId) } },
    }));
  },

  reorderTasks: (groupId, activeId, overId) => {
    const group = get().groups[groupId];
    const taskIds = [...group.taskIds];
    const oldIndex = taskIds.indexOf(activeId);
    const newIndex = taskIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;
    taskIds.splice(oldIndex, 1);
    taskIds.splice(newIndex, 0, activeId);
    set((s) => ({ groups: { ...s.groups, [groupId]: { ...s.groups[groupId], taskIds } } }));
    // persist order async
    const supabase = createClient();
    taskIds.forEach((tid, i) => supabase.from('tasks').update({ order: i }).eq('id', tid));
  },
}));
