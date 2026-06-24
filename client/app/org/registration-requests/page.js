"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Phone,
  Home,
  RefreshCcw,
  User,
  MapPin,
  XCircle,
  AlertCircle,
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import PaginationControls from "@/components/dashboard/PaginationControls";
import useLocalPagination from "@/hooks/useLocalPagination";
import {
  useGetOrgRegistrationRequestsQuery,
  useAcceptRegistrationRequestMutation,
  useRejectRegistrationRequestMutation,
} from "@/services/api/orgApi";
import { DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getErrorMessage = (error, fallback) =>
  error?.data?.message || error?.error || fallback;

export default function RegistrationRequestsPage() {
  const [actionId, setActionId] = useState("");
  const [rejectNoteId, setRejectNoteId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [isBulkActionBusy, setIsBulkActionBusy] = useState(false);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useGetOrgRegistrationRequestsQuery();

  const [acceptRequest] = useAcceptRegistrationRequestMutation();
  const [rejectRequest] = useRejectRegistrationRequestMutation();

  const items = Array.isArray(data?.items) ? data.items : [];
  const loading = isLoading || isFetching;
  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    setPage,
    setPageSize,
  } = useLocalPagination(items, {
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.REQUESTS[0],
    dependencies: [items.length],
  });

  const refreshRequests = async () => {
    setError("");
    setMessage("");
    await refetch();
  };

  const handleAccept = async (requestId) => {
    try {
      setActionId(requestId);
      setError("");
      setMessage("");
      await acceptRequest(requestId).unwrap();
      setMessage("User approved and registered successfully.");
      setSelectedRequests(prev => prev.filter(id => id !== requestId));
      await refetch();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to approve request"));
    } finally {
      setActionId("");
    }
  };

  const handleReject = async (requestId) => {
    try {
      setActionId(requestId);
      setError("");
      setMessage("");
      await rejectRequest({ requestId, note: rejectNote || "Rejected by administrator" }).unwrap();
      setMessage("Registration request rejected and archived.");
      setRejectNoteId(null);
      setRejectNote("");
      setSelectedRequests(prev => prev.filter(id => id !== requestId));
      await refetch();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to reject request"));
    } finally {
      setActionId("");
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRequests(items.map(item => item.id));
    } else {
      setSelectedRequests([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedRequests(prev => 
      prev.includes(id) ? prev.filter(reqId => reqId !== id) : [...prev, id]
    );
  };

  const handleBulkAccept = async () => {
    try {
      setIsBulkActionBusy(true);
      setError("");
      setMessage("");
      
      const promises = selectedRequests.map(id => acceptRequest(id).unwrap());
      await Promise.all(promises);
      
      setMessage(`${selectedRequests.length} users approved and registered successfully.`);
      setSelectedRequests([]);
      await refetch();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to approve some requests"));
      await refetch(); 
    } finally {
      setIsBulkActionBusy(false);
    }
  };

  const handleBulkReject = async () => {
    try {
      setIsBulkActionBusy(true);
      setError("");
      setMessage("");
      
      const promises = selectedRequests.map(id => rejectRequest({ requestId: id, note: "Rejected by administrator in bulk" }).unwrap());
      await Promise.all(promises);
      
      setMessage(`${selectedRequests.length} registration requests rejected.`);
      setSelectedRequests([]);
      await refetch();
    } catch (mutationError) {
      setError(getErrorMessage(mutationError, "Failed to reject some requests"));
      await refetch();
    } finally {
      setIsBulkActionBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                <UserPlus size={20} />
              </div>
              <h2 className="mobile-compact-title text-2xl font-black text-slate-900 dark:text-white">
                Registration Requests
              </h2>
            </div>
            <p className="mobile-hide-copy mt-2 text-sm text-slate-600 dark:text-slate-400">
              Members who requested to join your organization via the referral link appear here.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                <Clock size={12} />
                {items.length} pending
              </span>
            )}
            <button
              type="button"
              onClick={refreshRequests}
              disabled={loading}
              className="brand-btn brand-btn-secondary brand-btn-md"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
            <AlertCircle size={16} />
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200">
            <CheckCircle2 size={16} />
            {message}
          </div>
        ) : null}
      </div>

      {/* Request Cards */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500 dark:text-slate-400">
          <Loader2 className="animate-spin" size={20} />
          <span className="text-sm font-medium">Loading requests...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/60">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ShieldCheck size={28} className="text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            No pending registration requests
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            New requests will appear here when members join via your referral link.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRequests.length === items.length && items.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select All</span>
              </label>
              
              {selectedRequests.length > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="mr-2 hidden text-xs font-medium text-slate-500 sm:inline">{selectedRequests.length} selected</span>
                  <button
                    type="button"
                    onClick={handleBulkAccept}
                    disabled={isBulkActionBusy || loading}
                    className="brand-btn brand-btn-soft brand-btn-sm"
                  >
                    {isBulkActionBusy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    <span className="hidden sm:inline">Approve Selected</span>
                    <span className="sm:hidden">Approve</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkReject}
                    disabled={isBulkActionBusy || loading}
                    className="brand-btn brand-btn-danger brand-btn-sm"
                  >
                    {isBulkActionBusy ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    <span className="hidden sm:inline">Reject Selected</span>
                    <span className="sm:hidden">Reject</span>
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedItems.map((item) => {
            const busy = String(actionId) === String(item.id);
            const showRejectForm = rejectNoteId === item.id;

            return (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900/80 dark:hover:border-slate-600"
              >
                {/* Accent bar */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 opacity-60 transition-opacity group-hover:opacity-100" />

                {/* Checkbox for individual selection */}
                <div className="absolute right-4 top-4 z-10">
                  <input
                    type="checkbox"
                    checked={selectedRequests.includes(item.id)}
                    onChange={() => handleSelectOne(item.id)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                  />
                </div>

                {/* Name & Date */}
                <div className="mb-4 mt-1 pr-6">
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {item.name || "Unknown"}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Submitted {formatDate(item.createdAt)}
                  </p>
                </div>

                {/* Details */}
                <div className="space-y-2.5">
                  <DetailRow icon={Mail} label={item.email || "-"} wrap />
                  <DetailRow icon={Phone} label={item.mobile ? `${item.mobileCountryCode || ""} ${item.mobile}` : "-"} />
                  {item.emergencyContact && (
                    <DetailRow icon={Phone} label={`Emergency: ${item.emergencyContact}`} wrap />
                  )}
                  {item.gender && (
                    <DetailRow icon={User} label={item.gender.charAt(0) + item.gender.slice(1).toLowerCase()} />
                  )}
                  {item.city && <DetailRow icon={MapPin} label={item.city} />}
                  {item.currentAddress && (
                    <DetailRow icon={Home} label={`Current: ${item.currentAddress}`} wrap />
                  )}
                  {item.permanentAddress && (
                    <DetailRow icon={Home} label={`Permanent: ${item.permanentAddress}`} wrap />
                  )}
                </div>

                {/* Expiry indicator */}
                <div className="mt-4 mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Expires {formatDate(item.expiresAt)}
                  </p>
                </div>

                {/* Actions */}
                {showRejectForm ? (
                  <div className="space-y-3">
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Reason for rejection (optional)"
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleReject(item.id)}
                        disabled={busy}
                        className="brand-btn brand-btn-danger brand-btn-sm flex-1"
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                        Confirm Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRejectNoteId(null); setRejectNote(""); }}
                        disabled={busy}
                        className="brand-btn brand-btn-secondary brand-btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAccept(item.id)}
                      disabled={busy}
                      className="brand-btn brand-btn-soft brand-btn-sm flex-1"
                    >
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRejectNoteId(item.id); setRejectNote(""); }}
                      disabled={busy}
                      className="brand-btn brand-btn-danger brand-btn-sm flex-1"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          </div>

          <PaginationControls
            page={page}
            pageSize={pageSize}
            totalItems={items.length}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.REQUESTS}
            label="requests"
          />
        </div>
      )}
    </section>
  );
}

function DetailRow({ icon: Icon, label, wrap = false }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
      <Icon size={14} className="shrink-0 text-slate-400 dark:text-slate-500" />
      <span className={wrap ? "min-w-0 flex-1 break-all" : "min-w-0 flex-1 truncate"}>{label}</span>
    </div>
  );
}
