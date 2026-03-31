"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { logout } from "@/store/slices/authSlice";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useIdleRoutePrefetch } from "@/hooks/useIdleRoutePrefetch";
import { useUserSignOutMutation } from "@/services/api/authApi";
import {
  formatRoleLabel,
  getRoleBadgeTheme,
  hasPermission,
  resolveDashboardPath,
  ROLES,
} from "@/utils/roles";
import DashboardBrandBlock from "@/components/DashboardBrandBlock";

function extractRootFromDashboardPath(dashboardPath) {
  if (!dashboardPath) return null;
  return dashboardPath.replace(/\/dashboard$/, "");
}

function getNavIcon(label) {
  const normalized = String(label || "").toLowerCase();

  if (normalized.includes("dashboard")) return LayoutDashboard;
  if (normalized.includes("attendance")) return CalendarDays;
  if (normalized.includes("report") || normalized.includes("analytic")) return BarChart3;
  if (normalized.includes("notification")) return Bell;
  if (normalized.includes("team")) return UsersRound;
  if (normalized.includes("user") || normalized.includes("employee")) return Users;
  if (
    normalized.includes("subscription") ||
    normalized.includes("payment") ||
    normalized.includes("plan") ||
    normalized.includes("billing")
  ) {
    return CreditCard;
  }
  if (normalized.includes("organization")) return Building2;
  return ShieldCheck;
}

