"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import {
  BarChart3,
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatRoleLabel, ROLES } from "@/utils/roles";

const settingsHref = "/dashboard/settings";

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const user = useSelector((state) => state.auth.user);
  const userRole = user?.role || ROLES.MEMBER;
  const roleLabel = formatRoleLabel(userRole);

  const menuItems = [
    {
      label: "Overview",
      icon: <LayoutDashboard size={20} />,
      href: "/dashboard",
      roles: [ROLES.ADMIN, ROLES.SUBADMIN, ROLES.TEAM_LEADER, ROLES.MEMBER],
    },
    {
      label: "Attendance",
      icon: <CalendarCheck size={20} />,
      href: "/dashboard/attendance",
      roles: [ROLES.ADMIN, ROLES.SUBADMIN, ROLES.TEAM_LEADER, ROLES.MEMBER],
    },
    {
      label: "Employees",
      icon: <Users size={20} />,
      href: "/dashboard/employees",
      roles: [ROLES.ADMIN, ROLES.SUBADMIN],
    },
    {
      label: "Reports",
      icon: <BarChart3 size={20} />,
      href: "/dashboard/reports",
      roles: [ROLES.ADMIN, ROLES.SUBADMIN, ROLES.TEAM_LEADER],
    },
    {
      label: "Billing",
      icon: <CreditCard size={20} />,
      href: "/dashboard/billing",
      roles: [ROLES.ADMIN],
    },
  ];

  const filteredItems = menuItems.filter((item) => item.roles.includes(userRole));
  const settingsActive = pathname === settingsHref;

  return (
    <>
      <div className="fixed left-4 top-4 z-50 lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/85 p-3 text-slate-900 shadow-xl shadow-slate-200/50 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-950/85 dark:text-white dark:shadow-black/20 dark:hover:border-blue-500/30 dark:hover:text-blue-200"
        >
          <div className="relative z-10">{isOpen ? <X size={20} /> : <Menu size={20} />}</div>
          <div className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-blue-600 to-indigo-500 transition-transform duration-300 group-hover:scale-x-100" />
        </button>
      </div>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden"
          />
        ) : null}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white/92 px-5 py-5 shadow-2xl shadow-slate-200/50 backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] dark:border-slate-800 dark:bg-slate-950/92 dark:shadow-black/30 lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0 lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="rounded-[2rem] border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-blue-50/70 p-5 shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                Veagle Space
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Dashboard
              </h2>
            </div>
            <div className="rounded-2xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-white dark:bg-slate-100 dark:text-slate-950">
              {roleLabel}
            </div>
          </div>
        </div>

        <nav className="mt-6 flex-1 space-y-2">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "group flex items-center gap-4 rounded-[1.4rem] border px-4 py-3.5 transition-all duration-300",
                  isActive
                    ? "border-blue-500/20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-900/20 dark:shadow-blue-950/30"
                    : "border-transparent text-slate-600 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-slate-50 hover:text-blue-600 dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-900 dark:hover:text-blue-200"
                )}
              >
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300",
                    isActive
                      ? "bg-white/15 text-white"
                      : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-slate-900 dark:text-slate-400 dark:group-hover:bg-slate-800 dark:group-hover:text-blue-200"
                  )}
                >
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black tracking-wide">{item.label}</p>
                </div>
                {isActive ? (
                  <motion.div layoutId="active-nav-dot" className="h-2.5 w-2.5 rounded-full bg-white" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-slate-50/90 p-3 shadow-lg shadow-slate-200/35 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20">
          <Link
            href={settingsHref}
            onClick={() => setIsOpen(false)}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-[1.3rem] border px-4 py-3 text-sm font-black transition-all duration-300",
              settingsActive
                ? "border-blue-500/20 bg-blue-600 text-white shadow-[0_18px_44px_rgba(59,130,246,0.24)]"
                : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-blue-500/30 dark:hover:bg-slate-900 dark:hover:text-blue-200"
            )}
          >
            <Settings size={18} />
            Settings
          </Link>
        </div>
      </aside>
    </>
  );
}
