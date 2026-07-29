"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

function DisabledHerSecurity() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center text-sm font-medium text-slate-600 dark:bg-slate-950 dark:text-slate-400">
      This feature is temporarily disabled. Redirecting to dashboard...
    </div>
  );
}

export default function HerSecurityPage() {
  return (
    <ProtectedRoute>
      <DisabledHerSecurity />
    </ProtectedRoute>
  );
}
