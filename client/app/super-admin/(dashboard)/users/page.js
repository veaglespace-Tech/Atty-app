"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Archive, ArrowRight, CheckSquare, Download, Loader2, Power, RefreshCcw, Search, ShieldAlert, Trash2 } from "lucide-react";

import PaginationControls from "@/components/dashboard/PaginationControls";
import SectionEyebrow from "@/components/SectionEyebrow";
import useLocalPagination from "@/hooks/useLocalPagination";
import {
  useExportAllSuperAdminUsersExcelMutation,
  useGetAllSuperAdminUsersQuery,
  usePatchSuperAdminUserMutation,
  useDeleteSuperAdminUserMutation,
} from "@/services/api/superAdminApi";
import { DASHBOARD_PAGE_SIZE_OPTIONS } from "@/utils/dashboardLimits";
import { ROLES, formatRoleLabel } from "@/utils/roles";

const panelClassName = "light-glow-card-static rounded-[1.9rem] p-6";

function MetricCard({ label, value }) {
  return (
    <div className="dashboard-summary-card rounded-[1.75rem] px-5 py-5">
      <p className="text-[0.72rem] font-black uppercase tracking-[0.26em] text-slate-500 dark:text-blue-100/80">
        {label}
      </p>
      <p className="mt-4 text-[2.2rem] font-black leading-none tracking-[-0.05em] text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

export default function SuperAdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [memberTypeFilter, setMemberTypeFilter] = useState("ALL");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isFetching, refetch } = useGetAllSuperAdminUsersQuery();
  const [exportAllUsersExcel] = useExportAllSuperAdminUsersExcelMutation();
  const [patchSuperAdminUserMutation] = usePatchSuperAdminUserMutation();
  const [deleteSuperAdminUserMutation] = useDeleteSuperAdminUserMutation();

  const users = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const loading = isLoading || isFetching;

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      if (memberTypeFilter !== "ALL") {
        const userMemberType = String(user.existingMember || "").toUpperCase();
        if (userMemberType !== memberTypeFilter.toUpperCase()) return false;
      }
      if (genderFilter !== "ALL") {
        const userGender = String(user.gender || "").toUpperCase();
        if (userGender !== genderFilter.toUpperCase()) return false;
      }
      if (statusFilter !== "ALL") {
        const userStatus = String(user.approvalStatus || user.status || "").toUpperCase();
        if (userStatus !== statusFilter.toUpperCase()) return false;
      }
      if (!query) return true;
      return [
        user.name,
        user.email,
        user.organization?.name,
        user.organization?.organizationCode,
        user.existingMember,
        user.gender
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
        .includes(query);
    });
  }, [users, searchTerm, memberTypeFilter, genderFilter, statusFilter]);

  const {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    setPage,
    setPageSize,
  } = useLocalPagination(filteredUsers, {
    initialPageSize: DASHBOARD_PAGE_SIZE_OPTIONS.USERS?.[0] || 10,
    dependencies: [searchTerm, memberTypeFilter, genderFilter],
  });

  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");

  const isAllSelected = paginatedItems.length > 0 && paginatedItems.every((u) => selectedUserIds.includes(u.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = paginatedItems.map((u) => u.id);
      setSelectedUserIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedItems.map((u) => u.id);
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectUser = (userId, e) => {
    if (e) e.stopPropagation();
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleBulkBlock = async () => {
    if (!selectedUserIds.length) return;
    try {
      setBulkLoading(true);
      setBulkError("");
      setBulkMessage("");
      await Promise.all(
        selectedUserIds.map((id) => patchSuperAdminUserMutation({ userId: id, active: false }).unwrap())
      );
      setBulkMessage(`Successfully blocked ${selectedUserIds.length} user(s).`);
      setSelectedUserIds([]);
      refetch();
    } catch (err) {
      setBulkError(err?.data?.message || "Failed to block selected users");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkUnblock = async () => {
    if (!selectedUserIds.length) return;
    try {
      setBulkLoading(true);
      setBulkError("");
      setBulkMessage("");
      await Promise.all(
        selectedUserIds.map((id) => patchSuperAdminUserMutation({ userId: id, active: true }).unwrap())
      );
      setBulkMessage(`Successfully unblocked ${selectedUserIds.length} user(s).`);
      setSelectedUserIds([]);
      refetch();
    } catch (err) {
      setBulkError(err?.data?.message || "Failed to unblock selected users");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedUserIds.length) return;
    if (!window.confirm(`Are you sure you want to delete/archive ${selectedUserIds.length} selected user(s)?`)) return;
    try {
      setBulkLoading(true);
      setBulkError("");
      setBulkMessage("");
      await Promise.all(
        selectedUserIds.map((id) => deleteSuperAdminUserMutation({ userId: id, reason: "Bulk deleted by Super Admin" }).unwrap())
      );
      setBulkMessage(`Successfully archived ${selectedUserIds.length} user(s).`);
      setSelectedUserIds([]);
      refetch();
    } catch (err) {
      setBulkError(err?.data?.message || "Failed to delete selected users");
    } finally {
      setBulkLoading(false);
    }
  };

  const getStatusTone = (user) => {
    if (!user.isActive) {
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200";
    }
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
  };

  const activeUsersCount = users.filter((u) => u.isActive).length;
  const superAdminsCount = users.filter((u) => u.role === ROLES.SUPER_ADMIN).length;

  const handleExcelDownload = async () => {
    try {
      setDownloading(true);
      const blob = await exportAllUsersExcel().unwrap();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "all-users-org-wise.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // toast handled by api middleware
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className={`${panelClassName} mobile-compact-panel relative z-20`}>
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_28%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <SectionEyebrow className="mobile-hide-chip border-blue-200/80 bg-white/88 px-3 py-1 text-[11px] text-blue-700 shadow-[0_14px_34px_rgba(59,130,246,0.10)] dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
              Platform Directory
            </SectionEyebrow>
            <h2 className="mobile-compact-hero-title mt-3 sm:mt-4 text-3xl font-black text-slate-900 dark:text-white">
              Users
            </h2>
            <p className="mobile-hide-copy mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              View all users across the entire platform. Open a user&apos;s detail page to manage their profile and permissions.
            </p>
          </div>

          <div className="flex flex-col items-end justify-start gap-4">
            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
              <button
                type="button"
                onClick={refetch}
                disabled={loading}
                className="brand-btn brand-btn-secondary brand-btn-md px-3"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              </button>
              
              <button
                type="button"
                id="btn-export-all-users-excel"
                onClick={handleExcelDownload}
                disabled={downloading || isLoading || users.length === 0}
                className="brand-btn brand-btn-secondary brand-btn-md whitespace-nowrap"
              >
                {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Export Excel
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = !bulkMode;
                  setBulkMode(next);
                  if (!next) setSelectedUserIds([]);
                }}
                className={`brand-btn brand-btn-md ${
                  bulkMode || selectedUserIds.length > 0
                    ? "brand-btn-primary"
                    : "brand-btn-secondary text-blue-600 dark:text-blue-400"
                }`}
              >
                <CheckSquare size={16} />
                <span>{bulkMode || selectedUserIds.length > 0 ? "Exit Selection Mode" : "Bulk Select"}</span>
              </button>

              <Link
                href="/super-admin/archived-users"
                className="brand-btn brand-btn-secondary brand-btn-md text-rose-600 dark:text-rose-400"
              >
                <Archive size={16} />
                <span>Archived Users</span>
              </Link>
            </div>

            <div className="text-right mr-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Live View
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {filteredUsers.length} of {users.length} users visible.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Total Users" value={users.length || 0} />
        <MetricCard label="Active Users" value={activeUsersCount || 0} />
        <MetricCard label="Super Admins" value={superAdminsCount || 0} />
      </div>

      <div className={`${panelClassName} mobile-compact-panel`}>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative sm:col-span-2">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Search Users
            </p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Name, email, organization name"
                className="dashboard-field-control w-full pl-9 pr-3 text-sm"
              />
            </div>
          </div>
          <div className="relative">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Member Type
            </p>
            <select
              value={memberTypeFilter}
              onChange={(event) => setMemberTypeFilter(event.target.value)}
              className="dashboard-select-control w-full"
            >
              <option value="ALL">All Member Types</option>
              <option value="SENIOR">Senior</option>
              <option value="SEMI_SENIOR">Semi-Senior</option>
              <option value="JUNIOR">Junior</option>
            </select>
          </div>
          <div className="relative">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Gender
            </p>
            <select
              value={genderFilter}
              onChange={(event) => setGenderFilter(event.target.value)}
              className="dashboard-select-control w-full"
            >
              <option value="ALL">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="relative">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Status Filter
            </p>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="dashboard-select-control w-full"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500 dark:text-slate-300">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium">Loading users...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">No users found.</p>
        ) : (
          <div className="mt-5 space-y-4">
            {bulkError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{bulkError}</p>
            ) : null}
            {bulkMessage ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{bulkMessage}</p>
            ) : null}

            {selectedUserIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/90 p-4 dark:border-blue-500/20 dark:bg-blue-950/60 shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                    {selectedUserIds.length}
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-white">
                    {selectedUserIds.length} user(s) selected
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBulkUnblock}
                    disabled={bulkLoading}
                    className="brand-btn brand-btn-primary brand-btn-sm"
                  >
                    {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                    Activate / Unblock Selected
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkBlock}
                    disabled={bulkLoading}
                    className="brand-btn brand-btn-danger brand-btn-sm"
                  >
                    {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                    Block Selected
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={bulkLoading}
                    className="brand-btn brand-btn-danger brand-btn-sm"
                  >
                    {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Delete Selected
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            <p className="mobile-hide-helper text-xs font-semibold text-slate-500 dark:text-slate-300">
              Showing {startIndex}-{endIndex} of {filteredUsers.length} users
            </p>

            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalItems={filteredUsers.length}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.USERS || [10, 25, 50, 100]}
              label="users"
            />

            <div className="grid gap-4 md:hidden">
              {paginatedItems.map((user) => (
                <div
                  key={user.id}
                  className="dashboard-mobile-record-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-base font-black text-slate-900 dark:text-white">
                        {user.name}
                      </h4>
                      <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                        {user.email}
                      </p>
                    </div>
                    <Link href={`/super-admin/users/${user.id}`}>
                        <ArrowRight size={16} className="shrink-0 text-slate-400 hover:text-blue-500" />
                      </Link>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <CompactInfo label="Role" value={formatRoleLabel(user.role)} />
                    <CompactInfo label="Organization" value={user.organization?.name || "-"} />
                    <div className="dashboard-detail-tile">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Status</p>
                      <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${getStatusTone(user)}`}>
                        {user.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-[1.45rem] border border-slate-200 bg-white/90 md:block dark:border-slate-800 dark:bg-slate-950/70">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50/90 dark:bg-slate-900/85">
                  <tr>
                    {(bulkMode || selectedUserIds.length > 0) && (
                      <th className="w-10 px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          title="Select all visible users"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Organization
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedItems.map((user) => (
                    <tr
                      key={user.id}
                      className={`transition ${
                        selectedUserIds.includes(user.id)
                          ? "bg-blue-50/70 dark:bg-blue-950/40"
                          : "hover:bg-blue-50/55 dark:hover:bg-slate-900/55"
                      }`}
                    >
                      {(bulkMode || selectedUserIds.length > 0) && (
                        <td className="w-10 px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={(e) => toggleSelectUser(user.id, e)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
                        <p className="text-[12px] text-slate-500">{user.email}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                        {formatRoleLabel(user.role)}
                      </td>
                      <td className="px-4 py-4 text-slate-700 dark:text-slate-200">
                        {user.organization ? (
                          <>
                            <span className="block font-medium">{user.organization.name}</span>
                            <span className="text-[11px] text-slate-400">{user.organization.organizationCode}</span>
                          </>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${getStatusTone(user)}`}
                        >
                          {user.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                          <Link
                            href={`/super-admin/users/${user.id}`}
                            className="brand-btn brand-btn-soft brand-btn-sm"
                          >
                            Open Detail
                          </Link>
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationControls
              page={page}
              pageSize={pageSize}
              totalItems={filteredUsers.length}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={DASHBOARD_PAGE_SIZE_OPTIONS.USERS || [10, 25, 50, 100]}
              label="users"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function CompactInfo({ label, value }) {
  return (
    <div className="dashboard-detail-tile">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
