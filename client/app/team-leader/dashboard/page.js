"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Layers3, Loader2, RefreshCcw } from "lucide-react";
import { useSelector } from "react-redux";
import { useGetTeamLeaderDashboardQuery } from "@/store/api/teamLeaderApi";

const summaryMapFromArray = (summary) => {
  const map = new Map();
  for (const item of summary || []) {
    if (item?.label) {
      map.set(item.label, item.value);
    }
  }
  return map;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

export default function TeamLeaderDashboardPage() {
  const { user } = useSelector((state) => state.auth);
  const [error, setError] = useState("");
  const { data, isLoading, isFetching, refetch } = useGetTeamLeaderDashboardQuery();
  const summary = useMemo(() => (Array.isArray(data?.summary) ? data.summary : []), [data]);
  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const meta = data?.meta || null;
  const loading = isLoading || isFetching;

  const summaryMap = useMemo(() => summaryMapFromArray(summary), [summary]);
  const modules = Array.isArray(meta?.modules) ? meta.modules : [];
  const firstName = String(user?.name || "").trim().split(/\s+/)[0] || "User";

  const fetchDashboard = async () => {
    setError("");
    try {
      await refetch();
    } catch (err) {
      setError(err?.data?.message || err?.error || "Failed to load dashboard");
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-200/30 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-black/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{`${firstName}'s Dashboard`}</h2>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Team: {meta?.teamName || "Not Assigned"}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchDashboard}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500/30 dark:hover:bg-slate-800 dark:hover:text-blue-200"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Refresh
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>
        ) : null}

        {meta?.message ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            {meta.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Enabled Modules" value={summaryMap.get("Enabled Modules") || 0} />
        <MetricCard label="Team Members" value={summaryMap.get("Team Members") || 0} />
        <MetricCard label="Present Today" value={summaryMap.get("Present Today") ?? "-"} />
        <MetricCard label="Pending Punch Out" value={summaryMap.get("Pending Punch Out") ?? "-"} />
      </div>

      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-200/30 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-black/20">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Your Modules</h3>

        {modules.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">No modules assigned yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <Link
                key={module.key}
                href={module.path}
                className={`rounded-2xl border px-4 py-4 transition-all duration-300 ${
                  module.enabled
                    ? "border-slate-200 bg-slate-50 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/30 dark:hover:bg-slate-800"
                    : "border-slate-100 bg-slate-50/50 text-slate-400 pointer-events-none dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">{module.label}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{module.enabled ? "Access Granted" : "No Access"}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-6 shadow-lg shadow-slate-200/30 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-black/20">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Recent Activity</h3>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500 dark:text-slate-300">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading dashboard activity...</span>
          </div>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">No activity records available.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Date</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Member</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Role</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Status</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Punch In</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Punch Out</th>
                  <th className="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Worked (min)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((record, index) => (
                  <tr key={`${record.member || "member"}-${record.date || "date"}-${index}`} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/70">
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{record.date || "-"}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{record.member || "-"}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{record.role || "-"}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{record.status || "-"}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{formatDate(record.punchInAt)}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{formatDate(record.punchOutAt)}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{record.workedMinutes || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-200/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-black/20">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
        <Layers3 size={14} className="text-slate-400 dark:text-slate-500" />
      </div>
      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
