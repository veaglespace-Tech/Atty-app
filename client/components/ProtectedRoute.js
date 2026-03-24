"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { resolveDashboardPath } from "@/utils/roles";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, token, loading, redirectPath, hydrated } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const fallbackPath =
    resolveDashboardPath(user?.role, user?.dashboardPath || redirectPath) || "/member/dashboard";
  const shouldRedirectLegacyDashboard =
    Boolean(token && pathname?.startsWith("/dashboard") && !fallbackPath.startsWith("/dashboard"));

  useEffect(() => {
    if (!hydrated || loading) return;

    if (!token) {
      if (pathname !== "/login") {
        router.replace("/login");
      }
    } else if (allowedRoles && !allowedRoles.includes(user?.role)) {
      if (pathname !== fallbackPath) {
        router.replace(fallbackPath);
      }
    } else if (shouldRedirectLegacyDashboard && pathname !== fallbackPath) {
      router.replace(fallbackPath);
    }
  }, [
    allowedRoles,
    fallbackPath,
    hydrated,
    loading,
    pathname,
    router,
    shouldRedirectLegacyDashboard,
    token,
    user?.role,
  ]);

  if (
    !hydrated ||
    loading ||
    !token ||
    shouldRedirectLegacyDashboard ||
    (allowedRoles && !allowedRoles.includes(user?.role))
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return children;
}
