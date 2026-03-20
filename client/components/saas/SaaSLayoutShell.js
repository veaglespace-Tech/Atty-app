"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
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
import { useUserSignOutMutation } from "@/store/api/authApi";
import {
  formatRoleLabel,
  hasPermission,
  normalizeRole,
  resolveDashboardPath,
  ROLES,
} from "@/utils/roles";

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

function toTitleCaseFromPath(value) {
  return String(value || "")
    .split(/[-_]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getRoleBadgeTheme(role) {
  switch (normalizeRole(role)) {
    case ROLES.SUPER_ADMIN:
      return {
        sidebar:
          "border border-blue-400/20 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-[0_18px_42px_rgba(59,130,246,0.30)] dark:border-blue-400/20 dark:from-blue-500 dark:via-indigo-500 dark:to-cyan-400 dark:text-white",
        header:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/12 dark:text-blue-200",
      };
    case ROLES.ORG_ADMIN:
      return {
        sidebar:
          "border border-blue-400/20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_18px_42px_rgba(59,130,246,0.28)] dark:border-blue-400/20 dark:bg-blue-400 dark:text-slate-950",
        header:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/12 dark:text-blue-200",
      };
    case ROLES.SUB_ADMIN:
      return {
        sidebar:
          "border border-violet-400/20 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_18px_42px_rgba(124,58,237,0.28)] dark:border-violet-400/20 dark:from-violet-500 dark:to-indigo-500 dark:text-white",
        header:
          "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/12 dark:text-violet-200",
      };
    case ROLES.TEAM_LEADER:
      return {
        sidebar:
          "border border-emerald-400/20 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_18px_42px_rgba(16,185,129,0.26)] dark:border-emerald-400/20 dark:from-emerald-500 dark:to-teal-400 dark:text-white",
        header:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-200",
      };
    case ROLES.MEMBER:
    default:
      return {
        sidebar:
          "border border-amber-400/20 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_18px_42px_rgba(245,158,11,0.28)] dark:border-amber-400/20 dark:from-amber-500 dark:to-orange-400 dark:text-white",
        header:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/12 dark:text-amber-200",
      };
  }
}

export default function SaaSLayoutShell({ title, sectionRoot, navItems, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, token, loading, hydrated } = useSelector((state) => state.auth);
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

  const firstName = String(user?.name || "").trim().split(/\s+/)[0] || "User";
  const roleLabel = formatRoleLabel(user?.role);
  const roleBadgeTheme = getRoleBadgeTheme(user?.role);
  const settingsHref = sectionRoot ? `${sectionRoot}/settings` : "/settings";
  const settingsActive = pathname === settingsHref;
  const mobileNavOpen = mobileNavPath === pathname;

  const displayTitle = useMemo(() => {
    if (pathname?.endsWith("/dashboard")) return `${firstName}'s Dashboard`;

    const matchedNavItem = visibleNavItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
    if (matchedNavItem) return matchedNavItem.label;

    if (pathname === settingsHref) return "Settings";

    const lastSegment = pathname?.split("/").filter(Boolean).pop();
    return lastSegment ? toTitleCaseFromPath(lastSegment) : title;
  }, [firstName, pathname, settingsHref, title, visibleNavItems]);

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
    <div className="dashboard-theme flex min-h-screen bg-slate-100 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <aside className="hidden w-80 shrink-0 flex-col border-r border-slate-200/80 bg-white/88 px-5 py-5 shadow-[0_28px_90px_rgba(59,130,246,0.12)] backdrop-blur-xl transition-all duration-500 dark:border-slate-800 dark:bg-slate-950/88 dark:shadow-black/25 md:flex">
        <div className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-white via-slate-50 to-blue-50/80 p-5 shadow-[0_24px_70px_rgba(59,130,246,0.14)] transition-all duration-500 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 dark:shadow-black/25">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                Veagle Space
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {title}
              </h2>
            </div>
            <div
              className={cn(
                "shrink-0 whitespace-nowrap rounded-2xl px-3.5 py-2 text-center text-[10px] font-black uppercase tracking-[0.22em]",
                roleBadgeTheme.sidebar
              )}
            >
              {roleLabel}
            </div>
          </div>
        </div>

        <nav className="mt-6 flex-1 space-y-2">
          {visibleNavItems.map((item) => {
            const active = pathname === item.href;
            const Icon = getNavIcon(item.label);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-4 rounded-[1.4rem] border px-4 py-3.5 transition-all duration-500",
                  active
                    ? "border-blue-500/20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_18px_44px_rgba(59,130,246,0.30)] dark:shadow-blue-950/30"
                    : "border-transparent text-slate-600 hover:-translate-y-1 hover:border-blue-100 hover:bg-white hover:text-blue-600 hover:shadow-[0_18px_44px_rgba(59,130,246,0.14)] dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-900 dark:hover:text-blue-200"
                )}
              >
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300",
                    active
                      ? "bg-white/15 text-white"
                      : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-slate-900 dark:text-slate-400 dark:group-hover:bg-slate-800 dark:group-hover:text-blue-200"
                  )}
                >
                  <Icon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black tracking-wide">{item.label}</p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 rounded-[1.75rem] border border-white/70 bg-white/88 p-3 shadow-[0_22px_64px_rgba(59,130,246,0.12)] transition-all duration-500 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20">
          <Link
            href={settingsHref}
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

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/88 px-4 py-4 shadow-[0_12px_34px_rgba(59,130,246,0.10)] backdrop-blur-xl transition-all duration-500 dark:border-slate-800 dark:bg-slate-950/82 dark:shadow-black/20 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setMobileNavPath((currentPath) => (currentPath === pathname ? null : pathname))
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 transition-all hover:border-blue-200 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500/30 dark:hover:text-blue-200 md:hidden"
                aria-label={mobileNavOpen ? "Close section menu" : "Open section menu"}
              >
                {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
                <ChevronDown
                  size={14}
                  className={cn("transition-transform", mobileNavOpen ? "rotate-180" : "")}
                />
              </button>

              <div className="min-w-0">
                <h1 className="truncate text-sm font-black text-slate-900 dark:text-white md:text-base">
                  {displayTitle}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right dark:border-slate-800 dark:bg-slate-900 lg:block">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.name || "User"}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email || "-"}</p>
              </div>
              <p
                className={cn(
                  "hidden rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] sm:block",
                  roleBadgeTheme.header
                )}
              >
                {roleLabel}
              </p>
              <ThemeToggle className="w-11 px-0 sm:w-auto sm:px-4" showLabel={false} />
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-black text-rose-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15 sm:px-4"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {mobileNavOpen ? (
          <div className="border-b border-slate-200/80 bg-white px-4 py-4 shadow-[0_12px_32px_rgba(59,130,246,0.10)] dark:border-slate-800 dark:bg-slate-950 md:hidden">
            <div className="space-y-2">
              {visibleNavItems.map((item) => {
                const active = pathname === item.href;
                const Icon = getNavIcon(item.label);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavPath(null)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all",
                      active
                        ? "border-blue-500/20 bg-blue-600 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-2xl",
                        active
                          ? "bg-white/15"
                          : "bg-white text-slate-500 dark:bg-slate-950 dark:text-slate-300"
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="text-sm font-black">{item.label}</span>
                  </Link>
                );
              })}

              <Link
                href={settingsHref}
                onClick={() => setMobileNavPath(null)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all",
                  settingsActive
                    ? "border-blue-500/20 bg-blue-600 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl",
                    settingsActive
                      ? "bg-white/15"
                      : "bg-white text-slate-500 dark:bg-slate-950 dark:text-slate-300"
                  )}
                >
                  <Settings size={18} />
                </span>
                <span className="text-sm font-black">Settings</span>
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