export default function SaaSLayoutShell({ sectionRoot, navItems, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, token, loading, hydrated } = useAuthSession();
  const [mobileNavPath, setMobileNavPath] = useState(null);
  const [userSignOut] = useUserSignOutMutation();
  const loginPath = sectionRoot === "/super-admin" ? "/super-admin/login" : "/login";
  const dashboardPath = useMemo(
    () => resolveDashboardPath(user?.role, user?.dashboardPath),
    [user?.dashboardPath, user?.role]
  );

  const expectedRoot = useMemo(() => {
    return extractRootFromDashboardPath(dashboardPath);
  }, [dashboardPath]);

  const visibleNavItems = useMemo(
    () =>
      (Array.isArray(navItems) ? navItems : []).filter(
        (item) => !item?.permission || hasPermission(user, item.permission)
      ),
    [navItems, user]
  );
  const resolvedNavItems = useMemo(
    () =>
      visibleNavItems.map((item) => ({
        ...item,
        Icon: getNavIcon(item.label),
      })),
    [visibleNavItems]
  );

  const roleLabel = formatRoleLabel(user?.role);
  const roleBadgeTheme = getRoleBadgeTheme(user?.role);
  const settingsHref = sectionRoot ? `${sectionRoot}/settings` : "/settings";
  const settingsActive = pathname === settingsHref;
  const mobileNavOpen = mobileNavPath === pathname;
  const prefetchedRoutes = useMemo(
    () => [...resolvedNavItems.map((item) => item.href), settingsHref],
    [resolvedNavItems, settingsHref]
  );

  useEffect(() => {
    if (!hydrated || loading) return;

    if (!token) {
      if (pathname !== loginPath) {
        router.replace(loginPath);
      }
      return;
    }

    if (expectedRoot && !pathname.startsWith(expectedRoot)) {
      if (dashboardPath && pathname !== dashboardPath) {
        router.replace(dashboardPath);
      }
      return;
    }

    if (sectionRoot && !pathname.startsWith(sectionRoot)) {
      const fallbackPath = dashboardPath || "/member/dashboard";
      if (pathname !== fallbackPath) {
        router.replace(fallbackPath);
      }
    }
  }, [dashboardPath, expectedRoot, hydrated, loading, loginPath, pathname, router, sectionRoot, token]);

  useIdleRoutePrefetch(router, prefetchedRoutes);

  const onLogout = async () => {
    try {
      await userSignOut().unwrap();
    } catch (_) {
      // Logout should still proceed on client even if API call fails.
    }

    dispatch(logout());
    setMobileNavPath(null);
    router.replace(user?.role === ROLES.SUPER_ADMIN ? "/super-admin/login" : "/login");
  };

  if (!hydrated || !token) return null;

  return (
    <div className="dashboard-theme flex min-h-screen bg-background transition-colors duration-300 dark:text-slate-100">
      <aside className="hidden w-80 shrink-0 flex-col border-r border-slate-200/80 bg-white/88 px-5 py-5 shadow-[0_28px_90px_rgba(30,112,209,0.12)] backdrop-blur-xl transition-all duration-500 dark:border-slate-800 dark:bg-slate-950/88 dark:shadow-black/25 md:flex">
        <div className="light-glow-card-static rounded-[2rem] p-5">
          <DashboardBrandBlock />
        </div>

        <nav className="mt-6 flex-1 space-y-2">
          {resolvedNavItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.Icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-4 rounded-[1.4rem] px-4 py-3.5",
                  active ? "brand-nav-item-active" : "brand-nav-item"
                )}
              >
                <span className="brand-nav-icon flex h-11 w-11 items-center justify-center rounded-2xl">
                  <Icon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tracking-[0.01em]">{item.label}</p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="light-glow-card-static mt-6 rounded-[1.75rem] p-3">
          <Link
            href={settingsHref}
            className={cn(
              "brand-btn brand-btn-md w-full rounded-[1.25rem]",
              settingsActive ? "brand-btn-primary" : "brand-btn-secondary"
            )}
          >
            <Settings size={18} />
            Settings
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/88 px-4 py-4 shadow-[0_12px_34px_rgba(59,130,246,0.10)] backdrop-blur-xl transition-all duration-500 dark:border-slate-800 dark:bg-slate-950/82 dark:shadow-black/20 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setMobileNavPath((currentPath) => (currentPath === pathname ? null : pathname))
                }
                className="brand-btn brand-btn-secondary brand-btn-sm rounded-2xl px-3 py-2 md:hidden"
                aria-label={mobileNavOpen ? "Close section menu" : "Open section menu"}
              >
                {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
                <ChevronDown
                  size={14}
                  className={cn("transition-transform", mobileNavOpen ? "rotate-180" : "")}
                />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="brand-panel-soft relative hidden min-w-[260px] rounded-[1.5rem] border border-slate-200/80 bg-white/88 px-4 py-3 pr-24 shadow-[0_18px_42px_rgba(59,130,246,0.10)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/88 dark:shadow-[0_22px_50px_rgba(2,6,23,0.34)] md:block">
                <div
                  className={cn(
                    "absolute right-3 top-3 inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur-md",
                    roleBadgeTheme.header
                  )}
                >
                  {roleLabel}
                </div>
                <p className="text-left text-sm font-semibold tracking-[0.01em] text-slate-900 dark:text-white">
                  {user?.name || "User"}
                </p>
                <p className="brand-copy-sm mt-1 text-left text-xs">
                  {user?.email || "-"}
                </p>
              </div>
              <ThemeToggle className="w-11 px-0 sm:w-auto sm:px-4" showLabel={false} />
              <button
                type="button"
                onClick={onLogout}
                className="brand-btn brand-btn-danger brand-btn-md rounded-2xl px-3 py-2.5 sm:px-4"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {mobileNavOpen ? (
          <div className="border-b border-slate-200/80 bg-white/92 px-4 py-4 shadow-[0_12px_32px_rgba(30,112,209,0.10)] dark:border-slate-800 dark:bg-slate-950 md:hidden">
            <div className="space-y-2">
              {resolvedNavItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.Icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavPath(null)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3",
                      active ? "brand-nav-item-active" : "brand-nav-item"
                    )}
                  >
                    <span className="brand-nav-icon flex h-10 w-10 items-center justify-center rounded-2xl">
                      <Icon size={18} />
                    </span>
                    <span className="text-sm font-semibold tracking-[0.01em]">{item.label}</span>
                  </Link>
                );
              })}

              <Link
                href={settingsHref}
                onClick={() => setMobileNavPath(null)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3",
                  settingsActive ? "brand-nav-item-active" : "brand-nav-item"
                )}
              >
                <span className="brand-nav-icon flex h-10 w-10 items-center justify-center rounded-2xl">
                  <Settings size={18} />
                </span>
                <span className="text-sm font-semibold tracking-[0.01em]">Settings</span>
              </Link>
            </div>

          </div>
        ) : null}

        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1540px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
