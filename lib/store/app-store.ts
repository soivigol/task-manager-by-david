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
  toasts: Toast[];
  picker: PickerState | null;

  // Data actions
  setTasks: (tasks: Task[]) => void;
  setStatuses: (statuses: Status[]) => void;
  setClients: (clients: Client[]) => void;
  setSearch: (search: string) => void;

  // Optimistic update actions
  updateTaskOptimistic: (id: string, updates: Partial<Task>) => void;
  addTaskOptimistic: (task: Task) => void;
  removeTaskOptimistic: (id: string) => void;

  // UI actions
  openTaskModal: (taskId?: string, defaultStatusId?: string) => void;
  closeTaskModal: () => void;
  openPicker: (picker: PickerState) => void;
  closePicker: () => void;
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
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
  toasts: [],
  picker: null,

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

  // UI actions
  openTaskModal: (taskId, defaultStatusId) =>
    set({
      isTaskModalOpen: true,
      selectedTaskId: taskId ?? null,
      isNewTask: !taskId,
      defaultStatusId: defaultStatusId ?? null,
    }),
  closeTaskModal: () =>
    set({
      isTaskModalOpen: false,
      selectedTaskId: null,
      isNewTask: false,
      defaultStatusId: null,
    }),
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
}));
