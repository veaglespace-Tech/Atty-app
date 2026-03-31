"use client";

import Link from "next/link";
import { Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { useGetOrgSubscriptionQuery } from "@/services/api/orgApi";
import { formatCalendarDate } from "@/utils/date";

export default function OrgSubscriptionPage() {
  const { data, isLoading, isFetching, error, refetch } = useGetOrgSubscriptionQuery();
  const meta = data?.meta || {};
  const usage = meta.usage || {};

  if (isLoading) {
    return (
      <section className="light-glow-card-static rounded-[1.9rem] p-8">
        <div className="flex items-center justify-center gap-3 py-10 text-slate-500 dark:text-slate-300">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm font-medium">Loading subscription...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="light-glow-card-static mobile-compact-panel rounded-[2rem] p-6 lg:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/88 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 shadow-[0_14px_34px_rgba(59,130,246,0.10)] dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
              <Sparkles size={14} />
              Subscription
            </p>
            <h2 className="mobile-compact-hero-title mt-4 text-3xl font-black text-slate-900 dark:text-white">
              Current Plan Overview
            </h2>
            <p className="mobile-hide-copy mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Review your active workspace plan here and open the upgrade page only when you want
              to renew or move to a different plan.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/pricing?renew=1"
              className="brand-btn brand-btn-primary brand-btn-md w-full sm:w-auto"
            >
              Upgrade Plan
            </Link>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="brand-btn brand-btn-secondary brand-btn-md w-full sm:w-auto"
            >
              {isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {error?.data?.message || error?.message || "Unable to load subscription details."}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Current Plan" value={meta.currentPlanName || "No active plan"} />
        <InfoCard label="Status" value={meta.subscriptionStatus || "TRIAL"} />
        <InfoCard label="Expiry" value={formatCalendarDate(meta.subscriptionExpiry)} />
        <InfoCard label="Workspace Code" value={meta.organizationCode || "--"} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard
          label="Users"
          value={Number(usage.users || 0)}
          helper="Live users currently present in this organization"
        />
        <InfoCard
          label="Teams"
          value={Number(usage.teams || 0)}
          helper="Live teams currently present in this organization"
        />
      </div>
    </section>
  );
}

function InfoCard({ label, value, helper = "" }) {
  return (
    <div className="dashboard-summary-card">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-xl font-black text-slate-900 dark:text-white">{value}</p>
      {helper ? (
        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{helper}</p>
      ) : null}
    </div>
  );
}
