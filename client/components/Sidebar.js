"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Newspaper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardBrandBlock from "@/components/DashboardBrandBlock";
import { useIdleRoutePrefetch } from "@/hooks/useIdleRoutePrefetch";
import { hasPermission, PERMISSIONS, ROLES } from "@/utils/roles";

const settingsHref = "/dashboard/settings";
const MENU_ITEMS = [
  {
    label: "Overview",
    Icon: LayoutDashboard,
    href: "/dashboard",
    colorClass: "text-blue-500 dark:text-blue-400",
  },
  {
    label: "Attendance",
    Icon: CalendarCheck,
    href: "/dashboard/attendance",
    permission: PERMISSIONS.ATTENDANCE.VIEW_ALL,
    colorClass: "text-indigo-500 dark:text-indigo-400",
  },
  {
    label: "Employees",
    Icon: Users,
    href: "/dashboard/employees",
    permission: PERMISSIONS.USERS.VIEW,
    colorClass: "text-cyan-500 dark:text-cyan-400",
  },
  {
    label: "Reports",
    Icon: BarChart3,
    href: "/dashboard/reports",
    permission: PERMISSIONS.REPORTS.VIEW,
    colorClass: "text-purple-500 dark:text-purple-400",
  },
  {
    label: "Posts",
    Icon: Newspaper,
    href: "/dashboard/posts",
    permission: PERMISSIONS.POSTS.CREATE,
    colorClass: "text-sky-500 dark:text-sky-400",
  },
  {
    label: "Billing",
    Icon: CreditCard,
    href: "/dashboard/billing",
    permission: PERMISSIONS.SUBSCRIPTION.VIEW,
    colorClass: "text-violet-500 dark:text-violet-400",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const user = useSelector((state) => state.auth.user);
  const userRole = user?.currentRole || ROLES.MEMBER;
  const filteredItems = useMemo(
    () =>
      MENU_ITEMS.filter(
        (item) => !item.permission || hasPermission(user, item.permission)
      ),
    [user]
  );
  const settingsActive = pathname === settingsHref;
  const prefetchedRoutes = useMemo(
    () => [...filteredItems.map((item) => item.href), settingsHref],
    [filteredItems]
  );

  useIdleRoutePrefetch(router, prefetchedRoutes);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    document.documentElement.style.overflow = isOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <div className="fixed left-4 top-4 z-50 lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close dashboard navigation" : "Open dashboard navigation"}
          className="brand-btn brand-btn-secondary group relative overflow-hidden rounded-2xl p-3"
        >
          <div className="relative z-10">{isOpen ? <X size={20} /> : <Menu size={20} />}</div>
          <div className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-sky-400 via-blue-600 to-slate-900 transition-transform duration-300 group-hover:scale-x-100" />
        </button>
      </div>

      {isOpen ? (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-[20rem] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white/92 px-4 py-4 shadow-2xl shadow-slate-200/50 backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] dark:border-slate-800 dark:bg-slate-950/92 dark:shadow-black/30 sm:w-80 sm:px-5 sm:py-5 lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0 lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="light-glow-card-static rounded-[2rem] p-5">
          <DashboardBrandBlock />
        </div>

        <nav className="mt-6 flex-1 space-y-2">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.Icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "group flex items-center gap-4 rounded-[1.4rem] px-4 py-3.5",
                  isActive ? "brand-nav-item-active" : "brand-nav-item"
                )}
              >
                <span className="brand-nav-icon flex h-11 w-11 items-center justify-center rounded-2xl">
                  <Icon size={20} className={isActive ? "" : item.colorClass} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tracking-[0.01em]">{item.label}</p>
                </div>
                {isActive ? <div className="h-2.5 w-2.5 rounded-full bg-white" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="light-glow-card-static mt-6 rounded-[1.75rem] p-3">
          <Link
            href={settingsHref}
            onClick={() => setIsOpen(false)}
            className={cn(
              "brand-btn brand-btn-md w-full rounded-[1.25rem]",
              settingsActive ? "brand-btn-primary" : "brand-btn-secondary"
            )}
          >
            <Settings size={18} className={settingsActive ? "" : "text-slate-500 dark:text-slate-400"} />
            Settings
          </Link>
        </div>
      </aside>
    </>
  );
}
