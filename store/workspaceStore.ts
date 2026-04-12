import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, Board, Group, Task, CellValue } from '../lib/types';
import { SAMPLE_DATA } from '../lib/sampleData';
import { DEFAULT_COLUMNS } from '../lib/columns';
import { generateId } from '../lib/utils';

interface WorkspaceActions {
  setActiveWorkspace: (id: string) => void;
  setActiveBoard: (id: string) => void;
  addBoard: (workspaceId: string, name: string) => void;
  addGroup: (boardId: string, name: string) => void;
  addTask: (groupId: string, name: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  updateTaskCell: (taskId: string, columnId: string, value: CellValue) => void;
  updateTaskName: (taskId: string, name: string) => void;
  deleteTask: (taskId: string) => void;
  deleteGroup: (groupId: string) => void;
  toggleGroupCollapsed: (groupId: string) => void;
  updateGroupName: (groupId: string, name: string) => void;
  reorderTasks: (groupId: string, activeId: string, overId: string) => void;
  updateBoardName: (boardId: string, name: string) => void;
  deleteBoard: (boardId: string) => void;
}

type WorkspaceStore = AppState & WorkspaceActions;

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      ...SAMPLE_DATA,

      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
      setActiveBoard: (id) => set({ activeBoardId: id }),

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
      },

      addGroup: (boardId, name) => {
        const id = generateId('g');
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#e11d48', '#0ea5e9', '#8b5cf6'];
        const color = colors[Math.floor(Math.random() * colors.length)];
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
      },

      addTask: (groupId, name) => {
        const id = generateId('t');
        const group = get().groups[groupId];
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
        set((s) => ({
          tasks: { ...s.tasks, [id]: task },
          groups: {
            ...s.groups,
            [groupId]: {
              ...s.groups[groupId],
              taskIds: [...s.groups[groupId].taskIds, id],
            },
          },
        }));
      },

      updateTask: (taskId, updates) =>
        set((s) => ({
          tasks: {
            ...s.tasks,
            [taskId]: { ...s.tasks[taskId], ...updates, updatedAt: new Date().toISOString() },
          },
        })),

      updateTaskCell: (taskId, columnId, value) =>
        set((s) => ({
          tasks: {
            ...s.tasks,
            [taskId]: {
              ...s.tasks[taskId],
              cells: { ...s.tasks[taskId].cells, [columnId]: value },
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      updateTaskName: (taskId, name) =>
        set((s) => ({
          tasks: {
            ...s.tasks,
            [taskId]: { ...s.tasks[taskId], name, updatedAt: new Date().toISOString() },
          },
        })),

      deleteTask: (taskId) => {
        const task = get().tasks[taskId];
        set((s) => {
          const { [taskId]: _, ...rest } = s.tasks;
          return {
            tasks: rest,
            groups: {
              ...s.groups,
              [task.groupId]: {
                ...s.groups[task.groupId],
                taskIds: s.groups[task.groupId].taskIds.filter((id) => id !== taskId),
              },
            },
          };
        });
      },

      deleteGroup: (groupId) => {
        const group = get().groups[groupId];
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
      },

      toggleGroupCollapsed: (groupId) =>
        set((s) => ({
          groups: {
            ...s.groups,
            [groupId]: { ...s.groups[groupId], collapsed: !s.groups[groupId].collapsed },
          },
        })),

      updateGroupName: (groupId, name) =>
        set((s) => ({
          groups: { ...s.groups, [groupId]: { ...s.groups[groupId], name } },
        })),

      reorderTasks: (groupId, activeId, overId) => {
        const group = get().groups[groupId];
        const taskIds = [...group.taskIds];
        const oldIndex = taskIds.indexOf(activeId);
        const newIndex = taskIds.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1) return;
        taskIds.splice(oldIndex, 1);
        taskIds.splice(newIndex, 0, activeId);
        set((s) => ({
          groups: { ...s.groups, [groupId]: { ...s.groups[groupId], taskIds } },
        }));
      },

      updateBoardName: (boardId, name) =>
        set((s) => ({
          boards: { ...s.boards, [boardId]: { ...s.boards[boardId], name } },
        })),

      deleteBoard: (boardId) => {
        const board = get().boards[boardId];
        if (!board) return;
        // Delete all groups and tasks in the board
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
          activeBoardId: s.activeBoardId === boardId
            ? s.workspaces[board.workspaceId].boardIds.filter((id) => id !== boardId)[0] ?? null
            : s.activeBoardId,
        }));
      },
    }),
    {
      name: 'nxflow-workspace',
      version: 1,
    }
  )
);
