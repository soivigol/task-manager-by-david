"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  TasksIcon,
  ClientsIcon,
  ReportsIcon,
  SettingsIcon,
  LogoutIcon,
} from "@/components/ui/Icons";

const NAV_ITEMS = [
  { href: "/tasks", icon: TasksIcon, label: "Tasks" },
  { href: "/clients", icon: ClientsIcon, label: "Clients" },
  { href: "/reports", icon: ReportsIcon, label: "Reports" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="w-[46px] shrink-0 bg-sidebar flex flex-col items-center py-3">
      {/* Logo */}
      <div className="w-[28px] h-[28px] rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-bold text-[11px] mb-6 shadow-lg shadow-cyan-500/20">
        D
      </div>

      {/* Nav icons */}
      <nav className="flex flex-col gap-[2px] flex-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              title={label}
              className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center transition-all ${
                isActive
                  ? "bg-white/[0.12] text-white"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]"
              }`}
            >
              <Icon />
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col gap-[2px]">
        <button
          onClick={() => router.push("/settings")}
          title="Settings"
          className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center transition-all ${
            pathname === "/settings"
              ? "bg-white/[0.12] text-white"
              : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]"
          }`}
        >
          <SettingsIcon />
        </button>
        <button
          onClick={handleLogout}
          title="Logout"
          className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-white/[0.06] transition-all"
        >
          <LogoutIcon />
        </button>
      </div>
    </aside>
  );
}
