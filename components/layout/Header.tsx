"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppStore, type DateFilter } from "@/lib/store/app-store";
import { SearchIcon, PlusIcon, SunIcon, MoonIcon } from "@/components/ui/Icons";

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
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const hydrateFromStorage = useAppStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const isTasksPage = pathname === "/tasks" || pathname.startsWith("/tasks/");
  const badge = getBadgeLabel(pathname);

  return (
    <header className="h-[50px] shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200/70 dark:border-gray-800 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-[16px] font-bold text-gray-900 dark:text-gray-100">Dev Task</h1>
        {badge && (
          <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium bg-gray-100 dark:bg-gray-800 px-[8px] py-[2px] rounded-full">
            {badge}
          </span>
        )}
      </div>

      {isTasksPage && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              <SearchIcon />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="pl-[28px] pr-3 py-[6px] text-[13px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg w-[220px] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-[2px]">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setDateFilter(f.value)}
                className={`text-[11px] font-medium px-[10px] py-[4px] rounded-md transition-colors ${
                  dateFilter === f.value
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => openTaskModal()}
            className="flex items-center gap-1 bg-[#1a1a2e] dark:bg-gray-700 text-white text-[13px] font-medium px-3 py-[6px] rounded-lg hover:bg-[#252540] dark:hover:bg-gray-600 shadow-sm transition-colors"
          >
            <PlusIcon size={11} /> New Task
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      )}
    </header>
  );
}
