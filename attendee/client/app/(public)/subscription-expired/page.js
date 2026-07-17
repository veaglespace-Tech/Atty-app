import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import AuthPageShell from "@/components/auth/AuthPageShell";

export default function SubscriptionExpiredPage() {
  return (
    <AuthPageShell
      eyebrow="Access Paused"
      title="Workspace subscription expired"
      description="Your organization access is temporarily paused because the current plan has ended."
      footer={
        <div className="space-y-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 font-bold text-blue-600 underline decoration-2 underline-offset-4 transition hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
          >
            <ArrowLeft size={16} />
            Return to login
          </Link>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Only the organization admin can renew the plan and restore workspace access.
          </p>
        </div>
      }
    >
      <div className="rounded-[2rem] border border-amber-200 bg-amber-50/90 p-6 text-center shadow-[0_24px_60px_rgba(245,158,11,0.10)] dark:border-amber-500/25 dark:bg-amber-500/10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/12 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
          <ShieldAlert size={28} />
        </div>
        <h3 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">
          Access blocked until renewal
        </h3>
        <p className="mt-3 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
          If you are a member, sub admin, or team leader, please ask your organization admin to
          renew the subscription. After renewal, login and dashboard access will work normally again.
        </p>
      </div>
    </AuthPageShell>
  );
}
