import { create } from 'zustand';
import { AppState, Board, Group, Task, Subtask, CellValue } from '../lib/types';
import { DEFAULT_COLUMNS } from '../lib/columns';
import { generateId } from '../lib/utils';
import {
  fetchAllData,
  insertBoard,
  updateBoardDb,
  deleteBoardDb,
  insertGroup,
  updateGroupDb,
  deleteGroupDb,
  insertTask,
  updateTaskDb,
  deleteTaskDb,
  insertSubtask,
  updateSubtaskDb,
  deleteSubtaskDb,
  mapTask,
  mapGroup,
  mapBoard,
  mapSubtask,
} from '../lib/supabase/queries';

// ─── Store Types ─────────────────────────────────────────────────────────────

interface WorkspaceActions {
  // Lifecycle
  isLoading: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;

  // Navigation
  setActiveWorkspace: (id: string) => void;
  setActiveBoard: (id: string) => void;

  // Board CRUD
  addBoard: (workspaceId: string, name: string) => void;
  updateBoardName: (boardId: string, name: string) => void;
  deleteBoard: (boardId: string) => void;

  // Group CRUD
  addGroup: (boardId: string, name: string) => void;
  deleteGroup: (groupId: string) => void;
  toggleGroupCollapsed: (groupId: string) => void;
  updateGroupName: (groupId: string, name: string) => void;

