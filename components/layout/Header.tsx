"use client";

import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store/app-store";
import { SearchIcon, PlusIcon } from "@/components/ui/Icons";

const PAGE_LABELS: Record<string, string> = {
  "/tasks": "Tasks",
  "/clients": "Clients",
  "/reports": "Reports",
  "/settings": "Settings",
};

function getBadgeLabel(pathname: string): string {
  if (pathname.startsWith("/tasks")) return "Tasks";
  if (pathname.startsWith("/clients")) return "Clients";
  if (pathname.startsWith("/reports")) return "Reports";
  if (pathname.startsWith("/settings")) return "Settings";
  return "";
}

export function Header() {
  const pathname = usePathname();
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const openTaskModal = useAppStore((s) => s.openTaskModal);

  const isTasksPage = pathname === "/tasks" || pathname.startsWith("/tasks/");
  const badge = getBadgeLabel(pathname);

  return (
    <header className="h-[44px] shrink-0 bg-white border-b border-gray-200/70 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-[14px] font-bold text-gray-900">Dev Task</h1>
        {badge && (
          <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-[6px] py-[1px] rounded-full">
            {badge}
          </span>
        )}
      </div>

      {isTasksPage && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="pl-[28px] pr-3 py-[5px] text-[12px] bg-gray-50 border border-gray-200 rounded-lg w-[190px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>
          <button
            onClick={() => openTaskModal()}
            className="flex items-center gap-1 bg-[#1a1a2e] text-white text-[12px] font-medium px-3 py-[5px] rounded-lg hover:bg-[#252540] shadow-sm transition-colors"
          >
            <PlusIcon size={11} /> New Task
          </button>
        </div>
      )}
    </header>
  );
}
