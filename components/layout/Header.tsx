"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppStore, type DateFilter } from "@/lib/store/app-store";
import { SearchIcon, PlusIcon } from "@/components/ui/Icons";

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "all", label: "All" },
];

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
  const dateFilter = useAppStore((s) => s.dateFilter);
  const setDateFilter = useAppStore((s) => s.setDateFilter);
  const openTaskModal = useAppStore((s) => s.openTaskModal);
  const hydrateFromStorage = useAppStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const isTasksPage = pathname === "/tasks" || pathname.startsWith("/tasks/");
  const badge = getBadgeLabel(pathname);

  return (
    <header className="h-[50px] shrink-0 bg-white border-b border-gray-200/70 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-[16px] font-bold text-gray-900">Dev Task</h1>
        {badge && (
          <span className="text-[11px] text-gray-400 font-medium bg-gray-100 px-[8px] py-[2px] rounded-full">
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
              className="pl-[28px] pr-3 py-[6px] text-[13px] bg-gray-50 border border-gray-200 rounded-lg w-[220px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center bg-gray-100 rounded-lg p-[2px]">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setDateFilter(f.value)}
                className={`text-[11px] font-medium px-[10px] py-[4px] rounded-md transition-colors ${
                  dateFilter === f.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => openTaskModal()}
            className="flex items-center gap-1 bg-[#1a1a2e] text-white text-[13px] font-medium px-3 py-[6px] rounded-lg hover:bg-[#252540] shadow-sm transition-colors"
          >
            <PlusIcon size={11} /> New Task
          </button>
        </div>
      )}
    </header>
  );
}
