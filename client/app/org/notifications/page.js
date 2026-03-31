"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCcw, XCircle } from "lucide-react";
import {
  useGetOrgNotificationsQuery,
  useUpdateOrgUserStatusMutation,
} from "@/services/api/orgApi";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const toSummaryMap = (summary) => {
  const map = new Map();
  for (const row of summary || []) {
    if (row?.label) {
      map.set(row.label, row.value);
    }
  }
  return map;
};

const getErrorMessage = (error, fallback) =>
  error?.data?.message || error?.error || fallback;

export default function OrgNotificationsPage() {
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useGetOrgNotificationsQuery(100);

  const [updateStatusMutation] = useUpdateOrgUserStatusMutation();

  const summary = useMemo(() => (Array.isArray(data?.summary) ? data.summary : []), [data]);
  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const summaryMap = useMemo(() => toSummaryMap(summary), [summary]);

  const refreshNotifications = async () => {
    setError("");
    await refetch();
  };

  const processRequest = async (item, status) => {
    try {
      setActionId(item.id);
      setError("");
      setMessage("");

      await updateStatusMutation({ userId: item.id, status }).unwrap();

      setMessage(`Request ${status === "APPROVED" ? "approved" : "rejected"} successfully.`);
      await refetch();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to process request"));
    } finally {
      setActionId("");
    }
  };

  const loading = isLoading || isFetching;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="mobile-compact-title text-2xl font-black text-slate-900">Notifications</h2>
            <p className="mobile-hide-copy mt-2 text-sm text-slate-600">
              New user registration requests appear here. Approve to allow login access.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshNotifications}
            disabled={loading}
            className="brand-btn brand-btn-secondary brand-btn-md"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Refresh
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="Pending Approval Requests" value={summaryMap.get("Pending Approval Requests") || 0} />
        <MetricCard label="Unread Notifications" value={summaryMap.get("Unread Notifications") || 0} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Pending Requests</h3>

        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading notifications...</span>
          </div>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No pending requests right now.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((item) => {
              const busy = actionId === item.id;

              return (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-600">{item.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt)}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => processRequest(item, "APPROVED")}
                      disabled={busy}
                      className="brand-btn brand-btn-soft brand-btn-sm"
                    >
                      <CheckCircle2 size={14} />
                      Approve
                    </button>

                    <button
                      type="button"
                      onClick={() => processRequest(item, "REJECTED")}
                      disabled={busy}
                      className="brand-btn brand-btn-danger brand-btn-sm"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>

                    {busy ? <Loader2 size={14} className="animate-spin text-slate-500" /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="dashboard-summary-card rounded-2xl">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
