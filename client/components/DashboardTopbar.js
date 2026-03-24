"use client";

import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { logout } from "@/store/slices/authSlice";
import { useUserSignOutMutation } from "@/services/api/authApi";
import { formatRoleLabel, getRoleBadgeTheme } from "@/utils/roles";

export default function DashboardTopbar() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [userSignOut] = useUserSignOutMutation();
  const roleLabel = formatRoleLabel(user?.role);
  const roleTheme = getRoleBadgeTheme(user?.role);
  const displayName = user?.name || "User";
  const identityLabel = user?.organizationCode || user?.email || "Workspace";
  const userInitial = String(displayName).trim().charAt(0).toUpperCase() || "U";

  const onLogout = async () => {
    try {
      await userSignOut().unwrap();
    } catch (_) {
      // Client logout should still continue.
    }

    dispatch(logout());
    router.replace("/login");
  };

  return (
    <header className="light-glow-card-static sticky top-4 z-20 mb-8 overflow-hidden rounded-[2rem] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_24%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)]" />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="hidden min-w-[260px] flex-1 md:block">
            <div className="brand-panel-soft relative max-w-md rounded-[1.5rem] px-4 py-3 pr-24">
              <div
                className={cn(
                  "absolute right-3 top-3 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
                  roleTheme.header
                )}
              >
                {roleLabel}
              </div>
              <p className="text-left text-sm font-semibold tracking-[0.01em] text-slate-900 dark:text-white">
                {displayName}
              </p>
              <p className="brand-copy-sm mt-1 text-xs">{identityLabel}</p>
            </div>
          </div>

          <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-3 md:w-auto">
            <ThemeToggle showLabel className="w-full justify-center sm:w-auto" />
            <button
              type="button"
              onClick={onLogout}
              className="brand-btn brand-btn-danger brand-btn-md rounded-2xl px-4 py-2.5"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        <div className="mt-3 md:hidden">
          <div className="brand-panel-soft flex items-center gap-3 rounded-[1.5rem] px-4 py-3">
            <div
              className={cn(
                "brand-icon-shell flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black",
                roleTheme.accent
              )}
            >
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-[0.01em] text-slate-900 dark:text-white">
                {displayName}
              </p>
              <p className="brand-copy-sm truncate text-xs">{identityLabel}</p>
            </div>
            <div
              className={cn(
                "inline-flex shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
                roleTheme.header
              )}
            >
              {roleLabel}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
