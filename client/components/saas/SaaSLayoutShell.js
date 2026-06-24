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
  UserPlus,
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
import { useGetOrgNotificationsQuery, useGetOrgRegistrationRequestsQuery } from "@/services/api/orgApi";
import UserAvatar from "@/components/UserAvatar";
import {
  formatRoleLabel,
  getRoleBadgeTheme,
  hasPermission,
  resolveDashboardPath,
  ROLES,
} from "@/utils/roles";
import DashboardBrandBlock from "@/components/DashboardBrandBlock";
import DashboardFooter from "@/components/dashboard/DashboardFooter";

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
  if (normalized.includes("request")) return UserPlus;
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userSignOut] = useUserSignOutMutation();
  const loginPath = sectionRoot === "/super-admin" ? "/super-admin/login" : "/login";
  const currentRole = user?.currentRole;
  const dashboardPath = useMemo(
    () => resolveDashboardPath(currentRole, user?.dashboardPath),
    [currentRole, user?.dashboardPath]
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
  const currentNavItem = useMemo(() => {
    const candidates = Array.isArray(navItems) ? navItems : [];
    return candidates
      .filter(
        (item) =>
          item?.href &&
          (pathname === item.href || pathname?.startsWith(`${item.href}/`))
      )
      .sort((left, right) => String(right.href).length - String(left.href).length)[0];
  }, [navItems, pathname]);
  const isCurrentPathBlocked =
    Boolean(currentNavItem?.permission) &&
    !hasPermission(user, currentNavItem.permission);
  const resolvedNavItems = useMemo(
    () =>
      visibleNavItems.map((item) => ({
        ...item,
        Icon: getNavIcon(item.label),
      })),
    [visibleNavItems]
  );

  const hasNotificationsNavItem = visibleNavItems.some((item) => item.label === "Notifications");
  const hasRequestsNavItem = visibleNavItems.some((item) => item.label === "Requests");

  const { data: notificationsData } = useGetOrgNotificationsQuery(1, { skip: !hasNotificationsNavItem });
  const { data: requestsData } = useGetOrgRegistrationRequestsQuery(undefined, { skip: !hasRequestsNavItem });

  const badgeCounts = useMemo(() => ({
    Notifications: notificationsData?.meta?.unreadCount || 0,
    Requests: requestsData?.items?.length || 0,
  }), [notificationsData, requestsData]);

  const roleLabel = formatRoleLabel(currentRole);
  const roleBadgeTheme = getRoleBadgeTheme(currentRole);
  const settingsHref = sectionRoot ? `${sectionRoot}/settings` : "/settings";
  const settingsActive = pathname === settingsHref;
  // Auto-close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);
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
      return;
    }

    if (isCurrentPathBlocked) {
      const fallbackPath = dashboardPath || `${sectionRoot || "/member"}/dashboard`;
      if (pathname !== fallbackPath) {
        router.replace(fallbackPath);
      }
    }
  }, [
    dashboardPath,
    expectedRoot,
    hydrated,
    isCurrentPathBlocked,
    loading,
    loginPath,
    pathname,
    router,
    sectionRoot,
    token,
  ]);

  useIdleRoutePrefetch(router, prefetchedRoutes);

  const onLogout = async () => {
    try {
      await userSignOut().unwrap();
    } catch (_) {
      // Logout should still proceed on client even if API call fails.
    }

    dispatch(logout());
    setMobileNavOpen(false);
    router.replace(currentRole === ROLES.SUPER_ADMIN ? "/super-admin/login" : "/login");
  };

  if (!hydrated || loading || !token || isCurrentPathBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white/88 px-6 py-4 text-sm font-semibold text-slate-600 shadow-[0_20px_50px_rgba(59,130,246,0.12)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/88 dark:text-slate-200 dark:shadow-black/30">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-300 dark:border-t-transparent" />
          Loading your workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-theme flex h-screen overflow-hidden bg-background transition-colors duration-300 dark:text-slate-100">
      {mobileNavOpen ? (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[88vw] max-w-[20rem] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white/92 px-4 py-4 shadow-2xl shadow-slate-200/50 backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] dark:border-slate-800 dark:bg-slate-950/92 dark:shadow-black/30 sm:w-80 sm:px-5 sm:py-5 lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0 lg:shadow-none",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="light-glow-card-static rounded-[2rem] p-5 shrink-0">
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
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "group flex items-center gap-4 rounded-[1.4rem] px-4 py-3.5",
                  active ? "brand-nav-item-active" : "brand-nav-item"
                )}
              >
                <div className="relative">
                  <span className="brand-nav-icon flex h-11 w-11 items-center justify-center rounded-2xl">
                    <Icon size={20} />
                  </span>
                  {badgeCounts[item.label] > 0 ? (
                    <span className="absolute -right-1 -top-1 flex min-w-[20px] h-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-950">
                      {badgeCounts[item.label] > 99 ? "99+" : badgeCounts[item.label]}
                    </span>
                  ) : null}
                </div>
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
            onClick={() => setMobileNavPath(null)}
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

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200/80 bg-white/88 px-3 py-3 shadow-[0_12px_34px_rgba(59,130,246,0.10)] backdrop-blur-xl transition-all duration-500 dark:border-slate-800 dark:bg-slate-950/82 dark:shadow-black/20 sm:px-4 sm:py-4 md:px-6">
          <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen((prev) => !prev)}
                className="brand-btn brand-btn-secondary brand-btn-sm rounded-2xl px-3 py-2 lg:hidden"
                aria-label={mobileNavOpen ? "Close section menu" : "Open section menu"}
              >
                {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
                <ChevronDown
                  size={14}
                  className={cn("transition-transform", mobileNavOpen ? "rotate-180" : "")}
                />
              </button>
            </div>

            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="brand-panel-soft hidden min-w-[320px] max-w-[420px] rounded-[1.5rem] border border-slate-200/80 bg-white/88 px-4 py-3 shadow-[0_18px_42px_rgba(59,130,246,0.10)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/88 dark:shadow-[0_22px_50px_rgba(2,6,23,0.34)] lg:block">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    src={user?.profileImageUrl}
                    name={user?.name || "User"}
                    className="h-12 w-12 rounded-2xl text-sm"
                    fallbackClassName={roleBadgeTheme.accent}
                    sizes="48px"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-left text-sm font-semibold tracking-[0.01em] text-slate-900 dark:text-white">
                      {user?.name || "User"}
                    </p>
                    <p className="brand-copy-sm mt-1 truncate text-left text-xs">
                      {user?.email || "-"}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "inline-flex shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur-md",
                      roleBadgeTheme.header
                    )}
                  >
                    {roleLabel}
                  </div>
                </div>
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

        <main className="min-w-0 flex-1 shrink-0 p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1540px]">{children}</div>
        </main>
        <div className="shrink-0">
          <DashboardFooter />
        </div>
      </div>
    </div>
  );
}