  // Task CRUD
  addTask: (groupId: string, name: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  updateTaskCell: (taskId: string, columnId: string, value: CellValue) => void;
  updateTaskName: (taskId: string, name: string) => void;
  deleteTask: (taskId: string) => void;
  reorderTasks: (groupId: string, activeId: string, overId: string) => void;

  // Subtask CRUD
  addSubtask: (taskId: string, name: string) => void;
  toggleSubtask: (subtaskId: string) => void;
  deleteSubtask: (subtaskId: string) => void;
  updateSubtaskName: (subtaskId: string, name: string) => void;

  // Realtime handler
  _applyRealtimeEvent: (
    table: string,
    eventType: 'upsert' | 'delete',
    record: Record<string, unknown>
  ) => void;
}

type WorkspaceStore = AppState & WorkspaceActions;

// ─── Empty initial state ─────────────────────────────────────────────────────

const EMPTY_STATE: AppState = {
  workspaces: {},
  boards: {},
  groups: {},
  tasks: {},
  subtasks: {},
  users: {},
  statusOptions: [],
  activeWorkspaceId: null,
  activeBoardId: null,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useWorkspaceStore = create<WorkspaceStore>()((set, get) => ({
  ...EMPTY_STATE,
  isLoading: true,
  isInitialized: false,

  // ── Initialize from Supabase ──────────────────────────────────────────────

  initialize: async () => {
    set({ isLoading: true });
    try {
      const data = await fetchAllData();
      set({
        ...data,
        isLoading: false,
        isInitialized: true,
      });
    } catch (err) {
      console.error('Failed to initialize from Supabase:', err);
      set({ isLoading: false, isInitialized: true });
    }
  },

  // ── Navigation ────────────────────────────────────────────────────────────

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
  setActiveBoard: (id) => set({ activeBoardId: id }),

  // ── Board CRUD ────────────────────────────────────────────────────────────

  addBoard: (workspaceId, name) => {
    const id = generateId('b');
    const board: Board = {
      id,
      workspaceId,
      name,
      groupIds: [],
      columns: DEFAULT_COLUMNS,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      boards: { ...s.boards, [id]: board },
      workspaces: {
        ...s.workspaces,
        [workspaceId]: {
          ...s.workspaces[workspaceId],
          boardIds: [...s.workspaces[workspaceId].boardIds, id],
        },
      },
      activeBoardId: id,
    }));
    // Persist
    insertBoard(board);
  },

  updateBoardName: (boardId, name) => {
    set((s) => ({
      boards: { ...s.boards, [boardId]: { ...s.boards[boardId], name } },
    }));
    updateBoardDb(boardId, { name });
  },

  deleteBoard: (boardId) => {
    const board = get().boards[boardId];
    if (!board) return;
    // Clean up local state
    const restGroups = { ...get().groups };
    const restTasks = { ...get().tasks };
    board.groupIds.forEach((gid) => {
      const group = restGroups[gid];
      if (group) {
        group.taskIds.forEach((tid) => delete restTasks[tid]);
        delete restGroups[gid];
      }
    });
    const { [boardId]: _, ...restBoards } = get().boards;
    set((s) => ({
      boards: restBoards,
      groups: restGroups,
      tasks: restTasks,
      workspaces: {
        ...s.workspaces,
        [board.workspaceId]: {
          ...s.workspaces[board.workspaceId],
          boardIds: s.workspaces[board.workspaceId].boardIds.filter((id) => id !== boardId),
        },
      },
      activeBoardId:
        s.activeBoardId === boardId
          ? s.workspaces[board.workspaceId].boardIds.filter((id) => id !== boardId)[0] ?? null
          : s.activeBoardId,
    }));
    // Persist (CASCADE handles groups & tasks in DB)
    deleteBoardDb(boardId);
  },

  // ── Group CRUD ────────────────────────────────────────────────────────────

  addGroup: (boardId, name) => {
    const id = generateId('g');
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#e11d48', '#0ea5e9', '#8b5cf6'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const board = get().boards[boardId];
    const position = board ? board.groupIds.length : 0;
    const group: Group = { id, boardId, name, color, taskIds: [], collapsed: false };
    set((s) => ({
      groups: { ...s.groups, [id]: group },
      boards: {
        ...s.boards,
        [boardId]: {
          ...s.boards[boardId],
          groupIds: [...s.boards[boardId].groupIds, id],
        },
      },
    }));
    // Persist
    insertGroup(group, position);
    updateBoardDb(boardId, { group_order: [...(board?.groupIds || []), id] });
  },

  deleteGroup: (groupId) => {
    const group = get().groups[groupId];
    if (!group) return;
    set((s) => {
      const { [groupId]: _, ...restGroups } = s.groups;
      const restTasks = { ...s.tasks };
      group.taskIds.forEach((tid) => delete restTasks[tid]);
      return {
        groups: restGroups,
        tasks: restTasks,
        boards: {
          ...s.boards,
          [group.boardId]: {
            ...s.boards[group.boardId],
            groupIds: s.boards[group.boardId].groupIds.filter((id) => id !== groupId),
          },
        },
      };
    });
    // Persist (CASCADE handles tasks in DB)
    deleteGroupDb(groupId);
    const board = get().boards[group.boardId];
    if (board) {
      updateBoardDb(group.boardId, { group_order: board.groupIds });
    }
  },

  toggleGroupCollapsed: (groupId) => {
    const group = get().groups[groupId];
    if (!group) return;
    const newCollapsed = !group.collapsed;
    set((s) => ({
      groups: {
        ...s.groups,
        [groupId]: { ...s.groups[groupId], collapsed: newCollapsed },
      },
    }));
    updateGroupDb(groupId, { collapsed: newCollapsed });
  },

  updateGroupName: (groupId, name) => {
    set((s) => ({
      groups: { ...s.groups, [groupId]: { ...s.groups[groupId], name } },
    }));
    updateGroupDb(groupId, { name });
  },

  // ── Task CRUD ─────────────────────────────────────────────────────────────

  addTask: (groupId, name) => {
    const id = generateId('t');
    const group = get().groups[groupId];
    if (!group) return;
    const now = new Date().toISOString();
    const task: Task = {
      id,
      groupId,
      boardId: group.boardId,
      name,
      cells: {
        assignee: { type: 'assignee', userIds: [] },
        status: { type: 'status', statusId: 'not-started' },
        timeline: { type: 'timeline', start: null, end: null },
        link: { type: 'link', url: '' },
      },
      order: group.taskIds.length,
      createdAt: now,
      updatedAt: now,
    };
    const newTaskIds = [...group.taskIds, id];
    set((s) => ({
      tasks: { ...s.tasks, [id]: task },
      groups: {
        ...s.groups,
        [groupId]: {
          ...s.groups[groupId],
          taskIds: newTaskIds,
        },
      },
    }));
    // Persist
    insertTask(task);
    updateGroupDb(groupId, { task_order: newTaskIds });
  },

  updateTask: (taskId, updates) => {
    set((s) => ({
      tasks: {
        ...s.tasks,
        [taskId]: { ...s.tasks[taskId], ...updates, updatedAt: new Date().toISOString() },
      },
    }));
    // Build DB-compatible updates
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.cells !== undefined) dbUpdates.cells = updates.cells;
    if (updates.order !== undefined) dbUpdates.order = updates.order;
    if (updates.groupId !== undefined) dbUpdates.group_id = updates.groupId;
    updateTaskDb(taskId, dbUpdates);
  },

  updateTaskCell: (taskId, columnId, value) => {
    const task = get().tasks[taskId];
    if (!task) return;
    const newCells = { ...task.cells, [columnId]: value };
    set((s) => ({
      tasks: {
        ...s.tasks,
        [taskId]: {
          ...s.tasks[taskId],
          cells: newCells,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
    updateTaskDb(taskId, { cells: newCells });
  },

  updateTaskName: (taskId, name) => {
    set((s) => ({
      tasks: {
        ...s.tasks,
        [taskId]: { ...s.tasks[taskId], name, updatedAt: new Date().toISOString() },
      },
    }));
    updateTaskDb(taskId, { name });
  },

  deleteTask: (taskId) => {
    const task = get().tasks[taskId];
    if (!task) return;
    const group = get().groups[task.groupId];
    const newTaskIds = group ? group.taskIds.filter((id) => id !== taskId) : [];
    // Also clean up subtasks
    const subtasksToDelete = Object.values(get().subtasks).filter((st) => st.taskId === taskId);
    set((s) => {
      const { [taskId]: _, ...restTasks } = s.tasks;
      const restSubtasks = { ...s.subtasks };
      subtasksToDelete.forEach((st) => delete restSubtasks[st.id]);
      return {
        tasks: restTasks,
        subtasks: restSubtasks,
        groups: group
          ? {
              ...s.groups,
              [task.groupId]: { ...s.groups[task.groupId], taskIds: newTaskIds },
            }
          : s.groups,
      };
    });
    // Persist (CASCADE handles subtasks in DB)
    deleteTaskDb(taskId);
    if (group) {
      updateGroupDb(task.groupId, { task_order: newTaskIds });
    }
  },

  reorderTasks: (groupId, activeId, overId) => {
    const group = get().groups[groupId];
    if (!group) return;
    const taskIds = [...group.taskIds];
    const oldIndex = taskIds.indexOf(activeId);
    const newIndex = taskIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;
    taskIds.splice(oldIndex, 1);
    taskIds.splice(newIndex, 0, activeId);
    set((s) => ({
      groups: { ...s.groups, [groupId]: { ...s.groups[groupId], taskIds } },
    }));
    updateGroupDb(groupId, { task_order: taskIds });
  },

  // ── Subtask CRUD ──────────────────────────────────────────────────────────

  addSubtask: (taskId, name) => {
    const id = generateId('st');
    const task = get().tasks[taskId];
    if (!task) return;
    const existingSubtasks = Object.values(get().subtasks).filter(
      (st) => st.taskId === taskId
    );
    const subtask: Subtask = {
      id,
      taskId,
      name,
      completed: false,
      position: existingSubtasks.length,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      subtasks: { ...s.subtasks, [id]: subtask },
    }));
    insertSubtask(subtask);
  },

  toggleSubtask: (subtaskId) => {
    const subtask = get().subtasks[subtaskId];
    if (!subtask) return;
    const newCompleted = !subtask.completed;
    set((s) => ({
      subtasks: {
        ...s.subtasks,
        [subtaskId]: { ...s.subtasks[subtaskId], completed: newCompleted },
      },
    }));
    updateSubtaskDb(subtaskId, { completed: newCompleted });
  },

  deleteSubtask: (subtaskId) => {
    set((s) => {
      const { [subtaskId]: _, ...rest } = s.subtasks;
      return { subtasks: rest };
    });
    deleteSubtaskDb(subtaskId);
  },

  updateSubtaskName: (subtaskId, name) => {
    set((s) => ({
      subtasks: {
        ...s.subtasks,
        [subtaskId]: { ...s.subtasks[subtaskId], name },
      },
    }));
    updateSubtaskDb(subtaskId, { name });
  },

  // ── Realtime Event Handler ────────────────────────────────────────────────

  _applyRealtimeEvent: (table, eventType, record) => {
    if (eventType === 'upsert') {
      if (table === 'tasks') {
        const task = mapTask(record);
        set((s) => ({
          tasks: { ...s.tasks, [task.id]: task },
        }));
      } else if (table === 'groups') {
        const group = mapGroup(record);
        set((s) => ({
          groups: { ...s.groups, [group.id]: group },
        }));
      } else if (table === 'boards') {
        const board = mapBoard(record);
        set((s) => {
          const ws = s.workspaces[board.workspaceId];
          const newBoardIds =
            ws && !ws.boardIds.includes(board.id)
              ? [...ws.boardIds, board.id]
              : ws?.boardIds || [];
          return {
            boards: { ...s.boards, [board.id]: board },
            workspaces: ws
              ? {
                  ...s.workspaces,
                  [board.workspaceId]: { ...ws, boardIds: newBoardIds },
                }
              : s.workspaces,
          };
        });
      } else if (table === 'subtasks') {
        const subtask = mapSubtask(record);
        set((s) => ({
          subtasks: { ...s.subtasks, [subtask.id]: subtask },
        }));
      }
    } else if (eventType === 'delete') {
      const id = record?.id as string;
      if (!id) return;

      if (table === 'tasks') {
        set((s) => {
          const task = s.tasks[id];
          if (!task) return s;
          const { [id]: _, ...restTasks } = s.tasks;
          // Also remove subtasks of deleted task
          const restSubtasks = { ...s.subtasks };
          Object.values(restSubtasks).forEach((st) => {
            if (st.taskId === id) delete restSubtasks[st.id];
          });
          const group = s.groups[task.groupId];
          return {
            tasks: restTasks,
            subtasks: restSubtasks,
            groups: group
              ? {
                  ...s.groups,
                  [task.groupId]: {
                    ...group,
                    taskIds: group.taskIds.filter((tid) => tid !== id),
                  },
                }
              : s.groups,
          };
        });
      } else if (table === 'groups') {
        set((s) => {
          const group = s.groups[id];
          if (!group) return s;
          const { [id]: _, ...restGroups } = s.groups;
          const restTasks = { ...s.tasks };
          group.taskIds.forEach((tid) => delete restTasks[tid]);
          const board = s.boards[group.boardId];
          return {
            groups: restGroups,
            tasks: restTasks,
            boards: board
              ? {
                  ...s.boards,
                  [group.boardId]: {
                    ...board,
                    groupIds: board.groupIds.filter((gid) => gid !== id),
                  },
                }
              : s.boards,
          };
        });
      } else if (table === 'boards') {
        set((s) => {
          const board = s.boards[id];
          if (!board) return s;
          const { [id]: _, ...restBoards } = s.boards;
          const restGroups = { ...s.groups };
          const restTasks = { ...s.tasks };
          board.groupIds.forEach((gid) => {
            const group = restGroups[gid];
            if (group) {
              group.taskIds.forEach((tid) => delete restTasks[tid]);
              delete restGroups[gid];
            }
          });
          const ws = s.workspaces[board.workspaceId];
          return {
            boards: restBoards,
            groups: restGroups,
            tasks: restTasks,
            workspaces: ws
              ? {
                  ...s.workspaces,
                  [board.workspaceId]: {
                    ...ws,
                    boardIds: ws.boardIds.filter((bid) => bid !== id),
                  },
                }
              : s.workspaces,
            activeBoardId:
              s.activeBoardId === id
                ? ws?.boardIds.filter((bid) => bid !== id)[0] ?? null
                : s.activeBoardId,
          };
        });
      } else if (table === 'subtasks') {
        set((s) => {
          const { [id]: _, ...rest } = s.subtasks;
          return { subtasks: rest };
        });
      }
    }
  },
}));
