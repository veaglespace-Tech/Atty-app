"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Loader2, RefreshCcw, RotateCcw, Search, X } from "lucide-react";
import PaginationControls from "@/components/dashboard/PaginationControls";
import useLocalPagination from "@/hooks/useLocalPagination";
import { useGetArchivedOrganizationsQuery, useRestoreOrganizationMutation } from "@/services/api/superAdminApi";
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

export default function ArchivedOrganizationsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [restoringId, setRestoringId] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);

  const { data, isLoading, isFetching, refetch } = useGetArchivedOrganizationsQuery();
  const [restoreOrganizationMutation] = useRestoreOrganizationMutation();

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const loading = isLoading || isFetching;

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;
    return items.filter((org) => {
      const haystack = [org.name, org.organizationCode, org.email, org.phone, org.archiveReason]
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

  const handleRestore = async (orgId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to restore this organization and its active users?")) return;
    try {
      setRestoringId(orgId);
      setError("");
      setMessage("");

      await restoreOrganizationMutation(orgId).unwrap();
      setMessage("Organization restored successfully!");
      if (selectedOrg?.orgId === orgId) {
        setSelectedOrg(null);
      }
      refetch();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to restore organization"));
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/super-admin/organizations")}
          className="brand-btn brand-btn-secondary brand-btn-sm"
        >
          <ArrowLeft size={14} /> Back to Organizations
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
              <Building2 size={16} /> Archived Organizations
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              Archived & Deleted Organizations
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Historical archive of deleted organizations and their member accounts. Click any row to view details.
            </p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            Total Archived Orgs: {items.length}
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
              placeholder="Search by org name, code, email, reason..."
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
              No archived organizations found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-900/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Organization</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Code</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Reason</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Archived At</th>
                      <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedItems.map((org) => (
                      <tr
                        key={org.id}
                        onClick={() => router.push(`/super-admin/organizations/${org.orgId || org.id}`)}
                        className="cursor-pointer transition hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                      >
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 dark:text-white hover:underline">{org.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{org.email || "-"}</p>
                          <p className="text-[10px] text-slate-400">{org.phone || ""}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                          {org.organizationCode || "-"}
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-xs text-slate-600 dark:text-slate-300">
                          {org.archiveReason || "Organization archived"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(org.archivedAt)}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleRestore(org.orgId || org.id, e)}
                            disabled={Boolean(restoringId) && restoringId === (org.orgId || org.id)}
                            className="brand-btn brand-btn-primary brand-btn-sm"
                          >
                            {Boolean(restoringId) && restoringId === (org.orgId || org.id) ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <RotateCcw size={13} />
                            )}
                            Restore
                          </button>
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
                label="archived organizations"
              />
            </>
          )}
        </div>
      </div>

      {/* Archived Org Detail Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-black text-xl">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedOrg.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                      DELETED / ARCHIVED
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Code: {selectedOrg.organizationCode || "-"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrg(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-500/20 dark:bg-rose-900/20">
                <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Deletion Details
                </p>
                <p className="mt-1 text-sm font-semibold text-rose-900 dark:text-rose-100">
                  Reason: {selectedOrg.archiveReason || "Organization archived"}
                </p>
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  Archived Date: {formatDate(selectedOrg.archivedAt)}
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                  Organization Profile
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Tile label="Organization Code" value={selectedOrg.organizationCode || "-"} />
                  <Tile label="Email Address" value={selectedOrg.email || "-"} />
                  <Tile label="Phone Number" value={`${selectedOrg.phoneCountryCode || "+91"} ${selectedOrg.phone || "-"}`} />
                  <Tile label="Subscription Status" value={selectedOrg.subscriptionStatus || "-"} />
                  <Tile label="City & State" value={`${selectedOrg.city || "-"}, ${selectedOrg.state || "-"}`} />
                  <Tile label="Country" value={selectedOrg.country || "India"} />
                  <Tile label="Original Created Date" value={formatDate(selectedOrg.originalCreatedAt)} />
                  <Tile label="Org ID" value={`#${selectedOrg.orgId || selectedOrg.id}`} />
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedOrg(null)}
                className="brand-btn brand-btn-secondary brand-btn-md"
              >
                Close
              </button>

              <button
                type="button"
                onClick={(e) => handleRestore(selectedOrg.orgId, e)}
                disabled={restoringId === selectedOrg.orgId}
                className="brand-btn brand-btn-primary brand-btn-md"
              >
                {restoringId === selectedOrg.orgId ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RotateCcw size={16} />
                )}
                Restore Organization
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
