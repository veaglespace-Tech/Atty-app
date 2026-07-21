"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, UsersRound, HelpCircle, LayoutDashboard, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomTaskbar({ role }) {
  const pathname = usePathname();
  
  // Define nav links based on role or universally
  // As requested: support, settings, team, etc.
  const getLinks = () => {
    const base = role === "ORG_ADMIN" ? "/org" : role === "SUPER_ADMIN" ? "/super-admin" : "/member";
    return [
      {
        label: "Dashboard",
        href: `${base}/dashboard`,
        icon: LayoutDashboard,
      },
      {
        label: "Attendance",
        href: `${base}/attendance`,
        icon: CalendarDays,
      },
      {
        label: "Team",
        href: `${base}/team`,
        icon: UsersRound,
      },
      {
        label: "Support",
        href: `${base}/support`,
        icon: HelpCircle,
      },
      {
        label: "Settings",
        href: `${base}/settings`,
        icon: Settings,
      },
    ];
  };

  const links = getLinks();

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 w-[90%] max-w-[400px]">
      <div className="flex w-full items-center gap-1 overflow-x-auto rounded-[2rem] border border-slate-200/50 bg-white/90 p-2 shadow-[0_8px_32px_rgba(30,112,209,0.15)] backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-950/90 no-scrollbar">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex min-w-[64px] flex-col items-center justify-center gap-1.5 rounded-2xl p-2.5 transition-all",
                isActive
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/50 dark:hover:text-slate-200"
              )}
            >
              <Icon size={20} className={cn("transition-transform", isActive && "scale-110")} />
              <span className="text-[10px] font-bold tracking-wide">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
