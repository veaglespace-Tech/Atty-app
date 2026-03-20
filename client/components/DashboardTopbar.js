"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { LogOut, Sparkles } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { logout } from "@/store/slices/authSlice";
import { useUserSignOutMutation } from "@/store/api/authApi";
import { formatRoleLabel } from "@/utils/roles";

const SECTION_META = {
  "/dashboard": {
    eyebrow: "Workspace Overview",
    title: "Overview",
  },
  "/dashboard/attendance": {
    eyebrow: "Attendance Center",
    title: "Attendance",
  },
  "/dashboard/employees": {
    eyebrow: "Team Directory",
    title: "Employees",
  },
  "/dashboard/reports": {
    eyebrow: "Insights & Exports",
    title: "Reports",
  },
  "/dashboard/settings": {
    eyebrow: "Workspace Controls",
    title: "Settings",
  },
  "/dashboard/billing": {
    eyebrow: "Plan & Usage",
    title: "Billing",
  },
};

export default function DashboardTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [userSignOut] = useUserSignOutMutation();
  const firstName = String(user?.name || "").trim().split(/\s+/)[0] || "User";

  const section = useMemo(() => {
    return SECTION_META[pathname] || {
      eyebrow: "Dashboard",
      title: "Dashboard",
    };
  }, [pathname]);

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
    <header className="light-glow-card-static sticky top-4 z-20 mb-8 rounded-[2rem] px-5 py-5 lg:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
            <Sparkles size={14} className="text-blue-600 dark:text-blue-300" />
            {section.eyebrow}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {section.title}
            </h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              {firstName} | {formatRoleLabel(user?.role)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          <div className="hidden min-w-[230px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right md:block dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.name || "User"}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {user?.organizationCode || user?.email || "Workspace"}
            </p>
          </div>
          <ThemeToggle showLabel className="w-full justify-center sm:w-auto" />
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-black text-rose-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
