import { create } from "zustand";
import type { Task, Status, Client } from "@/types/app.types";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
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
  toasts: Toast[];

  // Data actions
  setTasks: (tasks: Task[]) => void;
  setStatuses: (statuses: Status[]) => void;
  setClients: (clients: Client[]) => void;
  setSearch: (search: string) => void;

  // UI actions
  openTaskModal: (taskId?: string) => void;
  closeTaskModal: () => void;
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
  toasts: [],

  // Data actions
  setTasks: (tasks) => set({ tasks }),
  setStatuses: (statuses) => set({ statuses }),
  setClients: (clients) => set({ clients }),
  setSearch: (search) => set({ search }),

  // UI actions
  openTaskModal: (taskId) =>
    set({
      isTaskModalOpen: true,
      selectedTaskId: taskId ?? null,
      isNewTask: !taskId,
    }),
  closeTaskModal: () =>
    set({
      isTaskModalOpen: false,
      selectedTaskId: null,
      isNewTask: false,
    }),
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
