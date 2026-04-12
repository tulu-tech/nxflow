import { create } from 'zustand';
import { FilterState, SortState } from '../lib/types';

interface UIState {
  filter: FilterState;
  sort: SortState;
  isFilterOpen: boolean;
  setSearch: (q: string) => void;
  setFilterAssignees: (ids: string[]) => void;
  setFilterStatuses: (ids: string[]) => void;
  toggleFilterAssignee: (id: string) => void;
  toggleFilterStatus: (id: string) => void;
  setSort: (sort: SortState) => void;
  clearFilters: () => void;
  setFilterOpen: (open: boolean) => void;
  expandedTaskIds: string[];
  toggleTaskExpanded: (taskId: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  filter: { assigneeIds: [], statusIds: [], searchQuery: '' },
  sort: { field: null, direction: 'asc' },
  isFilterOpen: false,

  setSearch: (q) => set((s) => ({ filter: { ...s.filter, searchQuery: q } })),

  setFilterAssignees: (ids) => set((s) => ({ filter: { ...s.filter, assigneeIds: ids } })),

  setFilterStatuses: (ids) => set((s) => ({ filter: { ...s.filter, statusIds: ids } })),

  toggleFilterAssignee: (id) =>
    set((s) => {
      const current = s.filter.assigneeIds;
      return {
        filter: {
          ...s.filter,
          assigneeIds: current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id],
        },
      };
    }),

  toggleFilterStatus: (id) =>
    set((s) => {
      const current = s.filter.statusIds;
      return {
        filter: {
          ...s.filter,
          statusIds: current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id],
        },
      };
    }),

  setSort: (sort) => set({ sort }),

  clearFilters: () =>
    set({ filter: { assigneeIds: [], statusIds: [], searchQuery: '' }, sort: { field: null, direction: 'asc' } }),

  setFilterOpen: (open) => set({ isFilterOpen: open }),

  expandedTaskIds: [],
  toggleTaskExpanded: (taskId) =>
    set((s) => ({
      expandedTaskIds: s.expandedTaskIds.includes(taskId)
        ? s.expandedTaskIds.filter((id) => id !== taskId)
        : [...s.expandedTaskIds, taskId],
    })),
}));
