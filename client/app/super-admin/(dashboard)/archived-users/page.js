"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Archive, Loader2, RefreshCcw, RotateCcw, Search, User, X } from "lucide-react";
import PaginationControls from "@/components/dashboard/PaginationControls";
import useLocalPagination from "@/hooks/useLocalPagination";
import UserAvatar from "@/components/UserAvatar";
import { useGetSuperAdminArchivedUsersQuery, useRestoreSuperAdminUserMutation } from "@/services/api/superAdminApi";
import { DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import { getErrorMessage } from "@/utils/formValidation";

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function SuperAdminArchivedUsersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [restoringId, setRestoringId] = useState(null);

  const { data, isLoading, isFetching, refetch } = useGetSuperAdminArchivedUsersQuery();
  const [restoreSuperAdminUserMutation] = useRestoreSuperAdminUserMutation();

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const loading = isLoading || isFetching;

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((user) => {
      const haystack = [user.name, user.email, user.mobile, user.role, user.archiveReason]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [items, searchTerm]);

  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    setPage,
    setPageSize,
    paginatedItems,
  } = useLocalPagination(filteredItems, 10);

  const handleRestore = async (userId, userItem, e) => {
    if (e) e.stopPropagation();
    if (userItem?.hasActiveAccount) {
      alert(`This user has already registered a new active account and is currently live in the organization.`);
      return;
    }
    if (!window.confirm("Are you sure you want to restore this user back to active state?")) return;
    try {
      setRestoringId(userId);
      setError("");
      setMessage("");

      await restoreSuperAdminUserMutation(userId).unwrap();
      setMessage("User restored successfully!");
      refetch();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to restore user"));
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/super-admin/users")}
          className="brand-btn brand-btn-secondary brand-btn-sm"
        >
          <ArrowLeft size={14} /> Back to Users
        </button>

        <button title="Refresh"
          type="button"
          onClick={refetch}
          disabled={loading}
          className="brand-btn brand-btn-secondary brand-btn-sm"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          
        </button>
      </div>

      <div className="light-glow-card-static rounded-[1.9rem] p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-500">
              <Archive size={16} /> Super Admin Archived Directory
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              Archived & Deleted Users (System-wide)
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              View all deleted user accounts across all organizations and restore them with 1-click.
            </p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            Total Archived: {items.length}
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
        ) : null}

        <div className="mt-6">
          <div className="relative max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, role, or reason..."
              className="dashboard-field-control w-full pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              No archived users found in system.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-900/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">User</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Role</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Reason</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Archived At</th>
                      <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedItems.map((user) => (
                      <tr
                        key={user.id}
                        onClick={() => router.push(`/super-admin/users/${user.userId || user.id}`)}
                        className="cursor-pointer transition hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                      >
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 dark:text-white hover:underline">{user.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{user.email || "-"}</p>
                          <p className="text-[10px] text-slate-400">{user.mobile || ""}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span>{user.role || "MEMBER"}</span>
                            {user.hasActiveAccount && (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                RE-REGISTERED (ACTIVE)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-xs text-slate-600 dark:text-slate-300">
                          {user.archiveReason || "User archived"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(user.archivedAt)}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {user.hasActiveAccount ? (
                            <span className="inline-flex rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300">
                              Active Account Live
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleRestore(user.userId || user.id, user, e)}
                              disabled={Boolean(restoringId) && restoringId === (user.userId || user.id)}
                              className="brand-btn brand-btn-primary brand-btn-sm"
                            >
                              {Boolean(restoringId) && restoringId === (user.userId || user.id) ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <RotateCcw size={13} />
                              )}
                              Restore
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                page={page}
                pageSize={pageSize}
                totalItems={filteredItems.length}
                totalPages={totalPages}
                startIndex={startIndex}
                endIndex={endIndex}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.USERS}
                label="archived users"
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
