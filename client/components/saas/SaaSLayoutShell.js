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
import { useGetOrgNotificationsQuery, useGetOrgRegistrationRequestsQuery, useGetOrgRegularizationRequestsQuery } from "@/services/api/orgApi";
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
  if (normalized.includes("referral")) return UserPlus;
  return ShieldCheck;
}

function getNavColor(label) {
  const normalized = String(label || "").toLowerCase();

  if (normalized.includes("dashboard")) return "text-blue-500 dark:text-blue-400";
  if (normalized.includes("attendance")) return "text-indigo-500 dark:text-indigo-400";
  if (normalized.includes("report") || normalized.includes("analytic")) return "text-purple-500 dark:text-purple-400";
  if (normalized.includes("notification")) return "text-sky-500 dark:text-sky-400";
  if (normalized.includes("request")) return "text-rose-500 dark:text-rose-400";
  if (normalized.includes("team")) return "text-cyan-500 dark:text-cyan-400";
  if (normalized.includes("user") || normalized.includes("employee")) return "text-cyan-500 dark:text-cyan-400";
  if (
    normalized.includes("subscription") ||
    normalized.includes("payment") ||
    normalized.includes("plan") ||
    normalized.includes("billing")
  ) {
    return "text-violet-500 dark:text-violet-400";
  }
  if (normalized.includes("organization")) return "text-blue-600 dark:text-blue-400";
  if (normalized.includes("referral")) return "text-emerald-500 dark:text-emerald-400";
  return "text-slate-500 dark:text-slate-400";
}

export default function SaaSLayoutShell({ sectionRoot, navItems, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, token, loading, hydrated } = useAuthSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Auto-close mobile nav on route change
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileNavOpen(false);
  }

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
        (item) => {
          if (item.requiresPartner && !user?.isReferralPartner) return false;
          return !item?.permission || hasPermission(user, item.permission);
        }
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
        colorClass: getNavColor(item.label),
      })),
    [visibleNavItems]
  );

  const isSuperAdminRole = currentRole === ROLES.SUPER_ADMIN;
  const isSuperAdminLayout = sectionRoot === "/super-admin";
  const shouldSkipOrgQueries = isSuperAdminRole || isSuperAdminLayout || !user;

  const hasNotificationsNavItem = !shouldSkipOrgQueries && visibleNavItems.some((item) => item.label === "Notifications");
  const hasRequestsNavItem = !shouldSkipOrgQueries && visibleNavItems.some((item) => item.label === "Requests");

  const { data: notificationsData } = useGetOrgNotificationsQuery(1, { skip: !hasNotificationsNavItem });
  const { data: requestsData } = useGetOrgRegistrationRequestsQuery(undefined, { skip: !hasRequestsNavItem });
  const { data: attRequestsData } = useGetOrgRegularizationRequestsQuery(undefined, { skip: !hasRequestsNavItem });

  const badgeCounts = useMemo(() => {
    const regCount = requestsData?.items?.length || 0;
    const attCount = Array.isArray(attRequestsData?.data) ? attRequestsData.data.filter(r => r.status === "PENDING").length : 0;
    return {
      Notifications: notificationsData?.meta?.unreadCount || 0,
      Requests: regCount + attCount,
    };
  }, [notificationsData, requestsData, attRequestsData]);

  const roleLabel = formatRoleLabel(currentRole);
  const roleBadgeTheme = getRoleBadgeTheme(currentRole);
  const settingsHref = sectionRoot ? `${sectionRoot}/settings` : "/settings";
  const settingsActive = pathname === settingsHref;

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
    <div className="dashboard-theme flex h-screen overflow-hidden bg-slate-50 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      {mobileNavOpen ? (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[70] flex w-[88vw] max-w-[20rem] shrink-0 flex-col overflow-y-auto border-r border-slate-200/60 bg-white/95 px-4 py-4 shadow-[0_0_80px_-20px_rgba(0,0,0,0.15)] backdrop-blur-2xl transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] dark:border-slate-800/60 dark:bg-slate-950/95 dark:shadow-black/50 sm:w-80 sm:px-5 sm:py-5 lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0 lg:shadow-none",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="light-glow-card-static rounded-[2rem] p-5 shrink-0">
          <DashboardBrandBlock />
        </div>

        <nav className="mt-6 flex-1 space-y-2 visible-scrollbar">
          {resolvedNavItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.Icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "group flex items-center gap-4 rounded-[1.4rem] px-4 py-3.5 transition-all duration-300",
                  active ? "brand-nav-item-active scale-[1.02]" : "brand-nav-item hover:scale-[1.02]"
                )}
              >
                <div className="relative">
                  <span className="brand-nav-icon flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:rotate-3">
                    <Icon size={20} className={active ? "" : item.colorClass} />
                  </span>
                  {badgeCounts[item.label] > 0 ? (
                    <span className="absolute -right-1 -top-1 flex min-w-[20px] h-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-950">
                      {badgeCounts[item.label] > 99 ? "99+" : badgeCounts[item.label]}
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold tracking-tight">{item.label}</p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="light-glow-card-static mt-6 rounded-[1.75rem] p-3 shrink-0">
          <Link
            href={settingsHref}
            onClick={() => setMobileNavOpen(false)}
            className={cn(
              "brand-btn w-full rounded-[1.25rem] px-4 py-3.5 flex items-center gap-3 transition-all duration-300",
              settingsActive ? "bg-blue-600 text-white shadow-lg hover:-translate-y-1" : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:text-slate-300"
            )}
          >
            <Settings size={20} className={settingsActive ? "animate-spin-slow" : ""} />
            <span className="font-bold">Settings</span>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto visible-scrollbar">
        <header className="sticky top-0 z-40 shrink-0 border-b border-slate-200/50 bg-white/70 px-4 py-3.5 shadow-[0_8px_32px_rgba(59,130,246,0.06)] backdrop-blur-2xl transition-all duration-500 dark:border-slate-800/50 dark:bg-slate-950/70 dark:shadow-black/20 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
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
              <div className="brand-panel-soft hidden min-w-[320px] max-w-[420px] rounded-[1.5rem] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_18px_42px_rgba(59,130,246,0.10)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/88 dark:shadow-[0_22px_50px_rgba(2,6,23,0.34)] lg:block">
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
