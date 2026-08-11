"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Archive, Calendar, Mail, Phone, Loader2, RefreshCcw, RotateCcw, Search, User, X } from "lucide-react";
import PaginationControls from "@/components/dashboard/PaginationControls";
import useLocalPagination from "@/hooks/useLocalPagination";
import UserAvatar from "@/components/UserAvatar";
import { useGetArchivedUsersQuery, useRestoreArchivedUserMutation } from "@/services/api/orgApi";
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

export default function ArchivedUsersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [restoringId, setRestoringId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const { data, isLoading, isFetching, refetch } = useGetArchivedUsersQuery();
  const [restoreArchivedUserMutation] = useRestoreArchivedUserMutation();

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

      await restoreArchivedUserMutation(userId).unwrap();
      setMessage("User restored successfully!");
      if (selectedUser?.userId === userId) {
        setSelectedUser(null);
      }
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
          onClick={() => router.push("/org/users")}
          className="brand-btn brand-btn-secondary brand-btn-sm"
        >
          <ArrowLeft size={14} /> Back to Users
        </button>

        <button
          type="button"
          onClick={refetch}
          disabled={loading}
          className="brand-btn brand-btn-secondary brand-btn-sm"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Refresh
        </button>
      </div>

      <div className="light-glow-card-static rounded-[1.9rem] p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-500">
              <Archive size={16} /> Archived Directory
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              Archived & Deleted Users
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              View historical records of deleted organization members and restore their active accounts. Click any row to view full details.
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
              No archived users found.
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
                        onClick={() => router.push(`/org/users/${user.userId || user.id}`)}
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

      {/* Archived User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <UserAvatar name={selectedUser.name} className="h-12 w-12 text-xl rounded-xl" />
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedUser.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                      DELETED / ARCHIVED
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {selectedUser.role || "MEMBER"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {/* Deletion info box */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-500/20 dark:bg-rose-900/20">
                <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Deletion Info
                </p>
                <p className="mt-1 text-sm font-semibold text-rose-900 dark:text-rose-100">
                  Reason: {selectedUser.archiveReason || "User archived"}
                </p>
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  Archived Date: {formatDate(selectedUser.archivedAt)}
                </p>
              </div>

              {/* Personal Details */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                  Personal & Contact Details
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Tile label="Email Address" value={selectedUser.email || "-"} />
                  <Tile label="Mobile Number" value={`${selectedUser.mobileCountryCode || "+91"} ${selectedUser.mobile || "-"}`} />
                  <Tile label="Gender" value={selectedUser.gender || "-"} />
                  <Tile label="Date of Birth" value={selectedUser.dob || "-"} />
                  <Tile label="Member Type" value={selectedUser.existingMember || "-"} />
                  <Tile label="Referred By" value={selectedUser.referenceBy || "-"} />
                  <Tile label="Original Created At" value={formatDate(selectedUser.originalCreatedAt)} />
                  <Tile label="User ID" value={`#${selectedUser.userId || selectedUser.id}`} />
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="brand-btn brand-btn-secondary brand-btn-md"
              >
                Close
              </button>

              <button
                type="button"
                onClick={(e) => handleRestore(selectedUser.userId, e)}
                disabled={restoringId === selectedUser.userId}
                className="brand-btn brand-btn-primary brand-btn-md"
              >
                {restoringId === selectedUser.userId ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RotateCcw size={16} />
                )}
                Restore Account
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Tile({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/50">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100 break-all">{value}</p>
    </div>
  );
}
