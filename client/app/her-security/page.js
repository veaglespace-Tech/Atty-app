"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import HerSecurityContent from "@/components/HerSecurityContent";
import DashboardBrandBlock from "@/components/DashboardBrandBlock";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuthSession } from "@/hooks/useAuthSession";
import { resolveDashboardPath } from "@/utils/roles";
import { ArrowLeft, ShieldAlert } from "lucide-react";

function StandaloneHerSecurity() {
  const router = useRouter();
  const { user } = useAuthSession();
  const currentRole = user?.currentRole;
  const dashboardPath = resolveDashboardPath(currentRole, user?.dashboardPath) || "/member/dashboard";

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-300 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Standalone Full-Width Top Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 shadow-sm px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(dashboardPath)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>

            <div className="hidden sm:block h-6 w-[1px] bg-slate-200 dark:bg-slate-800" />

            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-rose-600 animate-pulse" />
              <span className="text-base font-black tracking-tight">
                तिची सुरक्षा <span className="text-rose-600 dark:text-rose-400">/ Her Security Portal</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href={dashboardPath}
              className="hidden sm:flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/30 hover:bg-rose-500 transition-colors"
            >
              Return to App
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <HerSecurityContent />
      </main>
    </div>
  );
}

export default function HerSecurityPage() {
  return (
    <ProtectedRoute>
      <StandaloneHerSecurity />
    </ProtectedRoute>
  );
}
