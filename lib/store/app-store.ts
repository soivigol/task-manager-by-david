import { create } from "zustand";
import type { Task, Status, Client } from "@/types/app.types";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface PickerState {
  taskId: string;
  currentStatusId: string;
  x: number;
  y: number;
}

export type DateFilter = "1m" | "3m" | "6m" | "all";

interface AppState {
  // Data
  tasks: Task[];
  statuses: Status[];
  clients: Client[];
  search: string;

  // UI state
  selectedTaskId: string | null;
  isTaskModalOpen: boolean;
  isNewTask: boolean;
  defaultStatusId: string | null;
  parentTaskId: string | null;
  confirmDialog: { taskId: string; taskTitle: string } | null;
  toasts: Toast[];
  picker: PickerState | null;
  collapsedGroups: Record<string, boolean>;
  dateFilter: DateFilter;

  // Data actions
  setTasks: (tasks: Task[]) => void;
  setStatuses: (statuses: Status[]) => void;
  setClients: (clients: Client[]) => void;
  setSearch: (search: string) => void;

  // Optimistic update actions
  updateTaskOptimistic: (id: string, updates: Partial<Task>) => void;
  addTaskOptimistic: (task: Task) => void;
  removeTaskOptimistic: (id: string) => void;
  reorderTasksOptimistic: (statusId: string, orderedIds: string[]) => void;

  // UI actions
  openTaskModal: (taskId?: string, defaultStatusId?: string, parentTaskId?: string) => void;
  closeTaskModal: () => void;
  openConfirmDialog: (taskId: string, taskTitle: string) => void;
  closeConfirmDialog: () => void;
  openPicker: (picker: PickerState) => void;
  closePicker: () => void;
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
  toggleGroupCollapsed: (statusId: string) => void;
  setDateFilter: (filter: DateFilter) => void;
}

function loadDateFilter(): DateFilter {
  if (typeof window === "undefined") return "all";
  try {
    const raw = localStorage.getItem("dateFilter");
    if (raw === "1m" || raw === "3m" || raw === "6m" || raw === "all") return raw;
    return "all";
  } catch {
    return "all";
  }
}

function loadCollapsedGroups(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("collapsedGroups");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCollapsedGroups(groups: Record<string, boolean>) {
  try {
    localStorage.setItem("collapsedGroups", JSON.stringify(groups));
  } catch {
    // Ignore storage errors
  }
}

export const useAppStore = create<AppState>((set) => ({
  // Data
  tasks: [],
  statuses: [],
  clients: [],
  search: "",

  // UI state
  selectedTaskId: null,
  isTaskModalOpen: false,
  isNewTask: false,
  defaultStatusId: null,
  parentTaskId: null,
  confirmDialog: null,
  toasts: [],
  picker: null,
  collapsedGroups: loadCollapsedGroups(),
  dateFilter: loadDateFilter(),

  // Data actions
  setTasks: (tasks) => set({ tasks }),
  setStatuses: (statuses) => set({ statuses }),
  setClients: (clients) => set({ clients }),
  setSearch: (search) => set({ search }),

  // Optimistic update actions
  updateTaskOptimistic: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),
  addTaskOptimistic: (task) =>
    set((state) => ({
      tasks: [...state.tasks, task],
    })),
  removeTaskOptimistic: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id && t.parent_id !== id),
    })),
  reorderTasksOptimistic: (statusId, orderedIds) =>
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.status_id !== statusId || t.parent_id !== null) return t;
        const idx = orderedIds.indexOf(t.id);
        if (idx === -1) return t;
        return { ...t, sort_order: idx };
      }),
    })),

  // UI actions
  openTaskModal: (taskId, defaultStatusId, parentTaskId) =>
    set({
      isTaskModalOpen: true,
      selectedTaskId: taskId ?? null,
      isNewTask: !taskId,
      defaultStatusId: defaultStatusId ?? null,
      parentTaskId: parentTaskId ?? null,
    }),
  closeTaskModal: () =>
    set({
      isTaskModalOpen: false,
      selectedTaskId: null,
      isNewTask: false,
      defaultStatusId: null,
      parentTaskId: null,
    }),
  openConfirmDialog: (taskId, taskTitle) =>
    set({ confirmDialog: { taskId, taskTitle } }),
  closeConfirmDialog: () =>
    set({ confirmDialog: null }),
  openPicker: (picker) => set({ picker }),
  closePicker: () => set({ picker: null }),
  addToast: (message, type = "info") =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: crypto.randomUUID(), message, type },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  setDateFilter: (filter) => {
    try {
      localStorage.setItem("dateFilter", filter);
    } catch {
      // Ignore storage errors
    }
    set({ dateFilter: filter });
  },
  toggleGroupCollapsed: (statusId) =>
    set((state) => {
      const next = {
        ...state.collapsedGroups,
        [statusId]: !state.collapsedGroups[statusId],
      };
      saveCollapsedGroups(next);
      return { collapsedGroups: next };
    }),
}));
